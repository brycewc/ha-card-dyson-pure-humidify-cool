import fs from "node:fs";
import path from "node:path";
import {
  ERR_CANNOT_CONNECT,
  ERR_INVALID_AUTH,
  createConnection,
  createLongLivedTokenAuth,
} from "home-assistant-js-websocket";
import { toDisplayEntry } from "./registry.mjs";

export { toDisplayEntry };

export const READ_ONLY_MESSAGE_TYPES = new Set([
  "ping",
  "supported_features",
  "get_states",
  "get_services",
  "get_config",
  "subscribe_entities",
  "unsubscribe_events",
  "config/entity_registry/list",
  "config/device_registry/list",
  "frontend/get_themes",
  "auth/current_user",
]);

export function loadLocalEnv(root = process.cwd()) {
  const env = { HA_URL: process.env.HA_URL ?? "", HA_TOKEN: process.env.HA_TOKEN ?? "", HA_FAN_ENTITY: process.env.HA_FAN_ENTITY ?? "" };
  const file = path.join(root, ".env.local");
  if (fs.existsSync(file)) {
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (match && match[1] in env && !env[match[1]]) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

// Every websocket message funnels through Connection.sendMessage, so guarding it covers
// sendMessagePromise, subscribeMessage and the library's own reconnect resubscriptions.
export function guardReadOnly(connection, allowed = READ_ONLY_MESSAGE_TYPES) {
  const send = connection.sendMessage.bind(connection);
  connection.sendMessage = (message, commandId) => {
    if (!allowed.has(message?.type)) {
      throw new Error(`Blocked non-read-only Home Assistant message: ${message?.type}`);
    }
    return send(message, commandId);
  };
  return connection;
}

export async function connect({ url, token, readOnly = true, allowed = READ_ONLY_MESSAGE_TYPES }) {
  if (!url || !token) throw new Error("HA_URL and HA_TOKEN must be set (see .env.example).");
  const auth = createLongLivedTokenAuth(url.replace(/\/$/, ""), token);
  let connection;
  for (let attempt = 1; !connection; attempt += 1) {
    try {
      connection = await createConnection({ auth });
    } catch (error) {
      if (error === ERR_INVALID_AUTH) throw new Error("Home Assistant rejected HA_TOKEN.");
      if (error !== ERR_CANNOT_CONNECT || attempt >= 3) {
        throw new Error(error === ERR_CANNOT_CONNECT ? `Cannot connect to ${url}.` : `Connection failed (${error}).`);
      }
    }
  }
  if (readOnly) guardReadOnly(connection, allowed);
  return connection;
}

export async function readDevice(connection, fanEntity) {
  const [states, entities, devices] = await Promise.all([
    connection.sendMessagePromise({ type: "get_states" }),
    connection.sendMessagePromise({ type: "config/entity_registry/list" }),
    connection.sendMessagePromise({ type: "config/device_registry/list" }),
  ]);
  const fan =
    entities.find((entry) => entry.entity_id === fanEntity) ??
    entities.find((entry) => entry.platform === "hass_dyson" && entry.entity_id.startsWith("fan."));
  if (!fan?.device_id) throw new Error(`No hass_dyson fan found${fanEntity ? ` (looked for ${fanEntity})` : ""}.`);
  const deviceEntities = entities.filter((entry) => entry.device_id === fan.device_id);
  const ids = new Set(deviceEntities.map((entry) => entry.entity_id));
  return {
    fanEntity: fan.entity_id,
    device: devices.find((device) => device.id === fan.device_id),
    entities: deviceEntities,
    states: states.filter((state) => ids.has(state.entity_id)),
  };
}

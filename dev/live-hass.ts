import {
  callService,
  createConnection,
  createLongLivedTokenAuth,
  subscribeEntities,
  type Connection,
  type HassEntities,
} from "home-assistant-js-websocket";
import { toDisplayEntry } from "./registry.mjs";
import type { HaTheme } from "./themes";
import type { HassListener, LogFn } from "./mock-hass";
import type { DeviceRegistryEntry, EntityRegistryEntry, HassEntity, HomeAssistant } from "../src/types";

export const ALWAYS_BLOCKED = new Set(["hass_dyson.reset_filter", "update.install", "update.skip"]);

export interface LiveThemes {
  themes: Record<string, HaTheme>;
  default_theme: string;
  default_dark_theme: string | null;
}

export class LiveHass {
  armed = false;
  fanEntity = "";
  themes: LiveThemes | null = null;
  private states: HassEntities = {};
  private entities: Record<string, EntityRegistryEntry> = {};
  private devices: Record<string, DeviceRegistryEntry> = {};
  private user: HomeAssistant["user"];

  private constructor(
    private readonly connection: Connection,
    private readonly onChange: HassListener,
    private readonly log: LogFn,
  ) {}

  static async connect(token: string, preferredFan: string, onChange: HassListener, log: LogFn): Promise<LiveHass> {
    // The Vite dev server proxies /api/websocket to HA_URL, so the page talks to its own origin.
    const auth = createLongLivedTokenAuth(location.origin, token);
    const connection = await createConnection({ auth });
    const live = new LiveHass(connection, onChange, log);
    await live.loadRegistry();
    live.user = await connection.sendMessagePromise({ type: "auth/current_user" });
    live.themes = await connection.sendMessagePromise({ type: "frontend/get_themes" });
    live.fanEntity =
      (preferredFan && live.entities[preferredFan] ? preferredFan : "") ||
      Object.values(live.entities).find((entry) => entry.platform === "hass_dyson" && entry.entity_id.startsWith("fan."))
        ?.entity_id ||
      "";
    await connection.subscribeEvents(() => void live.loadRegistry().then(() => live.emit()), "entity_registry_updated");
    subscribeEntities(connection, (states) => {
      live.states = states;
      live.emit();
    });
    connection.addEventListener("disconnected", () => log("warn", "Disconnected from Home Assistant, retrying"));
    connection.addEventListener("ready", () => log("info", "Reconnected to Home Assistant"));
    return live;
  }

  private async loadRegistry() {
    const list = await this.connection.sendMessagePromise<EntityRegistryEntry[]>({ type: "config/entity_registry/list" });
    this.entities = Object.fromEntries(list.map((entry) => [entry.entity_id, toDisplayEntry(entry)]));
    const devices = await this.connection.sendMessagePromise<DeviceRegistryEntry[]>({ type: "config/device_registry/list" });
    this.devices = Object.fromEntries(devices.map((device) => [device.id, device]));
  }

  private emit() {
    if (Object.keys(this.states).length) this.onChange(this.hass());
  }

  hass(): HomeAssistant {
    return {
      states: this.states as Record<string, HassEntity>,
      entities: this.entities,
      devices: this.devices,
      user: this.user,
      callService: (domain, service, data = {}) => this.callService(domain, service, data),
      callWS: (message) => this.callWS(message),
    };
  }

  private async callService(domain: string, service: string, data: Record<string, unknown>) {
    const name = `${domain}.${service}`;
    const payload = `${name} ${JSON.stringify(data)}`;
    if (ALWAYS_BLOCKED.has(name)) {
      this.log("blocked", `${payload} (always blocked in the dev harness)`);
      return;
    }
    if (!this.armed) {
      this.log("dry-run", payload);
      return;
    }
    this.log("service", payload);
    await callService(this.connection, domain, service, data);
  }

  private async callWS<T>(message: Record<string, unknown>): Promise<T> {
    throw new Error(`Dev harness does not allow websocket message ${String(message.type)}`);
  }
}

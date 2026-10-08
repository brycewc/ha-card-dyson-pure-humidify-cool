import { connect, readDevice, toDisplayEntry } from "../../dev/ha-connection.mjs";
import type { EntityRegistryEntry, HassEntity, HomeAssistant } from "../../src/types";

export const liveConfigured = Boolean(process.env.HA_URL && process.env.HA_TOKEN);

export async function connectLive() {
  const connection = await connect({ url: process.env.HA_URL!, token: process.env.HA_TOKEN! });
  const device = await readDevice(connection, process.env.HA_FAN_ENTITY);
  const states: Record<string, HassEntity> = Object.fromEntries(device.states.map((state: HassEntity) => [state.entity_id, state]));
  const entities: Record<string, EntityRegistryEntry> = Object.fromEntries(
    device.entities.map((entry: EntityRegistryEntry) => [entry.entity_id, toDisplayEntry(entry)]),
  );
  const hass: HomeAssistant = {
    states,
    entities,
    callService: () => Promise.reject(new Error("Live tests are read-only.")),
    callWS: (message) => connection.sendMessagePromise(message as { type: string }),
  };
  return { connection, device, hass };
}

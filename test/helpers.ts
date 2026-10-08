import registry from "./fixtures/entities.json";
import states from "./fixtures/states.json";
import type { EntityRegistryEntry, HassEntity, HomeAssistant, ServiceCall } from "../src/types";

export const FAN = registry.fanEntity;
export const DEVICE_ID = registry.device.id;

export interface FakeHass extends HomeAssistant {
  calls: ServiceCall[];
  ws: Record<string, unknown>[];
}

export function fixtureStates(): Record<string, HassEntity> {
  return Object.fromEntries((structuredClone(states) as HassEntity[]).map((state) => [state.entity_id, state]));
}

export function fixtureEntities(): Record<string, EntityRegistryEntry> {
  return Object.fromEntries((registry.entities as EntityRegistryEntry[]).map((entry) => [entry.entity_id, entry]));
}

export function fakeHass(patch: (states: Record<string, HassEntity>) => void = () => {}): FakeHass {
  const current = fixtureStates();
  patch(current);
  const hass: FakeHass = {
    states: current,
    entities: fixtureEntities(),
    devices: { [registry.device.id]: { ...registry.device } },
    calls: [],
    ws: [],
    async callService(domain, service, data = {}) {
      hass.calls.push({ domain, service, data });
    },
    async callWS<T>(message: Record<string, unknown>) {
      hass.ws.push(message);
      return { value: null } as T;
    },
  };
  return hass;
}

export function setState(states: Record<string, HassEntity>, entityId: string, state: string, attributes: Record<string, unknown> = {}) {
  const existing = states[entityId];
  states[entityId] = { ...existing, entity_id: entityId, state, attributes: { ...existing?.attributes, ...attributes } };
}

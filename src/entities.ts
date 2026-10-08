import type { EntityRegistryEntry, HomeAssistant } from "./types";

interface EntitySpec {
  domain: string;
  translationKeys: string[];
  suffixes: string[];
}

export const ENTITY_SPECS = {
  humidifier: { domain: "humidifier", translationKeys: ["dyson_humidifier"], suffixes: [] },
  temperature: { domain: "sensor", translationKeys: ["temperature"], suffixes: ["_temperature"] },
  humidity: { domain: "sensor", translationKeys: ["humidity"], suffixes: ["_humidity"] },
  pm25: { domain: "sensor", translationKeys: ["pm25", "p25r"], suffixes: ["_pm2_5", "_pm25"] },
  pm10: { domain: "sensor", translationKeys: ["pm10", "p10r"], suffixes: ["_pm10"] },
  voc: { domain: "sensor", translationKeys: ["voc"], suffixes: ["_voc"] },
  no2: { domain: "sensor", translationKeys: ["no2"], suffixes: ["_no2"] },
  aqi: { domain: "sensor", translationKeys: ["aqi"], suffixes: ["_air_quality_index"] },
  aqiCategory: { domain: "sensor", translationKeys: ["aqi_category"], suffixes: ["_air_quality_category"] },
  dominantPollutant: { domain: "sensor", translationKeys: ["dominant_pollutant"], suffixes: ["_dominant_pollutant"] },
  filterLife: { domain: "sensor", translationKeys: ["hepa_filter_life"], suffixes: ["_hepa_filter_life"] },
  filterType: { domain: "sensor", translationKeys: ["hepa_filter_type"], suffixes: ["_hepa_filter_type"] },
  filterReplacement: { domain: "binary_sensor", translationKeys: ["filter_replacement"], suffixes: ["_filter_replacement"] },
  nextCleaning: { domain: "sensor", translationKeys: ["next_cleaning_cycle"], suffixes: ["_next_cleaning_cycle"] },
  cleaningRemaining: { domain: "sensor", translationKeys: ["cleaning_time_remaining"], suffixes: ["_cleaning_time_remaining"] },
  oscillation: { domain: "select", translationKeys: ["oscillation", "oscillation_mode"], suffixes: ["_oscillation"] },
  waterHardness: { domain: "select", translationKeys: ["water_hardness"], suffixes: ["_water_hardness"] },
  sleepTimer: { domain: "number", translationKeys: ["sleep_timer"], suffixes: ["_sleep_timer"] },
  nightMode: { domain: "switch", translationKeys: ["night_mode"], suffixes: ["_night_mode"] },
} satisfies Record<string, EntitySpec>;

export type EntityKey = keyof typeof ENTITY_SPECS;

export const ENTITY_KEYS = Object.keys(ENTITY_SPECS) as EntityKey[];

export interface ResolvedEntities {
  fan: string;
  deviceId: string | null;
  ids: Partial<Record<EntityKey, string>>;
  faultsByCode: Record<string, string>;
}

function domainOf(entityId: string): string {
  return entityId.slice(0, entityId.indexOf("."));
}

function findEntity(entries: EntityRegistryEntry[], spec: EntitySpec): string | undefined {
  const inDomain = entries.filter((entry) => domainOf(entry.entity_id) === spec.domain);
  for (const key of spec.translationKeys) {
    const match = inDomain.find((entry) => entry.translation_key === key);
    if (match) return match.entity_id;
  }
  for (const suffix of spec.suffixes) {
    const match = inDomain.find((entry) => entry.entity_id.endsWith(suffix));
    if (match) return match.entity_id;
  }
  return undefined;
}

export function deviceEntries(hass: HomeAssistant, deviceId: string | null): EntityRegistryEntry[] {
  if (!deviceId) return [];
  return Object.values(hass.entities ?? {}).filter((entry) => entry.device_id === deviceId);
}

export function resolveEntities(
  hass: HomeAssistant,
  fanEntityId: string,
  overrides: Partial<Record<string, string>> = {},
  cachedEntries?: EntityRegistryEntry[],
): ResolvedEntities {
  const deviceId = hass.entities?.[fanEntityId]?.device_id ?? null;
  const entries = cachedEntries ?? deviceEntries(hass, deviceId);

  const ids: Partial<Record<EntityKey, string>> = {};
  for (const key of ENTITY_KEYS) {
    const id = overrides[key] || findEntity(entries, ENTITY_SPECS[key]);
    if (id) ids[key] = id;
  }

  const faultsByCode: Record<string, string> = {};
  for (const entry of entries) {
    if (domainOf(entry.entity_id) !== "binary_sensor") continue;
    const code = hass.states[entry.entity_id]?.attributes?.fault_code;
    if (typeof code === "string" && code) faultsByCode[code] = entry.entity_id;
  }

  return { fan: fanEntityId, deviceId, ids, faultsByCode };
}

export function trackedEntityIds(resolved: ResolvedEntities): string[] {
  return [resolved.fan, ...Object.values(resolved.ids), ...Object.values(resolved.faultsByCode)].filter(
    (id): id is string => Boolean(id),
  );
}

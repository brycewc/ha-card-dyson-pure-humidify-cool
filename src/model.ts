import {
  POLLUTANT_LABELS,
  aqiBand,
  bandFromCategory,
  pollutantBand,
  type Band,
  type Pollutant,
} from "./air-quality";
import type { EntityKey, ResolvedEntities } from "./entities";
import { readOscillation, type OscillationMode } from "./oscillation";
import type { HassEntity, HomeAssistant } from "./types";
import { HARDNESS_LEVELS, readWaterHardness, type HardnessLevel } from "./water-hardness";

export type AlertTone = "error" | "warning";

export interface Alert {
  id: string;
  entityId: string;
  tone: AlertTone;
  icon: string;
  message: string;
}

export interface Reading {
  entityId?: string;
  value: number | null;
  display: string;
  formatted: string;
  unit: string;
}

export interface PollutantReading extends Reading {
  pollutant: Pollutant;
  label: string;
  band: Band | null;
}

export interface DysonModel {
  available: boolean;
  name: string;
  deviceName: string;
  power: boolean;
  autoMode: boolean;
  speed: number;
  night: boolean | null;
  airflow: "forward" | "reverse" | null;
  oscillation: OscillationMode | null;
  humidify: {
    available: boolean;
    on: boolean;
    mode: "normal" | "auto" | null;
    target: number;
    min: number;
    max: number;
  };
  sleepTimer: { available: boolean; minutes: number };
  temperature: Reading;
  humidity: Reading;
  aqi: Reading & { band: Band | null; category: string | null; dominant: string | null };
  pollutants: PollutantReading[];
  alerts: Alert[];
  maintenance: {
    filterLife: number | null;
    filterType: string | null;
    filterReplacement: boolean;
    nextCleanHours: number | null;
    waterHardness: { value: HardnessLevel | null; options: HardnessLevel[]; integrationSwapped: boolean } | null;
  };
  deepClean: { minutes: number | null; changedAt: number | null };
}

const UNAVAILABLE = new Set(["unavailable", "unknown", ""]);

function isUsable(entity: HassEntity | undefined): entity is HassEntity {
  return Boolean(entity) && !UNAVAILABLE.has(String(entity!.state).toLowerCase());
}

function numericState(entity: HassEntity | undefined): number | null {
  if (!isUsable(entity)) return null;
  const value = Number(entity.state);
  return Number.isFinite(value) ? value : null;
}

function reading(entity: HassEntity | undefined, fallbackUnit = "", decimals = 1): Reading {
  const value = numericState(entity);
  const unit = entity?.attributes?.unit_of_measurement ?? fallbackUnit;
  const formatted = value === null ? "--" : formatNumber(value, decimals);
  return {
    entityId: entity?.entity_id,
    value,
    display: value === null ? formatted : `${formatted}${unit}`,
    formatted,
    unit: value === null ? "" : unit,
  };
}

function formatNumber(value: number, decimals: number): string {
  const factor = 10 ** decimals;
  return String(Math.round(value * factor) / factor);
}

interface FaultInfo {
  tone: AlertTone;
  icon: string;
  message: string;
}

const FAULTS: Record<string, FaultInfo> = {
  tnke: { tone: "error", icon: "mdi:water-off", message: "Water tank empty. Refill it to keep humidifying." },
  tnkp: { tone: "error", icon: "mdi:water-alert", message: "Water tank not detected. Check that it is seated." },
  cldu: { tone: "warning", icon: "mdi:spray-bottle", message: "Deep clean required. Start a deep clean cycle." },
  etwd: { tone: "warning", icon: "mdi:wrench", message: "Humidifier maintenance required." },
  humi: { tone: "error", icon: "mdi:water-percent-alert", message: "Humidity sensor fault." },
  aqs: { tone: "error", icon: "mdi:air-filter", message: "Air quality sensor fault." },
  fltr: { tone: "warning", icon: "mdi:air-filter", message: "Filter fault." },
  hflr: { tone: "warning", icon: "mdi:air-filter", message: "HEPA filter fault." },
  mflr: { tone: "error", icon: "mdi:fan-alert", message: "Motor fault." },
  pwr: { tone: "error", icon: "mdi:power-plug-off", message: "Power supply fault." },
  wifi: { tone: "warning", icon: "mdi:wifi-off", message: "Wi-Fi connection fault." },
  sys: { tone: "error", icon: "mdi:alert-circle", message: "System fault." },
};

function faultTone(entity: HassEntity, fallback: AlertTone): AlertTone {
  const severity = String(entity.attributes?.severity ?? "").toLowerCase();
  if (severity === "critical") return "error";
  if (severity === "warning" || severity === "maintenance") return "warning";
  return fallback;
}

function readAlerts(states: Record<string, HassEntity>, resolved: ResolvedEntities): Alert[] {
  const alerts: Alert[] = [];
  for (const [code, entityId] of Object.entries(resolved.faultsByCode)) {
    const entity = states[entityId];
    if (entity?.state !== "on") continue;
    const info = FAULTS[code] ?? { tone: "error", icon: "mdi:alert", message: `${code.toUpperCase()} fault.` };
    alerts.push({
      id: `fault-${code}`,
      entityId,
      tone: faultTone(entity, info.tone),
      icon: info.icon,
      message: entity.attributes?.description || info.message,
    });
  }

  const replacementId = resolved.ids.filterReplacement;
  if (replacementId && states[replacementId]?.state === "on") {
    const life = numericState(resolved.ids.filterLife ? states[resolved.ids.filterLife] : undefined);
    alerts.push({
      id: "filter-replacement",
      entityId: replacementId,
      tone: "warning",
      icon: "mdi:air-filter",
      message: life === null ? "Replace the HEPA filter." : `Replace the HEPA filter (${life}% left).`,
    });
  }

  return alerts.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "error" ? -1 : 1));
}

const POLLUTANT_KEYS: Pollutant[] = ["pm25", "pm10", "voc", "no2"];

export function readModel(hass: HomeAssistant, resolved: ResolvedEntities): DysonModel {
  const states = hass.states;
  const get = (key: EntityKey) => (resolved.ids[key] ? states[resolved.ids[key]!] : undefined);
  const fan = states[resolved.fan];
  const attributes = fan?.attributes ?? {};
  const available = isUsable(fan);

  const humidifier = get("humidifier");
  const humidifierMode = humidifier?.attributes?.mode;

  const aqiEntity = get("aqi");
  const aqiValue = numericState(aqiEntity);
  const category = isUsable(get("aqiCategory")) ? get("aqiCategory")!.state : (aqiEntity?.attributes?.category ?? null);
  const dominantState = get("dominantPollutant")?.state;
  const dominant = dominantState && dominantState !== "None" && isUsable(get("dominantPollutant")) ? dominantState : null;

  const waterHardness = get("waterHardness");
  const cleaning = get("cleaningRemaining");
  const cleanMinutes = numericState(cleaning);
  const cleanChangedAt = cleaning?.last_changed ? Date.parse(cleaning.last_changed) : null;
  const sleepTimer = get("sleepTimer");
  const oscillationSelect = get("oscillation");
  const device = resolved.deviceId ? hass.devices?.[resolved.deviceId] : undefined;

  return {
    available,
    name: attributes.friendly_name ?? resolved.fan,
    deviceName: device?.name_by_user || device?.name || attributes.friendly_name || "The Dyson",
    power: fan?.state === "on",
    autoMode: attributes.preset_mode === "auto",
    speed: Math.round(Number(attributes.percentage ?? 0) / 10),
    night: get("nightMode") ? get("nightMode")!.state === "on" : null,
    airflow: attributes.direction === "forward" || attributes.direction === "reverse" ? attributes.direction : null,
    oscillation: oscillationSelect ? readOscillation(fan, oscillationSelect) : null,
    humidify: {
      available: isUsable(humidifier),
      on: humidifier?.state === "on",
      mode: humidifierMode === "normal" || humidifierMode === "auto" ? humidifierMode : null,
      target: Number(humidifier?.attributes?.humidity ?? 40),
      min: Number(humidifier?.attributes?.min_humidity ?? 30),
      max: Number(humidifier?.attributes?.max_humidity ?? 70),
    },
    sleepTimer: {
      available: isUsable(sleepTimer),
      minutes: numericState(sleepTimer) ?? 0,
    },
    temperature: reading(get("temperature"), "°"),
    humidity: reading(get("humidity"), "%"),
    aqi: {
      ...reading(aqiEntity),
      band: bandFromCategory(category) ?? aqiBand(aqiValue),
      category,
      dominant,
    },
    pollutants: POLLUTANT_KEYS.flatMap((pollutant) => {
      const entity = get(pollutant);
      if (!entity) return [];
      const base = reading(entity, "", pollutant === "voc" ? 3 : 0);
      return [{ ...base, pollutant, label: POLLUTANT_LABELS[pollutant], band: pollutantBand(pollutant, base.value) }];
    }),
    alerts: readAlerts(states, resolved),
    maintenance: {
      filterLife: numericState(get("filterLife")),
      filterType: isUsable(get("filterType")) ? get("filterType")!.state : null,
      filterReplacement: get("filterReplacement")?.state === "on",
      nextCleanHours: numericState(get("nextCleaning")),
      waterHardness: waterHardness
        ? {
            ...(isUsable(waterHardness) ? readWaterHardness(waterHardness) : { value: null, integrationSwapped: true }),
            options: HARDNESS_LEVELS,
          }
        : null,
    },
    deepClean: {
      minutes: cleanMinutes,
      changedAt: cleanChangedAt,
    },
  };
}

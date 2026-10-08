import type { ResolvedEntities } from "./entities";
import { BREEZE_OPTION, presetOption, type SweepPreset } from "./oscillation";
import type { ServiceCall } from "./types";
import { optionForLevel, type HardnessLevel } from "./water-hardness";

const call = (domain: string, service: string, data: Record<string, unknown>): ServiceCall => ({
  domain,
  service,
  data,
});

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function snapHumidity(value: number, min = 30, max = 70): number {
  return clamp(Math.round(value / 10) * 10, min, max);
}

export function snapSleepMinutes(value: number): number {
  return clamp(Math.round(value / 15) * 15, 0, 540);
}

export type OscillationChoice = "off" | SweepPreset | "breeze";

export function createServices(entities: ResolvedEntities) {
  const fan = entities.fan;
  const { ids, deviceId } = entities;

  return {
    power: (on: boolean) => [call("fan", on ? "turn_on" : "turn_off", { entity_id: fan })],

    speed: (level: number) => [
      call("fan", "set_percentage", { entity_id: fan, percentage: clamp(Math.round(level), 1, 10) * 10 }),
    ],

    autoMode: (on: boolean) => [call("fan", "set_preset_mode", { entity_id: fan, preset_mode: on ? "auto" : "manual" })],

    night: (on: boolean) =>
      ids.nightMode ? [call("switch", on ? "turn_on" : "turn_off", { entity_id: ids.nightMode })] : [],

    airflow: (direction: "forward" | "reverse") => [call("fan", "set_direction", { entity_id: fan, direction })],

    oscillation: (choice: OscillationChoice): ServiceCall[] => {
      if (choice === "off") return [call("fan", "oscillate", { entity_id: fan, oscillating: false })];
      if (!ids.oscillation) return [];
      const option = choice === "breeze" ? BREEZE_OPTION : presetOption(choice);
      return [call("select", "select_option", { entity_id: ids.oscillation, option })];
    },

    humidify: (mode: "off" | "normal" | "auto") => {
      if (!ids.humidifier) return [];
      if (mode === "off") return [call("humidifier", "turn_off", { entity_id: ids.humidifier })];
      return [call("humidifier", "set_mode", { entity_id: ids.humidifier, mode })];
    },

    targetHumidity: (value: number) =>
      ids.humidifier
        ? [call("humidifier", "set_humidity", { entity_id: ids.humidifier, humidity: snapHumidity(value) })]
        : [],

    sleepTimer: (minutes: number) =>
      ids.sleepTimer ? [call("number", "set_value", { entity_id: ids.sleepTimer, value: snapSleepMinutes(minutes) })] : [],

    resetFilter: () => (deviceId ? [call("hass_dyson", "reset_filter", { device_id: deviceId, filter_type: "hepa" })] : []),

    waterHardness: (level: HardnessLevel, integrationSwapped: boolean) =>
      ids.waterHardness
        ? [call("select", "select_option", { entity_id: ids.waterHardness, option: optionForLevel(level, integrationSwapped) })]
        : [],
  };
}

export type DysonServices = ReturnType<typeof createServices>;

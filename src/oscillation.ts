import type { HassEntity } from "./types";

export const SWEEP_PRESETS = [45, 90] as const;
export type SweepPreset = (typeof SWEEP_PRESETS)[number];

export const BREEZE_OPTION = "Breeze";

export type OscillationMode = "off" | SweepPreset | "breeze" | "other";

export function presetOption(preset: SweepPreset): string {
  return `${preset}°`;
}

// The select keeps showing its last pattern while oscillation is off, so the fan's flag decides on/off.
export function readOscillation(fan: HassEntity | undefined, select: HassEntity | undefined): OscillationMode {
  if (fan?.attributes?.oscillating !== true) return "off";
  if (select?.state === BREEZE_OPTION) return "breeze";
  return SWEEP_PRESETS.find((preset) => presetOption(preset) === select?.state) ?? "other";
}

import type { HassEntity } from "./types";

export type HardnessLevel = "Soft" | "Medium" | "Hard";

export const HARDNESS_LEVELS: HardnessLevel[] = ["Soft", "Medium", "Hard"];

// Device encoding per libdyson-neon. hass_dyson 0.38 labels 2025 and 0675 the other way round.
const RAW_TO_LEVEL: Record<string, HardnessLevel> = { "2025": "Soft", "1350": "Medium", "0675": "Hard" };

const MIRRORED: Record<HardnessLevel, HardnessLevel> = { Soft: "Hard", Medium: "Medium", Hard: "Soft" };

export interface WaterHardness {
  value: HardnessLevel | null;
  integrationSwapped: boolean;
}

function asLevel(value: unknown): HardnessLevel | null {
  return HARDNESS_LEVELS.includes(value as HardnessLevel) ? (value as HardnessLevel) : null;
}

// Medium reads the same either way, so swapping can only be detected while Soft or Hard is set;
// until then the card assumes the known-swapped behaviour of current hass_dyson releases.
export function readWaterHardness(entity: HassEntity | undefined): WaterHardness {
  const label = asLevel(entity?.state);
  const actual = RAW_TO_LEVEL[String(entity?.attributes?.water_hardness_raw ?? "")] ?? null;
  const integrationSwapped = actual && label && actual !== "Medium" ? label !== actual : true;
  const value = actual ?? (label && integrationSwapped ? MIRRORED[label] : label);
  return { value, integrationSwapped };
}

export function optionForLevel(level: HardnessLevel, integrationSwapped: boolean): HardnessLevel {
  return integrationSwapped ? MIRRORED[level] : level;
}

import { describe, expect, it } from "vitest";
import { optionForLevel, readWaterHardness } from "../src/water-hardness";
import type { HassEntity } from "../src/types";

const select = (state: string, raw: string): HassEntity => ({
  entity_id: "select.water_hardness",
  state,
  attributes: { water_hardness_raw: raw },
});

describe("readWaterHardness", () => {
  it("reads the device value from the raw code while hass_dyson mislabels it", () => {
    expect(readWaterHardness(select("Hard", "2025"))).toEqual({ value: "Soft", integrationSwapped: true });
    expect(readWaterHardness(select("Soft", "0675"))).toEqual({ value: "Hard", integrationSwapped: true });
  });

  it("notices once hass_dyson labels Soft and Hard correctly", () => {
    expect(readWaterHardness(select("Soft", "2025"))).toEqual({ value: "Soft", integrationSwapped: false });
    expect(readWaterHardness(select("Hard", "0675"))).toEqual({ value: "Hard", integrationSwapped: false });
  });

  it("assumes the current swapped behaviour while Medium hides it", () => {
    expect(readWaterHardness(select("Medium", "1350"))).toEqual({ value: "Medium", integrationSwapped: true });
  });

  it("falls back to mirroring the label when the raw code is missing", () => {
    expect(readWaterHardness(select("Hard", ""))).toEqual({ value: "Soft", integrationSwapped: true });
  });
});

describe("optionForLevel", () => {
  it("sends the mirrored option only while the integration is swapped", () => {
    expect(optionForLevel("Soft", true)).toBe("Hard");
    expect(optionForLevel("Hard", true)).toBe("Soft");
    expect(optionForLevel("Medium", true)).toBe("Medium");
    expect(optionForLevel("Soft", false)).toBe("Soft");
  });
});

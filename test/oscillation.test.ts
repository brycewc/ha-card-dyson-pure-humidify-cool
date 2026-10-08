import { describe, expect, it } from "vitest";
import { readOscillation } from "../src/oscillation";
import type { HassEntity } from "../src/types";

const entity = (state: string, attributes: Record<string, unknown> = {}): HassEntity => ({
  entity_id: "x.y",
  state,
  attributes,
});

describe("readOscillation", () => {
  it("reads the sweep from the select while oscillating", () => {
    expect(readOscillation(entity("on", { oscillating: true }), entity("45°"))).toBe(45);
    expect(readOscillation(entity("on", { oscillating: true }), entity("90°"))).toBe(90);
  });

  it("is off when the fan is not oscillating, even though the select keeps its pattern", () => {
    expect(readOscillation(entity("on", { oscillating: false }), entity("45°"))).toBe("off");
  });

  it("recognises Breeze", () => {
    expect(readOscillation(entity("on", { oscillating: true }), entity("Breeze"))).toBe("breeze");
  });

  it("flags patterns the card does not offer", () => {
    expect(readOscillation(entity("on", { oscillating: true }), entity("Custom"))).toBe("other");
    expect(readOscillation(entity("on", { oscillating: true }), entity("180°"))).toBe("other");
  });
});

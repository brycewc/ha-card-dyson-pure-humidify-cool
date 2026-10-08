import { describe, expect, it } from "vitest";
import { aqiBand, bandFromCategory, pollutantBand, vocRawIndex } from "../src/air-quality";

describe("aqiBand", () => {
  it.each([
    [0, "good"],
    [50, "good"],
    [51, "fair"],
    [100, "fair"],
    [101, "poor"],
    [150, "poor"],
    [151, "very_poor"],
    [200, "very_poor"],
    [201, "extremely_poor"],
    [300, "extremely_poor"],
    [301, "severe"],
    [500, "severe"],
  ])("%d is %s", (value, band) => {
    expect(aqiBand(value)).toBe(band);
  });

  it("returns null for missing values", () => {
    expect(aqiBand(null)).toBeNull();
    expect(aqiBand(Number.NaN)).toBeNull();
  });
});

describe("pollutantBand", () => {
  it("uses the documented PM2.5 boundaries", () => {
    expect(pollutantBand("pm25", 35)).toBe("good");
    expect(pollutantBand("pm25", 36)).toBe("fair");
    expect(pollutantBand("pm25", 251)).toBe("severe");
    expect(pollutantBand("pm25", 335)).toBe("severe");
  });

  it("uses the documented PM10 and NO2 boundaries", () => {
    expect(pollutantBand("pm10", 100)).toBe("poor");
    expect(pollutantBand("pm10", 336)).toBe("very_poor");
    expect(pollutantBand("no2", 0)).toBe("good");
    expect(pollutantBand("no2", 1250)).toBe("severe");
  });

  it("bands VOC on the raw index, not mg/m3", () => {
    expect(vocRawIndex(0.036)).toBe(36);
    expect(pollutantBand("voc", 0.036)).toBe("fair");
    expect(pollutantBand("voc", 0.03)).toBe("good");
    expect(pollutantBand("voc", 0.501)).toBe("severe");
  });
});

describe("bandFromCategory", () => {
  it("maps integration category strings", () => {
    expect(bandFromCategory("Severe")).toBe("severe");
    expect(bandFromCategory("Very Poor")).toBe("very_poor");
    expect(bandFromCategory("Extremely Poor")).toBe("extremely_poor");
    expect(bandFromCategory("unknown")).toBeNull();
  });
});

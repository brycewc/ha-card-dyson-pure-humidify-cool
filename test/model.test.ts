import { describe, expect, it } from "vitest";
import { resolveEntities } from "../src/entities";
import { readModel } from "../src/model";
import { FAN, fakeHass, setState } from "./helpers";

const model = (patch?: Parameters<typeof fakeHass>[0]) => {
  const hass = fakeHass(patch);
  return readModel(hass, resolveEntities(hass, FAN));
};

describe("readModel", () => {
  it("reads the idle snapshot", () => {
    const m = model();
    expect(m.available).toBe(true);
    expect(m.power).toBe(false);
    expect(m.speed).toBe(4);
    expect(m.oscillation).toBe(45);
    expect(m.humidify).toMatchObject({ available: true, on: false, mode: null, min: 30, max: 70 });
    expect(m.humidity.value).not.toBeNull();
    expect(m.temperature.display).toMatch(/°F$/);
    expect(m.maintenance.waterHardness).toEqual({ value: "Soft", integrationSwapped: true, options: ["Soft", "Medium", "Hard"] });
    expect(m.alerts).toEqual([]);
  });

  it("ignores the literal None dominant pollutant", () => {
    const m = model((states) => setState(states, "sensor.dyson_ph01_dominant_pollutant", "None"));
    expect(m.aqi.dominant).toBeNull();
  });

  it("raises a refill alert with the integration's description first", () => {
    const m = model((states) => {
      setState(states, "binary_sensor.bedroom_bedroom_dyson_fault_water_level", "on", {
        description: "Water tank empty - please refill",
        severity: "Critical",
      });
      setState(states, "binary_sensor.bedroom_bedroom_dyson_fault_cldu", "on", { severity: "Maintenance" });
      setState(states, "binary_sensor.dyson_ph01_filter_replacement", "on");
    });
    expect(m.alerts.map((alert) => [alert.id, alert.tone])).toEqual([
      ["fault-tnke", "error"],
      ["fault-cldu", "warning"],
      ["filter-replacement", "warning"],
    ]);
    expect(m.alerts[0].message).toBe("Water tank empty - please refill");
    expect(m.alerts[2].message).toMatch(/% left/);
  });

  it("reads cleaning time remaining for the deep clean tracker", () => {
    expect(model().deepClean.minutes).toBe(60);
    const m = model((states) =>
      setState(states, "sensor.bedroom_bedroom_dyson_cleaning_time_remaining", "42"),
    );
    expect(m.deepClean.minutes).toBe(42);
  });

  it("names the device by the name the user gave it", () => {
    const hass = fakeHass((states) => setState(states, FAN, "unavailable", { friendly_name: "Fan entity" }));
    const resolved = resolveEntities(hass, FAN);
    expect(readModel(hass, resolved).deviceName).toBe("Bedroom Dyson");
    hass.devices![resolved.deviceId!].name_by_user = null;
    expect(readModel(hass, resolved).deviceName).toBe("Dyson PH01");
  });

  it("marks the card unavailable", () => {
    const m = model((states) => setState(states, FAN, "unavailable"));
    expect(m.available).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { ENTITY_KEYS, resolveEntities } from "../src/entities";
import { DEVICE_ID, FAN, fakeHass } from "./helpers";

describe("resolveEntities", () => {
  const hass = fakeHass();
  const resolved = resolveEntities(hass, FAN);

  it("finds the device from the fan entity", () => {
    expect(resolved.deviceId).toBe(DEVICE_ID);
  });

  it("resolves every key on the PH01", () => {
    expect(ENTITY_KEYS.filter((key) => !resolved.ids[key])).toEqual([]);
  });

  it("matches by translation key, including the mixed entity_id prefixes", () => {
    expect(resolved.ids).toMatchObject({
      humidifier: "humidifier.bedroom_bedroom_dyson",
      pm25: "sensor.bedroom_bedroom_dyson_pm2_5",
      aqi: "sensor.dyson_ph01_air_quality_index",
      oscillation: "select.dyson_ph01_oscillation",
      sleepTimer: "number.dyson_ph01_sleep_timer",
      humidity: "sensor.dyson_ph01_humidity",
    });
  });

  it("never picks the climate shim", () => {
    expect(Object.values(resolved.ids).some((id) => id?.startsWith("climate."))).toBe(false);
  });

  it("indexes fault sensors by fault_code", () => {
    expect(resolved.faultsByCode).toMatchObject({
      tnke: "binary_sensor.bedroom_bedroom_dyson_fault_water_level",
      tnkp: "binary_sensor.bedroom_bedroom_dyson_fault_water_tank_status",
      cldu: "binary_sensor.bedroom_bedroom_dyson_fault_cldu",
      etwd: "binary_sensor.bedroom_bedroom_dyson_fault_etwd",
    });
    expect(Object.keys(resolved.faultsByCode)).toHaveLength(12);
  });

  it("falls back to entity_id suffixes without translation keys", () => {
    const bare = fakeHass();
    for (const entry of Object.values(bare.entities)) entry.translation_key = undefined;
    const fallback = resolveEntities(bare, FAN);
    expect(fallback.ids.sleepTimer).toBe("number.dyson_ph01_sleep_timer");
    expect(fallback.ids.humidity).toBe("sensor.dyson_ph01_humidity");
    expect(fallback.ids.oscillation).toBe("select.dyson_ph01_oscillation");
  });

  it("applies config overrides", () => {
    const overridden = resolveEntities(hass, FAN, { humidity: "sensor.elsewhere" });
    expect(overridden.ids.humidity).toBe("sensor.elsewhere");
  });
});

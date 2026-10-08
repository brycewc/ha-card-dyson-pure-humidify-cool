import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ENTITY_KEYS, resolveEntities, trackedEntityIds, type ResolvedEntities } from "../../src/entities";
import { readModel } from "../../src/model";
import { BREEZE_OPTION, SWEEP_PRESETS, presetOption } from "../../src/oscillation";
import type { HomeAssistant } from "../../src/types";
import { connectLive, liveConfigured } from "./live-helpers";

// Device entities the card deliberately leaves alone.
const IGNORED_TRANSLATION_KEYS = new Set([
  "dyson_climate",
  "reconnect",
  "schedule",
  "firmware_update",
  "firmware_auto_update",
  "continuous_monitoring",
  "connection_status",
  "ip_address",
  "wifi_signal",
  "indoor_aqi_15_min",
  "outdoor_aqi",
  "scheduled_events",
  "oscillation_low_angle",
  "oscillation_high_angle",
  "oscillation_center_angle",
  "oscillation_angle_span",
]);

describe.skipIf(!liveConfigured)("live Home Assistant contract (read-only)", () => {
  let live: Awaited<ReturnType<typeof connectLive>>;
  let hass: HomeAssistant;
  let resolved: ResolvedEntities;

  beforeAll(async () => {
    live = await connectLive();
    hass = live.hass;
    resolved = resolveEntities(hass, live.device.fanEntity);
  });

  afterAll(() => live?.connection.close());

  it("blocks anything that is not a read", async () => {
    await expect(
      live.connection.sendMessagePromise({ type: "call_service", domain: "fan", service: "turn_on" }),
    ).rejects.toThrow(/Blocked non-read-only/);
  });

  it("resolves the device and every entity the card needs", () => {
    expect(resolved.deviceId).toBe(live.device.device?.id);
    expect(ENTITY_KEYS.filter((key) => !resolved.ids[key])).toEqual([]);
    expect(Object.keys(resolved.faultsByCode).sort()).toEqual(
      ["aqs", "cldu", "etwd", "fltr", "hflr", "humi", "mflr", "pwr", "sys", "tnke", "tnkp", "wifi"].sort(),
    );
  });

  it("knows about every hass_dyson entity on the device", () => {
    const known = new Set(trackedEntityIds(resolved));
    const unknown = Object.values(hass.entities)
      .filter((entry) => !known.has(entry.entity_id) && !IGNORED_TRANSLATION_KEYS.has(entry.translation_key ?? ""))
      .map((entry) => `${entry.entity_id} (${entry.translation_key ?? "no translation_key"})`);
    expect(unknown).toEqual([]);
  });

  it("matches the attribute shapes the card reads", () => {
    const state = (id: string | undefined) => hass.states[id!];
    const fan = state(resolved.fan).attributes;
    expect(fan.preset_modes).toEqual(expect.arrayContaining(["auto", "manual"]));
    expect(fan.percentage_step).toBe(10);
    expect(["forward", "reverse"]).toContain(fan.direction);
    expect(typeof fan.oscillating).toBe("boolean");

    const humidifier = state(resolved.ids.humidifier).attributes;
    expect(humidifier).toMatchObject({ min_humidity: 30, max_humidity: 70 });
    expect(humidifier.available_modes).toEqual(expect.arrayContaining(["normal", "auto"]));

    const select = state(resolved.ids.oscillation).attributes;
    expect(select.options).toEqual(expect.arrayContaining([...SWEEP_PRESETS.map(presetOption), BREEZE_OPTION]));
    expect(state(resolved.ids.sleepTimer).attributes).toMatchObject({ min: 0, max: 540, step: 15 });
    expect(state(resolved.ids.waterHardness).attributes.options).toEqual(["Soft", "Medium", "Hard"]);
    expect(state(resolved.ids.voc).attributes.unit_of_measurement).toBe("mg/m³");

    for (const id of Object.values(resolved.faultsByCode)) {
      expect(typeof state(id).attributes.fault_code).toBe("string");
    }
  });

  it("offers the services with the field names the card sends", async () => {
    const services = await live.connection.sendMessagePromise<Record<string, Record<string, { fields: Record<string, any> }>>>({
      type: "get_services",
    });
    expect(services.hass_dyson.reset_filter.fields.filter_type.selector.select.options).toContain("hepa");
    expect(Object.keys(services.humidifier)).toEqual(expect.arrayContaining(["set_mode", "set_humidity", "turn_on", "turn_off"]));
    expect(Object.keys(services.fan)).toEqual(
      expect.arrayContaining(["set_percentage", "set_preset_mode", "set_direction", "oscillate"]),
    );
  });

  it("builds a complete model from live data", () => {
    const model = readModel(hass, resolved);
    expect(model.available).toBe(true);
    expect(model.oscillation).not.toBeNull();
    expect(model.temperature.value).not.toBeNull();
    expect(model.humidity.value).not.toBeNull();
    expect(model.aqi.value).not.toBeNull();
    expect(model.pollutants.map((pollutant) => pollutant.pollutant)).toEqual(["pm25", "pm10", "voc", "no2"]);
  });
});

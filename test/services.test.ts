import { describe, expect, it } from "vitest";
import { resolveEntities } from "../src/entities";
import { createServices, snapHumidity, snapSleepMinutes } from "../src/services";
import { DEVICE_ID, FAN, fakeHass } from "./helpers";

const services = createServices(resolveEntities(fakeHass(), FAN));

describe("service mapping", () => {
  it("drives the fan entity", () => {
    expect(services.power(true)).toEqual([{ domain: "fan", service: "turn_on", data: { entity_id: FAN } }]);
    expect(services.speed(7)).toEqual([{ domain: "fan", service: "set_percentage", data: { entity_id: FAN, percentage: 70 } }]);
    expect(services.speed(0)[0].data.percentage).toBe(10);
    expect(services.autoMode(false)[0]).toEqual({
      domain: "fan",
      service: "set_preset_mode",
      data: { entity_id: FAN, preset_mode: "manual" },
    });
    expect(services.airflow("reverse")[0].data).toEqual({ entity_id: FAN, direction: "reverse" });
  });

  it("toggles night mode through the switch", () => {
    expect(services.night(true)).toEqual([
      { domain: "switch", service: "turn_on", data: { entity_id: "switch.dyson_ph01_night_mode" } },
    ]);
  });

  it("selects sweeps by their literal option strings and turns oscillation off through the fan", () => {
    expect(services.oscillation(90)).toEqual([
      { domain: "select", service: "select_option", data: { entity_id: "select.dyson_ph01_oscillation", option: "90°" } },
    ]);
    expect(services.oscillation("breeze")[0].data).toEqual({ entity_id: "select.dyson_ph01_oscillation", option: "Breeze" });
    expect(services.oscillation("off")).toEqual([
      { domain: "fan", service: "oscillate", data: { entity_id: FAN, oscillating: false } },
    ]);
  });

  it("controls the humidifier", () => {
    const humidifier = "humidifier.bedroom_bedroom_dyson";
    expect(services.humidify("off")).toEqual([{ domain: "humidifier", service: "turn_off", data: { entity_id: humidifier } }]);
    expect(services.humidify("auto")).toEqual([{ domain: "humidifier", service: "set_mode", data: { entity_id: humidifier, mode: "auto" } }]);
    expect(services.targetHumidity(54)).toEqual([
      { domain: "humidifier", service: "set_humidity", data: { entity_id: humidifier, humidity: 50 } },
    ]);
  });

  it("sets the sleep timer, filter reset and water hardness", () => {
    expect(services.sleepTimer(100)).toEqual([
      { domain: "number", service: "set_value", data: { entity_id: "number.dyson_ph01_sleep_timer", value: 105 } },
    ]);
    expect(services.resetFilter()).toEqual([
      { domain: "hass_dyson", service: "reset_filter", data: { device_id: DEVICE_ID, filter_type: "hepa" } },
    ]);
    const hardness = "select.bedroom_bedroom_dyson_water_hardness";
    expect(services.waterHardness("Soft", true)[0].data).toEqual({ entity_id: hardness, option: "Hard" });
    expect(services.waterHardness("Medium", true)[0].data).toEqual({ entity_id: hardness, option: "Medium" });
    expect(services.waterHardness("Soft", false)[0].data).toEqual({ entity_id: hardness, option: "Soft" });
  });
});

describe("snapping", () => {
  it("keeps humidity on the device's 10% steps", () => {
    expect([24, 35, 44, 66, 90].map((value) => snapHumidity(value))).toEqual([30, 40, 40, 70, 70]);
  });

  it("keeps the sleep timer on 15 minute steps up to 9 hours", () => {
    expect([7, 8, 52, 600].map(snapSleepMinutes)).toEqual([0, 15, 45, 540]);
  });
});

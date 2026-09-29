import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../ha-dyson-card.js", import.meta.url), "utf8");
const registry = new Map();
const context = {
  console,
  HTMLElement: class HTMLElement {
    attachShadow() {
      return {};
    }
  },
  customElements: {
    define(name, klass) {
      registry.set(name, klass);
    },
    get(name) {
      return registry.get(name);
    },
  },
  window: {},
  navigator: { language: "fr-FR" },
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "ha-dyson-card.js" });

const Card = context.customElements.get("ha-dyson-card");
assert.equal(typeof Card, "function", "card custom element should be registered");

const card = new Card();
card._config = { entity: "fan.purificateur_dyson" };

const registryData = {
  devices: [{ id: "dyson-device-1", name: "Purificateur Dyson" }],
  entities: [
    { entity_id: "fan.purificateur_dyson", device_id: "dyson-device-1", unique_id: "DYSON123_fan" },
    { entity_id: "sensor.purificateur_dyson_temperature", device_id: "dyson-device-1", unique_id: "DYSON123_temperature", original_name: "Temperature" },
    { entity_id: "sensor.purificateur_dyson_humidite", device_id: "dyson-device-1", unique_id: "DYSON123_humidity", original_name: "Humidite" },
    { entity_id: "sensor.purificateur_dyson_qualite_air", device_id: "dyson-device-1", translation_key: "air_quality_category", original_name: "Qualite de l'air" },
    { entity_id: "sensor.purificateur_dyson_filtre_hepa", device_id: "dyson-device-1", unique_id: "DYSON123_hepa_filter_life", original_name: "Filtre HEPA" },
    { entity_id: "sensor.purificateur_dyson_filtre_carbone", device_id: "dyson-device-1", unique_id: "DYSON123_carbon_filter_life", original_name: "Filtre carbone" },
    { entity_id: "switch.purificateur_dyson_mode_nuit", device_id: "dyson-device-1", unique_id: "DYSON123_night_mode", original_name: "Mode nuit" },
    { entity_id: "select.purificateur_dyson_oscillation", device_id: "dyson-device-1", unique_id: "DYSON123_oscillation", original_name: "Oscillation" },
    { entity_id: "number.purificateur_dyson_angle_bas", device_id: "dyson-device-1", unique_id: "DYSON123_oscillation_low_angle", original_name: "Angle bas" },
    { entity_id: "number.purificateur_dyson_angle_haut", device_id: "dyson-device-1", unique_id: "DYSON123_oscillation_high_angle", original_name: "Angle haut" },
    { entity_id: "number.purificateur_dyson_angle_centre", device_id: "dyson-device-1", unique_id: "DYSON123_oscillation_center_angle", original_name: "Angle centre" },
    { entity_id: "number.purificateur_dyson_angle_oscillation", device_id: "dyson-device-1", unique_id: "DYSON123_oscillation_angle", original_name: "Angle d'oscillation" },
    { entity_id: "number.purificateur_dyson_minuterie", device_id: "dyson-device-1", translation_key: "sleep_timer", original_name: "Minuterie de veille" },
  ],
};

const derived = card._deriveFromRegistry(registryData);
assert.equal(derived.deviceId, "dyson-device-1");
assert.equal(derived.temperatureEntity, "sensor.purificateur_dyson_temperature");
assert.equal(derived.humidityEntity, "sensor.purificateur_dyson_humidite");
assert.equal(derived.airQualityEntity, "sensor.purificateur_dyson_qualite_air");
assert.equal(derived.hepaFilterEntity, "sensor.purificateur_dyson_filtre_hepa");
assert.equal(derived.carbonFilterEntity, "sensor.purificateur_dyson_filtre_carbone");
assert.equal(derived.nightModeEntity, "switch.purificateur_dyson_mode_nuit");
assert.equal(derived.oscillationSelectEntity, "select.purificateur_dyson_oscillation");
assert.equal(derived.oscillationLowEntity, "number.purificateur_dyson_angle_bas");
assert.equal(derived.oscillationHighEntity, "number.purificateur_dyson_angle_haut");
assert.equal(derived.oscillationCenterEntity, "number.purificateur_dyson_angle_centre");
assert.equal(derived.oscillationSpanEntity, "number.purificateur_dyson_angle_oscillation");
assert.equal(derived.sleepTimerEntity, "number.purificateur_dyson_minuterie");
assert.notEqual(derived.oscillationSpanEntity, derived.oscillationLowEntity);

assert.match(source, /const hideEmptyData = hideEmptySensors;/);
assert.doesNotMatch(source, /const hideEmptyData = hideUnsupported \|\| hideEmptySensors;/);
assert.match(source, /container-type:\s*inline-size;/);
assert.match(source, /@container \(max-width: 520px\)/);
assert.doesNotMatch(source, /@media \(max-width: 520px\)/);
assert.match(source, /wheel-sensor-strip sensor-layout-\$\{sensorDetailLayout\}/);
assert.match(source, /\.wheel-sensor-strip:not\(\.expanded\):not\(\.sensor-layout-inline\)/);
assert.match(source, /justify-content:\s*safe center;/);
assert.doesNotMatch(source, /\.wheel-sensor-strip:not\(\.expanded\)\s*\{/);

console.log("regressions passed");

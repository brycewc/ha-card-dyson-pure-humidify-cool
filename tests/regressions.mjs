import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../ha-dyson-card.js", import.meta.url), "utf8");
const registry = new Map();
const localValues = new Map();
const localStorage = {
  getItem(key) {
    return localValues.has(key) ? localValues.get(key) : null;
  },
  setItem(key, value) {
    localValues.set(key, String(value));
  },
  removeItem(key) {
    localValues.delete(key);
  },
  clear() {
    localValues.clear();
  },
};
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
  window: { localStorage },
  navigator: { language: "fr-FR" },
};

vm.createContext(context);
vm.runInContext(source, context, { filename: "ha-dyson-card.js" });

const Card = context.customElements.get("ha-dyson-card");
assert.equal(typeof Card, "function", "card custom element should be registered");

const card = new Card();
card._config = { entity: "fan.purificateur_dyson" };

card._derived = { deviceId: "dyson-device-1" };
assert.equal(
  card._directionPresetAutomationYaml({ name: "Bed", direction: 42 }),
  [
    "# Aim Dyson at Bed (40°)",
    "- action: fan.oscillate",
    "  target:",
    '    entity_id: "fan.purificateur_dyson"',
    "  data:",
    "    oscillating: false",
    "- action: hass_dyson.set_oscillation_angles",
    "  data:",
    '    device_id: "dyson-device-1"',
    "    lower_angle: 40",
    "    upper_angle: 40",
  ].join("\n"),
  "preset automation YAML should expose a stable direct-angle action sequence",
);

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
assert.match(source, /--dyson-wheel-size:\s*min\(calc\(100% - var\(--dyson-speed-gutter\) - var\(--dyson-speed-gutter\)\), 304px\)/);
assert.match(source, /--dyson-speed-gutter:\s*42px/);
assert.match(source, /margin:\s*var\(--dyson-wheel-offset\) auto 0/);
assert.match(source, /class="wheel-direction-center"/);
assert.match(source, /class="wheel-direction-overlay"/);
assert.match(source, /const centerLineEnd = this\._pointForAngle\(160, 160, 115, visualCenter\)/);
assert.match(source, /class="wheel-direction-center" x1="160" y1="160"/);
assert.match(source, /centerLine\.setAttribute\("x2", String\(centerLineEnd\.x\)\)/);
assert.match(source, /centerLine\.style\.display = "none"/);
assert.match(source, /bounds\.width === 0 \? "" : "display:none;"/);
assert.doesNotMatch(source, /wheel-zero-reference|wheel-zero-label|>0°</);
assert.match(source, /const fanAvailable = !\["unknown", "unavailable"\]/);
assert.match(source, /class="unavailable-banner"/);
assert.match(source, /data-preset-automation/);

const syncCard = new Card();
syncCard._config = { entity: "fan.synced_dyson" };
const syncKey = syncCard._presetStorageKey();
localStorage.setItem(syncKey, JSON.stringify([
  { id: "local-bed", name: "Bed", icon: "mdi:bed", direction: 42 },
]));

let serverValue = null;
let subscriptionCallback = null;
let subscriptionClosed = false;
const syncCalls = [];
syncCard._hass = {
  async callWS(message) {
    syncCalls.push(message);
    if (message.type === "frontend/get_user_data") {
      return { value: serverValue };
    }
    if (message.type === "frontend/set_user_data") {
      serverValue = message.value;
      if (subscriptionCallback) subscriptionCallback({ value: serverValue });
      return null;
    }
    throw new Error(`Unexpected message type: ${message.type}`);
  },
  connection: {
    async subscribeMessage(callback, message) {
      assert.equal(message.type, "frontend/subscribe_user_data");
      assert.equal(message.key, syncKey);
      subscriptionCallback = callback;
      callback({ value: serverValue });
      return () => {
        subscriptionClosed = true;
      };
    },
  },
};

await syncCard._ensureDirectionPresets();
assert.equal(serverValue.version, 1, "local migration should write a versioned HA payload");
assert.deepEqual(JSON.parse(JSON.stringify(serverValue.presets)), [
  { id: "local-bed", name: "Bed", icon: "mdi:bed", direction: 40 },
]);
assert.equal(syncCalls.filter((call) => call.type === "frontend/set_user_data").length, 1);
assert.equal(syncCard._directionPresets()[0].name, "Bed");

await syncCard._addDirectionPreset("Desk", "mdi:desk", 91);
assert.equal(serverValue.presets.length, 2, "adding a preset should persist to HA storage");
assert.equal(serverValue.presets[1].name, "Desk");
assert.equal(serverValue.presets[1].direction, 90);

subscriptionCallback({
  value: {
    version: 1,
    presets: [{ id: "remote-sofa", name: "Sofa", icon: "mdi:sofa", direction: 181 }],
  },
});
assert.deepEqual(JSON.parse(JSON.stringify(syncCard._directionPresets())), [
  { id: "remote-sofa", name: "Sofa", icon: "mdi:sofa", direction: 180 },
]);
assert.equal(JSON.parse(localStorage.getItem(syncKey))[0].name, "Sofa", "subscription updates should refresh the local cache");

syncCard.disconnectedCallback();
assert.equal(subscriptionClosed, true, "disconnecting the card should release the HA subscription");

const serverWinsCard = new Card();
serverWinsCard._config = { entity: "fan.server_wins" };
const serverWinsKey = serverWinsCard._presetStorageKey();
localStorage.setItem(serverWinsKey, JSON.stringify([
  { id: "stale-local", name: "Stale", icon: "mdi:history", direction: 10 },
]));
let serverWinsWriteCount = 0;
serverWinsCard._hass = {
  async callWS(message) {
    if (message.type === "frontend/get_user_data") {
      return {
        value: {
          version: 1,
          presets: [{ id: "server-chair", name: "Chair", icon: "mdi:chair-rolling", direction: 275 }],
        },
      };
    }
    if (message.type === "frontend/set_user_data") {
      serverWinsWriteCount += 1;
      return null;
    }
    throw new Error(`Unexpected message type: ${message.type}`);
  },
};
await serverWinsCard._ensureDirectionPresets();
assert.equal(serverWinsWriteCount, 0, "an existing HA value should not be overwritten during hydration");
assert.deepEqual(JSON.parse(JSON.stringify(serverWinsCard._directionPresets())), [
  { id: "server-chair", name: "Chair", icon: "mdi:chair-rolling", direction: 275 },
]);
assert.equal(JSON.parse(localStorage.getItem(serverWinsKey))[0].name, "Chair", "the server value should refresh stale local data");

const recoveryCard = new Card();
recoveryCard._config = { entity: "fan.pending_recovery" };
const recoveryKey = recoveryCard._presetStorageKey();
const oldServerValue = {
  version: 1,
  presets: [{ id: "old-server", name: "Old", icon: "mdi:history", direction: 20 }],
};
recoveryCard._hass = {
  async callWS(message) {
    if (message.type === "frontend/get_user_data") return { value: oldServerValue };
    if (message.type === "frontend/set_user_data") throw new Error("temporary write failure");
    throw new Error(`Unexpected message type: ${message.type}`);
  },
};
await recoveryCard._ensureDirectionPresets();
const failedSave = await recoveryCard._saveDirectionPresets([
  { id: "new-local", name: "New", icon: "mdi:sync-alert", direction: 205 },
]);
assert.equal(failedSave, false);
assert.equal(localStorage.getItem(`${recoveryKey}:pending-sync`), "1", "a failed server write should leave a durable retry marker");

let recoveredServerValue = oldServerValue;
const reloadedRecoveryCard = new Card();
reloadedRecoveryCard._config = { entity: "fan.pending_recovery" };
reloadedRecoveryCard._hass = {
  async callWS(message) {
    if (message.type === "frontend/get_user_data") return { value: recoveredServerValue };
    if (message.type === "frontend/set_user_data") {
      recoveredServerValue = message.value;
      return null;
    }
    throw new Error(`Unexpected message type: ${message.type}`);
  },
};
await reloadedRecoveryCard._ensureDirectionPresets();
assert.equal(recoveredServerValue.presets[0].name, "New", "a pending local change should recover over stale server data");
assert.equal(localStorage.getItem(`${recoveryKey}:pending-sync`), null, "successful recovery should clear the retry marker");

const fallbackCard = new Card();
fallbackCard._config = { entity: "fan.local_fallback" };
const fallbackKey = fallbackCard._presetStorageKey();
localStorage.setItem(fallbackKey, JSON.stringify([
  { id: "fallback-door", name: "Door", icon: "mdi:door", direction: 135 },
]));
fallbackCard._hass = {
  async callWS() {
    throw new Error("HA storage unavailable");
  },
};
await fallbackCard._ensureDirectionPresets();
assert.equal(fallbackCard._directionPresets()[0].name, "Door", "local presets should remain usable after a HA storage failure");

console.log("regressions passed");

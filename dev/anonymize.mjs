export const PLACEHOLDER_SERIAL = "PH01";
export const PLACEHOLDER_DEVICE_ID = "0123456789abcdef0123456789abcdef";
const PLACEHOLDER_IP = "192.0.2.10";
const PLACEHOLDER_LOCATION = "Anytown";

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const slug = (serial) => serial.toLowerCase().replace(/[^a-z0-9]+/g, "_");

// Replaces everything in a snapshot that identifies the device or its home before it is committed.
export function anonymize(data, { serial, deviceId }) {
  let text = JSON.stringify(data);
  const swaps = [
    [serial, PLACEHOLDER_SERIAL],
    [slug(serial), slug(PLACEHOLDER_SERIAL)],
    [deviceId, PLACEHOLDER_DEVICE_ID],
  ];
  for (const [from, to] of swaps) {
    if (from) text = text.replace(new RegExp(escape(from), "gi"), to);
  }
  text = text.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, PLACEHOLDER_IP);
  text = text.replace(/"location":"[^"]+"/g, `"location":"${PLACEHOLDER_LOCATION}"`);
  return JSON.parse(text);
}

export function serialFromFanUniqueId(uniqueId) {
  return String(uniqueId ?? "").replace(/_fan$/, "");
}

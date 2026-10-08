import { execSync } from "node:child_process";
import os from "node:os";

export const HA_DEV_PORT = 5174;
export const HA_DEV_FILE = "dyson-humidify-cool-card-dev.js";

// HA clients reach the Mac by its Bonjour name, which survives DHCP address changes.
export function devHost() {
  try {
    return `${execSync("scutil --get LocalHostName", { encoding: "utf8" }).trim()}.local`;
  } catch {
    return os.hostname();
  }
}

export function devResourceUrl(host = devHost()) {
  return `http://${host}:${HA_DEV_PORT}/${HA_DEV_FILE}`;
}

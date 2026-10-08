import type { TestProject } from "vitest/node";
import { connect, loadLocalEnv, readDevice, toDisplayEntry } from "../../dev/ha-connection.mjs";
import type { EntityRegistryEntry, HassEntity } from "../../src/types";

export interface LiveDevice {
  fanEntity: string;
  states: HassEntity[];
  entities: EntityRegistryEntry[];
}

declare module "vitest" {
  export interface ProvidedContext {
    liveDevice: LiveDevice | null;
  }
}

// happy-dom replaces the global WebSocket, so DOM-environment tests get live data from here instead.
export default async function setup(project: TestProject) {
  const env = loadLocalEnv();
  if (!env.HA_URL || !env.HA_TOKEN) {
    project.provide("liveDevice", null);
    return;
  }
  const connection = await connect({ url: env.HA_URL, token: env.HA_TOKEN });
  try {
    const device = await readDevice(connection, env.HA_FAN_ENTITY);
    project.provide("liveDevice", {
      fanEntity: device.fanEntity,
      states: device.states,
      entities: device.entities.map(toDisplayEntry),
    });
  } finally {
    connection.close();
  }
}

import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";
import { CARD_TAG } from "./vite.config.ts";

const env = loadEnv("live", process.cwd(), "");

export default defineConfig({
  define: {
    __CARD_TAG__: JSON.stringify(CARD_TAG),
  },
  test: {
    include: ["test/live/**/*.test.ts"],
    globalSetup: ["test/live/global-setup.ts"],
    environment: "node",
    testTimeout: 20_000,
    hookTimeout: 20_000,
    env: {
      HA_URL: env.HA_URL ?? "",
      HA_TOKEN: env.HA_TOKEN ?? "",
      HA_FAN_ENTITY: env.HA_FAN_ENTITY ?? "",
    },
  },
});

import { defineConfig } from "vitest/config";
import { CARD_TAG } from "./vite.config.ts";

export default defineConfig({
  define: {
    __CARD_TAG__: JSON.stringify(CARD_TAG),
  },
  test: {
    include: ["test/**/*.test.ts"],
    exclude: ["test/live/**", "node_modules/**"],
    environment: "happy-dom",
  },
});

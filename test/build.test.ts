// @vitest-environment node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { build } from "vite";
import { describe, expect, it } from "vitest";
import { loadLocalEnv } from "../dev/ha-connection.mjs";

describe("production bundle", () => {
  it("never contains the live token or dev-only modules", async () => {
    const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "dyson-card-build-"));
    try {
      await build({ logLevel: "silent", build: { outDir, emptyOutDir: true } });
      const bundle = fs
        .readdirSync(outDir)
        .map((file) => fs.readFileSync(path.join(outDir, file), "utf8"))
        .join("\n");
      expect(bundle).toContain("dyson-humidify-cool-card");
      for (const needle of ["HA_TOKEN", "virtual:ha-live", "createLongLivedTokenAuth"]) {
        expect(bundle).not.toContain(needle);
      }
      const { HA_TOKEN } = loadLocalEnv();
      if (HA_TOKEN) expect(bundle.includes(HA_TOKEN)).toBe(false);
    } finally {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  }, 30_000);
});

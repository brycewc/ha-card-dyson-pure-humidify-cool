import { defineConfig, loadEnv, type Plugin } from "vite";

export const CARD_TAG = "dyson-humidify-cool-card";
export const DEV_CARD_TAG = `${CARD_TAG}-dev`;

const LIVE_MODULE_ID = "virtual:ha-live";

function haLiveModule(env: Record<string, string>, live: boolean): Plugin {
  return {
    name: "ha-live-module",
    apply: "serve",
    resolveId(source) {
      return source === LIVE_MODULE_ID ? `\0${LIVE_MODULE_ID}` : undefined;
    },
    load(id) {
      if (id !== `\0${LIVE_MODULE_ID}`) return undefined;
      const enabled = live && Boolean(env.HA_URL && env.HA_TOKEN);
      return [
        `export const liveEnabled = ${JSON.stringify(enabled)};`,
        `export const liveRequested = ${JSON.stringify(live)};`,
        `export const haToken = ${JSON.stringify(enabled ? env.HA_TOKEN : "")};`,
        `export const fanEntity = ${JSON.stringify(env.HA_FAN_ENTITY || "")};`,
      ].join("\n");
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const haDev = mode === "ha-dev";
  const tag = haDev ? DEV_CARD_TAG : CARD_TAG;

  return {
    define: {
      __CARD_TAG__: JSON.stringify(tag),
    },
    plugins: [haLiveModule(env, mode === "live")],
    server: {
      open: "/dev/",
      proxy: env.HA_URL
        ? {
            "/api/websocket": { target: env.HA_URL, ws: true, changeOrigin: true },
          }
        : undefined,
    },
    preview: {
      host: true,
      allowedHosts: [".local"],
      port: 5174,
      strictPort: true,
      cors: env.HA_URL ? { origin: new URL(env.HA_URL).origin } : false,
      headers: { "Cache-Control": "no-cache" },
    },
    build: {
      outDir: haDev ? "dist-dev" : "dist",
      emptyOutDir: true,
      sourcemap: haDev,
      minify: !haDev,
      lib: {
        entry: "src/card.ts",
        formats: ["es"],
        fileName: () => `${tag}.js`,
      },
    },
  };
});

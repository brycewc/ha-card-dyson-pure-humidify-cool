import { build, preview } from "vite";
import { devResourceUrl } from "./dev-host.mjs";

const watcher = await build({ mode: "ha-dev", build: { watch: {} } });

await new Promise((resolve, reject) => {
  watcher.on("event", (event) => {
    if (event.code === "END") resolve();
    if (event.code === "ERROR") reject(event.error);
    event.result?.close?.();
  });
});

const server = await preview({ mode: "ha-dev" });
server.printUrls();
console.log(`\nDashboard resource (module): ${devResourceUrl()}`);
console.log("Rebuilds on save. Refresh the HA tab to load changes.");

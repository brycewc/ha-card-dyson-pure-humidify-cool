import { READ_ONLY_MESSAGE_TYPES, connect, loadLocalEnv, readDevice } from "./ha-connection.mjs";
import { HA_DEV_FILE, devResourceUrl } from "./dev-host.mjs";

const DASHBOARD_PATH = "dyson-dev";
const DEV_TAG = "dyson-humidify-cool-card-dev";

const ALLOWED = new Set([
  ...READ_ONLY_MESSAGE_TYPES,
  "lovelace/resources",
  "lovelace/resources/create",
  "lovelace/resources/delete",
  "lovelace/dashboards/list",
  "lovelace/dashboards/create",
  "lovelace/dashboards/delete",
  "lovelace/config/save",
]);

const [command = "status", hostOverride] = process.argv.slice(2);
if (!["add", "remove", "status"].includes(command)) {
  console.error("Usage: npm run ha:dev-resource -- add|remove|status [host]");
  process.exit(1);
}

const env = loadLocalEnv();
const url = devResourceUrl(hostOverride);
const connection = await connect({ url: env.HA_URL, token: env.HA_TOKEN, allowed: ALLOWED });
const send = (message) => connection.sendMessagePromise(message);

try {
  const resources = (await send({ type: "lovelace/resources" })).filter((resource) => resource.url.includes(HA_DEV_FILE));
  const dashboard = (await send({ type: "lovelace/dashboards/list" })).find((item) => item.url_path === DASHBOARD_PATH);

  if (command === "status") {
    console.log(resources.length ? `Resource: ${resources.map((resource) => resource.url).join(", ")}` : "Resource: not installed");
    console.log(dashboard ? `Dashboard: ${env.HA_URL}/${DASHBOARD_PATH}` : "Dashboard: not installed");
  }

  if (command === "add") {
    if (!resources.some((resource) => resource.url === url)) {
      await send({ type: "lovelace/resources/create", res_type: "module", url });
      console.log(`Added resource ${url}`);
    }
    if (!dashboard) {
      const { fanEntity } = await readDevice(connection, env.HA_FAN_ENTITY);
      await send({
        type: "lovelace/dashboards/create",
        url_path: DASHBOARD_PATH,
        title: "Dyson Dev",
        icon: "mdi:fan",
        mode: "storage",
        require_admin: true,
        show_in_sidebar: true,
      });
      await send({
        type: "lovelace/config/save",
        url_path: DASHBOARD_PATH,
        config: {
          title: "Dyson Dev",
          views: [
            {
              title: "Dyson",
              path: "dyson",
              type: "sections",
              max_columns: 2,
              sections: [{ type: "grid", cards: [{ type: `custom:${DEV_TAG}`, entity: fanEntity }] }],
            },
          ],
        },
      });
      console.log(`Created dashboard ${env.HA_URL}/${DASHBOARD_PATH}`);
    }
    console.log("Start the dev build with: npm run dev:ha");
  }

  if (command === "remove") {
    for (const resource of resources) {
      await send({ type: "lovelace/resources/delete", resource_id: resource.id });
      console.log(`Removed resource ${resource.url}`);
    }
    if (dashboard) {
      await send({ type: "lovelace/dashboards/delete", dashboard_id: dashboard.id });
      console.log(`Removed dashboard /${DASHBOARD_PATH}`);
    }
  }
} finally {
  connection.close();
}

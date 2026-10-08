import fs from "node:fs";
import path from "node:path";
import { anonymize, serialFromFanUniqueId } from "./anonymize.mjs";
import { connect, loadLocalEnv, readDevice, toDisplayEntry } from "./ha-connection.mjs";

const env = loadLocalEnv();
const connection = await connect({ url: env.HA_URL, token: env.HA_TOKEN });

try {
  const { fanEntity, device, entities, states } = await readDevice(connection, env.HA_FAN_ENTITY);
  const ids = {
    serial: serialFromFanUniqueId(entities.find((entry) => entry.entity_id === fanEntity)?.unique_id),
    deviceId: device?.id,
  };
  const byId = (a, b) => a.entity_id.localeCompare(b.entity_id);
  const fixtures = path.join(process.cwd(), "test", "fixtures");
  fs.mkdirSync(fixtures, { recursive: true });
  const write = (file, data) => fs.writeFileSync(path.join(fixtures, file), `${JSON.stringify(anonymize(data, ids), null, 2)}\n`);

  const strip = ({ context: _context, ...state }) => state;
  write("states.json", states.map(strip).sort(byId));
  write("entities.json", {
    fanEntity,
    device: { id: device?.id, name: device?.name, name_by_user: device?.name_by_user, model: device?.model },
    entities: entities.map(toDisplayEntry).sort(byId),
  });
  console.log(`Wrote anonymized fixtures: ${states.length} states and ${entities.length} registry entries.`);
} finally {
  connection.close();
}

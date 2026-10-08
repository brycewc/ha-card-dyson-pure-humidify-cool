import { describe, expect, it } from "vitest";
import { anonymize, serialFromFanUniqueId } from "../dev/anonymize.mjs";

describe("anonymize", () => {
  it("removes the serial, device id, addresses and location", () => {
    const data = {
      fanEntity: "fan.dyson_ab1_us_xyz1234a",
      device: { id: "f00dfeed", name: "Dyson AB1-US-XYZ1234A" },
      states: [
        { entity_id: "sensor.dyson_ab1_us_xyz1234a_ip_address", state: "10.1.2.3" },
        { entity_id: "sensor.outdoor", attributes: { location: "Somewhere Real", pm2_5: 6 } },
      ],
    };
    const result = JSON.stringify(anonymize(data, { serial: "AB1-US-XYZ1234A", deviceId: "f00dfeed" }));
    expect(result).not.toMatch(/xyz1234|f00dfeed|10\.1\.2\.3|Somewhere Real/i);
    expect(result).toContain("fan.dyson_ph01");
    expect(result).toContain("Dyson PH01");
    expect(result).toContain('"pm2_5":6');
  });

  it("derives the serial from the fan's unique id", () => {
    expect(serialFromFanUniqueId("AB1-US-XYZ1234A_fan")).toBe("AB1-US-XYZ1234A");
  });
});

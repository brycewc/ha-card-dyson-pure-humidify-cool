import registry from "../test/fixtures/entities.json";
import fixtureStates from "../test/fixtures/states.json";
import { resolveEntities } from "../src/entities";
import type { EntityRegistryEntry, HassEntity, HomeAssistant } from "../src/types";

export type HassListener = (hass: HomeAssistant) => void;
export type LogFn = (kind: string, message: string) => void;

const DEVICE_LATENCY = 350;
const SLEEP_TIMER_LATENCY = 2_000;

export class MockHass {
  readonly fanEntity = registry.fanEntity;
  private states: Record<string, HassEntity>;
  private readonly entities: Record<string, EntityRegistryEntry>;
  private readonly ids;
  private readonly faults;
  private deepCleanTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly onChange: HassListener,
    private readonly log: LogFn,
  ) {
    this.states = Object.fromEntries(
      (structuredClone(fixtureStates) as HassEntity[]).map((state) => [state.entity_id, state]),
    );
    this.entities = Object.fromEntries(
      (registry.entities as EntityRegistryEntry[]).map((entry) => [entry.entity_id, entry]),
    );
    const resolved = resolveEntities(this.hass(), this.fanEntity);
    this.ids = resolved.ids;
    this.faults = resolved.faultsByCode;
  }

  hass(): HomeAssistant {
    return {
      states: this.states,
      entities: this.entities,
      devices: { [registry.device.id]: { ...registry.device } },
      user: { id: "mock-user", name: "Mock", is_admin: true },
      callService: (domain, service, data = {}) => this.callService(domain, service, data),
      callWS: (message) => this.callWS(message),
    };
  }

  private emit() {
    this.onChange(this.hass());
  }

  private patch(entityId: string | undefined, state?: string, attributes: Record<string, unknown> = {}) {
    if (!entityId) return;
    const current = this.states[entityId];
    const now = new Date().toISOString();
    const nextState = state ?? current.state;
    this.states = {
      ...this.states,
      [entityId]: {
        ...current,
        state: nextState,
        attributes: { ...current.attributes, ...attributes },
        last_updated: now,
        last_changed: nextState === current.state ? current.last_changed : now,
      },
    };
  }

  setDeepClean(running: boolean, { almostDone = false } = {}) {
    if (this.deepCleanTimer) clearInterval(this.deepCleanTimer);
    this.deepCleanTimer = null;
    if (!running) {
      this.patch(this.ids.cleaningRemaining, "60");
      this.emit();
      return;
    }
    let minutes = almostDone ? 1 : 59;
    this.patch(this.ids.cleaningRemaining, String(minutes));
    if (almostDone && this.ids.cleaningRemaining) {
      const id = this.ids.cleaningRemaining;
      this.states[id] = { ...this.states[id], last_changed: new Date(Date.now() - 50_000).toISOString() };
    }
    this.emit();
    this.deepCleanTimer = setInterval(() => {
      minutes -= 1;
      this.patch(this.ids.cleaningRemaining, String(Math.max(0, minutes)));
      if (minutes <= 0) this.setDeepClean(false);
      else this.emit();
    }, 60_000);
  }

  setFault(code: string, on: boolean) {
    const severity = code === "tnke" || code === "tnkp" ? "Critical" : "Maintenance";
    this.patch(this.faults[code], on ? "on" : "off", on ? { severity } : { severity: undefined, description: undefined });
    this.emit();
  }

  setFilterReplacement(on: boolean) {
    this.patch(this.ids.filterReplacement, on ? "on" : "off");
    this.patch(this.ids.filterLife, on ? "8" : "29");
    this.emit();
  }

  setAvailable(available: boolean) {
    this.patch(this.fanEntity, available ? "off" : "unavailable");
    this.emit();
  }

  private async callService(domain: string, service: string, data: Record<string, unknown>) {
    this.log("service", `${domain}.${service} ${JSON.stringify(data)}`);
    const delay = domain === "number" && data.entity_id === this.ids.sleepTimer ? SLEEP_TIMER_LATENCY : DEVICE_LATENCY;
    setTimeout(() => {
      this.apply(domain, service, data);
      this.emit();
    }, delay);
  }

  private apply(domain: string, service: string, data: Record<string, any>) {
    const fan = this.fanEntity;
    switch (`${domain}.${service}`) {
      case "fan.turn_on":
        return this.patch(fan, "on");
      case "fan.turn_off":
        return this.patch(fan, "off");
      case "fan.set_percentage":
        return this.patch(fan, "on", { percentage: data.percentage, preset_mode: "manual" });
      case "fan.set_preset_mode":
        return this.patch(fan, undefined, { preset_mode: data.preset_mode });
      case "fan.set_direction":
        return this.patch(fan, undefined, { direction: data.direction });
      case "fan.oscillate":
        return this.patch(fan, undefined, { oscillating: data.oscillating });
      case "switch.turn_on":
      case "switch.turn_off":
        return this.patch(data.entity_id, service === "turn_on" ? "on" : "off");
      case "select.select_option":
        if (data.entity_id === this.ids.oscillation) this.patch(fan, undefined, { oscillating: true });
        if (data.entity_id === this.ids.waterHardness) {
          const hassDysonRaw: Record<string, string> = { Soft: "0675", Medium: "1350", Hard: "2025" };
          return this.patch(data.entity_id, data.option, { water_hardness_raw: hassDysonRaw[data.option] });
        }
        return this.patch(data.entity_id, data.option);
      case "number.set_value":
        return this.patch(data.entity_id, String(data.value));
      case "hass_dyson.reset_filter":
        return this.patch(this.ids.filterLife, "100");
      case "humidifier.turn_off":
        return this.patch(data.entity_id, "off", { mode: null });
      case "humidifier.turn_on":
        return this.patch(data.entity_id, "on", { mode: "normal" });
      case "humidifier.set_mode":
        return this.patch(data.entity_id, "on", { mode: data.mode });
      case "humidifier.set_humidity":
        return this.patch(data.entity_id, undefined, { humidity: data.humidity });
      default:
        this.log("warn", `Mock does not simulate ${domain}.${service}`);
    }
  }

  private async callWS<T>(message: Record<string, unknown>): Promise<T> {
    this.log("ws", JSON.stringify(message));
    throw new Error(`Mock does not handle ${message.type}`);
  }
}

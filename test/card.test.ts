import { afterEach, describe, expect, it } from "vitest";
import "../src/card";
import type { DysonHumidifyCoolCard } from "../src/card";
import { CARD_TAG } from "../vite.config";
import { FAN, fakeHass, setState, type FakeHass } from "./helpers";

async function mount(hass: FakeHass, config: Record<string, unknown> = {}) {
  const card = document.createElement(CARD_TAG) as DysonHumidifyCoolCard;
  card.setConfig({ type: `custom:${CARD_TAG}`, entity: FAN, ...config });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  return { card, root: card.shadowRoot! };
}

const button = (root: ShadowRoot, text: string) =>
  [...root.querySelectorAll("button")].find((el) => el.textContent?.replace(/\s+/g, " ").trim() === text);

afterEach(() => document.body.replaceChildren());

describe("card", () => {
  it("registers under the configured tag", () => {
    expect(customElements.get(CARD_TAG)).toBeDefined();
  });

  it("renders every section for the PH01", async () => {
    const { root } = await mount(fakeHass());
    const titles = [...root.querySelectorAll(".section-title")].map((el) => el.textContent);
    expect(titles).toEqual(["Fan", "Oscillation", "Humidify", "Sleep timer", "Maintenance"]);
    expect(root.querySelector(".title")?.textContent).toBe("Bedroom Dyson");
    expect(root.querySelector(".status")?.textContent).toBe("Off");
    expect(
      [...root.querySelectorAll('[aria-label="Oscillation"] button')].map((el) => [el.textContent?.trim(), el.getAttribute("aria-pressed")]),
    ).toEqual([
      ["Off", "false"],
      ["45°", "true"],
      ["90°", "false"],
      ["Breeze", "false"],
    ]);
    expect(root.textContent).not.toMatch(/Heat|Fan only/);
  });

  it("hides the meaningless speed while Auto is on and shows it in manual", async () => {
    const auto = await mount(fakeHass((states) => setState(states, FAN, "on")));
    const fanValue = (root: ShadowRoot) => root.querySelector(".section .section-value")?.textContent;
    expect(fanValue(auto.root)).toBe("Auto");
    expect(auto.root.querySelector(".status")?.textContent).toBe("Auto");
    expect(auto.root.querySelector('input[aria-label="Fan speed"]')).toBeNull();
    auto.card.remove();

    const manual = await mount(fakeHass((states) => setState(states, FAN, "on", { preset_mode: "manual", percentage: 60 })));
    expect(fanValue(manual.root)).toBe("Speed 6");
    expect(manual.root.querySelector(".status")?.textContent).toBe("Speed 6");
    expect(manual.root.querySelector('input[aria-label="Fan speed"]')).not.toBeNull();
  });

  it("keeps the controls in a disclosure that starts collapsed", async () => {
    const { card, root } = await mount(fakeHass());
    const disclosure = root.querySelector<HTMLButtonElement>(".disclosure")!;
    const panel = root.querySelector("#dhc-controls")!;
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hasAttribute("inert")).toBe(true);
    expect(root.querySelectorAll(".readings .reading")).toHaveLength(3);
    disclosure.click();
    await card.updateComplete;
    expect(disclosure.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hasAttribute("inert")).toBe(false);
    expect(panel.classList.contains("open")).toBe(true);
  });

  it("hides maintenance when configured", async () => {
    const { root } = await mount(fakeHass(), { show_maintenance: false });
    expect([...root.querySelectorAll(".section-title")].map((el) => el.textContent)).not.toContain("Maintenance");
  });

  it("turns the fan on and shows it optimistically", async () => {
    const hass = fakeHass();
    const { card, root } = await mount(hass);
    root.querySelector<HTMLButtonElement>(".icon-toggle")!.click();
    await card.updateComplete;
    expect(hass.calls).toEqual([{ domain: "fan", service: "turn_on", data: { entity_id: FAN } }]);
    expect(root.querySelector(".icon-toggle")?.getAttribute("aria-pressed")).toBe("true");
  });

  it("switches humidify to auto with set_mode", async () => {
    const hass = fakeHass();
    const { card, root } = await mount(hass);
    button(root, "Auto")!.click();
    await card.updateComplete;
    expect(hass.calls.at(-1)).toMatchObject({ domain: "fan", service: "set_preset_mode" });

    const humidifyAuto = [...root.querySelectorAll('[aria-label="Humidify mode"] button')].find(
      (el) => el.textContent?.trim() === "Auto",
    ) as HTMLButtonElement;
    humidifyAuto.click();
    await card.updateComplete;
    expect(hass.calls.at(-1)).toEqual({
      domain: "humidifier",
      service: "set_mode",
      data: { entity_id: "humidifier.bedroom_bedroom_dyson", mode: "auto" },
    });
  });

  it("shows a refill banner", async () => {
    const hass = fakeHass((states) =>
      setState(states, "binary_sensor.bedroom_bedroom_dyson_fault_water_level", "on", { severity: "Critical" }),
    );
    const { root } = await mount(hass);
    expect(root.querySelector(".alert.error")?.textContent).toMatch(/Water tank empty/);
  });

  it("requires two taps to reset the filter", async () => {
    const hass = fakeHass();
    const { card, root } = await mount(hass);
    root.querySelector<HTMLButtonElement>(".section .expander")!.click();
    await card.updateComplete;
    button(root, "Reset filter life")!.click();
    await card.updateComplete;
    expect(hass.calls).toEqual([]);
    button(root, "Tap again to reset")!.click();
    await card.updateComplete;
    expect(hass.calls).toEqual([{ domain: "hass_dyson", service: "reset_filter", data: expect.objectContaining({ filter_type: "hepa" }) }]);
  });

  it("replaces every control with a countdown during a deep clean", async () => {
    const changed = new Date(Date.now() - 10_000).toISOString();
    const hass = fakeHass((states) => {
      setState(states, "sensor.bedroom_bedroom_dyson_cleaning_time_remaining", "42");
      states["sensor.bedroom_bedroom_dyson_cleaning_time_remaining"].last_changed = changed;
    });
    const { card, root } = await mount(hass);
    expect(root.querySelector(".status")?.textContent).toBe("Deep cleaning");
    expect(root.querySelector(".deep-clean-time")?.textContent).toMatch(/^41:5\d$/);
    expect(root.querySelectorAll(".section")).toHaveLength(0);
    expect(root.querySelector(".icon-toggle")).toBeNull();
    card.remove();
  });

  it("shows a completed clean instead of 00:00 and returns to the controls on Done", async () => {
    const sensor = "sensor.bedroom_bedroom_dyson_cleaning_time_remaining";
    const running = fakeHass((states) => {
      setState(states, sensor, "1");
      states[sensor].last_changed = new Date(Date.now() - 2 * 60_000).toISOString();
    });
    const { card, root } = await mount(running);
    expect(root.querySelector(".deep-clean-result")?.textContent).toBe("Deep clean complete");
    expect(root.querySelector(".status")?.textContent).toBe("Deep clean complete");
    expect(root.querySelector(".deep-clean-time")).toBeNull();
    button(root, "Done")!.click();
    await card.updateComplete;
    expect(root.querySelectorAll(".section")).toHaveLength(5);
    card.remove();
  });

  it("disables controls when the Dyson is unavailable", async () => {
    const { root } = await mount(fakeHass((states) => setState(states, FAN, "unavailable")));
    expect(root.querySelector(".banner")?.textContent).toMatch(/Bedroom Dyson can't be reached/);
    expect(root.querySelector<HTMLButtonElement>(".icon-toggle")!.disabled).toBe(true);
  });
});

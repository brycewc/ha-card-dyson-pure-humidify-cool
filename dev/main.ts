import { fanEntity as configuredFan, haToken, liveEnabled, liveRequested } from "virtual:ha-live";
import "../src/card";
import type { HomeAssistant } from "../src/types";
import { LiveHass } from "./live-hass";
import { MockHass } from "./mock-hass";
import { defineStubs } from "./stubs";
import { HA_DEFAULT, applyVars, haThemeVars, materialYouVars, type ThemeVars } from "./themes";

declare const __CARD_TAG__: string;
const CARD_TAG = __CARD_TAG__;

defineStubs();

interface Settings {
  theme: string;
  dark: boolean;
  seed: string;
  layout: "single" | "compare";
  width: number;
}

const SETTINGS_KEY = "dyson-card-harness";
const defaults: Settings = { theme: "material_you", dark: false, seed: "#4c5c92", layout: "compare", width: 420 };

function loadSettings(): Settings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") };
  } catch {
    return { ...defaults };
  }
}

const settings = loadSettings();
const saveSettings = () => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private windows; settings then reset on reload.
  }
};

const logElement = document.getElementById("log")!;
const log = (kind: string, message: string) => {
  const line = document.createElement("div");
  line.className = kind;
  line.textContent = `${new Date().toLocaleTimeString()}  ${kind.padEnd(8)} ${message}`;
  logElement.prepend(line);
};

let hass: HomeAssistant | null = null;
let live: LiveHass | null = null;
let mock: MockHass | null = null;
let fanEntity = "";
const cards: HTMLElement[] = [];

const pushHass = (next: HomeAssistant) => {
  hass = next;
  for (const card of cards) (card as unknown as { hass: HomeAssistant }).hass = next;
  maybeSeedFromHelper();
};

let seededFromHelper = false;
function maybeSeedFromHelper() {
  if (!live || !hass || seededFromHelper) return;
  const userId = hass.user?.id;
  const helper =
    (userId && hass.states[`input_text.material_you_base_color_${userId}`]) || hass.states["input_text.material_you_base_color"];
  if (helper && /^#[0-9a-f]{6}$/i.test(helper.state)) {
    settings.seed = helper.state;
    log("info", `Using your Material You seed color ${helper.state} from ${helper.entity_id}`);
    seededFromHelper = true;
    renderControls();
    renderPreviews();
  }
}

function themeVars(theme: string, dark: boolean): ThemeVars {
  if (theme === "ha_default") return HA_DEFAULT[dark ? "dark" : "light"];
  const haTheme = live?.themes?.themes?.[theme];
  if (haTheme) return haThemeVars(haTheme, dark, settings.seed);
  return materialYouVars(settings.seed, dark);
}

function themeOptions(): [string, string][] {
  const options: [string, string][] = [
    ["ha_default", "HA default"],
    ["material_you", live?.themes?.themes?.material_you ? "Material You (your HA theme)" : "Material You (generated)"],
  ];
  for (const name of Object.keys(live?.themes?.themes ?? {})) {
    if (name !== "material_you") options.push([name, `${name} (HA)`]);
  }
  return options;
}

function renderPreviews() {
  const container = document.getElementById("previews")!;
  container.replaceChildren();
  cards.length = 0;
  if (!fanEntity) return;
  const variants: { caption: string; theme: string; dark: boolean }[] =
    settings.layout === "compare"
      ? [
          { caption: "HA default, light", theme: "ha_default", dark: false },
          { caption: "HA default, dark", theme: "ha_default", dark: true },
          { caption: "Material You, light", theme: "material_you", dark: false },
          { caption: "Material You, dark", theme: "material_you", dark: true },
        ]
      : [{ caption: `${settings.theme}, ${settings.dark ? "dark" : "light"}`, theme: settings.theme, dark: settings.dark }];

  for (const variant of variants) {
    const preview = document.createElement("section");
    preview.className = "preview";
    applyVars(preview, themeVars(variant.theme, variant.dark));
    preview.style.width = `${settings.width + 32}px`;
    preview.style.colorScheme = variant.dark ? "dark" : "light";
    const caption = document.createElement("p");
    caption.className = "caption";
    caption.textContent = variant.caption;
    const card = document.createElement(CARD_TAG) as HTMLElement & {
      setConfig(config: object): void;
      hass: HomeAssistant;
    };
    card.setConfig({ type: `custom:${CARD_TAG}`, entity: fanEntity });
    if (hass) card.hass = hass;
    preview.append(caption, card);
    container.append(preview);
    cards.push(card);
  }
}

function control(html: string): HTMLElement {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild as HTMLElement;
}

function renderControls() {
  const header = document.getElementById("controls")!;
  header.replaceChildren();

  const source = live ? (live.armed ? "Live, writes ARMED" : "Live, dry run") : "Mock";
  header.append(control(`<span class="badge ${live ? (live.armed ? "armed" : "live") : "mock"}">${source}</span>`));

  const layout = control(`<label>Layout <select>
      <option value="compare">Compare themes</option><option value="single">Single</option></select></label>`);
  const layoutSelect = layout.querySelector("select")!;
  layoutSelect.value = settings.layout;
  layoutSelect.addEventListener("change", () => {
    settings.layout = layoutSelect.value as Settings["layout"];
    saveSettings();
    renderControls();
    renderPreviews();
  });
  header.append(layout);

  if (settings.layout === "single") {
    const theme = control(`<label>Theme <select></select></label>`);
    const select = theme.querySelector("select")!;
    for (const [value, label] of themeOptions()) select.append(new Option(label, value));
    select.value = settings.theme;
    select.addEventListener("change", () => {
      settings.theme = select.value;
      saveSettings();
      renderPreviews();
    });
    header.append(theme);

    const dark = control(`<label><input type="checkbox" /> Dark</label>`);
    const darkInput = dark.querySelector("input")!;
    darkInput.checked = settings.dark;
    darkInput.addEventListener("change", () => {
      settings.dark = darkInput.checked;
      saveSettings();
      renderPreviews();
    });
    header.append(dark);
  }

  const seed = control(`<label>Seed <input type="color" /></label>`);
  const seedInput = seed.querySelector("input")!;
  seedInput.value = settings.seed;
  seedInput.addEventListener("change", () => {
    settings.seed = seedInput.value;
    saveSettings();
    renderPreviews();
  });
  header.append(seed);

  const width = control(`<label>Width <select>
      <option value="340">340</option><option value="360">360</option><option value="420">420</option><option value="500">500</option></select></label>`);
  const widthSelect = width.querySelector("select")!;
  widthSelect.value = String(settings.width);
  widthSelect.addEventListener("change", () => {
    settings.width = Number(widthSelect.value);
    saveSettings();
    renderPreviews();
  });
  header.append(width);

  if (live) {
    const arm = control(`<label><input type="checkbox" /> Arm writes (controls the real Dyson)</label>`);
    const armInput = arm.querySelector("input")!;
    armInput.checked = live.armed;
    armInput.addEventListener("change", () => {
      live!.armed = armInput.checked;
      log(live!.armed ? "warn" : "info", live!.armed ? "Writes armed: service calls now reach the device" : "Writes disarmed");
      renderControls();
    });
    header.append(arm);
  }

  if (mock) {
    const toggles: [string, (on: boolean) => void][] = [
      ["Tank empty", (on) => mock!.setFault("tnke", on)],
      ["Deep clean due", (on) => mock!.setFault("cldu", on)],
      ["Replace filter", (on) => mock!.setFilterReplacement(on)],
      ["Deep clean running", (on) => mock!.setDeepClean(on)],
      ["Deep clean ending", (on) => mock!.setDeepClean(on, { almostDone: true })],
      ["Unavailable", (on) => mock!.setAvailable(!on)],
    ];
    for (const [label, apply] of toggles) {
      const toggle = control(`<label><input type="checkbox" /> ${label}</label>`);
      toggle.querySelector("input")!.addEventListener("change", (event) => apply((event.target as HTMLInputElement).checked));
      header.append(toggle);
    }
  }
}

window.addEventListener("hass-more-info", ((event: CustomEvent<{ entityId: string }>) => {
  document.getElementById("more-info")?.remove();
  const panel = document.createElement("pre");
  panel.id = "more-info";
  panel.textContent = JSON.stringify(hass?.states[event.detail.entityId] ?? event.detail, null, 2);
  panel.title = "Click to close";
  panel.addEventListener("click", () => panel.remove());
  document.body.append(panel);
  log("more-info", event.detail.entityId);
}) as EventListener);

window.addEventListener("hass-notification", ((event: CustomEvent<{ message: string }>) => {
  log("error", event.detail.message);
}) as EventListener);

async function start() {
  if (liveRequested && !liveEnabled) {
    log("error", "dev:live needs HA_URL and HA_TOKEN in .env.local. Falling back to the mock.");
  }
  if (liveEnabled) {
    try {
      live = await LiveHass.connect(haToken, configuredFan, pushHass, log);
      fanEntity = live.fanEntity;
      log("info", `Connected to Home Assistant, dry run. Card entity: ${fanEntity || "none found"}`);
    } catch (error) {
      log("error", `Could not connect to Home Assistant (${String(error)}). Falling back to the mock.`);
      live = null;
    }
  }
  if (!live) {
    mock = new MockHass(pushHass, log);
    fanEntity = mock.fanEntity;
    hass = mock.hass();
    log("info", "Using mock data from test/fixtures (run npm run snapshot to refresh)");
  }
  renderControls();
  renderPreviews();
  if (live) pushHass(live.hass());
}

void start();

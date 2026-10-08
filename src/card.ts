import { LitElement, html, nothing, type TemplateResult } from "lit";
import { classMap } from "lit/directives/class-map.js";
import { styleMap } from "lit/directives/style-map.js";
import { BAND_LABELS } from "./air-quality";
import { DEEP_CLEAN_MINUTES, DeepCleanTracker, formatCountdown, type DeepCleanView } from "./deep-clean";
import { deviceEntries, resolveEntities, trackedEntityIds, type ResolvedEntities } from "./entities";
import { capitalize, formatHoursAsDays, formatMinutes } from "./format";
import { readModel, type DysonModel } from "./model";
import { SWEEP_PRESETS, presetOption } from "./oscillation";
import { PendingStore } from "./pending";
import { createServices, snapSleepMinutes, type DysonServices, type OscillationChoice } from "./services";
import { cardStyles, tokens } from "./styles";
import type { CardConfig, EntityRegistryEntry, HassEntity, HomeAssistant, ServiceCall } from "./types";

declare const __CARD_TAG__: string;

type HumidifyChoice = "off" | "normal" | "auto";

const PENDING_TTL = 15_000;
const SLEEP_PENDING_TTL = 25_000;
const RESET_CONFIRM_WINDOW = 5_000;
const TIMER_SHORTCUTS = [60, 120, 180];

function humidifyChoice(model: DysonModel): HumidifyChoice {
  if (!model.humidify.on) return "off";
  return model.humidify.mode ?? "normal";
}

function pendingEquals(key: string, pending: unknown, actual: unknown): boolean {
  if (key === "sleep") {
    const want = Number(pending);
    const have = Number(actual);
    return want === 0 ? have === 0 : have > 0 && Math.abs(have - want) <= 15;
  }
  return pending === actual;
}

export class DysonHumidifyCoolCard extends LitElement {
  static override styles = [tokens, cardStyles];

  static override properties = {
    _config: { state: true },
    _aqiExpanded: { state: true },
    _maintenanceOpen: { state: true },
    _controlsOpen: { state: true },
    _timerCustomOpen: { state: true },
    _timerCustomMinutes: { state: true },
    _resetArmed: { state: true },
    _sliderDrafts: { state: true },
  };

  declare private _config: CardConfig | undefined;
  declare private _aqiExpanded: boolean;
  declare private _maintenanceOpen: boolean;
  declare private _controlsOpen: boolean;
  declare private _timerCustomOpen: boolean;
  declare private _timerCustomMinutes: number;
  declare private _resetArmed: boolean;
  declare private _sliderDrafts: Record<string, number>;

  private _hass?: HomeAssistant;
  private _resolved?: ResolvedEntities;
  private _resolvedFor?: { entities: unknown; config: CardConfig; deviceEntries: EntityRegistryEntry[] };
  private _lastStates = new Map<string, HassEntity | undefined>();
  private _services?: DysonServices;
  private _resetTimer: ReturnType<typeof setTimeout> | null = null;
  private _countdownTimer: ReturnType<typeof setInterval> | null = null;
  private readonly _deepClean = new DeepCleanTracker();
  private readonly _pending = new PendingStore(() => this.requestUpdate());

  constructor() {
    super();
    this._aqiExpanded = false;
    this._maintenanceOpen = false;
    this._controlsOpen = false;
    this._timerCustomOpen = false;
    this._timerCustomMinutes = 90;
    this._resetArmed = false;
    this._sliderDrafts = {};
  }

  static getStubConfig(hass?: HomeAssistant): Partial<CardConfig> {
    const fan = Object.values(hass?.entities ?? {}).find(
      (entry) => entry.platform === "hass_dyson" && entry.entity_id.startsWith("fan."),
    );
    return { entity: fan?.entity_id ?? "", show_maintenance: true };
  }

  static getConfigForm() {
    return {
      schema: [
        { name: "entity", required: true, selector: { entity: { filter: [{ domain: "fan", integration: "hass_dyson" }] } } },
        { name: "title", selector: { text: {} } },
        { name: "show_maintenance", selector: { boolean: {} } },
      ],
      computeLabel: (schema: { name: string }) =>
        ({
          entity: "Dyson fan",
          title: "Title",
          show_maintenance: "Maintenance panel",
        })[schema.name],
    };
  }

  setConfig(config: CardConfig): void {
    if (!config?.entity) throw new Error("Set entity to the Dyson fan entity (fan.*).");
    if (!config.entity.startsWith("fan.")) throw new Error("entity must be a fan.* entity from hass_dyson.");
    this._config = { show_maintenance: true, ...config };
    this._resolvedFor = undefined;
    if (this._hass) this.hass = this._hass;
  }

  set hass(hass: HomeAssistant) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._config) return;
    const resolvedChanged = this._resolve(hass);
    if (first || resolvedChanged || this._trackedStatesChanged(hass)) {
      this._reconcilePending();
      this.requestUpdate();
    }
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  getCardSize(): number {
    return 10;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._pending.dispose();
    if (this._resetTimer) clearTimeout(this._resetTimer);
    this._setCountdownTicking(false);
  }

  private _setCountdownTicking(on: boolean): void {
    if (on && !this._countdownTimer) {
      this._countdownTimer = setInterval(() => this.requestUpdate(), 1000);
    } else if (!on && this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  }

  private _resolve(hass: HomeAssistant): boolean {
    const config = this._config!;
    const cached = this._resolvedFor;
    let entries = cached?.deviceEntries;
    if (!cached || cached.entities !== hass.entities || cached.config !== config) {
      const deviceId = hass.entities?.[config.entity]?.device_id ?? null;
      entries = deviceEntries(hass, deviceId);
    }
    const next = resolveEntities(hass, config.entity, config.entities ?? {}, entries);
    const changed = JSON.stringify(next) !== JSON.stringify(this._resolved);
    this._resolvedFor = { entities: hass.entities, config, deviceEntries: entries ?? [] };
    if (changed) {
      this._resolved = next;
      this._services = createServices(next);
      this._lastStates.clear();
    }
    return changed;
  }

  private _trackedStatesChanged(hass: HomeAssistant): boolean {
    if (!this._resolved) return false;
    let changed = false;
    for (const id of trackedEntityIds(this._resolved)) {
      const state = hass.states[id];
      if (this._lastStates.get(id) !== state) {
        this._lastStates.set(id, state);
        changed = true;
      }
    }
    return changed;
  }

  private _reconcilePending(): void {
    if (!this._hass || !this._resolved || !this._pending.size) return;
    const model = readModel(this._hass, this._resolved);
    this._pending.reconcile(
      {
        power: model.power,
        auto: model.autoMode,
        speed: model.speed,
        night: model.night,
        airflow: model.airflow,
        oscillation: model.oscillation,
        humidify: humidifyChoice(model),
        target: model.humidify.target,
        sleep: model.sleepTimer.minutes,
        hardness: model.maintenance.waterHardness?.value ?? null,
      },
      pendingEquals,
    );
  }

  private _notify(message: string): void {
    this.dispatchEvent(new CustomEvent("hass-notification", { detail: { message }, bubbles: true, composed: true }));
  }

  private _moreInfo(entityId: string | undefined): void {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
  }

  private async _run(calls: ServiceCall[], pending?: { key: string; value: unknown; ttl?: number }): Promise<void> {
    if (!this._hass || !calls.length) return;
    if (pending) this._pending.set(pending.key, pending.value, pending.ttl ?? PENDING_TTL);
    this.requestUpdate();
    try {
      for (const { domain, service, data } of calls) {
        await this._hass.callService(domain, service, data);
      }
    } catch (error) {
      if (pending) this._pending.clear(pending.key);
      this._notify(`Dyson: ${(error as Error).message ?? error}`);
    }
    this.requestUpdate();
  }

  private _view(): DysonModel | null {
    if (!this._hass || !this._resolved) return null;
    const model = readModel(this._hass, this._resolved);
    const p = this._pending;
    const humidify = p.value<HumidifyChoice>("humidify", humidifyChoice(model));
    return {
      ...model,
      power: p.value("power", model.power),
      autoMode: p.value("auto", model.autoMode),
      speed: this._sliderDrafts.speed ?? p.value("speed", model.speed),
      night: p.value("night", model.night),
      airflow: p.value("airflow", model.airflow),
      oscillation: model.oscillation === null ? null : p.value("oscillation", model.oscillation),
      humidify: {
        ...model.humidify,
        on: humidify !== "off",
        mode: humidify === "off" ? model.humidify.mode : humidify,
        target: this._sliderDrafts.target ?? p.value("target", model.humidify.target),
      },
      sleepTimer: { ...model.sleepTimer, minutes: p.value("sleep", model.sleepTimer.minutes) },
      maintenance: {
        ...model.maintenance,
        waterHardness: model.maintenance.waterHardness
          ? { ...model.maintenance.waterHardness, value: p.value("hardness", model.maintenance.waterHardness.value) }
          : null,
      },
    };
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config) return nothing;
    if (!this._hass) return html`<ha-card><div class="card"></div></ha-card>`;
    const fan = this._hass.states[this._config.entity];
    if (!fan) {
      return html`<ha-card><div class="card"><div class="banner">Entity not found: ${this._config.entity}</div></div></ha-card>`;
    }
    const view = this._view()!;
    const unavailable = !view.available;
    const clean = this._deepClean.update(
      {
        minutesRemaining: view.deepClean.minutes,
        changedAt: view.deepClean.changedAt,
        failure: view.alerts.find((alert) => alert.tone === "error")?.message ?? null,
      },
      Date.now(),
    );
    this._setCountdownTicking(clean.phase !== "idle");
    if (clean.phase !== "idle") return this._renderDeepClean(view, clean);

    return html`
      <ha-card>
        <div class=${classMap({ card: true, unavailable })}>
          ${this._renderHeader(view)}
          ${unavailable
            ? html`<div class="banner" role="status">
                <ha-icon icon="mdi:lan-disconnect"></ha-icon>
                <span>${view.deviceName} can't be reached. Check that it is powered on and connected.</span>
              </div>`
            : nothing}
          ${this._renderAlerts(view)} ${this._renderReadings(view)}
          <div class="controls">
            <button
              class=${classMap({ disclosure: true, expander: true, interactive: true, open: this._controlsOpen })}
              aria-expanded=${this._controlsOpen ? "true" : "false"}
              aria-controls="dhc-controls"
              @click=${() => (this._controlsOpen = !this._controlsOpen)}
            >
              <ha-icon icon="mdi:tune-variant"></ha-icon>
              <span>Controls</span>
              <ha-icon class="chevron" icon="mdi:chevron-down"></ha-icon>
            </button>
            <div id="dhc-controls" class=${classMap({ collapsible: true, open: this._controlsOpen })} ?inert=${!this._controlsOpen}>
              <div class="collapsible-inner">
                <div class="sections">
                  ${this._renderFan(view)} ${this._renderOscillation(view)} ${this._renderHumidify(view)}
                  ${this._renderTimer(view)} ${this._config.show_maintenance ? this._renderMaintenance(view) : nothing}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  private _renderDeepClean(view: DysonModel, clean: DeepCleanView) {
    const clock = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const status = { running: "Deep cleaning", complete: "Deep clean complete", interrupted: "Deep clean interrupted" }[
      clean.phase as "running" | "complete" | "interrupted"
    ];

    return html`
      <ha-card>
        <div class="card">
          <div class="header">
            <div class="heading">
              <div class="title">${this._config?.title?.trim() || view.name}</div>
              <div class="status">${status}</div>
            </div>
          </div>
          ${clean.phase === "running" ? this._renderCleanRunning(view, clean, clock) : this._renderCleanResult(clean, clock)}
        </div>
      </ha-card>
    `;
  }

  private _renderCleanRunning(view: DysonModel, clean: DeepCleanView, clock: (ms: number) => string) {
    const seconds = clean.secondsRemaining;
    const fraction = Math.min(1, Math.max(0, 1 - seconds / (DEEP_CLEAN_MINUTES * 60)));
    const spoken = `${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`;
    return html`
      <div class="deep-clean">
        <div class="deep-clean-icon"><ha-icon icon="mdi:water-sync"></ha-icon></div>
        <div class="deep-clean-time" role="timer" aria-label=${spoken}>${formatCountdown(seconds)}</div>
        <div class="deep-clean-label">remaining</div>
        <div
          class="wave-progress"
          role="progressbar"
          aria-label="Deep clean progress"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow=${Math.round(fraction * 100)}
          style=${styleMap({ "--fraction": String(fraction) })}
        >
          <div class="wave-active"></div>
          <div class="wave-inactive"></div>
        </div>
        <p class="helper">Controls are unavailable until the deep clean finishes, around ${clock(clean.endsAt)}.</p>
        ${view.available ? nothing : html`<p class="helper">${view.deviceName} is offline. The countdown continues.</p>`}
      </div>
    `;
  }

  private _renderCleanResult(clean: DeepCleanView, clock: (ms: number) => string) {
    const complete = clean.phase === "complete";
    return html`
      <div class=${classMap({ "deep-clean": true, interrupted: !complete })} role="status">
        <div class="deep-clean-icon"><ha-icon icon=${complete ? "mdi:check-circle-outline" : "mdi:alert-circle-outline"}></ha-icon></div>
        <div class="deep-clean-result">${complete ? "Deep clean complete" : "Deep clean interrupted"}</div>
        <p class="helper">${complete ? `Finished at ${clock(clean.endsAt)}.` : clean.reason}</p>
        <div class="actions">
          <button
            class=${classMap({ "filled-button": complete, "tonal-button": !complete, interactive: true })}
            @click=${() => {
              this._deepClean.dismiss();
              this.requestUpdate();
            }}
          >
            ${complete ? "Done" : "Dismiss"}
          </button>
        </div>
      </div>
    `;
  }

  private _statusLine(view: DysonModel): string {
    if (!view.available) return "Unavailable";
    if (!view.power) return "Off";
    const parts = [view.autoMode ? "Auto" : `Speed ${view.speed}`];
    if (view.humidify.on) {
      parts.push(view.humidify.mode === "auto" ? "Humidifying (auto)" : `Humidifying to ${view.humidify.target}%`);
    }
    if (view.night) parts.push("Night");
    if (view.sleepTimer.minutes > 0) parts.push(`Off in ${formatMinutes(view.sleepTimer.minutes)}`);
    return parts.join(" · ");
  }

  private _renderHeader(view: DysonModel) {
    const title = this._config?.title?.trim() || view.name;
    return html`
      <div class="header">
        <div class="heading">
          <div class="title">${title}</div>
          <div class="status">${this._statusLine(view)}</div>
        </div>
        <button
          class=${classMap({ "icon-toggle": true, interactive: true, selected: view.power, pending: this._pending.has("power") })}
          aria-pressed=${view.power ? "true" : "false"}
          aria-label=${view.power ? "Turn off" : "Turn on"}
          ?disabled=${!view.available}
          @click=${() => this._run(this._services!.power(!view.power), { key: "power", value: !view.power })}
        >
          <ha-icon icon="mdi:power"></ha-icon>
        </button>
      </div>
    `;
  }

  private _renderAlerts(view: DysonModel) {
    if (!view.alerts.length) return nothing;
    return html`
      <div class="alerts" role="status">
        ${view.alerts.map(
          (alert) => html`
            <button class="alert interactive ${alert.tone}" @click=${() => this._moreInfo(alert.entityId)}>
              <ha-icon icon=${alert.icon}></ha-icon>
              <span>${alert.message}</span>
              <ha-icon icon="mdi:chevron-right"></ha-icon>
            </button>
          `,
        )}
      </div>
    `;
  }

  private _renderReadings(view: DysonModel) {
    const aqi = view.aqi;
    const aqiLabel = [aqi.band ? BAND_LABELS[aqi.band] : aqi.category, aqi.dominant].filter(Boolean).join(" · ");
    return html`
      <div class="readings">
        <button class="reading interactive" @click=${() => this._moreInfo(view.temperature.entityId)}>
          <span class="top"><ha-icon icon="mdi:thermometer"></ha-icon></span>
          <span class="value">${view.temperature.display}</span>
          <span class="label">Temperature</span>
        </button>
        <button class="reading interactive" @click=${() => this._moreInfo(view.humidity.entityId)}>
          <span class="top"><ha-icon icon="mdi:water-percent"></ha-icon></span>
          <span class="value">${view.humidity.display}</span>
          <span class="label">Humidity</span>
        </button>
        <button
          class="reading interactive"
          data-band=${aqi.band ?? nothing}
          aria-expanded=${this._aqiExpanded ? "true" : "false"}
          aria-label=${`Air quality ${aqi.display}, ${aqiLabel}. Show pollutants`}
          @click=${() => (this._aqiExpanded = !this._aqiExpanded)}
        >
          <span class="top"><span class="band-dot"></span><span>AQI</span></span>
          <span class="value">${aqi.display}</span>
          <span class="label">${aqiLabel || "Air quality"}</span>
        </button>
      </div>
      ${this._aqiExpanded && view.pollutants.length
        ? html`<div class="pollutants">
            ${view.pollutants.map(
              (reading) => html`
                <button
                  class="pollutant interactive"
                  data-band=${reading.band ?? nothing}
                  title=${reading.band ? BAND_LABELS[reading.band] : ""}
                  @click=${() => this._moreInfo(reading.entityId)}
                >
                  <span class="name"><span class="band-dot"></span>${reading.label}</span>
                  <span class="amount"><strong>${reading.formatted}</strong><span class="unit">${reading.unit}</span></span>
                </button>
              `,
            )}
          </div>`
        : nothing}
    `;
  }

  private _renderSlider(options: {
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    disabled: boolean;
    onCommit: (value: number) => void;
  }) {
    const { key, label, min, max, step, value, disabled } = options;
    const stops = Math.round((max - min) / step);
    const fraction = (value - min) / (max - min);
    const setDraft = (next: number | undefined) => {
      const drafts = { ...this._sliderDrafts };
      if (next === undefined) delete drafts[key];
      else drafts[key] = next;
      this._sliderDrafts = drafts;
    };
    return html`
      <div class="slider" style=${styleMap({ "--fraction": String(Math.min(1, Math.max(0, fraction))) })}>
        <div class="slider-track">
          <div class="slider-active"></div>
          <div class="slider-handle"></div>
          <div class="slider-inactive"></div>
          ${Array.from({ length: stops + 1 }, (_, index) => index)
            .filter((index) => index / stops !== fraction)
            .map(
              (index) =>
                html`<span
                  class=${classMap({ "slider-stop": true, "on-active": index / stops < fraction })}
                  style=${styleMap({ "--pos": String(index / stops) })}
                ></span>`,
            )}
        </div>
        <input
          type="range"
          min=${min}
          max=${max}
          step=${step}
          .value=${String(value)}
          aria-label=${label}
          aria-valuetext=${options.key === "target" ? `${value}%` : `Speed ${value}`}
          ?disabled=${disabled}
          @input=${(event: Event) => setDraft(Number((event.target as HTMLInputElement).value))}
          @change=${(event: Event) => {
            const next = Number((event.target as HTMLInputElement).value);
            setDraft(undefined);
            options.onCommit(next);
          }}
        />
      </div>
    `;
  }

  private _renderFan(view: DysonModel) {
    const disabled = !view.available;
    return html`
      <section class=${classMap({ section: true, muted: !view.power })}>
        <div class="section-head">
          <ha-icon icon=${view.autoMode ? "mdi:fan-auto" : "mdi:fan"}></ha-icon>
          <span class="section-title">Fan</span>
          <span class="section-value">${view.autoMode ? "Auto" : `Speed ${view.speed}`}</span>
        </div>
        ${view.autoMode
          ? nothing
          : this._renderSlider({
              key: "speed",
              label: "Fan speed",
              min: 1,
              max: 10,
              step: 1,
              value: Math.max(1, view.speed),
              disabled,
              onCommit: (level) => this._run(this._services!.speed(level), { key: "speed", value: level }),
            })}
        <div class="row">
          ${this._toggle("Auto", "mdi:fan-auto", view.autoMode, disabled, "auto", () =>
            this._run(this._services!.autoMode(!view.autoMode), { key: "auto", value: !view.autoMode }),
          )}
          ${view.night !== null
            ? this._toggle("Night", "mdi:weather-night", view.night, disabled, "night", () =>
                this._run(this._services!.night(!view.night), { key: "night", value: !view.night }),
              )
            : nothing}
          ${view.airflow
            ? html`<div class="connected" role="group" aria-label="Airflow direction">
                ${(["forward", "reverse"] as const).map((direction) =>
                  this._segment(
                    direction === "forward" ? "Front" : "Back",
                    direction === "forward" ? "mdi:arrow-up" : "mdi:arrow-down",
                    view.airflow === direction,
                    disabled,
                    this._pending.has("airflow") && view.airflow === direction,
                    () => this._run(this._services!.airflow(direction), { key: "airflow", value: direction }),
                  ),
                )}
              </div>`
            : nothing}
        </div>
      </section>
    `;
  }

  private _toggle(label: string, icon: string, selected: boolean, disabled: boolean, pendingKey: string, onClick: () => void) {
    return html`
      <button
        class=${classMap({ toggle: true, interactive: true, selected, pending: this._pending.has(pendingKey) })}
        aria-pressed=${selected ? "true" : "false"}
        ?disabled=${disabled}
        @click=${onClick}
      >
        <ha-icon icon=${icon}></ha-icon>${label}
      </button>
    `;
  }

  private _segment(
    label: string,
    icon: string | null,
    selected: boolean,
    disabled: boolean,
    pending: boolean,
    onClick: () => void,
    ariaLabel?: string,
  ) {
    return html`
      <button
        class=${classMap({ interactive: true, selected, pending })}
        aria-pressed=${selected ? "true" : "false"}
        aria-label=${ariaLabel ?? nothing}
        ?disabled=${disabled}
        @click=${onClick}
      >
        ${icon ? html`<ha-icon icon=${icon}></ha-icon>` : nothing}${label}
      </button>
    `;
  }

  private _renderOscillation(view: DysonModel) {
    const mode = view.oscillation;
    if (mode === null) return nothing;
    const disabled = !view.available;
    const pending = this._pending.has("oscillation");
    const labels: Record<string, string> = { off: "Off", breeze: "Breeze", other: "Custom" };
    const label = labels[mode] ?? `${mode}° sweep`;
    const choices: { choice: OscillationChoice; label: string; aria: string }[] = [
      { choice: "off", label: "Off", aria: "Oscillation off" },
      ...SWEEP_PRESETS.map((preset) => ({ choice: preset, label: presetOption(preset), aria: `${preset} degree sweep` })),
      { choice: "breeze", label: "Breeze", aria: "Breeze" },
    ];

    return html`
      <section class=${classMap({ section: true, muted: !view.power })}>
        <div class="section-head">
          <ha-icon icon="mdi:rotate-3d-variant"></ha-icon>
          <span class="section-title">Oscillation</span>
          <span class="section-value">${label}</span>
        </div>
        <div class="connected" role="group" aria-label="Oscillation">
          ${choices.map(({ choice, label: text, aria }) =>
            this._segment(text, null, mode === choice, disabled, pending && mode === choice, () =>
              this._run(this._services!.oscillation(choice), { key: "oscillation", value: choice }),
              aria,
            ),
          )}
        </div>
      </section>
    `;
  }

  private _renderHumidify(view: DysonModel) {
    const humidify = view.humidify;
    if (!this._resolved?.ids.humidifier) return nothing;
    const disabled = !view.available || !humidify.available;
    const choice: HumidifyChoice = humidify.on ? (humidify.mode ?? "normal") : "off";
    const value =
      choice === "off" ? "Off" : choice === "auto" ? "Auto" : `Target ${humidify.target}%`;
    const roomHumidity = view.humidity.value;
    const pending = this._pending.has("humidify");

    return html`
      <section class=${classMap({ section: true, muted: !humidify.on })}>
        <div class="section-head">
          <ha-icon icon="mdi:air-humidifier"></ha-icon>
          <span class="section-title">Humidify</span>
          <span class="section-value">${value}</span>
        </div>
        <div class="connected" role="group" aria-label="Humidify mode">
          ${(["off", "normal", "auto"] as const).map((option) =>
            this._segment(capitalize(option), null, choice === option, disabled, pending && choice === option, () =>
              this._run(this._services!.humidify(option), { key: "humidify", value: option }),
            ),
          )}
        </div>
        ${choice === "auto"
          ? html`<div class="helper">Auto picks a comfortable humidity for the room temperature.</div>`
          : html`
              <div>
                ${this._renderSlider({
                  key: "target",
                  label: "Target humidity",
                  min: humidify.min,
                  max: humidify.max,
                  step: 10,
                  value: humidify.target,
                  disabled,
                  onCommit: (target) => this._run(this._services!.targetHumidity(target), { key: "target", value: target }),
                })}
                <div class="slider-scale" aria-hidden="true">
                  ${Array.from({ length: (humidify.max - humidify.min) / 10 + 1 }, (_, i) => html`<span>${humidify.min + i * 10}%</span>`)}
                </div>
              </div>
              ${roomHumidity !== null
                ? html`<div class="helper">Room is at ${roomHumidity}%${choice === "off" ? ". The target applies when humidifying." : "."}</div>`
                : nothing}
            `}
      </section>
    `;
  }

  private _renderTimer(view: DysonModel) {
    if (!this._resolved?.ids.sleepTimer) return nothing;
    const minutes = view.sleepTimer.minutes;
    const disabled = !view.available || !view.sleepTimer.available || !view.power;
    const pending = this._pending.has("sleep");
    const set = (value: number) => this._run(this._services!.sleepTimer(value), { key: "sleep", value, ttl: SLEEP_PENDING_TTL });

    return html`
      <section class="section">
        <div class="section-head">
          <ha-icon icon="mdi:timer-outline"></ha-icon>
          <span class="section-title">Sleep timer</span>
          <span class=${classMap({ "section-value": true, pending })}>${minutes > 0 ? `${formatMinutes(minutes)} left` : "Off"}</span>
        </div>
        <div class="chips" role="group" aria-label="Sleep timer">
          <button class=${classMap({ chip: true, interactive: true, selected: minutes === 0 })} ?disabled=${disabled} @click=${() => set(0)}>Off</button>
          ${TIMER_SHORTCUTS.map(
            (value) => html`<button class="chip interactive" ?disabled=${disabled} @click=${() => set(value)}>${formatMinutes(value)}</button>`,
          )}
          <button
            class=${classMap({ chip: true, interactive: true, selected: this._timerCustomOpen })}
            ?disabled=${disabled}
            aria-expanded=${this._timerCustomOpen ? "true" : "false"}
            @click=${() => (this._timerCustomOpen = !this._timerCustomOpen)}
          >
            <ha-icon icon="mdi:tune-variant"></ha-icon>Custom
          </button>
        </div>
        ${this._timerCustomOpen && !disabled
          ? html`<div class="stepper">
              <button
                class="icon-button interactive"
                aria-label="15 minutes less"
                @click=${() => (this._timerCustomMinutes = snapSleepMinutes(Math.max(15, this._timerCustomMinutes - 15)))}
              >
                <ha-icon icon="mdi:minus"></ha-icon>
              </button>
              <output aria-live="polite">${formatMinutes(this._timerCustomMinutes)}</output>
              <button
                class="icon-button interactive"
                aria-label="15 minutes more"
                @click=${() => (this._timerCustomMinutes = snapSleepMinutes(this._timerCustomMinutes + 15))}
              >
                <ha-icon icon="mdi:plus"></ha-icon>
              </button>
              <button
                class="tonal-button interactive"
                @click=${() => {
                  this._timerCustomOpen = false;
                  void set(this._timerCustomMinutes);
                }}
              >
                Set
              </button>
            </div>`
          : nothing}
        ${!view.power && view.available ? html`<div class="helper">Turn the fan on to set a sleep timer.</div>` : nothing}
      </section>
    `;
  }

  private _armReset(): void {
    if (this._resetArmed) {
      this._resetArmed = false;
      if (this._resetTimer) clearTimeout(this._resetTimer);
      void this._run(this._services!.resetFilter());
      return;
    }
    this._resetArmed = true;
    this._resetTimer = setTimeout(() => (this._resetArmed = false), RESET_CONFIRM_WINDOW);
  }

  private _renderMaintenance(view: DysonModel) {
    const m = view.maintenance;
    const attention =
      m.filterReplacement || view.alerts.some((alert) => alert.id === "fault-cldu" || alert.id === "fault-etwd");
    const summary = m.filterLife !== null ? `Filter ${m.filterLife}%` : "";
    const disabled = !view.available;

    return html`
      <section class="section">
        <button
          class="section-head expander"
          aria-expanded=${this._maintenanceOpen ? "true" : "false"}
          @click=${() => (this._maintenanceOpen = !this._maintenanceOpen)}
        >
          <ha-icon icon="mdi:wrench-outline"></ha-icon>
          <span class="section-title">Maintenance</span>
          ${attention ? html`<span class="attention-dot" aria-label="Needs attention"></span>` : nothing}
          <span class="section-value">${summary}</span>
          <ha-icon class="chevron" icon="mdi:chevron-down"></ha-icon>
        </button>
        ${this._maintenanceOpen
          ? html`
              ${m.filterLife !== null
                ? html`<div class="maintenance-item">
                    <div class="maintenance-line">
                      <span>HEPA filter${m.filterType ? ` (${m.filterType})` : ""}</span>
                      <span>${m.filterLife}% left</span>
                    </div>
                    <div
                      class="progress"
                      role="progressbar"
                      aria-label="HEPA filter life"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-valuenow=${m.filterLife}
                      style=${styleMap({ "--fraction": String(m.filterLife / 100) })}
                    >
                      <div class=${classMap({ "progress-active": true, low: m.filterLife <= 10 })}></div>
                      <div class="progress-inactive"></div>
                    </div>
                    <div class="actions">
                      <button
                        class=${classMap({ "filled-button": this._resetArmed, danger: this._resetArmed, "tonal-button": !this._resetArmed, interactive: true })}
                        ?disabled=${disabled}
                        @click=${() => this._armReset()}
                      >
                        ${this._resetArmed ? "Tap again to reset" : "Reset filter life"}
                      </button>
                    </div>
                  </div>`
                : nothing}
              ${m.nextCleanHours !== null
                ? html`<div class="maintenance-item">
                    <div class="maintenance-line">
                      <span>Next deep clean</span><span>in ${formatHoursAsDays(m.nextCleanHours)}</span>
                    </div>
                  </div>`
                : nothing}
              ${m.waterHardness && m.waterHardness.options.length
                ? html`<div class="maintenance-item">
                    <div class="maintenance-line"><span>Water hardness</span></div>
                    <div class="connected" role="group" aria-label="Water hardness">
                      ${m.waterHardness.options.map((level) =>
                        this._segment(level, null, m.waterHardness!.value === level, disabled, this._pending.has("hardness") && m.waterHardness!.value === level, () =>
                          this._run(this._services!.waterHardness(level, m.waterHardness!.integrationSwapped), {
                            key: "hardness",
                            value: level,
                          }),
                        ),
                      )}
                    </div>
                  </div>`
                : nothing}
            `
          : nothing}
      </section>
    `;
  }
}

if (!customElements.get(__CARD_TAG__)) {
  customElements.define(__CARD_TAG__, DysonHumidifyCoolCard);
  const cards = ((window as any).customCards ??= []);
  cards.push({
    type: __CARD_TAG__,
    name: __CARD_TAG__.endsWith("-dev") ? "Dyson Humidify+Cool (dev)" : "Dyson Humidify+Cool",
    description: "Fan, oscillation, humidify and air quality controls for the Dyson PH01.",
    preview: true,
    documentationURL: "https://github.com/brycewc/ha-card-dyson-pure-humidify-cool",
  });
}

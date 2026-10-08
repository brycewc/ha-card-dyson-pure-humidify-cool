import { css } from "lit";

// Each token prefers the Material You theme's --md-sys-* value and falls back to stock HA variables.
export const tokens = css`
  :host {
    --dhc-surface: var(--ha-card-background, var(--card-background-color, #fff));
    --dhc-on-surface: var(--md-sys-color-on-surface, var(--primary-text-color, #1a1b21));
    --dhc-on-surface-variant: var(--md-sys-color-on-surface-variant, var(--secondary-text-color, #45464f));
    --dhc-surface-container: var(
      --md-sys-color-surface-container,
      color-mix(in srgb, var(--dhc-on-surface) 5%, var(--dhc-surface))
    );
    --dhc-surface-container-high: var(
      --md-sys-color-surface-container-high,
      color-mix(in srgb, var(--dhc-on-surface) 9%, var(--dhc-surface))
    );
    --dhc-surface-container-highest: var(
      --md-sys-color-surface-container-highest,
      color-mix(in srgb, var(--dhc-on-surface) 14%, var(--dhc-surface))
    );
    --dhc-primary: var(--md-sys-color-primary, var(--primary-color, #4c5c92));
    --dhc-on-primary: var(--md-sys-color-on-primary, var(--text-primary-color, #fff));
    --dhc-primary-container: var(
      --md-sys-color-primary-container,
      color-mix(in srgb, var(--dhc-primary) 24%, var(--dhc-surface))
    );
    --dhc-on-primary-container: var(--md-sys-color-on-primary-container, var(--dhc-on-surface));
    --dhc-secondary-container: var(
      --md-sys-color-secondary-container,
      color-mix(in srgb, var(--dhc-primary) 13%, var(--dhc-surface-container-high))
    );
    --dhc-on-secondary-container: var(--md-sys-color-on-secondary-container, var(--dhc-on-surface));
    --dhc-tertiary-container: var(
      --md-sys-color-tertiary-container,
      color-mix(in srgb, var(--warning-color, #ffa600) 26%, var(--dhc-surface))
    );
    --dhc-on-tertiary-container: var(--md-sys-color-on-tertiary-container, var(--dhc-on-surface));
    --dhc-error: var(--md-sys-color-error, var(--error-color, #ba1a1a));
    --dhc-error-container: var(
      --md-sys-color-error-container,
      color-mix(in srgb, var(--error-color, #ba1a1a) 22%, var(--dhc-surface))
    );
    --dhc-on-error-container: var(--md-sys-color-on-error-container, var(--dhc-on-surface));
    --dhc-outline: var(--md-sys-color-outline, var(--secondary-text-color, #767680));
    --dhc-outline-variant: var(--md-sys-color-outline-variant, var(--divider-color, #c6c6d0));
    --dhc-disabled: color-mix(in srgb, var(--dhc-on-surface) 38%, transparent);
    --dhc-disabled-container: color-mix(in srgb, var(--dhc-on-surface) 10%, transparent);

    --dhc-corner-xs: var(--md-sys-shape-corner-extra-small, 4px);
    --dhc-corner-s: var(--md-sys-shape-corner-small, 8px);
    --dhc-corner-m: var(--md-sys-shape-corner-medium, 12px);
    --dhc-corner-l: var(--md-sys-shape-corner-large, 16px);
    --dhc-corner-xl: var(--md-sys-shape-corner-extra-large, 28px);
    --dhc-corner-full: var(--md-sys-shape-corner-full, 9999px);

    /* M3 Expressive spring tokens approximated with linear(); "spatial" overshoots, "effects" does not. */
    --dhc-spring-fast-spatial: linear(0, 0.23 5%, 0.68 12%, 0.98 19%, 1.09 25%, 1.1 29%, 1.06 35%, 1 45%, 0.99 54%, 1);
    --dhc-spring-fast-spatial-duration: 350ms;
    --dhc-spring-default-spatial: linear(0, 0.13 5%, 0.47 12%, 0.82 20%, 1.03 28%, 1.08 34%, 1.06 41%, 1 52%, 0.99 62%, 1);
    --dhc-spring-default-spatial-duration: 500ms;
    --dhc-spring-effects: cubic-bezier(0.31, 0.94, 0.34, 1);
    --dhc-spring-effects-duration: 200ms;

    --dhc-band-good: var(--green-color, #4caf50);
    --dhc-band-fair: var(--amber-color, #ffc107);
    --dhc-band-poor: var(--orange-color, #ff9800);
    --dhc-band-very_poor: var(--red-color, #f44336);
    --dhc-band-extremely_poor: var(--purple-color, #926bc7);
    --dhc-band-severe: var(--deep-purple-color, #6e41ab);
  }
`;

export const cardStyles = css`
  :host {
    display: block;
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  ha-card {
    overflow: hidden;
    color: var(--dhc-on-surface);
  }
  .card {
    container-type: inline-size;
    display: grid;
    gap: 12px;
    padding: 16px 12px 12px;
  }
  .card.unavailable .sections,
  .card.unavailable .readings {
    opacity: 0.5;
    pointer-events: none;
  }

  button {
    font: inherit;
    color: inherit;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  button:disabled {
    cursor: default;
  }
  ha-icon {
    --mdc-icon-size: 20px;
    display: inline-flex;
    flex: none;
  }

  .interactive {
    position: relative;
    isolation: isolate;
    outline: none;
  }
  .interactive::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: currentColor;
    opacity: 0;
    z-index: -1;
    pointer-events: none;
    transition: opacity var(--dhc-spring-effects-duration) var(--dhc-spring-effects);
  }
  .interactive:hover:not(:disabled)::before {
    opacity: 0.08;
  }
  .interactive:active:not(:disabled)::before {
    opacity: 0.1;
  }
  .interactive:focus-visible {
    outline: 3px solid var(--md-sys-color-secondary, var(--dhc-primary));
    outline-offset: 2px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding-inline: 4px;
  }
  .heading {
    flex: 1;
    min-width: 0;
  }
  .title {
    font-size: var(--md-sys-typescale-title-large-size, 22px);
    line-height: var(--md-sys-typescale-title-large-line-height, 28px);
    font-weight: var(--md-ref-typeface-weight-medium, 500);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .status {
    color: var(--dhc-on-surface-variant);
    font-size: var(--md-sys-typescale-body-medium-size, 14px);
    line-height: var(--md-sys-typescale-body-medium-line-height, 20px);
  }

  .icon-toggle {
    width: 56px;
    height: 56px;
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-surface-container-highest);
    color: var(--dhc-on-surface-variant);
    transition:
      border-radius var(--dhc-spring-fast-spatial-duration) var(--dhc-spring-fast-spatial),
      background-color var(--dhc-spring-effects-duration) var(--dhc-spring-effects),
      color var(--dhc-spring-effects-duration) var(--dhc-spring-effects);
  }
  .icon-toggle ha-icon {
    --mdc-icon-size: 26px;
  }
  .icon-toggle.selected {
    border-radius: var(--dhc-corner-l);
    background: var(--dhc-primary);
    color: var(--dhc-on-primary);
  }
  .icon-toggle:active:not(:disabled) {
    border-radius: var(--dhc-corner-m);
  }

  .banner,
  .alert {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    min-height: 48px;
    padding: 10px 16px;
    border-radius: var(--dhc-corner-l);
    text-align: start;
    font-size: var(--md-sys-typescale-body-medium-size, 14px);
    line-height: var(--md-sys-typescale-body-medium-line-height, 20px);
  }
  .alerts {
    display: grid;
    gap: 4px;
  }
  .alert span {
    flex: 1;
  }
  .alert.error,
  .banner {
    background: var(--dhc-error-container);
    color: var(--dhc-on-error-container);
  }
  .alert.warning {
    background: var(--dhc-tertiary-container);
    color: var(--dhc-on-tertiary-container);
  }

  .readings {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
  }
  .reading {
    display: grid;
    justify-items: start;
    gap: 2px;
    min-width: 0;
    padding: 12px;
    border-radius: var(--dhc-corner-l);
    background: var(--dhc-surface-container);
    text-align: start;
    transition: border-radius var(--dhc-spring-fast-spatial-duration) var(--dhc-spring-fast-spatial);
  }
  .reading:active:not(:disabled) {
    border-radius: var(--dhc-corner-m);
  }
  .reading .top {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--dhc-on-surface-variant);
  }
  .reading ha-icon {
    --mdc-icon-size: 18px;
  }
  .reading .value {
    font-size: var(--md-sys-typescale-emphasized-title-large-size, 22px);
    line-height: var(--md-sys-typescale-emphasized-title-large-line-height, 28px);
    font-weight: var(--md-ref-typeface-weight-medium, 500);
    font-variant-numeric: tabular-nums;
  }
  .reading .label {
    color: var(--dhc-on-surface-variant);
    font-size: var(--md-sys-typescale-label-medium-size, 12px);
    line-height: var(--md-sys-typescale-label-medium-line-height, 16px);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .band-dot {
    width: 10px;
    height: 10px;
    border-radius: var(--dhc-corner-full);
    background: var(--band, var(--dhc-outline));
  }
  .reading[data-band] {
    background: color-mix(in srgb, var(--band) 20%, var(--dhc-surface-container));
  }
  [data-band="good"] { --band: var(--dhc-band-good); }
  [data-band="fair"] { --band: var(--dhc-band-fair); }
  [data-band="poor"] { --band: var(--dhc-band-poor); }
  [data-band="very_poor"] { --band: var(--dhc-band-very_poor); }
  [data-band="extremely_poor"] { --band: var(--dhc-band-extremely_poor); }
  [data-band="severe"] { --band: var(--dhc-band-severe); }

  .pollutants {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 4px;
  }
  .pollutant {
    display: grid;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--dhc-corner-m);
    background: var(--dhc-surface-container);
    text-align: start;
    min-width: 0;
  }
  .pollutant[data-band] {
    background: color-mix(in srgb, var(--band) 16%, var(--dhc-surface-container));
  }
  .pollutant .name {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--dhc-on-surface-variant);
    font-size: var(--md-sys-typescale-label-medium-size, 12px);
  }
  .pollutant .band-dot {
    width: 8px;
    height: 8px;
  }
  .pollutant .amount {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 3px;
    min-width: 0;
  }
  .pollutant strong {
    font-size: var(--md-sys-typescale-title-small-size, 14px);
    font-weight: var(--md-ref-typeface-weight-medium, 500);
    font-variant-numeric: tabular-nums;
  }
  .pollutant .unit {
    color: var(--dhc-on-surface-variant);
    font-size: var(--md-sys-typescale-label-small-size, 11px);
  }

  .controls {
    display: grid;
  }
  .disclosure {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 48px;
    padding-inline: 16px 12px;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-surface-container);
    font-size: var(--md-sys-typescale-title-small-size, 14px);
    font-weight: var(--md-ref-typeface-weight-medium, 500);
    text-align: start;
    transition: border-radius var(--dhc-spring-fast-spatial-duration) var(--dhc-spring-fast-spatial);
  }
  .disclosure > span {
    flex: 1;
  }
  .disclosure > ha-icon {
    color: var(--dhc-on-surface-variant);
  }
  .disclosure.open {
    border-radius: var(--dhc-corner-l);
  }
  .disclosure:active:not(:disabled) {
    border-radius: var(--dhc-corner-m);
  }
  /* Animating grid rows from 0fr to 1fr reveals auto-height content; an overshooting spring would clip it. */
  .collapsible {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows var(--dhc-spring-default-spatial-duration) cubic-bezier(0.2, 0, 0, 1);
  }
  .collapsible.open {
    grid-template-rows: 1fr;
  }
  .collapsible-inner {
    min-height: 0;
    overflow: hidden;
  }
  .collapsible-inner > .sections {
    margin-top: 8px;
  }

  .sections {
    display: grid;
    gap: 3px;
  }
  .section {
    display: grid;
    gap: 14px;
    padding: 16px;
    border-radius: var(--dhc-corner-xs);
    background: var(--dhc-surface-container);
  }
  .section:first-child {
    border-start-start-radius: var(--dhc-corner-xl);
    border-start-end-radius: var(--dhc-corner-xl);
  }
  .section:last-child {
    border-end-start-radius: var(--dhc-corner-xl);
    border-end-end-radius: var(--dhc-corner-xl);
  }
  .section-head {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 24px;
    width: 100%;
    text-align: start;
  }
  .section-head > ha-icon {
    color: var(--dhc-on-surface-variant);
  }
  .section-title {
    flex: 1;
    font-size: var(--md-sys-typescale-title-medium-size, 16px);
    line-height: var(--md-sys-typescale-title-medium-line-height, 24px);
    font-weight: var(--md-ref-typeface-weight-medium, 500);
  }
  .section-value {
    color: var(--dhc-on-surface-variant);
    font-size: var(--md-sys-typescale-body-medium-size, 14px);
    font-variant-numeric: tabular-nums;
    text-align: end;
  }
  .section.muted .slider {
    filter: saturate(0.2);
    opacity: 0.72;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .row > .connected {
    flex: 1 1 140px;
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 40px;
    padding-inline: 16px;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-surface-container-highest);
    color: var(--dhc-on-surface-variant);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-ref-typeface-weight-medium, 500);
    white-space: nowrap;
    transition:
      border-radius var(--dhc-spring-fast-spatial-duration) var(--dhc-spring-fast-spatial),
      background-color var(--dhc-spring-effects-duration) var(--dhc-spring-effects),
      color var(--dhc-spring-effects-duration) var(--dhc-spring-effects);
  }
  .toggle.selected {
    border-radius: var(--dhc-corner-m);
    background: var(--dhc-primary);
    color: var(--dhc-on-primary);
  }
  .toggle:active:not(:disabled) {
    border-radius: var(--dhc-corner-s);
  }
  .toggle:disabled,
  .connected > button:disabled {
    background: var(--dhc-disabled-container);
    color: var(--dhc-disabled);
  }
  .toggle ha-icon {
    --mdc-icon-size: 18px;
  }

  .connected {
    display: flex;
    gap: 2px;
    min-width: 0;
  }
  .connected > button {
    flex: 1 1 0;
    min-width: 0;
    height: 40px;
    padding-inline: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: var(--dhc-corner-s);
    background: var(--dhc-secondary-container);
    color: var(--dhc-on-secondary-container);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-ref-typeface-weight-medium, 500);
    white-space: nowrap;
    transition:
      border-radius var(--dhc-spring-fast-spatial-duration) var(--dhc-spring-fast-spatial),
      flex-grow var(--dhc-spring-fast-spatial-duration) var(--dhc-spring-fast-spatial),
      background-color var(--dhc-spring-effects-duration) var(--dhc-spring-effects),
      color var(--dhc-spring-effects-duration) var(--dhc-spring-effects);
  }
  /* Half the height, not 9999px: oversized radii make the browser scale down the small inner corners too. */
  .connected > button:first-child {
    border-start-start-radius: 20px;
    border-end-start-radius: 20px;
  }
  .connected > button:last-child {
    border-start-end-radius: 20px;
    border-end-end-radius: 20px;
  }
  .connected > button.selected {
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-primary);
    color: var(--dhc-on-primary);
  }
  .connected > button:active:not(:disabled) {
    flex-grow: 1.3;
    border-radius: var(--dhc-corner-xs);
  }
  .connected > button.selected:active:not(:disabled) {
    border-radius: var(--dhc-corner-m);
  }
  .connected ha-icon {
    --mdc-icon-size: 18px;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding-inline: 10px 12px;
    border-radius: var(--dhc-corner-s);
    border: 1px solid var(--dhc-outline-variant);
    color: var(--dhc-on-surface-variant);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-ref-typeface-weight-medium, 500);
    white-space: nowrap;
    transition: border-radius var(--dhc-spring-fast-spatial-duration) var(--dhc-spring-fast-spatial);
  }
  .chip.selected {
    border-color: transparent;
    background: var(--dhc-secondary-container);
    color: var(--dhc-on-secondary-container);
  }
  .chip:active:not(:disabled) {
    border-radius: var(--dhc-corner-l);
  }
  .chip:disabled {
    color: var(--dhc-disabled);
    border-color: var(--dhc-disabled-container);
  }
  .chip ha-icon {
    --mdc-icon-size: 18px;
  }

  .filled-button {
    height: 40px;
    padding-inline: 20px;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-primary);
    color: var(--dhc-on-primary);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-ref-typeface-weight-medium, 500);
    transition: border-radius var(--dhc-spring-fast-spatial-duration) var(--dhc-spring-fast-spatial);
  }
  .filled-button:active:not(:disabled) {
    border-radius: var(--dhc-corner-m);
  }
  .filled-button.danger {
    background: var(--dhc-error);
    color: var(--md-sys-color-on-error, #fff);
  }
  .tonal-button {
    height: 40px;
    padding-inline: 16px;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-secondary-container);
    color: var(--dhc-on-secondary-container);
    font-size: var(--md-sys-typescale-label-large-size, 14px);
    font-weight: var(--md-ref-typeface-weight-medium, 500);
    transition: border-radius var(--dhc-spring-fast-spatial-duration) var(--dhc-spring-fast-spatial);
  }
  .tonal-button:active:not(:disabled) {
    border-radius: var(--dhc-corner-m);
  }

  /* An invisible native range input handles pointer, keyboard and a11y; the track is drawn underneath it. */
  .slider {
    --handle-zone: 16px;
    --track-height: 16px;
    position: relative;
    height: 44px;
    display: flex;
    align-items: center;
    touch-action: pan-y;
  }
  .slider-track {
    position: absolute;
    inset-inline: 0;
    height: var(--track-height);
    display: flex;
    align-items: center;
    pointer-events: none;
  }
  .slider-active,
  .slider-inactive {
    height: 100%;
    transition: flex-basis 120ms var(--dhc-spring-effects);
  }
  .slider-active {
    flex: 0 0 calc(var(--fraction) * (100% - var(--handle-zone)));
    border-radius: var(--dhc-corner-s) 2px 2px var(--dhc-corner-s);
    background: var(--dhc-primary);
  }
  .slider-inactive {
    flex: 1 1 0;
    border-radius: 2px var(--dhc-corner-s) var(--dhc-corner-s) 2px;
    background: var(--dhc-secondary-container);
  }
  .slider-handle {
    flex: 0 0 var(--handle-zone);
    display: flex;
    justify-content: center;
  }
  .slider-handle::after {
    content: "";
    width: 4px;
    height: 44px;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-primary);
    transition: width var(--dhc-spring-fast-spatial-duration) var(--dhc-spring-fast-spatial);
  }
  .slider:has(input:active) .slider-handle::after {
    width: 2px;
  }
  .slider-stop {
    position: absolute;
    top: 50%;
    left: calc(var(--handle-zone) / 2 + var(--pos) * (100% - var(--handle-zone)));
    width: 4px;
    height: 4px;
    margin: -2px 0 0 -2px;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-on-secondary-container);
  }
  .slider-stop.on-active {
    background: var(--dhc-on-primary);
  }
  .slider input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
  .slider input:disabled {
    cursor: default;
  }
  .slider input::-webkit-slider-thumb {
    width: var(--handle-zone);
    height: 44px;
    -webkit-appearance: none;
    appearance: none;
  }
  .slider input::-moz-range-thumb {
    width: var(--handle-zone);
    height: 44px;
    border: none;
  }
  .slider:has(input:focus-visible) .slider-handle::after {
    outline: 3px solid var(--md-sys-color-secondary, var(--dhc-primary));
    outline-offset: 2px;
  }
  .slider:has(input:disabled) .slider-active,
  .slider:has(input:disabled) .slider-handle::after {
    background: var(--dhc-disabled);
  }
  .slider:has(input:disabled) .slider-inactive {
    background: var(--dhc-disabled-container);
  }
  .slider-scale {
    display: flex;
    justify-content: space-between;
    padding-inline: 0;
    margin-top: 2px;
    color: var(--dhc-on-surface-variant);
    font-size: var(--md-sys-typescale-label-small-size, 11px);
    font-variant-numeric: tabular-nums;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .stepper .icon-button {
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-surface-container-highest);
  }
  .stepper output {
    flex: 1;
    text-align: center;
    font-size: var(--md-sys-typescale-title-medium-size, 16px);
    font-variant-numeric: tabular-nums;
  }

  .expander ha-icon.chevron {
    transition: transform var(--dhc-spring-default-spatial-duration) var(--dhc-spring-default-spatial);
  }
  .expander[aria-expanded="true"] ha-icon.chevron {
    transform: rotate(180deg);
  }
  .attention-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-error);
  }
  .maintenance-item {
    display: grid;
    gap: 8px;
  }
  .maintenance-line {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    font-size: var(--md-sys-typescale-body-medium-size, 14px);
  }
  .maintenance-line span:last-child {
    color: var(--dhc-on-surface-variant);
    font-variant-numeric: tabular-nums;
  }
  .progress {
    --track-height: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
    height: var(--track-height);
  }
  .progress-active {
    flex: 0 0 calc(var(--fraction) * (100% - 4px));
    height: 100%;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-primary);
  }
  .progress-active.low {
    background: var(--dhc-error);
  }
  .progress-inactive {
    position: relative;
    flex: 1;
    height: 100%;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-secondary-container);
  }
  .progress-inactive::after {
    content: "";
    position: absolute;
    right: 2px;
    top: 50%;
    width: 4px;
    height: 4px;
    margin-top: -2px;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-primary);
  }

  .deep-clean {
    display: grid;
    justify-items: center;
    gap: 4px;
    padding: 32px 16px 20px;
    border-radius: var(--dhc-corner-xl);
    background: var(--dhc-surface-container);
    text-align: center;
  }
  .deep-clean-icon {
    display: grid;
    place-items: center;
    width: 64px;
    height: 64px;
    margin-bottom: 12px;
    border-radius: var(--dhc-corner-l);
    background: var(--dhc-primary-container);
    color: var(--dhc-on-primary-container);
  }
  .deep-clean-icon ha-icon {
    --mdc-icon-size: 32px;
  }
  .deep-clean-time {
    font-size: var(--md-sys-typescale-emphasized-display-large-size, 57px);
    line-height: var(--md-sys-typescale-emphasized-display-large-line-height, 64px);
    font-weight: var(--md-ref-typeface-weight-medium, 500);
    letter-spacing: var(--md-sys-typescale-emphasized-display-large-tracking, -0.25px);
    font-variant-numeric: tabular-nums;
  }
  .deep-clean.interrupted .deep-clean-icon {
    background: var(--dhc-error-container);
    color: var(--dhc-on-error-container);
  }
  .deep-clean-result {
    font-size: var(--md-sys-typescale-emphasized-headline-small-size, 24px);
    line-height: var(--md-sys-typescale-emphasized-headline-small-line-height, 32px);
    font-weight: var(--md-ref-typeface-weight-medium, 500);
  }
  .deep-clean .actions {
    margin-top: 8px;
  }
  .deep-clean-label {
    color: var(--dhc-on-surface-variant);
    font-size: var(--md-sys-typescale-title-medium-size, 16px);
  }
  .wave-progress {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    height: 12px;
    margin: 20px 0 8px;
  }
  .wave-active {
    flex: 0 0 calc(var(--fraction) * (100% - 4px));
    height: 100%;
    background: var(--dhc-primary);
    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 12'%3E%3Cpath d='M0 6 Q6 1 12 6 T24 6' fill='none' stroke='black' stroke-width='4'/%3E%3C/svg%3E")
      0 50% / 24px 12px repeat-x;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 12'%3E%3Cpath d='M0 6 Q6 1 12 6 T24 6' fill='none' stroke='black' stroke-width='4'/%3E%3C/svg%3E")
      0 50% / 24px 12px repeat-x;
    animation: dhc-wave 1.2s linear infinite;
  }
  .wave-inactive {
    flex: 1;
    height: 4px;
    border-radius: var(--dhc-corner-full);
    background: var(--dhc-secondary-container);
  }
  @keyframes dhc-wave {
    to {
      -webkit-mask-position: 24px 50%;
      mask-position: 24px 50%;
    }
  }

  .helper {
    color: var(--dhc-on-surface-variant);
    font-size: var(--md-sys-typescale-body-small-size, 12px);
    line-height: var(--md-sys-typescale-body-small-line-height, 16px);
  }
  .pending {
    animation: dhc-pulse 1.2s var(--dhc-spring-effects) infinite alternate;
  }
  @keyframes dhc-pulse {
    to {
      opacity: 0.6;
    }
  }

  @container (max-width: 400px) {
    .pollutants {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @container (max-width: 360px) {
    .card {
      padding-inline: 8px;
    }
    .section {
      padding: 14px 12px;
    }
    .reading {
      padding: 10px;
    }
    .connected > button {
      padding-inline: 4px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition-duration: 0ms !important;
      animation-duration: 0ms !important;
      animation-iteration-count: 1 !important;
    }
  }
`;

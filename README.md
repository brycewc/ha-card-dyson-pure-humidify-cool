# Dyson Humidify+Cool Card

A Home Assistant Lovelace card for the **Dyson Purifier Humidify+Cool (PH01, product type 358)** exposed through [`hass_dyson`](https://github.com/cmgrayb/hass-dyson). It puts the fan, oscillation, humidifier, air quality, and maintenance controls in one card, styled with Material 3 Expressive and themed by the [Material You theme](https://github.com/Nerwyn/material-you-theme) when you use it.

This is a from-scratch rewrite inspired by [thanhn062/ha-dyson-card](https://github.com/thanhn062/ha-dyson-card) (Apache-2.0).

<p align="center">
  <img src="https://raw.githubusercontent.com/brycewc/ha-card-dyson-pure-humidify-cool/main/.github/images/card-collapsed.png" alt="Card with the controls collapsed" width="380">
  <img src="https://raw.githubusercontent.com/brycewc/ha-card-dyson-pure-humidify-cool/main/.github/images/card-expanded.png" alt="Card with the controls expanded" width="380">
</p>

## Compatibility

Built and tested on a PH01 with `hass_dyson` 0.38. Other Purifier Humidify+Cool models (PH02, PH03, PH04, and the Formaldehyde variants) are likely to work, but may expose different entities or oscillation options. If you try one, `npm run test:live` reports any entity or attribute the card doesn't expect, and an issue with that output is welcome.

## What it does

The header (with the power button), any alerts, and the temperature, humidity and AQI tiles are always visible. Everything else sits under a **Controls** disclosure that starts collapsed.

- **Fan:** power, speed 1 to 10, Auto, Night, and Front/Back airflow.
- **Oscillation:** Off, 45°, 90°, or Breeze, the patterns the PH01 supports. The oscillation direction can't be aimed on this model, so the card has no direction control.
- **Humidify:** Off, Normal, or Auto, with a target from 30% to 70% in the device's 10% steps. Room humidity comes from the humidity sensor, because the humidifier entity doesn't report it on this model.
- **Air quality:** temperature, humidity, and AQI tiles, plus PM2.5, PM10, VOC and NO2 colored by Dyson's six bands.
- **Alerts:** banners for an empty or missing water tank, deep clean due, humidifier maintenance, filter replacement, and any other `hass_dyson` fault.
- **Sleep timer:** Off, 1h, 2h, 3h, or a custom time in 15-minute steps.
- **Maintenance:** HEPA filter life (reset takes two taps), next deep clean, and water hardness.
  - `hass_dyson` 0.38 swaps Soft and Hard (its select reads raw `2025` as Hard, but the device and the Dyson app treat it as Soft). The card shows the value from the raw `water_hardness_raw` code and sends whichever option produces the right code. It detects a fixed integration from the label/raw pair and stops compensating. HA's own entity still shows the swapped value until the integration is fixed ([cmgrayb/hass-dyson#497](https://github.com/cmgrayb/hass-dyson/pull/497)).
- **Deep clean:** when "Cleaning time remaining" drops below 60 minutes, the controls are replaced by a large minutes-and-seconds countdown and the expected finish time, since nothing can be changed until it's done.
  - The cycle is always 60 minutes, so the card runs its own timer instead of waiting on sensor updates. It only corrects itself if the sensor disagrees by more than 2 minutes, including a final check when the timer ends.
  - When the timer ends it shows **Deep clean complete** with the finish time. If the sensor drops back to 60 well before the end, or an error-level fault appears, it shows **Deep clean interrupted** with the reason.
  - Tap Done or Dismiss to return to the controls. The result also clears on its own after 10 minutes.

It never uses the `climate.` entity. In `hass_dyson` 0.38 that entity is a compatibility shim whose controls don't work on this model.

## Install

### HACS (custom repository)

1. HACS → menu → **Custom repositories** → add `https://github.com/brycewc/ha-card-dyson-pure-humidify-cool` as a **Dashboard**.
2. Install **Dyson Humidify+Cool Card** and reload the browser.

Releases attach the built `dyson-humidify-cool-card.js` file, which HACS installs.

### Manual

1. Download `dyson-humidify-cool-card.js` from the latest release, or build it with `npm run build`.
2. Copy it to `/config/www/dyson-humidify-cool-card.js`.
3. Add a dashboard resource: Settings → Dashboards → ⋮ → Resources → `/local/dyson-humidify-cool-card.js?v=1.0.0`, type **JavaScript module**. Bump `?v=` when you update the file.

## Configuration

```yaml
type: custom:dyson-humidify-cool-card
entity: fan.bedroom_dyson
```

| Option             | Default     | Description                                                                                                                                      |
| ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `entity`           | required    | The `hass_dyson` fan entity. Every other entity is found from the same device.                                                                   |
| `title`            | device name | Header title.                                                                                                                                    |
| `show_maintenance` | `true`      | Shows the Maintenance panel.                                                                                                                     |
| `entities`         | `{}`        | Overrides for any discovered entity, for example `{ humidity: sensor.bedroom_humidity }`. Keys are listed in [src/entities.ts](src/entities.ts). |

The visual editor covers everything except `entities`.

## Theming

The card reads Material Design 3 tokens (`--md-sys-color-*`, `--md-sys-shape-corner-*`, `--md-sys-typescale-*`) when the Material You theme provides them. With any other theme it falls back to the standard HA variables (`--primary-color`, `--card-background-color`, `--divider-color`, and so on). It has no hard-coded light or dark palette: your HA theme decides.

Motion uses M3 Expressive springs (approximated with CSS `linear()`) and is disabled when the OS asks for reduced motion.

## Development

Requires Node 22 or newer.

```bash
npm install
npm run dev          # harness at http://localhost:5173/dev/ with mock data
npm test             # unit tests (offline)
npm run typecheck
npm run build        # dist/dyson-humidify-cool-card.js
```

### Working against your live Home Assistant

Copy `.env.example` to `.env.local` and fill in `HA_URL` and a long-lived access token (HA → Profile → Security). `.env.local` is gitignored. The token is only read by Node and the dev server, and a test fails the build if it ever ends up in `dist/`.

| Command                          | What it does                                                                                                                                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev:live`               | Opens the harness on live data through a Vite proxy. **Writes are dry runs until you tick "Arm writes".** Filter reset and firmware actions are always blocked.                                      |
| `npm run test:live`              | Read-only contract tests: every entity is found, attribute shapes and service fields match what the card expects, and the card renders live data. The connection refuses anything that isn't a read. |
| `npm run snapshot`               | Refreshes `test/fixtures/` from the live device (read-only). The serial, device ID, IP addresses and location are replaced with placeholders before anything is written.                             |
| `npm run ha:dev-resource -- add` | Adds the dev build as a dashboard resource and creates an admin-only "Dyson Dev" dashboard. `remove` undoes both, `status` shows what's installed.                                                   |
| `npm run dev:ha`                 | Watch-builds `custom:dyson-humidify-cool-card-dev` and serves it to HA at `http://<your-mac>.local:5174/`. Refresh the HA tab after each rebuild.                                                    |

The dev card uses a separate tag, so it can run alongside the installed card. Clients that can't reach your Mac (a phone off Wi-Fi, or HA over HTTPS) show a load error for the dev card only. Run `ha:dev-resource -- remove` when you're done.

## License

Apache-2.0. See [LICENSE](LICENSE).

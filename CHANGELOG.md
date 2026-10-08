# Changelog

## 1.0.0 - 2026-10-08

A from-scratch rewrite for the Dyson Purifier Humidify+Cool (PH01) as `custom:dyson-humidify-cool-card`, forked from [thanhn062/ha-dyson-card](https://github.com/thanhn062/ha-dyson-card) 0.2.0.

### Added

- Humidify controls: Off, Normal, and Auto, plus a target humidity in 10% steps.
- Alert banners for water tank, deep clean, humidifier maintenance, filter replacement, and `hass_dyson` faults.
- Maintenance panel with HEPA filter life and reset, next deep clean, and water hardness.
- A full-card countdown while a deep clean is running.

### Fixed

- Water hardness shows and sets the same value as the Dyson app, working around `hass_dyson` 0.38 swapping Soft and Hard.
- PM2.5, PM10, VOC, and NO2 readings colored by Dyson's six air-quality bands.
- Material 3 Expressive styling that uses Material You theme tokens, with standard HA theme variables as the fallback.
- Dev harness with mock and live data, read-only live contract tests, and a dev build that loads inside a real dashboard.

### Changed

- Entities are matched by `translation_key` from the device registry instead of by name.
- Oscillation is a single Off, 45°, 90°, or Breeze control, the patterns the PH01 supports.
- English only.

### Removed

- Heat, fan-only, and target temperature controls. The PH01 has no heater, and its climate entity is a non-functional shim.
- The direction dial, saved direction presets, and the 180° and 350° patterns. The PH01 can't aim its oscillation and only sweeps 45° or 90°.
- German and French translations.

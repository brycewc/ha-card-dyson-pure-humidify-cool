import { Hct, MaterialDynamicColors, SchemeTonalSpot, argbFromHex, hexFromArgb } from "@material/material-color-utilities";

export type ThemeVars = Record<string, string>;

export interface HaTheme {
  modes?: { light?: ThemeVars; dark?: ThemeVars };
  [key: string]: unknown;
}

const HA_COMMON: ThemeVars = {
  "ha-card-border-radius": "12px",
  "ha-card-border-width": "1px",
  "green-color": "#4caf50",
  "amber-color": "#ffc107",
  "orange-color": "#ff9800",
  "red-color": "#f44336",
  "purple-color": "#926bc7",
  "deep-purple-color": "#6e41ab",
  "warning-color": "#ffa600",
  "error-color": "#db4437",
  "success-color": "#43a047",
  "font-family": "Roboto, Noto, sans-serif",
};

export const HA_DEFAULT: Record<"light" | "dark", ThemeVars> = {
  light: {
    ...HA_COMMON,
    "primary-color": "#03a9f4",
    "text-primary-color": "#ffffff",
    "primary-background-color": "#fafafa",
    "card-background-color": "#ffffff",
    "primary-text-color": "#212121",
    "secondary-text-color": "#727272",
    "divider-color": "rgba(0, 0, 0, 0.12)",
  },
  dark: {
    ...HA_COMMON,
    "primary-color": "#03a9f4",
    "text-primary-color": "#ffffff",
    "primary-background-color": "#111111",
    "card-background-color": "#1c1c1c",
    "primary-text-color": "#e1e1e1",
    "secondary-text-color": "#9b9b9b",
    "divider-color": "rgba(225, 225, 225, 0.12)",
  },
};

// The subset of the Material You theme's HA mappings that a card can see.
const MATERIAL_YOU_MAPPING: ThemeVars = {
  "primary-color": "var(--md-sys-color-primary)",
  "text-primary-color": "var(--md-sys-color-on-primary)",
  "primary-text-color": "var(--md-sys-color-on-surface)",
  "secondary-text-color": "var(--md-sys-color-on-surface-variant)",
  "divider-color": "var(--md-sys-color-outline-variant)",
  "primary-background-color": "var(--md-sys-color-surface-container)",
  "lovelace-background": "var(--md-sys-color-surface)",
  "card-background-color": "var(--md-sys-color-surface-container-low)",
  "ha-card-background": "var(--md-sys-color-surface-container-low)",
  "ha-card-border-radius": "28px",
  "ha-card-border-width": "0px",
  "ha-card-box-shadow": "none",
  "error-color": "var(--md-sys-color-error)",
  "font-family": '"Google Sans Flex", "Google Sans", Roboto, sans-serif',
  "md-sys-shape-corner-full": "9999px",
  "md-sys-shape-corner-extra-large": "28px",
  "md-sys-shape-corner-large": "16px",
  "md-sys-shape-corner-medium": "12px",
  "md-sys-shape-corner-small": "8px",
  "md-sys-shape-corner-extra-small": "4px",
};

function kebab(name: string): string {
  return name.replace(/_/g, "-").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function materialScheme(seed: string, dark: boolean): ThemeVars {
  const scheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)), dark, 0);
  const vars: ThemeVars = {};
  for (const color of new MaterialDynamicColors().allColors) {
    if (!color?.name) continue;
    vars[`md-sys-color-${kebab(color.name)}`] = hexFromArgb(color.getArgb(scheme));
  }
  return vars;
}

export function materialYouVars(seed: string, dark: boolean): ThemeVars {
  return { ...HA_COMMON, ...materialScheme(seed, dark), ...MATERIAL_YOU_MAPPING };
}

// Mirrors HA's theme application: top-level vars, then the light/dark mode block. Material You Utilities
// publishes the generated scheme as --md-sys-color-*-light/-dark, which the theme's own values reference.
export function haThemeVars(theme: HaTheme, dark: boolean, seed: string): ThemeVars {
  const vars: ThemeVars = {};
  for (const [key, value] of Object.entries(theme)) {
    if (key !== "modes" && typeof value === "string") vars[key] = value;
  }
  Object.assign(vars, theme.modes?.[dark ? "dark" : "light"] ?? {});
  for (const [key, value] of Object.entries(materialScheme(seed, dark))) {
    vars[`${key}-${dark ? "dark" : "light"}`] = value;
  }
  return vars;
}

export function applyVars(element: HTMLElement, vars: ThemeVars) {
  element.removeAttribute("style");
  for (const [key, value] of Object.entries(vars)) element.style.setProperty(`--${key}`, value);
  element.style.fontFamily = "var(--font-family, Roboto, sans-serif)";
}

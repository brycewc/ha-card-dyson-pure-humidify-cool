export const BANDS = ["good", "fair", "poor", "very_poor", "extremely_poor", "severe"] as const;

export type Band = (typeof BANDS)[number];

export const BAND_LABELS: Record<Band, string> = {
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  very_poor: "Very poor",
  extremely_poor: "Extremely poor",
  severe: "Severe",
};

export type Pollutant = "pm25" | "pm10" | "voc" | "no2";

export const POLLUTANT_LABELS: Record<Pollutant, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
  voc: "VOC",
  no2: "NO2",
};

// Inclusive upper bounds for good..extremely_poor; anything above the last is severe.
const AQI_LIMITS = [50, 100, 150, 200, 300];

const POLLUTANT_LIMITS: Record<Pollutant, number[]> = {
  pm25: [35, 53, 70, 150, 250],
  pm10: [50, 75, 100, 350, 420],
  voc: [30, 69, 89, 250, 500],
  no2: [53, 100, 360, 649, 1249],
};

function bandFromLimits(value: number, limits: number[]): Band {
  const index = limits.findIndex((limit) => value <= limit);
  return BANDS[index === -1 ? BANDS.length - 1 : index];
}

export function aqiBand(aqi: number | null): Band | null {
  if (aqi === null || !Number.isFinite(aqi)) return null;
  return bandFromLimits(aqi, AQI_LIMITS);
}

// hass_dyson publishes VOC as raw / 1000 in mg/m³, while the bands use the raw device index.
export function vocRawIndex(mgPerM3: number): number {
  return Math.round(mgPerM3 * 1000);
}

export function pollutantBand(pollutant: Pollutant, value: number | null): Band | null {
  if (value === null || !Number.isFinite(value)) return null;
  const comparable = pollutant === "voc" ? vocRawIndex(value) : value;
  return bandFromLimits(comparable, POLLUTANT_LIMITS[pollutant]);
}

export function bandFromCategory(category: string | null | undefined): Band | null {
  if (!category) return null;
  const normalized = category.trim().toLowerCase().replace(/\s+/g, "_");
  return (BANDS as readonly string[]).includes(normalized) ? (normalized as Band) : null;
}

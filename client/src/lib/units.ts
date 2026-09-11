export const UNIT_OPTIONS = [
  "tsp",
  "tbsp",
  "cup",
  "fl oz",
  "pint",
  "quart",
  "gallon",
  "oz",
  "lb",
  "each",
] as const;

export const QUANTITY_OPTIONS: { label: string; value: number }[] = [
  { label: "1/8", value: 0.125 },
  { label: "1/4", value: 0.25 },
  { label: "1/3", value: 1 / 3 },
  { label: "3/8", value: 0.375 },
  { label: "1/2", value: 0.5 },
  { label: "5/8", value: 0.625 },
  { label: "2/3", value: 2 / 3 },
  { label: "3/4", value: 0.75 },
  { label: "7/8", value: 0.875 },
  { label: "1", value: 1 },
  { label: "1 1/2", value: 1.5 },
  { label: "2", value: 2 },
  { label: "2 1/2", value: 2.5 },
  { label: "3", value: 3 },
  { label: "3 1/2", value: 3.5 },
  { label: "4", value: 4 },
  { label: "4 1/2", value: 4.5 },
  { label: "5", value: 5 },
  { label: "5 1/2", value: 5.5 },
  { label: "6", value: 6 },
  { label: "6 1/2", value: 6.5 },
  { label: "7", value: 7 },
  { label: "7 1/2", value: 7.5 },
  { label: "8", value: 8 },
  { label: "8 1/2", value: 8.5 },
  { label: "9", value: 9 },
  { label: "9 1/2", value: 9.5 },
  { label: "10", value: 10 },
];

// Denominators checked smallest-first so the simplest matching fraction wins (e.g. 1/2 over 2/4).
const FRACTION_DENOMINATORS = [2, 3, 4, 6, 8, 16];
const FRACTION_TOLERANCE = 0.01;

/**
 * Formats a quantity as a mixed-number fraction (e.g. 1.5 -> "1 1/2"), falling back to a
 * trimmed decimal when it doesn't land near a common cooking fraction. Used for both the
 * fixed dropdown presets and scaled (halved/doubled) quantities that fall off that preset grid.
 */
export function formatQuantity(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  const whole = Math.floor(rounded + 1e-9);
  const frac = rounded - whole;

  if (frac < 1e-6) return String(whole);

  for (const denom of FRACTION_DENOMINATORS) {
    const numer = Math.round(frac * denom);
    if (numer <= 0 || numer >= denom) continue;
    if (Math.abs(frac - numer / denom) < FRACTION_TOLERANCE) {
      const fractionLabel = `${numer}/${denom}`;
      return whole > 0 ? `${whole} ${fractionLabel}` : fractionLabel;
    }
  }

  return String(Math.round(rounded * 100) / 100);
}

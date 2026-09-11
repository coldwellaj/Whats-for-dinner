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

/** Finds the preset quantity option matching a stored value, tolerant of floating-point rounding. */
export function findQuantityLabel(value: number): string | undefined {
  return QUANTITY_OPTIONS.find((opt) => Math.abs(opt.value - value) < 0.001)?.label;
}

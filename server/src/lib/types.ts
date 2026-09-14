export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const MEAL_PLAN_STATUSES = ["PLANNED", "MADE", "SKIPPED"] as const;
export type MealPlanStatus = (typeof MEAL_PLAN_STATUSES)[number];

export function isMealType(value: unknown): value is MealType {
  return typeof value === "string" && (MEAL_TYPES as readonly string[]).includes(value);
}

export function isMealPlanStatus(value: unknown): value is MealPlanStatus {
  return typeof value === "string" && (MEAL_PLAN_STATUSES as readonly string[]).includes(value);
}

export const VISIBILITIES = ["ALL", "FRIENDS", "PRIVATE"] as const;
export type Visibility = (typeof VISIBILITIES)[number];

export function isVisibility(value: unknown): value is Visibility {
  return typeof value === "string" && (VISIBILITIES as readonly string[]).includes(value);
}

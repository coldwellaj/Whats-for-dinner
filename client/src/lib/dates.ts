const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  return toDateKey(new Date(d.getTime() + days * DAY_MS));
}

/** Monday-start week key for the week containing today (or the given date key). */
export function currentWeekStart(dateKey: string = toDateKey(new Date())): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  const day = d.getUTCDay(); // 0 = Sunday
  const diffToMonday = (day + 6) % 7;
  return toDateKey(new Date(d.getTime() - diffToMonday * DAY_MS));
}

export function formatDayLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatWeekRangeLabel(weekStart: string): string {
  const end = addDays(weekStart, 6);
  const startD = new Date(`${weekStart}T00:00:00.000Z`);
  const endD = new Date(`${end}T00:00:00.000Z`);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  return `${startD.toLocaleDateString(undefined, opts)} – ${endD.toLocaleDateString(undefined, opts)}`;
}

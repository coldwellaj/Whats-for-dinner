/** Parses a "YYYY-MM-DD" key into a UTC start-of-day Date, and returns the exclusive end (7 days later). */
export function weekRange(weekStartDate: string): { start: Date; end: Date } {
  const start = new Date(`${weekStartDate}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Monday-start week key (e.g. "2026-09-07") for the week containing the given date. */
export function weekStartKeyFor(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 = Sunday
  const diffToMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d.toISOString().slice(0, 10);
}

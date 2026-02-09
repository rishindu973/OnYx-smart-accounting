export function parseISODateOnly(input: string): Date {
  // expects YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!m) throw new Error("Invalid date format. Use YYYY-MM-DD");

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);

  // Use UTC midnight to avoid timezone day-shifts
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(dt.getTime())) throw new Error("Invalid date value");
  return dt;
}

export function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseISOMonth(input: string): { start: Date; end: Date; daysInMonth: number } {
  // expects YYYY-MM in UTC
  const m = /^(\d{4})-(\d{2})$/.exec(input);
  if (!m) throw new Error("Invalid month format. Use YYYY-MM");

  const year = Number(m[1]);
  const month = Number(m[2]);

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1)); // next month start
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return { start, end, daysInMonth };
}

export function addDaysUTC(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

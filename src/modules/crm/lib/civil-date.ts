/** Business calendar used for installment due dates in BusinessOS Finance. */
export const APP_TIMEZONE = "America/Sao_Paulo";

function zonedCivilDateKey(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
}

/**
 * Civil due date (YYYY-MM-DD) for an Installment.dueDate timestamp.
 *
 * Prisma stores DateTime, but due dates are calendar days:
 * - UTC midnight (date-only input on a UTC host) → ISO date part is the chosen day
 * - Brazil local midnight (T03:00Z) → São Paulo calendar day
 */
export function dueCivilDateKey(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  if (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  ) {
    return date.toISOString().slice(0, 10);
  }
  return zonedCivilDateKey(date, APP_TIMEZONE);
}

export function todayCivilDateKey(now: Date = new Date()): string {
  return zonedCivilDateKey(now, APP_TIMEZONE);
}

export function diffCivilDays(fromKey: string, toKey: string): number {
  const from = Date.UTC(
    Number(fromKey.slice(0, 4)),
    Number(fromKey.slice(5, 7)) - 1,
    Number(fromKey.slice(8, 10)),
  );
  const to = Date.UTC(
    Number(toKey.slice(0, 4)),
    Number(toKey.slice(5, 7)) - 1,
    Number(toKey.slice(8, 10)),
  );
  return Math.round((to - from) / 86_400_000);
}

export function formatCivilDatePtBr(value: Date | string | null): string {
  if (!value) return "—";
  const key = dueCivilDateKey(value);
  if (!key) return "—";
  const [year, month, day] = key.split("-");
  return `${day}/${month}/${year}`;
}

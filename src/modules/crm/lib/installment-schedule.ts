import { addDays, addMonths, addWeeks, startOfDay } from "date-fns";

export function buildDueDates(params: {
  count: number;
  firstDueDate: Date;
  period: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "CUSTOM";
  customPeriodDays?: number;
}): Date[] {
  const dates: Date[] = [];
  let cursor = startOfDay(params.firstDueDate);
  for (let i = 0; i < params.count; i += 1) {
    dates.push(cursor);
    if (i === params.count - 1) break;
    if (params.period === "WEEKLY") cursor = addWeeks(cursor, 1);
    else if (params.period === "BIWEEKLY") cursor = addWeeks(cursor, 2);
    else if (params.period === "MONTHLY") cursor = addMonths(cursor, 1);
    else cursor = addDays(cursor, Math.max(1, params.customPeriodDays ?? 30));
  }
  return dates;
}

export function firstDueDateFromCivilKey(civilDateKey: string): Date {
  return startOfDay(new Date(`${civilDateKey.slice(0, 10)}T12:00:00`));
}

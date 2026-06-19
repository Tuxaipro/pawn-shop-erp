export type LoanConditionCode = 'general' | 'personal';
export type ConditionTimeType = 1 | 2 | 3 | 4;

export function computeRenewalDate(
  loanDate: Date,
  loanCondition: LoanConditionCode,
  deadline?: number,
  conditionTimeType?: ConditionTimeType
): { renewalDate: Date; deadLineMonth: number } {
  const base = new Date(loanDate);
  base.setHours(0, 0, 0, 0);

  if (loanCondition === 'general') {
    const renewal = new Date(base);
    renewal.setMonth(renewal.getMonth() + 12);
    return { renewalDate: renewal, deadLineMonth: 12 };
  }

  const value = deadline ?? 1;
  const renewal = new Date(base);

  switch (conditionTimeType) {
    case 1:
      renewal.setDate(renewal.getDate() + value * 7);
      break;
    case 2:
      renewal.setMonth(renewal.getMonth() + value);
      break;
    case 3:
      renewal.setFullYear(renewal.getFullYear() + value);
      break;
    case 4:
      renewal.setDate(renewal.getDate() + value);
      break;
    default:
      renewal.setMonth(renewal.getMonth() + value);
  }

  return { renewalDate: renewal, deadLineMonth: 0 };
}

export function formatDateOnly(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse YYYY-MM-DD as a calendar date (UTC midnight — safe for @db.Date columns). */
export function parseDateOnly(s: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!match) throw new Error('Invalid date');
  const y = Number(match[1]);
  const m = Number(match[2]);
  const day = Number(match[3]);
  const d = new Date(Date.UTC(y, m - 1, day));
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== day) {
    throw new Error('Invalid date');
  }
  return d;
}

/** Local calendar date as YYYY-MM-DD (for business-day boundaries). */
export function localCalendarDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function utcDayRangeFromCalendarDate(dateStr: string) {
  const start = parseDateOnly(dateStr);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

/** Local midnight → next midnight for timestamp columns (createdOn, etc.). */
export function localTimestampDayRange(d = new Date()) {
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function addCalendarDays(dateStr: string, days: number): string {
  const start = parseDateOnly(dateStr);
  start.setUTCDate(start.getUTCDate() + days);
  return formatDateOnly(start);
}

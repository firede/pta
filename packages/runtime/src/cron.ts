export type CronField = Readonly<{
  values: ReadonlySet<number>;
  any: boolean;
}>;

export type CronSchedule = Readonly<{
  source: string;
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}>;

type FieldRange = Readonly<{ min: number; max: number }>;

const fieldRanges: readonly FieldRange[] = [
  { min: 0, max: 59 },
  { min: 0, max: 23 },
  { min: 1, max: 31 },
  { min: 1, max: 12 },
  { min: 0, max: 7 },
];

function parseField(source: string, range: FieldRange): CronField | undefined {
  if (source === '*') return { values: new Set(), any: true };
  const values = new Set<number>();
  for (const part of source.split(',')) {
    const [body, stepText, extra] = part.split('/');
    if (body === undefined || body === '' || extra !== undefined) return undefined;
    let step = 1;
    if (stepText !== undefined) {
      if (!/^\d+$/u.test(stepText)) return undefined;
      step = Number(stepText);
      if (step < 1) return undefined;
    }
    let start: number;
    let end: number;
    if (body === '*') {
      start = range.min;
      end = range.max;
    } else if (/^\d+$/u.test(body)) {
      start = Number(body);
      end = stepText === undefined ? start : range.max;
    } else {
      const match = /^(\d+)-(\d+)$/u.exec(body);
      if (match === null) return undefined;
      start = Number(match[1]);
      end = Number(match[2]);
    }
    if (start < range.min || end > range.max || start > end) return undefined;
    for (let value = start; value <= end; value += step) values.add(value);
  }
  if (values.size === 0) return undefined;
  return { values, any: false };
}

export function parseCronSchedule(source: string): CronSchedule | undefined {
  const fields = source.trim().split(/\s+/u);
  if (fields.length !== 5) return undefined;
  const parsed = fields.map((field, index) => parseField(field, fieldRanges[index] as FieldRange));
  if (parsed.some((field) => field === undefined)) return undefined;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parsed as CronField[];
  return {
    source: source.trim(),
    minute: minute as CronField,
    hour: hour as CronField,
    dayOfMonth: dayOfMonth as CronField,
    month: month as CronField,
    dayOfWeek: dayOfWeek as CronField,
  };
}

function fieldMatches(field: CronField, value: number): boolean {
  return field.any || field.values.has(value);
}

function dayOfWeekMatches(field: CronField, value: number): boolean {
  // cron 约定 0 与 7 都是周日
  return field.any || field.values.has(value) || (value === 0 && field.values.has(7));
}

export function cronMatches(schedule: CronSchedule, date: Date): boolean {
  if (!fieldMatches(schedule.minute, date.getMinutes())) return false;
  if (!fieldMatches(schedule.hour, date.getHours())) return false;
  if (!fieldMatches(schedule.month, date.getMonth() + 1)) return false;
  const domMatch = fieldMatches(schedule.dayOfMonth, date.getDate());
  const dowMatch = dayOfWeekMatches(schedule.dayOfWeek, date.getDay());
  // POSIX cron：日与星期都受限时取或，否则取与
  if (!schedule.dayOfMonth.any && !schedule.dayOfWeek.any) return domMatch || dowMatch;
  return domMatch && dowMatch;
}

export function nextCronOccurrence(schedule: CronSchedule, from: Date): Date | undefined {
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const bound = from.getTime() + 400 * 24 * 60 * 60 * 1000;
  while (cursor.getTime() <= bound) {
    if (cronMatches(schedule, cursor)) return new Date(cursor.getTime());
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return undefined;
}

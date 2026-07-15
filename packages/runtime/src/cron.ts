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

function dayMatches(schedule: CronSchedule, date: Date): boolean {
  if (!fieldMatches(schedule.month, date.getMonth() + 1)) return false;
  const domMatch = fieldMatches(schedule.dayOfMonth, date.getDate());
  const dowMatch = dayOfWeekMatches(schedule.dayOfWeek, date.getDay());
  if (!schedule.dayOfMonth.any && !schedule.dayOfWeek.any) return domMatch || dowMatch;
  return domMatch && dowMatch;
}

function fieldValues(field: CronField, range: FieldRange): number[] {
  if (field.any) {
    const values: number[] = [];
    for (let value = range.min; value <= range.max; value += 1) values.push(value);
    return values;
  }
  return [...field.values].toSorted((left, right) => left - right);
}

export function nextCronOccurrence(schedule: CronSchedule, from: Date): Date | undefined {
  const start = new Date(from.getTime());
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);
  const hours = fieldValues(schedule.hour, { min: 0, max: 23 });
  const minutes = fieldValues(schedule.minute, { min: 0, max: 59 });
  const day = new Date(start.getTime());
  day.setHours(0, 0, 0, 0);
  // 按天步进十年：闰日等低频表达式的最大间隔（含世纪非闰年）也在此界内
  for (let offset = 0; offset < 3660; offset += 1) {
    if (dayMatches(schedule, day)) {
      for (const hour of hours) {
        for (const minute of minutes) {
          const candidate = new Date(day.getTime());
          candidate.setHours(hour, minute, 0, 0);
          // 夏令时跳时会把不存在的本地时间归一化到别的时刻：复验字段匹配，幻影候选跳过
          if (candidate.getTime() >= start.getTime() && cronMatches(schedule, candidate)) {
            return candidate;
          }
        }
      }
    }
    day.setDate(day.getDate() + 1);
  }
  return undefined;
}

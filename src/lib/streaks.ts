/**
 * Pure streak + reading-activity math. All date math is UTC and operates on
 * plain YYYY-MM-DD strings; `today` is always injected by the caller (never
 * read from the wall clock here) so these functions stay deterministic and
 * testable.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface ActivityCell {
  date: string;
  count: number;
  level: ActivityLevel;
  future: boolean;
}

function toUTCDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00Z');
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = toUTCDate(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
}

/** Days between two YYYY-MM-DD strings (b - a), in whole days. */
function diffDays(a: string, b: string): number {
  return Math.round((toUTCDate(b).getTime() - toUTCDate(a).getTime()) / MS_PER_DAY);
}

function levelFor(count: number): ActivityLevel {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count === 3) return 3;
  return 4;
}

/** Sunday (start of week, UTC) for the week containing dateStr. */
function weekStart(dateStr: string): string {
  const dow = toUTCDate(dateStr).getUTCDay(); // 0 = Sunday
  return addDays(dateStr, -dow);
}

/**
 * Consecutive calendar days with >= 1 read, counting back from today.
 * Grace period: a streak isn't broken until a full day is missed — if
 * there's no read today but there was one yesterday, counting continues
 * from yesterday. Duplicate read dates collapse (each day counts once).
 * Empty input, or a most-recent read older than yesterday, returns 0.
 */
export function currentStreak(readDates: string[], today: string): number {
  if (readDates.length === 0) return 0;

  const readSet = new Set(readDates);

  let anchor: string;
  if (readSet.has(today)) {
    anchor = today;
  } else {
    const yesterday = addDays(today, -1);
    if (readSet.has(yesterday)) {
      anchor = yesterday;
    } else {
      return 0;
    }
  }

  let streak = 0;
  let cursor = anchor;
  while (readSet.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/**
 * 17 columns (weeks) x 7 rows (Sun..Sat) of activity cells, chronological
 * (oldest week first, oldest day first within a week). The last week is the
 * Sun..Sat week containing `today`. Cells after today are still included
 * (count 0) but flagged `future` so a renderer can dim them.
 */
export function activityGrid(
  readDates: string[],
  today: string,
): ActivityCell[][] {
  const counts = new Map<string, number>();
  for (const d of readDates) {
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }

  const lastWeekStart = weekStart(today);
  const firstWeekStart = addDays(lastWeekStart, -7 * 16);

  const weeks: ActivityCell[][] = [];
  for (let w = 0; w < 17; w++) {
    const start = addDays(firstWeekStart, w * 7);
    const week: ActivityCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, d);
      const count = counts.get(date) ?? 0;
      week.push({
        date,
        count,
        level: levelFor(count),
        future: diffDays(today, date) > 0,
      });
    }
    weeks.push(week);
  }
  return weeks;
}

/**
 * Weekly bucket counts, oldest -> newest, aligned to Sun..Sat weeks with the
 * week containing `today` as the last bucket. Each bucket counts DISTINCT
 * read-days that week (not raw read events) — this stays consistent with
 * the streak semantics above ("did you read on N days") rather than
 * "articles read," which is a separate, honestly-labeled stat elsewhere.
 */
export function weeklyCounts(
  readDates: string[],
  today: string,
  weeks = 12,
): number[] {
  const distinctDays = new Set(readDates);

  const lastWeekStart = weekStart(today);
  const firstWeekStart = addDays(lastWeekStart, -7 * (weeks - 1));

  const buckets = new Array<number>(weeks).fill(0);
  for (const date of distinctDays) {
    const offsetDays = diffDays(firstWeekStart, date);
    if (offsetDays < 0) continue;
    const weekIndex = Math.floor(offsetDays / 7);
    if (weekIndex < 0 || weekIndex >= weeks) continue;
    buckets[weekIndex] += 1;
  }
  return buckets;
}

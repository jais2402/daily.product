import { describe, it, expect } from 'vitest';
import { currentStreak, activityGrid, weeklyCounts } from './streaks';

const TODAY = '2026-07-06'; // Monday

describe('currentStreak', () => {
  it('is 0 for no reads', () => {
    expect(currentStreak([], TODAY)).toBe(0);
  });

  it('is 1 when only today has a read', () => {
    expect(currentStreak(['2026-07-06'], TODAY)).toBe(1);
  });

  it('counts yesterday + day-before when today has no read (grace period)', () => {
    expect(currentStreak(['2026-07-04', '2026-07-05'], TODAY)).toBe(2);
  });

  it('is 0 when the most recent read is two days ago (streak broken)', () => {
    expect(currentStreak(['2026-07-04'], TODAY)).toBe(0);
  });

  it('collapses duplicate same-day reads (counts once)', () => {
    expect(
      currentStreak(['2026-07-06', '2026-07-06', '2026-07-06'], TODAY),
    ).toBe(1);
  });

  it('breaks the count at a gap even with earlier duplicates', () => {
    // 07-06 (today), 07-05, gap at 07-04, then 07-03, 07-02 duplicated
    const dates = [
      '2026-07-06',
      '2026-07-05',
      '2026-07-03',
      '2026-07-03',
      '2026-07-02',
    ];
    expect(currentStreak(dates, TODAY)).toBe(2);
  });

  it('counts a long unbroken run ending today', () => {
    const dates = [
      '2026-07-06',
      '2026-07-05',
      '2026-07-04',
      '2026-07-03',
      '2026-07-02',
    ];
    expect(currentStreak(dates, TODAY)).toBe(5);
  });

  it('counts an unbroken run ending yesterday (grace) ignoring older gaps', () => {
    const dates = ['2026-07-05', '2026-07-04', '2026-07-02'];
    expect(currentStreak(dates, TODAY)).toBe(2);
  });
});

describe('activityGrid', () => {
  const grid = activityGrid([], TODAY);

  it('returns exactly 17 weeks of 7 days each', () => {
    expect(grid.length).toBe(17);
    for (const week of grid) {
      expect(week.length).toBe(7);
    }
  });

  it('is chronological: first cell of first week is the earliest date', () => {
    const firstDate = grid[0][0].date;
    const lastDate = grid[16][6].date;
    expect(new Date(firstDate + 'T00:00:00Z').getTime()).toBeLessThan(
      new Date(lastDate + 'T00:00:00Z').getTime(),
    );
  });

  it('includes today somewhere in the last week', () => {
    const lastWeek = grid[16];
    expect(lastWeek.some((cell) => cell.date === TODAY)).toBe(true);
  });

  it('each week starts on Sunday and ends on Saturday', () => {
    for (const week of grid) {
      const startDow = new Date(week[0].date + 'T00:00:00Z').getUTCDay();
      const endDow = new Date(week[6].date + 'T00:00:00Z').getUTCDay();
      expect(startDow).toBe(0);
      expect(endDow).toBe(6);
    }
  });

  it('marks cells after today as future', () => {
    const lastWeek = grid[16];
    const todayCell = lastWeek.find((cell) => cell.date === TODAY)!;
    expect(todayCell.future).toBe(false);
    const afterToday = lastWeek.filter(
      (cell) =>
        new Date(cell.date + 'T00:00:00Z').getTime() >
        new Date(TODAY + 'T00:00:00Z').getTime(),
    );
    expect(afterToday.length).toBeGreaterThan(0);
    for (const cell of afterToday) {
      expect(cell.future).toBe(true);
      expect(cell.count).toBe(0);
    }
  });

  it('excludes a date exactly 17 weeks before the grid start', () => {
    // Grid covers 17 weeks ending with today's week. A read 17 full weeks
    // before the first included week must not appear/count in the grid.
    const firstDate = grid[0][0].date;
    const excludedDate = addDaysUTC(firstDate, -7);
    const g = activityGrid([excludedDate, firstDate], TODAY);
    const flat = g.flat();
    expect(flat.some((c) => c.date === excludedDate)).toBe(false);
    const firstCell = flat.find((c) => c.date === firstDate)!;
    expect(firstCell.count).toBe(1);
  });

  it('maps read counts per day to levels 0,1,2,3,4 (>=4 caps at 4)', () => {
    const day = TODAY;
    const reps = (n: number) => Array.from({ length: n }, () => day);

    expect(cellFor(activityGrid(reps(0), TODAY), day).level).toBe(0);
    expect(cellFor(activityGrid(reps(1), TODAY), day).level).toBe(1);
    expect(cellFor(activityGrid(reps(2), TODAY), day).level).toBe(2);
    expect(cellFor(activityGrid(reps(3), TODAY), day).level).toBe(3);
    expect(cellFor(activityGrid(reps(4), TODAY), day).level).toBe(4);
    expect(cellFor(activityGrid(reps(7), TODAY), day).level).toBe(4);
  });

  it('reflects duplicate read counts (not collapsed) as the raw count for a day', () => {
    const cell = cellFor(activityGrid([TODAY, TODAY, TODAY], TODAY), TODAY);
    expect(cell.count).toBe(3);
  });

  function cellFor(g: ReturnType<typeof activityGrid>, date: string) {
    return g.flat().find((c) => c.date === date)!;
  }

  function addDaysUTC(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
});

describe('weeklyCounts', () => {
  it('returns 12 buckets by default, oldest to newest', () => {
    expect(weeklyCounts([], TODAY).length).toBe(12);
  });

  it('returns the requested number of weeks', () => {
    expect(weeklyCounts([], TODAY, 4).length).toBe(4);
  });

  it('zero-fills weeks with no reads', () => {
    expect(weeklyCounts([], TODAY, 3)).toEqual([0, 0, 0]);
  });

  it('counts distinct read-days per week when {distinctDays: true}, with the last bucket being the week containing today', () => {
    // TODAY = 2026-07-06 (Mon); that week's Sunday is 2026-07-05.
    const counts = weeklyCounts(
      ['2026-07-05', '2026-07-06', '2026-07-06'],
      TODAY,
      2,
      { distinctDays: true },
    );
    // duplicates on 07-06 collapse to 1 distinct day; plus 07-05 = 2 distinct days
    expect(counts[counts.length - 1]).toBe(2);
  });

  it('places a Sunday read in the new week, not the prior week (distinctDays mode)', () => {
    // Week containing TODAY (Mon 2026-07-06) starts Sunday 2026-07-05.
    // A read on that Sunday belongs to the new week; a read on the
    // previous Saturday (2026-07-04) belongs to the prior week.
    const counts = weeklyCounts(['2026-07-04', '2026-07-05'], TODAY, 2, {
      distinctDays: true,
    });
    expect(counts[0]).toBe(1); // prior week: 07-04
    expect(counts[1]).toBe(1); // week of today: 07-05
  });

  it('places a Sunday read in the new week, not the prior week (raw/default mode)', () => {
    const counts = weeklyCounts(['2026-07-04', '2026-07-05'], TODAY, 2);
    expect(counts[0]).toBe(1); // prior week: 07-04
    expect(counts[1]).toBe(1); // week of today: 07-05
  });

  it('defaults to raw counts: each read event counts, duplicates included', () => {
    // 3 reads on the same day (today's week) should yield 3, not 1.
    const counts = weeklyCounts(
      ['2026-07-06', '2026-07-06', '2026-07-06'],
      TODAY,
      2,
    );
    expect(counts[counts.length - 1]).toBe(3);
  });

  it('raw mode sums duplicates across distinct days within a week', () => {
    // 07-05 read twice, 07-06 read once -> 3 raw events in the last week.
    const counts = weeklyCounts(
      ['2026-07-05', '2026-07-05', '2026-07-06'],
      TODAY,
      2,
    );
    expect(counts[counts.length - 1]).toBe(3);
  });

  it('{distinctDays: true} collapses the same duplicates to 1 per day (2 distinct days)', () => {
    const counts = weeklyCounts(
      ['2026-07-05', '2026-07-05', '2026-07-06'],
      TODAY,
      2,
      { distinctDays: true },
    );
    expect(counts[counts.length - 1]).toBe(2);
  });
});

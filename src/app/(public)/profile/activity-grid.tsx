import type { ActivityCell } from '@/lib/streaks';

// Level colors 0->4, from design-handoff.md §8 "Level colors".
const LEVEL_COLORS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: '#1a1f28',
  1: 'rgba(139,124,248,.35)',
  2: 'rgba(139,124,248,.6)',
  3: 'rgba(139,124,248,.82)',
  4: '#8b7cf8',
};

function Cell({ cell }: { cell: ActivityCell }) {
  return (
    <div
      title={`${cell.date}: ${cell.count} read${cell.count === 1 ? '' : 's'}`}
      className={`h-3 w-3 rounded-[3px] ${cell.future ? 'opacity-40' : ''}`}
      style={{ backgroundColor: LEVEL_COLORS[cell.level] }}
    />
  );
}

export function ActivityGrid({ weeks }: { weeks: ActivityCell[][] }) {
  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto pb-1.5">
        {weeks.map((week, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {week.map((cell) => (
              <Cell key={cell.date} cell={cell} />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3.5 flex items-center gap-2 text-[11px] text-faint">
        <span>Less</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <div
            key={level}
            className="h-[11px] w-[11px] rounded-[3px]"
            style={{ backgroundColor: LEVEL_COLORS[level] }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

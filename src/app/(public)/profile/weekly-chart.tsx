// 12-bar weekly reading chart (design-handoff.md §8 "Reading hours · last 12
// weeks", relabeled per the Phase 6 plan's honest-data deviation — see
// page.tsx — to "Articles read" counts rather than fabricated hours).
export function WeeklyChart({ counts }: { counts: number[] }) {
  const max = Math.max(1, ...counts);
  const lastIndex = counts.length - 1;

  return (
    <div className="flex h-[150px] items-end gap-2">
      {counts.map((count, i) => {
        const heightPct = Math.max(4, (count / max) * 100);
        return (
          <div
            key={i}
            className="flex h-full flex-1 flex-col items-center justify-end gap-2"
          >
            <div
              className="w-full rounded-[4px]"
              style={{
                height: `${heightPct}%`,
                backgroundColor:
                  i === lastIndex ? 'var(--acc)' : 'rgba(139,124,248,.4)',
              }}
              title={`${count} article${count === 1 ? '' : 's'} read`}
            />
            <span className="text-[10px] text-faint">W{i + 1}</span>
          </div>
        );
      })}
    </div>
  );
}

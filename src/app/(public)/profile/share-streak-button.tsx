'use client';

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

export function ShareStreakButton({ streak }: { streak: number }) {
  async function share() {
    const text = `🔥 ${streak}-day reading streak on Daily.Product`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no share API, no clipboard — nothing more we can do silently
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="flex items-center gap-1.5 rounded-[9px] border border-border px-3.5 py-2 text-[12.5px] font-semibold text-muted transition-colors hover:text-text"
    >
      <ShareIcon />
      Share streak
    </button>
  );
}

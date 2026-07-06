'use client';

import { useState, useTransition } from 'react';
import { toggleSource } from './actions';

export function SourceRowActions({ id, status }: { id: string; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPaused = status === 'paused';

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const result = await toggleSource({ id, to: isPaused ? 'active' : 'paused' });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className="rounded-lg border px-3 py-1 text-xs disabled:opacity-40"
      >
        {isPaused ? 'Resume' : 'Pause'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

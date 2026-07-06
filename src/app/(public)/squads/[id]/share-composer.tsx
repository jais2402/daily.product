'use client';

import { useRef, useState, useTransition } from 'react';
import { shareToSquad } from '../actions';

/**
 * Article-URL composer (documented deviation from the prototype's free-text
 * chat composer — `squad_shares` requires a resolvable article). Paste a
 * Daily.Product or original article URL/uuid, optional note, Send ->
 * shareToSquad. The server action revalidates the squad page on success, so
 * on success we just clear the inputs; no local list update needed.
 */
export function ShareComposer({ squadId }: { squadId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const refInputRef = useRef<HTMLInputElement>(null);
  const noteInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const ref = refInputRef.current?.value.trim() ?? '';
    const note = noteInputRef.current?.value.trim() ?? '';

    if (!ref) return;

    startTransition(async () => {
      const result = await shareToSquad({
        squadId,
        ref,
        note: note || undefined,
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (refInputRef.current) refInputRef.current.value = '';
      if (noteInputRef.current) noteInputRef.current.value = '';
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-1 flex flex-col gap-2">
      <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card py-2 pl-4 pr-2">
        <input
          ref={refInputRef}
          type="text"
          placeholder="Paste an article link to share…"
          className="flex-1 bg-transparent text-[13.5px] text-text outline-none placeholder:text-faint"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[9px] bg-acc px-[18px] py-2.5 text-[13px] font-semibold text-[#0d1016] disabled:opacity-50"
        >
          {isPending ? 'Sending…' : 'Send'}
        </button>
      </div>
      <input
        ref={noteInputRef}
        type="text"
        placeholder="Add a note (optional)"
        maxLength={280}
        className="rounded-xl border border-border bg-card px-4 py-2.5 text-[13px] text-text outline-none placeholder:text-faint focus:border-acc"
      />
      {error && <p className="text-[12.5px] text-red-400">{error}</p>}
    </form>
  );
}

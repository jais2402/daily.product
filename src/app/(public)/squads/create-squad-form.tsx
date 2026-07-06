'use client';

import { useRef, useState, useTransition } from 'react';
import { createSquad } from './actions';

/**
 * Inline "+ Create squad" form for the squads list header. `createSquad`
 * redirects to the new squad on success, so there's no success state to
 * handle here — only the inline validation error path.
 */
export function CreateSquadForm() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createSquad(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-[10px] bg-acc px-[18px] py-2.5 font-display text-[13.5px] font-semibold text-[#0d1016]"
      >
        <span aria-hidden>+</span>
        Create squad
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex flex-col items-end gap-1.5"
    >
      <div className="flex items-center gap-2">
        <input
          name="name"
          placeholder="Squad name"
          minLength={2}
          maxLength={60}
          required
          autoFocus
          className="rounded-[10px] border border-border bg-card2 px-3 py-2.5 text-[13.5px] text-text outline-none focus:border-acc"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[10px] bg-acc px-[18px] py-2.5 font-display text-[13.5px] font-semibold text-[#0d1016] disabled:opacity-50"
        >
          {isPending ? 'Creating…' : '+ Create squad'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="rounded-[10px] border border-border bg-card2 px-3 py-2.5 text-[13.5px] font-semibold text-text disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-[12.5px] text-red-400">{error}</p>}
    </form>
  );
}

'use client';

import { useState } from 'react';

/**
 * Copies the invite link (`${origin}/squads/join/${inviteCode}`) to the
 * clipboard and flashes a "Copied!" confirmation for a couple seconds.
 * URL-composer per the plan's documented deviation (no chat/share sheet).
 */
export function InviteButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const url = `${window.location.origin}/squads/join/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, non-secure context); the
      // button simply won't flash "Copied!" — no further recovery needed.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="rounded-[10px] bg-acc px-[18px] py-2.5 font-display text-[13.5px] font-semibold text-[#0d1016]"
    >
      {copied ? 'Copied!' : 'Invite'}
    </button>
  );
}

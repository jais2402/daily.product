'use client';

import { useState, useTransition } from 'react';
import { avatarUrl, generateIdentity } from '@/lib/identity';
import { ROLES, type MemberRole } from '@/lib/roles';
import { updateProfile } from './actions';

type Topic = { id: string; name: string; slug: string };

export function EditForm({
  displayName,
  avatarSeed,
  role,
  topics,
  topicIds,
}: {
  displayName: string;
  avatarSeed: string;
  role: MemberRole;
  topics: Topic[];
  topicIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [seed, setSeed] = useState(avatarSeed);
  const [selectedRole, setSelectedRole] = useState<MemberRole>(role);
  const [selected, setSelected] = useState<Set<string>>(new Set(topicIds));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName(displayName);
    setSeed(avatarSeed);
    setSelectedRole(role);
    setSelected(new Set(topicIds));
    setError(null);
  }

  function toggleTopic(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function reshuffle() {
    setSeed(generateIdentity().avatarSeed);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateProfile({
        displayName: name,
        avatarSeed: seed,
        role: selectedRole,
        topicIds: [...selected],
      });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start rounded-[10px] border border-border bg-card px-[18px] py-2.5 text-[13.5px] font-semibold text-text"
      >
        Edit profile
      </button>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex flex-col items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(seed)}
            alt="Avatar preview"
            className="h-[74px] w-[74px] rounded-full border border-border"
          />
          <button
            type="button"
            onClick={reshuffle}
            className="rounded-[9px] border border-border bg-card2 px-3 py-1.5 text-[12px] font-semibold text-muted transition-colors hover:text-text"
          >
            Reshuffle
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-muted">
              Display name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              className="rounded-[10px] border border-border bg-card2 px-3 py-2.5 text-[14px] text-text outline-none focus:border-acc"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-muted">Role</span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as MemberRole)}
              className="rounded-[10px] border border-border bg-card2 px-3 py-2.5 text-[14px] text-text outline-none focus:border-acc"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
              <option value="other">Other</option>
            </select>
          </label>

          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-muted">
              Topics
            </span>
            <div className="flex flex-wrap gap-2">
              {topics.map((topic) => {
                const isSelected = selected.has(topic.id);
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => toggleTopic(topic.id)}
                    className={
                      isSelected
                        ? 'rounded-lg bg-acc px-3 py-1.5 text-[12.5px] font-medium text-[#0d1016]'
                        : 'rounded-lg border border-border bg-card2 px-3 py-1.5 text-[12.5px] font-medium text-muted'
                    }
                  >
                    {topic.name}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-[12.5px] text-red-400">{error}</p>}

          <div className="flex gap-2.5">
            <button
              type="button"
              disabled={isPending}
              onClick={save}
              className="rounded-[10px] bg-acc px-5 py-2.5 text-[13.5px] font-semibold text-[#0d1016] disabled:opacity-50"
            >
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                reset();
                setOpen(false);
              }}
              className="rounded-[10px] border border-border bg-card2 px-5 py-2.5 text-[13.5px] font-semibold text-text disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useTransition } from 'react';
import { generateIdentity, avatarUrl } from '@/lib/identity';
import { ROLES, defaultTopicSlugsForRole, type MemberRole } from '@/lib/roles';
import { completeOnboarding } from './actions';

type Topic = { id: string; name: string; slug: string };

export function OnboardingForm({ topics }: { topics: Topic[] }) {
  const [step, setStep] = useState<'role' | 'topics'>('role');
  const [role, setRole] = useState<MemberRole | null>(null);
  const [identity, setIdentity] = useState(() => generateIdentity());
  const [nameEdit, setNameEdit] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function pickRole(r: MemberRole) {
    setRole(r);
    const defaults = new Set(
      topics
        .filter((t) => defaultTopicSlugsForRole(r).includes(t.slug))
        .map((t) => t.id),
    );
    setSelected(defaults);
    setStep('topics');
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
    setIdentity(generateIdentity());
    setNameEdit(null);
  }

  function finish() {
    if (!role || selected.size === 0) return;
    setError(null);
    startTransition(async () => {
      const result = await completeOnboarding({
        role,
        displayName: nameEdit ?? identity.displayName,
        avatarSeed: identity.avatarSeed,
        topicIds: [...selected],
      });
      if (result?.error) setError(result.error);
    });
  }

  if (step === 'role') {
    return (
      <div
        className="flex min-h-screen items-center justify-center p-10"
        style={{
          background:
            'radial-gradient(1100px 600px at 50% -10%, rgba(139,124,248,.14), transparent 60%), var(--bg)',
        }}
      >
        <div className="flex w-full max-w-[680px] flex-col items-center gap-8 text-center">
          <div>
            <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[.08em] text-acc">
              STEP 1 OF 2
            </p>
            <h1 className="mb-3 font-display text-[26px] font-bold tracking-[-.02em]">
              What best describes you?
            </h1>
            <p className="text-[15px] leading-[1.55] text-muted">
              We&apos;ll tailor your feed and topic suggestions to your role.
            </p>
          </div>

          <div className="grid w-full grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map((r) => {
              const isSelected = role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => pickRole(r.value)}
                  className="flex flex-col gap-2 rounded-[14px] border p-[18px] text-left transition-colors"
                  style={{
                    borderColor: isSelected ? 'var(--acc)' : 'var(--border)',
                    backgroundColor: isSelected
                      ? 'rgba(139,124,248,.10)'
                      : 'var(--card)',
                  }}
                >
                  <div
                    className="grid h-[38px] w-[38px] place-items-center rounded-[10px] text-[12px] font-bold text-[#0d1016]"
                    style={{ backgroundColor: r.color }}
                  >
                    {r.monogram}
                  </div>
                  <span className="font-display text-[15px] font-semibold">
                    {r.label}
                  </span>
                  <span className="text-[12px] text-muted">
                    {r.description}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={!role}
            onClick={() => role && setStep('topics')}
            className="rounded-[11px] bg-acc px-10 py-3 font-display font-semibold text-[#0d1016] disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center p-10"
      style={{
        background:
          'radial-gradient(1100px 600px at 50% -10%, rgba(139,124,248,.14), transparent 60%), var(--bg)',
      }}
    >
      <div className="flex w-full max-w-[640px] flex-col items-center gap-8 text-center">
        <div>
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-[.08em] text-acc">
            STEP 2 OF 2
          </p>
          <h1 className="mb-3 font-display text-[26px] font-bold tracking-[-.02em]">
            Pick your topics
          </h1>
          <p className="text-[15px] leading-[1.55] text-muted">
            Choose at least one to seed your daily feed. You can change this
            later.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={avatarUrl(identity.avatarSeed)}
            alt="Your avatar"
            className="h-[74px] w-[74px] rounded-full border border-border"
          />
          <input
            value={nameEdit ?? identity.displayName}
            onChange={(e) => setNameEdit(e.target.value)}
            aria-label="Display name"
            className="rounded-[10px] border border-border bg-card p-3 text-center"
          />
          <button
            type="button"
            onClick={reshuffle}
            className="rounded-[10px] border border-border bg-card px-4 py-2 transition-colors hover:border-acc"
          >
            Reshuffle
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5">
          {topics.map((topic) => {
            const isSelected = selected.has(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
                className={
                  isSelected
                    ? 'rounded-[10px] bg-acc px-4 py-[9px] text-[13.5px] font-medium text-[#0d1016]'
                    : 'rounded-[10px] border border-border bg-card px-4 py-[9px] text-[13.5px] font-medium text-muted'
                }
              >
                {topic.name}
              </button>
            );
          })}
        </div>

        {error && <p className="text-[13px] text-red-400">{error}</p>}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep('role')}
            className="rounded-[11px] border border-border bg-card px-8 py-3 font-display font-semibold"
          >
            Back
          </button>
          <button
            type="button"
            disabled={selected.size === 0 || isPending}
            onClick={finish}
            className="rounded-[11px] bg-acc px-10 py-3 font-display font-semibold text-[#0d1016] disabled:opacity-50"
          >
            {isPending ? 'Entering…' : 'Enter Daily.Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

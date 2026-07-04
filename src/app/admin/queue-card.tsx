'use client';

import { useState, useTransition } from 'react';
import { approveArticle, rejectArticle } from './actions';

type Article = {
  id: string;
  title: string;
  url: string;
  summary: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  sources: { name: string } | { name: string }[] | null;
};

type Topic = { id: string; name: string; slug: string };

function sourceName(sources: Article['sources']): string {
  if (!sources) return 'Unknown source';
  if (Array.isArray(sources)) return sources[0]?.name ?? 'Unknown source';
  return sources.name;
}

export function QueueCard({ article, topics }: { article: Article; topics: Topic[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (removed) return null;

  function toggleTopic(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveArticle({
        articleId: article.id,
        topicIds: Array.from(selected),
      });
      if (result?.error) setError(result.error);
      else setRemoved(true);
    });
  }

  function handleReject() {
    setError(null);
    startTransition(async () => {
      const result = await rejectArticle({ articleId: article.id });
      if (result?.error) setError(result.error);
      else setRemoved(true);
    });
  }

  return (
    <li className="flex gap-4 rounded-lg border p-4">
      {article.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image_url}
          alt=""
          className="h-20 w-20 flex-none rounded-md object-cover"
        />
      ) : (
        <div className="h-20 w-20 flex-none rounded-md bg-neutral-200 dark:bg-neutral-800" />
      )}

      <div className="flex flex-1 flex-col gap-2">
        <div>
          <a
            href={article.url}
            target="_blank"
            rel="noreferrer"
            className="font-semibold hover:underline"
          >
            {article.title}
          </a>
          <p className="text-xs text-neutral-500">{sourceName(article.sources)}</p>
        </div>

        {article.summary && (
          <p className="line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
            {article.summary}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => {
            const active = selected.has(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                onClick={() => toggleTopic(topic.id)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-xs ${
                  active
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                {topic.name}
              </button>
            );
          })}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleApprove}
            disabled={selected.size === 0 || isPending}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isPending}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      </div>
    </li>
  );
}

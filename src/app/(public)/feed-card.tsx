import Link from 'next/link';
import type { FeedArticle } from '@/lib/feed/queries';

// Deviation from plan: the plan places this at `src/app/(public)/feed-card.tsx`,
// but a route group buys nothing here (no shared layout/segment config differs
// from the rest of `src/app`), so it lives at `src/app/feed-card.tsx` instead.

const PLACEHOLDER_COLORS = [
  'bg-rose-200 dark:bg-rose-900',
  'bg-amber-200 dark:bg-amber-900',
  'bg-lime-200 dark:bg-lime-900',
  'bg-emerald-200 dark:bg-emerald-900',
  'bg-cyan-200 dark:bg-cyan-900',
  'bg-sky-200 dark:bg-sky-900',
  'bg-violet-200 dark:bg-violet-900',
  'bg-fuchsia-200 dark:bg-fuchsia-900',
];

/** Small stable string hash so the same topic slug always maps to the same color. */
function hashSlug(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function placeholderClass(article: FeedArticle): string {
  const slug = article.topics[0]?.slug ?? article.id;
  const index = hashSlug(slug) % PLACEHOLDER_COLORS.length;
  return PLACEHOLDER_COLORS[index];
}

function formatDate(published_at: string | null): string | null {
  if (!published_at) return null;
  const date = new Date(published_at);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function FeedCard({ article }: { article: FeedArticle }) {
  const date = formatDate(article.published_at);

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border">
      {article.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image_url}
          alt=""
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className={`h-40 w-full ${placeholderClass(article)}`} />
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs text-neutral-500">
          {article.source_name ?? 'Unknown source'}
          {date ? ` · ${date}` : ''}
        </p>

        <Link
          href={`/article/${article.id}`}
          className="line-clamp-2 font-semibold hover:underline"
        >
          {article.title}
        </Link>

        {article.summary && (
          <p className="line-clamp-3 text-sm text-neutral-600 dark:text-neutral-400">
            {article.summary}
          </p>
        )}

        {article.topics.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-2 pt-2">
            {article.topics.map((topic) => (
              <Link
                key={topic.slug}
                href={`/?topic=${topic.slug}`}
                className="rounded-full border px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                {topic.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

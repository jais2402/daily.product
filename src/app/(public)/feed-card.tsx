import Link from 'next/link';
import type { FeedArticle } from '@/lib/feed/queries';
import { ActionRow } from './action-row';

// Source glyph tile colors (design-handoff.md Design Tokens — "source colors").
const SOURCE_COLORS = [
  '#f6a723',
  '#8b7cf8',
  '#34d399',
  '#ff7a59',
  '#6ea8fe',
  '#e879f9',
  '#cbd5e1',
  '#f472b6',
];

/** Small stable string hash so the same string always maps to the same bucket. */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function sourceColor(sourceName: string | null): string {
  const key = sourceName ?? 'unknown';
  return SOURCE_COLORS[hashString(key) % SOURCE_COLORS.length];
}

/** Thumbnail gradient fallback per design-handoff.md §5 — two hues derived
 * from the article's first topic slug. */
function thumbnailGradient(article: FeedArticle): string {
  const slug = article.topics[0]?.slug ?? article.id;
  const h1 = hashString(slug) % 360;
  const h2 = (h1 + 40) % 360;
  return `linear-gradient(135deg, hsl(${h1} 62% 46%), hsl(${h2} 58% 26%))`;
}

function formatRelativeDate(published_at: string | null): string | null {
  if (!published_at) return null;
  const date = new Date(published_at);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** n = max(1, round(words(summary)/220)) — Global Constraints. */
function estimateReadMinutes(summary: string | null): number | null {
  if (!summary) return null;
  const words = summary.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return null;
  return Math.max(1, Math.round(words / 220));
}

interface FeedCardProps {
  article: FeedArticle;
  upvoteCount: number;
  upvoted: boolean;
  bookmarked: boolean;
  signedIn: boolean;
}

export function FeedCard({
  article,
  upvoteCount,
  upvoted,
  bookmarked,
  signedIn,
}: FeedCardProps) {
  const date = formatRelativeDate(article.published_at);
  const readMin = estimateReadMinutes(article.summary);
  const firstTopic = article.topics[0]?.name ?? null;
  const glyph = (article.source_name ?? '?').charAt(0).toUpperCase();
  const href = `/article/${article.id}`;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,transform] duration-150 hover:-translate-y-[3px] hover:border-acc">
      <Link
        href={href}
        className="relative flex h-[150px] items-end p-3"
        style={
          article.image_url
            ? undefined
            : { background: thumbnailGradient(article) }
        }
      >
        {article.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {firstTopic && (
          <span
            className="relative rounded-md px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-[11px]"
            style={{ backgroundColor: 'rgba(13,16,22,.6)' }}
          >
            {firstTopic}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-[9px] p-4">
        <div className="flex items-center gap-2">
          <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[6px] text-[11px] font-bold text-[#0d1016]"
            style={{ backgroundColor: sourceColor(article.source_name) }}
          >
            {glyph}
          </span>
          <span className="text-[12.5px] text-muted">
            {article.source_name ?? 'Unknown source'}
          </span>
          {date && (
            <span className="ml-auto text-[12px] text-faint">{date}</span>
          )}
        </div>

        <Link href={href}>
          <h3 className="line-clamp-2 font-display text-[16.5px] font-semibold leading-[1.32] text-text">
            {article.title}
          </h3>
        </Link>

        {article.summary && (
          <p className="line-clamp-3 flex-1 text-[12.8px] leading-normal text-muted">
            {article.summary}
          </p>
        )}

        <ActionRow
          articleId={article.id}
          upvoteCount={upvoteCount}
          upvoted={upvoted}
          bookmarked={bookmarked}
          signedIn={signedIn}
          readMin={readMin}
        />
      </div>
    </div>
  );
}

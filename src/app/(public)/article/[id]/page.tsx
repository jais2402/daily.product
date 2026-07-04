import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ArticleDetail {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  source_name: string | null;
  topics: { id: string; name: string; slug: string }[];
}

interface RawDetailRow {
  id: string;
  url: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  author: string | null;
  published_at: string | null;
  sources: { name: string } | { name: string }[] | null;
  article_topics:
    | { topics: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null }[]
    | null;
}

async function fetchArticle(id: string): Promise<ArticleDetail | null> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('articles')
    .select(
      'id,url,title,summary,image_url,author,published_at,sources(name),article_topics(topics(id,name,slug))',
    )
    .eq('status', 'approved')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as unknown as RawDetailRow;
  const source = Array.isArray(row.sources) ? row.sources[0] : row.sources;
  const topics = (row.article_topics ?? []).flatMap((entry) => {
    const t = entry.topics;
    if (!t) return [];
    return Array.isArray(t) ? t : [t];
  });

  return {
    id: row.id,
    url: row.url,
    title: row.title,
    summary: row.summary,
    image_url: row.image_url,
    author: row.author,
    published_at: row.published_at,
    source_name: source?.name ?? null,
    topics,
  };
}

function formatDate(published_at: string | null): string | null {
  if (!published_at) return null;
  const date = new Date(published_at);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const article = await fetchArticle(id);
  if (!article) notFound();

  const date = formatDate(article.published_at);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Back to feed
      </Link>

      {article.topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {article.topics.map((topic) => (
            <Link
              key={topic.id}
              href={`/?topic=${topic.slug}`}
              className="rounded-full border px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              {topic.name}
            </Link>
          ))}
        </div>
      )}

      <h1 className="text-3xl font-bold">{article.title}</h1>

      <p className="text-sm text-neutral-500">
        {article.source_name ?? 'Unknown source'}
        {article.author ? ` · ${article.author}` : ''}
        {date ? ` · ${date}` : ''}
      </p>

      {article.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image_url}
          alt=""
          className="w-full rounded-lg object-cover"
        />
      ) : (
        <div className="h-48 w-full rounded-lg bg-neutral-200 dark:bg-neutral-800" />
      )}

      {article.summary && (
        <p className="text-base text-neutral-700 dark:text-neutral-300">
          {article.summary}
        </p>
      )}

      <a
        href={article.url}
        target="_blank"
        rel="noreferrer"
        className="inline-block w-fit rounded-lg bg-neutral-900 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900"
      >
        Read the full article ↗
      </a>

      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Back to feed
      </Link>
    </main>
  );
}

import Parser from 'rss-parser';
import { canonicalizeUrl } from './canonical';

export type FeedItem = {
  url: string;
  title: string;
  excerpt: string | null;
  imageUrl: string | null;
  author: string | null;
  publishedAt: string | null;
};

type CustomItem = {
  media?: { $?: { url?: string } };
  'media:content'?: { $?: { url?: string } };
  author?: string;
};

const parser = new Parser<Record<string, never>, CustomItem>({
  customFields: { item: [['media:content', 'media']] },
});

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const EXCERPT_MAX = 300;

export async function parseFeed(xml: string): Promise<FeedItem[]> {
  const feed = await parser.parseString(xml);
  const items: FeedItem[] = [];
  for (const item of feed.items ?? []) {
    const url = item.link ? canonicalizeUrl(item.link) : null;
    if (!url || !item.title) continue;

    const rawExcerpt = item.contentSnippet || item.content || item.summary || '';
    const excerpt = rawExcerpt ? stripHtml(rawExcerpt).slice(0, EXCERPT_MAX) : null;

    const media = item.media?.$?.url ?? null;
    const enclosure = item.enclosure?.url ?? null;

    let publishedAt: string | null = null;
    if (item.isoDate) publishedAt = item.isoDate;
    else if (item.pubDate) {
      const d = new Date(item.pubDate);
      publishedAt = isNaN(d.getTime()) ? null : d.toISOString();
    }

    items.push({
      url,
      title: item.title.trim(),
      excerpt: excerpt || null,
      imageUrl: media || enclosure,
      author: (item.creator || item.author)?.trim() || null,
      publishedAt,
    });
  }
  return items;
}

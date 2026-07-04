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

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  ldquo: '“',
  rdquo: '”',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+[0-9]*);/g, (match, entity: string) => {
    if (entity[0] === '#') {
      const codePoint =
        entity[1] === 'x' || entity[1] === 'X'
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      if (Number.isNaN(codePoint)) return match;
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[entity] ?? match;
  });
}

function toPlainText(html: string): string {
  return decodeEntities(
    decodeEntities(html)
      .replace(/<[^>]*>/g, '')
  )
    .replace(/\s+/g, ' ')
    .trim();
}

const EXCERPT_MAX = 300;

// WHATWG `new URL(x, base)` happily resolves any garbage string `x` into a
// plausible-looking URL under `base` (e.g. `new URL('not-a-url', 'https://x.com')`
// => `https://x.com/not-a-url`). That would turn malformed `<link>` values into
// fake article URLs instead of dropping them. So we only attempt base-relative
// resolution when the link is actually path-like (starts with /, ./, ../, ?, or #
// after trimming) — anything else must already be an absolute URL, otherwise it's
// dropped. This is a deliberate conservative trade-off: bare-word relative links
// like `posts/x` (rare in real feeds) get dropped rather than risk junk articles.
const PATH_LIKE = /^(\.{0,2}\/|\?|#)/;

function resolveItemUrl(link: string, base: string | null): string | null {
  const trimmed = link.trim();
  if (!base || !PATH_LIKE.test(trimmed)) return canonicalizeUrl(trimmed);
  try {
    const resolved = new URL(trimmed, base);
    return canonicalizeUrl(resolved.toString());
  } catch {
    return null;
  }
}

export async function parseFeed(xml: string, baseUrl?: string): Promise<FeedItem[]> {
  const feed = await parser.parseString(xml);
  const items: FeedItem[] = [];

  const channelLink = feed.link ? feed.link.trim() : null;
  const channelLinkIsAbsolute = channelLink !== null && canonicalizeUrl(channelLink) !== null;
  const base = channelLinkIsAbsolute ? channelLink : baseUrl ?? null;

  for (const item of feed.items ?? []) {
    const url = item.link ? resolveItemUrl(item.link, base) : null;
    if (!url || !item.title) continue;

    const rawExcerpt = item.contentSnippet || item.content || item.summary || '';
    const excerpt = rawExcerpt ? toPlainText(rawExcerpt).slice(0, EXCERPT_MAX) : null;

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

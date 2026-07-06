import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseFeed } from './feed';

const rss = readFileSync(join(__dirname, 'fixtures/sample-rss.xml'), 'utf8');
const atom = readFileSync(join(__dirname, 'fixtures/sample-atom.xml'), 'utf8');
const rssRelativeLink = readFileSync(
  join(__dirname, 'fixtures/sample-rss-relative-link.xml'),
  'utf8'
);
const rssNoChannelLink = readFileSync(
  join(__dirname, 'fixtures/sample-rss-no-channel-link.xml'),
  'utf8'
);
const rssBrokenLinks = readFileSync(
  join(__dirname, 'fixtures/sample-rss-broken-links.xml'),
  'utf8'
);

describe('parseFeed', () => {
  it('parses RSS items with canonical urls and plain-text excerpts', async () => {
    const items = await parseFeed(rss);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      url: 'https://pmblog.com/prioritize',
      title: 'How to prioritize',
      excerpt: 'A framework for prioritizing features.',
      imageUrl: 'https://pmblog.com/img/prio.png',
      author: 'Jane Doe',
      publishedAt: '2026-07-01T10:00:00.000Z',
    });
  });
  it('parses Atom feeds', async () => {
    const items = await parseFeed(atom);
    expect(items).toHaveLength(2);
    expect(items[0].url).toBe('https://designweekly.io/tokens');
    expect(items[0].author).toBe('Sam Lee');
  });
  it('rejects invalid XML', async () => {
    await expect(parseFeed('<not-xml')).rejects.toThrow();
  });

  it('decodes HTML entities (including double-escaped) in excerpts', async () => {
    const items = await parseFeed(atom);
    const cartoonItem = items.find((i) => i.url === 'https://designweekly.io/cartoons');
    expect(cartoonItem).toBeDefined();
    expect(cartoonItem?.excerpt).toBe('Tom & Jerry');
  });

  it('resolves a relative item link against the channel-level link', async () => {
    const items = await parseFeed(rssRelativeLink);
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://pmblog.com/posts/relative-link');
  });

  it('resolves a relative item link against a provided baseUrl when no channel link exists', async () => {
    const items = await parseFeed(rssNoChannelLink, 'https://base.example.com/feed.xml');
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe('https://base.example.com/posts/no-channel-link');
  });

  it('drops garbage links even when a base is available', async () => {
    const items = await parseFeed(rssBrokenLinks, 'https://pmblog.com/rss');
    const urls = items.map((i) => i.url);
    expect(urls).toContain('https://pmblog.com/posts/good-absolute');
    expect(urls).toContain('https://pmblog.com/posts/good-relative');
    expect(urls).not.toContain('https://pmblog.com/not-a-url');
    expect(urls).not.toContain('https://pmblog.com/rss/not-a-url');
  });

  it('drops garbage links without a base (original behavior)', async () => {
    const noBaseFixture = rssBrokenLinks.replace(/<link>https:\/\/pmblog\.com<\/link>/, '');
    const items = await parseFeed(noBaseFixture);
    const urls = items.map((i) => i.url);
    expect(urls).toContain('https://pmblog.com/posts/good-absolute');
    expect(urls).not.toEqual(expect.arrayContaining([expect.stringContaining('not-a-url')]));
  });
});

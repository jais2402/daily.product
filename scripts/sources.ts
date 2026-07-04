/**
 * Starter sources list for initial database seeding.
 * This list is idempotent via upsert on feed_url.
 */

export const STARTER_SOURCES = [
  { name: "Lenny's Newsletter", site_url: 'https://www.lennysnewsletter.com', feed_url: 'https://www.lennysnewsletter.com/feed' },
  { name: 'Mind the Product', site_url: 'https://www.mindtheproduct.com', feed_url: 'https://www.mindtheproduct.com/feed/' },
  { name: 'Product Talk (Teresa Torres)', site_url: 'https://www.producttalk.org', feed_url: 'https://www.producttalk.org/feed/' },
  { name: 'SVPG (Marty Cagan)', site_url: 'https://www.svpg.com', feed_url: 'https://www.svpg.com/articles/rss' },
  { name: 'Nielsen Norman Group', site_url: 'https://www.nngroup.com', feed_url: 'https://www.nngroup.com/feed/rss/' },
  { name: 'Smashing Magazine', site_url: 'https://www.smashingmagazine.com', feed_url: 'https://www.smashingmagazine.com/feed/' },
  { name: 'UX Collective', site_url: 'https://uxdesign.cc', feed_url: 'https://uxdesign.cc/feed' },
  { name: 'Andrew Chen', site_url: 'https://andrewchen.com', feed_url: 'https://andrewchen.com/feed/' },
  { name: 'Reforge Blog', site_url: 'https://www.reforge.com/blog', feed_url: 'https://www.reforge.com/blog/rss.xml' },
  { name: 'First Round Review', site_url: 'https://review.firstround.com', feed_url: 'https://review.firstround.com/rss.xml' },
];

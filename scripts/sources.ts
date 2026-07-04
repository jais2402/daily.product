/**
 * Starter sources list for initial database seeding.
 * Confirmed by Jayasuriya on 2026-07-04 — 30 feeds across product management,
 * product & startups, economics, finance, technology, and AI. Each feed URL
 * was verified live at list-generation time.
 * This list is idempotent via upsert on feed_url.
 */

export const STARTER_SOURCES = [
  // Product Management
  { name: "Lenny's Newsletter", site_url: 'https://www.lennysnewsletter.com', feed_url: 'https://www.lennysnewsletter.com/feed' },
  { name: 'Silicon Valley Product Group (SVPG)', site_url: 'https://www.svpg.com', feed_url: 'https://www.svpg.com/feed/' },
  { name: 'Mind the Product', site_url: 'https://www.mindtheproduct.com', feed_url: 'https://www.mindtheproduct.com/feed/' },
  { name: 'Product Talk', site_url: 'https://www.producttalk.org', feed_url: 'https://www.producttalk.org/feed/' },
  { name: 'Roman Pichler', site_url: 'https://www.romanpichler.com/blog', feed_url: 'https://www.romanpichler.com/blog/feed/' },
  // Product & Startups
  { name: 'Andrew Chen', site_url: 'https://andrewchen.com', feed_url: 'https://andrewchen.com/feed/' },
  { name: 'Andreessen Horowitz (a16z)', site_url: 'https://a16z.com', feed_url: 'https://a16z.com/feed/' },
  { name: 'First Round Review', site_url: 'https://review.firstround.com', feed_url: 'https://review.firstround.com/feed.xml' },
  { name: 'Stratechery', site_url: 'https://stratechery.com', feed_url: 'https://stratechery.com/feed/' },
  { name: 'The Pragmatic Engineer', site_url: 'https://newsletter.pragmaticengineer.com', feed_url: 'https://newsletter.pragmaticengineer.com/feed' },
  // Economics
  { name: 'Marginal Revolution', site_url: 'https://marginalrevolution.com', feed_url: 'https://marginalrevolution.com/feed' },
  { name: 'EconLog (Econlib)', site_url: 'https://www.econlib.org', feed_url: 'https://www.econlib.org/feed/' },
  { name: 'Noahpinion', site_url: 'https://www.noahpinion.blog', feed_url: 'https://www.noahpinion.blog/feed' },
  { name: 'The Grumpy Economist', site_url: 'https://johnhcochrane.blogspot.com', feed_url: 'https://johnhcochrane.blogspot.com/feeds/posts/default' },
  { name: 'Cafe Hayek', site_url: 'https://cafehayek.com', feed_url: 'https://cafehayek.com/feed' },
  // Finance
  { name: 'A Wealth of Common Sense', site_url: 'https://awealthofcommonsense.com', feed_url: 'https://awealthofcommonsense.com/feed/' },
  { name: 'Musings on Markets', site_url: 'https://aswathdamodaran.blogspot.com', feed_url: 'https://aswathdamodaran.blogspot.com/feeds/posts/default' },
  { name: 'Calculated Risk', site_url: 'https://www.calculatedriskblog.com', feed_url: 'https://www.calculatedriskblog.com/feeds/posts/default' },
  { name: 'The Big Picture', site_url: 'https://ritholtz.com', feed_url: 'https://ritholtz.com/feed/' },
  { name: 'Of Dollars And Data', site_url: 'https://ofdollarsanddata.com', feed_url: 'https://ofdollarsanddata.com/feed/' },
  // Technology
  { name: 'Daring Fireball', site_url: 'https://daringfireball.net', feed_url: 'https://daringfireball.net/feeds/main' },
  { name: 'TechCrunch', site_url: 'https://techcrunch.com', feed_url: 'https://techcrunch.com/feed/' },
  { name: 'Hacker News (Front Page)', site_url: 'https://news.ycombinator.com', feed_url: 'https://hnrss.org/frontpage' },
  { name: 'MIT Technology Review', site_url: 'https://www.technologyreview.com', feed_url: 'https://www.technologyreview.com/feed/' },
  { name: 'Platformer', site_url: 'https://www.platformer.news', feed_url: 'https://www.platformer.news/feed' },
  // AI
  { name: 'Import AI', site_url: 'https://importai.substack.com', feed_url: 'https://importai.substack.com/feed' },
  { name: 'The Gradient', site_url: 'https://thegradient.pub', feed_url: 'https://thegradient.pub/rss/' },
  { name: 'Ahead of AI', site_url: 'https://magazine.sebastianraschka.com', feed_url: 'https://magazine.sebastianraschka.com/feed' },
  { name: "Simon Willison's Weblog", site_url: 'https://simonwillison.net', feed_url: 'https://simonwillison.net/atom/everything/' },
  { name: 'One Useful Thing', site_url: 'https://www.oneusefulthing.org', feed_url: 'https://www.oneusefulthing.org/feed' },
];

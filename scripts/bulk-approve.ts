/**
 * Bulk-approve pending articles, auto-tagged by their source's category.
 * Mapping follows Jayasuriya's confirmed source list (2026-07-04).
 * Run: node --env-file=.env.local node_modules/.bin/tsx scripts/bulk-approve.ts
 * Idempotent: only touches status='pending'; topic links upsert.
 */
import { createClient } from '@supabase/supabase-js';

const SOURCE_TOPIC: Record<string, string> = {
  // Product Management
  "Lenny's Newsletter": 'product-management',
  'Silicon Valley Product Group (SVPG)': 'product-management',
  'Mind the Product': 'product-management',
  'Product Talk': 'product-management',
  'Roman Pichler': 'product-management',
  // Product & Startups
  'Andrew Chen': 'startups-founding',
  'Andreessen Horowitz (a16z)': 'startups-founding',
  'First Round Review': 'startups-founding',
  Stratechery: 'startups-founding',
  'The Pragmatic Engineer': 'startups-founding',
  // Economics
  'Marginal Revolution': 'economics',
  'EconLog (Econlib)': 'economics',
  Noahpinion: 'economics',
  'The Grumpy Economist': 'economics',
  'Cafe Hayek': 'economics',
  // Finance
  'A Wealth of Common Sense': 'finance',
  'Musings on Markets': 'finance',
  'Calculated Risk': 'finance',
  'The Big Picture': 'finance',
  'Of Dollars And Data': 'finance',
  // Technology
  'Daring Fireball': 'technology',
  TechCrunch: 'technology',
  'Hacker News (Front Page)': 'technology',
  'MIT Technology Review': 'technology',
  Platformer: 'technology',
  // AI
  'Import AI': 'ai',
  'The Gradient': 'ai',
  'Ahead of AI': 'ai',
  "Simon Willison's Weblog": 'ai',
  'One Useful Thing': 'ai',
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data: topics, error: topicsError } = await db.from('topics').select('id,slug');
  if (topicsError) throw new Error(topicsError.message);
  const topicBySlug = new Map((topics ?? []).map((t) => [t.slug, t.id]));

  const { data: sources, error: sourcesError } = await db.from('sources').select('id,name');
  if (sourcesError) throw new Error(sourcesError.message);

  let approved = 0;
  for (const source of sources ?? []) {
    const slug = SOURCE_TOPIC[source.name];
    const topicId = slug ? topicBySlug.get(slug) : undefined;
    if (!topicId) {
      console.warn(`skip (no mapping): ${source.name}`);
      continue;
    }

    const { data: pending, error: pendingError } = await db
      .from('articles')
      .select('id')
      .eq('source_id', source.id)
      .eq('status', 'pending');
    if (pendingError) throw new Error(pendingError.message);
    if (!pending || pending.length === 0) continue;

    const { error: tagError } = await db
      .from('article_topics')
      .upsert(pending.map((a) => ({ article_id: a.id, topic_id: topicId })));
    if (tagError) throw new Error(`tagging ${source.name}: ${tagError.message}`);

    const { error: approveError } = await db
      .from('articles')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('source_id', source.id)
      .eq('status', 'pending');
    if (approveError) throw new Error(`approving ${source.name}: ${approveError.message}`);

    approved += pending.length;
    console.log(`approved ${String(pending.length).padStart(3)} · ${source.name} → ${slug}`);
  }
  console.log(`\nTotal approved: ${approved}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

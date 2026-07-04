create type source_status as enum ('active','paused');
create type article_status as enum ('pending','approved','rejected');
create type suggestion_status as enum ('pending','accepted','rejected');

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_admin from profiles p where p.id = auth.uid()), false)
$$;

create table sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  site_url text not null,
  feed_url text not null unique,
  status source_status not null default 'active',
  last_fetched_at timestamptz,
  last_error text,
  consecutive_failures int not null default 0,
  created_at timestamptz not null default now()
);

create table source_suggestions (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  note text,
  suggested_by uuid references profiles(id) on delete set null,
  status suggestion_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete set null,
  url text not null unique,
  title text not null,
  summary text,
  image_url text,
  author text,
  published_at timestamptz,
  status article_status not null default 'pending',
  approved_at timestamptz,
  upvote_count int not null default 0,
  created_at timestamptz not null default now()
);
create index articles_status_published_idx on articles (status, published_at desc);

create table article_topics (
  article_id uuid not null references articles(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (article_id, topic_id)
);

alter table sources enable row level security;
alter table source_suggestions enable row level security;
alter table articles enable row level security;
alter table article_topics enable row level security;

create policy "admin reads sources" on sources
  for select to authenticated using (is_admin());
create policy "admin writes sources" on sources
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "suggest a source" on source_suggestions
  for insert to authenticated with check (auth.uid() = suggested_by);
create policy "own or admin reads suggestions" on source_suggestions
  for select to authenticated using (auth.uid() = suggested_by or is_admin());
create policy "admin updates suggestions" on source_suggestions
  for update to authenticated using (is_admin()) with check (is_admin());

create policy "approved articles public" on articles
  for select to anon, authenticated using (status = 'approved' or is_admin());
create policy "admin writes articles" on articles
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "article topics public" on article_topics
  for select to anon, authenticated using (true);
create policy "admin writes article topics" on article_topics
  for all to authenticated using (is_admin()) with check (is_admin());

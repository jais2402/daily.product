create type member_role as enum
  ('pm','apm','designer','marketer','founder','developer','other');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_seed text not null default '',
  role member_role,
  is_admin boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);

create table topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table profile_topics (
  profile_id uuid not null references profiles(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  primary key (profile_id, topic_id)
);

create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

alter table profiles enable row level security;
alter table topics enable row level security;
alter table profile_topics enable row level security;

create policy "profiles readable by authed" on profiles
  for select to authenticated using (true);
create policy "own profile update" on profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create policy "topics readable by all" on topics
  for select to anon, authenticated using (true);

create policy "own topic links read" on profile_topics
  for select to authenticated using (auth.uid() = profile_id);
create policy "own topic links insert" on profile_topics
  for insert to authenticated with check (auth.uid() = profile_id);
create policy "own topic links delete" on profile_topics
  for delete to authenticated using (auth.uid() = profile_id);

insert into topics (name, slug) values
  ('Product Management','product-management'),
  ('Product Design','product-design'),
  ('Growth','growth'),
  ('Product Strategy','product-strategy'),
  ('User Research','user-research'),
  ('Analytics & Data','analytics-data'),
  ('AI','ai'),
  ('Technology','technology'),
  ('Economics','economics'),
  ('Finance','finance'),
  ('Leadership','leadership'),
  ('Startups & Founding','startups-founding'),
  ('Career','career');

create type squad_role as enum ('owner','member');

create table squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  invite_code text not null unique,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table squad_members (
  squad_id uuid not null references squads(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role squad_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);

create table squad_shares (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid not null references squads(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  shared_by uuid not null references profiles(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create or replace function is_squad_member(squad uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from squad_members sm
    where sm.squad_id = squad and sm.user_id = auth.uid()
  )
$$;

alter table squads enable row level security;
alter table squad_members enable row level security;
alter table squad_shares enable row level security;

create policy "members read squads" on squads
  for select to authenticated using (is_squad_member(id));
create policy "create squad" on squads
  for insert to authenticated with check (auth.uid() = created_by);
create policy "owner updates squad" on squads
  for update to authenticated
  using (exists (select 1 from squad_members sm
    where sm.squad_id = id and sm.user_id = auth.uid() and sm.role = 'owner'));

create policy "members read membership" on squad_members
  for select to authenticated using (is_squad_member(squad_id));
create policy "join or add self" on squad_members
  for insert to authenticated with check (auth.uid() = user_id);
create policy "leave squad" on squad_members
  for delete to authenticated using (auth.uid() = user_id);

create policy "members read shares" on squad_shares
  for select to authenticated using (is_squad_member(squad_id));
create policy "members share" on squad_shares
  for insert to authenticated
  with check (auth.uid() = shared_by and is_squad_member(squad_id));
create policy "sharer deletes share" on squad_shares
  for delete to authenticated using (auth.uid() = shared_by);

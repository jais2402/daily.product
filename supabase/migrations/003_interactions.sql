create table bookmarks (
  user_id uuid not null references profiles(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table upvotes (
  user_id uuid not null references profiles(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id)
);

create table reads (
  user_id uuid not null references profiles(id) on delete cascade,
  article_id uuid not null references articles(id) on delete cascade,
  read_date date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (user_id, article_id, read_date)
);
create index reads_user_date_idx on reads (user_id, read_date);

create or replace function bump_upvote_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update articles set upvote_count = upvote_count + 1 where id = new.article_id;
    return new;
  elsif tg_op = 'DELETE' then
    update articles set upvote_count = greatest(upvote_count - 1, 0) where id = old.article_id;
    return old;
  end if;
  return null;
end $$;

create trigger on_upvote_change
  after insert or delete on upvotes
  for each row execute function bump_upvote_count();

alter table bookmarks enable row level security;
alter table upvotes enable row level security;
alter table reads enable row level security;

create policy "own bookmarks" on bookmarks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own upvotes" on upvotes
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own reads" on reads
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

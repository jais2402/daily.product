-- Members-only pivot (owner decision 2026-07-19): content requires sign-in.
-- Anonymous reads of articles/topics/sources are no longer permitted; the UI
-- gate (src/app/(public)/layout.tsx) already redirects signed-out visitors to
-- /login, so this is defense-in-depth at the data layer.
drop policy "approved articles public" on articles;
create policy "approved articles for members" on articles
  for select to authenticated using (status = 'approved' or is_admin());

drop policy "article topics public" on article_topics;
create policy "article topics for members" on article_topics
  for select to authenticated using (true);

drop policy "sources readable by all" on sources;
create policy "sources readable by members" on sources
  for select to authenticated using (true);

drop policy "topics readable by all" on topics;
create policy "topics readable by members" on topics
  for select to authenticated using (true);

-- The public feed embeds sources(name) on approved articles and lists top
-- sources in the rail; migration 002 made sources admin-only, which nulls the
-- embed for anon readers ("Unknown source"). Sources are public-facing
-- editorial metadata, so open read access. (Health fields like last_error are
-- technically exposed too — acceptable for MVP; revisit with a public view if
-- that ever matters.)
create policy "sources readable by all" on sources
  for select to anon, authenticated using (true);

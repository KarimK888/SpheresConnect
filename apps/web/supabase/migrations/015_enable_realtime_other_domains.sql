do $$
declare
  tbl text;
begin
  FOREACH tbl IN ARRAY ARRAY['orders', 'order_milestones', 'payouts']::text[] LOOP
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table %I.%I;', 'public', tbl);
    end if;
  end loop;

  FOREACH tbl IN ARRAY ARRAY['chats', 'messages', 'message_reactions', 'message_reads']::text[] LOOP
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table %I.%I;', 'public', tbl);
    end if;
  end loop;

  FOREACH tbl IN ARRAY ARRAY['notifications']::text[] LOOP
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table %I.%I;', 'public', tbl);
    end if;
  end loop;

  FOREACH tbl IN ARRAY ARRAY['hubs', 'events']::text[] LOOP
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table %I.%I;', 'public', tbl);
    end if;
  end loop;

  FOREACH tbl IN ARRAY ARRAY['support_tickets']::text[] LOOP
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table %I.%I;', 'public', tbl);
    end if;
  end loop;
end
$$;

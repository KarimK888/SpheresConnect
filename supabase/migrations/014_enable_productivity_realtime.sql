do $$
declare
  tbl text;
begin
  FOREACH tbl IN ARRAY ARRAY[
    'productivity_boards',
    'productivity_columns',
    'productivity_cards',
    'productivity_todos',
    'productivity_events',
    'productivity_comments'
  ]::text[] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('alter publication supabase_realtime add table %I.%I;', 'public', tbl);
    END IF;
  END LOOP;
end
$$;

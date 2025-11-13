do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read access for artwork media'
  ) then
    create policy "Public read access for artwork media"
      on storage.objects for select
      using (bucket_id = 'artwork-media');
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated upload artwork media'
  ) then
    create policy "Authenticated upload artwork media"
      on storage.objects for insert
      with check (
        bucket_id = 'artwork-media'
        and auth.role() in ('authenticated','service_role')
      );
  end if;
end
$$;

-- repeat the same pattern for the update/delete policies

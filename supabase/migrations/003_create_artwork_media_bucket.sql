insert into storage.buckets (id, name, public)
values ('artwork-media', 'artwork-media', true)
on conflict (id) do nothing;

create policy if not exists "Public read access for artwork media"
on storage.objects for select
using (bucket_id = 'artwork-media');

create policy if not exists "Authenticated upload artwork media"
on storage.objects for insert
with check (
  bucket_id = 'artwork-media'
  and auth.role() in ('authenticated', 'service_role')
);

create policy if not exists "Authenticated update artwork media"
on storage.objects for update
using (
  bucket_id = 'artwork-media'
  and auth.role() in ('authenticated', 'service_role')
)
with check (
  bucket_id = 'artwork-media'
  and auth.role() in ('authenticated', 'service_role')
);

create policy if not exists "Authenticated delete artwork media"
on storage.objects for delete
using (
  bucket_id = 'artwork-media'
  and auth.role() in ('authenticated', 'service_role')
);

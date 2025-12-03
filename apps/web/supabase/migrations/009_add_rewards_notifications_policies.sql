-- Allow users to insert their own reward logs (and service role bypasses RLS).
drop policy if exists rewards_insert_self on public.rewards;
create policy rewards_insert_self
  on public.rewards
  for insert
  with check (auth.uid() = user_id);

-- Notifications: allow inserts for service role and for the target user.
drop policy if exists notifications_insert_service on public.notifications;
create policy notifications_insert_service
  on public.notifications
  for insert
  with check (auth.role() = 'service_role');

drop policy if exists notifications_insert_self on public.notifications;
create policy notifications_insert_self
  on public.notifications
  for insert
  with check (auth.uid() = user_id);

-- Notifications: allow users to select their own notifications.
drop policy if exists notifications_select_self on public.notifications;
create policy notifications_select_self
  on public.notifications
  for select
  using (auth.uid() = user_id);

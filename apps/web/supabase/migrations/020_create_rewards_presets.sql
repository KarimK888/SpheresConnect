create table if not exists rewards_presets (
  action text primary key,
  points integer not null default 0,
  updated_at timestamp with time zone default now()
);

insert into rewards_presets (action, points)
values
  ('onboarding', 120),
  ('checkin', 40),
  ('match', 85),
  ('sale', 200),
  ('rsvp', 60)
on conflict (action) do update set points = excluded.points;

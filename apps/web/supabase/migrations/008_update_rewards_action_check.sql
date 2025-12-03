alter table if exists public.rewards
  drop constraint if exists rewards_action_check;

alter table if exists public.rewards
  add constraint rewards_action_check
    check (action in ('onboarding', 'checkin', 'match', 'sale', 'rsvp', 'bonus', 'redeem', 'transfer'));

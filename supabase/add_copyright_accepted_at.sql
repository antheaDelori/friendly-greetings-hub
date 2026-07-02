alter table public.profiles
  add column if not exists copyright_accepted_at timestamptz;

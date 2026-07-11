-- Collega le visite a chi le fa (autore / lettore / esploratore) e traccia i download
-- per poterli dividere per ruolo in /statistiche (solo admin).

alter table public.page_views
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create table if not exists public.downloads_log (
  id          bigserial primary key,
  book_id     uuid not null references public.books(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.downloads_log enable row level security;

create policy "chiunque registra un download"
  on public.downloads_log for insert
  with check (true);

create policy "solo admin legge i download"
  on public.downloads_log for select
  using (auth.jwt() ->> 'email' = 'antheadelori@live.it');

create or replace function public.increment_downloads(p_book_id uuid)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update books set downloads = downloads + 1 where id = p_book_id;
  insert into downloads_log (book_id, user_id) values (p_book_id, auth.uid());
$$;

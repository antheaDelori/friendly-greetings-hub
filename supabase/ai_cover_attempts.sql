-- Traccia le generazioni AI di copertine per libro
create table if not exists public.ai_cover_attempts (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  image_url   text not null,
  accepted    boolean not null default false,
  prompt      text,
  created_at  timestamptz not null default now()
);

alter table public.ai_cover_attempts enable row level security;

create policy "autore vede solo i propri tentativi"
  on public.ai_cover_attempts for select
  using (author_id = auth.uid());

create policy "autore inserisce"
  on public.ai_cover_attempts for insert
  with check (author_id = auth.uid());

create policy "autore aggiorna accepted"
  on public.ai_cover_attempts for update
  using (author_id = auth.uid());

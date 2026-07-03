-- Traccia le visite di pagina per il pannello traffico in /statistiche (solo admin)
create table if not exists public.page_views (
  id          uuid primary key default gen_random_uuid(),
  path        text not null,
  referrer    text,
  country     text,
  device      text,
  created_at  timestamptz not null default now()
);

alter table public.page_views enable row level security;

create policy "chiunque registra una visita"
  on public.page_views for insert
  with check (true);

create policy "solo admin legge il traffico"
  on public.page_views for select
  using (auth.jwt() ->> 'email' = 'antheadelori@live.it');

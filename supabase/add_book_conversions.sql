-- Traccia le conversioni automatiche da .docx (pdf / epub) per opera
CREATE TABLE IF NOT EXISTS public.book_conversions (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade,
  format      text not null check (format in ('pdf', 'epub')),
  file_path   text not null,
  created_at  timestamptz not null default now()
);

ALTER TABLE public.book_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autore vede solo le proprie conversioni"
  ON public.book_conversions FOR SELECT
  USING (author_id = auth.uid());

CREATE POLICY "autore inserisce conversione"
  ON public.book_conversions FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- Liste di Distribuzione (DL): gruppi di lettori creati "a monte" da un
-- autore, riusabili per (a) accesso in lettura a opere riservate/premium
-- e (b) invio di comunicazioni/newsletter. Indipendenti da author_followers
-- (pool "chi mi segue") e da book_access_list (whitelist manuale per libro),
-- che restano invariate.

CREATE TABLE IF NOT EXISTS public.distribution_lists (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references auth.users(id) on delete cascade,
  nome        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (author_id, nome)
);
ALTER TABLE public.distribution_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autore vede solo le proprie liste di distribuzione" ON public.distribution_lists FOR SELECT USING (author_id = auth.uid());
CREATE POLICY "autore crea proprie liste di distribuzione" ON public.distribution_lists FOR INSERT WITH CHECK (author_id = auth.uid());
CREATE POLICY "autore rinomina proprie liste di distribuzione" ON public.distribution_lists FOR UPDATE USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "autore elimina proprie liste di distribuzione" ON public.distribution_lists FOR DELETE USING (author_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.distribution_list_members (
  id          uuid primary key default gen_random_uuid(),
  list_id     uuid not null references public.distribution_lists(id) on delete cascade,
  email       text not null,
  nome        text,
  created_at  timestamptz not null default now(),
  unique (list_id, email)
);
ALTER TABLE public.distribution_list_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autore vede i membri delle proprie liste" ON public.distribution_list_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.distribution_lists dl WHERE dl.id = distribution_list_members.list_id AND dl.author_id = auth.uid()));
CREATE POLICY "autore aggiunge membri alle proprie liste" ON public.distribution_list_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.distribution_lists dl WHERE dl.id = distribution_list_members.list_id AND dl.author_id = auth.uid()));
CREATE POLICY "autore rimuove membri dalle proprie liste" ON public.distribution_list_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.distribution_lists dl WHERE dl.id = distribution_list_members.list_id AND dl.author_id = auth.uid()));

-- Collegamento DL -> libro: quali DL danno accesso in lettura a un'opera
CREATE TABLE IF NOT EXISTS public.book_distribution_lists (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  list_id     uuid not null references public.distribution_lists(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (book_id, list_id)
);
ALTER TABLE public.book_distribution_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autore vede i collegamenti DL delle proprie opere" ON public.book_distribution_lists FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_distribution_lists.book_id AND b.author_id = auth.uid()));
CREATE POLICY "autore collega una propria DL a una propria opera" ON public.book_distribution_lists FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_distribution_lists.book_id AND b.author_id = auth.uid())
    AND EXISTS (SELECT 1 FROM public.distribution_lists dl WHERE dl.id = book_distribution_lists.list_id AND dl.author_id = auth.uid())
  );
CREATE POLICY "autore scollega una DL da una propria opera" ON public.book_distribution_lists FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_distribution_lists.book_id AND b.author_id = auth.uid()));

-- Esclusione per libro di un singolo membro DL: la DL resta intatta
-- globalmente, l'esclusione è un'eccezione locale a quel libro. Chiave su
-- (book_id, email) e non (book_id, list_id, email): se la stessa email è
-- raggiunta da più DL collegate allo stesso libro, escluderla vale per il
-- libro intero a prescindere dalla DL di provenienza.
CREATE TABLE IF NOT EXISTS public.book_distribution_list_exclusions (
  id          uuid primary key default gen_random_uuid(),
  book_id     uuid not null references public.books(id) on delete cascade,
  list_id     uuid references public.distribution_lists(id) on delete set null,
  email       text not null,
  created_at  timestamptz not null default now(),
  unique (book_id, email)
);
ALTER TABLE public.book_distribution_list_exclusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "autore vede le esclusioni delle proprie opere" ON public.book_distribution_list_exclusions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_distribution_list_exclusions.book_id AND b.author_id = auth.uid()));
CREATE POLICY "autore esclude un membro dalla propria opera" ON public.book_distribution_list_exclusions FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_distribution_list_exclusions.book_id AND b.author_id = auth.uid()));
CREATE POLICY "autore rimuove un'esclusione dalla propria opera" ON public.book_distribution_list_exclusions FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.books b WHERE b.id = book_distribution_list_exclusions.book_id AND b.author_id = auth.uid()));

-- Funzione per il gate di accesso in lettura (leggi.$slug.tsx): il lettore
-- che verifica il proprio accesso non è l'autore, quindi le RLS sopra
-- ("solo l'autore") gli negherebbero la lettura diretta delle tabelle DL.
-- SECURITY DEFINER espone solo un booleano, non i dati delle liste — stesso
-- pattern già usato in fix_increment_reads_downloads_security_definer.sql.
CREATE OR REPLACE FUNCTION public.reader_has_dl_access(p_book_id uuid, p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.book_distribution_lists bdl
    JOIN public.distribution_list_members dlm ON dlm.list_id = bdl.list_id
    WHERE bdl.book_id = p_book_id
      AND lower(dlm.email) = lower(p_email)
      AND NOT EXISTS (
        SELECT 1 FROM public.book_distribution_list_exclusions ex
        WHERE ex.book_id = p_book_id AND lower(ex.email) = lower(p_email)
      )
  );
$function$;

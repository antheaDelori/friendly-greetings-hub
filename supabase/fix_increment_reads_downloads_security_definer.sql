-- Le funzioni increment_reads/increment_downloads devono poter aggiornare
-- il libro di QUALSIASI autore quando le legge un lettore qualunque, ma le
-- policy RLS su "books" permettono UPDATE solo all'autore proprietario.
-- Senza SECURITY DEFINER la funzione gira con i permessi di chi la chiama
-- (il lettore), quindi l'update veniva sempre bloccato in silenzio per
-- tutti tranne l'autore stesso.
create or replace function public.increment_reads(p_book_id uuid)
returns void
language sql
security definer
set search_path = public
as $function$
  update books set letture = letture + 1 where id = p_book_id;
$function$;

create or replace function public.increment_downloads(p_book_id uuid)
returns void
language sql
security definer
set search_path = public
as $function$
  update books set downloads = downloads + 1 where id = p_book_id;
$function$;

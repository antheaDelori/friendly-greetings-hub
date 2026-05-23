-- Aggiunge colonna docx_url alla tabella books per il manoscritto sorgente
ALTER TABLE public.books ADD COLUMN IF NOT EXISTS docx_url text;

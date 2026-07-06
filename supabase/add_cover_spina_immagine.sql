-- Estende la scelta testo/immagine (vedi add_cover_stampa_immagini.sql) anche
-- alla spina (dorso) della copertina da stampa.

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS cover_spina_modo    TEXT NOT NULL DEFAULT 'testo',
  ADD COLUMN IF NOT EXISTS cover_spina_img_url TEXT;

ALTER TABLE books
  ADD CONSTRAINT cover_spina_modo_check CHECK (cover_spina_modo IN ('testo', 'immagine'));

COMMENT ON COLUMN books.cover_spina_modo    IS 'testo | immagine — se immagine, cover_spina_img_url sostituisce interamente la spina (niente titolo/autore/logo auto)';
COMMENT ON COLUMN books.cover_spina_img_url IS 'URL immagine custom per la spina, usata quando cover_spina_modo = immagine';

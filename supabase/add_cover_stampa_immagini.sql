-- Permette di sostituire testo con un'immagine caricata per retro e alette
-- della copertina da stampa (autore che vuole replicare un proprio design).

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS cover_quarta_modo      TEXT NOT NULL DEFAULT 'testo',
  ADD COLUMN IF NOT EXISTS cover_aletta_sx_modo   TEXT NOT NULL DEFAULT 'testo',
  ADD COLUMN IF NOT EXISTS cover_aletta_dx_modo   TEXT NOT NULL DEFAULT 'testo',
  ADD COLUMN IF NOT EXISTS cover_quarta_img_url   TEXT,
  ADD COLUMN IF NOT EXISTS cover_aletta_sx_img_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_aletta_dx_img_url TEXT;

ALTER TABLE books
  ADD CONSTRAINT cover_quarta_modo_check     CHECK (cover_quarta_modo    IN ('testo', 'immagine')),
  ADD CONSTRAINT cover_aletta_sx_modo_check  CHECK (cover_aletta_sx_modo IN ('testo', 'immagine')),
  ADD CONSTRAINT cover_aletta_dx_modo_check  CHECK (cover_aletta_dx_modo IN ('testo', 'immagine'));

COMMENT ON COLUMN books.cover_quarta_modo       IS 'testo | immagine — se immagine, cover_quarta_img_url sostituisce interamente il retro (niente testo/prezzo/isbn auto)';
COMMENT ON COLUMN books.cover_aletta_sx_modo    IS 'testo | immagine — se immagine, cover_aletta_sx_img_url sostituisce interamente l''aletta anteriore (niente foto autore/testo auto)';
COMMENT ON COLUMN books.cover_aletta_dx_modo    IS 'testo | immagine — se immagine, cover_aletta_dx_img_url sostituisce interamente l''aletta posteriore';
COMMENT ON COLUMN books.cover_quarta_img_url    IS 'URL immagine custom per il retro, usata quando cover_quarta_modo = immagine';
COMMENT ON COLUMN books.cover_aletta_sx_img_url IS 'URL immagine custom per l''aletta anteriore, usata quando cover_aletta_sx_modo = immagine';
COMMENT ON COLUMN books.cover_aletta_dx_img_url IS 'URL immagine custom per l''aletta posteriore, usata quando cover_aletta_dx_modo = immagine';

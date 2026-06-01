-- Aggiunge le colonne per la generazione della copertina da stampa
-- (fronte + spina + retro + alette) in formato PDF/PNG ad alta risoluzione.

ALTER TABLE books
  ADD COLUMN IF NOT EXISTS cover_formato          TEXT    DEFAULT 'a5',
  ADD COLUMN IF NOT EXISTS cover_numero_pagine    INT,
  ADD COLUMN IF NOT EXISTS cover_quarta_testo     TEXT,
  ADD COLUMN IF NOT EXISTS cover_aletta_sx_testo  TEXT,
  ADD COLUMN IF NOT EXISTS cover_aletta_dx_testo  TEXT,
  ADD COLUMN IF NOT EXISTS cover_foto_autore_url  TEXT,
  ADD COLUMN IF NOT EXISTS cover_isbn             TEXT,
  ADD COLUMN IF NOT EXISTS cover_prezzo           TEXT,
  ADD COLUMN IF NOT EXISTS cover_stampa_url       TEXT,
  ADD COLUMN IF NOT EXISTS cover_stampa_bleed_url TEXT;

COMMENT ON COLUMN books.cover_formato          IS 'Formato di stampa: a5 | 15x21 | 17x24 | tascabile';
COMMENT ON COLUMN books.cover_numero_pagine    IS 'Numero pagine del PDF (usato per calcolo spina)';
COMMENT ON COLUMN books.cover_quarta_testo     IS 'Testo quarta di copertina (retro)';
COMMENT ON COLUMN books.cover_aletta_sx_testo  IS 'Testo aletta anteriore (sinistra nel layout aperto)';
COMMENT ON COLUMN books.cover_aletta_dx_testo  IS 'Testo aletta posteriore (destra nel layout aperto)';
COMMENT ON COLUMN books.cover_foto_autore_url  IS 'URL foto autore per aletta (opzionale)';
COMMENT ON COLUMN books.cover_isbn             IS 'ISBN inserito dall\'autore — NULL = usa logo Liberiamo come placeholder';
COMMENT ON COLUMN books.cover_prezzo           IS 'Prezzo da stampare (es. "€ 18.00") — opzionale';
COMMENT ON COLUMN books.cover_stampa_url       IS 'URL PNG copertina da stampa — versione pulita senza bleed';
COMMENT ON COLUMN books.cover_stampa_bleed_url IS 'URL PNG copertina da stampa — con bleed 3mm e segni di taglio';

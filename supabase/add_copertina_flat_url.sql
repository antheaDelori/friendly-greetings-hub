-- Aggiunge la colonna per la copertina flat (senza teca) usata sulla pagina di lettura.
-- La copertina_url rimane quella con teca baked per il catalogo.
ALTER TABLE books ADD COLUMN IF NOT EXISTS copertina_flat_url TEXT;

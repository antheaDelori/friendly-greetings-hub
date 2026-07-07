-- Numero tessera progressivo per ogni autore, assegnato in ordine di iscrizione
-- (usato dalla tessera visiva nell'area riservata autore).

ALTER TABLE author_profiles ADD COLUMN IF NOT EXISTS numero_tessera INTEGER UNIQUE;

-- Backfill: assegna i numeri agli autori già esistenti, in ordine di iscrizione
WITH numerati AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS n
  FROM author_profiles
  WHERE numero_tessera IS NULL
)
UPDATE author_profiles ap
SET numero_tessera = numerati.n
FROM numerati
WHERE ap.id = numerati.id;

-- Sequenza per i futuri autori: riparte dal numero massimo già assegnato
CREATE SEQUENCE IF NOT EXISTS author_profiles_numero_tessera_seq;
SELECT setval('author_profiles_numero_tessera_seq', COALESCE((SELECT MAX(numero_tessera) FROM author_profiles), 0) + 1, false);
ALTER TABLE author_profiles ALTER COLUMN numero_tessera SET DEFAULT nextval('author_profiles_numero_tessera_seq');
ALTER SEQUENCE author_profiles_numero_tessera_seq OWNED BY author_profiles.numero_tessera;

COMMENT ON COLUMN author_profiles.numero_tessera IS 'Numero progressivo della tessera autore, assegnato in ordine di iscrizione';

-- Numero tessera progressivo per ogni utente (lettore), assegnato in ordine
-- di iscrizione — stesso schema già usato per author_profiles.numero_tessera.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS numero_tessera INTEGER UNIQUE;

-- Backfill: assegna i numeri agli utenti già esistenti, in ordine di iscrizione
WITH numerati AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS n
  FROM profiles
  WHERE numero_tessera IS NULL
)
UPDATE profiles p
SET numero_tessera = numerati.n
FROM numerati
WHERE p.id = numerati.id;

-- Sequenza per i futuri utenti: riparte dal numero massimo già assegnato
CREATE SEQUENCE IF NOT EXISTS profiles_numero_tessera_seq;
SELECT setval('profiles_numero_tessera_seq', COALESCE((SELECT MAX(numero_tessera) FROM profiles), 0) + 1, false);
ALTER TABLE profiles ALTER COLUMN numero_tessera SET DEFAULT nextval('profiles_numero_tessera_seq');
ALTER SEQUENCE profiles_numero_tessera_seq OWNED BY profiles.numero_tessera;

COMMENT ON COLUMN profiles.numero_tessera IS 'Numero progressivo della tessera lettore, assegnato in ordine di iscrizione';

-- Colonna ritirato su books: l'autore ritira l'opera dal catalogo (soft-delete),
-- resta nel DB e compare come teca vuota pubblica; l'autore la rivede/gestisce da /gestione.
ALTER TABLE books ADD COLUMN IF NOT EXISTS ritirato BOOLEAN NOT NULL DEFAULT FALSE;

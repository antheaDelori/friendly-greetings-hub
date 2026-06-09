-- Colonna status su books (open / published)
ALTER TABLE books ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';

-- Aggiorna i libri esistenti senza status
UPDATE books SET status = 'published' WHERE status IS NULL;

-- Tabella capitoli dei libri aperti
CREATE TABLE IF NOT EXISTS open_book_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  titolo TEXT NOT NULL,
  testo TEXT NOT NULL,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, numero)
);

-- Tabella commenti ai capitoli (con moderazione)
CREATE TABLE IF NOT EXISTS open_book_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES open_book_chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  testo TEXT NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella iscrizioni notifiche (lettori che seguono un libro aperto)
CREATE TABLE IF NOT EXISTS open_book_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_email BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(book_id, user_id)
);

-- RLS: open_book_chapters leggibili da tutti, scrivibili solo dall'autore del libro
ALTER TABLE open_book_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chaps_read_all" ON open_book_chapters FOR SELECT USING (true);
CREATE POLICY "chaps_insert_author" ON open_book_chapters FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM books WHERE id = book_id AND author_id = auth.uid()));
CREATE POLICY "chaps_delete_author" ON open_book_chapters FOR DELETE
  USING (EXISTS (SELECT 1 FROM books WHERE id = book_id AND author_id = auth.uid()));

-- RLS: commenti
ALTER TABLE open_book_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_read_approved" ON open_book_comments FOR SELECT USING (approved = true);
CREATE POLICY "comments_insert_auth" ON open_book_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_author" ON open_book_comments FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM open_book_chapters ch
    JOIN books b ON b.id = ch.book_id
    WHERE ch.id = chapter_id AND b.author_id = auth.uid()
  ));

-- RLS: iscrizioni
ALTER TABLE open_book_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subs_own" ON open_book_subscriptions USING (auth.uid() = user_id);
CREATE POLICY "subs_insert" ON open_book_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

import { supabase } from "@/lib/supabase";

export type ResumeBook = { slug: string; title: string; author: string };

// Recupera i libri con un segnalibro attivo per l'utente, scartando gli slug
// di opere rimosse/cestinate (e ripulendo reading_progress/localStorage per
// quelli). Usata sia dalla modale "Riprendi da dove hai lasciato?" dopo il
// login (auth.index.tsx) sia dal dropdown "Libri in lettura" nell'header.
export async function loadResumeBooks(userId: string, limit = 4): Promise<{ books: ResumeBook[]; total: number }> {
  const { data: progressData, count } = await supabase
    .from("reading_progress")
    .select("book_slug, book_title, book_author", { count: "exact" })
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (!progressData || progressData.length === 0) return { books: [], total: 0 };

  const allSlugs = progressData.map((p: { book_slug: string }) => p.book_slug);
  const { data: dbBooks } = await supabase.from("books").select("slug, titolo, author_name").in("slug", allSlugs);
  const dbBookMap: Record<string, { titolo: string; author_name: string }> = Object.fromEntries(
    (dbBooks ?? []).map((b: { slug: string; titolo: string; author_name: string }) => [b.slug, b])
  );
  const validSlugs = new Set(Object.keys(dbBookMap));

  const invalidSlugs = allSlugs.filter((s: string) => !validSlugs.has(s));
  if (invalidSlugs.length > 0) {
    await supabase.from("reading_progress").delete().eq("user_id", userId).in("book_slug", invalidSlugs);
    invalidSlugs.forEach((s: string) => {
      localStorage.removeItem(`reading_pos_${s}`);
      localStorage.removeItem(`bookmark_para_${s}`);
    });
  }

  const validProgress = progressData.filter((p: { book_slug: string }) => validSlugs.has(p.book_slug));
  const books: ResumeBook[] = validProgress.map((p: { book_slug: string; book_title: string | null; book_author: string | null }) => ({
    slug: p.book_slug,
    title: p.book_title || dbBookMap[p.book_slug]?.titolo || p.book_slug,
    author: p.book_author || dbBookMap[p.book_slug]?.author_name || "",
  }));

  return { books, total: count ?? validProgress.length };
}

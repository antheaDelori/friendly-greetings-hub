import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PageShell } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/libri-aperti/$slug")({
  component: LibroApertoPage,
});

type Book = {
  id: string;
  slug: string;
  titolo: string;
  descrizione: string | null;
  genere: string;
  author_name: string | null;
  copertina_url: string | null;
  status: string;
};

type Chapter = {
  id: string;
  numero: number;
  titolo: string;
  testo: string;
  published_at: string;
};

type Comment = {
  id: string;
  testo: string;
  created_at: string;
  user_display: string;
};

function formatDate(ts: string) {
  return new Date(ts).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

function LibroApertoPage() {
  const { slug } = Route.useParams();
  const { t } = useTranslation();

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [commentsByChapter, setCommentsByChapter] = useState<Record<string, Comment[]>>({});
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [commentSent, setCommentSent] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && !user.is_anonymous) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: bookData } = await supabase
        .from("books")
        .select("id, slug, titolo, descrizione, genere, author_name, copertina_url, status")
        .eq("slug", slug)
        .eq("disponibile", true)
        .eq("cestinato", false)
        .maybeSingle();

      if (!bookData) { setNotFound(true); setLoading(false); return; }
      setBook(bookData);

      const { data: chaptersData } = await supabase
        .from("open_book_chapters")
        .select("id, numero, titolo, testo, published_at")
        .eq("book_id", bookData.id)
        .order("numero", { ascending: true });

      setChapters(chaptersData ?? []);

      if (chaptersData && chaptersData.length > 0) {
        setOpenChapterId(chaptersData[0].id);
        await loadCommentsForChapters(chaptersData.map(c => c.id));
      }

      setLoading(false);
    };
    load();
  }, [slug]);

  useEffect(() => {
    if (!userId || !book) return;
    supabase
      .from("open_book_subscriptions")
      .select("id")
      .eq("book_id", book.id)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setIsSubscribed(!!data));
  }, [userId, book]);

  const loadCommentsForChapters = async (chapterIds: string[]) => {
    if (chapterIds.length === 0) return;
    const { data } = await supabase
      .from("open_book_comments")
      .select("id, chapter_id, testo, created_at, user_id")
      .in("chapter_id", chapterIds)
      .eq("approved", true)
      .order("created_at", { ascending: true });

    if (!data) return;

    const userIds = [...new Set(data.map(c => c.user_id))];
    const displayNames: Record<string, string> = {};
    for (const uid of userIds) {
      const { data: { user } } = await supabase.auth.admin.getUserById(uid).catch(() => ({ data: { user: null } }));
      if (user) {
        const meta = user.user_metadata ?? {};
        displayNames[uid] = meta.pseudonimo || meta.nome || user.email?.split("@")[0] || "Lettore";
      }
    }

    const grouped: Record<string, Comment[]> = {};
    for (const c of data) {
      if (!grouped[c.chapter_id]) grouped[c.chapter_id] = [];
      grouped[c.chapter_id].push({
        id: c.id,
        testo: c.testo,
        created_at: c.created_at,
        user_display: displayNames[c.user_id] ?? "Lettore",
      });
    }
    setCommentsByChapter(grouped);
  };

  const handleSubscribe = async () => {
    if (!userId || !book) return;
    setSubscribeLoading(true);
    if (isSubscribed) {
      await supabase.from("open_book_subscriptions").delete().eq("book_id", book.id).eq("user_id", userId);
      setIsSubscribed(false);
    } else {
      await supabase.from("open_book_subscriptions").insert({ book_id: book.id, user_id: userId, notify_email: true });
      setIsSubscribed(true);
    }
    setSubscribeLoading(false);
  };

  const handleSendComment = async (chapterId: string) => {
    if (!userId || !commentText.trim() || !book) return;
    setCommentSending(true);

    const chapter = chapters.find(c => c.id === chapterId);

    const { error } = await supabase.from("open_book_comments").insert({
      chapter_id: chapterId,
      user_id: userId,
      testo: commentText.trim(),
    });

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      const meta = user?.user_metadata ?? {};
      const commenterName = meta.pseudonimo || meta.nome || user?.email?.split("@")[0] || "Lettore";

      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-open-comment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          book_id: book.id,
          book_titolo: book.titolo,
          chapter_titolo: chapter?.titolo ?? "",
          commenter_name: commenterName,
          comment_text: commentText.trim(),
        }),
      });

      setCommentText("");
      setCommentSent(chapterId);
      setTimeout(() => setCommentSent(null), 4000);
    }
    setCommentSending(false);
  };

  if (loading) {
    return (
      <>
        <SiteHeader />
        <PageShell title="Libro Aperto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16">
            <p className="font-mono text-[11px] tracking-widest text-bone/40 animate-pulse uppercase">{t("libriAperti.caricamento")}</p>
          </div>
        </PageShell>
        <SiteFooter />
      </>
    );
  }

  if (notFound || !book) {
    return (
      <>
        <SiteHeader />
        <PageShell title="Libro Aperto">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16">
            <p className="font-mono text-[11px] tracking-widest text-bone/40 uppercase mb-6">{t("libriAperti.nonTrovato")}</p>
            <Link to="/libri-aperti" className="font-mono text-[10px] tracking-widest uppercase text-cyan hover:text-cyan/70 transition-colors">
              ◂ {t("libriAperti.tornaListaAperti")}
            </Link>
          </div>
        </PageShell>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <PageShell title="Libro Aperto">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10 py-16">
          {/* breadcrumb */}
          <Link to="/libri-aperti" className="font-mono text-[10px] tracking-widest uppercase text-bone/40 hover:text-cyan transition-colors mb-8 inline-block">
            ◂ {t("libriAperti.tornaListaAperti")}
          </Link>

          {/* header libro */}
          <div className="flex flex-col sm:flex-row gap-8 mb-12">
            <div className="flex-shrink-0 w-40">
              {book.copertina_url ? (
                <img src={book.copertina_url} alt={book.titolo} className="w-full aspect-[2/3] object-cover border border-cyan/20" />
              ) : (
                <div className="w-full aspect-[2/3] bg-deep/60 border border-cyan/15 flex items-center justify-center p-3 text-center">
                  <p className="font-mono text-[8px] tracking-widest text-bone/30 uppercase leading-relaxed">
                    {t("libriAperti.copertinaNonDisponibile")}
                  </p>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-mono text-[8px] tracking-widest uppercase bg-cyan/20 border border-cyan/40 text-cyan px-2 py-0.5">
                  {book.status === "open" ? t("libriAperti.badgeInScrittura") : t("libriAperti.badgeCompletato")}
                </span>
              </div>
              <p className="font-mono text-[10px] tracking-widest text-bone/40 uppercase mb-2">{book.author_name}</p>
              <h1 className="font-serif text-3xl text-bone mb-4 leading-snug">{book.titolo}</h1>
              {book.descrizione && (
                <p className="text-bone/60 text-sm leading-relaxed mb-6">{book.descrizione}</p>
              )}
              <p className="font-mono text-[10px] tracking-widest text-bone/35 uppercase mb-4">
                {chapters.length} {chapters.length === 1 ? t("libriAperti.capitoloSing") : t("libriAperti.capitoloPlur")}
              </p>

              {/* pulsante segui */}
              {userId ? (
                <button
                  onClick={handleSubscribe}
                  disabled={subscribeLoading}
                  className={`font-mono text-[10px] tracking-widest uppercase px-4 py-2 border transition-colors ${
                    isSubscribed
                      ? "border-cyan/40 text-cyan bg-cyan/10 hover:bg-red-900/20 hover:border-red-400/40 hover:text-red-400"
                      : "border-cyan/40 text-cyan hover:bg-cyan/10"
                  }`}
                >
                  {isSubscribed ? t("libriAperti.smetteDiSeguire") : t("libriAperti.segui")}
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="font-mono text-[10px] tracking-widest uppercase px-4 py-2 border border-cyan/30 text-bone/40 hover:text-cyan hover:border-cyan/40 transition-colors inline-block"
                >
                  {t("libriAperti.accediPerSeguire")}
                </Link>
              )}
            </div>
          </div>

          {/* capitoli */}
          {chapters.length === 0 ? (
            <p className="font-mono text-[11px] tracking-widest text-bone/40 uppercase">{t("libriAperti.nessunCapitolo")}</p>
          ) : (
            <div className="space-y-4">
              {chapters.map((chapter) => (
                <div key={chapter.id} className="glass border border-cyan/15">
                  <button
                    onClick={() => setOpenChapterId(openChapterId === chapter.id ? null : chapter.id)}
                    className="w-full text-left px-6 py-4 flex items-center justify-between group"
                  >
                    <div>
                      <span className="font-mono text-[9px] tracking-widest text-cyan/50 uppercase mr-3">
                        {t("libriAperti.capitoloSing")} {chapter.numero}
                      </span>
                      <span className="font-serif text-bone group-hover:text-cyan transition-colors">{chapter.titolo}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[9px] text-bone/30 hidden sm:inline">{formatDate(chapter.published_at)}</span>
                      <span className={`text-cyan/60 text-xs transition-transform duration-200 ${openChapterId === chapter.id ? "rotate-180" : ""}`}>▾</span>
                    </div>
                  </button>

                  {openChapterId === chapter.id && (
                    <div className="border-t border-cyan/10 px-6 py-6">
                      {/* testo capitolo */}
                      <div className="prose prose-invert prose-sm max-w-none text-bone/75 leading-relaxed whitespace-pre-wrap font-serif mb-10">
                        {chapter.testo}
                      </div>

                      {/* commenti approvati */}
                      <div className="border-t border-cyan/10 pt-6">
                        <p className="font-mono text-[9px] tracking-widest uppercase text-cyan/50 mb-4">{t("libriAperti.commentiTitolo")}</p>
                        {(commentsByChapter[chapter.id] ?? []).length === 0 ? (
                          <p className="font-mono text-[10px] text-bone/30 uppercase tracking-widest">{t("libriAperti.nessunCommento")}</p>
                        ) : (
                          <div className="space-y-4">
                            {(commentsByChapter[chapter.id] ?? []).map((c) => (
                              <div key={c.id} className="border-l-2 border-cyan/20 pl-4">
                                <p className="font-mono text-[9px] tracking-widest text-cyan/40 uppercase mb-1">
                                  {c.user_display} · {formatDate(c.created_at)}
                                </p>
                                <p className="text-bone/70 text-sm leading-relaxed">{c.testo}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* form commento */}
                        <div className="mt-6">
                          {userId ? (
                            commentSent === chapter.id ? (
                              <p className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase">{t("libriAperti.commentoInAttesa")}</p>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <textarea
                                  value={commentText}
                                  onChange={(e) => setCommentText(e.target.value)}
                                  placeholder={t("libriAperti.commentaPlaceholder")}
                                  rows={3}
                                  className="w-full bg-deep/40 border border-cyan/20 text-bone/80 text-sm font-serif px-4 py-3 resize-none focus:outline-none focus:border-cyan/50 placeholder:text-bone/25"
                                />
                                <button
                                  onClick={() => handleSendComment(chapter.id)}
                                  disabled={commentSending || !commentText.trim()}
                                  className="self-end font-mono text-[10px] tracking-widest uppercase px-4 py-2 border border-cyan/40 text-cyan hover:bg-cyan/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  {commentSending ? t("libriAperti.invioInCorso") : t("libriAperti.inviaCommento")}
                                </button>
                              </div>
                            )
                          ) : (
                            <Link
                              to="/auth"
                              className="font-mono text-[10px] tracking-widest uppercase text-bone/30 hover:text-cyan transition-colors"
                            >
                              {t("libriAperti.accediPerCommentare")}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PageShell>
      <SiteFooter />
    </>
  );
}

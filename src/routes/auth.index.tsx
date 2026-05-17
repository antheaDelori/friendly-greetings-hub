import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/")({
  validateSearch: z.object({
    returnTo: z.string().optional(),
  }),
  component: AuthLanding,
});

const inputClass = "mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all";
const labelClass = "font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase";

function AuthLanding() {
  const { t } = useTranslation();
  const { returnTo } = Route.useSearch();
  const returnToRef = useRef(returnTo);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loginAttempted = useRef(false);

  type ResumeBook = { slug: string; title: string; author: string };
  const [resumeBooks, setResumeBooks] = useState<ResumeBook[]>([]);
  const [resumeTotal, setResumeTotal] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const handleRemoveBook = async (slug: string) => {
    if (currentUserId) {
      await supabase.from("reading_progress").delete().eq("user_id", currentUserId).eq("book_slug", slug);
    }
    localStorage.removeItem(`reading_pos_${slug}`);
    localStorage.removeItem(`bookmark_para_${slug}`);
    const updated = resumeBooks.filter(b => b.slug !== slug);
    setResumeBooks(updated);
    setResumeTotal(prev => prev - 1);
    setConfirmDelete(null);
    if (updated.length === 0) window.location.replace("/");
  };

  useEffect(() => {
    returnToRef.current = returnTo;
  }, [returnTo]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" || !loginAttempted.current || !session) return;

      // Defer: esce dallo stack onAuthStateChange prima di fare altre chiamate Supabase
      setTimeout(async () => {
        try {
          const userId = session.user.id;
          const userEmail = session.user.email ?? "";

          const { data: profile } = await supabase
            .from("profiles")
            .select("is_blocked, block_reason")
            .eq("id", userId)
            .single();

          if (profile?.is_blocked) {
            await supabase.from("access_logs").insert({
              user_id: userId, email: userEmail,
              event: "blocked", status: "blocked",
              reason: profile.block_reason ?? "Account bloccato",
            });
            await supabase.auth.signOut();
            loginAttempted.current = false;
            setError(`${t("authLogin.errBloccatoPrefix")} ${profile.block_reason ?? t("authLogin.errBloccatoDefault")}`);
            setLoading(false);
            return;
          }

          await supabase.from("access_logs").insert({
            user_id: userId, email: userEmail,
            event: "login", status: "success",
          });

          // Se c'è un returnTo esplicito, rispettalo sempre
          if (returnToRef.current) {
            window.location.replace(returnToRef.current);
            return;
          }

          // Migra eventuali voci localStorage → Supabase (sessioni precedenti non loggato)
          const localKeys = Object.keys(localStorage).filter(k => k.startsWith("reading_pos_"));
          if (localKeys.length > 0) {
            const migrations = localKeys.map(k => {
              const slug = k.replace("reading_pos_", "");
              try {
                const d = JSON.parse(localStorage.getItem(k) || "{}");
                return { user_id: userId, book_slug: slug, chapter_idx: d.chapterIdx ?? 0, book_title: d.title ?? null, book_author: d.author ?? null, updated_at: d.ts ? new Date(d.ts).toISOString() : new Date().toISOString() };
              } catch { return null; }
            }).filter(Boolean);
            if (migrations.length > 0) {
              await supabase.from("reading_progress").upsert(migrations as any[], { onConflict: "user_id,book_slug" });
            }
            localKeys.forEach(k => localStorage.removeItem(k));
            Object.keys(localStorage).filter(k => k.startsWith("bookmark_para_")).forEach(k => localStorage.removeItem(k));
          }

          // Recupera i progressi dal database
          const { data: progressData, count } = await supabase
            .from("reading_progress")
            .select("book_slug, book_title, book_author", { count: "exact" })
            .eq("user_id", userId)
            .order("updated_at", { ascending: false })
            .limit(4);

          if (progressData && progressData.length > 0) {
            // Per voci senza titolo cerca nella tabella books
            const slugsWithoutTitle = progressData.filter((p: { book_title: string | null }) => !p.book_title).map((p: { book_slug: string }) => p.book_slug);
            let dbTitles: Record<string, { titolo: string; author_name: string }> = {};
            if (slugsWithoutTitle.length > 0) {
              const { data: dbBooks } = await supabase.from("books").select("slug, titolo, author_name").in("slug", slugsWithoutTitle);
              if (dbBooks) dbTitles = Object.fromEntries(dbBooks.map((b: { slug: string; titolo: string; author_name: string }) => [b.slug, b]));
            }
            const inProgress: ResumeBook[] = progressData.map((p: { book_slug: string; book_title: string | null; book_author: string | null }) => ({
              slug: p.book_slug,
              title: p.book_title || dbTitles[p.book_slug]?.titolo || p.book_slug,
              author: p.book_author || dbTitles[p.book_slug]?.author_name || "",
            }));
            setCurrentUserId(userId);
            setResumeBooks(inProgress);
            setResumeTotal(count ?? progressData.length);
            setLoading(false);
            return;
          }

          window.location.replace("/");
        } catch {
          window.location.replace(returnToRef.current || "/");
        }
      }, 0);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    loginAttempted.current = true;
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        loginAttempted.current = false;
        setError(t("authLogin.errCredenziali"));
        setLoading(false);
      }
      // successo: onAuthStateChange gestisce il blocco, il log e la navigazione
    } catch {
      loginAttempted.current = false;
      setError(t("authLogin.errConnessione"));
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) {
      setError(t("authLogin.errOspite"));
      setLoading(false);
      return;
    }
    window.location.replace(returnTo || "/catalogo");
  };

  if (resumeBooks.length > 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm scanlines">
        <div className="glass hud-frame mx-4 max-w-lg w-full p-8 md:p-10 fade-up">
          <div className="font-mono text-[10px] tracking-[0.3em] text-cyan/70 uppercase">// segnalibro_attivo</div>
          <h2 className="mt-4 font-display text-3xl md:text-4xl text-bone tracking-tight leading-tight">
            {t("authLogin.riprendiTitoloA")}<br /><span className="text-cyan text-glow-cyan">{t("authLogin.riprendiTitoloB")}</span>
          </h2>

          {resumeBooks.length === 1 ? (
            <p className="mt-4 font-serif italic text-lg text-bone/70">
              {t("authLogin.riprendiDesc")} <span className="text-bone not-italic font-semibold">{resumeBooks[0].title}</span>
              <span className="text-bone/50"> — {resumeBooks[0].author}</span>
            </p>
          ) : (
            <>
              <ul className="mt-5 space-y-2">
                {resumeBooks.map(b => (
                  <li key={b.slug} className="border border-cyan/20 hover:border-cyan/40 transition-colors">
                    {confirmDelete === b.slug ? (
                      <div className="flex items-center justify-between px-4 py-3 bg-magenta/5">
                        <span className="font-serif italic text-sm text-bone/70">{t("authLogin.rimuoviConferma")}</span>
                        <div className="flex gap-3 ml-4 shrink-0">
                          <button
                            onClick={() => handleRemoveBook(b.slug)}
                            className="font-mono text-[10px] uppercase tracking-widest text-magenta hover:text-bone transition-colors"
                          >{t("authLogin.rimuoviSi")}</button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="font-mono text-[10px] uppercase tracking-widest text-bone/50 hover:text-bone transition-colors"
                          >{t("authLogin.rimuoviNo")}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center group">
                        <button
                          onClick={() => window.location.replace(`/leggi/${b.slug}`)}
                          className="flex-1 text-left px-4 py-3"
                        >
                          <span className="font-mono text-[9px] text-cyan/60 group-hover:text-cyan mr-2 tracking-widest">▸</span>
                          <span className="font-serif text-bone">{b.title}</span>
                          {b.author && <span className="font-serif italic text-bone/50 text-sm ml-2">— {b.author}</span>}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(b.slug)}
                          className="px-3 py-3 font-mono text-bone/25 hover:text-magenta transition-colors text-sm shrink-0"
                          title={t("authLogin.rimuoviTitle")}
                        >✕</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {resumeTotal > 4 && (
                <p className="mt-3 font-mono text-[10px] tracking-widest text-bone/35 uppercase">
                  {t("authLogin.altriLibriPre", { n: resumeTotal - 4 })}{" "}
                  <Link to="/catalogo" className="text-cyan/60 hover:text-cyan underline underline-offset-2 transition-colors">
                    {t("nav.catalogo")}
                  </Link>
                </p>
              )}
            </>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {resumeBooks.length === 1 && (
              <button
                onClick={() => window.location.replace(`/leggi/${resumeBooks[0].slug}`)}
                className="flex-1 border border-cyan bg-cyan/10 text-cyan px-6 py-3 font-mono tracking-[0.2em] text-[11px] uppercase hover:bg-cyan hover:text-void transition-all hud-frame"
              >
                ▸ {t("authLogin.riprSi")}
              </button>
            )}
            <button
              onClick={() => window.location.replace("/")}
              className="flex-1 border border-bone/20 text-bone/50 px-6 py-3 font-mono tracking-[0.2em] text-[11px] uppercase hover:border-bone/40 hover:text-bone/80 transition-all"
            >
              {t("authLogin.riprNo")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageShell code="// MODULE/AUTH.gateway" title={t("authLogin.pageTitle")} subtitle={t("authLogin.pageSubtitle")}>
      <div className="grid md:grid-cols-3 gap-6">

        {/* Registrazione */}
        <HudPanel label={t("authLogin.opt01Label")} tone="cyan">
          <h3 className="font-display text-2xl text-bone tracking-tight">{t("authLogin.opt01Title")}</h3>
          <p className="mt-3 font-serif italic text-bone/70">{t("authLogin.opt01Desc")}</p>
          <Link to="/auth/registrazione" className="mt-6 inline-block">
            <HudButton variant="primary">▸ {t("authLogin.opt01Btn")}</HudButton>
          </Link>
        </HudPanel>

        {/* Login */}
        <HudPanel label={t("authLogin.opt02Label")} tone="magenta">
          <h3 className="font-display text-2xl text-bone tracking-tight">{t("authLogin.opt02Title")}</h3>
          <p className="mt-3 font-serif italic text-bone/70">{t("authLogin.opt02Desc")}</p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <span className={labelClass}>↳ email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@dominio.it"
                required
                className={inputClass}
              />
            </div>
            <div>
              <span className={labelClass}>↳ password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inputClass}
              />
            </div>
            {error && (
              <p className="font-mono text-[11px] text-magenta border border-magenta/30 bg-magenta/5 px-3 py-2">
                ⚠ {error}
              </p>
            )}
            <HudButton variant="magenta" type="submit" disabled={loading} className="w-full">
              {loading ? `◆ ${t("authLogin.opt02BtnLoading")}` : `◆ ${t("authLogin.opt02Btn")}`}
            </HudButton>
          </form>
        </HudPanel>

        {/* Solo lettore */}
        <HudPanel label={t("authLogin.opt03Label")} tone="amber">
          <h3 className="font-display text-2xl text-bone tracking-tight">{t("authLogin.opt03Title")}</h3>
          <p className="mt-3 font-serif italic text-bone/70">{t("authLogin.opt03Desc")}</p>
          <button onClick={handleGuestLogin} disabled={loading} className="mt-6 inline-block">
            <HudButton variant="ghost" disabled={loading}>
              {loading ? `▸ ${t("authLogin.opt02BtnLoading")}` : `▸ ${t("authLogin.opt03Btn")}`}
            </HudButton>
          </button>
        </HudPanel>

      </div>
    </PageShell>
  );
}

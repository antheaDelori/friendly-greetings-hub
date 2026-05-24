import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import logo from "@/assets/liberiamo-hero.png";
import { supabase } from "@/lib/supabase";
import { getCestinoTranslation } from "@/lib/cestinoI18n";

const LANGUAGES = [
  { code: "it", flag: "🇮🇹", label: "Italiano" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "es", flag: "🇪🇸", label: "Español" },
];

type AuthorEntry = { name: string; count: number };

export function SiteHeader() {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [cestinoTooltip, setCestinoTooltip] = useState<string | null>(null);
  const { t } = useTranslation();
  const [autoriOpen, setAutoriOpen] = useState(false);
  const [autoriList, setAutoriList] = useState<AuthorEntry[]>([]);
  const [autoriLoaded, setAutoriLoaded] = useState(false);
  const autoriRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Language switcher
  const [langOpen, setLangOpen] = useState(false);
  const [langModal, setLangModal] = useState(false);
  const [langName, setLangName] = useState("");
  const [langEmail, setLangEmail] = useState("");
  const [langRequested, setLangRequested] = useState("");
  const [langSending, setLangSending] = useState(false);
  const [langSent, setLangSent] = useState(false);
  const [langError, setLangError] = useState<string | null>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const currentLang = LANGUAGES.find(l => i18n.language.startsWith(l.code)) ?? LANGUAGES[0];

  useEffect(() => { setCestinoTooltip(getCestinoTranslation()); }, []);

  // chiude i dropdown cliccando fuori
  useEffect(() => {
    if (!autoriOpen && !langOpen) return;
    const handler = (e: MouseEvent) => {
      if (autoriRef.current && !autoriRef.current.contains(e.target as Node)) setAutoriOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [autoriOpen, langOpen]);

  const handleLangRequest = async () => {
    if (!langEmail.trim() || !langRequested.trim()) return;
    setLangSending(true);
    setLangError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "langRequest", name: langName.trim(), email: langEmail.trim(), language: langRequested.trim() }),
      });
      if (res.ok) { setLangSent(true); }
      else { setLangError(t("langSwitch.error")); }
    } catch {
      setLangError(t("langSwitch.error"));
    } finally {
      setLangSending(false);
    }
  };

  const handleAutoriToggle = async () => {
    setAutoriOpen(v => !v);
    if (autoriLoaded) return;
    const { data } = await supabase
      .from("books")
      .select("author_name")
      .eq("disponibile", true)
      .eq("cestinato", false);
    if (!data) return;
    const map = new Map<string, number>();
    for (const b of data) {
      const n = b.author_name ?? "Autore";
      map.set(n, (map.get(n) ?? 0) + 1);
    }
    const list = [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "it"));
    setAutoriList(list);
    setAutoriLoaded(true);
  };

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setDisplayName(null); setIsAnonymous(false); return; }
      setIsAnonymous(user.is_anonymous ?? false);
      if (user.is_anonymous) { setDisplayName("ospite"); return; }
      const meta = user.user_metadata;
      setDisplayName(meta?.pseudonimo || meta?.nome || user.email?.split("@")[0] || "utente");
      supabase.from("author_profiles").select("id").eq("id", user.id).maybeSingle()
        .then(({ data }) => setIsAuthor(!!data));
    };

    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { loadUser(); });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    Object.keys(localStorage)
      .filter(k => k.startsWith("reading_pos_") || k.startsWith("bookmark_para_"))
      .forEach(k => localStorage.removeItem(k));
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const linkBase = "text-[11px] font-mono tracking-[0.18em] uppercase text-bone/70 hover:text-cyan transition-colors";

  return (
    <header className="sticky top-0 z-40 bg-void/70 backdrop-blur-xl">
      {/* status bar */}
      <div className="border-b border-cyan/10 bg-deep/40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 h-7 flex items-center justify-between font-mono text-[10px] tracking-widest text-cyan/60">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 bg-cyan rounded-full animate-pulse" />SYS:ONLINE
            </span>
            <span className="hidden sm:inline">// NODE 03 / SECTOR LIB</span>
            <span className="hidden md:inline opacity-50">UPLINK 2076.04.12</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline opacity-60">PROTOCOL: HOLO/v7</span>
            {displayName && (
              <span className="text-cyan">
                ▸ {displayName.toUpperCase()}
              </span>
            )}
            <span className="text-magenta">READ_OR_PERISH.exe</span>
          </div>
        </div>
      </div>

      {/* main bar */}
      <div className="border-b border-cyan/15 mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative h-10 w-10 hud-frame bg-deep/60 overflow-hidden">
            <img
              src={logo}
              alt="Liberiamo la mente"
              className="h-full w-full object-cover ring-1 ring-cyan/30 flicker"
            />
            <span className="absolute inset-0 bg-cyan/10 mix-blend-overlay pointer-events-none" />
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-display text-lg tracking-[0.18em] text-bone">
              LIB<span className="text-magenta text-glow-magenta">e</span>RIAMO
            </span>
            <span className="font-mono text-[9px] tracking-[0.25em] text-cyan/70 mt-1 uppercase">
              il mondo dei creativi · 2076
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          <Link to="/" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }} activeOptions={{ exact: true }}>{t("nav.home")}</Link>
          <Link to="/catalogo" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }}>{t("nav.catalogo")}</Link>

          {/* dropdown autori */}
          <div ref={autoriRef} className="relative">
            <button
              onClick={handleAutoriToggle}
              className={`${linkBase} flex items-center gap-1 ${autoriOpen ? "text-cyan text-glow-cyan" : ""}`}
            >
              {t("nav.autori")}
              <span className={`text-[8px] transition-transform duration-200 ${autoriOpen ? "rotate-180" : ""}`}>▾</span>
            </button>
            {autoriOpen && (
              <div className="absolute top-full left-0 mt-3 w-56 glass border border-cyan/30 z-50 shadow-[0_0_30px_oklch(0.82_0.16_200/0.15)]">
                <span className="absolute -top-px left-0 right-0 h-px bg-cyan/60" />
                <Link
                  to="/autori"
                  onClick={() => setAutoriOpen(false)}
                  className="flex items-center gap-2 px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-cyan hover:bg-cyan/10 transition-colors border-b border-cyan/15"
                >
                  ▸ {t("autoriDropdown.ricerca")}
                </Link>
                <div className="max-h-52 overflow-y-auto">
                  {!autoriLoaded ? (
                    <p className="px-4 py-3 font-mono text-[10px] text-bone/40 animate-pulse">{t("autoriDropdown.caricamento")}</p>
                  ) : autoriList.length === 0 ? (
                    <p className="px-4 py-3 font-mono text-[10px] text-bone/40">{t("autoriDropdown.nessun")}</p>
                  ) : (
                    autoriList.map(a => (
                      <button
                        key={a.name}
                        onClick={() => { navigate({ to: "/catalogo", search: { q: a.name, genre: "", sort: "recenti" } }); setAutoriOpen(false); }}
                        className="w-full text-left px-4 py-2.5 flex items-center justify-between group hover:bg-cyan/5 transition-colors"
                      >
                        <span className="font-serif text-sm text-bone/80 group-hover:text-cyan transition-colors truncate">{a.name}</span>
                        <span className="font-mono text-[9px] text-bone/25 ml-2 flex-shrink-0">{a.count}</span>
                      </button>
                    ))
                  )}
                </div>
                {autoriLoaded && autoriList.length > 0 && (
                  <Link
                    to="/autori"
                    onClick={() => setAutoriOpen(false)}
                    className="flex items-center gap-2 px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-bone/40 hover:text-cyan hover:bg-cyan/5 transition-colors border-t border-cyan/15"
                  >
                    ▸ {t("autoriDropdown.vediTutti")} ({autoriList.length})
                  </Link>
                )}
              </div>
            )}
          </div>

          {!isAnonymous && displayName && (
            <Link to="/libreria" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }}>Libreria</Link>
          )}
          <Link to="/community" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }}>{t("nav.community")}</Link>
          <Link to="/regolamento" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }}>{t("nav.regole")}</Link>
        </nav>

        <div className="flex items-center gap-2">

          {/* ── Language switcher ── */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setLangOpen(v => !v)}
              className={`font-mono text-[10px] tracking-widest uppercase flex items-center gap-1 px-2 py-2 transition-colors ${langOpen ? "text-cyan" : "text-bone/40 hover:text-cyan"}`}
            >
              <span className="text-[14px] leading-none">{currentLang.flag}</span>
              <span className="hidden sm:inline">{currentLang.code.toUpperCase()}</span>
              <span className={`text-[8px] transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`}>▾</span>
            </button>
            {langOpen && (
              <div className="absolute top-full right-0 mt-3 w-48 glass border border-cyan/30 z-50 shadow-[0_0_30px_oklch(0.82_0.16_200/0.15)]">
                <span className="absolute -top-px left-0 right-0 h-px bg-cyan/60" />
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-cyan/5 transition-colors ${i18n.language.startsWith(lang.code) ? "text-cyan" : "text-bone/70"}`}
                  >
                    <span className="text-[14px] leading-none">{lang.flag}</span>
                    <span className="font-mono text-[10px] tracking-widest uppercase">{lang.label}</span>
                    {i18n.language.startsWith(lang.code) && <span className="ml-auto font-mono text-[8px] text-cyan">✓</span>}
                  </button>
                ))}
                <div className="border-t border-cyan/15">
                  <button
                    onClick={() => { setLangOpen(false); setLangModal(true); }}
                    className="w-full text-left px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-magenta hover:bg-magenta/5 transition-colors"
                  >
                    {t("langSwitch.requestBtn")}
                  </button>
                </div>
              </div>
            )}
          </div>

          {displayName ? (
            <>
              {isAnonymous ? (
                <span className="hidden sm:inline-flex font-mono tracking-widest text-[10px] uppercase text-bone/40 px-3 py-2">
                  [{t("auth.ospite")}]
                </span>
              ) : (
                <Link
                  to={isAuthor ? "/area-autore" : "/libreria"}
                  className="hidden sm:inline-flex font-mono tracking-widest text-[10px] uppercase text-cyan hover:text-magenta transition-colors px-3 py-2"
                  title={isAuthor ? "Area riservata autore" : "La mia libreria"}
                >
                  [{displayName}]
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="relative inline-flex items-center gap-2 border border-magenta/60 bg-magenta/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-magenta hover:bg-magenta hover:text-void transition-all"
              >
                ✕ {t("auth.esci")}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="hidden sm:inline-flex font-mono tracking-widest text-[10px] uppercase text-bone/70 hover:text-cyan transition-colors px-3 py-2"
              >
                [{t("auth.accedi")}]
              </Link>
              <Link
                to="/auth/registrazione"
                className="relative inline-flex items-center gap-2 border border-cyan/60 bg-cyan/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-cyan hover:bg-cyan hover:text-void transition-all hud-frame-x"
              >
                ▸ {t("auth.registrati")}
              </Link>
            </>
          )}
        </div>
      </div>

      {/* cestino strip — sotto la linea del menu, allineato a destra */}
      <div className="hidden sm:block py-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 flex justify-end">
          <div className="group relative">
            <Link
              to="/cestino"
              className="font-mono text-[9px] tracking-[0.22em] text-magenta text-glow-magenta hover:opacity-70 transition-opacity uppercase"
            >
              ⊗ Cestino degli Scritti Perduti
            </Link>
            {cestinoTooltip && (
              <span className="pointer-events-none absolute top-full right-0 mt-1 font-mono text-[11px] tracking-widest uppercase text-cyan text-glow-cyan whitespace-nowrap opacity-0 scale-0 origin-top-right group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                {cestinoTooltip}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Language request modal ── */}
      {langModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-void/80 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) { setLangModal(false); setLangSent(false); setLangError(null); } }}
        >
          <div className="relative w-full max-w-md mx-4 glass border border-cyan/30 p-6">
            <span className="absolute -top-px left-0 right-0 h-px bg-cyan/60" />
            <h2 className="font-display text-lg tracking-[0.15em] text-bone mb-1">{t("langSwitch.modal_title")}</h2>
            <p className="font-mono text-[10px] tracking-widest text-bone/50 uppercase mb-5">{t("langSwitch.modal_desc")}</p>
            {langSent ? (
              <div className="text-center py-4">
                <p className="font-mono text-[11px] tracking-widest text-cyan uppercase">{t("langSwitch.success")}</p>
                <button
                  onClick={() => { setLangModal(false); setLangSent(false); }}
                  className="mt-4 font-mono text-[10px] tracking-widest uppercase text-bone/50 hover:text-cyan transition-colors"
                >
                  {t("langSwitch.close")}
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 mb-4">
                  <input
                    type="text"
                    placeholder={t("langSwitch.fieldName")}
                    value={langName}
                    onChange={e => setLangName(e.target.value)}
                    className="bg-void/60 border border-cyan/20 px-3 py-2 font-mono text-[11px] text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan/60"
                  />
                  <input
                    type="email"
                    placeholder={`${t("langSwitch.fieldEmail")} ★`}
                    value={langEmail}
                    onChange={e => setLangEmail(e.target.value)}
                    className="bg-void/60 border border-cyan/20 px-3 py-2 font-mono text-[11px] text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan/60"
                  />
                  <input
                    type="text"
                    placeholder={t("langSwitch.fieldLangPh")}
                    value={langRequested}
                    onChange={e => setLangRequested(e.target.value)}
                    className="bg-void/60 border border-cyan/20 px-3 py-2 font-mono text-[11px] text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan/60"
                  />
                </div>
                {langError && <p className="font-mono text-[10px] text-magenta mb-3">{langError}</p>}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setLangModal(false); setLangSent(false); setLangError(null); }}
                    className="font-mono text-[10px] tracking-widest uppercase text-bone/40 hover:text-bone/70 transition-colors"
                  >
                    {t("langSwitch.close")}
                  </button>
                  <button
                    onClick={handleLangRequest}
                    disabled={langSending || !langEmail.trim() || !langRequested.trim()}
                    className="relative inline-flex items-center gap-2 border border-cyan/60 bg-cyan/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-cyan hover:bg-cyan hover:text-void transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {langSending ? t("langSwitch.sending") : t("langSwitch.submit")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

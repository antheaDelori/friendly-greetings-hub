import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/liberiamo-hero.webp";
import { supabase } from "@/lib/supabase";
import { getCestinoTranslation } from "@/lib/cestinoI18n";

type AuthorEntry = { name: string; count: number };

function slugify(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
}

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
  const routerState = useRouterState();
  const isInAreaAutore = routerState.location.pathname.startsWith("/area-autore");
  const GUIDA_PER_PAGINA: [string, "/guida/gestione" | "/guida/catalogo", string][] = [
    ["/gestione", "/guida/gestione", "guidaGestione"],
    ["/catalogo", "/guida/catalogo", "guidaCatalogo"],
    ["/autori", "/guida/catalogo", "guidaAutori"],
  ];
  const guidaMatch = GUIDA_PER_PAGINA.find(([prefix]) => routerState.location.pathname.startsWith(prefix));
  const guidaTarget: "/guida/accessi" | "/guida/gestione" | "/guida/catalogo" = guidaMatch?.[1] ?? "/guida/accessi";
  const guidaLabelKey = guidaMatch?.[2] ?? "guidaAccessi";

  useEffect(() => { setCestinoTooltip(getCestinoTranslation()); }, []);

  // chiude il dropdown autori cliccando fuori
  useEffect(() => {
    if (!autoriOpen) return;
    const handler = (e: MouseEvent) => {
      if (autoriRef.current && !autoriRef.current.contains(e.target as Node)) setAutoriOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [autoriOpen]);

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

  const linkBase = "text-[11px] font-mono tracking-[0.18em] uppercase text-bone/70 hover:text-cyan transition-colors whitespace-nowrap";

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
      <div className="border-b border-cyan/15 mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
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

        <nav className="hidden md:flex items-center gap-4">
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
              <div className="absolute top-full left-0 mt-3 w-56 bg-void border border-cyan/30 z-50 shadow-[0_0_30px_oklch(0.82_0.16_200/0.2)]">
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
                        onClick={() => { navigate({ to: "/autori/$slug", params: { slug: slugify(a.name) } }); setAutoriOpen(false); }}
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
            <Link to="/libreria" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }}>{t("nav.libreria")}</Link>
          )}
          <Link to="/community" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }}>{t("nav.community")}</Link>
          <Link to="/libri-aperti" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }}>{t("nav.libriAperti")}</Link>
          <Link to="/regolamento" className={linkBase} activeProps={{ className: "text-cyan text-glow-cyan" }}>{t("nav.regole")}</Link>
          <Link to={guidaTarget} className={`${linkBase} border border-magenta/30 px-3 py-1 text-magenta/70 hover:text-magenta hover:border-magenta/60`} activeProps={{ className: "text-magenta border-magenta/60" }}>{t("nav.guida")} · {t(`nav.${guidaLabelKey}`)}</Link>
        </nav>

        <div className="flex items-center gap-2 ml-auto">
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
                >
                  [{isInAreaAutore ? displayName : t("profiloAutore.areaRiservata")}]
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="relative inline-flex items-center gap-2 border border-magenta/60 bg-magenta/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-magenta hover:bg-magenta hover:text-void transition-all"
              >
                {t("auth.esci")}
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="relative inline-flex items-center gap-2 border border-cyan/60 bg-cyan/10 px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-cyan hover:bg-cyan hover:text-void transition-all hud-frame-x"
            >
              ▸ {t("auth.accedi")}
            </Link>
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
    </header>
  );
}

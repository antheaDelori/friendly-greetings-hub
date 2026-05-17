import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { supabase } from "@/lib/supabase";
import logo from "@/assets/logo-liberiamo.jpg";

export const Route = createFileRoute("/collane/$slug")({
  component: CollanePage,
});

type Novella = {
  slug: string;
  titolo: string;
  sottotitolo: string | null;
  descrizione: string | null;
  estratto: string | null;
  copertina_url: string | null;
  author_name: string | null;
  letture: number;
};

function CollanePage() {
  const { t } = useTranslation();
  const { slug } = Route.useParams();
  const [collana, setCollana] = useState<{ id: string; titolo: string; descrizione: string | null; copertina_url: string | null } | null>(null);
  const [novelle, setNovelle] = useState<Novella[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: collanaData } = await supabase
        .from("collane")
        .select("id, titolo, descrizione, copertina_url")
        .eq("slug", slug)
        .maybeSingle();

      if (!collanaData) { setNotFound(true); setLoading(false); return; }
      setCollana(collanaData);

      const { data: booksData } = await supabase
        .from("books")
        .select("slug, titolo, sottotitolo, descrizione, estratto, copertina_url, author_name, letture")
        .eq("collana_id", collanaData.id)
        .eq("disponibile", true)
        .order("created_at", { ascending: true });

      setNovelle(booksData ?? []);
      setLoading(false);
    };
    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center">
          <p className="font-mono text-cyan text-sm animate-pulse">▸ {t("collana.caricamento")}</p>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (notFound || !collana) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <div>
            <div className="font-display text-7xl text-magenta">∅</div>
            <p className="mt-4 font-serif italic text-xl text-bone/70">{t("collana.nonTrovata")}</p>
            <Link to="/catalogo" className="mt-6 inline-block font-mono text-[10px] uppercase tracking-widest text-cyan border-b border-cyan/60 pb-1">
              ▸ {t("collana.tornaCatalogo")}
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />

      {/* Hero collana */}
      <section className="relative overflow-hidden scanlines">
        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] rounded-full bg-cyan/10 blur-[100px] pointer-events-none" />
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10 py-16 relative">
          <Link to="/catalogo" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-bone/40 hover:text-cyan transition-colors mb-8">
            ← {t("collana.catalogo")}
          </Link>
          <div className="flex flex-col md:flex-row gap-10 items-start">
            {collana.copertina_url ? (
              <img src={collana.copertina_url} alt={collana.titolo}
                className="w-36 md:w-44 flex-shrink-0 object-cover ring-1 ring-cyan/30 hud-frame" />
            ) : (
              <div className="w-36 md:w-44 aspect-[3/4] flex-shrink-0 bg-void/60 border border-cyan/20 flex items-center justify-center font-display text-6xl text-bone/20 hud-frame">◊</div>
            )}
            <div className="flex-1">
              <div className="font-mono tracking-[0.3em] text-[10px] text-cyan uppercase">// collana</div>
              <h1 className="mt-3 font-display text-4xl md:text-6xl text-bone tracking-tight leading-none">
                {collana.titolo}
              </h1>
              {collana.descrizione && (
                <p className="mt-5 font-serif italic text-xl text-bone/70 max-w-2xl leading-relaxed">
                  {collana.descrizione}
                </p>
              )}
              <p className="mt-4 font-mono text-[10px] tracking-widest text-bone/30 uppercase">
                {novelle.length} {novelle.length === 1 ? t("collana.novellaSing") : t("collana.novellePlur")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lista novelle a cascata */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-10 py-12 flex-1 w-full">
        {novelle.length === 0 ? (
          <div className="text-center py-16 glass hud-frame p-12">
            <div className="font-display text-7xl text-magenta">∅</div>
            <p className="mt-4 font-serif italic text-xl text-bone/70">{t("collana.nessuna")}</p>
          </div>
        ) : (
          <div className="space-y-0">
            {novelle.map((n, i) => {
              const titolo = n.sottotitolo || n.titolo;
              const preview = n.descrizione;
              return (
                <div key={n.slug}>
                  {i > 0 && <div className="border-t border-cyan/[0.08]" />}
                  <div className="py-8 flex gap-6 items-start group">
                    {/* Copertina piccola */}
                    <Link to="/leggi/$slug" params={{ slug: n.slug }} className="flex-shrink-0">
                      <img
                        src={n.copertina_url ?? logo}
                        alt={titolo}
                        className="w-20 sm:w-24 object-cover ring-1 ring-cyan/20 group-hover:ring-cyan/50 transition-all"
                      />
                    </Link>

                    {/* Contenuto */}
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/50 uppercase mb-1">
                        {String(i + 1).padStart(2, "0")} — {n.author_name ?? "Autore"}
                      </div>
                      <Link to="/leggi/$slug" params={{ slug: n.slug }}>
                        <h2 className="font-display text-xl sm:text-2xl text-bone tracking-tight leading-snug hover:text-cyan transition-colors">
                          {titolo}
                        </h2>
                      </Link>
                      {preview && (
                        <p className="mt-3 font-serif italic text-bone/60 leading-relaxed line-clamp-3">
                          {preview}
                        </p>
                      )}
                      <Link
                        to="/leggi/$slug"
                        params={{ slug: n.slug }}
                        className="mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan/60 hover:text-cyan border-b border-cyan/20 hover:border-cyan pb-0.5 transition-all"
                      >
                        ▸ {t("collana.leggi")}
                      </Link>
                    </div>

                    {/* Letture */}
                    <div className="hidden sm:block flex-shrink-0 text-right">
                      <div className="font-mono text-[9px] tracking-widest text-bone/20 uppercase">{n.letture}</div>
                      <div className="font-mono text-[8px] tracking-widest text-bone/15 uppercase">lett.</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

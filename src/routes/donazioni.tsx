import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const Route = createFileRoute("/donazioni")({
  head: () => ({
    meta: [
      { title: "Sostieni un autore — Liberiamo la mente" },
      { name: "description", content: "Fai una donazione diretta a un autore della biblioteca olografica." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Liberiamo la mente" },
      { property: "og:url", content: "https://liberiamo2076.com/donazioni" },
      { property: "og:title", content: "Sostieni un autore — Liberiamo la mente" },
      { property: "og:description", content: "Fai una donazione diretta a un autore della biblioteca olografica. Nessun intermediario." },
      { property: "og:image", content: "https://liberiamo2076.com/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Sostieni un autore — Liberiamo la mente" },
      { name: "twitter:description", content: "Fai una donazione diretta a un autore della biblioteca olografica." },
      { name: "twitter:image", content: "https://liberiamo2076.com/og-image.png" },
    ],
  }),
  component: DonazioniPage,
});

type AuthorEntry = { name: string; id: string; paypal_url: string };

function DonazioniPage() {
  const [amount, setAmount] = useState<number | "free">(10);
  const [free, setFree] = useState("");
  const [authors, setAuthors] = useState<AuthorEntry[]>([]);
  const [authorIndex, setAuthorIndex] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase
      .from("books")
      .select("author_name, author_id, profiles!author_id(max_opere, paypal_url)")
      .eq("disponibile", true)
      .not("author_name", "is", null)
      .then(({ data }) => {
        if (!data) return;
        const eligible = data.filter(
          (b: any) => (b.profiles?.max_opere ?? 1) >= 2 && b.profiles?.paypal_url
        );
        const seen = new Set<string>();
        const unique: AuthorEntry[] = [];
        for (const b of eligible as any[]) {
          if (!seen.has(b.author_id)) {
            seen.add(b.author_id);
            unique.push({ name: b.author_name, id: b.author_id, paypal_url: b.profiles.paypal_url });
          }
        }
        setAuthors(unique);
      });
  }, []);

  const selected = authors[authorIndex] ?? null;

  const handleDona = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${SUPABASE_URL}/functions/v1/notify-donation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ author_id: selected.id, author_name: selected.name }),
      });
    } catch (_) { /* fire and forget */ }
    window.open(selected.paypal_url, "_blank", "noopener");
    setSending(false);
  };

  const presets = [5, 10, 15];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell code="// MODULE/DONATIONS" title="Sostieni un autore" subtitle="La donazione va direttamente all'autore. Noi registriamo solo che la transazione è partita.">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <HudPanel label="trasferimento" tone="magenta">
            <div>
              <span className="font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase">↳ scegli autore</span>
              {authors.length === 0 ? (
                <p className="mt-3 font-mono text-[10px] text-bone/40 tracking-widest uppercase animate-pulse">▸ caricamento...</p>
              ) : (
                <select
                  value={authorIndex}
                  onChange={(e) => setAuthorIndex(Number(e.target.value))}
                  className="mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone focus:outline-none focus:border-cyan"
                >
                  {authors.map((a, i) => (
                    <option key={a.id} value={i} className="bg-void">{a.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="hud-divider my-6" />

            <span className="font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase">↳ importo indicativo</span>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {presets.map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v)}
                  className={`p-5 border transition-all ${
                    amount === v
                      ? "border-magenta bg-magenta/15 text-magenta glow-magenta"
                      : "border-cyan/30 text-bone/70 hover:border-cyan hover:text-cyan"
                  }`}
                >
                  <div className="font-display text-3xl tracking-tight">€ {v}</div>
                </button>
              ))}
              <button
                onClick={() => setAmount("free")}
                className={`p-5 border transition-all ${
                  amount === "free"
                    ? "border-magenta bg-magenta/15 text-magenta glow-magenta"
                    : "border-cyan/30 text-bone/70 hover:border-cyan hover:text-cyan"
                }`}
              >
                <div className="font-display text-base tracking-widest uppercase">libera</div>
              </button>
            </div>

            {amount === "free" && (
              <div className="mt-4 fade-up">
                <span className="font-mono text-[10px] tracking-[0.25em] text-magenta uppercase">↳ importo libero</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-display text-3xl text-magenta">€</span>
                  <input
                    type="number"
                    value={free}
                    onChange={(e) => setFree(e.target.value)}
                    placeholder="0,00"
                    className="flex-1 bg-void/40 border border-magenta/40 px-4 py-3 font-display text-2xl text-bone focus:outline-none focus:border-magenta"
                  />
                </div>
              </div>
            )}

            <div className="hud-divider my-6" />

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-mono text-[10px] tracking-widest text-bone/50 uppercase">// importo indicativo</div>
                <div className="font-display text-5xl text-magenta text-glow-magenta">
                  € {amount === "free" ? (free || "0") : amount}
                </div>
              </div>
              <HudButton
                variant="magenta"
                className="text-base"
                disabled={!selected || sending}
                onClick={handleDona}
              >
                {sending ? "▸ Apertura PayPal..." : "♥ Dona ora"}
              </HudButton>
            </div>

            {!selected && authors.length === 0 && (
              <p className="mt-4 font-mono text-[10px] text-bone/30 tracking-widest uppercase">
                Nessun autore ha ancora abilitato le donazioni.
              </p>
            )}
          </HudPanel>

          <div className="space-y-4">
            <HudPanel label="destinatario" tone="cyan">
              {selected ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan/40 to-magenta/30 ring-1 ring-cyan/40 flex items-center justify-center font-display text-bone text-xl">
                    {selected.name[0]}
                  </div>
                  <div>
                    <div className="font-display text-bone">{selected.name}</div>
                    <div className="font-mono text-[9px] tracking-widest text-cyan/70 uppercase">▸ donazione diretta via PayPal</div>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-[10px] text-bone/40 tracking-widest uppercase">nessun autore disponibile</p>
              )}
            </HudPanel>

            <HudPanel label="info" tone="amber">
              <p className="font-serif italic text-sm text-bone/75 leading-relaxed">
                Cliccando "Dona ora" verrai reindirizzato al PayPal dell'autore. L'importo che inserisci qui è indicativo — potrai confermarlo direttamente su PayPal.
              </p>
              <div className="hud-divider my-4" />
              <p className="font-mono text-[10px] tracking-widest text-bone/50 uppercase">
                ▸ donazione diretta · nessun intermediario
              </p>
              <div className="hud-divider my-4" />
              <p className="font-mono text-[9px] tracking-wide text-bone/40 leading-relaxed">
                Privacy: registriamo solo che una donazione è stata avviata verso questo autore. Nessun dato personale del donatore viene salvato. Per maggiori informazioni consulta la <a href="/privacy" className="text-cyan/60 hover:text-cyan underline">Privacy Policy</a>.
              </p>
            </HudPanel>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}

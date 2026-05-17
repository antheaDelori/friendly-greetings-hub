import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/donazioni")({
  head: () => ({
    meta: [
      { title: "Sostieni un autore — Liberiamo la mente" },
      { name: "description", content: "Fai una donazione diretta a un autore della biblioteca olografica. Tagli da 5, 10, 15 € o importo libero." },
    ],
  }),
  component: DonazioniPage,
});

function DonazioniPage() {
  const [amount, setAmount] = useState<number | "free">(10);
  const [free, setFree] = useState("");
  const [authors, setAuthors] = useState<string[]>([]);
  const [author, setAuthor] = useState("");

  useEffect(() => {
    supabase
      .from("books")
      .select("author_name")
      .eq("disponibile", true)
      .not("author_name", "is", null)
      .then(({ data }) => {
        if (!data) return;
        const unique = [...new Set(data.map((b: { author_name: string }) => b.author_name))];
        setAuthors(unique);
        if (unique.length > 0) setAuthor(unique[0]);
      });
  }, []);

  const presets = [5, 10, 15];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell code="// MODULE/DONATIONS" title="Sostieni un autore" subtitle="Niente piattaforma intermedia che si prende metà. Il 95% va direttamente a chi scrive.">
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <HudPanel label="trasferimento" tone="magenta">
            <div>
              <span className="font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase">↳ scegli autore</span>
              {authors.length === 0 ? (
                <p className="mt-3 font-mono text-[10px] text-bone/40 tracking-widest uppercase animate-pulse">▸ caricamento...</p>
              ) : (
                <select
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone focus:outline-none focus:border-cyan"
                >
                  {authors.map((a) => (
                    <option key={a} value={a} className="bg-void">{a}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="hud-divider my-6" />

            <span className="font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase">↳ importo</span>
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
                <div className="font-mono text-[10px] tracking-widest text-bone/50 uppercase">// totale</div>
                <div className="font-display text-5xl text-magenta text-glow-magenta">
                  € {amount === "free" ? (free || "0") : amount}
                </div>
              </div>
              <HudButton variant="magenta" className="text-base" disabled={!author}>♥ Conferma donazione</HudButton>
            </div>
          </HudPanel>

          <div className="space-y-4">
            <HudPanel label="destinatario" tone="cyan">
              {author ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan/40 to-magenta/30 ring-1 ring-cyan/40 flex items-center justify-center font-display text-bone">
                    {author[0]}
                  </div>
                  <div>
                    <div className="font-display text-bone">{author}</div>
                    <div className="font-mono text-[9px] tracking-widest text-cyan/70 uppercase">▸ autore connesso</div>
                  </div>
                </div>
              ) : (
                <p className="font-mono text-[10px] text-bone/40 tracking-widest uppercase">seleziona un autore</p>
              )}
            </HudPanel>

            <HudPanel label="info" tone="amber">
              <p className="font-serif italic text-sm text-bone/75 leading-relaxed">
                Le donazioni vengono trasferite mensilmente. Riceverai una ricevuta digitale firmata.
              </p>
              <div className="hud-divider my-4" />
              <p className="font-mono text-[10px] tracking-widest text-bone/50 uppercase">
                ▸ pagamento sicuro · 95% all'autore · 5% costi tecnici
              </p>
            </HudPanel>
          </div>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}

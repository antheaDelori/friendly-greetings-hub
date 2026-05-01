import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudInput, HudButton } from "@/components/HudPanel";
import { books, genres } from "@/data/books";

export const Route = createFileRoute("/gestione")({
  head: () => ({
    meta: [
      { title: "Gestione opere — Liberiamo la mente" },
      { name: "description", content: "Crea, modifica, sostituisci, elimina o pubblica le tue opere." },
    ],
  }),
  component: GestionePage,
});

function GestionePage() {
  const [selected, setSelected] = useState(books[0].slug);
  const myBooks = books.slice(0, 5);
  const current = myBooks.find((b) => b.slug === selected) ?? myBooks[0];

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell code="// MODULE/WORK_MGMT" title="Gestione opere" subtitle="Scrivi, modifica, pubblica. Tutto da qui.">
        {/* Filter bar */}
        <div className="glass p-5 hud-frame mb-6 flex flex-col md:flex-row gap-4 md:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <span className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase self-center mr-2">// genere:</span>
            {genres.map((g) => (
              <button key={g.value} className="font-mono text-[10px] tracking-widest uppercase px-3 py-1.5 border border-cyan/30 text-bone/70 hover:border-cyan hover:text-cyan transition-all">
                ◆ {g.label}
              </button>
            ))}
          </div>
          <div className="flex-1 max-w-sm">
            <input placeholder="cerca titolo..." className="w-full bg-void/40 border border-cyan/30 px-4 py-2 font-mono text-sm text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan" />
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* Lista opere */}
          <HudPanel label="opere" code={`${myBooks.length}`} tone="cyan">
            <ul className="space-y-2">
              {myBooks.map((b) => (
                <li key={b.slug}>
                  <button
                    onClick={() => setSelected(b.slug)}
                    className={`w-full text-left p-3 border transition-all ${
                      selected === b.slug
                        ? "border-cyan bg-cyan/15 text-cyan"
                        : "border-cyan/15 text-bone/70 hover:border-cyan/50 hover:text-bone"
                    }`}
                  >
                    <div className="font-display text-sm tracking-tight truncate">{b.title}</div>
                    <div className="font-mono text-[9px] tracking-widest opacity-60 uppercase mt-1">{b.genre} · {b.year}</div>
                  </button>
                </li>
              ))}
            </ul>
            <button className="mt-4 w-full font-mono text-[10px] tracking-widest text-magenta uppercase border border-magenta/40 py-2 hover:bg-magenta/10 transition-colors">
              ◆ + nuova opera
            </button>
          </HudPanel>

          {/* Editor */}
          <HudPanel label="editor" code={`ID:${current.slug.slice(0,6).toUpperCase()}`}>
            <div className="flex items-start gap-5">
              <img src={current.cover} alt="" className="w-24 h-32 object-cover ring-1 ring-cyan/30 hud-frame" />
              <div className="flex-1">
                <div className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase">// {current.genre} · {current.year}</div>
                <h3 className="mt-1 font-display text-2xl text-bone tracking-tight">{current.title}</h3>
                <p className="mt-2 font-serif italic text-bone/70">{current.tagline}</p>
              </div>
            </div>

            <div className="hud-divider my-6" />

            <div className="grid sm:grid-cols-2 gap-5">
              <HudInput label="Titolo" value={current.title} />
              <HudInput label="Anno" value={String(current.year)} />
            </div>
            <div className="mt-5">
              <span className="font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase">↳ contenuto</span>
              <textarea
                className="mt-2 w-full min-h-48 bg-void/40 border border-cyan/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan transition-all"
                defaultValue={current.chapters[0]?.content[0]}
              />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <HudButton variant="primary">▸ Nuovo</HudButton>
              <HudButton variant="ghost">◆ Modifica</HudButton>
              <HudButton variant="ghost">↻ Sostituisci</HudButton>
              <HudButton variant="ghost">⊗ Elimina</HudButton>
              <HudButton variant="ghost">◉ Preview</HudButton>
              <HudButton variant="magenta" className="ml-auto">▸▸ Pubblica</HudButton>
            </div>
          </HudPanel>
        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}

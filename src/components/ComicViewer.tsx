import { useState, useEffect, useCallback } from "react";

type Pagina = { id: string; ordine: number; image_url: string };

export function ComicViewer({ pagine, supabaseUrl }: { pagine: Pagina[]; supabaseUrl: string }) {
  const [current, setCurrent] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const total = pagine.length;
  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(total - 1, c + 1)), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
      if (e.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  if (total === 0) return (
    <div className="flex items-center justify-center py-20">
      <p className="font-mono text-[11px] tracking-widest text-ink/40 uppercase">Nessuna pagina disponibile</p>
    </div>
  );

  const page = pagine[current];
  const imgUrl = `${supabaseUrl}/storage/v1/object/authenticated/libri/${page.image_url}`;

  return (
    <div className="flex flex-col items-center gap-6 py-8 select-none">

      {/* Contatore */}
      <div className="font-mono text-[10px] tracking-[0.3em] text-ink/40 uppercase">
        {current + 1} / {total}
      </div>

      {/* Immagine */}
      <div
        className="relative w-full max-w-2xl cursor-pointer"
        onClick={e => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          if (x > rect.width / 2) next(); else prev();
        }}
      >
        <img
          src={imgUrl}
          alt={`Pagina ${current + 1}`}
          className={`w-full object-contain transition-all ${zoomed ? "cursor-zoom-out" : "cursor-pointer"}`}
          onDoubleClick={() => setZoomed(z => !z)}
          style={zoomed ? { transform: "scale(1.8)", transformOrigin: "center top" } : {}}
          draggable={false}
        />
        {/* Zone click sinistra/destra invisibili */}
        <div className="absolute inset-y-0 left-0 w-1/2" />
        <div className="absolute inset-y-0 right-0 w-1/2" />
      </div>

      {/* Controlli */}
      <div className="flex items-center gap-6">
        <button
          onClick={prev} disabled={current === 0}
          className="font-mono text-[10px] uppercase tracking-widest border border-ink/20 px-4 py-2 text-ink/50 hover:border-ink/60 hover:text-ink/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          ← Precedente
        </button>

        {/* Miniature navigazione rapida */}
        <div className="flex gap-1.5 max-w-xs overflow-x-auto">
          {pagine.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setCurrent(i)}
              className={`w-8 h-1.5 flex-shrink-0 transition-colors ${i === current ? "bg-ink/80" : "bg-ink/15 hover:bg-ink/40"}`}
            />
          ))}
        </div>

        <button
          onClick={next} disabled={current === total - 1}
          className="font-mono text-[10px] uppercase tracking-widest border border-ink/20 px-4 py-2 text-ink/50 hover:border-ink/60 hover:text-ink/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          Successiva →
        </button>
      </div>

      <p className="font-mono text-[9px] text-ink/25 tracking-widest">
        click sinistra / destra per sfogliare · doppio click per zoom · ← → per tastiera
      </p>
    </div>
  );
}

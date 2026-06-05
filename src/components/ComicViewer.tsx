import { useState, useEffect, useCallback } from "react";

type Pagina = { id: string; ordine: number; image_url: string };
type Formato = "a4v" | "a4h" | "manga";

export function ComicViewer({ pagine, supabaseUrl, formato = "a4v" }: {
  pagine: Pagina[];
  supabaseUrl: string;
  formato?: Formato;
}) {
  const [current, setCurrent] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const total = pagine.length;
  const isManga = formato === "manga";
  const isLandscape = formato === "a4h";

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(total - 1, c + 1)), [total]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") isManga ? prev() : next();
      if (e.key === "ArrowLeft") isManga ? next() : prev();
      if (e.key === "ArrowDown") next();
      if (e.key === "ArrowUp") prev();
      if (e.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, isManga]);

  if (total === 0) return (
    <div className="flex items-center justify-center py-20">
      <p className="font-mono text-[11px] tracking-widest text-ink/40 uppercase">Nessuna pagina disponibile</p>
    </div>
  );

  const orderedPagine = isManga ? [...pagine].reverse() : pagine;
  const page = orderedPagine[current];
  const imgUrl = page.image_url;

  return (
    <div className="flex flex-col select-none py-4 px-2 gap-3">

      {/* Barra di controllo superiore: sempre visibile */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <button
          onClick={isManga ? next : prev}
          disabled={isManga ? current === total - 1 : current === 0}
          className="font-mono text-[10px] uppercase tracking-widest border border-ink/20 px-4 py-2 text-ink/50 hover:border-ink/60 hover:text-ink/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isManga ? "→ Prec" : "← Prec"}
        </button>

        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[9px] tracking-widest text-ink/25 uppercase border border-ink/15 px-2 py-0.5 whitespace-nowrap">
              {formato === "a4v" ? "A4 verticale" : formato === "a4h" ? "A4 orizzontale" : "Manga"}
              {isManga && " · ←"}
            </span>
            <span className="font-mono text-[10px] tracking-[0.3em] text-ink/40 uppercase">
              {current + 1} / {total}
            </span>
          </div>

          {/* Icona info con tooltip */}
          <div className="relative group">
            <span className="font-mono text-[11px] text-ink/30 hover:text-ink/60 cursor-default select-none transition-colors">ⓘ</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-64 bg-void border border-ink/20 px-3 py-2 shadow-lg">
              <p className="font-mono text-[9px] tracking-wide text-ink/60 leading-relaxed">
                Click sinistra / destra per sfogliare<br />
                Doppio click per zoom<br />
                ← → per tastiera{isManga && "\nDirezione manga →←"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={isManga ? prev : next}
          disabled={isManga ? current === 0 : current === total - 1}
          className="font-mono text-[10px] uppercase tracking-widest border border-ink/20 px-4 py-2 text-ink/50 hover:border-ink/60 hover:text-ink/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isManga ? "← Succ" : "Succ →"}
        </button>
      </div>

      {/* Immagine vincolata all'altezza disponibile */}
      <div
        className={`flex justify-center ${isLandscape ? "w-full" : ""}`}
        onClick={e => {
          if (zoomed) return;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const clickRight = x > rect.width / 2;
          if (isManga) { if (clickRight) prev(); else next(); }
          else { if (clickRight) next(); else prev(); }
        }}
      >
        <img
          src={imgUrl}
          alt={`Pagina ${current + 1}`}
          className={`object-contain cursor-pointer transition-all ${isLandscape ? "w-full" : "max-w-2xl w-full"}`}
          style={{
            maxHeight: "calc(100dvh - 220px)",
            ...(zoomed ? { transform: "scale(1.8)", transformOrigin: "center top", cursor: "zoom-out" } : {}),
          }}
          onDoubleClick={() => setZoomed(z => !z)}
          draggable={false}
        />
      </div>

      {/* Miniature navigazione rapida */}
      <div className="flex gap-1.5 justify-center overflow-x-auto flex-shrink-0 py-1">
        {orderedPagine.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setCurrent(i)}
            className={`w-8 h-1.5 flex-shrink-0 transition-colors ${i === current ? "bg-ink/80" : "bg-ink/15 hover:bg-ink/40"}`}
          />
        ))}
      </div>

    </div>
  );
}

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
  // Manga: direzione invertita (destra → sinistra)
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

  const page = pagine[current];
  const imgUrl = page.image_url; // URL pubblico completo salvato nel DB

  // Larghezza container: landscape usa tutta la larghezza disponibile
  const containerClass = isLandscape
    ? "relative w-full cursor-pointer"
    : "relative w-full max-w-2xl cursor-pointer";

  return (
    <div className={`flex flex-col items-center gap-6 py-8 select-none ${isLandscape ? "px-0" : ""}`}>

      {/* Formato badge + contatore */}
      <div className="flex items-center gap-4">
        <span className="font-mono text-[9px] tracking-widest text-ink/25 uppercase border border-ink/15 px-2 py-0.5">
          {formato === "a4v" ? "A4 verticale" : formato === "a4h" ? "A4 orizzontale" : "Manga"}
          {isManga && " · ←"}
        </span>
        <span className="font-mono text-[10px] tracking-[0.3em] text-ink/40 uppercase">
          {current + 1} / {total}
        </span>
      </div>

      {/* Immagine */}
      <div
        className={containerClass}
        onClick={e => {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const clickRight = x > rect.width / 2;
          // Manga: click destra = pagina precedente (direzione giapponese)
          if (isManga) { if (clickRight) prev(); else next(); }
          else { if (clickRight) next(); else prev(); }
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
      </div>

      {/* Controlli */}
      <div className="flex items-center gap-6 flex-wrap justify-center">
        <button
          onClick={isManga ? next : prev} disabled={isManga ? current === total - 1 : current === 0}
          className="font-mono text-[10px] uppercase tracking-widest border border-ink/20 px-4 py-2 text-ink/50 hover:border-ink/60 hover:text-ink/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          {isManga ? "→ Precedente" : "← Precedente"}
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
          onClick={isManga ? prev : next} disabled={isManga ? current === 0 : current === total - 1}
          className="font-mono text-[10px] uppercase tracking-widest border border-ink/20 px-4 py-2 text-ink/50 hover:border-ink/60 hover:text-ink/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          {isManga ? "← Successiva" : "Successiva →"}
        </button>
      </div>

      <p className="font-mono text-[9px] text-ink/25 tracking-widest text-center">
        click sinistra / destra per sfogliare · doppio click per zoom · ← → per tastiera
        {isManga && " · direzione manga →←"}
      </p>
    </div>
  );
}

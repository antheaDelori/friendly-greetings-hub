import { useState, useEffect, useCallback, useRef } from "react";

type Pagina = { id: string; ordine: number; image_url: string; testo?: string | null };
type Formato = "a4v" | "a4h" | "manga" | "illustrato";

export function ComicViewer({ pagine, formato = "a4v" }: {
  pagine: Pagina[];
  formato?: Formato;
}) {
  const [current, setCurrent] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = pagine.length;
  const isManga = formato === "manga";
  const isLandscape = formato === "a4h";
  const isIllustrato = formato === "illustrato";

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(total - 1, c + 1)), [total]);

  const dismissHint = useCallback(() => {
    setShowHint(false);
    if (hintTimer.current) clearTimeout(hintTimer.current);
  }, []);

  useEffect(() => {
    hintTimer.current = setTimeout(() => setShowHint(false), 3500);
    return () => { if (hintTimer.current) clearTimeout(hintTimer.current); };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showHint) dismissHint();
      if (e.key === "ArrowRight") isManga ? prev() : next();
      if (e.key === "ArrowLeft") isManga ? next() : prev();
      if (e.key === "ArrowDown") next();
      if (e.key === "ArrowUp") prev();
      if (e.key === "Escape") { setZoomed(false); setFullscreen(false); }
      if (e.key === "f" || e.key === "F") setFullscreen(f => !f);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, isManga, showHint, dismissHint]);

  if (total === 0) return (
    <div className="flex items-center justify-center py-20">
      <p className="font-mono text-[11px] tracking-widest text-ink/40 uppercase">Nessuna pagina disponibile</p>
    </div>
  );

  const orderedPagine = isManga ? [...pagine].reverse() : pagine;
  const page = orderedPagine[current];
  const imgUrl = page.image_url;

  const imgMaxHeight = fullscreen ? "calc(100dvh - 100px)" : "calc(100dvh - 250px)";

  // Layout illustrato: due colonne testo + immagine
  if (isIllustrato) {
    return (
      <div className="flex flex-col select-none pb-4 gap-4">
        {/* Navigazione */}
        <div className="flex items-center justify-between gap-3">
          <button onClick={prev} disabled={current === 0}
            className="font-mono text-[10px] uppercase tracking-widest border border-ink/20 px-4 py-2 text-ink/50 hover:border-ink/60 hover:text-ink/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
            ← Prec
          </button>
          <span className="font-mono text-[10px] tracking-[0.3em] text-ink/40 uppercase">{current + 1} / {total}</span>
          <button onClick={next} disabled={current === total - 1}
            className="font-mono text-[10px] uppercase tracking-widest border border-ink/20 px-4 py-2 text-ink/50 hover:border-ink/60 hover:text-ink/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed">
            Succ →
          </button>
        </div>

        {/* Due colonne */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Testo */}
          <div className="font-serif text-ink/85 leading-relaxed text-base md:text-lg whitespace-pre-wrap order-2 md:order-1">
            {page.testo || <span className="italic text-ink/30">Nessun testo per questa pagina.</span>}
          </div>
          {/* Immagine */}
          <div className="order-1 md:order-2">
            <img src={imgUrl} alt={`Pagina ${current + 1}`}
              className="w-full object-contain border border-ink/10"
              draggable={false} />
          </div>
        </div>

        {/* Miniature */}
        <div className="flex gap-1.5 justify-center overflow-x-auto py-1">
          {orderedPagine.map((p, i) => (
            <button key={p.id} onClick={() => setCurrent(i)}
              className={`w-8 h-1.5 flex-shrink-0 transition-colors ${i === current ? "bg-ink/80" : "bg-ink/15 hover:bg-ink/40"}`} />
          ))}
        </div>
      </div>
    );
  }

  const containerClass = fullscreen
    ? "fixed inset-0 z-50 bg-void flex flex-col select-none px-4 py-3 gap-3"
    : "flex flex-col select-none pt-0 pb-4 px-2 gap-3";

  return (
    <div className={containerClass}>

      {/* Barra di controllo superiore */}
      <div className="flex items-center justify-between gap-3 flex-shrink-0">
        <button
          onClick={isManga ? next : prev}
          disabled={isManga ? current === total - 1 : current === 0}
          className="font-mono text-[10px] uppercase tracking-widest border border-ink/20 px-4 py-2 text-ink/50 hover:border-ink/60 hover:text-ink/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {isManga ? "← Succ" : "← Prec"}
        </button>

        <div className="flex items-center gap-3 min-w-0">
          <div className="flex flex-col items-center gap-1">
            <span className="font-mono text-[9px] tracking-widest text-ink/25 uppercase border border-ink/15 px-2 py-0.5 whitespace-nowrap">
              {formato === "a4v" ? "A4 verticale" : formato === "a4h" ? "A4 orizzontale" : formato === "manga" ? "Manga" : "Illustrato"}
              {isManga && " · ←"}
            </span>
            <span className="font-mono text-[10px] tracking-[0.3em] text-ink/40 uppercase">
              {isManga ? `${total} / ${current + 1}` : `${current + 1} / ${total}`}
            </span>
          </div>

          {/* Icona info con tooltip */}
          <div className="relative group">
            <span className="font-mono text-[13px] text-ink/50 hover:text-ink/80 cursor-default select-none transition-colors">ⓘ</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-64 bg-void border border-ink/30 px-3 py-2 shadow-lg">
              <p className="font-mono text-[9px] tracking-wide text-ink/70 leading-relaxed">
                {isManga ? "Click sinistro = pagina successiva" : "Click sinistro = pagina precedente"}<br />
                {isManga ? "Click destro = pagina precedente" : "Click destro = pagina successiva"}<br />
                Doppio click per zoom · F fullscreen
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pulsante fullscreen */}
          <button
            onClick={() => setFullscreen(f => !f)}
            title={fullscreen ? "Esci dal fullscreen" : "Fullscreen"}
            className="font-mono text-[10px] uppercase tracking-widest border border-ink/20 px-3 py-2 text-ink/40 hover:border-ink/60 hover:text-ink/80 transition-colors"
          >
            {fullscreen ? "⊠" : "⊞"}
          </button>

          <button
            onClick={isManga ? prev : next}
            disabled={isManga ? current === 0 : current === total - 1}
            className="font-mono text-[10px] uppercase tracking-widest border border-ink/20 px-4 py-2 text-ink/50 hover:border-ink/60 hover:text-ink/80 transition-colors disabled:opacity-20 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isManga ? "Prec →" : "Succ →"}
          </button>
        </div>
      </div>

      {/* Immagine con overlay hint al primo caricamento */}
      <div
        className={`relative flex justify-center ${isLandscape || fullscreen ? "w-full flex-1 min-h-0" : ""}`}
        onClick={e => {
          if (showHint) { dismissHint(); return; }
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
          className={`object-contain cursor-pointer transition-all ${isLandscape || fullscreen ? "w-full h-full" : "max-w-2xl w-full"}`}
          style={{
            maxHeight: imgMaxHeight,
            ...(zoomed ? { transform: "scale(1.8)", transformOrigin: "center top", cursor: "zoom-out" } : {}),
          }}
          onDoubleClick={() => setZoomed(z => !z)}
          draggable={false}
        />

        {/* Overlay hint iniziale — solo per formato verticale/manga, senza animazioni */}
        {showHint && !isLandscape && (
          <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
            <div className="bg-void/85 border border-ink/20 px-5 py-3 backdrop-blur-sm">
              <p className="font-mono text-[10px] tracking-widest text-bone/80 uppercase text-center leading-relaxed">
                ← → sfoglia · doppio click zoom · F fullscreen
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Legenda statica per formato orizzontale — visibile nello spazio sotto l'immagine */}
      {isLandscape && (
        <div className="flex justify-center flex-shrink-0">
          <p className="font-mono text-[9px] tracking-widest text-ink/40 uppercase text-center">
            ← → sfoglia · doppio click zoom · F fullscreen
            {isManga && " · direzione manga →←"}
          </p>
        </div>
      )}

      {/* Miniature navigazione rapida — invertite per manga (cover a destra) */}
      <div className={`flex gap-1.5 justify-center overflow-x-auto flex-shrink-0 py-1 ${isManga ? "flex-row-reverse" : ""}`}>
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

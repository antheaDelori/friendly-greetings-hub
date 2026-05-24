import { Link } from "@tanstack/react-router";
import type { Book } from "@/data/books";

type LibreriaStato = "da_leggere" | "in_lettura" | "letto";

const genreColor: Record<string, string> = {
  libro: "text-cyan border-cyan/60",
  racconto: "text-magenta border-magenta/60",
  saggio: "text-amber border-amber/60",
  articolo: "text-bone border-bone/40",
};

/** Crepe nel vetro della teca — appare quando il libro è stato letto */
function CrackedGlass() {
  return (
    <div
      className="absolute inset-0 pointer-events-none group-hover:opacity-20 transition-opacity duration-700 overflow-hidden"
      style={{ zIndex: 8 }}
    >
      {/* Punto di impatto — bagliore */}
      <div className="absolute rounded-full" style={{
        bottom: "23%", left: "13%",
        width: "5px", height: "5px",
        background: "rgba(220,245,255,1)",
        boxShadow: "0 0 6px 3px rgba(180,225,255,0.8), 0 0 14px 7px rgba(160,210,255,0.35)",
        transform: "translate(-50%, 50%)"
      }} />
      {/* Crepa principale — sale verso l'alto */}
      <div className="absolute" style={{
        bottom: "23%", left: "13%",
        width: "1.5px", height: "56%",
        background: "linear-gradient(to top, rgba(210,245,255,0.95) 0%, rgba(185,230,255,0.65) 55%, transparent 100%)",
        transform: "rotate(14deg)",
        transformOrigin: "bottom center",
        filter: "blur(0.4px)"
      }} />
      {/* Crepa verso sinistra */}
      <div className="absolute" style={{
        bottom: "23%", left: "13%",
        width: "1px", height: "28%",
        background: "linear-gradient(to top, rgba(185,230,255,0.85) 0%, rgba(185,230,255,0.4) 50%, transparent 100%)",
        transform: "rotate(-28deg)",
        transformOrigin: "bottom center",
        filter: "blur(0.3px)"
      }} />
      {/* Diramazione a metà */}
      <div className="absolute" style={{
        bottom: "48%", left: "18%",
        width: "1px", height: "20%",
        background: "linear-gradient(to top, rgba(185,230,255,0.7) 0%, transparent 100%)",
        transform: "rotate(42deg)",
        transformOrigin: "bottom center",
        filter: "blur(0.3px)"
      }} />
      {/* Scheggia piccola */}
      <div className="absolute" style={{
        bottom: "33%", left: "9%",
        width: "0.5px", height: "11%",
        background: "linear-gradient(to top, rgba(200,240,255,0.55) 0%, transparent 100%)",
        transform: "rotate(-6deg)",
        transformOrigin: "bottom center"
      }} />
      {/* Riflesso all'intersezione */}
      <div className="absolute rounded-full" style={{
        bottom: "48%", left: "17%",
        width: "2px", height: "2px",
        background: "rgba(210,245,255,0.9)",
        boxShadow: "0 0 3px 1px rgba(185,230,255,0.5)"
      }} />
    </div>
  );
}

export function BookCard({ book, compact = false, libreriaStato = null, onLibreriaChange, isLoggedIn = false }: {
  book: Book;
  compact?: boolean;
  libreriaStato?: LibreriaStato | null;
  onLibreriaChange?: (stato: LibreriaStato | null) => void;
  isLoggedIn?: boolean;
}) {
  const hasLastra = Boolean(book.lastra);
  const isLetto = libreriaStato === "letto";

  return (
    <Link
      to="/leggi/$slug"
      params={{ slug: book.slug }}
      className="group relative flex flex-col glass holo-hover hover:glow-cyan"
    >
      {/* HUD corners */}
      <span className="absolute top-1.5 left-1.5 w-3 h-3 border-l border-t border-cyan/70 z-10" />
      <span className="absolute top-1.5 right-1.5 w-3 h-3 border-r border-t border-cyan/70 z-10" />
      <span className="absolute bottom-1.5 left-1.5 w-3 h-3 border-l border-b border-cyan/70 z-10" />
      <span className="absolute bottom-1.5 right-1.5 w-3 h-3 border-r border-b border-cyan/70 z-10" />

      <div className="relative aspect-[3/4] overflow-hidden bg-void">

        {/* Copertina reale */}
        <img
          src={book.cover}
          alt={book.title}
          className={`absolute inset-0 h-full w-full object-contain transition-all duration-700 group-hover:scale-105 ${
            hasLastra
              ? "opacity-0 group-hover:opacity-100"
              : isLetto
                ? "saturate-[45%] brightness-[0.65] group-hover:saturate-100 group-hover:brightness-100"
                : "saturate-[30%] brightness-[0.55] group-hover:saturate-100 group-hover:brightness-100"
          }`}
        />

        {/* Lastra — si dissolve all'hover */}
        {hasLastra && (
          <img
            src={book.lastra}
            alt=""
            className="absolute inset-0 h-full w-full object-contain transition-opacity duration-700 group-hover:opacity-0"
          />
        )}

        {/* Effetto vetro museo — intatto o in frantumi */}
        {!hasLastra && (
          isLetto ? (
            /* Vetro in frantumi: overlay scuro ridotto + crepe */
            <div
              className="absolute inset-0 group-hover:opacity-0 transition-opacity duration-700 pointer-events-none"
              style={{
                background: "linear-gradient(to bottom, rgba(8,18,55,0.28) 0%, rgba(4,22,60,0.06) 55%, rgba(8,18,55,0.22) 100%)",
              }}
            />
          ) : (
            /* Vetro intatto */
            <>
              <div
                className="absolute inset-0 group-hover:opacity-0 transition-opacity duration-700 pointer-events-none"
                style={{
                  background: [
                    "radial-gradient(ellipse 65% 35% at 50% 5%, rgba(210,238,255,0.55) 0%, rgba(180,220,255,0.15) 55%, transparent 100%)",
                    "linear-gradient(135deg, rgba(220,240,255,0.13) 0%, transparent 35%)",
                    "linear-gradient(to bottom, rgba(8,18,55,0.58) 0%, rgba(4,22,60,0.22) 55%, rgba(8,18,55,0.50) 100%)",
                  ].join(", "),
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/20 via-transparent to-magenta/15 mix-blend-overlay group-hover:opacity-30 transition-opacity duration-700" />
            </>
          )
        )}

        {/* Crepe sulla lastra (se ha lastra ed è letto) */}
        {hasLastra && isLetto && <CrackedGlass />}

        {/* Crepe sul vetro (se non ha lastra ed è letto) */}
        {!hasLastra && isLetto && <CrackedGlass />}

        {/* Scanlines — sempre */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent 0, transparent 2px, oklch(0.82 0.16 200 / 0.06) 2px, oklch(0.82 0.16 200 / 0.06) 3px)"
        }} />

        <span
          className={`absolute top-3 left-3 ${genreColor[book.genre]} bg-void/70 backdrop-blur font-mono tracking-[0.2em] text-[9px] uppercase px-2 py-1 border z-10`}
        >
          ◆ {book.genre}
        </span>

        <div className="absolute top-3 right-3 font-mono text-[9px] tracking-widest text-cyan/80 z-10">
          ID:{book.slug.slice(0, 6).toUpperCase()}
        </div>

        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-void via-void/70 to-transparent" />
      </div>

      <div className={`p-3 flex flex-col flex-1 relative ${compact ? "p-3" : "p-4"}`}>
        <h3 className={`font-display text-bone leading-tight tracking-tight group-hover:text-cyan group-hover:text-glow-cyan transition-all ${compact ? "text-sm" : "text-lg"}`}>
          {book.title}
        </h3>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-cyan/70 truncate">
          ↳ {book.author}
        </p>
        {!compact && (
          <>
            <p className="mt-3 font-serif italic text-[14px] text-bone/65 line-clamp-2 flex-1 leading-snug">
              {book.tagline}
            </p>
            <div className="mt-4 pt-3 border-t border-cyan/15 flex items-center justify-between font-mono text-[10px] tracking-widest text-bone/50">
              <span>{book.reads.toLocaleString("it-IT")} READS</span>
              <span className="text-amber">{book.rating > 0 ? `★ ${book.rating.toFixed(1)}` : "✦ new"}</span>
              <span className="text-cyan/60">{book.year}</span>
            </div>
            {isLoggedIn && onLibreriaChange && (
              <div className="mt-2 pt-2 border-t border-cyan/10">
                {isLetto ? (
                  <span className="w-full block font-mono text-[9px] tracking-widest uppercase py-1.5 text-center text-cyan/50">
                    ✓ Letto
                  </span>
                ) : libreriaStato ? (
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[9px] tracking-widest uppercase py-1.5 text-cyan/50">
                      ✓ In libreria
                    </span>
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); onLibreriaChange("letto"); }}
                      className="font-mono text-[9px] tracking-widest uppercase py-1.5 text-bone/30 hover:text-cyan transition-colors cursor-pointer"
                    >
                      ◈ Segna come letto
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); onLibreriaChange("da_leggere"); }}
                      className="font-mono text-[9px] tracking-widest uppercase py-1.5 text-bone/35 hover:text-cyan transition-colors cursor-pointer"
                    >
                      ◈ Aggiungi alla libreria
                    </button>
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); onLibreriaChange("letto"); }}
                      className="font-mono text-[9px] tracking-widest uppercase py-1.5 text-bone/25 hover:text-cyan transition-colors cursor-pointer"
                    >
                      ✓ Letto
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Link>
  );
}

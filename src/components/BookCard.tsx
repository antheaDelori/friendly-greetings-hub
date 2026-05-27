import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { Book } from "@/data/books";

type LibreriaStato = "da_leggere" | "in_lettura" | "letto";

const genreColor: Record<string, string> = {
  libro: "text-cyan border-cyan/60",
  racconto: "text-magenta border-magenta/60",
  saggio: "text-amber border-amber/60",
  articolo: "text-bone border-bone/40",
};

// Teche sistema — overlay PNG trasparenti
const TECA_INTERA = "https://fgdekayammkldwkxqutd.supabase.co/storage/v1/object/public/copertine/brand/teca%20intera.png";
const TECA_ROTTA  = "https://fgdekayammkldwkxqutd.supabase.co/storage/v1/object/public/copertine/brand/teca%20rotta.png";

export function BookCard({ book, compact = false, libreriaStato = null, onLibreriaChange, isLoggedIn = false }: {
  book: Book;
  compact?: boolean;
  libreriaStato?: LibreriaStato | null;
  onLibreriaChange?: (stato: LibreriaStato | null) => void;
  isLoggedIn?: boolean;
}) {
  const isLetto = libreriaStato === "letto";
  const [coverLoaded, setCoverLoaded] = useState(false);

  // Copertine generate dal NUOVO sistema (teca già baked-in server-side):
  // riconoscibili dal parametro ?v=teca nel futuro — per ora mostriamo overlay per tutti
  const showOverlay = !book.cover.includes("?v=teca");

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

      {/* Image area */}
      <div className="relative aspect-[3/4] overflow-hidden bg-void mx-1.5 mt-1.5">

        {/* Copertina — per copertine con teca baked-in: full fill; per le altre: finestra interna */}
        <div className={`absolute ${!showOverlay ? "inset-0" : "left-[31%] right-[18%] top-[15%] bottom-[18%]"} overflow-hidden`}>
          <img
            src={book.cover}
            alt={book.title}
            onLoad={() => setCoverLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-700 ${
              !coverLoaded
                ? "opacity-0"
                : isLetto
                  ? "saturate-[55%] brightness-[0.70] group-hover:saturate-100 group-hover:brightness-100"
                  : "saturate-[35%] brightness-[0.60] group-hover:saturate-100 group-hover:brightness-100"
            }`}
          />
        </div>

        {/* Teca intera — visibile se non letto e overlay abilitato */}
        {showOverlay && (
          <img
            src={TECA_INTERA}
            alt=""
            className={`absolute inset-0 w-full h-full object-fill pointer-events-none transition-opacity duration-700 ${
              isLetto ? "opacity-0" : "group-hover:opacity-0"
            }`}
            style={{ zIndex: 7 }}
          />
        )}

        {/* Teca rotta — visibile se letto e overlay abilitato */}
        {showOverlay && (
          <img
            src={TECA_ROTTA}
            alt=""
            className={`absolute inset-0 w-full h-full object-fill pointer-events-none transition-opacity duration-700 ${
              !isLetto ? "opacity-0" : "group-hover:opacity-0"
            }`}
            style={{ zIndex: 7 }}
          />
        )}

        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent 0, transparent 2px, oklch(0.82 0.16 200 / 0.06) 2px, oklch(0.82 0.16 200 / 0.06) 3px)"
        }} />

        <span className={`absolute top-3 left-3 ${genreColor[book.genre]} bg-void/70 backdrop-blur font-mono tracking-[0.2em] text-[9px] uppercase px-2 py-1 border z-10`}>
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

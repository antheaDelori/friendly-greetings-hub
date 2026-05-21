import { Link } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import type { Book } from "@/data/books";

type LibreriaStato = "da_leggere" | "in_lettura" | "letto";

const STATO_LABEL: Record<LibreriaStato, string> = {
  da_leggere: "Da leggere",
  in_lettura: "In lettura",
  letto: "Letto ✓",
};

const STATO_COLOR: Record<LibreriaStato, string> = {
  da_leggere: "text-cyan",
  in_lettura: "text-amber",
  letto: "text-magenta",
};

const genreColor: Record<string, string> = {
  libro: "text-cyan border-cyan/60",
  racconto: "text-magenta border-magenta/60",
  saggio: "text-amber border-amber/60",
  articolo: "text-bone border-bone/40",
};

export function BookCard({ book, compact = false, libreriaStato = null, onLibreriaChange, isLoggedIn = false }: {
  book: Book;
  compact?: boolean;
  libreriaStato?: LibreriaStato | null;
  onLibreriaChange?: (stato: LibreriaStato | null) => void;
  isLoggedIn?: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);
  const hasLastra = Boolean(book.lastra);

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

        {/* Copertina reale — sempre presente, appare all'hover */}
        <img
          src={book.cover}
          alt={book.title}
          className={`absolute inset-0 h-full w-full object-contain transition-all duration-700 group-hover:scale-105 ${
            hasLastra
              ? "opacity-0 group-hover:opacity-100"
              : "saturate-[30%] brightness-[0.55] group-hover:saturate-100 group-hover:brightness-100"
          }`}
        />

        {/* Lastra — visibile di default, si dissolve all'hover */}
        {hasLastra && (
          <img
            src={book.lastra}
            alt=""
            className="absolute inset-0 h-full w-full object-contain transition-opacity duration-700 group-hover:opacity-0"
          />
        )}

        {/* Effetto vetro museo — solo se non c'è lastra */}
        {!hasLastra && (
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
        )}

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
                {showMenu ? (
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {(["da_leggere", "in_lettura", "letto"] as LibreriaStato[]).map(s => (
                      <button
                        key={s}
                        onClick={e => { e.preventDefault(); e.stopPropagation(); onLibreriaChange(s); setShowMenu(false); }}
                        className={`flex-1 font-mono text-[8px] tracking-wide uppercase py-1.5 border transition-colors cursor-pointer ${libreriaStato === s ? `${STATO_COLOR[s]} border-current bg-current/10` : "text-bone/40 border-bone/15 hover:text-cyan hover:border-cyan/40"}`}
                      >
                        {s === "da_leggere" ? "Leggere" : s === "in_lettura" ? "Lettura" : "Letto ✓"}
                      </button>
                    ))}
                    {libreriaStato && (
                      <button
                        onClick={e => { e.preventDefault(); e.stopPropagation(); onLibreriaChange(null); setShowMenu(false); }}
                        className="font-mono text-[8px] uppercase px-1.5 py-1.5 border border-magenta/20 text-magenta/40 hover:text-magenta hover:border-magenta/40 transition-colors cursor-pointer"
                      >✕</button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); setShowMenu(true); }}
                    className={`w-full font-mono text-[9px] tracking-widest uppercase py-1.5 text-center transition-colors cursor-pointer ${libreriaStato ? STATO_COLOR[libreriaStato] : "text-bone/35 hover:text-cyan"}`}
                  >
                    {libreriaStato ? `◈ ${STATO_LABEL[libreriaStato]}` : "◈ Aggiungi alla libreria"}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Link>
  );
}

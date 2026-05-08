import { Link } from "@tanstack/react-router";
import type { Book } from "@/data/books";

const genreColor: Record<string, string> = {
  libro: "text-cyan border-cyan/60",
  racconto: "text-magenta border-magenta/60",
  saggio: "text-amber border-amber/60",
  articolo: "text-bone border-bone/40",
};

export function BookCard({ book }: { book: Book }) {
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
        <img
          src={book.cover}
          alt={book.title}
          className="absolute inset-0 h-full w-full object-contain
            saturate-[30%] brightness-[0.55]
            group-hover:saturate-100 group-hover:brightness-100
            group-hover:scale-105 transition-all duration-700"
        />
        {/* vetro museo con punto di luce — sparisce all'hover */}
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
        {/* holo overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan/20 via-transparent to-magenta/15 mix-blend-overlay group-hover:opacity-30 transition-opacity duration-700" />
        <div className="absolute inset-0" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent 0, transparent 2px, oklch(0.82 0.16 200 / 0.06) 2px, oklch(0.82 0.16 200 / 0.06) 3px)"
        }} />

        <span
          className={`absolute top-3 left-3 ${genreColor[book.genre]} bg-void/70 backdrop-blur font-mono tracking-[0.2em] text-[9px] uppercase px-2 py-1 border`}
        >
          ◆ {book.genre}
        </span>

        <div className="absolute top-3 right-3 font-mono text-[9px] tracking-widest text-cyan/80">
          ID:{book.slug.slice(0, 6).toUpperCase()}
        </div>

        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-void via-void/70 to-transparent" />
      </div>
      <div className="p-4 flex flex-col flex-1 relative">
        <h3 className="font-display text-lg text-bone leading-tight tracking-tight group-hover:text-cyan group-hover:text-glow-cyan transition-all">
          {book.title}
        </h3>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-cyan/70">
          ↳ {book.author}
        </p>
        <p className="mt-3 font-serif italic text-[14px] text-bone/65 line-clamp-2 flex-1 leading-snug">
          {book.tagline}
        </p>
        <div className="mt-4 pt-3 border-t border-cyan/15 flex items-center justify-between font-mono text-[10px] tracking-widest text-bone/50">
          <span>{book.reads.toLocaleString("it-IT")} READS</span>
          <span className="text-amber">{book.rating > 0 ? `★ ${book.rating.toFixed(1)}` : "✦ new"}</span>
          <span className="text-cyan/60">{book.year}</span>
        </div>
      </div>
    </Link>
  );
}

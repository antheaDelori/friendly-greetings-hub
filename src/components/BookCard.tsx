import { Link } from "@tanstack/react-router";
import type { Book } from "@/data/books";

const genreColor: Record<string, string> = {
  libro: "bg-ink text-paper",
  racconto: "bg-blood text-paper",
  saggio: "bg-gold text-ink",
  articolo: "bg-paper text-ink border border-ink",
};

export function BookCard({ book }: { book: Book }) {
  return (
    <Link
      to="/leggi/$slug"
      params={{ slug: book.slug }}
      className="group flex flex-col bg-card border border-ink/10 hover:border-blood transition-all duration-300 hover:-translate-y-1 hover:shadow-[6px_6px_0_0_var(--blood)]"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-ink">
        <img
          src={book.cover}
          alt={book.title}
          className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
        />
        <span
          className={`absolute top-3 left-3 ${genreColor[book.genre]} font-display tracking-widest text-[10px] uppercase px-2 py-1`}
        >
          {book.genre}
        </span>
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-ink/90 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 text-paper">
          <div className="font-display text-xs tracking-widest opacity-80">{book.year}</div>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-serif text-xl text-ink leading-tight group-hover:text-blood transition-colors">
          {book.title}
        </h3>
        <p className="mt-1 font-sans text-sm text-muted-foreground italic">
          di {book.author}
        </p>
        <p className="mt-3 font-serif text-[15px] text-ink/75 line-clamp-2 flex-1">
          {book.tagline}
        </p>
        <div className="mt-4 flex items-center justify-between text-xs font-display tracking-widest text-ink/60">
          <span>{book.reads.toLocaleString("it-IT")} letture</span>
          <span className="text-blood">★ {book.rating.toFixed(1)}</span>
        </div>
      </div>
    </Link>
  );
}

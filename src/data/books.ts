export type Genre = "libro" | "racconto" | "saggio" | "articolo" | "buonanotte" | "poesia";

export type Chapter = {
  id: string;
  title: string;
  content: string[];
  isHtml?: boolean;
};

export type Book = {
  slug: string;
  title: string;
  author: string;
  authorSlug: string;
  genre: Genre;
  year: number;
  reads: number;
  rating: number;
  cover: string;
  lastra?: string;
  tagline: string;
  description: string;
  chapters: Chapter[];
};

export const books: Book[] = [];

export const getBookBySlug = (slug: string) =>
  books.find((b) => b.slug === slug);

export const genres: { value: Genre; label: string; tooltip?: string }[] = [
  { value: "libro", label: "Libri" },
  { value: "racconto", label: "Racconti" },
  { value: "saggio", label: "Saggi" },
  { value: "articolo", label: "Articoli" },
  { value: "buonanotte", label: "Novelle" },
  { value: "poesia", label: "Poesie" },
];

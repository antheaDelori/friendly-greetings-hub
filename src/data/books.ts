export type Genre = "libro" | "racconto" | "saggio" | "articolo" | "novelle" | "poesia" | "fumetto";

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
  coverRotta?: string;
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
  { value: "novelle", label: "Novelle" },
  { value: "poesia", label: "Poesie" },
  { value: "fumetto", label: "Fumetti" },
];

export type Genre = "libro" | "racconto" | "saggio" | "articolo" | "novelle" | "poesia" | "fumetto" | "illustrato";

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
  genere: Genre;
  year: number;
  reads: number;
  rating: number;
  cover: string;
  coverRotta?: string;
  lastra?: string;
  video?: string | null;
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
  { value: "illustrato", label: "Illustrati", tooltip: "Cucina · Fotografia · Nature writing · Arte · Manualistica" },
];

export const ALL_GENRES = genres.map(g => g.value) as Genre[];

import logo from "@/assets/logo-liberiamo.jpg";

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

// Cover placeholder: usiamo il logo per gli esempi finché non ci sono copertine vere
const cover = logo;

const lorem = (paragraphs: number, seed: string) =>
  Array.from({ length: paragraphs }, (_, i) =>
    `${seed} — Capitolo immaginario, paragrafo ${i + 1}. Le parole scorrono come inchiostro fresco sulla carta ruvida, raccontando di mondi che esistono solo finché qualcuno è disposto a leggerli. Ogni frase è un patto silenzioso tra chi scrive e chi, dall'altra parte della pagina, decide di credere. La mente si libera quando smette di pretendere risposte e comincia a fare domande migliori.`
  );

export const books: Book[] = [
  {
    slug: "il-silenzio-delle-pagine",
    title: "Il silenzio delle pagine",
    author: "Anthea De Lori",
    authorSlug: "anthea-de-lori",
    genre: "libro",
    year: 2024,
    reads: 12480,
    rating: 4.7,
    cover,
    tagline: "Un romanzo che morde, come il libro nel logo.",
    description:
      "In una città dove leggere è diventato un atto di resistenza, una bibliotecaria clandestina raccoglie pagine strappate dai roghi digitali. Ogni capitolo è un'arma carica di parole.",
    chapters: [
      { id: "c1", title: "I. La biblioteca sotterranea", content: lorem(4, "Il silenzio delle pagine") },
      { id: "c2", title: "II. L'inventario dei dimenticati", content: lorem(4, "Il silenzio delle pagine") },
      { id: "c3", title: "III. Il primo lettore", content: lorem(4, "Il silenzio delle pagine") },
      { id: "c4", title: "IV. Carta contro schermo", content: lorem(4, "Il silenzio delle pagine") },
    ],
  },
  {
    slug: "read-or-perish",
    title: "Read or Perish",
    author: "Daniele Girtanner",
    authorSlug: "daniele-girtanner",
    genre: "saggio",
    year: 2025,
    reads: 8930,
    rating: 4.9,
    cover,
    tagline: "Manifesto per chi rifiuta di lasciare morire la mente.",
    description:
      "Un saggio breve e tagliente sulla fame di lettura nell'era dello scroll infinito. Dodici tesi, dodici capitoli, una sola promessa: leggi, o perisci.",
    chapters: [
      { id: "c1", title: "Tesi I — La mente è un muscolo", content: lorem(3, "Read or Perish") },
      { id: "c2", title: "Tesi II — Lo scroll è veleno lento", content: lorem(3, "Read or Perish") },
      { id: "c3", title: "Tesi III — La carta non si aggiorna", content: lorem(3, "Read or Perish") },
    ],
  },
  {
    slug: "lessico-della-rivolta",
    title: "Lessico della rivolta",
    author: "Iris Conforti",
    authorSlug: "iris-conforti",
    genre: "saggio",
    year: 2024,
    reads: 4200,
    rating: 4.6,
    cover,
    tagline: "Cento parole per smontare il rumore.",
    description:
      "Un dizionario ribelle che ridefinisce cento parole svuotate dall'uso. Da 'algoritmo' a 'verità', un viaggio per riprendersi il significato.",
    chapters: [
      { id: "c1", title: "A — Algoritmo", content: lorem(2, "Lessico della rivolta") },
      { id: "c2", title: "B — Bellezza", content: lorem(2, "Lessico della rivolta") },
      { id: "c3", title: "C — Comunità", content: lorem(2, "Lessico della rivolta") },
    ],
  },
  {
    slug: "geografie-private",
    title: "Geografie private",
    author: "Sara Vivaldi",
    authorSlug: "sara-vivaldi",
    genre: "libro",
    year: 2025,
    reads: 3105,
    rating: 4.3,
    cover,
    tagline: "Un atlante intimo di luoghi mai esistiti.",
    description:
      "Una protagonista cartografa disegna mappe di città inventate per fuggire da quella vera. Finché una mappa, di colpo, comincia a corrispondere.",
    chapters: [
      { id: "c1", title: "Nord", content: lorem(3, "Geografie private") },
      { id: "c2", title: "Est", content: lorem(3, "Geografie private") },
      { id: "c3", title: "Sud", content: lorem(3, "Geografie private") },
      { id: "c4", title: "Ovest", content: lorem(3, "Geografie private") },
    ],
  },
  {
    slug: "appunti-di-un-insonne",
    title: "Appunti di un insonne",
    author: "Tommaso Bevilacqua",
    authorSlug: "tommaso-bevilacqua",
    genre: "articolo",
    year: 2026,
    reads: 2240,
    rating: 4.1,
    cover,
    tagline: "Pensieri scritti tra le 3 e le 5 del mattino.",
    description:
      "Una raccolta di articoli brevi, taglienti, scritti nelle ore in cui il mondo tace. Sull'arte, la politica, la fame di senso.",
    chapters: [
      { id: "c1", title: "Sull'arte di non rispondere subito", content: lorem(2, "Appunti di un insonne") },
      { id: "c2", title: "Sulla noia come materia prima", content: lorem(2, "Appunti di un insonne") },
    ],
  },
  {
    slug: "manuale-del-disertore",
    title: "Manuale del disertore",
    author: "Anthea De Lori",
    authorSlug: "anthea-de-lori",
    genre: "racconto",
    year: 2022,
    reads: 6890,
    rating: 4.5,
    cover,
    tagline: "Storie di chi ha smesso di partecipare al gioco.",
    description:
      "Dodici racconti su persone che, un giorno, hanno deciso di chiudere la porta e leggere un libro. Il mondo, fuori, è andato avanti senza di loro.",
    chapters: [
      { id: "c1", title: "Il dimissionario", content: lorem(2, "Manuale del disertore") },
      { id: "c2", title: "La sposa in fuga", content: lorem(2, "Manuale del disertore") },
      { id: "c3", title: "Il candidato che si è ritirato", content: lorem(2, "Manuale del disertore") },
    ],
  },
  {
    slug: "controcanto",
    title: "Controcanto",
    author: "Iris Conforti",
    authorSlug: "iris-conforti",
    genre: "libro",
    year: 2025,
    reads: 1980,
    rating: 4.2,
    cover,
    tagline: "Romanzo polifonico per voci dissonanti.",
    description:
      "Sette personaggi raccontano lo stesso giorno da prospettive contrastanti. Nessuno mente. Tutti hanno torto.",
    chapters: [
      { id: "c1", title: "Voce I", content: lorem(2, "Controcanto") },
      { id: "c2", title: "Voce II", content: lorem(2, "Controcanto") },
      { id: "c3", title: "Voce III", content: lorem(2, "Controcanto") },
    ],
  },
];

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

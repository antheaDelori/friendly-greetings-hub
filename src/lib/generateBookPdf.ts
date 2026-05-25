/**
 * generateBookPdf.ts
 * Genera un PDF in formato A5 pronto per la stampa.
 * Struttura: occhietto → frontespizio → copyright → capitoli → nota autore
 * Numeri di pagina alternati: dispari (recto) a destra, pari (verso) a sinistra.
 */

import jsPDF from "jspdf";
import type { Book } from "@/data/books";

// ─── Costanti layout ────────────────────────────────────────────────────────

const PW = 148;  // larghezza A5 in mm
const PH = 210;  // altezza A5 in mm
const MT = 22;   // margine superiore
const MB = 25;   // margine inferiore (spazio numero pagina)
const MI = 26;   // margine interno (rilegatura)
const MO = 18;   // margine esterno

const BODY_SIZE   = 11;   // pt corpo testo
const BODY_LEAD   = 6.2;  // mm interlinea
const PARA_SEP    = 3.5;  // mm tra paragrafi

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Converte HTML in testo semplice per la stampa */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Testo del capitolo (HTML o paragrafi plain) */
function chapterPlainText(chapter: Book["chapters"][number]): string {
  if (chapter.isHtml) return stripHtml(chapter.content[0]);
  return chapter.content.join("\n\n");
}

/** Nome file sicuro per il download */
function safeFilename(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "libro"
  );
}

// ─── Generatore principale ───────────────────────────────────────────────────

export async function generateBookPdf(
  book: Book,
  authorBio?: string | null
): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a5" });

  // ── METADATA PDF — marchio d'origine della piattaforma ───────────────────
  // Come il colophon di un editore: identifica la casa editrice, non il lettore.
  doc.setProperties({
    title: book.title,
    author: book.author,
    subject: `${book.genre} — Liberiamo la mente`,
    keywords: `liberiamo2076.com AntheaDelori-Edizioni`,
    creator: "AntheaDelori Edizioni — liberiamo2076.com",
  });

  // Stato paginazione
  let currentPage = 1;
  const FRONT_MATTER_PAGES = 4; // occhietto, blank, frontespizio, copyright

  // Margine sinistro in base a parità pagina
  const ml = (p: number) => (p % 2 === 1 ? MI : MO);
  const mr = (p: number) => (p % 2 === 1 ? MO : MI);
  const cw = (p: number) => PW - ml(p) - mr(p);

  // Aggiunge una pagina e aggiorna il contatore
  const addPage = (): number => {
    doc.addPage();
    currentPage++;
    return currentPage;
  };

  // Linea separatrice sottile
  const hRule = (y: number, p: number) => {
    doc.setDrawColor(180);
    doc.setLineWidth(0.25);
    doc.line(ml(p), y, ml(p) + cw(p), y);
    doc.setDrawColor(0);
  };

  // ── PAGINA 1: Occhietto (recto) ──────────────────────────────────────────
  doc.setFont("times", "italic");
  doc.setFontSize(20);
  doc.setTextColor(0);
  doc.text(book.title, PW / 2, PH / 2 - 8, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("times", "normal");
  doc.text(book.author, PW / 2, PH / 2 + 6, { align: "center" });

  // ── PAGINA 2: Bianca (verso) ──────────────────────────────────────────────
  addPage();

  // ── PAGINA 3: Frontespizio (recto) ───────────────────────────────────────
  addPage();
  {
    const p = 3;
    // Autore in alto
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(80);
    doc.text(book.author, ml(p), MT + 20);
    doc.setTextColor(0);

    // Titolo grande
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    const titleLines = doc.splitTextToSize(book.title, cw(p));
    doc.text(titleLines, ml(p), MT + 38);

    // Tagline / descrizione breve
    if (book.tagline) {
      const tagY = MT + 38 + titleLines.length * 11 + 6;
      doc.setFont("times", "italic");
      doc.setFontSize(11);
      doc.setTextColor(100);
      const tagLines = doc.splitTextToSize(book.tagline, cw(p));
      // Max 3 righe di tagline
      doc.text(tagLines.slice(0, 3), ml(p), tagY);
      doc.setTextColor(0);
    }

    // Linea e colophon in fondo
    hRule(PH - MB - 18, p);
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text("Liberiamo la mente", ml(p), PH - MB - 10);
    doc.text(String(book.year), PW - mr(p), PH - MB - 10, { align: "right" });
    doc.setTextColor(0);
  }

  // ── PAGINA 4: Copyright (verso) ───────────────────────────────────────────
  addPage();
  {
    const p = 4;
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90);

    const copyrightLines = [
      `© ${book.year} ${book.author}`,
      "",
      "Tutti i diritti riservati. Nessuna parte di questo testo",
      "può essere riprodotta o trasmessa in qualsiasi forma",
      "senza il consenso scritto dell'autore.",
      "",
      "Pubblicato su Liberiamo la mente",
      "liberiamo2076.com",
      "",
      "Prima edizione digitale",
      `Genere: ${book.genre}`,
    ];

    let cy = PH - MB - copyrightLines.length * 5 - 10;
    for (const line of copyrightLines) {
      doc.text(line, ml(p), cy);
      cy += 5;
    }
    doc.setTextColor(0);
  }

  // ── CAPITOLI ──────────────────────────────────────────────────────────────

  // Prima pagina dei capitoli = 5 (sempre recto/dispari)
  const chapterFirstPage = FRONT_MATTER_PAGES + 1;

  // Ogni capitolo inizia su pagina dispari (recto)
  const startChapterPage = (): number => {
    addPage();
    if (currentPage % 2 === 0) addPage(); // se pari, aggiungi pagina bianca → recto
    return currentPage;
  };

  // Scrive righe di testo (body) con gestione automatica nuova pagina
  // Restituisce la y finale
  const writeTextLines = (
    lines: string[],
    startY: number,
    startP: number
  ): { y: number; p: number } => {
    let y = startY;
    let p = startP;
    doc.setPage(p);
    doc.setFont("times", "normal");
    doc.setFontSize(BODY_SIZE);
    doc.setTextColor(0);

    for (const line of lines) {
      if (y + BODY_LEAD > PH - MB) {
        // nuova pagina
        addPage();
        p = currentPage;
        y = MT;
        doc.setPage(p);
        doc.setFont("times", "normal");
        doc.setFontSize(BODY_SIZE);
      }
      doc.text(line, ml(p), y);
      y += BODY_LEAD;
    }
    return { y, p };
  };

  for (let ci = 0; ci < book.chapters.length; ci++) {
    const chapter = book.chapters[ci];
    const rawText = chapterPlainText(chapter);
    const paragraphs = rawText
      .split(/\n\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const cp = startChapterPage();
    let y = MT;

    // Numero capitolo (se più di uno)
    if (book.chapters.length > 1) {
      doc.setPage(cp);
      doc.setFont("times", "normal");
      doc.setFontSize(9);
      doc.setTextColor(130);
      doc.text(`Capitolo ${ci + 1}`, ml(cp), y + 6);
      doc.setTextColor(0);
      y += 10;
    }

    // Titolo capitolo
    doc.setPage(cp);
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    const chTitleLines = doc.splitTextToSize(chapter.title, cw(cp));
    doc.text(chTitleLines, ml(cp), y + 10);
    y += 10 + chTitleLines.length * 8 + 4;

    hRule(y, cp);
    y += 8;

    // Corpo testo — paragrafo per paragrafo
    let curP = cp;
    for (let pi = 0; pi < paragraphs.length; pi++) {
      const paraLines = doc.splitTextToSize(
        paragraphs[pi],
        cw(curP)
      );

      const result = writeTextLines(paraLines, y, curP);
      y = result.y + PARA_SEP;
      curP = result.p;
    }
  }

  // ── NOTA SULL'AUTORE (se bio presente) ───────────────────────────────────
  if (authorBio?.trim()) {
    const bioPage = startChapterPage();
    let y = MT;

    doc.setPage(bioPage);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("L'autore", ml(bioPage), y + 10);
    y += 18;
    hRule(y, bioPage);
    y += 10;

    const bioLines = doc.splitTextToSize(authorBio.trim(), cw(bioPage));
    writeTextLines(bioLines, y, bioPage);
  }

  // ── NUMERI DI PAGINA (aggiunti in post su tutte le pagine contenuto) ──────
  const totalPages = currentPage;
  let pageCounter = 1;

  for (let p = chapterFirstPage; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);

    const numStr = String(pageCounter);
    const yNum = PH - 10;

    if (p % 2 === 1) {
      // Dispari → numero a destra (bordo esterno)
      doc.text(numStr, PW - mr(p), yNum, { align: "right" });
    } else {
      // Pari → numero a sinistra (bordo esterno)
      doc.text(numStr, ml(p), yNum, { align: "left" });
    }

    // Intestazione corrente: titolo libro a sinistra (verso), titolo opera a destra (recto)
    doc.setFontSize(8);
    doc.setTextColor(160);
    if (p % 2 === 0) {
      // Verso: titolo libro
      doc.text(book.title, ml(p), MT - 6, { align: "left" });
    } else {
      // Recto: nome autore
      doc.text(book.author, PW - mr(p), MT - 6, { align: "right" });
    }

    doc.setTextColor(0);
    pageCounter++;
  }

  // ── MARCHIO D'ORIGINE (invisibile) ───────────────────────────────────────
  // Testo bianco su bianco: non visibile, non invasivo, nessun dato personale.
  // Solo il nome della piattaforma — come il bollo in rilievo della cartiera.
  const originMark = `AntheaDelori Edizioni · liberiamo2076.com · ${book.slug}`;

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("times", "normal");
    doc.setFontSize(0.1);
    doc.setTextColor(255, 255, 255);
    doc.text(originMark, PW / 2, PH / 2, { align: "center" });
    doc.setTextColor(0);
  }

  // ── SALVA ─────────────────────────────────────────────────────────────────
  doc.save(`${safeFilename(book.title)}-stampa.pdf`);
}

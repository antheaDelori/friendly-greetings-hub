import { useLayoutEffect, useRef } from "react";
import tesseraFronte from "@/assets/tessera-fronte-template.png";

// Il fronte e il retro della tessera sono un unico template statico fornito
// da Daniele (fedele al mockup ufficiale), con overlay dinamico solo per i
// campi concordati — stesso principio delle teche dei libri (immagine fissa
// + contenuto reale sopra). Font caricato e scoped qui dentro, senza toccare
// i font del resto del sito.
const TESSERA_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap');
  .ta-display { font-family: 'Rajdhani', sans-serif; }
`;

// Colori campionati a pixel dal template originale — non i token colore del
// sito, per restare identici al bianco/magenta/ciano "pieni" dell'immagine.
const COLOR_WHITE = "#FFFFFF";
const COLOR_CYAN = "#01FFFF";
const COLOR_MAGENTA = "#E95DB0";

// Dimensioni native del template (px) — le posizioni sotto sono calcolate su questa base.
const TEMPLATE_W = 1536;
const TEMPLATE_H = 1024;

// Coordinate misurate direttamente sul template (confronto area vuota vs originale compilato).
const NOME_TOP = 183;
const COGNOME_TOP = 251;
const NAME_LEFT = 470;
const NAME_FONT_SIZE = 40;
// Larghezza massima disponibile prima di invadere la colonna della citazione a destra —
// se il testo (nomi lunghi, cognomi composti) la supererebbe, il font si restringe.
const MAX_NAME_WIDTH = 380;

// Colonna valori della lista campi sul fronte (ID AUTORE, STATO ARCHIVIO,
// DATA DI SALVATAGGIO, HASH ARCHIVISTICO). LIVELLO, NODO e ACCESSO restano
// testo statico dell'immagine, non toccati.
const FIELD_LEFT = 675;
const FIELD_FONT_SIZE = 16;
const ID_AUTORE_TOP = 331;
const STATO_TOP = 424;
const DATA_TOP = 446;
const HASH_TOP = 468;

// Colonna valori "Dati tecnici" sul retro (TESSERA, EMISSIONE, SCADENZA,
// ID CRITTOGRAFICO). PROTOCOLLO, CIFRATURA e NODO ORIGINE restano statici.
const FIELD2_LEFT = 1200;
const TESSERA_TOP = 650;
const EMISSIONE_TOP = 675;
const SCADENZA_TOP = 698;
const ID_CRIPTO_TOP = 800;

// Riquadro foto sul fronte (angoli ciano nel template) — misurato a pixel sul template.
// Se l'autore non ha caricato una foto, il riquadro resta il volto wireframe già disegnato
// nell'immagine statica: nessun overlay viene renderizzato.
const PHOTO_LEFT = 202;
const PHOTO_TOP = 157;
const PHOTO_WIDTH = 200;
const PHOTO_HEIGHT = 300;

const HASH_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// Hash decorativo deterministico — stabile per autore (derivato dal suo id reale
// + un "sale" diverso per ogni campo), ma senza alcun significato crittografico
// o archivistico reale.
function deterministicHash(id: string, salt: string): string {
  let h = 2166136261;
  const input = salt + id;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h = h >>> 0;
  let out = "";
  for (let i = 0; i < 12; i++) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    out += HASH_ALPHABET[h % HASH_ALPHABET.length];
  }
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

// Adatta il font-size del testo al contenitore reale, e lo restringe solo se
// il nome/cognome è troppo lungo per stare nello spazio disponibile.
function useFitText(text: string, containerRef: React.RefObject<HTMLDivElement | null>) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const fit = () => {
      const scale = container.clientWidth / TEMPLATE_W;
      const naturalFontSize = NAME_FONT_SIZE * scale;
      el.style.fontSize = `${naturalFontSize}px`;
      const maxWidthActual = MAX_NAME_WIDTH * scale;
      const width = el.scrollWidth;
      if (width > maxWidthActual && width > 0) {
        el.style.fontSize = `${naturalFontSize * (maxWidthActual / width)}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [text, containerRef]);

  return ref;
}

interface TesseraAutoreProps {
  fullName: string;
  numeroTessera?: number | null;
  isBlocked?: boolean;
  memberSinceLabel?: string | null;
  expiryLabel?: string | null;
  userId: string;
  avatarUrl?: string | null;
  className?: string;
}

function FieldValue({ left, top, color = COLOR_WHITE, children }: { left: number; top: number; color?: string; children: React.ReactNode }) {
  return (
    <span
      className="ta-display absolute whitespace-nowrap font-semibold"
      style={{
        left: `${(left / TEMPLATE_W) * 100}%`,
        top: `${(top / TEMPLATE_H) * 100}%`,
        fontSize: `${(FIELD_FONT_SIZE / TEMPLATE_W) * 100}cqw`,
        letterSpacing: "0.03em",
        lineHeight: 1,
        color,
      }}
    >
      {children}
    </span>
  );
}

export function TesseraAutore({ fullName, numeroTessera, isBlocked = false, memberSinceLabel, expiryLabel, userId, avatarUrl, className = "" }: TesseraAutoreProps) {
  const nome = fullName.split(" ")[0] || fullName;
  const cognome = fullName.split(" ").slice(1).join(" ") || "—";

  const containerRef = useRef<HTMLDivElement>(null);
  const nomeRef = useFitText(nome, containerRef);
  const cognomeRef = useFitText(cognome, containerRef);

  const idAutore = numeroTessera != null ? `LB · 2076 · A · ${String(numeroTessera).padStart(6, "0")}` : "LB · 2076 · A · ——————";
  const stato = isBlocked ? "SOSPESO" : "ACTIVE";
  const hashArchivistico = deterministicHash(userId, "ARCHIVIO");
  const idCrittografico = deterministicHash(userId, "CRIPTO");

  return (
    <div className={`ta-display ${className}`} style={{ containerType: "inline-size" }}>
      <style>{TESSERA_STYLE}</style>

      <div ref={containerRef} className="relative w-full" style={{ aspectRatio: `${TEMPLATE_W} / ${TEMPLATE_H}` }}>
        <img src={tesseraFronte} alt="Tessera autore" className="absolute inset-0 w-full h-full object-contain" />

        {/* Se l'autore ha una foto/avatar, la mostriamo nel riquadro al posto del volto
            wireframe statico — ma "ciano-izzata" (grayscale + tinta colore) per restare
            fedele all'estetica della tessera invece di introdurre colori reali. */}
        {avatarUrl && (
          <div
            className="absolute overflow-hidden"
            style={{
              left: `${(PHOTO_LEFT / TEMPLATE_W) * 100}%`,
              top: `${(PHOTO_TOP / TEMPLATE_H) * 100}%`,
              width: `${(PHOTO_WIDTH / TEMPLATE_W) * 100}%`,
              height: `${(PHOTO_HEIGHT / TEMPLATE_H) * 100}%`,
              isolation: "isolate",
            }}
          >
            <img
              src={avatarUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: "grayscale(1) brightness(1.2) contrast(1.1)" }}
            />
            <div className="absolute inset-0" style={{ background: COLOR_CYAN, mixBlendMode: "color" }} />
          </div>
        )}

        {/* ── Fronte ── */}
        <span
          ref={nomeRef}
          className="absolute uppercase whitespace-nowrap font-semibold"
          style={{
            left: `${(NAME_LEFT / TEMPLATE_W) * 100}%`,
            top: `${(NOME_TOP / TEMPLATE_H) * 100}%`,
            letterSpacing: "0.05em",
            lineHeight: 0.85,
            color: COLOR_WHITE,
          }}
        >
          {nome}
        </span>

        <span
          ref={cognomeRef}
          className="absolute uppercase whitespace-nowrap font-semibold"
          style={{
            left: `${(NAME_LEFT / TEMPLATE_W) * 100}%`,
            top: `${(COGNOME_TOP / TEMPLATE_H) * 100}%`,
            letterSpacing: "0.05em",
            lineHeight: 0.85,
            color: COLOR_WHITE,
          }}
        >
          {cognome}
        </span>

        <FieldValue left={FIELD_LEFT} top={ID_AUTORE_TOP}>{idAutore}</FieldValue>
        <FieldValue left={FIELD_LEFT} top={STATO_TOP} color={isBlocked ? COLOR_MAGENTA : COLOR_CYAN}>{stato}</FieldValue>
        <FieldValue left={FIELD_LEFT} top={DATA_TOP}>{memberSinceLabel ?? "—"}</FieldValue>
        <FieldValue left={FIELD_LEFT} top={HASH_TOP}>{hashArchivistico}</FieldValue>

        {/* ── Retro ── */}
        <FieldValue left={FIELD2_LEFT} top={TESSERA_TOP}>{idAutore}</FieldValue>
        <FieldValue left={FIELD2_LEFT} top={EMISSIONE_TOP}>{memberSinceLabel ?? "—"}</FieldValue>
        <FieldValue left={FIELD2_LEFT} top={SCADENZA_TOP}>{expiryLabel ?? "—"}</FieldValue>
        <FieldValue left={FIELD2_LEFT} top={ID_CRIPTO_TOP}>{idCrittografico}</FieldValue>
      </div>
    </div>
  );
}

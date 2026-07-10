import { useEffect, useLayoutEffect, useRef, useState } from "react";
import tesseraFronte from "@/assets/tessera-fronte-template.png";
import tesseraPhotoFrame from "@/assets/tessera-photo-frame.png";

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

// Riquadro foto sul fronte — misurato a pixel individuando il vertice esatto delle 4
// staffe ciano nel template (non un margine arbitrario: la foto riempie esattamente
// lo spazio che le staffe delimitano). Se l'autore non ha caricato una foto, il
// riquadro resta il volto wireframe già disegnato nell'immagine statica.
const PHOTO_LEFT = 200;
const PHOTO_TOP = 159;
const PHOTO_WIDTH = 227;
const PHOTO_HEIGHT = 312;
const PHOTO_CANVAS_W = 227;
const PHOTO_CANVAS_H = 312;
// Le staffe si estendono per ~24px verso l'interno del riquadro, quindi la foto le
// coprirebbe in parte: questo overlay isola solo le staffe (sfondo trasparente) e
// viene ridisegnato sopra la foto, così la cornice resta sempre intatta.
const FRAME_LEFT = 180;
const FRAME_TOP = 140;
const FRAME_WIDTH = 270;
const FRAME_HEIGHT = 350;
const DUOTONE_DARK: [number, number, number] = [4, 14, 20];
// Blu campionato a pixel dal wireframe del template stesso (non il ciano brillante
// del testo dinamico, troppo "azzurro" rispetto al resto della grafica).
const DUOTONE_BRIGHT: [number, number, number] = [15, 151, 187];

// Converte la foto/avatar reale in un duotono ciano "cotto" a pixel — non un filtro
// CSS live: garantisce lo stesso risultato a schermo e in stampa, senza dipendere
// da mix-blend-mode (poco affidabile in stampa/anteprima).
function useDuotoneAvatar(avatarUrl?: string | null): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!avatarUrl) { setDataUrl(null); return; }
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      const canvas = document.createElement("canvas");
      canvas.width = PHOTO_CANVAS_W;
      canvas.height = PHOTO_CANVAS_H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const scale = Math.max(PHOTO_CANVAS_W / img.width, PHOTO_CANVAS_H / img.height);
      const sw = PHOTO_CANVAS_W / scale;
      const sh = PHOTO_CANVAS_H / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, PHOTO_CANVAS_W, PHOTO_CANVAS_H);
      try {
        const imageData = ctx.getImageData(0, 0, PHOTO_CANVAS_W, PHOTO_CANVAS_H);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const lum = Math.min(1, (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255 * 1.3);
          data[i]     = DUOTONE_DARK[0] + (DUOTONE_BRIGHT[0] - DUOTONE_DARK[0]) * lum;
          data[i + 1] = DUOTONE_DARK[1] + (DUOTONE_BRIGHT[1] - DUOTONE_DARK[1]) * lum;
          data[i + 2] = DUOTONE_DARK[2] + (DUOTONE_BRIGHT[2] - DUOTONE_DARK[2]) * lum;
        }
        ctx.putImageData(imageData, 0, 0);
        setDataUrl(canvas.toDataURL("image/png"));
      } catch {
        setDataUrl(null);
      }
    };
    img.onerror = () => setDataUrl(null);
    img.src = avatarUrl;
    return () => { cancelled = true; };
  }, [avatarUrl]);

  return dataUrl;
}

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
  const duotoneAvatar = useDuotoneAvatar(avatarUrl);

  return (
    <div className={`ta-display ${className}`} style={{ containerType: "inline-size" }}>
      <style>{TESSERA_STYLE}</style>

      <div ref={containerRef} className="relative w-full" style={{ aspectRatio: `${TEMPLATE_W} / ${TEMPLATE_H}` }}>
        <img src={tesseraFronte} alt="Tessera autore" className="absolute inset-0 w-full h-full object-contain" />

        {/* Se l'autore ha una foto/avatar, la mostriamo nel riquadro al posto del volto
            wireframe statico — convertita in duotono ciano via canvas (pixel "cotti",
            non un filtro CSS live) per restare fedele all'estetica anche in stampa. */}
        {duotoneAvatar && (
          <img
            src={duotoneAvatar}
            alt=""
            className="absolute object-cover"
            style={{
              left: `${(PHOTO_LEFT / TEMPLATE_W) * 100}%`,
              top: `${(PHOTO_TOP / TEMPLATE_H) * 100}%`,
              width: `${(PHOTO_WIDTH / TEMPLATE_W) * 100}%`,
              height: `${(PHOTO_HEIGHT / TEMPLATE_H) * 100}%`,
            }}
          />
        )}

        {/* Le staffe agli angoli del riquadro foto, ridisegnate sopra: la foto riempie
            lo spazio esatto tra i loro vertici, ma le staffe stesse (che si estendono
            un poco verso l'interno) restano sempre visibili, sopra la foto. */}
        {duotoneAvatar && (
          <img
            src={tesseraPhotoFrame}
            alt=""
            className="absolute pointer-events-none"
            style={{
              left: `${(FRAME_LEFT / TEMPLATE_W) * 100}%`,
              top: `${(FRAME_TOP / TEMPLATE_H) * 100}%`,
              width: `${(FRAME_WIDTH / TEMPLATE_W) * 100}%`,
              height: `${(FRAME_HEIGHT / TEMPLATE_H) * 100}%`,
            }}
          />
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

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import tesseraFronte from "@/assets/tessera-lettore-template.png";
import tesseraPhotoFrame from "@/assets/tessera-lettore-photo-frame.png";

// Template dedicato fornito da Daniele (stesso layout della tessera autore, colori
// e testo LIVELLO adattati a "LETTORE CERTIFICATO"). Stessa logica di overlay
// dinamico dell'autore — vedi TesseraAutore.tsx per i commenti estesi.
const TESSERA_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap');
  .tl-display { font-family: 'Rajdhani', sans-serif; }
`;

const COLOR_WHITE = "#FFFFFF";
const COLOR_CYAN = "#01FFFF";
const COLOR_MAGENTA = "#E95DB0";

const TEMPLATE_W = 1536;
const TEMPLATE_H = 1024;

const NOME_TOP = 183;
const COGNOME_TOP = 251;
const NAME_LEFT = 470;
const NAME_FONT_SIZE = 40;
const MAX_NAME_WIDTH = 380;

const FIELD_LEFT = 675;
const FIELD_FONT_SIZE = 16;
const ID_LETTORE_TOP = 331;
const STATO_TOP = 424;
const DATA_TOP = 446;
const HASH_TOP = 468;

const FIELD2_LEFT = 1200;
const TESSERA_TOP = 650;
const EMISSIONE_TOP = 675;
const ID_CRIPTO_TOP = 800;

const PHOTO_LEFT = 200;
const PHOTO_TOP = 159;
const PHOTO_WIDTH = 227;
const PHOTO_HEIGHT = 312;
const PHOTO_CANVAS_W = 227;
const PHOTO_CANVAS_H = 312;
const FRAME_LEFT = 180;
const FRAME_TOP = 140;
const FRAME_WIDTH = 270;
const FRAME_HEIGHT = 350;
const DUOTONE_DARK: [number, number, number] = [4, 14, 20];
const DUOTONE_BRIGHT: [number, number, number] = [15, 151, 187];

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

// Alcuni valori dinamici (hash, ID) non hanno una larghezza prevedibile: caratteri
// larghi come "W" possono farli sconfinare oltre il bordo della tessera anche se
// il conteggio caratteri è lo stesso di un valore che ci sta comodamente. Si
// restringe automaticamente solo se necessario, invece di una dimensione fissa.
function useFitFieldValue(text: string, maxWidth: number, containerRef: React.RefObject<HTMLDivElement | null>) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const container = containerRef.current;
    if (!el || !container) return;

    const fit = () => {
      const scale = container.clientWidth / TEMPLATE_W;
      const naturalFontSize = FIELD_FONT_SIZE * scale;
      el.style.fontSize = `${naturalFontSize}px`;
      const maxWidthActual = maxWidth * scale;
      const width = el.scrollWidth;
      if (width > maxWidthActual && width > 0) {
        el.style.fontSize = `${naturalFontSize * (maxWidthActual / width)}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => ro.disconnect();
  }, [text, maxWidth, containerRef]);

  return ref;
}

interface TesseraLettoreProps {
  fullName: string;
  numeroTessera?: number | null;
  isBlocked?: boolean;
  memberSinceLabel?: string | null;
  userId: string;
  avatarUrl?: string | null;
  className?: string;
}

function FieldValue({ left, top, color = COLOR_WHITE, fitRef, children }: { left: number; top: number; color?: string; fitRef?: React.RefObject<HTMLSpanElement | null>; children: React.ReactNode }) {
  return (
    <span
      ref={fitRef}
      className="tl-display absolute whitespace-nowrap font-semibold"
      style={{
        left: `${(left / TEMPLATE_W) * 100}%`,
        top: `${(top / TEMPLATE_H) * 100}%`,
        fontSize: fitRef ? undefined : `${(FIELD_FONT_SIZE / TEMPLATE_W) * 100}cqw`,
        letterSpacing: "0.03em",
        lineHeight: 1,
        color,
      }}
    >
      {children}
    </span>
  );
}

export function TesseraLettore({ fullName, numeroTessera, isBlocked = false, memberSinceLabel, userId, avatarUrl, className = "" }: TesseraLettoreProps) {
  const nome = fullName.split(" ")[0] || fullName;
  const cognome = fullName.split(" ").slice(1).join(" ") || "—";

  const containerRef = useRef<HTMLDivElement>(null);
  const nomeRef = useFitText(nome, containerRef);
  const cognomeRef = useFitText(cognome, containerRef);

  const idLettore = numeroTessera != null ? `LB-2076-L-${String(numeroTessera).padStart(6, "0")}` : "LB-2076-L-——————";
  const stato = isBlocked ? "SOSPESO" : "ACTIVE";
  const hashArchivistico = deterministicHash(userId, "ARCHIVIO");
  const idCrittografico = deterministicHash(userId, "CRIPTO");
  const duotoneAvatar = useDuotoneAvatar(avatarUrl);

  // Larghezza massima disponibile prima del bordo — sul retro la colonna valori è
  // molto più stretta che sul fronte, quindi ID/hash lunghi rischiano di sconfinare.
  const idLettoreFrontRef = useFitFieldValue(idLettore, 300, containerRef);
  const hashRef = useFitFieldValue(hashArchivistico, 300, containerRef);
  const idLettoreBackRef = useFitFieldValue(idLettore, 160, containerRef);
  const idCriptoRef = useFitFieldValue(idCrittografico, 160, containerRef);

  return (
    <div className={`tl-display ${className}`} style={{ containerType: "inline-size" }}>
      <style>{TESSERA_STYLE}</style>

      <div ref={containerRef} className="relative w-full" style={{ aspectRatio: `${TEMPLATE_W} / ${TEMPLATE_H}` }}>
        <img src={tesseraFronte} alt="Tessera lettore" className="absolute inset-0 w-full h-full object-contain" />

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

        <FieldValue left={FIELD_LEFT} top={ID_LETTORE_TOP} fitRef={idLettoreFrontRef}>{idLettore}</FieldValue>
        <FieldValue left={FIELD_LEFT} top={STATO_TOP} color={isBlocked ? COLOR_MAGENTA : COLOR_CYAN}>{stato}</FieldValue>
        <FieldValue left={FIELD_LEFT} top={DATA_TOP}>{memberSinceLabel ?? "—"}</FieldValue>
        <FieldValue left={FIELD_LEFT} top={HASH_TOP} fitRef={hashRef}>{hashArchivistico}</FieldValue>

        {/* ── Retro (SCADENZA resta statica "∞" nel template — nessun overlay) ── */}
        <FieldValue left={FIELD2_LEFT} top={TESSERA_TOP} fitRef={idLettoreBackRef}>{idLettore}</FieldValue>
        <FieldValue left={FIELD2_LEFT} top={EMISSIONE_TOP}>{memberSinceLabel ?? "—"}</FieldValue>
        <FieldValue left={FIELD2_LEFT} top={ID_CRIPTO_TOP} fitRef={idCriptoRef}>{idCrittografico}</FieldValue>
      </div>
    </div>
  );
}

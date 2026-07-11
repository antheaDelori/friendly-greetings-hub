import { useEffect, useLayoutEffect, useRef, useState } from "react";
import tesseraFronte from "@/assets/tessera-lettore-stampa-fronte.png";
import tesseraRetro from "@/assets/tessera-lettore-stampa-retro.png";
import tesseraPhotoFrame from "@/assets/tessera-lettore-stampa-photo-frame.png";

// Stessa base della tessera autore per la stampa (formato 5.3x8.4cm reale, QR
// incluso), ricolorata in magenta e con LIVELLO/ID adattati al lettore — vedi
// TesseraAutoreStampa.tsx per i commenti estesi sulla logica di overlay.
const TESSERA_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&display=swap');
  .tls-display { font-family: 'Rajdhani', sans-serif; }
`;

const COLOR_WHITE = "#FFFFFF";
const COLOR_CYAN = "#01FFFF";
const COLOR_MAGENTA = "#E95DB0";

const TEMPLATE_W = 1252;
const TEMPLATE_H = 1994;

const SUBTITLE_TOP = 216;
const SUBTITLE_LEFT = 183;
const SUBTITLE_FONT_SIZE = 24;

const QUOTE_LEFT = 705;
const QUOTE_TOP = 745;
const QUOTE_LINE_HEIGHT = 55;
const QUOTE_FONT_SIZE = 42;

const NOME_TOP = 1078;
const COGNOME_TOP = 1230;
const NAME_LEFT = 183;
const NAME_FONT_SIZE = 58;
const MAX_NAME_WIDTH = 460;

const FIELD_LEFT = 412;
const FIELD_FONT_SIZE = 26;
const ID_LETTORE_LABEL_TOP = 1360;
const LIVELLO_TOP = 1418;
const STATO_TOP = 1592;
const DATA_TOP = 1640;
const HASH_TOP = 1720;

const FIELD2_LEFT = 840;
const TESSERA_TOP = 1108;
const EMISSIONE_TOP = 1180;
const SCADENZA_TOP = 1223;
const ID_CRIPTO_TOP = 1445;

const PHOTO_LEFT = 197;
const PHOTO_TOP = 377;
const PHOTO_WIDTH = 405;
const PHOTO_HEIGHT = 579;
const PHOTO_CANVAS_W = 405;
const PHOTO_CANVAS_H = 579;
const DUOTONE_DARK: [number, number, number] = [20, 4, 15];
const DUOTONE_BRIGHT: [number, number, number] = [187, 15, 140];

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

interface TesseraLettoreStampaProps {
  fullName: string;
  numeroTessera?: number | null;
  isBlocked?: boolean;
  memberSinceLabel?: string | null;
  userId: string;
  avatarUrl?: string | null;
  frontRef?: React.RefObject<HTMLDivElement | null>;
  backRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

function FieldValue({ left, top, fontSize = FIELD_FONT_SIZE, color = COLOR_WHITE, children }: { left: number; top: number; fontSize?: number; color?: string; children: React.ReactNode }) {
  return (
    <span
      className="tls-display absolute whitespace-nowrap font-semibold"
      style={{
        left: `${(left / TEMPLATE_W) * 100}%`,
        top: `${(top / TEMPLATE_H) * 100}%`,
        fontSize: `${(fontSize / TEMPLATE_W) * 100}cqw`,
        letterSpacing: "0.02em",
        lineHeight: 1,
        color,
      }}
    >
      {children}
    </span>
  );
}

export function TesseraLettoreStampa({
  fullName, numeroTessera, isBlocked = false, memberSinceLabel, userId, avatarUrl,
  frontRef, backRef, className = "",
}: TesseraLettoreStampaProps) {
  const nome = fullName.split(" ")[0] || fullName;
  const cognome = fullName.split(" ").slice(1).join(" ") || "—";

  const frontContainerRef = useRef<HTMLDivElement>(null);
  const nomeRef = useFitText(nome, frontContainerRef);
  const cognomeRef = useFitText(cognome, frontContainerRef);

  const idLettore = numeroTessera != null ? `LB-2076-L-${String(numeroTessera).padStart(6, "0")}` : "LB-2076-L-——————";
  const stato = isBlocked ? "SOSPESO" : "ACTIVE";
  const hashArchivistico = deterministicHash(userId, "ARCHIVIO");
  const idCrittografico = deterministicHash(userId, "CRIPTO");
  const duotoneAvatar = useDuotoneAvatar(avatarUrl);

  return (
    <div className={`tls-display ${className}`}>
      <style>{TESSERA_STYLE}</style>

      <div className="flex flex-col sm:flex-row gap-6">
        {/* ── Fronte ── */}
        <div style={{ containerType: "inline-size", width: "100%", maxWidth: 340 }}>
          <div
            ref={(el) => { frontContainerRef.current = el; if (frontRef) frontRef.current = el; }}
            className="relative w-full"
            style={{ aspectRatio: `${TEMPLATE_W} / ${TEMPLATE_H}` }}
          >
            <img src={tesseraFronte} alt="Tessera lettore — fronte" className="absolute inset-0 w-full h-full object-contain" />

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

            <img
              src={tesseraPhotoFrame}
              alt=""
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            <FieldValue left={SUBTITLE_LEFT} top={SUBTITLE_TOP} fontSize={SUBTITLE_FONT_SIZE} color={COLOR_MAGENTA}>
              // LETTORE CERTIFICATO
            </FieldValue>

            {/* Citazione — testo fisso diverso da quello dell'autore ("Ogni lettore
                custodisce..."), non generato per utente, presente già così nel
                template ufficiale web fornito da Daniele. */}
            {["Ogni lettore custodisce", "un frammento", "del mondo."].map((line, i) => (
              <span
                key={line}
                className="tls-display absolute whitespace-nowrap italic"
                style={{
                  left: `${(QUOTE_LEFT / TEMPLATE_W) * 100}%`,
                  top: `${((QUOTE_TOP + i * QUOTE_LINE_HEIGHT) / TEMPLATE_H) * 100}%`,
                  fontSize: `${(QUOTE_FONT_SIZE / TEMPLATE_W) * 100}cqw`,
                  fontFamily: "Georgia, serif",
                  color: "rgba(240,235,224,0.75)",
                  lineHeight: 1,
                }}
              >
                {line}
              </span>
            ))}

            <span
              ref={nomeRef}
              className="absolute uppercase whitespace-nowrap font-semibold"
              style={{
                left: `${(NAME_LEFT / TEMPLATE_W) * 100}%`,
                top: `${(NOME_TOP / TEMPLATE_H) * 100}%`,
                letterSpacing: "0.03em",
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
                letterSpacing: "0.03em",
                lineHeight: 0.85,
                color: COLOR_WHITE,
              }}
            >
              {cognome}
            </span>

            <FieldValue left={183} top={ID_LETTORE_LABEL_TOP} color={COLOR_MAGENTA}>ID LETTORE</FieldValue>
            <FieldValue left={FIELD_LEFT} top={ID_LETTORE_LABEL_TOP}>{idLettore}</FieldValue>
            <FieldValue left={FIELD_LEFT} top={LIVELLO_TOP}>LETTORE CERTIFICATO</FieldValue>
            <FieldValue left={FIELD_LEFT} top={STATO_TOP} color={isBlocked ? COLOR_MAGENTA : COLOR_CYAN}>{stato}</FieldValue>
            <FieldValue left={FIELD_LEFT} top={DATA_TOP}>{memberSinceLabel ?? "—"}</FieldValue>
            <FieldValue left={FIELD_LEFT} top={HASH_TOP}>{hashArchivistico}</FieldValue>
          </div>
        </div>

        {/* ── Retro (SCADENZA resta statica "∞" — i lettori non hanno scadenza) ── */}
        <div style={{ containerType: "inline-size", width: "100%", maxWidth: 340 }}>
          <div
            ref={backRef}
            className="relative w-full"
            style={{ aspectRatio: `${TEMPLATE_W} / ${TEMPLATE_H}` }}
          >
            <img src={tesseraRetro} alt="Tessera lettore — retro" className="absolute inset-0 w-full h-full object-contain" />

            <FieldValue left={FIELD2_LEFT} top={TESSERA_TOP}>{idLettore}</FieldValue>
            <FieldValue left={FIELD2_LEFT} top={EMISSIONE_TOP}>{memberSinceLabel ?? "—"}</FieldValue>
            <FieldValue left={FIELD2_LEFT} top={SCADENZA_TOP}>∞</FieldValue>
            <FieldValue left={FIELD2_LEFT} top={ID_CRIPTO_TOP}>{idCrittografico}</FieldValue>
          </div>
        </div>
      </div>
    </div>
  );
}

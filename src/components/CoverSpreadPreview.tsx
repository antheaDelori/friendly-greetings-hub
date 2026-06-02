import { useState, useEffect } from "react";

interface CoverSpreadPreviewProps {
  flatUrl:   string | null;
  titolo:    string;
  autore:    string;
  quarta:    string;
  alettaSx:  string;
  alettaDx:  string;
  prezzo:    string;
  isbn:      string;
  hasIsbn:   boolean;
  formato:   string;   // "a5" | "15x21" | "17x24" | "tascabile"
  pagine:    number;
}

const FORMATS: Record<string, { w: number; h: number }> = {
  a5:        { w: 148, h: 210 },
  "15x21":   { w: 150, h: 210 },
  "17x24":   { w: 170, h: 240 },
  tascabile: { w: 105, h: 148 },
};

const FLAP_MM = 90;

function spineWidthMm(pages: number): number {
  return Math.max(3, pages * 0.052 + 2);
}

export function CoverSpreadPreview({
  flatUrl, titolo, autore, quarta, alettaSx, alettaDx,
  prezzo, isbn, hasIsbn, formato, pagine,
}: CoverSpreadPreviewProps) {
  const [avgColor, setAvgColor] = useState<{ r: number; g: number; b: number; luma: number } | null>(null);

  // Campiona il colore medio dalla copertina fronte via canvas (stesso algoritmo dell'Edge Function)
  useEffect(() => {
    if (!flatUrl) { setAvgColor(null); return; }
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = 32; c.height = 32;
        const ctx = c.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 32, 32);
        const d = ctx.getImageData(0, 0, 32, 32).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
        const ar = Math.round(r / n), ag = Math.round(g / n), ab = Math.round(b / n);
        setAvgColor({ r: ar, g: ag, b: ab, luma: (0.299 * ar + 0.587 * ag + 0.114 * ab) / 255 });
      } catch {
        // CORS o SecurityError → colori default scuri
        setAvgColor(null);
      }
    };
    img.onerror = () => setAvgColor(null);
    img.src = flatUrl;
  }, [flatUrl]);

  // Colori adattivi — stessa logica di generate-full-cover
  const isDark  = (avgColor?.luma ?? 0.2) < 0.5;
  const desat   = 0.25;
  const cr = avgColor?.r ?? 26, cg = avgColor?.g ?? 22, cb = avgColor?.b ?? 30;
  const avg3 = (cr + cg + cb) / 3;
  const bR = Math.round(cr * (1 - desat) + avg3 * desat);
  const bG = Math.round(cg * (1 - desat) + avg3 * desat);
  const bB = Math.round(cb * (1 - desat) + avg3 * desat);
  const oF = isDark ? 0.72 : 1.14;
  const oR = Math.min(255, Math.round(bR * oF));
  const oG = Math.min(255, Math.round(bG * oF));
  const oB = Math.min(255, Math.round(bB * oF));

  const backBase  = `rgb(${bR},${bG},${bB})`;
  const backOuter = `rgb(${oR},${oG},${oB})`;
  const textColor = isDark ? "rgba(232,227,217,0.90)" : "rgba(26,22,24,0.90)";
  const ruleColor = isDark ? "rgba(232,227,217,0.18)" : "rgba(26,22,24,0.18)";

  // Geometria
  const fmt    = FORMATS[formato] ?? FORMATS.a5;
  const spineW = spineWidthMm(pagine || 200);
  const totalW = FLAP_MM + fmt.w + spineW + fmt.w + FLAP_MM;

  // Percentuali larghezza per ogni pannello
  const pct = (mm: number) => `${(mm / totalW * 100).toFixed(3)}%`;

  const textBase: React.CSSProperties = {
    fontSize: "9px",
    lineHeight: 1.55,
    color: textColor,
    fontFamily: "Georgia, 'Times New Roman', serif",
  };

  const fade: React.CSSProperties = {
    WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 88%)",
    maskImage:       "linear-gradient(to bottom, black 50%, transparent 88%)",
  };

  const labelMono: React.CSSProperties = {
    fontSize: "7px",
    fontFamily: "monospace",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    opacity: 0.35,
    marginBottom: "8%",
    color: textColor,
  };

  return (
    <div
      className="w-full overflow-hidden ring-1 ring-cyan/20"
      style={{ aspectRatio: `${totalW} / ${fmt.h}` }}
    >
      <div className="flex h-full">

        {/* ── Aletta anteriore ─────────────────────────── */}
        <div style={{
          width: pct(FLAP_MM), flexShrink: 0,
          background: backOuter,
          borderRight: `1px solid ${ruleColor}`,
          padding: "5% 7%",
          overflow: "hidden",
        }}>
          <div style={labelMono}>aletta ant.</div>
          <div style={{ ...textBase, ...fade }}>
            {alettaSx || <span style={{ opacity: 0.25 }}>—</span>}
          </div>
        </div>

        {/* ── Retro ────────────────────────────────────── */}
        <div style={{
          width: pct(fmt.w), flexShrink: 0,
          background: `linear-gradient(to right, ${backOuter}, ${backBase})`,
          padding: "8% 8%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <div style={{ ...textBase, ...fade, flex: 1, overflow: "hidden" }}>
            {quarta || <span style={{ opacity: 0.25, fontFamily: "monospace", fontSize: "7px", letterSpacing: "0.1em" }}>quarta di copertina</span>}
          </div>
          <div style={{
            borderTop: `1px solid ${ruleColor}`,
            paddingTop: "4%",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "7.5px",
            color: textColor,
            opacity: 0.70,
            fontFamily: "monospace",
            flexShrink: 0,
          }}>
            <span>{prezzo}</span>
            {hasIsbn && isbn ? <span>ISBN {isbn}</span> : null}
          </div>
        </div>

        {/* ── Spina ────────────────────────────────────── */}
        <div style={{
          width: pct(spineW), flexShrink: 0,
          minWidth: "6px", maxWidth: "44px",
          background: backBase,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: "3%",
          gap: "5%",
          overflow: "hidden",
        }}>
          {titolo && (
            <span style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              color: textColor,
              fontSize: "8px",
              letterSpacing: "0.10em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              maxHeight: "45%",
              fontFamily: "Georgia, serif",
              fontWeight: "bold",
            }}>
              {titolo.toUpperCase()}
            </span>
          )}
          {autore && (
            <span style={{
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              color: textColor,
              fontSize: "6.5px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              maxHeight: "35%",
              opacity: 0.80,
            }}>
              {autore}
            </span>
          )}
        </div>

        {/* ── Copertina fronte ─────────────────────────── */}
        <div style={{
          width: pct(fmt.w), flexShrink: 0,
          background: "#1a1618",
          overflow: "hidden",
          position: "relative",
        }}>
          {flatUrl
            ? <img src={flatUrl} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} alt="" />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.15)", fontSize: "8px", fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                copertina fronte
              </div>
          }
        </div>

        {/* ── Aletta posteriore ────────────────────────── */}
        <div style={{
          width: pct(FLAP_MM), flexShrink: 0,
          background: backOuter,
          borderLeft: `1px solid ${ruleColor}`,
          padding: "5% 7%",
          overflow: "hidden",
        }}>
          <div style={labelMono}>aletta post.</div>
          <div style={{ ...textBase, ...fade }}>
            {alettaDx || <span style={{ opacity: 0.25 }}>—</span>}
          </div>
        </div>

      </div>
    </div>
  );
}

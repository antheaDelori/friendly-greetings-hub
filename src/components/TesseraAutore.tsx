import { useEffect, useState } from "react";
import QRCode from "qrcode";

const SITE_URL = "https://liberiamo2076.com";

// Stessa logica di priorità usata per author_name sui libri (gestione.tsx):
// nome+cognome se presenti, altrimenti pseudonimo — garantisce che lo slug
// combaci sempre con la pagina /autori/$slug reale.
function slugify(name: string): string {
  return name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-");
}

// Codici decorativi deterministici — stabili per autore (derivati dal suo id reale),
// ma senza alcun significato crittografico/archivistico reale.
function hashSegment(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

function deterministicCode(id: string, salt: string): string {
  const raw = (hashSegment(salt + id) + hashSegment(id + salt)).slice(0, 12);
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

function barcodeWidths(seed: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < seed.length; i++) {
    out.push(1 + (seed.charCodeAt(i) % 4));
  }
  return out;
}

interface TesseraAutoreProps {
  fullName: string;
  pseudonimo?: string | null;
  numeroTessera?: number | null;
  avatarUrl?: string | null;
  memberSinceLabel?: string | null;
  userId: string;
  isBlocked?: boolean;
  className?: string;
}

function Field({ label, value, accent = "cyan" }: { label: string; value: string; accent?: "cyan" | "magenta" }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className={`font-mono text-[9px] tracking-[0.15em] uppercase flex-shrink-0 ${accent === "cyan" ? "text-cyan/70" : "text-magenta/70"}`}>{label}</span>
      <span className="flex-1 border-b border-dotted border-bone/15 translate-y-[-2px]" />
      <span className="font-mono text-[10px] text-bone/85 tracking-wide flex-shrink-0">{value}</span>
    </div>
  );
}

function FieldStacked({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[8px] tracking-[0.15em] uppercase text-cyan/60">{label}</div>
      <div className="font-mono text-[10px] text-bone/85 tracking-wide break-all">{value}</div>
    </div>
  );
}

function Seal() {
  return (
    <div className="relative w-16 h-16 flex-shrink-0 rounded-full border border-cyan/50 flex items-center justify-center text-center">
      <div className="absolute inset-1 rounded-full border border-cyan/20" />
      <div className="font-mono text-cyan/80 leading-none">
        <div className="text-[6px] tracking-widest">PAROLE VIVE</div>
        <div className="text-lg">❦</div>
        <div className="text-[6px] tracking-widest">EST. 2076</div>
      </div>
    </div>
  );
}

function Fingerprint() {
  return (
    <div className="relative w-14 h-14 flex-shrink-0 flex items-center justify-center">
      {[0, 1, 2].map(i => (
        <span key={i} className="absolute rounded-full border border-cyan/40" style={{ inset: `${i * 5}px` }} />
      ))}
      <span className="relative font-mono text-cyan text-sm">✓</span>
    </div>
  );
}

export function TesseraAutore({
  fullName, pseudonimo, numeroTessera, avatarUrl, memberSinceLabel, userId, isBlocked = false, className = "",
}: TesseraAutoreProps) {
  const idAutore = numeroTessera != null ? `LB-2076-A-${String(numeroTessera).padStart(6, "0")}` : "LB-2076-A-——————";
  const accesso = numeroTessera != null ? `ALPHA ${String(numeroTessera).padStart(3, "0")}` : "ALPHA —";
  const stato = isBlocked ? "SOSPESO" : "ACTIVE";
  const hashArchivistico = deterministicCode(userId, "ARCHIVIO");
  const idCrittografico = deterministicCode(userId, "CRIPTO");
  const barcode = barcodeWidths(idCrittografico.replace(/-/g, ""));

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    const nameForSlug = fullName.trim() || pseudonimo || "Autore";
    const slug = slugify(nameForSlug);
    const profileUrl = `${SITE_URL}/autori/${slug}`;
    QRCode.toDataURL(profileUrl, { margin: 1, width: 128, color: { dark: "#0a0a12", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [fullName, pseudonimo]);

  return (
    <div className={`space-y-1 ${className}`}>
      {/* ── FRONTE ─────────────────────────────────────────────── */}
      <div className="tessera-face relative glass hud-frame overflow-hidden p-6">
        <div className="absolute inset-0 scanlines pointer-events-none opacity-25" />
        <div className="absolute -top-24 -left-16 w-56 h-56 rounded-full bg-cyan/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-16 w-56 h-56 rounded-full bg-magenta/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="relative flex items-start justify-between mb-5">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg text-bone tracking-tight">
                LIB<span className="text-magenta text-glow-magenta">e</span>RIAMO
              </span>
              <span className="font-mono text-[9px] tracking-[0.3em] text-cyan/70 uppercase">// autore certificato</span>
            </div>
            <div className="font-mono text-[9px] tracking-[0.2em] text-bone/40 uppercase mt-0.5">Il mondo dei creativi — 2076</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-[9px] tracking-widest text-cyan/70 uppercase flex items-center gap-1.5 justify-end">
              <span className="w-1.5 h-1.5 bg-cyan rounded-full animate-pulse" /> SYS:ONLINE
            </div>
            <div className="font-mono text-[9px] tracking-widest text-bone/30 uppercase mt-0.5">NODE 03 / SECTOR LIB</div>
          </div>
        </div>

        {/* Corpo */}
        <div className="relative flex gap-6 items-start">
          {/* Foto */}
          <div className="relative w-24 h-28 hud-frame flex-shrink-0 overflow-hidden bg-void/60">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan/15 to-magenta/10" />
                <div className="absolute inset-0 flex items-center justify-center font-display text-4xl text-bone/15">◊</div>
              </>
            )}
          </div>

          {/* Dati */}
          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <p className="font-mono text-[9px] tracking-[0.2em] text-bone/40 uppercase">Nome</p>
              <p className="font-display text-lg text-bone tracking-tight leading-tight">{fullName.split(" ")[0] || fullName}</p>
              <p className="font-mono text-[9px] tracking-[0.2em] text-bone/40 uppercase mt-1.5">Cognome</p>
              <p className="font-display text-lg text-bone tracking-tight leading-tight">{fullName.split(" ").slice(1).join(" ") || "—"}</p>
              {pseudonimo && <p className="font-serif italic text-bone/45 text-xs mt-1">alias {pseudonimo}</p>}
            </div>
            <div className="space-y-1 pt-1 border-t border-cyan/10">
              <Field label="ID Autore" value={idAutore} />
              <Field label="Livello" value="AUTORE CERTIFICATO" />
              <Field label="Nodo" value="03 - SECTOR LIB" />
              <Field label="Accesso" value={accesso} accent="magenta" />
              <Field label="Stato archivio" value={stato} />
              <Field label="Data di salvataggio" value={memberSinceLabel ?? "—"} />
              <Field label="Hash archivistico" value={hashArchivistico} />
            </div>
          </div>

          {/* Tagline + sigillo + QR */}
          <div className="hidden sm:flex flex-col items-end justify-between h-full flex-shrink-0 w-40 text-right gap-4">
            <p className="font-serif italic text-bone/55 text-xs leading-relaxed">
              Ogni autore salvato prolunga la memoria del mondo.
            </p>
            <div className="flex items-end gap-3">
              <Seal />
              {qrDataUrl && (
                <div className="flex flex-col items-center gap-1">
                  <div className="bg-white p-1">
                    <img src={qrDataUrl} alt="QR pagina autore" className="w-14 h-14 block" />
                  </div>
                  <span className="font-mono text-[6px] tracking-widest text-bone/40 uppercase">scansiona</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative mt-5 pt-3 border-t border-cyan/10 flex items-center justify-between">
          <span className="font-mono text-[9px] tracking-widest text-magenta/60 uppercase">✛ read_or_perish.exe</span>
          <span className="font-mono text-[8px] tracking-[0.3em] text-bone/15">••••••••••••••••••••••••</span>
        </div>
      </div>

      {/* ── RETRO ──────────────────────────────────────────────── */}
      <div className="tessera-face relative glass hud-frame overflow-hidden p-6">
        <div className="grid sm:grid-cols-4 gap-6">
          <div>
            <div className="font-display text-base text-bone tracking-tight">
              LIB<span className="text-magenta text-glow-magenta">e</span>RIAMO
            </div>
            <div className="font-mono text-[8px] tracking-[0.2em] text-bone/40 uppercase mt-0.5 mb-2">Archivio centrale delle parole vive</div>
            <p className="font-serif text-[11px] text-bone/55 leading-relaxed">
              Liberiamo le parole dagli algoritmi. Proteggiamo la creatività umana. Costruiamo la memoria del futuro. Una biblioteca sospesa nel vetro.
            </p>
          </div>

          <div>
            <div className="font-mono text-[9px] tracking-[0.2em] text-cyan/70 uppercase mb-2">Privilegi concessi</div>
            <ul className="space-y-1.5">
              {["Pubblicazione opere", "Accesso archivio completo", "Biblioteca olografica", "Parole_vive community", "Eventi e incontri riservati", "Assistenza autore dedicata"].map(p => (
                <li key={p} className="font-mono text-[10px] text-bone/60 flex gap-1.5"><span className="text-cyan/50">›</span>{p}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="font-mono text-[9px] tracking-[0.2em] text-cyan/70 uppercase mb-3">Verifica autore</div>
            <Fingerprint />
            <div className="font-mono text-[8px] tracking-[0.2em] text-magenta/60 uppercase mt-4 mb-1">Firma digitale</div>
            <svg viewBox="0 0 100 24" className="w-full h-6 text-bone/40" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M2 18 C 10 4, 16 4, 20 14 S 30 22, 36 10 S 44 2, 50 12 S 60 20, 66 8 S 78 4, 84 14 S 94 18, 98 10" />
            </svg>
          </div>

          <div>
            <div className="font-mono text-[9px] tracking-[0.2em] text-cyan/70 uppercase mb-2">Dati tecnici</div>
            <div className="space-y-1.5">
              <FieldStacked label="Tessera" value={idAutore} />
              <FieldStacked label="Emissione" value={memberSinceLabel ?? "—"} />
              <FieldStacked label="Scadenza" value="∞" />
              <FieldStacked label="Protocollo" value="HOLO/v7" />
              <FieldStacked label="Cifratura" value="AES-2076" />
              <FieldStacked label="Nodo origine" value="03 - SECTOR LIB" />
              <FieldStacked label="ID crittografico" value={idCrittografico} />
            </div>
            <div className="flex items-end gap-[1.5px] mt-3 h-6">
              {barcode.map((w, i) => (
                <span key={i} className="bg-cyan/50" style={{ width: `${w}px`, height: "100%" }} />
              ))}
              <span className="bg-magenta w-[2px] h-full" />
            </div>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-cyan/10 flex items-center justify-between flex-wrap gap-2">
          <span className="font-mono text-[9px] tracking-widest text-magenta/60 uppercase">✛ read_or_perish.exe</span>
          <span className="font-mono text-[9px] tracking-widest text-bone/40 uppercase">protocol: holo/v7</span>
          <span className="font-mono text-[9px] tracking-widest text-cyan/60 uppercase">• custodiamo le parole. proteggiamo il futuro.</span>
        </div>
      </div>
    </div>
  );
}

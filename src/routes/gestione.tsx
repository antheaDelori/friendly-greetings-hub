import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

type Book = {
  id: string;
  titolo: string;
  sottotitolo: string | null;
  genere: string;
  tipo: string | null;
  target: string | null;
  edizione: string | null;
  anno: number | null;
  lingua: string;
  accesso: string;
  descrizione: string | null;
  estratto: string | null;
  tag: string[];
  copertina_url: string | null;
  file_url: string | null;
  disponibile: boolean;
  slug: string;
  letture: number;
  downloads: number;
  created_at: string;
};

const GENERI = ["libro", "racconto", "saggio", "articolo"] as const;
const ACCESSI = ["gratuito", "premium", "riservato"] as const;
const TARGET = ["tutti", "bambini (0–8)", "ragazzi (9–12)", "adolescenti (13–17)", "adulti (18+)"] as const;
const TIPI = [
  "— Narrativa —",
  "Romanzo", "Romanzo storico", "Fantasy", "Fantascienza", "Thriller",
  "Legal thriller", "Giallo / Noir", "Horror", "Distopia",
  "Romanzo sentimentale", "Avventura", "Umorismo",
  "— Saggistica —",
  "Saggio storico", "Saggio scientifico", "Saggio filosofico", "Saggio politico",
  "Autobiografia", "Biografia", "Memoir", "Self-help", "Divulgazione", "Psicologia",
  "— Per ragazzi —",
  "Favola / Fiaba", "Racconto per ragazzi", "Avventura per ragazzi",
  "— —",
  "Altro",
] as const;

const inputClass = "mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all";
const labelClass = "font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

export const Route = createFileRoute("/gestione")({
  head: () => ({
    meta: [
      { title: "Gestione opere — Liberiamo la mente" },
      { name: "description", content: "Crea, modifica, pubblica le tue opere." },
    ],
  }),
  component: GestionePage,
});

function GestionePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<Book[]>([]);
  const [selected, setSelected] = useState<Book | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Campi form
  const [titolo, setTitolo] = useState("");
  const [sottotitolo, setSottotitolo] = useState("");
  const [genere, setGenere] = useState("libro");
  const [edizione, setEdizione] = useState("");
  const [anno, setAnno] = useState(String(new Date().getFullYear()));
  const [lingua, setLingua] = useState("it");
  const [accesso, setAccesso] = useState("gratuito");
  const [tipo, setTipo] = useState("");
  const [tipoAltro, setTipoAltro] = useState("");
  const [target, setTarget] = useState("tutti");
  const [descrizione, setDescrizione] = useState("");
  const [estratto, setEstratto] = useState("");
  const [tagStr, setTagStr] = useState("");
  const [copertina, setCopertina] = useState<File | null>(null);
  const [filePdf, setFilePdf] = useState<File | null>(null);

  const copertRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.replace("/auth"); return; }
      setUserId(user.id);
      await loadBooks(user.id);
      setLoading(false);
    };
    init();
  }, []);

  const loadBooks = async (uid: string) => {
    const { data } = await supabase
      .from("books")
      .select("*")
      .eq("author_id", uid)
      .order("created_at", { ascending: false });
    setBooks(data ?? []);
  };

  const resetForm = () => {
    setTitolo(""); setSottotitolo(""); setGenere("libro"); setEdizione("");
    setAnno(String(new Date().getFullYear())); setLingua("it"); setAccesso("gratuito");
    setTipo(""); setTipoAltro(""); setTarget("tutti");
    setDescrizione(""); setEstratto(""); setTagStr("");
    setCopertina(null); setFilePdf(null); setSaveError(null);
  };

  const handleNewBook = () => {
    resetForm();
    setSelected(null);
    setShowForm(true);
  };

  const uploadFile = async (file: File, bucket: string, path: string): Promise<string | null> => {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) return null;
    if (bucket === "copertine") {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }
    return path;
  };

  const handleSave = async () => {
    if (!userId || !titolo.trim()) return;
    setSaving(true);
    setSaveError(null);

    try {
      const slug = generateSlug(titolo) + "-" + Date.now().toString(36);
      let copertina_url: string | null = null;
      let file_url: string | null = null;

      if (copertina) {
        const ext = copertina.name.split(".").pop();
        copertina_url = await uploadFile(copertina, "copertine", `${userId}/${slug}.${ext}`);
      }
      if (filePdf) {
        const ext = filePdf.name.split(".").pop();
        file_url = await uploadFile(filePdf, "libri", `${userId}/${slug}.${ext}`);
      }

      const { error } = await supabase.from("books").insert({
        author_id: userId,
        slug,
        titolo: titolo.trim(),
        sottotitolo: sottotitolo.trim() || null,
        genere,
        tipo: tipo === "Altro" ? (tipoAltro.trim() || null) : (tipo || null),
        target: target || null,
        edizione: edizione.trim() || null,
        anno: anno ? parseInt(anno) : null,
        lingua,
        accesso,
        descrizione: descrizione.trim() || null,
        estratto: estratto.trim() || null,
        tag: tagStr ? tagStr.split(",").map(t => t.trim()).filter(Boolean) : [],
        copertina_url,
        file_url,
      });

      if (error) { setSaveError(error.message); return; }

      setShowForm(false);
      await loadBooks(userId);
    } catch {
      setSaveError("Errore durante il salvataggio. Riprova.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <SiteHeader />
        <PageShell code="// MODULE/WORK_MGMT" title="Gestione opere" subtitle="">
          <p className="font-mono text-cyan text-sm animate-pulse">▸ caricamento in corso...</p>
        </PageShell>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <PageShell code="// MODULE/WORK_MGMT" title="Gestione opere" subtitle="Scrivi, modifica, pubblica. Tutto da qui.">
        <div className="grid lg:grid-cols-[280px_1fr] gap-6">

          {/* Lista opere */}
          <HudPanel label="le tue opere" code={`${books.length}`} tone="cyan">
            {books.length === 0 && (
              <p className="font-mono text-[10px] text-bone/40 uppercase tracking-widest mb-4">
                Nessuna opera ancora.
              </p>
            )}
            <ul className="space-y-2">
              {books.map((b) => (
                <li key={b.id}>
                  <button
                    onClick={() => { setSelected(b); setShowForm(false); }}
                    className={`w-full text-left p-3 border transition-all ${
                      selected?.id === b.id && !showForm
                        ? "border-cyan bg-cyan/15 text-cyan"
                        : "border-cyan/15 text-bone/70 hover:border-cyan/50 hover:text-bone"
                    }`}
                  >
                    <div className="font-display text-sm tracking-tight truncate">{b.titolo}</div>
                    <div className="font-mono text-[9px] tracking-widest opacity-60 uppercase mt-1">
                      {b.genere} · {b.anno ?? "—"} · {b.accesso}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={handleNewBook}
              className="mt-4 w-full font-mono text-[10px] tracking-widest text-magenta uppercase border border-magenta/40 py-2 hover:bg-magenta/10 transition-colors"
            >
              ◆ + nuova opera
            </button>
          </HudPanel>

          {/* Form nuova opera */}
          {showForm && (
            <HudPanel label="nuova opera" code="NEW">
              <div className="space-y-5">

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <span className={labelClass}>↳ Titolo ★</span>
                    <input value={titolo} onChange={e => setTitolo(e.target.value)} placeholder="Il titolo dell'opera" className={inputClass} />
                  </div>
                  <div>
                    <span className={labelClass}>↳ Sottotitolo</span>
                    <input value={sottotitolo} onChange={e => setSottotitolo(e.target.value)} placeholder="Opzionale" className={inputClass} />
                  </div>
                </div>

                <div>
                  <span className={labelClass}>↳ Genere ★</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {GENERI.map(g => (
                      <button key={g} type="button" onClick={() => setGenere(g)}
                        className={`border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all ${
                          genere === g ? "border-cyan bg-cyan/15 text-cyan" : "border-cyan/30 text-bone/70 hover:border-cyan"
                        }`}>
                        ◆ {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tipo e Target */}
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <span className={labelClass}>↳ Tipo / Sottogenere</span>
                    <select value={tipo} onChange={e => { setTipo(e.target.value); setTipoAltro(""); }}
                      className={inputClass + " cursor-pointer"}>
                      <option value="">— Seleziona —</option>
                      {TIPI.map(t => (
                        <option
                          key={t}
                          value={t}
                          disabled={t.startsWith("—")}
                          className={t.startsWith("—") ? "text-bone/40 font-bold" : ""}
                        >
                          {t}
                        </option>
                      ))}
                    </select>
                    {tipo === "Altro" && (
                      <input
                        value={tipoAltro}
                        onChange={e => setTipoAltro(e.target.value)}
                        placeholder="Specifica il tipo..."
                        className={inputClass + " mt-2"}
                      />
                    )}
                  </div>
                  <div>
                    <span className={labelClass}>↳ Target / Fascia di pubblico</span>
                    <select value={target} onChange={e => setTarget(e.target.value)}
                      className={inputClass + " cursor-pointer"}>
                      {TARGET.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-5">
                  <div>
                    <span className={labelClass}>↳ Edizione</span>
                    <input value={edizione} onChange={e => setEdizione(e.target.value)} placeholder="Prima edizione" className={inputClass} />
                  </div>
                  <div>
                    <span className={labelClass}>↳ Anno</span>
                    <input value={anno} onChange={e => setAnno(e.target.value)} type="number" className={inputClass} />
                  </div>
                  <div>
                    <span className={labelClass}>↳ Lingua</span>
                    <input value={lingua} onChange={e => setLingua(e.target.value)} placeholder="it" className={inputClass} />
                  </div>
                </div>

                <div>
                  <span className={labelClass}>↳ Accesso</span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ACCESSI.map(a => (
                      <button key={a} type="button" onClick={() => setAccesso(a)}
                        className={`border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all ${
                          accesso === a ? "border-magenta bg-magenta/15 text-magenta" : "border-cyan/30 text-bone/70 hover:border-cyan"
                        }`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className={labelClass}>↳ Descrizione / Sinossi</span>
                  <textarea value={descrizione} onChange={e => setDescrizione(e.target.value)}
                    placeholder="Di cosa parla la tua opera..."
                    className="mt-2 w-full min-h-24 bg-void/40 border border-cyan/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan transition-all" />
                </div>

                <div>
                  <span className={labelClass}>↳ Estratto (anteprima pubblica)</span>
                  <textarea value={estratto} onChange={e => setEstratto(e.target.value)}
                    placeholder="Le prime righe o un brano rappresentativo..."
                    className="mt-2 w-full min-h-24 bg-void/40 border border-cyan/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan transition-all" />
                </div>

                <div>
                  <span className={labelClass}>↳ Tag (separati da virgola)</span>
                  <input value={tagStr} onChange={e => setTagStr(e.target.value)} placeholder="fantascienza, distopia, futuro" className={inputClass} />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <span className={labelClass}>↳ Copertina (immagine)</span>
                    <input ref={copertRef} type="file" accept="image/*"
                      onChange={e => setCopertina(e.target.files?.[0] ?? null)} className="hidden" />
                    <button type="button" onClick={() => copertRef.current?.click()}
                      className="mt-2 w-full border border-cyan/30 px-4 py-3 font-mono text-[10px] text-left uppercase tracking-widest hover:border-cyan hover:text-cyan transition-all text-bone/60">
                      {copertina ? `✓ ${copertina.name}` : "▸ Scegli immagine"}
                    </button>
                  </div>
                  <div>
                    <span className={labelClass}>↳ File PDF / epub</span>
                    <input ref={pdfRef} type="file" accept=".pdf,.epub"
                      onChange={e => setFilePdf(e.target.files?.[0] ?? null)} className="hidden" />
                    <button type="button" onClick={() => pdfRef.current?.click()}
                      className="mt-2 w-full border border-cyan/30 px-4 py-3 font-mono text-[10px] text-left uppercase tracking-widest hover:border-cyan hover:text-cyan transition-all text-bone/60">
                      {filePdf ? `✓ ${filePdf.name}` : "▸ Scegli file"}
                    </button>
                  </div>
                </div>

                {saveError && (
                  <p className="font-mono text-[11px] text-magenta border border-magenta/30 bg-magenta/5 px-4 py-3">
                    ⚠ {saveError}
                  </p>
                )}

                <div className="flex gap-3">
                  <HudButton variant="primary" onClick={handleSave} disabled={saving || !titolo.trim()}>
                    {saving ? "▸ Salvataggio..." : "▸ Salva opera"}
                  </HudButton>
                  <HudButton variant="ghost" onClick={() => setShowForm(false)}>
                    annulla
                  </HudButton>
                </div>
              </div>
            </HudPanel>
          )}

          {/* Dettaglio opera selezionata */}
          {selected && !showForm && (
            <HudPanel label="dettaglio" code={`ID:${selected.id.slice(0, 6).toUpperCase()}`}>
              <div className="flex items-start gap-5">
                {selected.copertina_url ? (
                  <img src={selected.copertina_url} alt="" className="w-24 h-32 object-cover ring-1 ring-cyan/30" />
                ) : (
                  <div className="w-24 h-32 bg-void/60 border border-cyan/20 flex items-center justify-center font-display text-4xl text-bone/20">◊</div>
                )}
                <div className="flex-1">
                  <div className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase">
                    // {selected.genere} · {selected.anno ?? "—"}
                  </div>
                  <h3 className="mt-1 font-display text-2xl text-bone tracking-tight">{selected.titolo}</h3>
                  {selected.sottotitolo && <p className="mt-1 font-serif italic text-bone/60">{selected.sottotitolo}</p>}
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <span className="font-mono text-[9px] uppercase tracking-widest border border-cyan/30 px-2 py-1 text-cyan/70">{selected.accesso}</span>
                    {selected.tipo && <span className="font-mono text-[9px] uppercase tracking-widest border border-cyan/30 px-2 py-1 text-bone/60">{selected.tipo}</span>}
                    {selected.target && <span className="font-mono text-[9px] uppercase tracking-widest border border-magenta/30 px-2 py-1 text-magenta/60">{selected.target}</span>}
                    <span className="font-mono text-[9px] uppercase tracking-widest border border-cyan/30 px-2 py-1 text-bone/50">
                      {selected.disponibile ? "disponibile" : "non disponibile"}
                    </span>
                  </div>
                </div>
              </div>

              {selected.descrizione && (
                <>
                  <div className="hud-divider my-5" />
                  <p className="font-serif italic text-bone/70">{selected.descrizione}</p>
                </>
              )}

              {selected.tag.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.tag.map(t => (
                    <span key={t} className="font-mono text-[9px] uppercase tracking-widest border border-cyan/20 px-2 py-1 text-bone/40">{t}</span>
                  ))}
                </div>
              )}

              <div className="hud-divider my-5" />
              <div className="flex gap-3 flex-wrap font-mono text-[10px] text-bone/40 uppercase tracking-widest">
                <span>▸ {selected.letture} letture</span>
                <span>▸ {selected.downloads} download</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <HudButton variant="ghost">◆ Modifica</HudButton>
                <HudButton variant="ghost">⊗ Elimina</HudButton>
              </div>
            </HudPanel>
          )}

          {!showForm && !selected && (
            <HudPanel label="area di lavoro" tone="magenta">
              <p className="font-serif italic text-bone/70">
                Seleziona un'opera dalla lista oppure creane una nuova.
              </p>
            </HudPanel>
          )}

        </div>
      </PageShell>
      <SiteFooter />
    </div>
  );
}

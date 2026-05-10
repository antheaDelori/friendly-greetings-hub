import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

type Capitolo = {
  id: string;
  book_id: string;
  ordine: number;
  titolo: string;
  testo: string;
  created_at: string;
};

type Edizione = {
  id: string;
  book_id: string;
  edizione: string | null;
  anno: number | null;
  isbn: string | null;
  copertina_url: string | null;
  created_at: string;
};

type Book = {
  id: string;
  titolo: string;
  sottotitolo: string | null;
  genere: string;
  tipo: string | null;
  target: string | null;
  isbn: string | null;
  edizione: string | null;
  anno: number | null;
  lingua: string;
  accesso: string;
  descrizione: string | null;
  estratto: string | null;
  tag: string[];
  copertina_url: string | null;
  lastra_url: string | null;
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

const TIPI_SELEZIONABILI = TIPI.filter(t => !t.startsWith("—"));

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [authorName, setAuthorName] = useState("");

  // Edizioni aggiuntive
  const [edizioni, setEdizioni] = useState<Edizione[]>([]);
  const [showEditionForm, setShowEditionForm] = useState(false);
  const [savingEdition, setSavingEdition] = useState(false);
  const [edEdizione, setEdEdizione] = useState("");
  const [edAnno, setEdAnno] = useState("");
  const [edIsbn, setEdIsbn] = useState("");
  const [edCopertina, setEdCopertina] = useState<File | null>(null);
  const edCopertinaRef = useRef<HTMLInputElement>(null);

  // Capitoli
  const [capitoli, setCapitoli] = useState<Capitolo[]>([]);
  const [showCapitoloForm, setShowCapitoloForm] = useState(false);
  const [savingCapitolo, setSavingCapitolo] = useState(false);
  const [editingCapitoloId, setEditingCapitoloId] = useState<string | null>(null);
  const [capTitolo, setCapTitolo] = useState("");
  const [capTesto, setCapTesto] = useState("");
  const [capOrdine, setCapOrdine] = useState(1);

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
  const [isbn, setIsbn] = useState("");
  const [descrizione, setDescrizione] = useState("");
  const [estratto, setEstratto] = useState("");
  const [tagStr, setTagStr] = useState("");
  const [copertina, setCopertina] = useState<File | null>(null);
  const [lastra, setLastra] = useState<File | null>(null);
  const [filePdf, setFilePdf] = useState<File | null>(null);
  const [existingCopertinaUrl, setExistingCopertinaUrl] = useState<string | null>(null);
  const [existingLastraUrl, setExistingLastraUrl] = useState<string | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);

  const copertRef = useRef<HTMLInputElement>(null);
  const lastraRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.replace("/auth"); return; }
      setUserId(user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("pseudonimo, nome, cognome")
        .eq("id", user.id)
        .single();
      const name =
        [profileData?.nome, profileData?.cognome].filter(Boolean).join(" ") ||
        profileData?.pseudonimo ||
        "Autore";
      setAuthorName(name);

      // aggiorna author_name su tutti i libri dell'autore
      await supabase
        .from("books")
        .update({ author_name: name })
        .eq("author_id", user.id);

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
    setTipo(""); setTipoAltro(""); setTarget("tutti"); setIsbn("");
    setDescrizione(""); setEstratto(""); setTagStr("");
    setCopertina(null); setLastra(null); setFilePdf(null); setSaveError(null);
    setEditingId(null); setConfirmDelete(false);
    setExistingCopertinaUrl(null); setExistingLastraUrl(null); setExistingFileUrl(null);
  };

  const handleNewBook = () => {
    resetForm();
    setSelected(null);
    setShowForm(true);
  };

  useEffect(() => {
    if (!selected) {
      setEdizioni([]); setShowEditionForm(false);
      setCapitoli([]); setShowCapitoloForm(false);
      return;
    }
    const loadEdizioni = async () => {
      const { data } = await supabase.from("edizioni").select("*").eq("book_id", selected.id).order("created_at");
      setEdizioni(data ?? []);
    };
    const loadCapitoli = async () => {
      const { data } = await supabase.from("capitoli").select("*").eq("book_id", selected.id).order("ordine");
      setCapitoli(data ?? []);
    };
    loadEdizioni();
    loadCapitoli();
    setShowEditionForm(false);
    setShowCapitoloForm(false);
  }, [selected?.id]);

  const handleSelectBook = (b: Book) => {
    setSelected(b);
    setShowForm(false);
    setEditingId(null);
    setConfirmDelete(false);
  };

  const handleModifica = () => {
    if (!selected) return;
    const b = selected;
    setTitolo(b.titolo);
    setSottotitolo(b.sottotitolo ?? "");
    setGenere(b.genere);
    setEdizione(b.edizione ?? "");
    setAnno(b.anno ? String(b.anno) : "");
    setLingua(b.lingua);
    setAccesso(b.accesso);
    if (b.tipo && (TIPI_SELEZIONABILI as readonly string[]).includes(b.tipo)) {
      setTipo(b.tipo);
      setTipoAltro("");
    } else if (b.tipo) {
      setTipo("Altro");
      setTipoAltro(b.tipo);
    } else {
      setTipo("");
      setTipoAltro("");
    }
    setTarget(b.target ?? "tutti");
    setIsbn(b.isbn ?? "");
    setDescrizione(b.descrizione ?? "");
    setEstratto(b.estratto ?? "");
    setTagStr(b.tag.join(", "));
    setCopertina(null);
    setLastra(null);
    setFilePdf(null);
    setExistingCopertinaUrl(b.copertina_url);
    setExistingLastraUrl(b.lastra_url);
    setExistingFileUrl(b.file_url);
    setEditingId(b.id);
    setSaveError(null);
    setConfirmDelete(false);
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
      let copertina_url: string | null = existingCopertinaUrl;
      let lastra_url: string | null = existingLastraUrl;
      let file_url: string | null = existingFileUrl;

      if (editingId) {
        if (copertina) {
          const ext = copertina.name.split(".").pop();
          copertina_url = await uploadFile(copertina, "copertine", `${userId}/${editingId}-cover.${ext}`);
        }
        if (lastra) {
          const ext = lastra.name.split(".").pop();
          lastra_url = await uploadFile(lastra, "copertine", `${userId}/${editingId}-lastra.${ext}`);
        }
        if (filePdf) {
          const ext = filePdf.name.split(".").pop();
          file_url = await uploadFile(filePdf, "libri", `${userId}/${editingId}-file.${ext}`);
        }

        const { error } = await supabase.from("books").update({
          titolo: titolo.trim(),
          sottotitolo: sottotitolo.trim() || null,
          genere,
          tipo: tipo === "Altro" ? (tipoAltro.trim() || null) : (tipo || null),
          target: target || null,
          isbn: isbn.trim() || null,
          edizione: edizione.trim() || null,
          anno: anno ? parseInt(anno) : null,
          lingua,
          accesso,
          descrizione: descrizione.trim() || null,
          estratto: estratto.trim() || null,
          tag: tagStr ? tagStr.split(",").map(t => t.trim()).filter(Boolean) : [],
          copertina_url,
          lastra_url,
          file_url,
          author_name: authorName || null,
        }).eq("id", editingId);

        if (error) { setSaveError(error.message); return; }
      } else {
        const slug = generateSlug(titolo) + "-" + Date.now().toString(36);
        if (copertina) {
          const ext = copertina.name.split(".").pop();
          copertina_url = await uploadFile(copertina, "copertine", `${userId}/${slug}.${ext}`);
        }
        if (lastra) {
          const ext = lastra.name.split(".").pop();
          lastra_url = await uploadFile(lastra, "copertine", `${userId}/${slug}-lastra.${ext}`);
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
          isbn: isbn.trim() || null,
          edizione: edizione.trim() || null,
          anno: anno ? parseInt(anno) : null,
          lingua,
          accesso,
          descrizione: descrizione.trim() || null,
          estratto: estratto.trim() || null,
          tag: tagStr ? tagStr.split(",").map(t => t.trim()).filter(Boolean) : [],
          copertina_url,
          lastra_url,
          file_url,
          author_name: authorName || null,
        });

        if (error) { setSaveError(error.message); return; }
      }

      setShowForm(false);
      setEditingId(null);
      setSelected(null);
      await loadBooks(userId);
    } catch {
      setSaveError("Errore durante il salvataggio. Riprova.");
    } finally {
      setSaving(false);
    }
  };

  const handleElimina = async () => {
    if (!selected || !userId) return;
    const { error } = await supabase.from("books").update({ disponibile: false }).eq("id", selected.id);
    if (!error) {
      setSelected(null);
      setConfirmDelete(false);
      await loadBooks(userId);
    }
  };

  const handleRipristina = async (book: Book) => {
    if (!userId) return;
    await supabase.from("books").update({ disponibile: true }).eq("id", book.id);
    if (selected?.id === book.id) setSelected({ ...book, disponibile: true });
    await loadBooks(userId);
  };

  const handleSaveEdizione = async () => {
    if (!selected || !userId) return;
    setSavingEdition(true);
    try {
      let copertina_url: string | null = null;
      if (edCopertina) {
        const ext = edCopertina.name.split(".").pop();
        const path = `${userId}/${selected.id}-ed-${Date.now()}.${ext}`;
        copertina_url = await uploadFile(edCopertina, "copertine", path);
      }
      const { error } = await supabase.from("edizioni").insert({
        book_id: selected.id,
        edizione: edEdizione.trim() || null,
        anno: edAnno ? parseInt(edAnno) : null,
        isbn: edIsbn.trim() || null,
        copertina_url,
      });
      if (!error) {
        setShowEditionForm(false);
        setEdEdizione(""); setEdAnno(""); setEdIsbn(""); setEdCopertina(null);
        const { data } = await supabase.from("edizioni").select("*").eq("book_id", selected.id).order("created_at");
        setEdizioni(data ?? []);
      }
    } finally {
      setSavingEdition(false);
    }
  };

  const handleDeleteEdizione = async (id: string) => {
    await supabase.from("edizioni").delete().eq("id", id);
    setEdizioni(prev => prev.filter(e => e.id !== id));
  };

  const reloadCapitoli = async (bookId: string) => {
    const { data } = await supabase.from("capitoli").select("*").eq("book_id", bookId).order("ordine");
    setCapitoli(data ?? []);
  };

  const handleSaveCapitolo = async () => {
    if (!selected || !userId || !capTitolo.trim()) return;
    setSavingCapitolo(true);
    try {
      if (editingCapitoloId) {
        await supabase.from("capitoli").update({
          titolo: capTitolo.trim(),
          testo: capTesto.trim(),
          ordine: capOrdine,
        }).eq("id", editingCapitoloId);
      } else {
        await supabase.from("capitoli").insert({
          book_id: selected.id,
          titolo: capTitolo.trim(),
          testo: capTesto.trim(),
          ordine: capOrdine,
        });
      }
      await reloadCapitoli(selected.id);
      setShowCapitoloForm(false);
      setEditingCapitoloId(null);
      setCapTitolo(""); setCapTesto(""); setCapOrdine(1);
    } finally {
      setSavingCapitolo(false);
    }
  };

  const handleDeleteCapitolo = async (id: string) => {
    await supabase.from("capitoli").delete().eq("id", id);
    setCapitoli(prev => prev.filter(c => c.id !== id));
  };

  const handleEditCapitolo = (c: Capitolo) => {
    setEditingCapitoloId(c.id);
    setCapTitolo(c.titolo);
    setCapTesto(c.testo);
    setCapOrdine(c.ordine);
    setShowCapitoloForm(true);
  };

  const activeBooks = books.filter(b => b.disponibile);
  const archivedBooks = books.filter(b => !b.disponibile);

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
          <HudPanel label="le tue opere" code={`${activeBooks.length}`} tone="cyan">
            {activeBooks.length === 0 && (
              <p className="font-mono text-[10px] text-bone/40 uppercase tracking-widest mb-4">
                Nessuna opera ancora.
              </p>
            )}
            <ul className="space-y-2">
              {activeBooks.map((b) => (
                <li key={b.id}>
                  <button
                    onClick={() => handleSelectBook(b)}
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

            {archivedBooks.length > 0 && (
              <>
                <div className="hud-divider my-4" />
                <div className="font-mono text-[9px] tracking-[0.3em] text-bone/30 uppercase mb-2">// archivio</div>
                <ul className="space-y-2">
                  {archivedBooks.map((b) => (
                    <li key={b.id}>
                      <button
                        onClick={() => handleSelectBook(b)}
                        className={`w-full text-left p-3 border transition-all opacity-50 hover:opacity-80 ${
                          selected?.id === b.id && !showForm
                            ? "border-magenta/60 bg-magenta/10 text-magenta"
                            : "border-magenta/20 text-bone/50 hover:border-magenta/40"
                        }`}
                      >
                        <div className="font-display text-sm tracking-tight truncate">{b.titolo}</div>
                        <div className="font-mono text-[9px] tracking-widest opacity-60 uppercase mt-1">
                          archiviata · {b.anno ?? "—"}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </HudPanel>

          {/* Form nuova / modifica opera */}
          {showForm && (
            <HudPanel label={editingId ? "modifica opera" : "nuova opera"} code={editingId ? "EDIT" : "NEW"}>
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

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                  <div>
                    <span className={labelClass}>↳ ISBN</span>
                    <input value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="978-88-..." className={inputClass} />
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

                <div className="grid sm:grid-cols-3 gap-5">
                  <div>
                    <span className={labelClass}>↳ Copertina (hover)</span>
                    <input ref={copertRef} type="file" accept="image/*"
                      onChange={e => setCopertina(e.target.files?.[0] ?? null)} className="hidden" />
                    <button type="button" onClick={() => copertRef.current?.click()}
                      className="mt-2 w-full border border-cyan/30 px-4 py-3 font-mono text-[10px] text-left uppercase tracking-widest hover:border-cyan hover:text-cyan transition-all text-bone/60">
                      {copertina ? `✓ ${copertina.name}` : existingCopertinaUrl ? "✓ esistente (cambia)" : "▸ Scegli immagine"}
                    </button>
                  </div>
                  <div>
                    <span className={labelClass}>↳ Lastra (catalogo)</span>
                    <input ref={lastraRef} type="file" accept="image/*"
                      onChange={e => setLastra(e.target.files?.[0] ?? null)} className="hidden" />
                    <button type="button" onClick={() => lastraRef.current?.click()}
                      className="mt-2 w-full border border-magenta/30 px-4 py-3 font-mono text-[10px] text-left uppercase tracking-widest hover:border-magenta hover:text-magenta transition-all text-bone/60">
                      {lastra ? `✓ ${lastra.name}` : existingLastraUrl ? "✓ esistente (cambia)" : "▸ Scegli lastra"}
                    </button>
                  </div>
                  <div>
                    <span className={labelClass}>↳ File PDF / epub</span>
                    <input ref={pdfRef} type="file" accept=".pdf,.epub"
                      onChange={e => setFilePdf(e.target.files?.[0] ?? null)} className="hidden" />
                    <button type="button" onClick={() => pdfRef.current?.click()}
                      className="mt-2 w-full border border-cyan/30 px-4 py-3 font-mono text-[10px] text-left uppercase tracking-widest hover:border-cyan hover:text-cyan transition-all text-bone/60">
                      {filePdf ? `✓ ${filePdf.name}` : existingFileUrl ? "✓ esistente (cambia)" : "▸ Scegli file"}
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
                    {saving ? "▸ Salvataggio..." : editingId ? "▸ Aggiorna opera" : "▸ Salva opera"}
                  </HudButton>
                  <HudButton variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>
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
                    <span className={`font-mono text-[9px] uppercase tracking-widest border px-2 py-1 ${selected.disponibile ? "border-cyan/30 text-bone/50" : "border-magenta/40 text-magenta/60"}`}>
                      {selected.disponibile ? "disponibile" : "archiviata"}
                    </span>
                  </div>
                  {selected.isbn && (
                    <p className="mt-2 font-mono text-[9px] tracking-widest text-bone/40 uppercase">ISBN: {selected.isbn}</p>
                  )}
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

              {/* Edizioni aggiuntive */}
              <div className="hud-divider my-5" />
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase">// edizioni aggiuntive</span>
                {!showEditionForm && (
                  <button
                    onClick={() => { setShowEditionForm(true); setEdEdizione(""); setEdAnno(String(new Date().getFullYear())); setEdIsbn(""); setEdCopertina(null); }}
                    className="font-mono text-[10px] tracking-widest text-magenta uppercase hover:text-cyan transition-colors"
                  >
                    + nuova edizione
                  </button>
                )}
              </div>

              {edizioni.length === 0 && !showEditionForm && (
                <p className="font-serif italic text-bone/40 text-sm mb-3">Nessuna edizione aggiuntiva.</p>
              )}

              {edizioni.map(e => (
                <div key={e.id} className="flex items-start gap-3 border border-cyan/10 p-3 mb-2">
                  {e.copertina_url && (
                    <img src={e.copertina_url} alt="" className="w-12 h-16 object-cover ring-1 ring-cyan/20 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {e.edizione && <div className="font-mono text-[10px] uppercase tracking-widest text-cyan/70">{e.edizione}</div>}
                    <div className="font-mono text-[9px] text-bone/50 tracking-widest mt-1">
                      {[e.anno, e.isbn].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteEdizione(e.id)} className="font-mono text-[9px] text-magenta/40 hover:text-magenta transition-colors flex-shrink-0">✕</button>
                </div>
              ))}

              {showEditionForm && (
                <div className="border border-cyan/20 bg-cyan/5 p-4 space-y-4 mt-3">
                  <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/60 uppercase">// nuova edizione</div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <span className={labelClass}>↳ Edizione</span>
                      <input value={edEdizione} onChange={e => setEdEdizione(e.target.value)} placeholder="Es. Seconda edizione" className={inputClass} />
                    </div>
                    <div>
                      <span className={labelClass}>↳ Anno</span>
                      <input value={edAnno} onChange={e => setEdAnno(e.target.value)} type="number" className={inputClass} />
                    </div>
                    <div>
                      <span className={labelClass}>↳ ISBN</span>
                      <input value={edIsbn} onChange={e => setEdIsbn(e.target.value)} placeholder="978-88-..." className={inputClass} />
                    </div>
                    <div>
                      <span className={labelClass}>↳ Copertina</span>
                      <input ref={edCopertinaRef} type="file" accept="image/*" onChange={e => setEdCopertina(e.target.files?.[0] ?? null)} className="hidden" />
                      <button type="button" onClick={() => edCopertinaRef.current?.click()}
                        className="mt-2 w-full border border-cyan/30 px-4 py-3 font-mono text-[10px] text-left uppercase tracking-widest hover:border-cyan hover:text-cyan transition-all text-bone/60">
                        {edCopertina ? `✓ ${edCopertina.name}` : "▸ Scegli immagine"}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <HudButton variant="primary" onClick={handleSaveEdizione} disabled={savingEdition}>
                      {savingEdition ? "▸ Salvataggio..." : "▸ Salva edizione"}
                    </HudButton>
                    <HudButton variant="ghost" onClick={() => setShowEditionForm(false)}>annulla</HudButton>
                  </div>
                </div>
              )}

              {/* Capitoli */}
              <div className="hud-divider my-5" />
              <div className="flex items-center justify-between mb-3">
                <span className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase">// capitoli</span>
                {!showCapitoloForm && (
                  <button
                    onClick={() => {
                      setEditingCapitoloId(null);
                      setCapTitolo("");
                      setCapTesto("");
                      setCapOrdine(capitoli.length + 1);
                      setShowCapitoloForm(true);
                    }}
                    className="font-mono text-[10px] tracking-widest text-magenta uppercase hover:text-cyan transition-colors"
                  >
                    + nuovo capitolo
                  </button>
                )}
              </div>

              {capitoli.length === 0 && !showCapitoloForm && (
                <p className="font-serif italic text-bone/40 text-sm mb-3">Nessun capitolo aggiunto.</p>
              )}

              {capitoli.map((c) => (
                <div key={c.id} className="flex items-center gap-3 border border-cyan/10 p-3 mb-2">
                  <span className="font-mono text-[10px] text-cyan/40 w-6 flex-shrink-0">{String(c.ordine).padStart(2, "0")}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-widest text-bone/70 truncate">{c.titolo}</div>
                    <div className="font-mono text-[9px] text-bone/30 mt-0.5 truncate">{c.testo.slice(0, 80)}…</div>
                  </div>
                  <button onClick={() => handleEditCapitolo(c)} className="font-mono text-[9px] text-cyan/40 hover:text-cyan transition-colors flex-shrink-0">✎</button>
                  <button onClick={() => handleDeleteCapitolo(c.id)} className="font-mono text-[9px] text-magenta/40 hover:text-magenta transition-colors flex-shrink-0">✕</button>
                </div>
              ))}

              {showCapitoloForm && (
                <div className="border border-cyan/20 bg-cyan/5 p-4 space-y-4 mt-3">
                  <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/60 uppercase">
                    // {editingCapitoloId ? "modifica capitolo" : "nuovo capitolo"}
                  </div>
                  <div className="grid sm:grid-cols-4 gap-4">
                    <div>
                      <span className={labelClass}>↳ Ordine</span>
                      <input
                        value={capOrdine}
                        onChange={e => setCapOrdine(parseInt(e.target.value) || 1)}
                        type="number" min={1}
                        className={inputClass}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <span className={labelClass}>↳ Titolo capitolo</span>
                      <input
                        value={capTitolo}
                        onChange={e => setCapTitolo(e.target.value)}
                        placeholder="Es. Capitolo I — L'inizio"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div>
                    <span className={labelClass}>↳ Testo</span>
                    <textarea
                      value={capTesto}
                      onChange={e => setCapTesto(e.target.value)}
                      placeholder="Il testo del capitolo. Separa i paragrafi con una riga vuota."
                      className="mt-2 w-full min-h-48 bg-void/40 border border-cyan/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan transition-all"
                    />
                  </div>
                  <div className="flex gap-3">
                    <HudButton variant="primary" onClick={handleSaveCapitolo} disabled={savingCapitolo || !capTitolo.trim()}>
                      {savingCapitolo ? "▸ Salvataggio..." : editingCapitoloId ? "▸ Aggiorna capitolo" : "▸ Salva capitolo"}
                    </HudButton>
                    <HudButton variant="ghost" onClick={() => { setShowCapitoloForm(false); setEditingCapitoloId(null); }}>
                      annulla
                    </HudButton>
                  </div>
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap gap-3">
                  {selected.disponibile ? (
                    <>
                      <HudButton variant="ghost" onClick={handleModifica} disabled={confirmDelete}>◆ Modifica</HudButton>
                      <HudButton
                        variant="ghost"
                        onClick={() => setConfirmDelete(true)}
                        disabled={confirmDelete}
                      >
                        ⊗ Archivia
                      </HudButton>
                    </>
                  ) : (
                    <>
                      <HudButton variant="ghost" onClick={handleModifica}>◆ Modifica</HudButton>
                      <HudButton variant="primary" onClick={() => handleRipristina(selected)}>▸ Ripristina</HudButton>
                    </>
                  )}
                </div>
                {confirmDelete && (
                  <div className="border border-magenta/50 bg-magenta/5 p-4 space-y-3">
                    <p className="font-mono text-[10px] tracking-widest text-magenta uppercase">
                      ⚠ L'opera verrà archiviata. Potrai ripristinarla in qualsiasi momento.
                    </p>
                    <div className="flex gap-3">
                      <HudButton variant="magenta" onClick={handleElimina}>Conferma</HudButton>
                      <HudButton variant="ghost" onClick={() => setConfirmDelete(false)}>Annulla</HudButton>
                    </div>
                  </div>
                )}
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

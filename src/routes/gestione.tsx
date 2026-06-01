import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { RichTextEditor } from "@/components/RichTextEditor";
import { supabase } from "@/lib/supabase";

type Capitolo = {
  id: string;
  book_id: string;
  ordine: number;
  titolo: string;
  testo: string;
  created_at: string;
};

type Allegato = {
  id: string;
  book_id: string;
  titolo: string;
  descrizione: string | null;
  file_url: string;
  tipo: string;
  ordine: number;
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

type Collana = {
  id: string;
  slug: string;
  titolo: string;
  descrizione: string | null;
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
  epub_url: string | null;
  docx_url: string | null;
  disponibile: boolean;
  cestinato: boolean;
  recuperato: boolean;
  voti_cestino: number;
  slug: string;
  letture: number;
  downloads: number;
  created_at: string;
  collana_id: string | null;
};

const GENERI = ["libro", "racconto", "saggio", "articolo", "novelle", "poesia"] as const;
const GENERE_LABELS: Record<string, string> = {
  libro: "Libro", racconto: "Racconto", saggio: "Saggio", articolo: "Articolo",
  novelle: "Novelle", poesia: "Poesia",
};
const GENERE_TOOLTIP: Record<string, string> = {
  novelle: "Racconti brevi",
};
const ACCESSI = ["gratuito", "premium", "riservato"] as const;
const TARGET = ["tutti", "bambini (0–8)", "ragazzi (9–12)", "adolescenti (13–17)", "adulti (18+)"] as const;
const TIPI = [
  "— Narrativa —",
  "Romanzo", "Romanzo storico", "Romanzo di formazione", "Romanzo epistolare",
  "Fantasy", "Fantasy epico", "Fantasy urbano",
  "Fantascienza", "Fantascienza letteraria", "Fantascienza sociale", "Distopia", "Ucronia",
  "Thriller", "Legal thriller", "Thriller psicologico",
  "Giallo / Noir", "Horror", "Gotico",
  "Romanzo sentimentale", "Avventura", "Umorismo", "Realismo magico",
  "— Saggistica —",
  "Saggio storico", "Saggio scientifico", "Saggio filosofico", "Saggio politico",
  "Autobiografia", "Biografia", "Memoir", "Self-help", "Divulgazione", "Psicologia",
  "— Racconti —",
  "Raccolta di racconti", "Racconto lungo / Novella",
  "— Per ragazzi —",
  "Favola / Fiaba", "Racconto per ragazzi", "Avventura per ragazzi",
  "— —",
  "Altro (specifica sotto)",
] as const;

const TIPI_SELEZIONABILI = TIPI.filter(t => !t.startsWith("—"));
const ALTRO_TIPO = "Altro (specifica sotto)";

const inputClass = "mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all";
const labelClass = "font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase";

const BRAND_LOGO_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/copertine/brand/anthea-delori-logo.png`;

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
  const [confirmMode, setConfirmMode] = useState<"archivia" | "cestino" | null>(null);
  const [openSection, setOpenSection] = useState<0 | 1 | 2 | 3 | 4 | 5>(1);
  const [savingMateriali, setSavingMateriali] = useState(false);
  const [saveMaterialiError, setSaveMaterialiError] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState("");

  // Collane
  const [collane, setCollane] = useState<Collana[]>([]);
  const [selectedCollana, setSelectedCollana] = useState<Collana | null>(null);
  const [showCollanaForm, setShowCollanaForm] = useState(false);
  const [showCollanaList, setShowCollanaList] = useState(false);
  const [savingCollana, setSavingCollana] = useState(false);
  const [collanaError, setCollanaError] = useState<string | null>(null);
  const [collanaEditingId, setCollanaEditingId] = useState<string | null>(null);
  const [confirmDeleteCollana, setConfirmDeleteCollana] = useState(false);
  const [confirmDeleteNovella, setConfirmDeleteNovella] = useState<string | null>(null);
  const [collanaTitolo, setCollanaTitolo] = useState("");
  const [collanaDescrizione, setCollanaDescrizione] = useState("");
  const [collanaCopertina, setCollanaCopertina] = useState<File | null>(null);
  const [existingCollanaCopertina, setExistingCollanaCopertina] = useState<string | null>(null);
  const collanaCopertinaRef = useRef<HTMLInputElement>(null);
  const [collanaId, setCollanaId] = useState("");

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
  const [capError, setCapError] = useState<string | null>(null);
  const [editingCapitoloId, setEditingCapitoloId] = useState<string | null>(null);
  const [confirmDeleteCapitoloId, setConfirmDeleteCapitoloId] = useState<string | null>(null);
  const [capTitolo, setCapTitolo] = useState("");
  const [capTesto, setCapTesto] = useState("");
  const [capOrdine, setCapOrdine] = useState(1);

  // Allegati / Materiali extra
  const [allegati, setAllegati] = useState<Allegato[]>([]);
  const [showAllegatoForm, setShowAllegatoForm] = useState(false);
  const [savingAllegato, setSavingAllegato] = useState(false);
  const [allegaError, setAllegaError] = useState<string | null>(null);
  const [allegaTitolo, setAllegaTitolo] = useState("");
  const [allegaDescrizione, setAllegaDescrizione] = useState("");
  const [allegaFile, setAllegaFile] = useState<File | null>(null);
  const [confirmDeleteAllegatoId, setConfirmDeleteAllegatoId] = useState<string | null>(null);
  const [editingAllegatoId, setEditingAllegatoId] = useState<string | null>(null);
  const allegaFileRef = useRef<HTMLInputElement>(null);

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
  const [testoCompleto, setTestoCompleto] = useState("");
  const [tagStr, setTagStr] = useState("");
  const [copertina, setCopertina] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [lastra, setLastra] = useState<File | null>(null);
  const [filePdf, setFilePdf] = useState<File | null>(null);
  const [existingCopertinaUrl, setExistingCopertinaUrl] = useState<string | null>(null);
  const [existingFlatUrl, setExistingFlatUrl] = useState<string | null>(null);
  const [existingRottaUrl, setExistingRottaUrl] = useState<string | null>(null);
  const [existingLastraUrl, setExistingLastraUrl] = useState<string | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | null>(null);
  const [fileEpub, setFileEpub] = useState<File | null>(null);
  const [existingEpubUrl, setExistingEpubUrl] = useState<string | null>(null);
  const [savingMaterialiStep, setSavingMaterialiStep] = useState<"uploading" | "baking" | "saving" | null>(null);

  // Generazione automatica documenti da .docx (PDF + ePub in un click)
  const [docxFile, setDocxFile] = useState<File | null>(null);
  const [existingDocxUrl, setExistingDocxUrl] = useState<string | null>(null);
  const [docGenerating, setDocGenerating] = useState(false);
  const [docGenPdfOk, setDocGenPdfOk] = useState(false);
  const [docGenEpubOk, setDocGenEpubOk] = useState(false);
  const [docGenError, setDocGenError] = useState<string | null>(null);
  const [docProgress, setDocProgress] = useState(0);
  const [pdfConvUsed, setPdfConvUsed] = useState(0);
  const [epubConvUsed, setEpubConvUsed] = useState(0);

  const copertRef = useRef<HTMLInputElement>(null);
  const lastraRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const epubRef = useRef<HTMLInputElement>(null);
  const docxRef = useRef<HTMLInputElement>(null);

  // AI cover generation
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiGeneratedUrl, setAiGeneratedUrl] = useState<string | null>(null);
  const [aiGeneratedFlatUrl, setAiGeneratedFlatUrl] = useState<string | null>(null);
  const [aiGeneratedRottaUrl, setAiGeneratedRottaUrl] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiCoverForm, setShowAiCoverForm] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSent, setTicketSent] = useState(false);
  const [ticketSending, setTicketSending] = useState(false);
  const [aiModalUrl, setAiModalUrl] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState(0);
  const [savingAiCover, setSavingAiCover] = useState(false);
  const [saveAiCoverError, setSaveAiCoverError] = useState<string | null>(null);
  const [saveFlash, setSaveFlash] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{ deleted: number; total_in_bucket: number; errors: string[] } | null>(null);
  const cestinoSectionRef = useRef<HTMLDivElement>(null);
  const cestinoScrolled = useRef(false);

  // Copertina da stampa
  const [coverFormato, setCoverFormato] = useState("a5");
  const [coverNumeroPagine, setCoverNumeroPagine] = useState("");
  const [coverQuartaTesto, setCoverQuartaTesto] = useState("");
  const [coverAlettaSxTesto, setCoverAlettaSxTesto] = useState("");
  const [coverAlettaDxTesto, setCoverAlettaDxTesto] = useState("");
  const [coverFotoAutore, setCoverFotoAutore] = useState<File | null>(null);
  const [existingCoverFotoAutoreUrl, setExistingCoverFotoAutoreUrl] = useState<string | null>(null);
  const [coverHasIsbn, setCoverHasIsbn] = useState(false);
  const [coverIsbn, setCoverIsbn] = useState("");
  const [coverPrezzo, setCoverPrezzo] = useState("");
  const [existingCoverStampaUrl, setExistingCoverStampaUrl] = useState<string | null>(null);
  const [existingCoverStampaBleedUrl, setExistingCoverStampaBleedUrl] = useState<string | null>(null);
  const [savingCoverStampa, setSavingCoverStampa] = useState(false);
  const [coverStampaError, setCoverStampaError] = useState<string | null>(null);
  const [generatingCoverStampa, setGeneratingCoverStampa] = useState(false);
  const [coverStampaGenOk, setCoverStampaGenOk] = useState(false);
  const coverFotoAutoreRef = useRef<HTMLInputElement>(null);

  // Anteprima copertina: crea/revoca object URL al cambio file
  useEffect(() => {
    if (!copertina) { setCoverPreviewUrl(null); return; }
    const url = URL.createObjectURL(copertina);
    setCoverPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [copertina]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.replace("/auth"); return; }
      setUserId(user.id);
      setIsAdmin(user.email?.toLowerCase() === "antheadelori@live.it");

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
      await loadCollane(user.id);
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

  const loadCollane = async (uid: string) => {
    const { data } = await supabase.from("collane").select("*").eq("author_id", uid).order("created_at");
    setCollane(data ?? []);
  };

  const resetForm = () => {
    setTitolo(""); setSottotitolo(""); setGenere("libro"); setEdizione("");
    setAnno(String(new Date().getFullYear())); setLingua("it"); setAccesso("gratuito");
    setTipo(""); setTipoAltro(""); setTarget("tutti"); setIsbn("");
    setDescrizione(""); setEstratto(""); setTestoCompleto(""); setTagStr("");
    setCopertina(null); setLastra(null); setFilePdf(null); setSaveError(null);
    setEditingId(null); setConfirmMode(null);
    setExistingCopertinaUrl(null); setExistingLastraUrl(null); setExistingFileUrl(null);
    setCollanaId("");
    setCoverFormato("a5"); setCoverNumeroPagine(""); setCoverQuartaTesto("");
    setCoverAlettaSxTesto(""); setCoverAlettaDxTesto(""); setCoverIsbn("");
    setCoverHasIsbn(false); setCoverPrezzo(""); setCoverFotoAutore(null);
    setExistingCoverFotoAutoreUrl(null); setExistingCoverStampaUrl(null);
    setExistingCoverStampaBleedUrl(null); setCoverStampaGenOk(false); setCoverStampaError(null);
  };

  const resetCollanaForm = () => {
    setCollanaTitolo(""); setCollanaDescrizione(""); setCollanaCopertina(null);
    setExistingCollanaCopertina(null); setCollanaEditingId(null); setCollanaError(null);
    if (collanaCopertinaRef.current) collanaCopertinaRef.current.value = "";
  };

  const handleSaveCollana = async () => {
    if (!userId || !collanaTitolo.trim()) return;
    setSavingCollana(true); setCollanaError(null);
    try {
      let copertina_url: string | null = existingCollanaCopertina;
      if (collanaCopertina) {
        const ext = collanaCopertina.name.split(".").pop();
        const path = `${userId}/collana-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("copertine").upload(path, collanaCopertina, { upsert: true });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("copertine").getPublicUrl(path);
          copertina_url = urlData.publicUrl;
        }
      }
      if (collanaEditingId) {
        const { error } = await supabase.from("collane").update({
          titolo: collanaTitolo.trim(), descrizione: collanaDescrizione.trim() || null, copertina_url,
        }).eq("id", collanaEditingId);
        if (error) { setCollanaError(error.message); return; }
        if (selectedCollana) setSelectedCollana({ ...selectedCollana, titolo: collanaTitolo.trim(), descrizione: collanaDescrizione.trim() || null, copertina_url });
      } else {
        const slug = generateSlug(collanaTitolo) + "-" + Date.now().toString(36);
        const { error } = await supabase.from("collane").insert({
          author_id: userId, slug, titolo: collanaTitolo.trim(),
          descrizione: collanaDescrizione.trim() || null, copertina_url,
        });
        if (error) { setCollanaError(error.message); return; }
      }
      await loadCollane(userId);
      resetCollanaForm(); setShowCollanaForm(false);
    } finally { setSavingCollana(false); }
  };

  const handleEditCollana = () => {
    if (!selectedCollana) return;
    setCollanaTitolo(selectedCollana.titolo);
    setCollanaDescrizione(selectedCollana.descrizione ?? "");
    setExistingCollanaCopertina(selectedCollana.copertina_url);
    setCollanaCopertina(null); setCollanaEditingId(selectedCollana.id); setCollanaError(null);
    setShowCollanaForm(true);
  };

  const handleDeleteCollana = async () => {
    if (!selectedCollana || !userId) return;
    await supabase.from("collane").delete().eq("id", selectedCollana.id);
    setSelectedCollana(null); setConfirmDeleteCollana(false);
    await loadCollane(userId);
  };

  const handleNewBook = () => {
    resetForm();
    if (filterGenere) setGenere(filterGenere);
    setSelected(null);
    setOpenSection(1);
    setShowForm(true);
  };

  const handleNewBookInCollana = (cId: string) => {
    resetForm();
    setCollanaId(cId);
    setGenere("novelle");
    setSelected(null);
    setSelectedCollana(null);
    setShowCollanaForm(false);
    setShowCollanaList(false);
    setOpenSection(1);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!aiGenerating) { setAiProgress(0); return; }
    setAiProgress(0);
    const iv = setInterval(() => setAiProgress(p => (p + 1) % 21), 4000);
    return () => clearInterval(iv);
  }, [aiGenerating]);

  useEffect(() => {
    if (!docGenerating) { setDocProgress(0); return; }
    setDocProgress(0);
    const iv = setInterval(() => setDocProgress(p => (p + 1) % 10), 3000);
    return () => clearInterval(iv);
  }, [docGenerating]);

  // auto-scroll al cestino rimosso: disturbava il caricamento della pagina

  useEffect(() => {
    if (!selected) {
      setEdizioni([]); setShowEditionForm(false);
      setCapitoli([]); setShowCapitoloForm(false);
      setAllegati([]); setShowAllegatoForm(false);
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
    const loadAllegati = async () => {
      const { data } = await supabase.from("allegati").select("*").eq("book_id", selected.id).order("ordine");
      setAllegati(data ?? []);
    };
    loadEdizioni();
    loadCapitoli();
    loadAllegati();
    setShowEditionForm(false);
    setShowCapitoloForm(false);
    setShowAllegatoForm(false);
  }, [selected?.id]);

  const handleSelectBook = (b: Book) => {
    setSelected(b);
    setShowForm(false);
    setEditingId(null);
    setConfirmMode(null);
  };

  const openEditForm = (b: Book) => {
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
      setTipo(ALTRO_TIPO);
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
    if (b.collana_id) {
      supabase.from("capitoli").select("testo").eq("book_id", b.id).eq("ordine", 1).maybeSingle()
        .then(({ data }) => setTestoCompleto(data?.testo ?? ""));
    } else {
      setTestoCompleto("");
    }
    setCopertina(null);
    setLastra(null);
    setFilePdf(null);
    setFileEpub(null);
    setExistingCopertinaUrl(b.copertina_url);
    setExistingFlatUrl((b as unknown as Record<string, string | null>).copertina_flat_url ?? null);
    setExistingRottaUrl((b as unknown as Record<string, string | null>).copertina_rotta_url ?? null);
    setExistingLastraUrl(b.lastra_url);
    setExistingFileUrl(b.file_url);
    setExistingEpubUrl(b.epub_url);
    setExistingDocxUrl(b.docx_url ?? null);
    setDocxFile(null);
    setDocGenPdfOk(false);
    setDocGenEpubOk(false);
    setDocGenError(null);
    setCollanaId(b.collana_id ?? "");
    // Copertina da stampa
    const bcs = b as unknown as Record<string, string | number | null>;
    setCoverFormato((bcs.cover_formato as string) ?? "a5");
    setCoverNumeroPagine(bcs.cover_numero_pagine ? String(bcs.cover_numero_pagine) : "");
    setCoverQuartaTesto((bcs.cover_quarta_testo as string) ?? "");
    setCoverAlettaSxTesto((bcs.cover_aletta_sx_testo as string) ?? "");
    setCoverAlettaDxTesto((bcs.cover_aletta_dx_testo as string) ?? "");
    const existingIsbn = (bcs.cover_isbn as string) ?? "";
    setCoverIsbn(existingIsbn);
    setCoverHasIsbn(!!existingIsbn);
    setCoverPrezzo((bcs.cover_prezzo as string) ?? "");
    setExistingCoverFotoAutoreUrl((bcs.cover_foto_autore_url as string) ?? null);
    setExistingCoverStampaUrl((bcs.cover_stampa_url as string) ?? null);
    setExistingCoverStampaBleedUrl((bcs.cover_stampa_bleed_url as string) ?? null);
    setCoverFotoAutore(null);
    setCoverStampaGenOk(false);
    setCoverStampaError(null);
    // Carica contatori conversioni
    supabase.from("book_conversions").select("id", { count: "exact", head: true })
      .eq("book_id", b.id).eq("format", "pdf")
      .then(({ count }) => setPdfConvUsed(count ?? 0));
    supabase.from("book_conversions").select("id", { count: "exact", head: true })
      .eq("book_id", b.id).eq("format", "epub")
      .then(({ count }) => setEpubConvUsed(count ?? 0));
    setEditingId(b.id);
    // reset AI cover state and load attempt count
    setAiGeneratedUrl(null);
    setAiError(null);
    setAiPrompt("");
    setShowTicketForm(false);
    setTicketMessage("");
    setTicketSent(false);
    // Carica contatore tentativi + ultimo prompt usato (per non perderlo al rientro)
    supabase
      .from("ai_cover_attempts")
      .select("id, prompt", { count: "exact" })
      .eq("book_id", b.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data, count }) => {
        setAiUsed(count ?? 0);
        if (data?.[0]?.prompt) setAiPrompt(data[0].prompt);
      });
    setSaveError(null);
    setConfirmMode(null);
    setOpenSection(1);
    setShowForm(true);
  };

  const handleModifica = () => {
    if (!selected) return;
    openEditForm(selected);
  };

  const handleGenerateCover = async () => {
    if (!editingId || !aiPrompt.trim() || !userId) return;
    setAiGenerating(true);
    setAiError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Chiama la edge function — restituisce cover_b64 + logo_b64
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ book_id: editingId, prompt: aiPrompt, book_title: titolo, author_name: authorName }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "limit_reached") setAiUsed(10);
        else setAiError(data.error ?? "Errore nella generazione. Riprova.");
        return;
      }

      // 2. Registra il tentativo (cover_url già salvata dall'edge function)
      await supabase.from("ai_cover_attempts").insert({
        book_id: editingId,
        author_id: userId,
        image_url: data.cover_url,
        prompt: aiPrompt,
      });

      setAiGeneratedUrl(data.cover_url);
      setAiGeneratedFlatUrl(data.flat_url ?? null);
      setAiGeneratedRottaUrl(data.rotta_url ?? null);
      setAiUsed(data.used);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "Errore di connessione. Riprova.");
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSendTicket = async (bookTitle: string) => {
    if (!editingId || !ticketMessage.trim()) return;
    setTicketSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "ticket",
            book_id: editingId,
            book_title: bookTitle,
            message: ticketMessage,
          }),
        },
      );
      if (res.ok) setTicketSent(true);
      else setAiError("Errore nell'invio della richiesta. Riprova.");
    } catch {
      setAiError("Errore di connessione. Riprova.");
    } finally {
      setTicketSending(false);
    }
  };

  // Carica .docx e genera PDF + ePub in sequenza
  const handleGenerateDocs = async () => {
    if (!editingId || !userId || (!docxFile && !existingDocxUrl)) return;
    setDocGenerating(true);
    setDocGenError(null);
    setDocGenPdfOk(false);
    setDocGenEpubOk(false);
    try {
      // 1. Carica il .docx se è nuovo
      if (docxFile) {
        const path = `${userId}/${editingId}-source.docx`;
        const { error: upErr } = await supabase.storage.from("libri").upload(path, docxFile, { upsert: true });
        if (upErr) { setDocGenError(upErr.message); return; }
        await supabase.from("books").update({ docx_url: path }).eq("id", editingId);
        setExistingDocxUrl(path);
        setDocxFile(null);
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const call = async (format: "pdf" | "epub") => {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-pdf`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ book_id: editingId, format }),
        });
        return { ok: res.ok, data: await res.json() };
      };
      // 2. Genera PDF (se entro limite)
      if (isAdmin || pdfConvUsed < 10) {
        const { ok, data } = await call("pdf");
        if (ok) { setExistingFileUrl(data.file_path); setPdfConvUsed(data.used); setDocGenPdfOk(true); }
        else if (data.error !== "limit_reached") { setDocGenError(`PDF: ${data.error ?? "errore"}`); return; }
      }
      // 3. Genera ePub (se entro limite)
      if (isAdmin || epubConvUsed < 10) {
        const { ok, data } = await call("epub");
        if (ok) { setExistingEpubUrl(data.file_path); setEpubConvUsed(data.used); setDocGenEpubOk(true); }
        else if (data.error !== "limit_reached") { setDocGenError(`ePub: ${data.error ?? "errore"}`); }
      }
    } catch (e) {
      setDocGenError(e instanceof Error ? e.message : "Errore di connessione. Riprova.");
    } finally {
      setDocGenerating(false);
    }
  };

  // Salva i testi e le impostazioni della copertina da stampa
  const handleSaveCoverStampa = async () => {
    if (!editingId || !userId) return;
    setSavingCoverStampa(true); setCoverStampaError(null);
    try {
      let fotoUrl = existingCoverFotoAutoreUrl;
      if (coverFotoAutore) {
        const ext = coverFotoAutore.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${editingId}-foto-autore.${ext}`;
        const { error: upErr } = await supabase.storage.from("copertine").upload(path, coverFotoAutore, { upsert: true });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("copertine").getPublicUrl(path);
          fotoUrl = urlData.publicUrl;
          setExistingCoverFotoAutoreUrl(fotoUrl);
          setCoverFotoAutore(null);
        }
      }
      const { error } = await supabase.from("books").update({
        cover_formato: coverFormato,
        cover_numero_pagine: coverNumeroPagine ? parseInt(coverNumeroPagine) : null,
        cover_quarta_testo: coverQuartaTesto.trim() || null,
        cover_aletta_sx_testo: coverAlettaSxTesto.trim() || null,
        cover_aletta_dx_testo: coverAlettaDxTesto.trim() || null,
        cover_foto_autore_url: fotoUrl,
        cover_isbn: coverHasIsbn ? (coverIsbn.trim() || null) : null,
        cover_prezzo: coverPrezzo.trim() || null,
      }).eq("id", editingId);
      if (error) { setCoverStampaError(error.message); return; }
      await loadBooks(userId);
    } finally {
      setSavingCoverStampa(false);
    }
  };

  // Genera la copertina da stampa (chiama l'EF generate-full-cover)
  const handleGenerateCoverStampa = async () => {
    if (!editingId || !userId) return;
    setGeneratingCoverStampa(true); setCoverStampaError(null); setCoverStampaGenOk(false);
    try {
      await handleSaveCoverStampa();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-full-cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ book_id: editingId, formato: coverFormato }),
      });
      const data = await res.json();
      if (!res.ok) { setCoverStampaError(data.error ?? "Errore generazione copertina"); return; }
      setExistingCoverStampaUrl(data.stampa_url ?? null);
      setExistingCoverStampaBleedUrl(data.stampa_bleed_url ?? null);
      if (data.numero_pagine) setCoverNumeroPagine(String(data.numero_pagine));
      setCoverStampaGenOk(true);
      await loadBooks(userId);
    } finally {
      setGeneratingCoverStampa(false);
    }
  };

  // Normalizza la copertina: ridimensiona proporzionalmente entro 600×1000px,
  // converte in JPEG e comprime finché ≤ 800KB. Non forza dimensioni esatte.
  const resizeCover = (file: File): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_W = 600, MAX_H = 1000, MAX_BYTES = 800_000;

        // Scala proporzionalmente solo se supera i limiti massimi
        let w = img.width, h = img.height;
        if (w > MAX_W || h > MAX_H) {
          const scale = Math.min(MAX_W / w, MAX_H / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d")!;
        // Sfondo nero per gestire PNG con trasparenza
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        // Prova qualità 0.90 → 0.80 → 0.70 → 0.60 finché ≤ 800KB
        const tryEncode = (q: number) => {
          canvas.toBlob(blob => {
            if (!blob) return reject(new Error("Canvas toBlob fallito"));
            if (blob.size <= MAX_BYTES || q <= 0.60) return resolve(blob);
            tryEncode(q - 0.10);
          }, "image/jpeg", q);
        };
        tryEncode(0.90);
      };
      img.onerror = reject;
      img.src = url;
    });

  const uploadFile = async (file: File, bucket: string, path: string): Promise<string> => {
    // Normalizza automaticamente le copertine caricate manualmente (resize → JPEG ≤500KB)
    let toUpload: File | Blob = file;
    const isImage = bucket === "copertine" && file.type.startsWith("image/");
    if (isImage) {
      try {
        toUpload = await resizeCover(file);
      } catch {
        // fallback: carica il file originale se il resize fallisce
      }
    }
    // Usa sempre .jpg per le copertine (il resize converte in JPEG)
    const finalPath = isImage ? path.replace(/\.[^.]+$/, ".jpg") : path;
    const contentType = isImage ? "image/jpeg" : file.type || "application/octet-stream";
    const { error } = await supabase.storage.from(bucket).upload(finalPath, toUpload, {
      upsert: true,
      contentType,
    });
    if (error) throw new Error(error.message);
    if (bucket === "copertine") {
      const { data } = supabase.storage.from(bucket).getPublicUrl(finalPath);
      return data.publicUrl;
    }
    return finalPath;
  };

  const handleSave = async () => {
    if (!userId || !titolo.trim()) return;
    setSaving(true);
    setSaveError(null);

    try {
      let newBookId: string | null = null;

      if (editingId) {
        const { error } = await supabase.from("books").update({
          titolo: titolo.trim(),
          sottotitolo: sottotitolo.trim() || null,
          genere,
          tipo: tipo === ALTRO_TIPO ? (tipoAltro.trim() || null) : (tipo || null),
          target: target || null,
          isbn: isbn.trim() || null,
          edizione: edizione.trim() || null,
          anno: anno ? parseInt(anno) : null,
          lingua,
          accesso,
          descrizione: descrizione.trim() || null,
          estratto: estratto.trim() || null,
          tag: tagStr ? tagStr.split(",").map(t => t.trim()).filter(Boolean) : [],
          author_name: authorName || null,
          collana_id: collanaId || null,
        }).eq("id", editingId);

        if (error) { setSaveError(error.message); return; }
      } else {
        const slug = generateSlug(titolo) + "-" + Date.now().toString(36);

        const { data: insertData, error } = await supabase.from("books").insert({
          author_id: userId,
          slug,
          titolo: titolo.trim(),
          sottotitolo: sottotitolo.trim() || null,
          genere,
          tipo: tipo === ALTRO_TIPO ? (tipoAltro.trim() || null) : (tipo || null),
          target: target || null,
          isbn: isbn.trim() || null,
          edizione: edizione.trim() || null,
          anno: anno ? parseInt(anno) : null,
          lingua,
          accesso,
          descrizione: descrizione.trim() || null,
          estratto: estratto.trim() || null,
          tag: tagStr ? tagStr.split(",").map(t => t.trim()).filter(Boolean) : [],
          author_name: authorName || null,
          collana_id: collanaId || null,
        }).select("id").single();

        if (error) { setSaveError(error.message); return; }
        newBookId = insertData?.id ?? null;
      }

      // Salva testo completo come capitolo 1 se siamo in una collana
      const savedBookId = editingId ?? newBookId;
      if (collanaId && testoCompleto.trim() && savedBookId) {
        const { data: existing } = await supabase.from("capitoli").select("id").eq("book_id", savedBookId).eq("ordine", 1).maybeSingle();
        if (existing) {
          await supabase.from("capitoli").update({ testo: testoCompleto.trim() }).eq("id", existing.id);
        } else {
          await supabase.from("capitoli").insert({ book_id: savedBookId, titolo: "Racconto", testo: testoCompleto.trim(), ordine: 1 });
        }
      } else if (collanaId && !testoCompleto.trim() && savedBookId) {
        await supabase.from("capitoli").delete().eq("book_id", savedBookId).eq("ordine", 1);
      }

      // Nuova opera salvata → sblocca sezioni 02 e 03, vai ai capitoli
      if (!editingId && newBookId) {
        setEditingId(newBookId);
        const { data: nb } = await supabase.from("books").select("*").eq("id", newBookId).single();
        if (nb) setSelected(nb as Book);
        setOpenSection(2);
      } else if (editingId) {
        // Aggiornamento → chiudi tutti i box e lampeggia CHIUDI
        setOpenSection(0);
        setSaveFlash(true);
        setTimeout(() => setSaveFlash(false), 4000);
      }
      await loadBooks(userId);
    } catch {
      setSaveError("Errore durante il salvataggio. Riprova.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMateriali = async () => {
    if (!editingId || !userId) return;
    setSavingMateriali(true);
    setSavingMaterialiStep(null);
    setSaveMaterialiError(null);
    try {
      let copertina_url: string | null = existingCopertinaUrl;
      let copertina_flat_url: string | null = existingFlatUrl;
      let copertina_rotta_url: string | null = existingRottaUrl;
      let lastra_url: string | null = existingLastraUrl;
      let file_url: string | null = existingFileUrl;
      let epub_url: string | null = existingEpubUrl;

      if (copertina) {
        // Cancella i vecchi file copertina prima di caricare i nuovi
        const oldCoverPaths = [existingCopertinaUrl, existingFlatUrl, existingRottaUrl]
          .map(storagePathFromUrl)
          .filter((p): p is string => !!p && !p.startsWith("brand/"));
        if (oldCoverPaths.length > 0) {
          await supabase.storage.from("copertine").remove(oldCoverPaths);
        }

        // Step 1: upload flat
        setSavingMaterialiStep("uploading");
        const flatPath = `manual-flat/${userId}/${editingId}/${Date.now()}.jpg`;
        copertina_flat_url = await uploadFile(copertina, "copertine", flatPath);

        // Step 2: bake teca prospettica via Edge Function
        setSavingMaterialiStep("baking");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Sessione scaduta — rieffettua il login.");
        const bakeRes = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ action: "bakeCover", book_id: editingId, flat_url: copertina_flat_url }),
          },
        );
        const bakeData = await bakeRes.json();
        if (!bakeRes.ok) throw new Error(bakeData.error ?? "Errore nella lavorazione della teca. Riprova.");
        copertina_url = bakeData.cover_url;           // include ?v=teca
        copertina_rotta_url = bakeData.rotta_url ?? copertina_rotta_url;
      }
      if (lastra) {
        lastra_url = await uploadFile(lastra, "copertine", `${userId}/${editingId}-lastra.jpg`);
      }
      if (filePdf) {
        const ext = filePdf.name.split(".").pop() ?? "pdf";
        file_url = await uploadFile(filePdf, "libri", `${userId}/${editingId}-file.${ext}`);
      }
      if (fileEpub) {
        epub_url = await uploadFile(fileEpub, "libri", `${userId}/${editingId}-epub.epub`);
      }

      setSavingMaterialiStep("saving");
      const { error } = await supabase.from("books").update({
        copertina_url,
        copertina_flat_url,
        copertina_rotta_url,
        lastra_url,
        file_url,
        epub_url,
      }).eq("id", editingId);

      if (error) { setSaveMaterialiError(error.message); return; }

      setExistingCopertinaUrl(copertina_url);
      setExistingFlatUrl(copertina_flat_url);
      setExistingRottaUrl(copertina_rotta_url);
      setExistingLastraUrl(lastra_url);
      setExistingFileUrl(file_url);
      setExistingEpubUrl(epub_url);
      // Aggiorna il dettaglio immediatamente senza aspettare loadBooks
      if (selected) setSelected({ ...selected, copertina_url } as typeof selected);
      setCopertina(null);
      setLastra(null);
      setFilePdf(null);
      setFileEpub(null);
      setOpenSection(0);
      setSaveFlash(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setSaveFlash(false), 4000);
      await loadBooks(userId);
    } catch (err) {
      setSaveMaterialiError(
        err instanceof Error ? `Errore: ${err.message}` : "Errore durante il caricamento. Riprova."
      );
    } finally {
      setSavingMateriali(false);
      setSavingMaterialiStep(null);
    }
  };

  // Pulizia storage: elimina tutti i file copertine non referenziati nel DB
  const handleCleanupCovers = async () => {
    setCleaningUp(true); setCleanupResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-covers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      setCleanupResult(data);
    } catch (e) {
      setCleanupResult({ deleted: 0, total_in_bucket: 0, errors: [e instanceof Error ? e.message : "Errore"] });
    } finally {
      setCleaningUp(false);
    }
  };

  // Estrae il path relativo nel bucket da un URL pubblico Supabase Storage
  const storagePathFromUrl = (url: string | null): string | null => {
    if (!url) return null;
    const marker = `/storage/v1/object/public/copertine/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
  };

  const handleSaveAiCover = async (url: string) => {
    if (!editingId || !userId) return;
    setSavingAiCover(true);
    setSaveAiCoverError(null);
    try {
      // Cancella i vecchi file dalla Storage prima di salvare i nuovi
      const oldPaths = [existingCopertinaUrl, existingFlatUrl, existingRottaUrl]
        .map(storagePathFromUrl)
        .filter((p): p is string => !!p && !p.startsWith("brand/"));
      if (oldPaths.length > 0) {
        await supabase.storage.from("copertine").remove(oldPaths);
      }

      const { error } = await supabase.from("books").update({
        copertina_url: url,
        copertina_flat_url: aiGeneratedFlatUrl ?? null,
        copertina_rotta_url: aiGeneratedRottaUrl ?? null,
      }).eq("id", editingId);
      if (error) { setSaveAiCoverError(error.message); return; }
      setExistingCopertinaUrl(url);
      setExistingFlatUrl(aiGeneratedFlatUrl ?? null);
      setExistingRottaUrl(aiGeneratedRottaUrl ?? null);
      setAiGeneratedUrl(null);
      setAiGeneratedFlatUrl(null);
      setAiGeneratedRottaUrl(null);
      setShowAiCoverForm(false);
      setOpenSection(0);
      setSaveFlash(true);
      setTimeout(() => setSaveFlash(false), 4000);
      await loadBooks(userId);
    } catch {
      setSaveAiCoverError("Errore durante il salvataggio della copertina.");
    } finally {
      setSavingAiCover(false);
    }
  };

  const handleElimina = async () => {
    if (!selected || !userId) return;
    const { error } = await supabase.from("books").update({ disponibile: false }).eq("id", selected.id);
    if (!error) {
      setSelected(null);
      setConfirmMode(null);
      await loadBooks(userId);
    }
  };

  const handleGettaNelCestino = async () => {
    if (!selected || !userId) return;
    await supabase.from("books").update({ cestinato: true, disponibile: false }).eq("id", selected.id);
    setSelected(null);
    setConfirmMode(null);
    await loadBooks(userId);
  };

  const handleRipristinaDalCestino = async (book: Book) => {
    if (!userId) return;
    await supabase.from("books").update({ cestinato: false, disponibile: false }).eq("id", book.id);
    if (selected?.id === book.id) setSelected(null);
    await loadBooks(userId);
  };

  const handleEliminaDefinitivamente = async () => {
    if (!selected || !userId) return;
    await supabase.from("books").delete().eq("id", selected.id);
    setSelected(null);
    setConfirmMode(null);
    await loadBooks(userId);
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
    const { data, error } = await supabase.from("capitoli").select("*").eq("book_id", bookId).order("ordine");
    if (error) { setCapError(`Ricarica capitoli: ${error.message}`); return; }
    setCapitoli(data ?? []);
  };

  const handleSaveCapitolo = async () => {
    if (!selected || !userId || !capTitolo.trim()) return;
    setSavingCapitolo(true);
    setCapError(null);
    try {
      if (editingCapitoloId) {
        const { error } = await supabase.from("capitoli").update({
          titolo: capTitolo.trim(),
          testo: capTesto || "",
          ordine: capOrdine,
        }).eq("id", editingCapitoloId);
        if (error) throw error;
      } else {
        const { error, data: inserted } = await supabase.from("capitoli").insert({
          book_id: selected.id,
          titolo: capTitolo.trim(),
          testo: capTesto || "",
          ordine: capOrdine,
        }).select();
        if (error) throw error;
        if (!inserted || inserted.length === 0) throw new Error("Insert non ha restituito dati — possibile blocco RLS.");
      }
      await reloadCapitoli(selected.id);
      setShowCapitoloForm(false);
      setEditingCapitoloId(null);
      setCapTitolo(""); setCapTesto(""); setCapOrdine(1);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "Errore durante il salvataggio.";
      setCapError(msg);
    } finally {
      setSavingCapitolo(false);
    }
  };

  const handleDeleteCapitolo = async (id: string) => {
    await supabase.from("capitoli").delete().eq("id", id);
    setCapitoli(prev => prev.filter(c => c.id !== id));
  };

  const handleEditAllegato = (a: Allegato) => {
    setEditingAllegatoId(a.id);
    setAllegaTitolo(a.titolo);
    setAllegaDescrizione(a.descrizione ?? "");
    setAllegaFile(null);
    if (allegaFileRef.current) allegaFileRef.current.value = "";
    setAllegaError(null);
    setShowAllegatoForm(true);
  };

  const handleSaveAllegato = async () => {
    if (!selected || !allegaTitolo.trim()) return;
    if (!editingAllegatoId && !allegaFile) return;
    setSavingAllegato(true);
    setAllegaError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non autenticato.");
      const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "svg"];

      let file_url: string | undefined;
      let tipo: string | undefined;

      if (allegaFile) {
        const ext = allegaFile.name.split(".").pop()?.toLowerCase() ?? "bin";
        const path = `${user.id}/${selected.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("allegati").upload(path, allegaFile, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("allegati").getPublicUrl(path);
        file_url = urlData.publicUrl;
        tipo = imageExts.includes(ext) ? "immagine" : ext === "pdf" ? "pdf" : "altro";
      }

      if (editingAllegatoId) {
        const update: Record<string, unknown> = {
          titolo: allegaTitolo.trim(),
          descrizione: allegaDescrizione.trim() || null,
        };
        if (file_url) { update.file_url = file_url; update.tipo = tipo; }
        const { error: dbErr } = await supabase.from("allegati").update(update).eq("id", editingAllegatoId);
        if (dbErr) throw dbErr;
      } else {
        const ext = allegaFile!.name.split(".").pop()?.toLowerCase() ?? "bin";
        const { error: dbErr } = await supabase.from("allegati").insert({
          book_id: selected.id,
          titolo: allegaTitolo.trim(),
          descrizione: allegaDescrizione.trim() || null,
          file_url,
          tipo: imageExts.includes(ext) ? "immagine" : ext === "pdf" ? "pdf" : "altro",
          ordine: allegati.length + 1,
        });
        if (dbErr) throw dbErr;
      }

      const { data } = await supabase.from("allegati").select("*").eq("book_id", selected.id).order("ordine");
      setAllegati(data ?? []);
      setAllegaTitolo(""); setAllegaDescrizione(""); setAllegaFile(null);
      setEditingAllegatoId(null);
      if (allegaFileRef.current) allegaFileRef.current.value = "";
      setShowAllegatoForm(false);
    } catch (err: unknown) {
      setAllegaError((err as { message?: string })?.message ?? "Errore durante il caricamento.");
    } finally {
      setSavingAllegato(false);
    }
  };

  const handleDeleteAllegato = async (a: Allegato) => {
    const path = a.file_url.match(/\/storage\/v1\/object\/public\/allegati\/(.+)$/)?.[1];
    if (path) await supabase.storage.from("allegati").remove([decodeURIComponent(path)]);
    await supabase.from("allegati").delete().eq("id", a.id);
    setAllegati(prev => prev.filter(x => x.id !== a.id));
  };

  const handleEditCapitolo = (c: Capitolo) => {
    setEditingCapitoloId(c.id);
    setCapTitolo(c.titolo);
    setCapTesto(c.testo);
    setCapOrdine(c.ordine);
    setShowCapitoloForm(true);
  };

  const [filterGenere, setFilterGenere] = useState<string | null>(null);
  const [booksPage, setBooksPage] = useState(0);

  const BOOKS_PER_PAGE = 4;
  const activeBooks = books.filter(b => b.disponibile && !b.collana_id && !b.cestinato);
  const archivedBooks = books.filter(b => !b.disponibile && !b.collana_id && !b.cestinato);
  const cestinatoBooks = books.filter(b => b.cestinato && !b.collana_id);
  const filteredBooks = filterGenere ? activeBooks.filter(b => b.genere === filterGenere) : activeBooks;
  const booksTotalPages = Math.ceil(filteredBooks.length / BOOKS_PER_PAGE);
  const pagedBooks = filteredBooks.slice(booksPage * BOOKS_PER_PAGE, (booksPage + 1) * BOOKS_PER_PAGE);

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

        {/* Pannello admin — visibile solo ad Anthea */}
        {isAdmin && (
          <div className="mb-6 border border-amber/30 bg-amber/5 p-4 flex items-center gap-4 flex-wrap">
            <span className="font-mono text-[10px] tracking-[0.25em] text-amber uppercase">◈ Admin</span>
            <HudButton variant="ghost" onClick={handleCleanupCovers} disabled={cleaningUp}>
              {cleaningUp ? "▸ Pulizia in corso..." : "▸ Elimina copertine inutilizzate"}
            </HudButton>
            {cleanupResult && (
              <span className={`font-mono text-[10px] tracking-widest uppercase ${cleanupResult.errors.length ? "text-magenta" : "text-cyan"}`}>
                {cleanupResult.errors.length
                  ? `✗ ${cleanupResult.errors[0]}`
                  : `✓ ${cleanupResult.deleted} file eliminati (${cleanupResult.total_in_bucket} totali nel bucket)`
                }
              </span>
            )}
          </div>
        )}

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">

          {/* Lista opere */}
          <HudPanel label="le tue opere" code={`${activeBooks.length}`} tone="cyan">
            {/* Filtro per tipologia */}
            <div className="mb-4 grid grid-cols-2 gap-1.5">
              <div className="col-span-2 font-mono text-[11px] tracking-[0.25em] text-cyan uppercase mb-0.5">// Collane</div>
              <button
                onClick={() => { setSelected(null); setShowForm(false); setSelectedCollana(null); setShowCollanaList(false); resetCollanaForm(); setShowCollanaForm(true); }}
                className={`font-mono text-[9px] uppercase tracking-widest border py-2 transition-all ${
                  showCollanaForm && !collanaEditingId
                    ? "border-magenta bg-magenta/15 text-magenta"
                    : "border-cyan/20 text-bone/40 hover:border-cyan/50 hover:text-bone/70"
                }`}
              >
                ◆ Crea
              </button>
              <button
                onClick={() => { setSelected(null); setShowForm(false); setShowCollanaForm(false); resetCollanaForm(); setShowCollanaList(true); setSelectedCollana(null); }}
                className={`font-mono text-[9px] uppercase tracking-widest border py-2 transition-all ${
                  showCollanaList || (selectedCollana && !showCollanaForm)
                    ? "border-magenta bg-magenta/15 text-magenta"
                    : "border-cyan/20 text-bone/40 hover:border-cyan/50 hover:text-bone/70"
                }`}
              >
                ◆ Modifica
              </button>
              <div className="col-span-2 border-t border-cyan/[0.08]" />
              <div className="col-span-2 font-mono text-[11px] tracking-[0.25em] text-cyan uppercase mb-0.5">// Opere</div>
              {GENERI.map(g => {
                const count = activeBooks.filter(b => b.genere === g).length;
                const isActive = filterGenere === g;
                const tooltip = GENERE_TOOLTIP[g];
                return (
                  <button
                    key={g}
                    onClick={() => { setFilterGenere(isActive ? null : g); setSelected(null); setShowForm(false); setBooksPage(0); }}
                    className={`relative group font-mono text-[9px] uppercase tracking-widest border py-2 transition-all ${
                      isActive
                        ? "border-cyan bg-cyan/20 text-cyan"
                        : "border-cyan/20 text-bone/50 hover:border-cyan/50 hover:text-bone/80"
                    }`}
                  >
                    {GENERE_LABELS[g]}
                    {count > 0 && <span className={`ml-1 ${isActive ? "text-cyan/70" : "text-bone/30"}`}>{count}</span>}
                    {tooltip && (
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap border border-cyan/40 bg-void px-2 py-1 font-mono text-[8px] tracking-widest text-cyan opacity-0 transition-opacity group-hover:opacity-100 z-10">
                        {tooltip}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNewBook}
              className="mb-4 w-full font-mono text-[10px] tracking-widest text-magenta uppercase border border-magenta/40 py-2 hover:bg-magenta/10 transition-colors"
            >
              ◆ + nuova opera
            </button>

            {filteredBooks.length === 0 && (
              <p className="font-mono text-[10px] text-bone/40 uppercase tracking-widest mb-4">
                {activeBooks.length === 0 ? "Nessuna opera ancora." : "Nessuna opera in questa categoria."}
              </p>
            )}
            <ul className="space-y-2">
              {pagedBooks.map((b) => (
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

            {booksTotalPages > 1 && (
              <div className="mt-3 flex items-center justify-center gap-1">
                <button
                  onClick={() => setBooksPage(p => Math.max(0, p - 1))}
                  disabled={booksPage === 0}
                  className="font-mono text-[10px] text-bone/40 hover:text-cyan disabled:opacity-20 px-2 py-1 transition-colors"
                >←</button>
                {Array.from({ length: booksTotalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setBooksPage(i)}
                    className={`font-mono text-[10px] w-6 h-6 border transition-all ${
                      booksPage === i
                        ? "border-cyan text-cyan bg-cyan/10"
                        : "border-cyan/20 text-bone/40 hover:border-cyan/50 hover:text-bone/70"
                    }`}
                  >{i + 1}</button>
                ))}
                <button
                  onClick={() => setBooksPage(p => Math.min(booksTotalPages - 1, p + 1))}
                  disabled={booksPage === booksTotalPages - 1}
                  className="font-mono text-[10px] text-bone/40 hover:text-cyan disabled:opacity-20 px-2 py-1 transition-colors"
                >→</button>
              </div>
            )}

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

            {cestinatoBooks.length > 0 && (
              <div ref={cestinoSectionRef}>
                <div className="hud-divider my-4" />
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-[9px] tracking-[0.3em] text-magenta uppercase">// cestino</span>
                  <span className="font-mono text-[9px] text-magenta bg-magenta/15 border border-magenta/40 px-2 py-0.5">
                    {cestinatoBooks.length}
                  </span>
                </div>
                <ul className="space-y-2">
                  {cestinatoBooks.map((b) => (
                    <li key={b.id}>
                      <button
                        onClick={() => handleSelectBook(b)}
                        className={`w-full text-left p-3 border transition-all ${
                          selected?.id === b.id && !showForm
                            ? "border-magenta bg-magenta/15 text-magenta"
                            : "border-magenta/40 text-bone/80 hover:border-magenta hover:bg-magenta/5"
                        }`}
                      >
                        <div className="font-display text-sm tracking-tight truncate">{b.titolo}</div>
                        <div className="font-mono text-[9px] tracking-widest text-magenta/60 uppercase mt-1">
                          ⊗ cestino · {b.voti_cestino}/5 voti
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </HudPanel>

          {/* ── FORM NUOVA / MODIFICA OPERA (ACCORDION) ── */}
          {showForm && (
            <div className="space-y-1">

              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="font-mono text-[11px] tracking-[0.3em] text-cyan/70 uppercase">
                  // {editingId ? "modifica opera" : collanaId ? "nuova novella" : "nuova opera"}
                  {editingId && <span className="text-bone/20 ml-3">· {editingId.slice(0, 6).toUpperCase()}</span>}
                </div>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setSaveFlash(false); }}
                  className={`font-mono text-[9px] uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                    saveFlash
                      ? "text-cyan border border-cyan px-2.5 py-1 bg-cyan/10 text-glow-cyan animate-pulse"
                      : "text-bone/40 hover:text-magenta"
                  }`}>
                  {saveFlash ? "✓ salvato — chiudi" : "✕ chiudi"}
                </button>
              </div>

              {/* ═══════════ 01 — METADATI ═══════════ */}
              <button type="button" onClick={() => setOpenSection(openSection === 1 ? 0 : 1)}
                className={`w-full flex items-center gap-3 px-5 py-4 border transition-all cursor-pointer ${
                  openSection === 1 ? "border-cyan bg-cyan/5" : "border-cyan/30 hover:border-cyan"
                }`}>
                <span className={`font-mono text-[11px] w-7 h-7 border flex items-center justify-center flex-shrink-0 ${
                  openSection === 1 ? "border-cyan text-cyan" : "border-cyan/40 text-bone/50"
                }`}>01</span>
                <div className="flex-1 text-left">
                  <div className={`font-mono text-[11px] tracking-[0.3em] uppercase ${openSection === 1 ? "text-cyan" : "text-bone/70"}`}>Metadati</div>
                  <div className="font-mono text-[9px] tracking-widest text-bone/40 mt-0.5">titolo · genere · sinossi · collana</div>
                </div>
                <span className={`font-mono text-[9px] tracking-widest uppercase ${openSection === 1 ? "text-cyan" : "text-bone/40"}`}>{openSection === 1 ? "▲" : "▼"}</span>
              </button>
              {openSection === 1 && (
                <div className="border border-cyan/20 border-t-0 p-5 space-y-5">

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

                  {(editingId || !filterGenere) ? (
                    <div>
                      <span className={labelClass}>↳ Genere ★</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {GENERI.map(g => (
                          <button key={g} type="button" onClick={() => setGenere(g)}
                            className={`relative group border px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all ${
                              genere === g ? "border-cyan bg-cyan/15 text-cyan" : "border-cyan/30 text-bone/70 hover:border-cyan"
                            }`}>
                            ◆ {GENERE_LABELS[g]}
                            {GENERE_TOOLTIP[g] && (
                              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap border border-cyan/40 bg-void px-2 py-1 font-mono text-[8px] tracking-widest text-cyan opacity-0 transition-opacity group-hover:opacity-100 z-10">
                                {GENERE_TOOLTIP[g]}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-[10px] tracking-widest text-bone/40 uppercase border border-cyan/15 px-4 py-2 inline-flex items-center gap-2">
                      <span className="text-cyan/50">◆</span> Genere: <span className="text-cyan">{genere}</span>
                    </div>
                  )}

                  {/* Tipo e Target */}
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <span className={labelClass}>↳ Tipo / Sottogenere</span>
                      <select value={tipo} onChange={e => { setTipo(e.target.value); setTipoAltro(""); }}
                        className={inputClass + " cursor-pointer"}>
                        <option value="">— Seleziona —</option>
                        {TIPI.map(t => (
                          <option key={t} value={t} disabled={t.startsWith("—")} className={t.startsWith("—") ? "text-bone/40 font-bold" : ""}>{t}</option>
                        ))}
                      </select>
                      {tipo === ALTRO_TIPO && (
                        <>
                          <input value={tipoAltro} onChange={e => setTipoAltro(e.target.value)}
                            placeholder="es. Fantascienza intimista, Romanzo corale…"
                            className={inputClass + " mt-2"} autoFocus />
                          <p className="mt-1 font-mono text-[9px] text-bone/40 tracking-wide">
                            Scrivi il genere che meglio descrive l'opera — verrà salvato così.
                          </p>
                        </>
                      )}
                    </div>
                    <div>
                      <span className={labelClass}>↳ Target / Fascia di pubblico</span>
                      <select value={target} onChange={e => setTarget(e.target.value)} className={inputClass + " cursor-pointer"}>
                        {TARGET.map(t => (<option key={t} value={t}>{t}</option>))}
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

                  {collanaId && (
                    <div>
                      <span className={labelClass}>↳ Testo completo</span>
                      <RichTextEditor value={testoCompleto} onChange={setTestoCompleto} />
                    </div>
                  )}

                  <div>
                    <span className={labelClass}>↳ Tag (separati da virgola)</span>
                    <input value={tagStr} onChange={e => setTagStr(e.target.value)} placeholder="fantascienza, distopia, futuro" className={inputClass} />
                  </div>

                  {collane.length > 0 && (
                    <div>
                      <span className={labelClass}>↳ Collana (opzionale)</span>
                      <select value={collanaId} onChange={e => setCollanaId(e.target.value)} className={inputClass + " cursor-pointer"}>
                        <option value="">— Nessuna collana —</option>
                        {collane.map(c => <option key={c.id} value={c.id}>{c.titolo}</option>)}
                      </select>
                    </div>
                  )}

                  {saveError && (
                    <p className="font-mono text-[11px] text-magenta border border-magenta/30 bg-magenta/5 px-4 py-3">⚠ {saveError}</p>
                  )}
                  <div className="flex gap-3">
                    <HudButton variant="primary" onClick={handleSave} disabled={saving || !titolo.trim()}>
                      {saving ? "▸ Salvataggio..." : editingId ? (collanaId ? "▸ Aggiorna novella" : "▸ Aggiorna opera") : (collanaId ? "▸ Salva novella" : "▸ Salva opera")}
                    </HudButton>
                    <HudButton variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>
                      annulla
                    </HudButton>
                  </div>
                </div>
              )}

              {/* ═══════════ 02 — CAPITOLI ═══════════ */}
              <button type="button" onClick={() => editingId && setOpenSection(openSection === 2 ? 0 : 2)} disabled={!editingId}
                className={`w-full flex items-center gap-3 px-5 py-4 border transition-all ${
                  !editingId ? "border-cyan/10 cursor-not-allowed" :
                  openSection === 2 ? "border-cyan bg-cyan/5 cursor-pointer" : "border-cyan/30 hover:border-cyan cursor-pointer"
                }`}>
                <span className={`font-mono text-[11px] w-7 h-7 border flex items-center justify-center flex-shrink-0 ${
                  !editingId ? "border-cyan/15 text-bone/20" :
                  openSection === 2 ? "border-cyan text-cyan" : "border-cyan/40 text-bone/50"
                }`}>02</span>
                <div className="flex-1 text-left">
                  <div className={`font-mono text-[11px] tracking-[0.3em] uppercase ${
                    !editingId ? "text-bone/20" : openSection === 2 ? "text-cyan" : "text-bone/70"
                  }`}>Capitoli</div>
                  <div className={`font-mono text-[9px] tracking-widest mt-0.5 ${!editingId ? "text-bone/15" : "text-bone/40"}`}>
                    {editingId ? `${capitoli.length} capitoli · materiali extra` : "— salva prima i metadati —"}
                  </div>
                </div>
                <span className={`font-mono text-[9px] tracking-widest uppercase ${
                  !editingId ? "text-bone/20" : openSection === 2 ? "text-cyan" : "text-bone/40"
                }`}>{!editingId ? "⊗" : openSection === 2 ? "▲" : "▼"}</span>
              </button>
              {openSection === 2 && editingId && selected && (
                <div className="border border-cyan/20 border-t-0 p-5 space-y-4">

                  {/* Capitoli */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase">// capitoli</span>
                    {!showCapitoloForm && (
                      <button onClick={() => {
                        setEditingCapitoloId(null);
                        setCapTitolo("");
                        setCapTesto("");
                        setCapOrdine(capitoli.length + 1);
                        setCapError(null);
                        setShowCapitoloForm(true);
                      }}
                        className="font-mono text-[10px] tracking-widest text-magenta uppercase hover:text-cyan transition-colors">
                        + nuovo capitolo
                      </button>
                    )}
                  </div>

                  {capitoli.length === 0 && !showCapitoloForm && (
                    <p className="font-serif italic text-bone/40 text-sm">Nessun capitolo aggiunto.</p>
                  )}

                  {capitoli.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 border border-cyan/10 p-3">
                      <span className="font-mono text-[10px] text-cyan/40 w-6 flex-shrink-0">{String(c.ordine).padStart(2, "0")}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-bone/70 truncate">{c.titolo}</div>
                        <div className="font-mono text-[9px] text-bone/30 mt-0.5 truncate">{c.testo.slice(0, 80)}…</div>
                      </div>
                      <button onClick={() => handleEditCapitolo(c)} title="Modifica capitolo"
                        className="flex items-center gap-1 font-mono text-[10px] text-cyan/50 hover:text-cyan border border-transparent hover:border-cyan/40 hover:bg-cyan/5 px-2 py-1 transition-colors flex-shrink-0">
                        ✎ <span className="hidden sm:inline tracking-widest uppercase">Modifica</span>
                      </button>
                      {confirmDeleteCapitoloId === c.id ? (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="font-mono text-[9px] text-magenta/80 tracking-widest uppercase">Elimina?</span>
                          <button onClick={() => { handleDeleteCapitolo(c.id); setConfirmDeleteCapitoloId(null); }}
                            className="font-mono text-[9px] text-magenta border border-magenta/50 hover:bg-magenta hover:text-paper px-2 py-1 transition-colors">Sì</button>
                          <button onClick={() => setConfirmDeleteCapitoloId(null)}
                            className="font-mono text-[9px] text-bone/50 border border-bone/20 hover:border-bone/50 hover:text-bone px-2 py-1 transition-colors">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteCapitoloId(c.id)} title="Elimina capitolo"
                          className="flex items-center gap-1 font-mono text-[10px] text-magenta/50 hover:text-magenta border border-transparent hover:border-magenta/40 hover:bg-magenta/5 px-2 py-1 transition-colors flex-shrink-0">
                          ✕ <span className="hidden sm:inline tracking-widest uppercase">Elimina</span>
                        </button>
                      )}
                    </div>
                  ))}

                  {showCapitoloForm && (
                    <div className="border border-cyan/20 bg-cyan/5 p-4 space-y-4 mt-2">
                      <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/60 uppercase">
                        // {editingCapitoloId ? "modifica capitolo" : "nuovo capitolo"}
                      </div>
                      <div className="grid sm:grid-cols-4 gap-4">
                        <div>
                          <span className={labelClass}>↳ Ordine</span>
                          <input value={capOrdine} onChange={e => setCapOrdine(parseInt(e.target.value) || 1)}
                            type="number" min={1} className={inputClass} />
                        </div>
                        <div className="sm:col-span-3">
                          <span className={labelClass}>↳ Titolo capitolo</span>
                          <input value={capTitolo} onChange={e => setCapTitolo(e.target.value)}
                            placeholder="Es. Capitolo I — L'inizio" className={inputClass} />
                        </div>
                      </div>
                      <div>
                        <span className={labelClass}>↳ Testo</span>
                        <RichTextEditor value={capTesto} onChange={setCapTesto} />
                      </div>
                      {capError && (
                        <p className="font-mono text-[11px] text-magenta border border-magenta/30 bg-magenta/5 px-4 py-3">⚠ {capError}</p>
                      )}
                      <div className="flex gap-3">
                        <HudButton variant="primary" onClick={handleSaveCapitolo} disabled={savingCapitolo || !capTitolo.trim()}>
                          {savingCapitolo ? "▸ Salvataggio..." : editingCapitoloId ? "▸ Aggiorna capitolo" : "▸ Salva capitolo"}
                        </HudButton>
                        <HudButton variant="ghost" onClick={() => { setShowCapitoloForm(false); setEditingCapitoloId(null); setCapError(null); }}>
                          annulla
                        </HudButton>
                      </div>
                    </div>
                  )}

                  {/* Materiali extra (allegati) */}
                  <div className="hud-divider my-3" />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase">// materiali extra</span>
                    {!showAllegatoForm && (
                      <button onClick={() => { setAllegaTitolo(""); setAllegaDescrizione(""); setAllegaFile(null); setAllegaError(null); setShowAllegatoForm(true); }}
                        className="font-mono text-[10px] tracking-widest text-magenta uppercase hover:text-cyan transition-colors">
                        + Aggiungi materiale
                      </button>
                    )}
                  </div>

                  {allegati.length === 0 && !showAllegatoForm && (
                    <p className="font-serif italic text-bone/40 text-sm">Nessun materiale extra aggiunto.</p>
                  )}

                  {allegati.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 border border-cyan/10 p-3">
                      <span className="font-mono text-[10px] text-cyan/40 flex-shrink-0">
                        {a.tipo === "immagine" ? "◈" : a.tipo === "pdf" ? "↓" : "◆"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-mono text-[10px] uppercase tracking-widest text-bone/70 truncate">{a.titolo}</div>
                        <div className="font-mono text-[9px] text-bone/30 mt-0.5">{a.tipo}</div>
                      </div>
                      {confirmDeleteAllegatoId === a.id ? (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="font-mono text-[9px] text-magenta/80 tracking-widest uppercase">Elimina?</span>
                          <button onClick={() => { handleDeleteAllegato(a); setConfirmDeleteAllegatoId(null); }}
                            className="font-mono text-[9px] text-magenta border border-magenta/50 hover:bg-magenta hover:text-paper px-2 py-1 transition-colors">Sì</button>
                          <button onClick={() => setConfirmDeleteAllegatoId(null)}
                            className="font-mono text-[9px] text-bone/50 border border-bone/20 hover:border-bone/50 hover:text-bone px-2 py-1 transition-colors">No</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => handleEditAllegato(a)} title="Modifica materiale"
                            className="flex items-center gap-1 font-mono text-[10px] text-cyan/50 hover:text-cyan border border-transparent hover:border-cyan/40 hover:bg-cyan/5 px-2 py-1 transition-colors">
                            ✎ <span className="hidden sm:inline tracking-widest uppercase">Modifica</span>
                          </button>
                          <button onClick={() => setConfirmDeleteAllegatoId(a.id)}
                            className="flex items-center gap-1 font-mono text-[10px] text-magenta/50 hover:text-magenta border border-transparent hover:border-magenta/40 hover:bg-magenta/5 px-2 py-1 transition-colors">
                            ✕ <span className="hidden sm:inline tracking-widest uppercase">Elimina</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {showAllegatoForm && (
                    <div className="border border-cyan/20 bg-cyan/5 p-4 space-y-4 mt-2">
                      <div className="font-mono text-[9px] tracking-[0.3em] text-cyan/60 uppercase">
                        {editingAllegatoId ? "// modifica materiale" : "// nuovo materiale"}
                      </div>
                      <div>
                        <span className={labelClass}>↳ Titolo</span>
                        <input value={allegaTitolo} onChange={e => setAllegaTitolo(e.target.value)}
                          placeholder="Es. Albero genealogico, Mappa del mondo…" className={inputClass} />
                      </div>
                      <div>
                        <span className={labelClass}>↳ Descrizione (opzionale)</span>
                        <textarea value={allegaDescrizione} onChange={e => setAllegaDescrizione(e.target.value)}
                          placeholder="Breve descrizione del materiale, personaggi principali, come leggerlo…"
                          rows={3} className={inputClass + " resize-none"} />
                      </div>
                      <div>
                        <span className={labelClass}>
                          ↳ File (immagine o PDF){editingAllegatoId && " — lascia vuoto per mantenere quello attuale"}
                        </span>
                        <input ref={allegaFileRef} type="file" accept="image/*,.pdf"
                          onChange={e => setAllegaFile(e.target.files?.[0] ?? null)}
                          className={inputClass + " cursor-pointer file:mr-3 file:font-mono file:text-[10px] file:border file:border-cyan/30 file:bg-transparent file:text-cyan/70 file:px-2 file:py-1"} />
                        {allegaFile && (
                          <p className="mt-1 font-mono text-[9px] text-bone/40">{allegaFile.name} — {(allegaFile.size / 1024).toFixed(0)} KB</p>
                        )}
                      </div>
                      {allegaError && (
                        <p className="font-mono text-[11px] text-magenta border border-magenta/30 bg-magenta/5 px-4 py-3">⚠ {allegaError}</p>
                      )}
                      <div className="flex gap-3">
                        <HudButton variant="primary" onClick={handleSaveAllegato}
                          disabled={savingAllegato || !allegaTitolo.trim() || (!editingAllegatoId && !allegaFile)}>
                          {savingAllegato ? "▸ Salvataggio..." : editingAllegatoId ? "▸ Aggiorna materiale" : "▸ Salva materiale"}
                        </HudButton>
                        <HudButton variant="ghost" onClick={() => { setShowAllegatoForm(false); setEditingAllegatoId(null); setAllegaError(null); }}>annulla</HudButton>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* ═══════════ 03 — COPERTINA ═══════════ */}
              <button type="button" onClick={() => editingId && setOpenSection(openSection === 3 ? 0 : 3)} disabled={!editingId}
                className={`w-full flex items-center gap-3 px-5 py-4 border transition-all ${
                  !editingId ? "border-cyan/10 cursor-not-allowed" :
                  openSection === 3 ? "border-cyan bg-cyan/5 cursor-pointer" : "border-cyan/30 hover:border-cyan cursor-pointer"
                }`}>
                <span className={`font-mono text-[11px] w-7 h-7 border flex items-center justify-center flex-shrink-0 ${
                  !editingId ? "border-cyan/15 text-bone/20" :
                  openSection === 3 ? "border-cyan text-cyan" : "border-cyan/40 text-bone/50"
                }`}>03</span>
                <div className="flex-1 text-left">
                  <div className={`font-mono text-[11px] tracking-[0.3em] uppercase ${
                    !editingId ? "text-bone/20" : openSection === 3 ? "text-cyan" : "text-bone/70"
                  }`}>Copertina</div>
                  <div className={`font-mono text-[9px] tracking-widest mt-0.5 ${!editingId ? "text-bone/15" : "text-bone/40"}`}>
                    {editingId ? "carica · genera con AI" : "— salva prima i metadati —"}
                  </div>
                </div>
                <span className={`font-mono text-[9px] tracking-widest uppercase ${
                  !editingId ? "text-bone/20" : openSection === 3 ? "text-cyan" : "text-bone/40"
                }`}>{!editingId ? "⊗" : openSection === 3 ? "▲" : "▼"}</span>
              </button>
              {openSection === 3 && editingId && (
                <div className="border border-cyan/20 border-t-0 p-5 space-y-5">

                  {/* ── COPERTINA ── */}
                  <div>
                    <div className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase mb-3">// copertina</div>

                    {/* Anteprima copertina: attuale + nuova affiancate */}
                    {(existingCopertinaUrl || coverPreviewUrl) && (
                      <div className="mb-4 flex items-start gap-6">
                        {existingCopertinaUrl && (
                          <div className="flex flex-col items-center gap-1">
                            <img
                              src={existingCopertinaUrl}
                              alt="Copertina attuale"
                              className={`w-20 h-28 object-cover ring-1 flex-shrink-0 transition-all duration-300 ${
                                coverPreviewUrl ? "ring-bone/20 opacity-40 saturate-0" : "ring-cyan/40"
                              }`}
                            />
                            <span className="font-mono text-[8px] text-bone/30 tracking-widest uppercase">attuale</span>
                          </div>
                        )}
                        {coverPreviewUrl && (
                          <div className="flex flex-col items-center gap-1">
                            <img
                              src={coverPreviewUrl}
                              alt="Nuova copertina"
                              className="w-20 h-28 object-cover ring-1 ring-cyan flex-shrink-0"
                            />
                            <span className="font-mono text-[8px] text-cyan tracking-widest uppercase">nuova ↑</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Specifiche per copertina caricata manualmente */}
                    <div className="mb-3 font-mono text-[9px] tracking-widest text-bone/35 border border-cyan/10 px-3 py-2 inline-flex gap-3">
                      <span>↳ JPG o PNG</span>
                      <span className="text-bone/20">·</span>
                      <span>ridimensionata in automatico</span>
                      <span className="text-bone/20">·</span>
                      <span>max 800 KB</span>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      {/* Carica copertina */}
                      <input ref={copertRef} type="file" accept="image/*"
                        onChange={e => { setCopertina(e.target.files?.[0] ?? null); setShowAiCoverForm(false); }} className="hidden" />
                      <button type="button" onClick={() => copertRef.current?.click()}
                        className={`flex items-center gap-2 border px-5 py-3 font-mono text-[10px] uppercase tracking-widest transition-all ${
                          copertina ? "border-cyan bg-cyan/10 text-cyan" : "border-cyan/40 text-bone/60 hover:border-cyan hover:text-cyan"
                        }`}>
                        <span>◈</span>
                        <span>{copertina ? `✓ ${copertina.name}` : "Carica copertina"}</span>
                      </button>

                      {/* Genera con AI */}
                      <button type="button" onClick={() => { setShowAiCoverForm(v => !v); setCopertina(null); }}
                        className={`flex items-center gap-2 border px-5 py-3 font-mono text-[10px] uppercase tracking-widest transition-all ${
                          showAiCoverForm ? "border-cyan bg-cyan/10 text-cyan" : "border-cyan/40 text-bone/60 hover:border-cyan hover:text-cyan"
                        }`}>
                        <span>◈</span>
                        <span>Genera con AI</span>
                      </button>
                    </div>

                    {/* Salva copertina caricata */}
                    {copertina && (
                      <div className="mt-4">
                        {saveMaterialiError && (
                          <p className="font-mono text-[11px] text-magenta border border-magenta/30 bg-magenta/5 px-4 py-3 mb-3">⚠ {saveMaterialiError}</p>
                        )}
                        <HudButton variant="primary" onClick={handleSaveMateriali} disabled={savingMateriali}>
                          {savingMateriali
                            ? savingMaterialiStep === "uploading" ? "▸ Caricamento immagine..."
                            : savingMaterialiStep === "baking"    ? "▸ Elaborazione teca..."
                            : "▸ Salvataggio..."
                            : "▸ Salva copertina"}
                        </HudButton>
                      </div>
                    )}

                    {/* Form AI (espandibile) */}
                    {showAiCoverForm && (
                      <div className="mt-4 border border-cyan/30 bg-cyan/5 p-5 space-y-4 relative">
                        <span className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan/60 to-transparent" />
                        <div className="flex items-center justify-between">
                          <div className="font-mono text-[11px] tracking-[0.3em] text-cyan uppercase font-bold">◈ Genera copertina con AI</div>
                          {isAdmin
                            ? <span className="font-mono text-xs tracking-widest uppercase text-cyan border border-cyan bg-cyan/10 px-3 py-1 font-bold">∞ Accesso illimitato</span>
                            : <span className="font-mono text-[10px] text-bone/70 border border-cyan/30 px-2 py-0.5">{aiUsed} / 10 gratuite</span>
                          }
                        </div>
                        <p className="font-serif italic text-bone/60 text-sm">
                          La copertina viene elaborata sulla base del testo che scrivi — più la descrizione è dettagliata e vicina alla tua idea, più il risultato sarà quello che immagini.
                          Titolo, autore e logo vengono aggiunti automaticamente.
                        </p>

                        {(isAdmin || aiUsed < 10) ? (
                          <>
                            <div>
                              <span className={labelClass}>↳ Descrivi la copertina che vuoi</span>
                              <textarea value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                                placeholder="Es. Una galassia con un pianeta centrale dominante e mondi periferici in conflitto, atmosfera epica e fantascientifica..."
                                className="mt-2 w-full min-h-20 bg-void/40 border border-cyan/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan transition-all" />
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              <HudButton variant="ghost" onClick={handleGenerateCover} disabled={aiGenerating || !aiPrompt.trim()}>
                                {aiGenerating ? "▸ Generazione in corso..." : "◈ Genera copertina AI"}
                              </HudButton>
                              {aiGenerating && (
                                <div className="flex flex-col gap-1.5">
                                  <span className="font-mono text-[11px] tracking-widest text-cyan uppercase">
                                    ◈ Sintesi visiva in corso...{" "}
                                    <span className="text-cyan/40 normal-case">~60-90 sec</span>
                                  </span>
                                  <div className="flex gap-1">
                                    {Array.from({ length: 10 }).map((_, i) => (
                                      <span key={i} className={`w-3 h-3 border transition-all duration-500 ${i < Math.min(aiProgress, 10) ? "bg-cyan border-cyan" : "bg-transparent border-cyan/30"}`} />
                                    ))}
                                  </div>
                                  <div className="flex gap-1">
                                    {Array.from({ length: 10 }).map((_, i) => (
                                      <span key={i} className={`w-3 h-3 border transition-all duration-500 ${i < Math.max(0, aiProgress - 10) ? "bg-cyan border-cyan" : "bg-transparent border-cyan/30"}`} />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            {aiError && <p className="font-mono text-[11px] text-magenta">{aiError}</p>}
                            {aiGeneratedUrl && (
                              <div className="flex gap-5 items-start pt-1">
                                <button onClick={() => setAiModalUrl(aiGeneratedUrl)} className="flex-shrink-0 cursor-zoom-in group relative w-24 h-32">
                                  <img src={aiGeneratedUrl} alt="Copertina generata" className="w-full h-full object-cover ring-1 ring-cyan/40 group-hover:ring-cyan transition-all" />
                                  <span className="absolute inset-0 flex items-center justify-center bg-void/40 opacity-0 group-hover:opacity-100 transition-opacity font-mono text-[9px] text-cyan tracking-widest">⊕ ingrandisci</span>
                                </button>
                                <div className="space-y-2">
                                  <p className="font-mono text-[10px] text-cyan uppercase tracking-widest">Copertina generata</p>
                                  <p className="font-mono text-[9px] text-bone/40">Clicca l'immagine per vederla in grande</p>
                                  {saveAiCoverError && (
                                    <p className="font-mono text-[10px] text-magenta">⚠ {saveAiCoverError}</p>
                                  )}
                                  <HudButton variant="primary" onClick={() => handleSaveAiCover(aiGeneratedUrl!)} disabled={savingAiCover}>
                                    {savingAiCover ? "▸ Salvataggio..." : "▸ Salva copertina"}
                                  </HudButton>
                                  <button onClick={() => setAiGeneratedUrl(null)}
                                    className="block font-mono text-[9px] uppercase tracking-widest text-bone/40 hover:text-magenta transition-colors cursor-pointer">
                                    ✕ scarta
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        ) : !ticketSent ? (
                          !showTicketForm ? (
                            <div className="space-y-3">
                              <p className="font-serif italic text-bone/60 text-sm">Hai usato tutte e 10 le generazioni gratuite per quest'opera.</p>
                              <button onClick={() => setShowTicketForm(true)}
                                className="font-mono text-[10px] uppercase tracking-widest text-magenta border border-magenta/40 hover:border-magenta px-4 py-2 transition-colors cursor-pointer">
                                ◆ Richiedi generazioni aggiuntive
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <p className="font-serif italic text-bone/60 text-sm leading-relaxed">
                                Scrivi un messaggio e ti risponderemo per attivare un pacchetto a credito.
                              </p>
                              <div>
                                <span className={labelClass}>↳ Messaggio</span>
                                <textarea value={ticketMessage} onChange={e => setTicketMessage(e.target.value)}
                                  placeholder="Descrivi cosa stai cercando e quante copertine vorresti provare..."
                                  className="mt-2 w-full min-h-20 bg-void/40 border border-magenta/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-magenta transition-all" />
                              </div>
                              {aiError && <p className="font-mono text-[11px] text-magenta">{aiError}</p>}
                              <div className="flex gap-3">
                                <HudButton variant="primary" onClick={() => handleSendTicket(titolo)} disabled={ticketSending || !ticketMessage.trim()}>
                                  {ticketSending ? "▸ Invio..." : "▸ Invia richiesta"}
                                </HudButton>
                                <button onClick={() => setShowTicketForm(false)}
                                  className="font-mono text-[9px] uppercase tracking-widest text-bone/40 hover:text-cyan transition-colors cursor-pointer">
                                  annulla
                                </button>
                              </div>
                            </div>
                          )
                        ) : (
                          <p className="font-serif italic text-cyan/80 text-sm">✓ Richiesta inviata. Ti risponderemo presto.</p>
                        )}
                      </div>
                    )}
                  </div>


                </div>
              )}

              {/* ══════════ 04 — GENERA PDF ed E-BOOK ══════════ */}
              <button type="button" onClick={() => editingId && setOpenSection(openSection === 4 ? 0 : 4)} disabled={!editingId}
                className={`w-full flex items-center gap-3 px-5 py-4 border transition-all ${
                  !editingId ? "border-cyan/10 cursor-not-allowed" :
                  openSection === 4 ? "border-cyan bg-cyan/5 cursor-pointer" : "border-cyan/30 hover:border-cyan cursor-pointer"
                }`}>
                <span className={`font-mono text-[11px] w-7 h-7 border flex items-center justify-center flex-shrink-0 ${
                  !editingId ? "border-cyan/15 text-bone/20" :
                  openSection === 4 ? "border-cyan text-cyan" : "border-cyan/40 text-bone/50"
                }`}>04</span>
                <div className="flex-1 text-left">
                  <div className={`font-mono text-[11px] tracking-[0.3em] uppercase ${
                    !editingId ? "text-bone/20" : openSection === 4 ? "text-cyan" : "text-bone/70"
                  }`}>Genera PDF ed E-Book</div>
                  <div className={`font-mono text-[9px] tracking-widest mt-0.5 ${!editingId ? "text-bone/15" : "text-bone/40"}`}>
                    {editingId ? "dal manoscritto .docx" : "— salva prima i metadati —"}
                  </div>
                </div>
                <span className={`font-mono text-[9px] tracking-widest uppercase ${
                  !editingId ? "text-bone/20" : openSection === 4 ? "text-cyan" : "text-bone/40"
                }`}>{!editingId ? "⊗" : openSection === 4 ? "▲" : "▼"}</span>
              </button>
              {openSection === 4 && editingId && (
                <div className="border border-cyan/20 border-t-0 p-5 space-y-5">

                  {/* Genera documenti da .docx */}
                  {(isAdmin || pdfConvUsed < 10 || epubConvUsed < 10) && (
                    <div className="border border-amber/50 bg-amber/5 p-5 space-y-4 relative">
                      <span className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber/50 to-transparent" />
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="font-mono text-[11px] tracking-[0.3em] text-amber uppercase font-bold">◈ Genera PDF + E-Book dal manoscritto</div>
                        {isAdmin
                          ? <span className="font-mono text-[10px] tracking-widest uppercase text-amber border border-amber bg-amber/10 px-3 py-1 font-bold">∞ Accesso illimitato</span>
                          : <span className="font-mono text-[10px] text-bone/50 border border-amber/30 px-2 py-0.5">{Math.max(pdfConvUsed, epubConvUsed)} / 10</span>
                        }
                      </div>
                      <p className="font-serif italic text-bone/60 text-sm">
                        Carica il manoscritto Word (.docx): PDF ed E-Book vengono generati automaticamente in un click.
                        {!isAdmin && <span className="text-amber not-italic font-mono text-[10px] tracking-widest uppercase ml-2">10 generazioni gratuite</span>}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <input ref={docxRef} type="file" accept=".docx"
                          onChange={e => { setDocxFile(e.target.files?.[0] ?? null); setDocGenPdfOk(false); setDocGenEpubOk(false); setDocGenError(null); }}
                          className="hidden" />
                        <button type="button" onClick={() => docxRef.current?.click()}
                          className="border border-amber/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:border-amber hover:text-amber transition-all text-bone/60 cursor-pointer">
                          {docxFile ? `✓ ${docxFile.name}` : existingDocxUrl ? "✓ .docx caricato (sostituisci)" : "▸ Scegli .docx"}
                        </button>
                        <HudButton variant="ghost" onClick={handleGenerateDocs} disabled={docGenerating || (!docxFile && !existingDocxUrl)}>
                          {docGenerating ? "▸ Generazione in corso..." : existingDocxUrl && !docxFile ? "◈ Rigenera PDF + E-Book" : "◈ Carica e genera PDF + E-Book"}
                        </HudButton>
                      </div>
                      {docGenerating && (
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono text-[11px] tracking-widest text-amber uppercase animate-pulse">
                            {!docGenPdfOk ? "◈ Generazione PDF..." : "◈ Generazione E-Book..."}
                          </span>
                          <div className="flex gap-1">
                            {Array.from({ length: 10 }).map((_, i) => (
                              <span key={i} className={`w-2.5 h-2.5 border transition-all duration-500 ${i < docProgress ? "bg-amber border-amber" : "bg-transparent border-amber/30"}`} />
                            ))}
                          </div>
                        </div>
                      )}
                      {(docGenPdfOk || docGenEpubOk) && !docGenerating && (
                        <p className="font-mono text-[10px] tracking-wide text-cyan uppercase">
                          {docGenPdfOk && "✓ PDF pronto"}
                          {docGenPdfOk && docGenEpubOk && " · "}
                          {docGenEpubOk && "✓ E-Book pronto"}
                        </p>
                      )}
                      {docGenError && <p className="font-mono text-[10px] tracking-wide text-magenta uppercase">✗ {docGenError}</p>}
                    </div>
                  )}

                </div>
              )}

              {/* ── SEZIONE 05: Copertina da stampa ── */}
              <button type="button" onClick={() => editingId && setOpenSection(openSection === 5 ? 0 : 5)} disabled={!editingId}
                className={`w-full flex items-center gap-3 px-5 py-4 border transition-all ${
                  !editingId ? "border-cyan/10 cursor-not-allowed" :
                  openSection === 5 ? "border-cyan bg-cyan/5 cursor-pointer" : "border-cyan/30 hover:border-cyan cursor-pointer"
                }`}>
                <span className={`font-mono text-[11px] w-7 h-7 border flex items-center justify-center flex-shrink-0 ${
                  !editingId ? "border-cyan/15 text-bone/20" :
                  openSection === 5 ? "border-cyan text-cyan" : "border-cyan/40 text-bone/50"
                }`}>05</span>
                <div className="flex-1 text-left">
                  <div className={`font-mono text-[11px] tracking-[0.3em] uppercase ${
                    !editingId ? "text-bone/20" : openSection === 5 ? "text-cyan" : "text-bone/70"
                  }`}>Copertina da stampa</div>
                  <div className={`font-mono text-[9px] tracking-widest mt-0.5 ${!editingId ? "text-bone/15" : "text-bone/40"}`}>
                    {editingId ? "fronte · spina · retro · alette" : "— salva prima i metadati —"}
                  </div>
                </div>
                <span className={`font-mono text-[9px] tracking-widest uppercase ${
                  !editingId ? "text-bone/20" : openSection === 5 ? "text-cyan" : "text-bone/40"
                }`}>{!editingId ? "⊗" : openSection === 5 ? "▲" : "▼"}</span>
              </button>
              {openSection === 5 && editingId && (
                <div className="border border-cyan/20 border-t-0 p-5 space-y-6">

                  {/* Formato e numero pagine */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Formato di stampa</label>
                      <select value={coverFormato} onChange={e => setCoverFormato(e.target.value)}
                        className={inputClass + " cursor-pointer"}>
                        <option value="a5">A5 — 148×210mm</option>
                        <option value="15x21">15×21cm</option>
                        <option value="17x24">17×24cm</option>
                        <option value="tascabile">Tascabile — 105×148mm</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelClass}>Numero di pagine</label>
                      {existingFileUrl ? (
                        <>
                          <div className={inputClass + " flex items-center justify-between bg-void/20 border-cyan/20 cursor-default select-none"}>
                            <span className="text-bone/70">{coverNumeroPagine || "—"}</span>
                            <span className="font-mono text-[9px] tracking-widest text-cyan/50 uppercase">dal PDF</span>
                          </div>
                          <p className="mt-1 font-mono text-[9px] text-bone/30 tracking-widest">
                            Aggiornato automaticamente ad ogni rigenera PDF
                          </p>
                        </>
                      ) : (
                        <>
                          <div className={inputClass + " border-amber/40 bg-amber/5 py-3 px-4"}>
                            <p className="font-mono text-[10px] tracking-widest text-amber uppercase">
                              ⚠ Genera prima il PDF (sezione 04) — il numero di pagine verrà calcolato automaticamente
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Preview schematica layout */}
                  <div>
                    <div className={labelClass + " mb-2"}>Anteprima layout (schematica)</div>
                    <div className="flex h-28 gap-0 font-mono text-[8px] tracking-widest uppercase overflow-hidden">
                      {/* Aletta sx */}
                      <div className="flex-[0.6] border border-cyan/20 bg-void/40 flex flex-col items-center justify-center gap-1 text-bone/30 min-w-0">
                        <span className="rotate-90 whitespace-nowrap">aletta ant.</span>
                        {coverAlettaSxTesto && <span className="text-cyan/40">✓</span>}
                      </div>
                      {/* Retro */}
                      <div className="flex-1 border border-cyan/30 bg-void/60 flex flex-col items-center justify-center gap-1 text-bone/40">
                        <span>retro</span>
                        {coverQuartaTesto && <span className="text-cyan/60 text-[7px]">✓ testo</span>}
                        {coverHasIsbn
                          ? <span className="text-amber/50 text-[7px]">isbn</span>
                          : <span className="text-bone/20 text-[7px]">logo</span>
                        }
                      </div>
                      {/* Spina */}
                      <div className="border-y border-cyan/20 bg-cyan/5 flex items-center justify-center text-cyan/30"
                        style={{ width: coverNumeroPagine
                          ? `${Math.max(8, Math.round((parseInt(coverNumeroPagine) * 0.052 + 2) / (coverFormato === "tascabile" ? 105 : coverFormato === "17x24" ? 170 : 148) * 60))}px`
                          : "10px"
                        }}>
                      </div>
                      {/* Fronte */}
                      <div className="flex-1 border border-magenta/30 bg-void/60 relative overflow-hidden">
                        {existingFlatUrl
                          ? <img src={existingFlatUrl} alt="" className="w-full h-full object-cover opacity-60" />
                          : <div className="w-full h-full flex items-center justify-center font-mono text-[8px] text-bone/30 uppercase tracking-widest">fronte</div>
                        }
                      </div>
                      {/* Aletta dx */}
                      <div className="flex-[0.6] border border-cyan/20 bg-void/40 flex flex-col items-center justify-center gap-1 text-bone/30 min-w-0">
                        <span className="rotate-90 whitespace-nowrap">aletta post.</span>
                        {coverAlettaDxTesto && <span className="text-cyan/40">✓</span>}
                      </div>
                    </div>
                  </div>

                  {/* Testi sezioni */}
                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Aletta anteriore <span className="text-bone/30 normal-case">(si piega dentro la copertina)</span></label>
                      <textarea value={coverAlettaSxTesto} onChange={e => setCoverAlettaSxTesto(e.target.value)}
                        placeholder="Biografia dell'autore, nota sull'opera..."
                        rows={4}
                        className={inputClass + " resize-y font-serif"} />
                    </div>

                    <div>
                      <label className={labelClass}>Quarta di copertina <span className="text-bone/30 normal-case">(retro)</span></label>
                      <textarea value={coverQuartaTesto} onChange={e => setCoverQuartaTesto(e.target.value)}
                        placeholder="Descrizione del libro, citazioni, testo di presentazione..."
                        rows={5}
                        className={inputClass + " resize-y font-serif"} />
                    </div>

                    <div>
                      <label className={labelClass}>Aletta posteriore <span className="text-bone/30 normal-case">(si piega dentro il retro)</span></label>
                      <textarea value={coverAlettaDxTesto} onChange={e => setCoverAlettaDxTesto(e.target.value)}
                        placeholder="Collana, altri titoli, note..."
                        rows={3}
                        className={inputClass + " resize-y font-serif"} />
                    </div>
                  </div>

                  {/* Foto autore */}
                  <div>
                    <label className={labelClass}>Foto autore <span className="text-bone/30 normal-case">(opzionale — per l'aletta)</span></label>
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      {existingCoverFotoAutoreUrl && (
                        <img src={existingCoverFotoAutoreUrl} alt="" className="w-12 h-12 object-cover rounded-full ring-1 ring-cyan/30" />
                      )}
                      <input ref={coverFotoAutoreRef} type="file" accept="image/*"
                        onChange={e => setCoverFotoAutore(e.target.files?.[0] ?? null)}
                        className="hidden" />
                      <button type="button" onClick={() => coverFotoAutoreRef.current?.click()}
                        className="border border-cyan/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:border-cyan hover:text-cyan transition-all text-bone/60 cursor-pointer">
                        {coverFotoAutore ? `✓ ${coverFotoAutore.name}` : existingCoverFotoAutoreUrl ? "✓ caricata (sostituisci)" : "▸ Scegli foto"}
                      </button>
                    </div>
                  </div>

                  {/* ISBN / logo */}
                  <div className="space-y-3">
                    <label className={labelClass}>ISBN</label>
                    <div className="flex items-center gap-3">
                      <button type="button"
                        onClick={() => setCoverHasIsbn(!coverHasIsbn)}
                        className={`w-10 h-5 border transition-all relative flex-shrink-0 ${coverHasIsbn ? "border-cyan bg-cyan/20" : "border-cyan/30"}`}>
                        <span className={`absolute top-0.5 w-3.5 h-3.5 bg-current transition-all ${coverHasIsbn ? "left-5 text-cyan" : "left-0.5 text-bone/30"}`} />
                      </button>
                      <span className="font-mono text-[10px] tracking-widest text-bone/50">
                        {coverHasIsbn ? "Inserisco il codice ISBN" : "Usa logo Liberiamo come placeholder"}
                      </span>
                    </div>
                    {coverHasIsbn && (
                      <div>
                        <input type="text" value={coverIsbn} onChange={e => setCoverIsbn(e.target.value)}
                          placeholder="978-88-..."
                          className={inputClass} />
                        <p className="mt-1 font-mono text-[9px] text-bone/30 tracking-widest">
                          L'ISBN va richiesto tramite AIE o un'agenzia (costo ~€35-50 per codice)
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Prezzo */}
                  <div>
                    <label className={labelClass}>Prezzo <span className="text-bone/30 normal-case">(opzionale — stampato sul retro)</span></label>
                    <input type="text" value={coverPrezzo} onChange={e => setCoverPrezzo(e.target.value)}
                      placeholder="€ 18,00"
                      className={inputClass} />
                  </div>

                  {/* Azioni */}
                  <div className="flex gap-3 flex-wrap pt-2">
                    <HudButton variant="ghost" onClick={handleSaveCoverStampa} disabled={savingCoverStampa || generatingCoverStampa}>
                      {savingCoverStampa ? "▸ Salvataggio..." : "▸ Salva testi"}
                    </HudButton>
                    <HudButton variant="primary" onClick={handleGenerateCoverStampa}
                      disabled={generatingCoverStampa || savingCoverStampa || !existingFlatUrl}>
                      {generatingCoverStampa ? "◈ Generazione in corso..." : "◈ Genera copertina da stampa"}
                    </HudButton>
                  </div>

                  {!existingFlatUrl && (
                    <p className="font-mono text-[9px] tracking-widest text-magenta/60 uppercase">
                      ✗ Prima carica o genera la copertina fronte (sezione 03)
                    </p>
                  )}

                  {coverStampaError && (
                    <p className="font-mono text-[10px] tracking-wide text-magenta uppercase">✗ {coverStampaError}</p>
                  )}

                  {coverStampaGenOk && (
                    <p className="font-mono text-[10px] tracking-wide text-cyan uppercase">✓ Copertina generata con successo</p>
                  )}

                  {/* Download */}
                  {(existingCoverStampaUrl || existingCoverStampaBleedUrl) && (
                    <div className="border border-cyan/20 bg-void/30 p-4 space-y-3">
                      <div className={labelClass}>File generati</div>
                      <div className="flex gap-3 flex-wrap">
                        {existingCoverStampaUrl && (
                          <a href={existingCoverStampaUrl} download target="_blank" rel="noreferrer"
                            className="border border-cyan/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:border-cyan hover:text-cyan transition-all text-bone/60">
                            ▸ Scarica — versione pulita
                          </a>
                        )}
                        {existingCoverStampaBleedUrl && (
                          <a href={existingCoverStampaBleedUrl} download target="_blank" rel="noreferrer"
                            className="border border-amber/40 px-4 py-2 font-mono text-[10px] uppercase tracking-widest hover:border-amber hover:text-amber transition-all text-bone/60">
                            ▸ Scarica — con bleed e segni di taglio
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

          {/* Dettaglio opera selezionata */}
          {selected && !showForm && (
            <HudPanel label="dettaglio" code={`ID:${selected.id.slice(0, 6).toUpperCase()}`}>
              <div className="flex items-start gap-5">
                {selected.copertina_url ? (
                  <img
                    src={(selected as unknown as Record<string, string | null>).copertina_flat_url ?? selected.copertina_url}
                    alt=""
                    className="w-24 h-32 object-cover ring-1 ring-cyan/30"
                  />
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

              <div className="mt-5 space-y-4">
                {selected.cestinato ? (
                  <div className="border border-magenta/40 bg-magenta/5 p-4 space-y-3">
                    <div className="font-mono text-[10px] tracking-widest text-magenta uppercase">
                      ⊗ Nel cestino degli scritti perduti
                    </div>
                    <p className="font-serif italic text-bone/60 text-sm">
                      I lettori possono leggere e votare per il recupero. Voti ricevuti: {selected.voti_cestino}/5.
                    </p>
                    {selected.recuperato && (
                      <div className="font-mono text-[10px] tracking-widest text-cyan uppercase">
                        ✓ Recuperata dai lettori
                      </div>
                    )}
                    <HudButton variant="primary" onClick={() => handleRipristinaDalCestino(selected)}>
                      ▸ Ripristina dal cestino
                    </HudButton>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-3">
                      {selected.disponibile ? (
                        <>
                          <HudButton variant="ghost" onClick={handleModifica} disabled={!!confirmMode}>◆ Modifica</HudButton>
                          <HudButton variant="ghost" onClick={() => setConfirmMode("archivia")} disabled={!!confirmMode}>⊗ Archivia</HudButton>
                          <HudButton variant="ghost" onClick={() => setConfirmMode("cestino")} disabled={!!confirmMode}>⊗ Cestino</HudButton>
                        </>
                      ) : (
                        <>
                          <HudButton variant="ghost" onClick={handleModifica}>◆ Modifica</HudButton>
                          <HudButton variant="primary" onClick={() => handleRipristina(selected)}>▸ Ripristina</HudButton>
                          <HudButton variant="ghost" onClick={() => setConfirmMode("cestino")} disabled={!!confirmMode}>⊗ Cestino</HudButton>
                        </>
                      )}
                    </div>
                    {confirmMode === "archivia" && (
                      <div className="border border-magenta/50 bg-magenta/5 p-4 space-y-3">
                        <p className="font-mono text-[10px] tracking-widest text-magenta uppercase">
                          ⚠ L'opera verrà nascosta dal catalogo. Potrai ripristinarla in qualsiasi momento.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <HudButton variant="magenta" onClick={handleElimina}>⊗ Archivia</HudButton>
                          <HudButton variant="magenta" onClick={handleEliminaDefinitivamente}>Elimina definitivamente</HudButton>
                          <HudButton variant="ghost" onClick={() => setConfirmMode(null)}>Annulla</HudButton>
                        </div>
                      </div>
                    )}
                    {confirmMode === "cestino" && (
                      <div className="border border-magenta/50 bg-magenta/5 p-4 space-y-3">
                        <p className="font-mono text-[10px] tracking-widest text-magenta uppercase">
                          ⚠ L'opera sarà spostata nel Cestino degli Scritti Perduti, visibile al pubblico.
                        </p>
                        <div className="flex flex-wrap gap-3">
                          <HudButton variant="magenta" onClick={handleGettaNelCestino}>⊗ Sposta nel cestino</HudButton>
                          <HudButton variant="ghost" onClick={() => setConfirmMode(null)}>Annulla</HudButton>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </HudPanel>
          )}


          {!showForm && !selected && !showCollanaForm && !selectedCollana && !showCollanaList && (
            <HudPanel label="area di lavoro" tone="magenta">
              <p className="font-serif italic text-bone/70">
                Seleziona un'opera dalla lista oppure creane una nuova.
              </p>
            </HudPanel>
          )}

          {/* Lista collane per selezione */}
          {showCollanaList && !selectedCollana && !showCollanaForm && (
            <HudPanel label="le tue collane" code={`${collane.length}`} tone="cyan">
              {collane.length === 0 ? (
                <p className="font-serif italic text-bone/40 text-sm">Nessuna collana ancora. Usa ◆ Crea per aggiungerne una.</p>
              ) : (
                <ul className="space-y-2">
                  {collane.map(c => (
                    <li key={c.id}>
                      <button
                        onClick={() => { setSelectedCollana(c); setShowCollanaList(false); }}
                        className="w-full text-left p-3 border border-cyan/15 text-bone/70 hover:border-cyan/50 hover:text-bone transition-all"
                      >
                        <div className="font-display text-sm tracking-tight truncate">{c.titolo}</div>
                        {c.descrizione && (
                          <div className="font-mono text-[9px] tracking-widest opacity-50 uppercase mt-1 truncate">{c.descrizione}</div>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </HudPanel>
          )}

          {/* Form nuova / modifica collana */}
          {showCollanaForm && (
            <HudPanel label={collanaEditingId ? "modifica collana" : "nuova collana"} code={collanaEditingId ? "EDIT" : "NEW"}>
              <div className="space-y-5">
                <div>
                  <span className={labelClass}>↳ Titolo collana ★</span>
                  <input value={collanaTitolo} onChange={e => setCollanaTitolo(e.target.value)} placeholder="Es. Le novelle di primavera" className={inputClass} />
                </div>
                <div>
                  <span className={labelClass}>↳ Descrizione</span>
                  <textarea value={collanaDescrizione} onChange={e => setCollanaDescrizione(e.target.value)}
                    placeholder="Di cosa parla questa collana..."
                    className="mt-2 w-full min-h-24 bg-void/40 border border-cyan/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan transition-all" />
                </div>
                <div>
                  <span className={labelClass}>↳ Copertina collana</span>
                  <input ref={collanaCopertinaRef} type="file" accept="image/*"
                    onChange={e => setCollanaCopertina(e.target.files?.[0] ?? null)} className="hidden" />
                  <button type="button" onClick={() => collanaCopertinaRef.current?.click()}
                    className="mt-2 w-full border border-cyan/30 px-4 py-3 font-mono text-[10px] text-left uppercase tracking-widest hover:border-cyan hover:text-cyan transition-all text-bone/60">
                    {collanaCopertina ? `✓ ${collanaCopertina.name}` : existingCollanaCopertina ? "✓ esistente (cambia)" : "▸ Scegli immagine"}
                  </button>
                </div>
                {collanaError && (
                  <p className="font-mono text-[11px] text-magenta border border-magenta/30 bg-magenta/5 px-4 py-3">⚠ {collanaError}</p>
                )}
                <div className="flex gap-3">
                  <HudButton variant="primary" onClick={handleSaveCollana} disabled={savingCollana || !collanaTitolo.trim()}>
                    {savingCollana ? "▸ Salvataggio..." : collanaEditingId ? "▸ Aggiorna collana" : "▸ Salva collana"}
                  </HudButton>
                  <HudButton variant="ghost" onClick={() => { setShowCollanaForm(false); resetCollanaForm(); }}>annulla</HudButton>
                </div>
              </div>
            </HudPanel>
          )}

          {/* Dettaglio collana */}
          {selectedCollana && !showCollanaForm && (
            <HudPanel label="dettaglio collana" code={`ID:${selectedCollana.id.slice(0, 6).toUpperCase()}`}>
              <div className="flex items-start gap-5">
                {selectedCollana.copertina_url ? (
                  <img src={selectedCollana.copertina_url} alt="" className="w-24 h-32 object-cover ring-1 ring-cyan/30 flex-shrink-0" />
                ) : (
                  <div className="w-24 h-32 bg-void/60 border border-cyan/20 flex items-center justify-center font-display text-4xl text-bone/20 flex-shrink-0">◊</div>
                )}
                <div className="flex-1">
                  <div className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase">// collana</div>
                  <h3 className="mt-1 font-display text-2xl text-bone tracking-tight">{selectedCollana.titolo}</h3>
                  {selectedCollana.descrizione && <p className="mt-2 font-serif italic text-bone/60 text-sm">{selectedCollana.descrizione}</p>}
                </div>
              </div>

              <div className="hud-divider my-5" />
              <div className="font-mono text-[10px] tracking-widest text-cyan/70 uppercase mb-3">// novelle in questa collana</div>
              {(() => {
                const collanaBooks = books.filter(b => b.collana_id === selectedCollana.id);
                const handleRemoveFromCollana = async (bookId: string) => {
                  await supabase.from("books").update({ collana_id: null }).eq("id", bookId);
                  if (userId) await loadBooks(userId);
                };
                return (
                  <>
                    {collanaBooks.length === 0
                      ? <p className="font-serif italic text-bone/40 text-sm mb-3">Nessuna opera assegnata ancora.</p>
                      : <ul className="space-y-2 mb-3">
                          {collanaBooks.map(b => (
                            <li key={b.id} className="border border-cyan/10">
                              <div className="flex items-center gap-3 p-3">
                                {b.copertina_url && <img src={b.copertina_url} alt="" className="w-8 h-10 object-cover flex-shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <div className="font-mono text-[10px] uppercase tracking-widest text-bone/70 truncate">{b.titolo}</div>
                                  {b.sottotitolo && <div className="font-mono text-[9px] text-bone/40 truncate">{b.sottotitolo}</div>}
                                </div>
                                <button
                                  onClick={() => { setConfirmDeleteNovella(null); setSelected(b); setSelectedCollana(null); setShowCollanaList(false); openEditForm(b); }}
                                  className="font-mono text-[9px] uppercase tracking-widest text-cyan/60 hover:text-cyan border border-cyan/20 hover:border-cyan/50 px-3 py-1.5 transition-colors flex-shrink-0">
                                  Modifica
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteNovella(confirmDeleteNovella === b.id ? null : b.id)}
                                  className="font-mono text-[9px] uppercase tracking-widest text-magenta/60 hover:text-magenta border border-magenta/20 hover:border-magenta/50 px-3 py-1.5 transition-colors flex-shrink-0">
                                  Elimina
                                </button>
                              </div>
                              {confirmDeleteNovella === b.id && (
                                <div className="border-t border-magenta/20 bg-magenta/5 px-3 py-3 space-y-2">
                                  <p className="font-mono text-[9px] tracking-widest text-magenta uppercase">
                                    ⚠ Archivia per nasconderla (recuperabile) oppure elimina dal database.
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      onClick={async () => { await supabase.from("books").update({ disponibile: false }).eq("id", b.id); setConfirmDeleteNovella(null); if (userId) await loadBooks(userId); }}
                                      className="font-mono text-[9px] uppercase tracking-widest border border-magenta/50 text-magenta bg-magenta/10 hover:bg-magenta/20 px-3 py-1.5 transition-colors">
                                      Archivia
                                    </button>
                                    <button
                                      onClick={async () => { await supabase.from("books").delete().eq("id", b.id); setConfirmDeleteNovella(null); if (userId) await loadBooks(userId); }}
                                      className="font-mono text-[9px] uppercase tracking-widest border border-magenta/50 text-magenta bg-magenta/10 hover:bg-magenta/20 px-3 py-1.5 transition-colors">
                                      Elimina definitivamente
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteNovella(null)}
                                      className="font-mono text-[9px] uppercase tracking-widest border border-cyan/20 text-bone/50 hover:text-bone hover:border-cyan/50 px-3 py-1.5 transition-colors">
                                      Annulla
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                    }
                    <button
                      onClick={() => handleNewBookInCollana(selectedCollana.id)}
                      className="w-full font-mono text-[10px] tracking-widest text-magenta uppercase border border-magenta/40 py-2 hover:bg-magenta/10 transition-colors"
                    >
                      ◆ + nuova novella
                    </button>
                  </>
                );
              })()}

              <div className="hud-divider my-5" />
              <div className="font-mono text-[9px] tracking-widest text-bone/30 uppercase mb-2">// pagina pubblica della collana</div>
              <Link
                to="/collane/$slug"
                params={{ slug: selectedCollana.slug }}
                className="flex items-center justify-between gap-3 border border-cyan/20 px-4 py-3 hover:border-cyan hover:bg-cyan/5 transition-all group"
              >
                <div>
                  <div className="font-display text-base text-bone group-hover:text-cyan transition-colors">
                    {selectedCollana.titolo}
                  </div>
                  <div className="font-mono text-[9px] text-bone/30 tracking-widest mt-0.5">
                    Leggi le novelle della collana →
                  </div>
                </div>
                <span className="font-mono text-lg text-cyan/30 group-hover:text-cyan transition-colors">▸</span>
              </Link>
              <div className="flex gap-3 mt-3">
                <HudButton variant="ghost" onClick={handleEditCollana}>◆ Modifica</HudButton>
                {confirmDeleteCollana ? (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-magenta uppercase tracking-widest">Eliminare?</span>
                    <HudButton variant="magenta" onClick={handleDeleteCollana}>Sì</HudButton>
                    <HudButton variant="ghost" onClick={() => setConfirmDeleteCollana(false)}>No</HudButton>
                  </div>
                ) : (
                  <HudButton variant="ghost" onClick={() => setConfirmDeleteCollana(true)}>⊗ Elimina</HudButton>
                )}
              </div>
            </HudPanel>
          )}

        </div>
      </PageShell>
      <SiteFooter />

      {/* Modal anteprima copertina AI */}
      {aiModalUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm p-6"
          onClick={() => setAiModalUrl(null)}
        >
          <div className="relative max-h-full" onClick={e => e.stopPropagation()}>
            <img src={aiModalUrl} alt="Anteprima copertina" className="max-h-[85vh] max-w-[90vw] object-contain ring-1 ring-cyan/40" />
            <button
              onClick={() => setAiModalUrl(null)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-void border border-cyan/40 text-bone hover:text-magenta font-mono text-sm flex items-center justify-center transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

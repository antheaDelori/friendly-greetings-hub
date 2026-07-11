import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/registrazione")({
  validateSearch: z.object({
    autore: z.coerce.boolean().optional(),
    modifica: z.coerce.boolean().optional(),
  }),
  head: () => ({
    meta: [
      { title: "Registrazione — Liberiamo la mente" },
      { name: "description", content: "Crea il tuo profilo lettore o autore sulla biblioteca olografica." },
    ],
  }),
  component: RegistrazionePage,
});

const registraSchema = z.object({
  nome: z.string().min(2, "Inserisci il nome (min. 2 caratteri)"),
  cognome: z.string().min(2, "Inserisci il cognome (min. 2 caratteri)"),
  email: z.string().email("Email non valida"),
  email_conferma: z.string().email("Email non valida"),
  password: z.string().min(8, "Password di almeno 8 caratteri"),
  password_conferma: z.string().min(1, "Conferma la password"),
  telefono: z.string().optional(),
  pseudonimo: z.string().optional(),
  indirizzo: z.string().optional(),
  data_nascita: z.string().optional(),
}).refine((d) => d.email === d.email_conferma, {
  message: "Le email non coincidono", path: ["email_conferma"],
}).refine((d) => d.password === d.password_conferma, {
  message: "Le password non coincidono", path: ["password_conferma"],
});

const modificaSchema = z.object({
  nome: z.string().min(2, "Inserisci il nome (min. 2 caratteri)"),
  cognome: z.string().min(2, "Inserisci il cognome (min. 2 caratteri)"),
  email: z.string().email("Email non valida"),
  email_conferma: z.string().optional(),
  password: z.string().min(8, "Password di almeno 8 caratteri").optional().or(z.literal("")),
  password_conferma: z.string().optional(),
  telefono: z.string().optional(),
  pseudonimo: z.string().optional(),
  indirizzo: z.string().optional(),
  data_nascita: z.string().optional(),
}).refine((d) => !d.password || d.password === d.password_conferma, {
  message: "Le password non coincidono", path: ["password_conferma"],
});

type FormData = {
  nome: string; cognome: string; email: string; email_conferma?: string;
  password?: string; password_conferma?: string; telefono?: string;
  pseudonimo?: string; indirizzo?: string; data_nascita?: string;
};

const compressAvatar = (file: File): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const size = 400;
      const scale = Math.min(1, size / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("blob")), "image/jpeg", 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });

function HudField({ label, error, tone = "cyan", children }: { label: string; error?: string; tone?: "cyan" | "magenta"; children: React.ReactNode }) {
  return (
    <div>
      <span className={`font-mono text-[10px] tracking-[0.25em] uppercase ${tone === "magenta" ? "text-magenta/70" : "text-cyan/70"}`}>↳ {label}</span>
      {children}
      {error && <p className="mt-1 font-mono text-[10px] text-magenta">{error}</p>}
    </div>
  );
}

const inputClass = "mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all";

function RegistrazionePage() {
  const { t, i18n } = useTranslation();
  const { autore, modifica } = Route.useSearch();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailInviata, setEmailInviata] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aggiornato, setAggiornato] = useState(false);
  const [originalEmail, setOriginalEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    setAvatarUrl(null);
    try {
      const compressed = await compressAvatar(file);
      const { data: { user } } = await supabase.auth.getUser();
      // Il primo segmento del path deve essere lo userId: è quello che la policy
      // RLS del bucket "libri" verifica per riconoscere il proprietario del file.
      const path = user ? `${user.id}/avatar.jpg` : `avatars/reg-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("libri").upload(path, compressed, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("libri").getPublicUrl(path);
      setAvatarUrl(user ? `${publicUrl}?v=${Date.now()}` : publicUrl);
    } catch (err) {
      // Upload fallisce ancora senza policy anonima in registrazione pre-account — avatar resta nullo.
      console.error("Errore caricamento avatar:", err);
    } finally {
      setAvatarUploading(false);
    }
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(modifica ? modificaSchema : registraSchema) as any,
  });

  useEffect(() => {
    if (!modifica) return;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate({ to: "/auth" }); return; }
      const m = user.user_metadata ?? {};
      setOriginalEmail(user.email ?? "");
      if (m.avatar_url) { setAvatarUrl(m.avatar_url); setAvatarPreview(m.avatar_url); }
      reset({
        nome: m.nome ?? "",
        cognome: m.cognome ?? "",
        email: user.email ?? "",
        pseudonimo: m.pseudonimo ?? "",
        telefono: m.telefono ?? "",
        data_nascita: m.data_nascita ?? "",
        indirizzo: m.indirizzo ?? "",
        password: "",
        password_conferma: "",
      });
    });
  }, [modifica]);

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setLoading(true);
    try {
      if (modifica) {
        if (data.email !== originalEmail && data.email_conferma !== data.email) {
          setServerError("Le email non coincidono — conferma la nuova email.");
          setLoading(false);
          return;
        }
        const updatePayload: Parameters<typeof supabase.auth.updateUser>[0] = {
          data: {
            nome: data.nome,
            cognome: data.cognome,
            telefono: data.telefono ?? null,
            pseudonimo: data.pseudonimo ?? null,
            indirizzo: data.indirizzo ?? null,
            data_nascita: data.data_nascita ?? null,
            avatar_url: avatarUrl || null,
          },
        };
        if (data.email) updatePayload.email = data.email;
        if (data.password) updatePayload.password = data.password;

        const { error } = await supabase.auth.updateUser(updatePayload);
        if (error) { setServerError(error.message); return; }

        await supabase.from("profiles").update({
          nome: data.nome,
          cognome: data.cognome,
          pseudonimo: data.pseudonimo ?? null,
        }).eq("id", (await supabase.auth.getUser()).data.user!.id);

        setAggiornato(true);
      } else {
        const result = await supabase.auth.signUp({
          email: data.email!,
          password: data.password!,
          options: {
            emailRedirectTo: autore
              ? `${window.location.origin}/auth/profilo-autore`
              : undefined,
            data: {
              nome: data.nome,
              cognome: data.cognome,
              telefono: data.telefono ?? null,
              pseudonimo: data.pseudonimo ?? null,
              indirizzo: data.indirizzo ?? null,
              data_nascita: data.data_nascita ?? null,
              avatar_url: avatarUrl || null,
              lingua: i18n.language ?? "it",
            },
          },
        });
        if (result.error) { setServerError(result.error.message); return; }
        setEmailInviata(data.email!);
      }
    } catch (e: unknown) {
      setServerError(e instanceof Error ? e.message : "Errore di connessione. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  if (aggiornato) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm px-4">
        <div className="glass hud-frame max-w-lg w-full p-10 text-center fade-up">
          <div className="font-mono text-[10px] tracking-[0.35em] text-cyan uppercase mb-6">// profilo_aggiornato</div>
          <div className="font-display text-4xl text-bone">{t("registrazione.aggiornato")}</div>
          <p className="mt-4 font-serif italic text-bone/60">{t("registrazione.aggiornatoDesc")}</p>
          <div className="mt-8 flex gap-3 justify-center">
            <Link to="/libreria">
              <HudButton variant="primary">▸ {t("registrazione.tornaLibreria")}</HudButton>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (emailInviata) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm scanlines px-4">
        <div className="glass hud-frame max-w-lg w-full p-10 text-center fade-up">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px w-32 h-px bg-gradient-to-r from-transparent via-cyan/80 to-transparent" />
          <div className="font-mono text-[10px] tracking-[0.35em] text-cyan uppercase mb-6">
            // trasmissione_inviata · 2076
          </div>
          <div className="font-display text-4xl md:text-5xl text-bone leading-tight tracking-tight">
            {t("registrazione.emailSentTitolo1")}<br />
            <span className="text-cyan text-glow-cyan">{t("registrazione.emailSentTitolo2")}</span>
          </div>
          <p className="mt-6 font-serif italic text-lg text-bone/70 leading-relaxed">
            {t("registrazione.emailSentInviato")}<br />
            <span className="text-bone not-italic font-mono text-sm tracking-widest">{emailInviata}</span>
          </p>
          <p className="mt-4 font-serif italic text-base text-bone/50 leading-relaxed">
            {t("registrazione.emailSentAttiva")}{autore ? t("registrazione.emailSentAutore") : ""}{t("registrazione.emailSentValido")}
          </p>
          {autore && (
            <div className="mt-6 border border-magenta/30 bg-magenta/5 px-5 py-4 text-left">
              <p className="font-mono text-[10px] tracking-widest text-magenta uppercase mb-2">// passo successivo</p>
              <p className="font-serif italic text-bone/70 text-sm leading-relaxed">
                {t("registrazione.emailSentDopoAutore")}
              </p>
              <Link to="/auth/profilo-autore" className="mt-3 inline-flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase text-magenta hover:text-bone transition-colors">
                ◆ {t("registrazione.emailSentVaiAutore")}
              </Link>
            </div>
          )}
          <div className="mt-6 border-t border-cyan/10 pt-6 space-y-2">
            <p className="font-mono text-[10px] tracking-widest text-bone/40 uppercase">{t("registrazione.emailSentSpam")}</p>
            <p className="font-mono text-[11px] text-cyan/70 border border-cyan/20 bg-cyan/5 px-4 py-2 inline-block">
              {t("registrazione.emailSentSoggetto")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageShell
      code={modifica ? "// AUTH/PROFILE.edit" : "// AUTH/REGISTER.form"}
      title={modifica ? "Il tuo profilo" : t("registrazione.pageTitle")}
      subtitle={modifica ? "Modifica i tuoi dati. I campi password sono opzionali — lasciali vuoti per non cambiarla." : t("registrazione.pageSubtitle")}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">

          <HudPanel label="dati_principali" code={modifica ? "EDIT" : "REQ ★"}>
            <div className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-5">
                <HudField label={t("registrazione.fNome")} error={errors.nome?.message}>
                  <input {...register("nome")} placeholder={t("registrazione.phNome")} className={inputClass} />
                </HudField>
                <HudField label={t("registrazione.fCognome")} error={errors.cognome?.message}>
                  <input {...register("cognome")} placeholder={t("registrazione.phCognome")} className={inputClass} />
                </HudField>
              </div>

              <div className="border border-cyan/20 bg-cyan/5 p-5 space-y-5">
                <div className="font-mono text-[10px] tracking-[0.3em] text-cyan uppercase">// credenziali_accesso</div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <HudField label={t("registrazione.fEmail")} error={errors.email?.message}>
                    <input {...register("email")} type="email" placeholder={t("registrazione.phEmail")} className={inputClass} />
                  </HudField>
                  <HudField label={modifica ? "conferma nuova email" : t("registrazione.fEmailConferma")} error={errors.email_conferma?.message}>
                    <input {...register("email_conferma")} type="email" placeholder={modifica ? "ripeti solo se la cambi" : t("registrazione.phEmailConferma")} className={inputClass} />
                  </HudField>
                  <HudField label={modifica ? "nuova password (opzionale)" : t("registrazione.fPassword")} error={errors.password?.message}>
                    <input {...register("password")} type="password" placeholder={modifica ? "lascia vuoto per non cambiare" : t("registrazione.phPassword")} className={inputClass} />
                  </HudField>
                  <HudField label={t("registrazione.fPasswordConferma")} error={errors.password_conferma?.message}>
                    <input {...register("password_conferma")} type="password" placeholder={t("registrazione.phPasswordConferma")} className={inputClass} />
                  </HudField>
                </div>
              </div>

              {serverError && (
                <p className="font-mono text-[11px] text-magenta border border-magenta/30 bg-magenta/5 px-4 py-3">
                  ⚠ {serverError}
                </p>
              )}

              {!modifica && (
                <div className="flex items-start gap-3 pt-2 pb-1 border border-cyan/20 bg-cyan/5 px-4 py-3">
                  <input type="checkbox" id="privacy_consent" required className="mt-1 accent-cyan cursor-pointer flex-shrink-0" />
                  <label htmlFor="privacy_consent" className="font-serif text-sm text-bone/90 leading-relaxed cursor-pointer">
                    Ho letto e accetto la{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan underline hover:text-cyan/80 font-semibold">Privacy Policy</a>
                    {" "}e il trattamento dei miei dati personali ai sensi del GDPR.
                  </label>
                </div>
              )}

              <div className="flex flex-wrap gap-3 items-center pt-2">
                <HudButton type="submit" variant="primary" disabled={loading}>
                  {loading
                    ? "▸ Salvataggio..."
                    : modifica
                      ? "▸ Aggiorna profilo"
                      : `▸ ${t("registrazione.invioBtn")}`
                  }
                </HudButton>
                <Link to={modifica ? "/libreria" : "/auth"} className="font-mono text-[10px] tracking-widest uppercase text-bone/50 hover:text-bone border border-bone/20 hover:border-bone/50 px-4 py-2 transition-all">
                  {t("registrazione.annulla")}
                </Link>
              </div>
              {!modifica && (
                <div className="mt-4 border border-cyan/30 bg-cyan/5 px-4 py-3">
                  <p className="font-serif text-sm text-bone/90 leading-relaxed">
                    {t("registrazione.emailConfermaNote")}
                  </p>
                </div>
              )}
            </div>
          </HudPanel>

          <HudPanel label="campi_facoltativi" tone="magenta">
            <p className="font-serif italic text-bone/70 text-sm">
              {t("registrazione.panelOpzionaliDesc", "Arricchisci il tuo profilo. Puoi completare o modificare questi dati in qualsiasi momento.")}
            </p>
            <div className="hud-divider mt-4 mb-5" />
            <div className="space-y-4">
              <HudField label={t("registrazione.fPseudonimo")} tone="magenta">
                <input {...register("pseudonimo")} placeholder={t("registrazione.phPseudonimo")} className={inputClass} />
              </HudField>
              <HudField label={t("registrazione.fTelefono")} tone="magenta">
                <input {...register("telefono")} placeholder="+39 ..." className={inputClass} />
              </HudField>
              <HudField label={t("registrazione.fDataNascita")} tone="magenta">
                <input {...register("data_nascita")} type="date" className={inputClass} />
              </HudField>
              <HudField label={t("registrazione.fIndirizzo")} tone="magenta">
                <input {...register("indirizzo")} placeholder={t("registrazione.phIndirizzo")} className={inputClass} />
              </HudField>
              {modifica && (
                <HudField label={t("registrazione.fAvatar")} tone="magenta">
                  <div className="mt-2 flex items-center gap-3">
                    {avatarPreview && (
                      <img src={avatarPreview} alt="avatar" className="w-14 h-14 object-cover rounded-full ring-1 ring-magenta/40 flex-shrink-0" />
                    )}
                    <label className="flex-1 cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      <div className={`border px-4 py-3 font-mono text-[10px] tracking-widest uppercase text-center transition-all ${
                        avatarUploading
                          ? "border-magenta/20 text-magenta/30 animate-pulse"
                          : avatarUrl
                            ? "border-magenta/50 text-magenta/80 hover:border-magenta"
                            : "border-magenta/30 text-magenta/50 hover:border-magenta/60"
                      }`}>
                        {avatarUploading ? "▸ caricamento..." : avatarUrl ? "▸ cambia foto" : "▸ scegli foto"}
                      </div>
                    </label>
                  </div>
                </HudField>
              )}
            </div>
          </HudPanel>

        </div>
      </form>
    </PageShell>
  );
}

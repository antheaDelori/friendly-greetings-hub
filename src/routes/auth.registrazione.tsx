import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/registrazione")({
  head: () => ({
    meta: [
      { title: "Registrazione — Liberiamo la mente" },
      { name: "description", content: "Crea il tuo profilo lettore o autore sulla biblioteca olografica." },
    ],
  }),
  component: RegistrazionePage,
});

const schema = z.object({
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
  avatar_url: z.string().url("Inserisci un URL valido").optional().or(z.literal("")),
}).refine((d) => d.email === d.email_conferma, {
  message: "Le email non coincidono",
  path: ["email_conferma"],
}).refine((d) => d.password === d.password_conferma, {
  message: "Le password non coincidono",
  path: ["password_conferma"],
});

type FormData = z.infer<typeof schema>;

function HudField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase">↳ {label}</span>
      {children}
      {error && <p className="mt-1 font-mono text-[10px] text-magenta">{error}</p>}
    </div>
  );
}

const inputClass = "mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all";

function RegistrazionePage() {
  const { t } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setLoading(true);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout: riprova tra qualche minuto con la stessa email.")), 15000)
      );
      const result = await Promise.race([supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            nome: data.nome,
            cognome: data.cognome,
            telefono: data.telefono ?? null,
            pseudonimo: data.pseudonimo ?? null,
            indirizzo: data.indirizzo ?? null,
            data_nascita: data.data_nascita ?? null,
            avatar_url: data.avatar_url || null,
          },
        },
      }), timeout]);
      if (result.error) {
        setServerError(result.error.message);
        return;
      }
      setShowAuthorModal(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Errore di connessione. Riprova.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    {/* Modal autore */}
    {showAuthorModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" />

        <div className="relative glass hud-frame max-w-lg w-full p-10 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px w-32 h-px bg-gradient-to-r from-transparent via-cyan/80 to-transparent" />

          <div className="font-mono text-[10px] tracking-[0.35em] text-cyan uppercase mb-6">
            // trasmissione_in_arrivo · 2076
          </div>

          <div className="font-display text-4xl md:text-5xl text-bone leading-tight tracking-tight">
            {t("registrazione.modalTitoloA")}<br />
            <span className="text-magenta text-glow-magenta">{t("registrazione.modalTitoloB")}</span>
          </div>

          <p className="mt-6 font-serif italic text-xl text-bone/75 leading-relaxed">
            {t("registrazione.modalDesc")}<br />
            <span className="text-cyan not-italic font-mono text-sm tracking-widest">{t("registrazione.modalSub")}</span>
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/profilo-autore">
              <HudButton variant="magenta" className="w-full sm:w-auto text-base px-8 py-4">
                ◆ {t("registrazione.modalSi")}
              </HudButton>
            </Link>
            <Link to="/">
              <HudButton variant="ghost" className="w-full sm:w-auto px-8 py-4">
                ▸ {t("registrazione.modalNo")}
              </HudButton>
            </Link>
          </div>
        </div>
      </div>
    )}

    <PageShell code="// AUTH/REGISTER.form" title={t("registrazione.pageTitle")} subtitle={t("registrazione.pageSubtitle")}>
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <HudPanel label="dati_principali" code="REQ ★">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            <div className="grid sm:grid-cols-2 gap-5">
              <HudField label={t("registrazione.fNome")} error={errors.nome?.message}>
                <input {...register("nome")} placeholder={t("registrazione.phNome")} className={inputClass} />
              </HudField>
              <HudField label={t("registrazione.fCognome")} error={errors.cognome?.message}>
                <input {...register("cognome")} placeholder={t("registrazione.phCognome")} className={inputClass} />
              </HudField>
            </div>

            <div className="border border-cyan/20 bg-cyan/5 p-5 space-y-5">
              <div className="font-mono text-[10px] tracking-[0.3em] text-cyan uppercase">// conferma_credenziali</div>
              <div className="grid sm:grid-cols-2 gap-5">
                <HudField label={t("registrazione.fEmail")} error={errors.email?.message}>
                  <input {...register("email")} type="email" placeholder={t("registrazione.phEmail")} className={inputClass} />
                </HudField>
                <HudField label={t("registrazione.fEmailConferma")} error={errors.email_conferma?.message}>
                  <input {...register("email_conferma")} type="email" placeholder={t("registrazione.phEmailConferma")} className={inputClass} />
                </HudField>
                <HudField label={t("registrazione.fPassword")} error={errors.password?.message}>
                  <input {...register("password")} type="password" placeholder={t("registrazione.phPassword")} className={inputClass} />
                </HudField>
                <HudField label={t("registrazione.fPasswordConferma")} error={errors.password_conferma?.message}>
                  <input {...register("password_conferma")} type="password" placeholder={t("registrazione.phPasswordConferma")} className={inputClass} />
                </HudField>
              </div>
            </div>

            <details className="group">
              <summary className="font-mono tracking-[0.25em] text-[10px] text-magenta uppercase cursor-pointer hover:text-cyan transition-colors">
                ▸ {t("registrazione.campiOpzionali")}
              </summary>
              <div className="mt-4 grid sm:grid-cols-2 gap-5">
                <HudField label={t("registrazione.fTelefono")}>
                  <input {...register("telefono")} placeholder="+39 ..." className={inputClass} />
                </HudField>
                <HudField label={t("registrazione.fPseudonimo")}>
                  <input {...register("pseudonimo")} placeholder={t("registrazione.phPseudonimo")} className={inputClass} />
                </HudField>
                <HudField label={t("registrazione.fDataNascita")}>
                  <input {...register("data_nascita")} type="date" className={inputClass} />
                </HudField>
                <div className="sm:col-span-2">
                  <HudField label={t("registrazione.fIndirizzo")}>
                    <input {...register("indirizzo")} placeholder={t("registrazione.phIndirizzo")} className={inputClass} />
                  </HudField>
                </div>
                <div className="sm:col-span-2">
                  <HudField label={t("registrazione.fAvatar")} error={errors.avatar_url?.message}>
                    <input {...register("avatar_url")} placeholder="https://..." className={inputClass} />
                  </HudField>
                </div>
              </div>
            </details>

            {serverError && (
              <p className="font-mono text-[11px] text-magenta border border-magenta/30 bg-magenta/5 px-4 py-3">
                ⚠ {serverError}
              </p>
            )}

            <div className="flex flex-wrap gap-3 items-center pt-2">
              <HudButton type="submit" variant="primary" disabled={loading}>
                {loading ? `▸ ${t("registrazione.invioLoading")}` : `▸ ${t("registrazione.invioBtn")}`}
              </HudButton>
              <Link to="/auth" className="font-mono text-[10px] tracking-widest uppercase text-bone/60 hover:text-cyan transition-colors">
                {t("registrazione.annulla")}
              </Link>
            </div>
          </form>
        </HudPanel>

        <HudPanel label="vuoi pubblicare?" tone="magenta">
          <h3 className="font-display text-xl text-bone tracking-tight">{t("registrazione.panelAutoreTitle")}</h3>
          <p className="mt-3 font-serif italic text-bone/70">
            {t("registrazione.panelAutoreDesc")}
          </p>
          <Link to="/auth/profilo-autore" className="mt-5 inline-block">
            <HudButton variant="magenta">◆ {t("registrazione.panelAutoreBtn")}</HudButton>
          </Link>
          <div className="hud-divider my-6" />
          <p className="font-mono text-[10px] tracking-widest text-bone/40 uppercase">
            {t("registrazione.emailConfermaNote")}
          </p>
        </HudPanel>
      </div>
    </PageShell>
    </>
  );
}

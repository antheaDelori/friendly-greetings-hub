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
  const { t, i18n } = useTranslation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [emailInviata, setEmailInviata] = useState<string | null>(null);
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
            lingua: i18n.language ?? "it",
          },
        },
      }), timeout]);
      if (result.error) {
        setServerError(result.error.message);
        return;
      }
      setEmailInviata(data.email);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Errore di connessione. Riprova.";
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (emailInviata) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/90 backdrop-blur-sm scanlines px-4">
        <div className="glass hud-frame max-w-lg w-full p-10 text-center fade-up">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px w-32 h-px bg-gradient-to-r from-transparent via-cyan/80 to-transparent" />
          <div className="font-mono text-[10px] tracking-[0.35em] text-cyan uppercase mb-6">
            // trasmissione_inviata · 2076
          </div>
          <div className="font-display text-4xl md:text-5xl text-bone leading-tight tracking-tight">
            Controlla<br />
            <span className="text-cyan text-glow-cyan">la tua email.</span>
          </div>
          <p className="mt-6 font-serif italic text-lg text-bone/70 leading-relaxed">
            Abbiamo inviato un link di conferma a<br />
            <span className="text-bone not-italic font-mono text-sm tracking-widest">{emailInviata}</span>
          </p>
          <p className="mt-4 font-serif italic text-base text-bone/50 leading-relaxed">
            Clicca il link per attivare il tuo account e iniziare a leggere. Il link è valido per 24 ore.
          </p>
          <div className="mt-8 border-t border-cyan/10 pt-6 space-y-2">
            <p className="font-mono text-[10px] tracking-widest text-bone/40 uppercase">
              Non trovi l'email? Cerca nello spam:
            </p>
            <p className="font-mono text-[11px] text-cyan/70 border border-cyan/20 bg-cyan/5 px-4 py-2 inline-block">
              liberiamo2076.com — Attiva il tuo account
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageShell code="// AUTH/REGISTER.form" title={t("registrazione.pageTitle")} subtitle={t("registrazione.pageSubtitle")}>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">

          <HudPanel label="dati_principali" code="REQ ★">
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
            </div>
          </HudPanel>

          <HudPanel label="campi_facoltativi" tone="magenta">
            <p className="font-serif italic text-bone/70 text-sm">
              {t("registrazione.panelOpzionaliDesc", "Arricchisci il tuo profilo. Puoi completare o modificare questi dati in qualsiasi momento.")}
            </p>
            <div className="mt-5 space-y-4">
              <HudField label={t("registrazione.fPseudonimo")}>
                <input {...register("pseudonimo")} placeholder={t("registrazione.phPseudonimo")} className={inputClass} />
              </HudField>
              <HudField label={t("registrazione.fTelefono")}>
                <input {...register("telefono")} placeholder="+39 ..." className={inputClass} />
              </HudField>
              <HudField label={t("registrazione.fDataNascita")}>
                <input {...register("data_nascita")} type="date" className={inputClass} />
              </HudField>
              <HudField label={t("registrazione.fIndirizzo")}>
                <input {...register("indirizzo")} placeholder={t("registrazione.phIndirizzo")} className={inputClass} />
              </HudField>
              <HudField label={t("registrazione.fAvatar")} error={errors.avatar_url?.message}>
                <input {...register("avatar_url")} placeholder="https://..." className={inputClass} />
              </HudField>
            </div>
            <div className="hud-divider my-5" />
            <p className="font-mono text-[10px] tracking-widest text-bone/40 uppercase">
              {t("registrazione.emailConfermaNote")}
            </p>
          </HudPanel>

        </div>
      </form>
    </PageShell>
  );
}

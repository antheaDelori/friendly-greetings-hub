import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
  const [serverError, setServerError] = useState<string | null>(null);
  const [showAuthorModal, setShowAuthorModal] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    const { error } = await supabase.auth.signUp({
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
    });

    if (error) {
      setServerError(error.message);
      return;
    }

    setShowAuthorModal(true);
  };

  return (
    <>
    {/* Modal autore */}
    {showAuthorModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        {/* overlay scuro */}
        <div className="absolute inset-0 bg-void/80 backdrop-blur-sm" />

        {/* pannello */}
        <div className="relative glass hud-frame max-w-lg w-full p-10 text-center">
          {/* angoli decorativi extra */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-px w-32 h-px bg-gradient-to-r from-transparent via-cyan/80 to-transparent" />

          <div className="font-mono text-[10px] tracking-[0.35em] text-cyan uppercase mb-6">
            // trasmissione_in_arrivo · 2076
          </div>

          <div className="font-display text-4xl md:text-5xl text-bone leading-tight tracking-tight">
            Nel 2076 tutti<br />
            <span className="text-magenta text-glow-magenta">vogliono scrivere.</span>
          </div>

          <p className="mt-6 font-serif italic text-xl text-bone/75 leading-relaxed">
            Che ne pensi di configurare anche un profilo autore?<br />
            <span className="text-cyan not-italic font-mono text-sm tracking-widest">Puoi sempre farlo dopo.</span>
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth/profilo-autore">
              <HudButton variant="magenta" className="w-full sm:w-auto text-base px-8 py-4">
                ◆ Sì, voglio essere autore
              </HudButton>
            </Link>
            <Link to="/">
              <HudButton variant="ghost" className="w-full sm:w-auto px-8 py-4">
                ▸ No, solo lettore
              </HudButton>
            </Link>
          </div>
        </div>
      </div>
    )}

    <PageShell code="// AUTH/REGISTER.form" title="Nuovo terminale" subtitle="Tre passi e sei dentro. I campi obbligatori sono in cyan.">
      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <HudPanel label="dati_principali" code="REQ ★">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Dati anagrafici */}
            <div className="grid sm:grid-cols-2 gap-5">
              <HudField label="Nome ★" error={errors.nome?.message}>
                <input {...register("nome")} placeholder="Es. Anthea" className={inputClass} />
              </HudField>
              <HudField label="Cognome ★" error={errors.cognome?.message}>
                <input {...register("cognome")} placeholder="Es. De Lori" className={inputClass} />
              </HudField>
            </div>

            {/* Sezione conferma credenziali */}
            <div className="border border-cyan/20 bg-cyan/5 p-5 space-y-5">
              <div className="font-mono text-[10px] tracking-[0.3em] text-cyan uppercase">// conferma_credenziali</div>
              <div className="grid sm:grid-cols-2 gap-5">
                <HudField label="E-mail ★" error={errors.email?.message}>
                  <input {...register("email")} type="email" placeholder="tu@dominio.it" className={inputClass} />
                </HudField>
                <HudField label="Conferma e-mail ★" error={errors.email_conferma?.message}>
                  <input {...register("email_conferma")} type="email" placeholder="ripeti l'email" className={inputClass} />
                </HudField>
                <HudField label="Password ★" error={errors.password?.message}>
                  <input {...register("password")} type="password" placeholder="min. 8 caratteri" className={inputClass} />
                </HudField>
                <HudField label="Conferma password ★" error={errors.password_conferma?.message}>
                  <input {...register("password_conferma")} type="password" placeholder="ripeti la password" className={inputClass} />
                </HudField>
              </div>
            </div>

            <details className="group">
              <summary className="font-mono tracking-[0.25em] text-[10px] text-magenta uppercase cursor-pointer hover:text-cyan transition-colors">
                ▸ campi facoltativi
              </summary>
              <div className="mt-4 grid sm:grid-cols-2 gap-5">
                <HudField label="Telefono">
                  <input {...register("telefono")} placeholder="+39 ..." className={inputClass} />
                </HudField>
                <HudField label="Nome d'arte / Pseudonimo">
                  <input {...register("pseudonimo")} placeholder="Es. AntheaDelori" className={inputClass} />
                </HudField>
                <HudField label="Data di nascita">
                  <input {...register("data_nascita")} type="date" className={inputClass} />
                </HudField>
                <div className="sm:col-span-2">
                  <HudField label="Indirizzo">
                    <input {...register("indirizzo")} placeholder="Via, città, CAP" className={inputClass} />
                  </HudField>
                </div>
                <div className="sm:col-span-2">
                  <HudField label="Avatar (URL immagine profilo)" error={errors.avatar_url?.message}>
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
              <HudButton type="submit" variant="primary" disabled={isSubmitting}>
                {isSubmitting ? "▸ Invio in corso..." : "▸ Conferma registrazione"}
              </HudButton>
              <Link to="/auth" className="font-mono text-[10px] tracking-widest uppercase text-bone/60 hover:text-cyan transition-colors">
                annulla
              </Link>
            </div>
          </form>
        </HudPanel>

        <HudPanel label="vuoi pubblicare?" tone="magenta">
          <h3 className="font-display text-xl text-bone tracking-tight">Sei anche autore?</h3>
          <p className="mt-3 font-serif italic text-bone/70">
            Configura il tuo profilo autore: bio, generi di pubblicazione, area riservata.
          </p>
          <Link to="/auth/profilo-autore" className="mt-5 inline-block">
            <HudButton variant="magenta">◆ Configura profilo autore</HudButton>
          </Link>
          <div className="hud-divider my-6" />
          <p className="font-mono text-[10px] tracking-widest text-bone/40 uppercase">
            ⚠ La conferma via email arriva entro 60 secondi.
          </p>
        </HudPanel>
      </div>
    </PageShell>
    </>
  );
}

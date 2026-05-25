import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/profilo-autore")({
  head: () => ({
    meta: [
      { title: "Profilo autore — Liberiamo la mente" },
      { name: "description", content: "Crea il tuo profilo autore: bio, generi pubblicati, accesso all'area riservata." },
    ],
  }),
  component: ProfiloAutorePage,
});

const GENERI_VALUES = ["libro", "racconto", "saggio", "articolo", "novelle", "poesia"] as const;

function ProfiloAutorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [generi, setGeneri] = useState<string[]>([]);
  const [donationUrl, setDonationUrl] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      setUserId(data.user.id);
      supabase
        .from("author_profiles")
        .select("bio, generi, donation_url")
        .eq("id", data.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          if (profile) {
            setBio(profile.bio ?? "");
            setGeneri(profile.generi ?? []);
            setDonationUrl(profile.donation_url ?? "");
          }
          setLoading(false);
        });
    });
  }, []);

  const toggleGenere = (g: string) =>
    setGeneri((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error } = await supabase
      .from("author_profiles")
      .upsert({ id: userId, bio, generi, donation_url: donationUrl || null }, { onConflict: "id" });

    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      setSaved(true);
    }
  };

  if (loading) {
    return (
      <PageShell code="// AUTH/AUTHOR_PROFILE" title={t("profiloAutore.pageTitle")} subtitle="">
        <p className="font-mono text-cyan text-sm animate-pulse">▸ {t("profiloAutore.caricamento")}</p>
      </PageShell>
    );
  }

  return (
    <PageShell code="// AUTH/AUTHOR_PROFILE" title={t("profiloAutore.pageTitle")} subtitle={t("profiloAutore.pageSubtitle")}>
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">

        {/* Avatar plate */}
        <HudPanel label="avatar" tone="cyan" className="flex flex-col items-center text-center">
          <div className="relative w-44 h-44 hud-frame">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan/30 to-magenta/20" />
            <div className="absolute inset-0 flex items-center justify-center font-display text-6xl text-bone/60">
              ◊
            </div>
          </div>
          <p className="mt-4 font-mono text-[10px] tracking-widest text-bone/40 uppercase">
            {t("profiloAutore.uploadFoto")}
          </p>
        </HudPanel>

        <div className="space-y-6">
          {/* Biografia */}
          <HudPanel label="biografia">
            <h3 className="font-display text-xl text-bone tracking-tight">{t("profiloAutore.bioTitle")}</h3>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("profiloAutore.bioPlaceholder")}
              className="mt-4 w-full min-h-32 bg-void/40 border border-cyan/30 px-4 py-3 font-serif text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all"
            />
          </HudPanel>

          {/* Generi */}
          <HudPanel label="generi di pubblicazione" tone="magenta">
            <p className="font-serif italic text-bone/70">{t("profiloAutore.generiDesc")}</p>
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GENERI_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleGenere(value)}
                  className={`border px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-center transition-all ${
                    generi.includes(value)
                      ? "border-magenta bg-magenta/15 text-magenta"
                      : "border-cyan/30 text-bone/70 hover:border-cyan"
                  }`}
                >
                  ◆ {t(`generiTag.${value}`, value)}
                </button>
              ))}
            </div>
          </HudPanel>

          {/* Link donazione */}
          <HudPanel label="sostieni — link donazione" tone="cyan">
            <p className="font-serif italic text-bone/70">
              Incolla il link del tuo PayPal, Stripe, Ko-fi o qualsiasi altro metodo di pagamento.
              Apparirà come pulsante ♥ nella pagina di lettura dei tuoi libri.
            </p>
            <div className="mt-4">
              <span className="font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase">↳ link (opzionale)</span>
              <input
                type="url"
                value={donationUrl}
                onChange={(e) => setDonationUrl(e.target.value)}
                placeholder="https://paypal.me/tuonome"
                className="mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all"
              />
            </div>
          </HudPanel>

          {/* Salva */}
          <HudPanel label="area riservata" tone="amber">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-xl text-bone tracking-tight">{t("profiloAutore.lancioTitle")}</h3>
                <p className="mt-2 font-serif italic text-bone/70">
                  {t("profiloAutore.lancioDesc")}
                </p>
                {error && (
                  <p className="mt-2 font-mono text-[11px] text-magenta">⚠ {error}</p>
                )}
                {saved && (
                  <p className="mt-2 font-mono text-[11px] text-cyan">{t("profiloAutore.profiloSalvato")}</p>
                )}
              </div>
              <div className="flex gap-3">
                <HudButton variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? `▸ ${t("profiloAutore.salvaLoading")}` : `▸ ${t("profiloAutore.salvaBtn")}`}
                </HudButton>
                <Link to="/area-autore">
                  <HudButton variant="magenta">◆ {t("profiloAutore.areaRiservata")}</HudButton>
                </Link>
              </div>
            </div>
          </HudPanel>
        </div>
      </div>
    </PageShell>
  );
}

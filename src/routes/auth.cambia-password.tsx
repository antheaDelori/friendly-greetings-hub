import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { HudPanel, PageShell, HudButton } from "@/components/HudPanel";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth/cambia-password")({
  head: () => ({
    meta: [{ title: "Nuova password — Liberiamo la mente" }],
  }),
  component: CambiaPasswordPage,
});

const inputClass = "mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 transition-all";
const labelClass = "font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase";

function CambiaPasswordPage() {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.replace("/auth"); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", user.id)
        .single();

      if (!profile?.must_change_password) { window.location.replace("/"); return; }
      setChecking(false);
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError(t("authCambiaPassword.errTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("authCambiaPassword.errMismatch"));
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(t("authCambiaPassword.errGeneric"));
        setSaving(false);
        return;
      }
      if (user) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
      }
      window.location.replace("/");
    } catch {
      setError(t("authCambiaPassword.errGeneric"));
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace("/auth");
  };

  if (checking) {
    return (
      <PageShell code="// module/auth" title={t("authCambiaPassword.title")}>
        <p className="font-mono text-cyan text-sm animate-pulse">▸ caricamento...</p>
      </PageShell>
    );
  }

  return (
    <PageShell code="// module/auth" title={t("authCambiaPassword.title")}>
      <div className="max-w-md">
        <HudPanel label="nuova password" tone="magenta" className="border border-magenta/40">
          <p className="font-serif italic text-bone/70">{t("authCambiaPassword.desc")}</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <span className={labelClass}>{t("authCambiaPassword.newPasswordLabel")}</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inputClass}
              />
            </div>
            <div>
              <span className={labelClass}>{t("authCambiaPassword.confirmPasswordLabel")}</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={inputClass}
              />
            </div>
            {error && (
              <p className="font-mono text-[11px] text-magenta border border-magenta/30 bg-magenta/5 px-3 py-2">
                ⚠ {error}
              </p>
            )}
            <HudButton variant="magenta" type="submit" disabled={saving} className="w-full">
              {saving ? `◆ ${t("authCambiaPassword.submitLoading")}` : `◆ ${t("authCambiaPassword.submit")}`}
            </HudButton>
          </form>
          <button onClick={handleLogout} className="mt-6 font-mono text-[10px] tracking-widest text-bone/40 hover:text-bone/70 uppercase transition-colors">
            ▸ esci
          </button>
        </HudPanel>
      </div>
    </PageShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { TesseraLettore } from "@/components/TesseraLettore";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/libreria_/tessera")({
  head: () => ({
    meta: [
      { title: "Tessera lettore — Liberiamo la mente" },
      { name: "description", content: "La tua tessera lettore, stampabile." },
    ],
  }),
  component: TesseraLettorePage,
});

function TesseraLettorePage() {
  const [loading, setLoading] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [numeroTessera, setNumeroTessera] = useState<number | null>(null);
  const [memberSinceLabel, setMemberSinceLabel] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.is_anonymous) { window.location.replace("/auth"); return; }

      setAvatarUrl(user.user_metadata?.avatar_url ?? null);
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("nome, cognome, pseudonimo, created_at, is_blocked, numero_tessera")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName([profile.nome, profile.cognome].filter(Boolean).join(" "));
        setIsBlocked(!!profile.is_blocked);
        setNumeroTessera(profile.numero_tessera ?? null);
        if (profile.created_at) {
          const d = new Date(profile.created_at);
          const dd = String(d.getDate()).padStart(2, "0");
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          setMemberSinceLabel(`${dd} · ${mm} · ${d.getFullYear()}`);
        }
      }

      setLoading(false);
    };
    init();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .tessera-print-area { box-shadow: none !important; }
          .tessera-face { break-inside: avoid; break-after: page; }
          .tessera-face:last-child { break-after: auto; }
          body { background: white !important; }
        }
      `}</style>

      <div className="no-print">
        <SiteHeader />
      </div>

      <section className="mx-auto max-w-3xl w-full px-4 sm:px-6 py-16 flex-1">
        <div className="no-print mb-8">
          <Link
            to="/libreria"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-cyan/70 hover:text-cyan border-b border-cyan/20 hover:border-cyan pb-0.5 transition-all"
          >
            ← Torna alla libreria
          </Link>
        </div>

        {loading ? (
          <p className="font-mono text-cyan text-sm animate-pulse">▸ caricamento...</p>
        ) : (
          <>
            <div className="tessera-print-area">
              <TesseraLettore
                fullName={fullName}
                numeroTessera={numeroTessera}
                isBlocked={isBlocked}
                memberSinceLabel={memberSinceLabel}
                userId={userId}
                avatarUrl={avatarUrl}
              />
            </div>

            <button
              onClick={() => window.print()}
              className="no-print mt-6 w-full border border-magenta/60 bg-magenta/10 px-4 py-3 font-mono text-[11px] uppercase tracking-widest text-magenta hover:bg-magenta hover:text-void transition-all"
            >
              ▸ Stampa tessera
            </button>
          </>
        )}
      </section>

      <div className="no-print">
        <SiteFooter />
      </div>
    </div>
  );
}

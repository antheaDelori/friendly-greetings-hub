import { Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import logo from "@/assets/logo-liberiamo.jpg";
import { getCestinoTranslation } from "@/lib/cestinoI18n";

export function SiteFooter() {
  const { t } = useTranslation();
  const [cestinoTooltip, setCestinoTooltip] = useState<string | null>(null);
  useEffect(() => { setCestinoTooltip(getCestinoTranslation()); }, []);
  return (
    <footer className="relative border-t border-cyan/15 bg-deep/40 backdrop-blur-xl mt-24 scanlines">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-12 w-12 object-cover ring-1 ring-cyan/40" />
            <div>
              <div className="font-display text-2xl tracking-[0.16em] text-bone">
                LIB<span className="text-magenta text-glow-magenta">e</span>RIAMO LA MENTE
              </div>
              <div className="font-mono text-[10px] tracking-[0.25em] text-cyan/60 mt-1 uppercase">
                holographic library · est 2076
              </div>
            </div>
          </div>
          <p className="mt-6 max-w-md font-serif text-bone/70 text-lg leading-relaxed">
            {t("footer.descrizione")}
          </p>
        </div>
        <div>
          <div className="font-mono tracking-[0.2em] text-[10px] text-cyan/70 mb-4 uppercase">// {t("footer.esplora")}</div>
          <ul className="space-y-2 font-mono text-xs uppercase tracking-wider">
            <li><Link to="/" className="text-bone/70 hover:text-cyan transition-colors">▸ {t("nav.home")}</Link></li>
            <li><Link to="/catalogo" className="text-bone/70 hover:text-cyan transition-colors">▸ {t("nav.catalogo")}</Link></li>
            <li><Link to="/autori" className="text-bone/70 hover:text-cyan transition-colors">▸ {t("nav.autori")}</Link></li>
            <li><Link to="/community" className="text-bone/70 hover:text-cyan transition-colors">▸ {t("nav.community")}</Link></li>
            <li><Link to="/regolamento" className="text-bone/70 hover:text-cyan transition-colors">▸ {t("nav.regole")}</Link></li>
            <li><Link to="/privacy" className="text-bone/70 hover:text-cyan transition-colors">▸ Privacy Policy</Link></li>
            <li><Link to="/donazioni" className="text-bone/70 hover:text-cyan transition-colors">▸ {t("nav.sostieni")}</Link></li>
            <li>
              <div className="group relative inline-block">
                <Link to="/cestino" className="text-magenta/60 hover:text-magenta transition-colors">⊗ Cestino degli Scritti Perduti</Link>
                {cestinoTooltip && (
                  <span className="pointer-events-none absolute bottom-full left-0 mb-1 font-mono text-[11px] tracking-widest uppercase text-cyan text-glow-cyan whitespace-nowrap opacity-0 scale-0 origin-bottom-left group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                    {cestinoTooltip}
                  </span>
                )}
              </div>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-mono tracking-[0.2em] text-[10px] text-cyan/70 mb-4 uppercase">// {t("footer.contatti")}</div>
          <ul className="space-y-2 font-mono text-xs text-bone/70">
            <li>OP. Daniele Girtanner</li>
            <li>uplink — <span className="text-cyan">@liberiamo</span></li>
            <li className="font-display tracking-[0.25em] text-magenta text-glow-magenta mt-4 text-sm">
              READ OR PERISH
            </li>
            <li className="font-mono text-[9px] tracking-widest text-bone/30 mt-1 uppercase">
              biblioteca digitale · rete olografica · anno 2076
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cyan/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-bone/40 font-mono tracking-widest uppercase">
          <span>{t("footer.copyright")}</span>
          <span className="text-cyan/60">{t("footer.tagline")}</span>
        </div>
      </div>
    </footer>
  );
}

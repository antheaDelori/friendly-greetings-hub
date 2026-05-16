import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo-liberiamo.jpg";

export function SiteFooter() {
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
            Una piattaforma indipendente per chi scrive e per chi legge davvero.
            Niente algoritmi che urlano. Solo libri, racconti, saggi, articoli — sospesi nel vetro,
            tenuti in vita da chi li sceglie.
          </p>
        </div>
        <div>
          <div className="font-mono tracking-[0.2em] text-[10px] text-cyan/70 mb-4 uppercase">// esplora</div>
          <ul className="space-y-2 font-mono text-xs uppercase tracking-wider">
            <li><Link to="/" className="text-bone/70 hover:text-cyan transition-colors">▸ Home</Link></li>
            <li><Link to="/catalogo" className="text-bone/70 hover:text-cyan transition-colors">▸ Catalogo</Link></li>
            <li><Link to="/community" className="text-bone/70 hover:text-cyan transition-colors">▸ Community</Link></li>
            <li><Link to="/regolamento" className="text-bone/70 hover:text-cyan transition-colors">▸ Regolamento</Link></li>
            <li><Link to="/donazioni" className="text-bone/70 hover:text-cyan transition-colors">▸ Sostieni</Link></li>
            <li><Link to="/cestino" className="text-magenta/60 hover:text-magenta transition-colors">⊗ Cestino degli Scritti Perduti</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-mono tracking-[0.2em] text-[10px] text-cyan/70 mb-4 uppercase">// contatti</div>
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
          <span>© 2076 liberiamo.holo // tutti i diritti agli autori</span>
          <span className="text-cyan/60">il mondo dei creativi</span>
        </div>
      </div>
    </footer>
  );
}

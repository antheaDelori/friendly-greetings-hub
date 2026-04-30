import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo-liberiamo.jpg";

export function SiteFooter() {
  return (
    <footer className="ink-texture text-paper mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-16 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-12 w-12 rounded-full ring-1 ring-paper/30" />
            <div className="font-display text-2xl tracking-[0.18em]">
              LIB<span className="text-blood">e</span>RIAMO LA MENTE
            </div>
          </div>
          <p className="mt-6 max-w-md font-serif text-paper/75 text-lg leading-relaxed">
            Una piattaforma indipendente per chi scrive e per chi legge davvero.
            Niente algoritmi che urlano. Solo libri, racconti, saggi, articoli — e
            persone che ne discutono.
          </p>
        </div>
        <div>
          <div className="font-display tracking-widest text-xs text-gold mb-4">Esplora</div>
          <ul className="space-y-2 font-sans text-sm">
            <li><Link to="/" className="hover:text-blood transition-colors">Home</Link></li>
            <li><Link to="/catalogo" className="hover:text-blood transition-colors">Catalogo</Link></li>
            <li><a href="#community" className="hover:text-blood transition-colors">Community</a></li>
            <li><a href="#regolamento" className="hover:text-blood transition-colors">Regolamento</a></li>
          </ul>
        </div>
        <div>
          <div className="font-display tracking-widest text-xs text-gold mb-4">Contatti</div>
          <ul className="space-y-2 font-sans text-sm text-paper/80">
            <li>Daniele Girtanner</li>
            <li>via — tel — email</li>
            <li className="font-display tracking-widest text-blood mt-4">READ OR PERISH</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-paper/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-paper/50 font-sans">
          <span>© {new Date().getFullYear()} Liberiamo la mente. Tutti i diritti agli autori.</span>
          <span className="font-display tracking-widest">il mondo dei creativi</span>
        </div>
      </div>
    </footer>
  );
}

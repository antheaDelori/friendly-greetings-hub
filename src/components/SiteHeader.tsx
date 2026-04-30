import { Link } from "@tanstack/react-router";
import logo from "@/assets/logo-liberiamo.jpg";

export function SiteHeader() {
  const linkBase =
    "text-sm font-display tracking-widest uppercase transition-colors hover:text-blood";

  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 bg-paper/85 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-10">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src={logo}
            alt="Liberiamo la mente"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-ink/20 transition-transform group-hover:rotate-6"
          />
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-display text-lg tracking-[0.18em] text-ink">
              LIB<span className="text-blood">e</span>RIAMO
            </span>
            <span className="font-serif italic text-[11px] text-ink/60">
              il mondo dei creativi
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className={linkBase} activeProps={{ className: "text-blood" }} activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/catalogo" className={linkBase} activeProps={{ className: "text-blood" }}>
            Catalogo
          </Link>
          <a href="#community" className={linkBase}>
            Community
          </a>
          <a href="#regolamento" className={linkBase}>
            Regolamento
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hidden sm:inline-flex font-display tracking-widest text-xs uppercase text-ink/70 hover:text-ink transition-colors"
          >
            Accedi
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-ink px-4 py-2 font-display text-xs uppercase tracking-widest text-paper hover:bg-blood transition-colors"
          >
            Registrati
          </button>
        </div>
      </div>
    </header>
  );
}

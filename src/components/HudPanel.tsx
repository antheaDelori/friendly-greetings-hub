import { ReactNode } from "react";

export function HudPanel({
  label,
  code,
  children,
  className = "",
  tone = "cyan",
}: {
  label?: string;
  code?: string;
  children: ReactNode;
  className?: string;
  tone?: "cyan" | "magenta" | "amber";
}) {
  const toneColor = tone === "magenta" ? "text-magenta" : tone === "amber" ? "text-amber" : "text-cyan";
  const cornerColor = tone === "magenta" ? "border-magenta/70" : tone === "amber" ? "border-amber/70" : "border-cyan/70";
  const lineColor = tone === "magenta" ? "via-magenta/60" : tone === "amber" ? "via-amber/60" : "via-cyan/60";
  return (
    <section className={`relative glass p-6 md:p-8 ${className}`}>
      <span className={`absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent ${lineColor} to-transparent`} />
      <span className={`absolute top-2 left-2 w-3 h-3 border-l border-t ${cornerColor}`} />
      <span className={`absolute top-2 right-2 w-3 h-3 border-r border-t ${cornerColor}`} />
      <span className={`absolute bottom-2 left-2 w-3 h-3 border-l border-b ${cornerColor}`} />
      <span className={`absolute bottom-2 right-2 w-3 h-3 border-r border-b ${cornerColor}`} />
      {(label || code) && (
        <div className="flex items-center justify-between mb-5 font-mono text-[10px] tracking-[0.25em] uppercase">
          <span className={toneColor}>{label && `// ${label}`}</span>
          {code && <span className="text-bone/40">{code}</span>}
        </div>
      )}
      {children}
    </section>
  );
}

export function PageShell({
  title,
  subtitle,
  code,
  children,
  note,
}: {
  title: string;
  subtitle?: string;
  code?: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-10 py-12 flex-1">
      <div className="mb-10 flex items-end justify-between gap-6 flex-wrap">
        <div>
          <div className="font-mono text-[10px] tracking-[0.3em] text-cyan/70 uppercase">
            {code || "// MODULE"}
          </div>
          <h1 className="mt-3 font-display text-5xl md:text-6xl text-bone tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 font-serif text-xl text-bone/65 max-w-2xl italic">{subtitle}</p>
          )}
          {note && <div className="mt-4">{note}</div>}
        </div>
        <div className="font-mono text-[10px] text-cyan/50 tracking-widest hidden md:block">
          <div>SESSION:LIVE</div>
          <div>LAT: 41.9028 / LONG: 12.4964</div>
          <div className="text-magenta">▸ HOLO INTERFACE READY</div>
        </div>
      </div>
      <div className="hud-divider mb-10" />
      {children}
    </main>
  );
}

export function HudInput({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] tracking-[0.25em] text-cyan/70 uppercase">
        ↳ {label}
      </span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="mt-2 w-full bg-void/40 border border-cyan/30 px-4 py-3 font-mono text-bone placeholder:text-bone/30 focus:outline-none focus:border-cyan focus:bg-void/60 focus:glow-cyan transition-all"
      />
    </label>
  );
}

export function HudButton({
  children,
  variant = "primary",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "magenta" }) {
  const styles =
    variant === "primary"
      ? "border-cyan/70 bg-cyan/15 text-cyan hover:bg-cyan hover:text-void hover:glow-cyan"
      : variant === "magenta"
        ? "border-magenta/70 bg-magenta/15 text-magenta hover:bg-magenta hover:text-void hover:glow-magenta"
        : "border-bone/30 text-bone/80 hover:border-bone hover:text-bone";
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 border px-5 py-3 font-mono text-[11px] uppercase tracking-[0.22em] transition-all ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

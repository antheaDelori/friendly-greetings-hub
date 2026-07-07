interface TesseraAutoreProps {
  fullName: string;
  pseudonimo?: string | null;
  numeroTessera?: number | null;
  avatarUrl?: string | null;
  memberSinceLabel?: string | null;
  className?: string;
}

export function TesseraAutore({
  fullName, pseudonimo, numeroTessera, avatarUrl, memberSinceLabel, className = "",
}: TesseraAutoreProps) {
  return (
    <div className={`relative glass hud-frame p-7 overflow-hidden ${className}`}>
      <div className="absolute inset-0 scanlines pointer-events-none opacity-30" />
      <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-cyan/10 blur-3xl pointer-events-none" />

      <div className="relative flex items-center justify-between mb-6">
        <div>
          <div className="font-mono text-[9px] tracking-[0.35em] text-cyan/70 uppercase">// tessera autore</div>
          <div className="font-display text-lg text-bone tracking-tight mt-1">
            LIB<span className="text-magenta text-glow-magenta">e</span>RIAMO
          </div>
        </div>
        <span className="font-mono text-[9px] tracking-widest uppercase border border-cyan/40 text-cyan/70 px-2 py-1 flex-shrink-0">
          ✓ verificato
        </span>
      </div>

      <div className="relative flex items-center gap-5">
        <div className="relative w-16 h-16 hud-frame flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-cyan/30 to-magenta/20" />
              <div className="absolute inset-0 flex items-center justify-center font-display text-2xl text-bone/60">◊</div>
            </>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-mono text-[9px] tracking-[0.25em] text-bone/40 uppercase">nome e cognome</p>
          <h3 className="font-display text-2xl text-bone tracking-tight leading-tight">{fullName}</h3>
          {pseudonimo && (
            <p className="font-serif italic text-bone/50 text-sm mt-0.5">alias {pseudonimo}</p>
          )}
        </div>
      </div>

      <div className="relative mt-6 pt-4 border-t border-cyan/15 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[9px] tracking-[0.25em] text-bone/40 uppercase">N. tessera</p>
          <p className="font-mono text-xl text-magenta text-glow-magenta tracking-widest">
            {numeroTessera != null ? `LIB-${String(numeroTessera).padStart(6, "0")}` : "—"}
          </p>
        </div>
        {memberSinceLabel && (
          <div className="text-right">
            <p className="font-mono text-[9px] tracking-[0.25em] text-bone/40 uppercase">membro dal</p>
            <p className="font-mono text-xs text-bone/60">{memberSinceLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}

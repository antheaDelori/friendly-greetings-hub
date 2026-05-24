/**
 * LangDetectModal
 *
 * Shown once when the visitor's browser language is not among the 5 supported
 * languages (it / en / fr / de / es).
 *
 * Flow:
 *  1. Visitor sees the modal → picks one of the 5 available languages.
 *  2. The language is applied immediately (i18next + localStorage).
 *  3. Optionally the visitor leaves an email to be notified when their
 *     language is ready. We send a mail to the admin and a confirmation
 *     to the visitor via the generate-cover edge function (action:"langRequest").
 *  4. The modal is permanently dismissed (localStorage flag).
 */

import { useState, useEffect } from "react";
import i18n from "@/lib/i18n";

const SUPPORTED = ["it", "en", "fr", "de", "es"];

const LANGUAGES = [
  { code: "it", flag: "🇮🇹", label: "Italiano" },
  { code: "en", flag: "🇬🇧", label: "English" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "es", flag: "🇪🇸", label: "Español" },
];

/** Use Intl.DisplayNames to get the human-readable name of a language code. */
function getLangName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const DISMISSED_KEY = "lang_modal_dismissed";

export function LangDetectModal() {
  const [show, setShow] = useState(false);
  const [detectedName, setDetectedName] = useState(""); // e.g. "Norwegian"
  const [detectedCode, setDetectedCode] = useState(""); // e.g. "no"

  // Step: "pick" → language chosen, showing email form | "done" → email sent (or skipped)
  const [step, setStep] = useState<"pick" | "notify">("pick");

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    // Already dismissed? Never show again.
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const raw =
      (navigator.language ?? (navigator.languages?.[0] ?? "it"));
    const code = raw.split("-")[0].toLowerCase();

    // Supported language → i18next handles it automatically, no modal needed.
    if (SUPPORTED.includes(code)) return;

    setDetectedCode(code);
    setDetectedName(getLangName(code));
    setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  };

  /** Step 1: visitor picks a language. */
  const handlePick = (langCode: string) => {
    i18n.changeLanguage(langCode); // persists to localStorage via i18next caches config
    setStep("notify");
  };

  /** Step 2: optional email notification. */
  const handleNotify = async () => {
    if (!email.trim()) { dismiss(); return; }
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "langRequest",
            email: email.trim(),
            language: detectedName || detectedCode,
          }),
        },
      );
      if (res.ok) {
        setSent(true);
      } else {
        setSendError("Error sending. Please try again.");
      }
    } catch {
      setSendError("Connection error.");
    } finally {
      setSending(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-void/90 backdrop-blur-md">
      <div className="relative w-full max-w-lg mx-4 glass border border-cyan/30 p-8">
        {/* top accent line */}
        <span className="absolute -top-px left-0 right-0 h-px bg-cyan/60" />

        {/* ── STEP: pick a language ── */}
        {step === "pick" && (
          <>
            <p className="font-mono text-[9px] tracking-[0.28em] text-cyan/50 uppercase mb-3">
              LANG_NOT_AVAILABLE
            </p>
            <h2 className="font-display text-2xl tracking-[0.1em] text-bone mb-1">
              <span className="text-magenta capitalize">{detectedName}</span>
              {" "}is not available yet
            </h2>
            <p className="font-mono text-[10px] tracking-widest text-bone/50 uppercase mb-6">
              We're working on it — choose a language to continue:
            </p>

            <div className="grid grid-cols-5 gap-2 mb-2">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handlePick(lang.code)}
                  className="flex flex-col items-center gap-2 px-2 py-4 border border-cyan/20 hover:border-cyan/70 hover:bg-cyan/5 transition-all group"
                >
                  <span className="text-3xl leading-none">{lang.flag}</span>
                  <span className="font-mono text-[9px] tracking-widest uppercase text-bone/50 group-hover:text-cyan transition-colors">
                    {lang.code.toUpperCase()}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── STEP: email notification (after picking language) ── */}
        {step === "notify" && !sent && (
          <>
            <p className="font-mono text-[9px] tracking-[0.28em] text-cyan/50 uppercase mb-3">
              LANG_COMING_SOON
            </p>
            <h2 className="font-display text-xl tracking-[0.1em] text-bone mb-2">
              <span className="text-cyan capitalize">{detectedName}</span>
              {" "}will be available soon
            </h2>
            <p className="font-mono text-[10px] tracking-widest text-bone/50 uppercase mb-6">
              Leave your email and we'll notify you when it's ready.
              <br />
              <span className="text-bone/30">No email? No problem — just continue.</span>
            </p>

            <div className="flex gap-2 mb-3">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleNotify()}
                className="flex-1 bg-void/60 border border-cyan/20 px-3 py-2.5 font-mono text-[11px] text-bone placeholder:text-bone/25 focus:outline-none focus:border-cyan/60 transition-colors"
              />
              <button
                onClick={handleNotify}
                disabled={sending}
                className="border border-cyan/60 bg-cyan/10 px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest text-cyan hover:bg-cyan hover:text-void transition-all disabled:opacity-40 whitespace-nowrap"
              >
                {sending ? "..." : "Notify me →"}
              </button>
            </div>

            {sendError && (
              <p className="font-mono text-[10px] text-magenta mb-3">{sendError}</p>
            )}

            <button
              onClick={dismiss}
              className="font-mono text-[9px] tracking-widest uppercase text-bone/30 hover:text-bone/60 transition-colors"
            >
              Skip, continue without notification →
            </button>
          </>
        )}

        {/* ── SENT confirmation ── */}
        {sent && (
          <div className="text-center py-6">
            <p className="font-mono text-[9px] tracking-[0.28em] text-cyan/50 uppercase mb-4">
              REQUEST_RECEIVED
            </p>
            <p className="font-serif text-bone text-lg mb-2">
              We'll let you know when{" "}
              <span className="text-cyan capitalize">{detectedName}</span> is ready.
            </p>
            <p className="font-mono text-[10px] tracking-widest text-bone/40 uppercase mb-6">
              Check your inbox for a confirmation email.
            </p>
            <button
              onClick={dismiss}
              className="inline-flex items-center gap-2 border border-cyan/60 bg-cyan/10 px-5 py-2.5 font-mono text-[10px] uppercase tracking-widest text-cyan hover:bg-cyan hover:text-void transition-all"
            >
              ▸ Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

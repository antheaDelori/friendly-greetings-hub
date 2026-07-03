import { supabase } from "./supabase";

let cachedCountry: string | null | undefined = undefined;

async function getCountry(): Promise<string | null> {
  if (cachedCountry !== undefined) return cachedCountry;
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    cachedCountry = data.country_name ?? null;
  } catch {
    cachedCountry = null;
  }
  return cachedCountry ?? null;
}

function getDevice(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone/i.test(ua)) return "mobile";
  return "desktop";
}

export async function trackPageView(path: string) {
  const country = await getCountry();
  await supabase.from("page_views").insert({
    path,
    referrer: document.referrer || null,
    country,
    device: getDevice(),
  });
}

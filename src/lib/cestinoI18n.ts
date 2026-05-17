const TRANSLATIONS: Record<string, string> = {
  en: "The Forgotten Manuscripts",
  de: "Das Archiv der verlorenen Worte",
  fr: "Les Manuscrits Oubliés",
  es: "Los Manuscritos Olvidados",
  da: "De Glemte Manuskripter",
  sv: "De Glömda Manuskripten",
  no: "De Glemte Manuskriptene",
  nl: "De Vergeten Manuscripten",
  pt: "Os Manuscritos Esquecidos",
  pl: "Zapomniane Rękopisy",
};

export function getCestinoTranslation(): string | null {
  if (typeof navigator === "undefined") return null;
  const urlLang = new URLSearchParams(window.location.search).get("lang");
  const lang = (urlLang ?? navigator.language).split("-")[0].toLowerCase();
  if (lang === "it") return null;
  return TRANSLATIONS[lang] ?? TRANSLATIONS["en"];
}

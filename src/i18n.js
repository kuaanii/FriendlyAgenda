import en from "./locales/en.json" with { type: "json" };
import es from "./locales/es.json" with { type: "json" };
import fr from "./locales/fr.json" with { type: "json" };

export const languages = [
  { code: "en", name: "English", intl: "en-GB" },
  { code: "es", name: "Español", intl: "es-ES" },
  { code: "fr", name: "Français", intl: "fr-FR" },
];
export const catalogues = { en, es, fr };
export const validLocale = (locale) => Object.hasOwn(catalogues, locale);
export function translate(locale, key, values = {}) {
  const message = (catalogues[locale] || en)[key] ?? en[key] ?? key;
  return message.replace(/\{(\w+)\}/g, (token, name) =>
    Object.hasOwn(values, name) ? String(values[name]) : token,
  );
}
export function formatDate(locale, date, options) {
  const intl =
    languages.find((language) => language.code === locale)?.intl || "en-GB";
  return new Intl.DateTimeFormat(intl, options).format(
    new Date(`${date}T12:00:00`),
  );
}
export function errorMessage(locale, error, fallback = "operationError") {
  const message = typeof error === "string" ? error : error?.message || "";
  // Electron prefixes IPC errors. Only show known application messages; OS errors can contain personal paths.
  const key = Object.keys(en).find(
    (key) => message === key || message.endsWith(`Error: ${key}`),
  );
  return translate(locale, key || fallback);
}

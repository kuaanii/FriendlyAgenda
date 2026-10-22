import { createContext, useContext, useEffect, useState } from "react";
import { translate, formatDate, languages } from "./i18n.js";

const Context = createContext(null);
export function I18nProvider({ children }) {
  const [locale, setLocale] = useState("en");
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const dateLabel = (date, options) => formatDate(locale, date, options);
  return (
    <Context.Provider
      value={{
        locale,
        setLocale,
        t: (key, values) => translate(locale, key, values),
        dateLabel,
        shortDate: (date) =>
          dateLabel(date, { day: "numeric", month: "short" }).replace(".", ""),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useI18n = () => useContext(Context);
export function LanguagePicker({ onChange }) {
  const { locale, t } = useI18n();
  return (
    <label className="language-picker" title={t("Language")}>
      <span aria-hidden="true">◎</span>
      <select
        aria-label={t("Language")}
        value={locale}
        onChange={(event) => onChange(event.target.value)}
      >
        {languages.map(({ code, name }) => (
          <option key={code} value={code} lang={code}>
            {name}
          </option>
        ))}
      </select>
    </label>
  );
}

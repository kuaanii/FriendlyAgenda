import { useEffect, useState } from "react";
import { Bell, Monitor, Moon, Sun } from "lucide-react";
import { bridge } from "./bridge.js";
import { useI18n } from "./I18n.jsx";

export function useSystemTheme(preference) {
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const change = (e) => setSystemDark(e.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const resolved =
    preference === "system" || !preference
      ? systemDark
        ? "dark"
        : "light"
      : preference;
  useEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);
  return resolved;
}
export function ThemePicker({ value, onChange }) {
  const { t } = useI18n();
  return (
    <section className="preference-section">
      <h3>{t("Apariencia")}</h3>
      <div className="theme-options">
        {[
          ["system", Monitor, "Sistema"],
          ["light", Sun, "Tema claro"],
          ["dark", Moon, "Tema oscuro"],
        ].map(([theme, Icon, label]) => (
          <button
            key={theme}
            className={value === theme ? "selected" : ""}
            aria-pressed={value === theme}
            onClick={() => onChange(theme)}
          >
            <Icon size={17} />
            {t(label)}
          </button>
        ))}
      </div>
    </section>
  );
}
export function NotificationSettings({ value, onChange }) {
  const { t } = useI18n();
  const [status, setStatus] = useState(null),
    [testing, setTesting] = useState(false),
    [tested, setTested] = useState(false);
  const preferences = value || {
    enabled: false,
    background: true,
    allDayTime: "09:00",
  };
  useEffect(() => {
    const refresh = () =>
      bridge
        .notificationsState()
        .then(setStatus)
        .catch(() =>
          setStatus({ supported: false, issue: "notificationsBlocked" }),
        );
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, [value]);
  async function test() {
    setTesting(true);
    setTested(false);
    try {
      setStatus(await bridge.testNotification());
      setTested(true);
    } catch {
      setStatus({ issue: "notificationsBlocked" });
    } finally {
      setTesting(false);
    }
  }
  return (
    <section className="preference-section">
      <h3>
        <Bell size={17} />
        {t("Notificaciones")}
      </h3>
      <label className="check-setting">
        <input
          type="checkbox"
          checked={preferences.enabled}
          disabled={!preferences.enabled && status?.supported === false}
          onChange={(e) =>
            onChange({ ...preferences, enabled: e.target.checked })
          }
        />
        {t("Avisarme de los apuntes pendientes")}
      </label>
      <p className="setting-help">{t("notificationsHelp")}</p>
      {preferences.enabled && (
        <>
          <label className="check-setting">
            <input
              type="checkbox"
              checked={preferences.background}
              onChange={(e) =>
                onChange({ ...preferences, background: e.target.checked })
              }
            />
            {t("Mantener en segundo plano al cerrar")}
          </label>
          <p className="setting-help">{t("backgroundHelp")}</p>
          <label className="time-setting">
            {t("Hora para apuntes de todo el día")}
            <input
              type="time"
              required
              value={preferences.allDayTime}
              onChange={(e) => {
                if (e.target.value)
                  onChange({ ...preferences, allDayTime: e.target.value });
              }}
            />
          </label>
          <button
            className="secondary-button"
            disabled={testing}
            onClick={test}
          >
            <Bell size={15} />
            {t(testing ? "Enviando…" : "Probar notificación")}
          </button>
          {tested && !status?.issue && (
            <p className="setting-help" role="status">
              {t("notificationTestSent")}
            </p>
          )}
        </>
      )}
      {status?.issue && (
        <p className="setting-help" role="status">
          {t(status.issue)}
        </p>
      )}
    </section>
  );
}

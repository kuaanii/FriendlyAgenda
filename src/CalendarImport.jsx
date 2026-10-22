import { useState } from "react";
import { CalendarDays, Check, Upload } from "lucide-react";
import { useI18n } from "./I18n.jsx";
import { bridge } from "./bridge.js";
import { entryTypes } from "./entries.js";
import { errorMessage } from "./i18n.js";

export function CalendarImport({ Modal, onClose, onImport }) {
  const { t, locale } = useI18n();
  const year = new Date().getFullYear();
  const [from, setFrom] = useState(`${year}-01-01`),
    [to, setTo] = useState(`${year + 1}-12-31`),
    [dateFormat, setDateFormat] = useState("dmy"),
    [preview, setPreview] = useState(null),
    [selected, setSelected] = useState(new Set()),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reminders, setReminders] = useState(false);
  async function choose() {
    setBusy(true);
    setError("");
    try {
      const result = await bridge.calendarPreview({ from, to, dateFormat });
      if (result) {
        setPreview(result);
        setSelected(new Set(result.events.map((_, i) => i)));
      }
    } catch (e) {
      setError(errorMessage(locale, e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={t("Importar calendario")} onClose={onClose}>
      {!preview ? (
        <>
          <p className="modal-description">{t("calendarIntro")}</p>
          <div className="calendar-providers">
            <span>Google Calendar</span>
            <span>Outlook</span>
            <span>Apple Calendar</span>
            <span>Yahoo / Proton</span>
          </div>
          <p className="setting-help">{t("calendarFormats")}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              choose();
            }}
          >
            <div className="form-row">
              <label>
                {t("Desde")}
                <input
                  type="date"
                  required
                  min="1900-01-01"
                  max="2200-12-31"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </label>
              <label>
                {t("Hasta")}
                <input
                  type="date"
                  required
                  min={from}
                  max="2200-12-31"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </label>
            </div>
            <label>
              {t("Formato de fechas CSV")}
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
              >
                <option value="dmy">{t("Día / mes / año")}</option>
                <option value="mdy">{t("Mes / día / año")}</option>
              </select>
            </label>
            <p className="setting-help">{t("calendarRangeHelp")}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={onClose}
              >
                {t("Cancelar")}
              </button>
              <button className="primary-button" disabled={busy}>
                <Upload size={16} />
                {t(busy ? "Leyendo calendario…" : "Elegir archivo")}
              </button>
            </div>
          </form>
        </>
      ) : (
        <>
          <p className="modal-description">
            {t("calendarPreview", {
              count: preview.events.length,
              from: preview.from,
              to: preview.to,
            })}
          </p>
          {preview.skipped > 0 && (
            <p className="inline-warning">
              {t("calendarSkipped", { count: preview.skipped })}
            </p>
          )}
          <p className="setting-help">{t("calendarMergeHelp")}</p>
          <label className="check-setting">
            <input
              type="checkbox"
              checked={
                selected.size === preview.events.length && selected.size > 0
              }
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? new Set(preview.events.map((_, i) => i))
                    : new Set(),
                )
              }
            />
            {t("Seleccionar todos")}
          </label>
          <div className="calendar-preview-list">
            {preview.events.map(({ date, entry }, i) => (
              <label key={entry.importKey} className="calendar-preview-row">
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={(e) =>
                    setSelected((previous) => {
                      const next = new Set(previous);
                      e.target.checked ? next.add(i) : next.delete(i);
                      return next;
                    })
                  }
                />
                <CalendarDays size={17} />
                <span>
                  <strong>{entry.title}</strong>
                  <small>
                    {date} · {entry.allDay ? t("Todo el día") : entry.time} ·{" "}
                    {t(entryTypes[entry.type])}
                  </small>
                </span>
              </label>
            ))}
          </div>
          <label className="check-setting">
            <input
              type="checkbox"
              checked={reminders}
              onChange={(e) => setReminders(e.target.checked)}
            />
            {t("Activar recordatorios en los apuntes importados")}
          </label>
          <p className="setting-help">{t("calendarRemindersHelp")}</p>
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => setPreview(null)}
            >
              {t("Volver")}
            </button>
            <button
              className="primary-button"
              disabled={!selected.size}
              onClick={() =>
                onImport(
                  preview.events
                    .filter((_, i) => selected.has(i))
                    .map((item) => ({
                      ...item,
                      entry: { ...item.entry, reminder: reminders ? 0 : null },
                    })),
                )
              }
            >
              <Check size={16} />
              {t("Importar seleccionados", { count: selected.size })}
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

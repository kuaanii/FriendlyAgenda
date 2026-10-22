import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { bridge } from "./bridge.js";
import { useI18n } from "./I18n.jsx";
import { version } from "../package.json";

export function useUpdates() {
  const [result, setResult] = useState(null),
    [prompt, setPrompt] = useState(false),
    [checking, setChecking] = useState(false),
    [error, setError] = useState("");
  const mounted = useRef(true),
    running = useRef(false),
    announced = useRef("");
  async function check(manual = false, periodic = false) {
    if (running.current) return;
    running.current = true;
    setChecking(true);
    setError("");
    try {
      const next = await bridge.checkUpdates();
      if (!mounted.current) return;
      setResult(next);
      if (
        next.status === "available" &&
        (manual || periodic || announced.current !== next.update.version)
      ) {
        announced.current = next.update.version;
        setPrompt(true);
      }
    } catch {
      if (mounted.current) setResult({ status: "unavailable" });
    } finally {
      running.current = false;
      if (mounted.current) setChecking(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    check();
    const interval = setInterval(() => check(false, true), 6 * 60 * 60 * 1000);
    const online = () => check();
    window.addEventListener("online", online);
    return () => {
      mounted.current = false;
      clearInterval(interval);
      window.removeEventListener("online", online);
    };
  }, []);
  async function download() {
    try {
      setError("");
      await bridge.downloadUpdate();
      setPrompt(false);
    } catch {
      setError("No se ha podido abrir la descarga. Vuelve a intentarlo.");
    }
  }
  return {
    result,
    prompt,
    checking,
    error,
    check,
    download,
    dismiss: () => setPrompt(false),
  };
}
export function UpdateSettings({ updates }) {
  const { t } = useI18n();
  const messages = {
    current: "Tienes la última versión estable disponible.",
    unavailable:
      "No se ha podido conectar con GitHub. La agenda sigue disponible sin conexión.",
    "no-release": "Todavía no hay versiones publicadas en GitHub.",
    "no-download":
      "La última versión todavía no ofrece una descarga para Windows.",
    "desktop-only": "Disponible en la aplicación de Windows.",
  };
  return (
    <section className="update-settings">
      <div>
        <strong>{t("Actualizaciones")}</strong>
        <small>{t("Versión instalada: {version}", { version })}</small>
      </div>
      <button
        className="secondary-button"
        disabled={updates.checking}
        onClick={() => updates.check(true)}
      >
        <RefreshCw size={14} />
        {updates.checking ? t("Comprobando…") : t("Buscar actualizaciones")}
      </button>
      <p role="status">
        {updates.result?.status === "available"
          ? t("La versión {version} está disponible.", {
              version: updates.result.update.version,
            })
          : t(
              messages[updates.result?.status] ||
                "Se comprueban al abrir la aplicación y cada seis horas.",
            )}
      </p>
      {updates.result?.status === "available" && (
        <button className="primary-button" onClick={updates.download}>
          <Download size={15} /> {t("Descargar actualización")}
        </button>
      )}
      {updates.error && <p role="alert">{t(updates.error)}</p>}
    </section>
  );
}
export function UpdatePrompt({ updates, Modal }) {
  const { t } = useI18n();
  if (!updates.prompt || updates.result?.status !== "available") return null;
  return (
    <Modal title={t("Hay una nueva versión")} onClose={updates.dismiss}>
      <p className="modal-description">
        {t("updatePrompt", {
          next: updates.result.update.version,
          current: version,
        })}
      </p>
      <p className="modal-description">
        {t(
          "Se abrirá la descarga oficial en tu navegador. Tus datos permanecen en este ordenador.",
        )}
      </p>
      {updates.error && (
        <p className="inline-error" role="alert">
          {t(updates.error)}
        </p>
      )}
      <div className="modal-actions">
        <button className="secondary-button" onClick={updates.dismiss}>
          {t("Ahora no")}
        </button>
        <button className="primary-button" onClick={updates.download}>
          <Download size={16} /> {t("Descargar nueva versión")}
        </button>
      </div>
    </Modal>
  );
}

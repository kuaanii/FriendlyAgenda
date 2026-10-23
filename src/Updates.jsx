import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { bridge } from "./bridge.js";
import { useI18n } from "./I18n.jsx";
import { version } from "../package.json";
import { errorMessage } from "./i18n.js";

export function useUpdates(flush = async () => {}) {
  const [result, setResult] = useState(null),
    [prompt, setPrompt] = useState(false),
    [checking, setChecking] = useState(false),
    [error, setError] = useState(""),
    [installation, setInstallation] = useState({ status: "idle", progress: 0 });
  const mounted = useRef(true),
    running = useRef(false),
    announced = useRef("");
  const installationRef = useRef(installation);
  installationRef.current = installation;
  async function check(manual = false, periodic = false) {
    if (
      ["downloading", "verifying", "ready", "installing"].includes(
        installationRef.current.status,
      )
    )
      return;
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
    const poll = async () => {
      try {
        const next = await bridge.updateState();
        if (mounted.current) {
          setInstallation(next);
          if (next.error) setError(new Error(next.error));
        }
      } catch {}
    };
    poll();
    const progress = setInterval(poll, 1000);
    window.addEventListener("online", online);
    return () => {
      mounted.current = false;
      clearInterval(interval);
      clearInterval(progress);
      window.removeEventListener("online", online);
    };
  }, []);
  async function download() {
    try {
      setError("");
      setInstallation({ status: "downloading", progress: 0 });
      const next = await bridge.downloadUpdate();
      if (next?.status) {
        setInstallation(next);
        setPrompt(true);
      } else {
        setInstallation({ status: "idle", progress: 0 });
        setPrompt(false);
      }
    } catch (error) {
      setInstallation({ status: "error" });
      setError(error);
    }
  }
  async function install() {
    try {
      setError("");
      await flush();
      setInstallation({ status: "installing", progress: 100 });
      await bridge.installUpdate();
    } catch (error) {
      setInstallation({ status: "ready", progress: 100 });
      setError(error);
    }
  }
  return {
    result,
    prompt,
    checking,
    error,
    check,
    download,
    install,
    installation,
    dismiss: () => setPrompt(false),
  };
}
export function UpdateSettings({ updates }) {
  const { t, locale } = useI18n();
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
        disabled={
          updates.checking ||
          ["downloading", "verifying", "ready", "installing"].includes(
            updates.installation.status,
          )
        }
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
        <UpdateAction updates={updates} />
      )}
      {updates.error && (
        <p role="alert">
          {errorMessage(locale, updates.error, "updateDownloadError")}
        </p>
      )}
    </section>
  );
}
export function UpdatePrompt({ updates, Modal }) {
  const { t, locale } = useI18n();
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
          updates.installation.status === "ready"
            ? "updateReady"
            : "updateInPlace",
        )}
      </p>
      {updates.error && (
        <p className="inline-error" role="alert">
          {errorMessage(locale, updates.error, "updateDownloadError")}
        </p>
      )}
      <div className="modal-actions">
        <button className="secondary-button" onClick={updates.dismiss}>
          {t("Ahora no")}
        </button>
        <UpdateAction updates={updates} prompt />
      </div>
    </Modal>
  );
}
function UpdateAction({ updates, prompt = false }) {
  const { t } = useI18n();
  const { status, progress = 0 } = updates.installation;
  const busy = ["downloading", "verifying", "installing"].includes(status);
  return (
    <div>
      {busy && (
        <p role="status">
          {t(
            status === "downloading"
              ? "updateDownloading"
              : status === "verifying"
                ? "updateVerifying"
                : "updateRestarting",
            { progress },
          )}
        </p>
      )}
      {status === "downloading" && (
        <progress aria-label={t("updateProgress")} max="100" value={progress} />
      )}
      <button
        className="primary-button"
        disabled={busy}
        onClick={status === "ready" ? updates.install : updates.download}
      >
        {status === "ready" ? <RefreshCw size={16} /> : <Download size={16} />}
        {t(
          status === "ready"
            ? "updateRestart"
            : prompt
              ? "Descargar nueva versión"
              : "Descargar actualización",
        )}
      </button>
    </div>
  );
}

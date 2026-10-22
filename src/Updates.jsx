import { useEffect, useRef, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { bridge } from "./bridge.js";
import { version } from "../package.json";

export function useUpdates() {
  const [result, setResult] = useState(null),
    [prompt, setPrompt] = useState(false),
    [checking, setChecking] = useState(false),
    [error, setError] = useState("");
  const mounted = useRef(true),
    running = useRef(false),
    announced = useRef({ version: "", time: 0 });
  async function check(manual = false) {
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
        (manual ||
          announced.current.version !== next.update.version ||
          Date.now() - announced.current.time >= 6 * 60 * 60 * 1000)
      ) {
        announced.current = { version: next.update.version, time: Date.now() };
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
    const interval = setInterval(() => check(), 6 * 60 * 60 * 1000);
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
        <strong>Actualizaciones</strong>
        <small>Versión instalada: {version}</small>
      </div>
      <button
        className="secondary-button"
        disabled={updates.checking}
        onClick={() => updates.check(true)}
      >
        <RefreshCw size={14} />
        {updates.checking ? "Comprobando…" : "Buscar actualizaciones"}
      </button>
      <p role="status">
        {updates.result?.status === "available"
          ? `La versión ${updates.result.update.version} está disponible.`
          : messages[updates.result?.status] ||
            "Se comprueban al abrir la aplicación y cada seis horas."}
      </p>
      {updates.result?.status === "available" && (
        <button className="primary-button" onClick={updates.download}>
          <Download size={15} /> Descargar actualización
        </button>
      )}
      {updates.error && <p role="alert">{updates.error}</p>}
    </section>
  );
}
export function UpdatePrompt({ updates, Modal }) {
  if (!updates.prompt || updates.result?.status !== "available") return null;
  return (
    <Modal title="Hay una nueva versión" onClose={updates.dismiss}>
      <p className="modal-description">
        FriendlyAgenda {updates.result.update.version} ya está disponible en
        GitHub. Tienes instalada la versión {version}. ¿Quieres descargar la
        actualización?
      </p>
      <p className="modal-description">
        Se abrirá la descarga oficial en tu navegador. Tus datos permanecen en
        este ordenador.
      </p>
      {updates.error && (
        <p className="inline-error" role="alert">
          {updates.error}
        </p>
      )}
      <div className="modal-actions">
        <button className="secondary-button" onClick={updates.dismiss}>
          Ahora no
        </button>
        <button className="primary-button" onClick={updates.download}>
          <Download size={16} /> Descargar nueva versión
        </button>
      </div>
    </Modal>
  );
}

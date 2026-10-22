import { decodeBackup, emptyAgenda, encodeBackup } from "./model.js";
const key = "friendly-agenda-v1";
export const bridge = window.agenda || {
  async load() {
    const raw = localStorage.getItem(key);
    return { data: raw ? decodeBackup(raw) : emptyAgenda() };
  },
  async save(data) {
    const previous = localStorage.getItem(key);
    if (previous) localStorage.setItem(`${key}-previous`, previous);
    localStorage.setItem(key, encodeBackup(data));
  },
  async exportBackup(data) {
    const url = URL.createObjectURL(
      new Blob([encodeBackup(data)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "FriendlyAgenda.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  },
  async importBackup() {
    return null;
  },
  async checkUpdates() {
    return { status: "desktop-only" };
  },
  async downloadUpdate() {
    throw new Error(
      "Las actualizaciones están disponibles en la aplicación de Windows.",
    );
  },
  async openFolder() {
    throw new Error(
      "La carpeta de datos está disponible en la aplicación de Windows.",
    );
  },
};

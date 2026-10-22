const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
let window;
let storage;
let pendingSaves = new Set();
let closing = false;
let lastSaveError = null;
app.setName("FriendlyAgenda");
if (process.env.FRIENDLY_AGENDA_DATA_DIR)
  app.setPath("userData", path.resolve(process.env.FRIENDLY_AGENDA_DATA_DIR));
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
  });
  app.whenReady().then(async () => {
    const { createStorage } = await import("./storage.mjs");
    const { encodeBackup, decodeBackup } = await import("../src/model.js");
    const { createUpdateChecker } = await import("./updates.mjs");
    const updates = createUpdateChecker({ currentVersion: app.getVersion() });
    ipcMain.handle("agenda:check-updates", () => updates.check());
    ipcMain.handle("agenda:download-update", async () => {
      const url = updates.downloadUrl();
      if (!url)
        throw new Error("Comprueba primero si hay una versión disponible.");
      await shell.openExternal(url);
      return true;
    });
    const folder = path.join(app.getPath("userData"), "data");
    storage = createStorage(folder);
    ipcMain.handle("agenda:load", () => storage.load());
    ipcMain.handle("agenda:save", async (_, data) => {
      const operation = storage.save(data);
      pendingSaves.add(operation);
      try {
        await operation;
        lastSaveError = null;
        return true;
      } catch (error) {
        lastSaveError = error;
        throw error;
      } finally {
        pendingSaves.delete(operation);
      }
    });
    ipcMain.handle("agenda:export", async (_, data) => {
      const text = encodeBackup(data);
      const { canceled, filePath } = await dialog.showSaveDialog(window, {
        defaultPath: `FriendlyAgenda-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: "Copia de FriendlyAgenda", extensions: ["json"] }],
      });
      if (canceled) return false;
      await fs.writeFile(filePath, text, "utf8");
      return true;
    });
    ipcMain.handle("agenda:import", async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        properties: ["openFile"],
        filters: [{ name: "Copia de FriendlyAgenda", extensions: ["json"] }],
      });
      if (canceled) return null;
      if ((await fs.stat(filePaths[0])).size > 20 * 1024 * 1024)
        throw new Error("La copia supera 20 MB.");
      return decodeBackup(await fs.readFile(filePaths[0], "utf8"));
    });
    ipcMain.handle("agenda:folder", async () => {
      await fs.mkdir(folder, { recursive: true });
      const error = await shell.openPath(folder);
      if (error) throw new Error(error);
    });
    window = new BrowserWindow({
      width: 1440,
      height: 960,
      minWidth: 1000,
      minHeight: 720,
      icon: path.join(__dirname, "../build/icon.png"),
      backgroundColor: "#f4f2ed",
      title: "FriendlyAgenda",
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (event) => event.preventDefault());
    window.on("close", (event) => {
      if (closing || (pendingSaves.size === 0 && !lastSaveError)) return;
      event.preventDefault();
      Promise.all([...pendingSaves])
        .then(async () => {
          if (lastSaveError) {
            const { response } = await dialog.showMessageBox(window, {
              type: "warning",
              message: "Hay cambios que no se han podido guardar.",
              detail:
                "Vuelve a la agenda para exportar una copia antes de cerrar.",
              buttons: ["Volver a la agenda", "Cerrar sin guardar"],
              defaultId: 0,
              cancelId: 0,
            });
            if (response !== 1) return;
          }
          closing = true;
          window.close();
        })
        .catch(() => {
          dialog.showMessageBox(window, {
            type: "error",
            message:
              "No se ha podido guardar. La agenda sigue abierta para que puedas exportar una copia.",
          });
        });
    });
    await window.loadFile(path.join(__dirname, "../dist/index.html"));
  });
  app.on("window-all-closed", () => app.quit());
}

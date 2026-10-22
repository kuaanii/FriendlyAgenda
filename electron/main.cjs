const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Menu,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
let window;
let storage;
let notifications;
const { Worker } = require("node:worker_threads");
let pendingSaves = new Set();
let closing = false;
let lastSaveError = null;
let currentLocale = "en";
let createWindow;
let quitRequested = false;
app.on("before-quit", () => {
  quitRequested = true;
});
app.setName("FriendlyAgenda");
if (process.platform === "win32") {
  app.setAppUserModelId("org.friendlyagenda.desktop");
  app.setToastActivatorCLSID("9A96BD12-6D56-4A32-BC4A-E811124BB8F1");
}
if (process.env.FRIENDLY_AGENDA_DATA_DIR)
  app.setPath("userData", path.resolve(process.env.FRIENDLY_AGENDA_DATA_DIR));
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    if (window && !window.isDestroyed()) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    } else createWindow?.();
  });
  app.whenReady().then(async () => {
    const { createStorage } = await import("./storage.mjs");
    const { encodeBackup, decodeBackup } = await import("../src/model.js");
    const { createUpdateChecker } = await import("./updates.mjs");
    const { translate, validLocale } = await import("../src/i18n.js");
    const t = (key) => translate(currentLocale, key);
    function setLocale(locale) {
      const next = validLocale(locale) ? locale : "en";
      if (Menu.getApplicationMenu() && currentLocale === next) return;
      currentLocale = next;
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          ...(process.platform === "darwin"
            ? [
                {
                  label: app.name,
                  submenu: [
                    { role: "about", label: t("About FriendlyAgenda") },
                    { type: "separator" },
                    { role: "services", label: t("Services") },
                    { type: "separator" },
                    { role: "hide", label: t("Hide FriendlyAgenda") },
                    { role: "hideOthers", label: t("Hide others") },
                    { role: "unhide", label: t("Show all") },
                    { type: "separator" },
                    { role: "quit", label: t("Quit FriendlyAgenda") },
                  ],
                },
              ]
            : []),
          {
            label: t("Edit"),
            submenu: [
              { role: "undo", label: t("Undo") },
              { role: "redo", label: t("Redo") },
              { type: "separator" },
              { role: "cut", label: t("Cut") },
              { role: "copy", label: t("Copy") },
              { role: "paste", label: t("Paste") },
              { role: "selectAll", label: t("Select all") },
            ],
          },
          {
            label: t("View"),
            submenu: [
              { role: "resetZoom", label: t("Actual size") },
              { role: "zoomIn", label: t("Zoom in") },
              { role: "zoomOut", label: t("Zoom out") },
              { type: "separator" },
              { role: "togglefullscreen", label: t("Full screen") },
            ],
          },
          {
            label: t("Window"),
            submenu: [
              { role: "minimize", label: t("Minimise") },
              { role: "zoom", label: t("Zoom") },
              { role: "close", label: t("Close window") },
              ...(process.platform === "darwin"
                ? [{ role: "front", label: t("Bring all to front") }]
                : []),
            ],
          },
        ]),
      );
    }
    setLocale("en");
    const updates = createUpdateChecker({
      currentVersion: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
    });
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
    const { createNotifications } = await import("./notifications.mjs");
    notifications = createNotifications({
      folder,
      showWindow: async (date) => {
        if (!window || window.isDestroyed()) await createWindow();
        if (window.isMinimized()) window.restore();
        window.show();
        window.focus();
        if (date) window.webContents.send("agenda:reminder-date", date);
      },
    });
    ipcMain.handle("agenda:notifications-state", () => notifications.state());
    ipcMain.handle("agenda:notifications-test", () => notifications.test());
    ipcMain.handle("agenda:reminder-date", () => notifications.takeDate());
    ipcMain.handle("agenda:calendar-preview", async (_, options) => {
      if (!options || typeof options !== "object")
        throw new Error("calendarInvalid");
      const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        properties: ["openFile"],
        filters: [{ name: t("Calendario"), extensions: ["ics", "csv"] }],
      });
      if (canceled) return null;
      const file = filePaths[0];
      if ((await fs.stat(file)).size > 20 * 1024 * 1024)
        throw new Error("calendarLimit");
      const source = await fs.readFile(file, "utf8");
      const result = await new Promise((resolve, reject) => {
        const worker = new Worker(path.join(__dirname, "calendar-worker.mjs"), {
          workerData: {
            source,
            options: {
              ...options,
              format:
                path.extname(file).toLowerCase() === ".csv" ? "csv" : "ics",
            },
          },
          resourceLimits: { maxOldGenerationSizeMb: 128 },
        });
        const timer = setTimeout(() => {
          worker.terminate();
          reject(new Error("calendarLimit"));
        }, 10000);
        worker.once("message", (message) => {
          clearTimeout(timer);
          worker.terminate();
          message.error
            ? reject(new Error(message.error))
            : resolve(message.result);
        });
        worker.once("error", () => {
          clearTimeout(timer);
          reject(new Error("calendarInvalid"));
        });
        worker.once("exit", (code) => {
          clearTimeout(timer);
          if (code !== 0) reject(new Error("calendarInvalid"));
        });
      });
      return result;
    });
    ipcMain.handle("agenda:load", async () => {
      const result = await storage.load();
      setLocale(result.data.locale || "en");
      await notifications.configure(result.data);
      return result;
    });
    ipcMain.handle("agenda:save", async (_, data) => {
      const operation = storage.save(data);
      pendingSaves.add(operation);
      try {
        await operation;
        setLocale(data.locale || "en");
        await notifications.configure(data);
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
        filters: [{ name: t("Copia de FriendlyAgenda"), extensions: ["json"] }],
      });
      if (canceled) return false;
      await fs.writeFile(filePath, text, "utf8");
      return true;
    });
    ipcMain.handle("agenda:import", async () => {
      const { canceled, filePaths } = await dialog.showOpenDialog(window, {
        properties: ["openFile"],
        filters: [{ name: t("Copia de FriendlyAgenda"), extensions: ["json"] }],
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
    createWindow = async () => {
      closing = false;
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
        if (notifications.background() && !quitRequested) {
          event.preventDefault();
          window.hide();
          return;
        }
        if (closing || (pendingSaves.size === 0 && !lastSaveError)) return;
        event.preventDefault();
        const shouldQuit = quitRequested;
        quitRequested = false;
        Promise.all([...pendingSaves])
          .then(async () => {
            if (lastSaveError) {
              const { response } = await dialog.showMessageBox(window, {
                type: "warning",
                message: t("Hay cambios que no se han podido guardar."),
                detail: t(
                  "Vuelve a la agenda para exportar una copia antes de cerrar.",
                ),
                buttons: [t("Volver a la agenda"), t("Cerrar sin guardar")],
                defaultId: 0,
                cancelId: 0,
              });
              if (response !== 1) return;
            }
            closing = true;
            if (shouldQuit) app.quit();
            else window.close();
          })
          .catch(() => {
            dialog.showMessageBox(window, {
              type: "error",
              message: t(
                "No se ha podido guardar. La agenda sigue abierta para que puedas exportar una copia.",
              ),
            });
          });
      });
      window.on("closed", () => {
        window = null;
      });
      await window.loadFile(path.join(__dirname, "../dist/index.html"));
    };
    await createWindow();
    app.on("activate", () => {
      if (!window) createWindow();
    });
  });
  app.on("window-all-closed", () => {
    if (
      !notifications?.background() &&
      (process.platform !== "darwin" || notifications?.enabled())
    )
      app.quit();
  });
}

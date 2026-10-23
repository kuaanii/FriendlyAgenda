const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("agenda", {
  platform: process.platform,
  calendarPreview: (options) =>
    ipcRenderer.invoke("agenda:calendar-preview", options),
  notificationsState: () => ipcRenderer.invoke("agenda:notifications-state"),
  testNotification: () => ipcRenderer.invoke("agenda:notifications-test"),
  takeReminderDate: () => ipcRenderer.invoke("agenda:reminder-date"),
  onReminderDate: (callback) => {
    const listener = (_, date) => callback(date);
    ipcRenderer.on("agenda:reminder-date", listener);
    return () => ipcRenderer.removeListener("agenda:reminder-date", listener);
  },
  load: () => ipcRenderer.invoke("agenda:load"),
  save: (data) => ipcRenderer.invoke("agenda:save", data),
  exportBackup: (data) => ipcRenderer.invoke("agenda:export", data),
  importBackup: () => ipcRenderer.invoke("agenda:import"),
  openFolder: () => ipcRenderer.invoke("agenda:folder"),
  checkUpdates: () => ipcRenderer.invoke("agenda:check-updates"),
  downloadUpdate: () => ipcRenderer.invoke("agenda:download-update"),
  updateState: () => ipcRenderer.invoke("agenda:update-state"),
  installUpdate: () => ipcRenderer.invoke("agenda:install-update"),
});

const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("agenda", {
  load: () => ipcRenderer.invoke("agenda:load"),
  save: (data) => ipcRenderer.invoke("agenda:save", data),
  exportBackup: (data) => ipcRenderer.invoke("agenda:export", data),
  importBackup: () => ipcRenderer.invoke("agenda:import"),
  openFolder: () => ipcRenderer.invoke("agenda:folder"),
});

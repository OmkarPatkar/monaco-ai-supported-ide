const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getFiles: (dirPath) => ipcRenderer.invoke('get-files', dirPath),
  getCWD: () => ipcRenderer.invoke('get-cwd')
});

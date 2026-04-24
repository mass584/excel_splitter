const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  splitFile: (payload) => ipcRenderer.invoke('split-file', payload),
  revealInFinder: (filePath) => ipcRenderer.invoke('reveal-in-finder', filePath)
});

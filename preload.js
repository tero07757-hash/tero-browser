const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('teroAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Event listeners
  onMaximizedChange: (callback) => {
    ipcRenderer.on('window-maximized-change', (event, isMaximized) => callback(isMaximized));
  },
  onDownloadStarted: (callback) => {
    ipcRenderer.on('download-started', (event, data) => callback(data));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-progress', (event, data) => callback(data));
  },
  onDownloadComplete: (callback) => {
    ipcRenderer.on('download-complete', (event, data) => callback(data));
  },

  // AdShield controls
  toggleAdShield: (enabled) => ipcRenderer.send('adshield-toggle', enabled),
  getAdShieldStatus: () => ipcRenderer.invoke('adshield-get-status'),
  onAdShieldBlocked: (callback) => {
    ipcRenderer.on('adshield-blocked', (event, count) => callback(count));
  }
});

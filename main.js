const { app, BrowserWindow, ipcMain, session, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

let adShieldEnabled = true;
let adsBlockedCount = 0;

const adDomains = [
  'doubleclick.net',
  'googleadservices.com',
  'googlesyndication.com',
  'moatads.com',
  'adservice.google.com',
  'adservice.google.com.br',
  'taboola.com',
  'outbrain.com',
  'adsystem',
  'adnxs.com',
  'advertising.com',
  'popads.net',
  'onclickads.net',
  'ad-delivery',
  'analytics.google.com',
  'google-analytics.com',
  'carbonads',
  'buyads',
  'adroll',
  'adform',
  'adtech'
];

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Remove default menu
  Menu.setApplicationMenu(null);

  // Handle window controls via IPC
  ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.on('window-close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow.isMaximized();
  });

  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized-change', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-maximized-change', false);
  });

  // Handle downloads
  session.defaultSession.on('will-download', (event, item) => {
    const fileName = item.getFilename();
    const fileSize = item.getTotalBytes();

    mainWindow.webContents.send('download-started', {
      filename: fileName,
      filesize: fileSize,
      url: item.getURL()
    });

    item.on('updated', (event, state) => {
      if (state === 'progressing') {
        const received = item.getReceivedBytes();
        const total = item.getTotalBytes();
        const progress = total > 0 ? (received / total) * 100 : 0;
        mainWindow.webContents.send('download-progress', {
          filename: fileName,
          progress: progress,
          received: received,
          total: total
        });
      }
    });

    item.once('done', (event, state) => {
      mainWindow.webContents.send('download-complete', {
        filename: fileName,
        state: state,
        path: item.getSavePath()
      });
    });
  });

  // Set up AdShield network filter
  session.defaultSession.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
    if (!adShieldEnabled) {
      return callback({ cancel: false });
    }

    const url = details.url.toLowerCase();
    const isAd = adDomains.some(domain => url.includes(domain));

    if (isAd) {
      adsBlockedCount++;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('adshield-blocked', adsBlockedCount);
      }
      callback({ cancel: true });
    } else {
      callback({ cancel: false });
    }
  });

  // Handle AdShield IPC
  ipcMain.on('adshield-toggle', (event, enabled) => {
    adShieldEnabled = enabled;
  });

  ipcMain.handle('adshield-get-status', () => {
    return { enabled: adShieldEnabled, blockedCount: adsBlockedCount };
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle certificate errors for development
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});

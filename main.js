const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const { width: screenWidth } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  const winWidth = 320;
  const winHeight = 60;
  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: Math.round((screenWidth - winWidth) / 2),
    y: 0,
    alwaysOnTop: true,
    alwaysOnTopLevel: 'screen-saver',
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    // movable: false, // allow window to be moved
    type: 'toolbar',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadFile('index.html');

  win.on('closed', () => {
    app.exit(0);
  });
}

let manageWin = null;

ipcMain.on('open-manage-window', () => {
  if (manageWin && !manageWin.isDestroyed()) {
    manageWin.close();
    manageWin = null;
    return;
  }
  manageWin = new BrowserWindow({
    width: 938,
    height: 690,
    resizable: true,
    alwaysOnTop: true,
    frame:false,
    resizable:false,
    maximizable:false,
    transparent:true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });
  manageWin.loadFile('manage.html');
  manageWin.on('closed', () => {
    manageWin = null;
  });
});

app.whenReady().then(createWindow);

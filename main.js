const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const fsPromises = require('fs').promises;

// Setup database folder and JSON
const dbFolder = path.join(__dirname, 'database');
const dbFile = path.join(dbFolder, 'data.json');

if (process.env.NODE_ENV !== 'production') {
  require('electron-reload')(
    path.join(__dirname, 'manage.html'), // watch only this file
    {
      electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
      // You can add options here if needed
    }
  );
}
// Ensure database folder exists
if (!fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder);
}

// Ensure JSON file exists with initial structure
if (!fs.existsSync(dbFile)) {
  const defaultData = {
    recordingCount: 0,
    transcriptionCount: 0,
    summaryCount: 0,
    scheduledMeetings: [],
    totalDuration: 0,
    totalSpace: 0,
    recordingsToday: 0
  };
  fs.writeFileSync(dbFile, JSON.stringify(defaultData, null, 2), 'utf-8');
}

// Helper functions to read and write data
function readData() {
  const data = fs.readFileSync(dbFile, 'utf-8');
  return JSON.parse(data);
}

function writeData(data) {
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2), 'utf-8');
}

// IPC Handlers
ipcMain.handle('get-recording-count', () => {
  const data = readData();
  return data.recordingCount;
});

ipcMain.handle('increment-recording-count', () => {
  const data = readData();
  data.recordingCount += 1;
  writeData(data); 
});

ipcMain.handle('decrement-recording-count', () => {
  const data = readData();
  data.recordingCount -= 1;
  writeData(data); 
});

ipcMain.handle('increment-transcript-count',() =>{
  const data = readData();
  data.transcriptionCount +=1;
  writeData(data); 
});
ipcMain.handle('decrement-transcript-count',() =>{
  const data = readData();
  data.transcriptionCount -=1;
  writeData(data); 
});

ipcMain.handle('get-transcription-count',() => {
  const data = readData();
  return data.transcriptionCount;

});


ipcMain.handle('increment-summary-count',() =>{
  const data = readData();
  data.summaryCount +=1;
  writeData(data); 
});

ipcMain.handle('get-summary-count',() => {
  const data = readData();
  return data.summaryCount;
});

ipcMain.handle('increment-time-count',(_, durationToAdd) =>{
  const data = readData();
  data.totalDuration += durationToAdd;
  writeData(data); 
});

ipcMain.handle('get-time-count',() => {
  const data = readData();
  return data.totalDuration;
});

ipcMain.handle('increment-recordingsToday-count',() =>{
  const data = readData();
  data.recordingsToday += 1;
  writeData(data); 
});

ipcMain.handle('get-recordingsToday-count',() => {
  const data = readData();
  return data.recordingsToday;
});

ipcMain.handle('recalculate-space', async () => {
  const recordingsDir = path.join(__dirname, 'recordings');
  let totalBytes = 0;
  try {
    const files = await fsPromises.readdir(recordingsDir);
    for (const file of files) {
      if (file.endsWith('.mp3')) {
        const stats = await fsPromises.stat(path.join(recordingsDir, file));
        totalBytes += stats.size;
      }
    }
  } catch (err) {
    console.error('Error recalculating space:', err);
  }

  const data = readData();
  data.totalSpace = totalBytes;
  writeData(data);
  return totalBytes;
});

let win;
let manageWin = null;

function createWindow() {
  const { width: screenWidth } = require('electron').screen.getPrimaryDisplay().workAreaSize;
  const winWidth = 320;
  const winHeight = 60;

  win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: Math.round((screenWidth - winWidth) / 2),
    y: 0,
    alwaysOnTop: true,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    type: 'toolbar',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  win.loadFile('index.html');

  win.on('closed', () => {
    app.exit(0);
  });
}

// Manage window logic
ipcMain.on('open-manage-window', () => {
  if (manageWin && !manageWin.isDestroyed()) {
    manageWin.close();
    manageWin = null;
    return;
  }

  manageWin = new BrowserWindow({
    width: 938,
    height: 690,
    alwaysOnTop: true,
    frame: false,
    resizable: false,
    maximizable: false,
    transparent: true,
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

app.whenReady().then(() => {
  createWindow();
});

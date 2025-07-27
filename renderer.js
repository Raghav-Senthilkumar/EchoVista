const { remote, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

let micRecorder, systemRecorder;
let micChunks = [], systemChunks = [];

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const closeBtn = document.getElementById('closeBtn');
const manageBtn = document.getElementById('manageBtn');
const managePanel = document.getElementById('managePanel');
const closePanelBtn = document.getElementById('closePanelBtn');
const recordingsList = document.getElementById('recordingsList');
const { shell } = require('electron');

const fsPromises = fs.promises;
const recordingsDir = path.join(__dirname, 'recordings');

const micMp3 = path.join(__dirname, 'input', 'mic.mp3');
const systemMp3 = path.join(__dirname, 'output', 'system.mp3');
const finalMp3 = path.join(__dirname, 'recordings', 'final_mix.mp3');
const micWav = path.join(__dirname, 'input', 'mic.wav');
const systemWav = path.join(__dirname, 'output', 'system.wav');

const setRecordingState = (isRecording) => {
  if (isRecording) {
    startBtn.classList.add('recording', 'flicker');
  } else {
    startBtn.classList.remove('recording', 'flicker');
  }
};

function getTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
}

let currentTimestamp = '';

closeBtn.onclick = () => {
  try {
    remote.app.quit();
  } catch (e) {
    try {
      const win = remote.getCurrentWindow();
      win.close();
    } catch (e2) {
      // As a last resort, forcefully terminate the process
      process.exit(0);
    }
  }
};

startBtn.onclick = async () => {
  currentTimestamp = getTimestamp();
  setRecordingState(true);
  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioInputs = devices.filter(d => d.kind === 'audioinput');
  const systemDevice = audioInputs.find(d =>
    d.label.includes('Aggregate') || d.label.includes('BlackHole')
  );
  if (!systemDevice) {
    setRecordingState(false);
    return;
  }
  const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  micRecorder = new MediaRecorder(micStream);
  micChunks = [];
  micRecorder.ondataavailable = e => micChunks.push(e.data);
  const systemStream = await navigator.mediaDevices.getUserMedia({
    audio: { deviceId: systemDevice.deviceId }
  });
  systemRecorder = new MediaRecorder(systemStream);
  systemChunks = [];
  systemRecorder.ondataavailable = e => systemChunks.push(e.data);
  micRecorder.start();
  systemRecorder.start();
  setRecordingState(true);
};

stopBtn.onclick = async () => {
  if (!micRecorder || !systemRecorder) return;
  setRecordingState(false);
  const micStopped = new Promise(resolve => micRecorder.onstop = resolve);
  const sysStopped = new Promise(resolve => systemRecorder.onstop = resolve);
  micRecorder.stop();
  systemRecorder.stop();
  await Promise.all([micStopped, sysStopped]);

  // Use timestamped filenames
  const micMp3 = path.join(__dirname, 'input', `mic_${currentTimestamp}.mp3`);
  const systemMp3 = path.join(__dirname, 'output', `system_${currentTimestamp}.mp3`);
  const finalMp3 = path.join(__dirname, 'recordings', `final_mix_${currentTimestamp}.mp3`);
  const micWav = path.join(__dirname, 'input', `mic_${currentTimestamp}.wav`);
  const systemWav = path.join(__dirname, 'output', `system_${currentTimestamp}.wav`);

  // Save mic.wav and system.wav temporarily in their folders
  const micBlob = new Blob(micChunks, { type: 'audio/wav' });
  const micBuf = Buffer.from(await micBlob.arrayBuffer());
  fs.writeFileSync(micWav, micBuf);
  const sysBlob = new Blob(systemChunks, { type: 'audio/wav' });
  const sysBuf = Buffer.from(await sysBlob.arrayBuffer());
  fs.writeFileSync(systemWav, sysBuf);

  // Convert mic.wav → input/mic_TIMESTAMP.mp3
  await new Promise((resolve) => {
  execFile(ffmpegPath, ['-y', '-i', micWav, micMp3], (err) => {
    if (err) console.error('Mic MP3 conversion failed:', err);
      resolve();
    });
  });

  // Convert system.wav → output/system_TIMESTAMP.mp3
  await new Promise((resolve) => {
  execFile(ffmpegPath, ['-y', '-i', systemWav, systemMp3], (err) => {
    if (err) console.error('System MP3 conversion failed:', err);
      resolve();
    });
  });

  // Mix mic.wav + system.wav → recordings/final_mix_TIMESTAMP.mp3
  await new Promise((resolve) => {
  execFile(ffmpegPath, [
    '-y',
    '-i', micWav,
    '-i', systemWav,
    '-filter_complex', 'amix=inputs=2:duration=longest',
    '-c:a', 'libmp3lame',
    finalMp3
  ], (err) => {
    if (err) {
      console.error('Mixing failed:', err);
      }
      resolve();
    });
  });

  // Delete the temporary wav files
  try {
    fs.unlinkSync(micWav);
  } catch (e) {}
  try {
    fs.unlinkSync(systemWav);
  } catch (e) {}
};

manageBtn.onclick = () => {
  ipcRenderer.send('open-manage-window');
};

closePanelBtn.onclick = () => {
  managePanel.classList.remove('open');
};

async function populateRecordingsList() {
  recordingsList.innerHTML = '';
  let files = [];
  try {
    files = await fsPromises.readdir(recordingsDir);
    files = files.filter(f => f.endsWith('.mp3'));
    files.sort().reverse();
  } catch (e) {}
  if (files.length === 0) {
    recordingsList.innerHTML = '<li style="text-align:center;opacity:0.7;">No recordings found</li>';
      return;
    }
  for (const file of files) {
    const li = document.createElement('li');
    const nameSpan = document.createElement('span');
    nameSpan.textContent = file;
    nameSpan.style.flex = '1';
    li.appendChild(nameSpan);
    const actions = document.createElement('div');
    actions.className = 'recording-actions';
    // Download
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'action-btn';
    downloadBtn.title = 'Show in Finder';
    downloadBtn.innerHTML = '⬇️';
    downloadBtn.onclick = () => {
      shell.showItemInFolder(path.join(recordingsDir, file));
    };
    actions.appendChild(downloadBtn);
    // Rename
    const renameBtn = document.createElement('button');
    renameBtn.className = 'action-btn';
    renameBtn.title = 'Rename';
    renameBtn.innerHTML = '✏️';
    renameBtn.onclick = () => startRename(li, file, nameSpan);
    actions.appendChild(renameBtn);
    // Delete
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'action-btn';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.onclick = async () => {
      await fsPromises.unlink(path.join(recordingsDir, file));
      await populateRecordingsList();
    };
    actions.appendChild(deleteBtn);
    li.appendChild(actions);
    recordingsList.appendChild(li);
  }
}

function startRename(li, oldName, nameSpan) {
  const input = document.createElement('input');
  input.type = 'text';
  input.value = oldName.replace(/\.mp3$/, '');
  input.className = 'rename-input';
  nameSpan.replaceWith(input);
  input.focus();
  input.onkeydown = async (e) => {
    if (e.key === 'Enter') {
      let newName = input.value.trim();
      if (!newName) return;
      if (!newName.endsWith('.mp3')) newName += '.mp3';
      const oldPath = path.join(recordingsDir, oldName);
      const newPath = path.join(recordingsDir, newName);
      if (oldPath !== newPath) {
        await fsPromises.rename(oldPath, newPath);
      }
      await populateRecordingsList();
    } else if (e.key === 'Escape') {
      populateRecordingsList();
    }
  };
  input.onblur = () => populateRecordingsList();
}

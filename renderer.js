const { remote, ipcRenderer, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const mp3Duration = require('mp3-duration');

let micRecorder, systemRecorder;
let micChunks = [], systemChunks = [];

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const closeBtn = document.getElementById('closeBtn');
const manageBtn = document.getElementById('manageBtn');
const managePanel = document.getElementById('managePanel');
const closePanelBtn = document.getElementById('closePanelBtn');
const recordingsList = document.getElementById('recordingsList');

const fsPromises = fs.promises;
const recordingsDir = path.join(__dirname, 'recordings');

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

// Initially disable Stop button since not recording yet
stopBtn.disabled = true;

closeBtn.onclick = () => {
  try {
    remote.app.quit();
  } catch (e) {
    try {
      const win = remote.getCurrentWindow();
      win.close();
    } catch (e2) {
      process.exit(0);
    }
  }
};

startBtn.onclick = async () => {
  if (micRecorder && micRecorder.state === 'recording') {
    return; // Already recording
  }

  startBtn.disabled = true;
  stopBtn.disabled = false;

  currentTimestamp = getTimestamp();
  setRecordingState(true);

  const devices = await navigator.mediaDevices.enumerateDevices();
  const audioInputs = devices.filter(d => d.kind === 'audioinput');
  const systemDevice = audioInputs.find(d =>
    d.label.includes('Aggregate') || d.label.includes('BlackHole')
  );
  if (!systemDevice) {
    setRecordingState(false);
    startBtn.disabled = false;
    stopBtn.disabled = true;
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

  stopBtn.disabled = true;
  startBtn.disabled = false;

  setRecordingState(false);

  const micStopped = new Promise(resolve => micRecorder.onstop = resolve);
  const sysStopped = new Promise(resolve => systemRecorder.onstop = resolve);
  micRecorder.stop();
  systemRecorder.stop();
  await Promise.all([micStopped, sysStopped]);

  const micMp3 = path.join(__dirname, 'input', `mic_${currentTimestamp}.mp3`);
  const systemMp3 = path.join(__dirname, 'output', `system_${currentTimestamp}.mp3`);
  const finalMp3 = path.join(recordingsDir, `final_mix_${currentTimestamp}.mp3`);
  const micWav = path.join(__dirname, 'input', `mic_${currentTimestamp}.wav`);
  const systemWav = path.join(__dirname, 'output', `system_${currentTimestamp}.wav`);

  const micBlob = new Blob(micChunks, { type: 'audio/wav' });
  const micBuf = Buffer.from(await micBlob.arrayBuffer());
  fs.writeFileSync(micWav, micBuf);

  const sysBlob = new Blob(systemChunks, { type: 'audio/wav' });
  const sysBuf = Buffer.from(await sysBlob.arrayBuffer());
  fs.writeFileSync(systemWav, sysBuf);

  // Convert mic.wav to mp3
  await new Promise((resolve) => {
    execFile(ffmpegPath, ['-y', '-i', micWav, micMp3], (err) => {
      if (err) console.error('Mic MP3 conversion failed:', err);
      resolve();
    });
  });

  // Convert system.wav to mp3
  await new Promise((resolve) => {
    execFile(ffmpegPath, ['-y', '-i', systemWav, systemMp3], (err) => {
      if (err) console.error('System MP3 conversion failed:', err);
      resolve();
    });
  });

  // Mix mic.wav + system.wav into final_mix.mp3
  await new Promise((resolve) => {
    execFile(ffmpegPath, [
      '-y',
      '-i', micWav,
      '-i', systemWav,
      '-filter_complex', 'amix=inputs=2:duration=longest',
      '-c:a', 'libmp3lame',
      finalMp3
    ], (err) => {
      if (err) console.error('Mixing failed:', err);
      resolve();
    });
  });

  // Delete temp wav files
  try { fs.unlinkSync(micWav); } catch {}
  try { fs.unlinkSync(systemWav); } catch {}

  await ipcRenderer.invoke('increment-recording-count');
  
  await ipcRenderer.invoke('increment-recordingsToday-count');

  // Get duration of final mixed mp3 asynchronously using mp3-duration
  mp3Duration(finalMp3, async (err, duration) => {
    if (err) {
      console.error('Failed to get MP3 duration:', err);
      return;
    }
    console.log(`Final mixed MP3 duration: ${duration} seconds`);

    // Send duration to main process
    await ipcRenderer.invoke('increment-time-count', duration);

    // Optional: Update total duration display in UI if you want
    // const totalDuration = await ipcRenderer.invoke('get-total-duration');
    // document.getElementById('totalDurationDisplay').textContent = `Total Duration: ${formatDuration(totalDuration)}`;
  });
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
    // Show in Finder
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


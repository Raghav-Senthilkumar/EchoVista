const { ipcRenderer } = require('electron');

const idsToUpdate = ['total-recordings', 'total-recording-2'];
function formatDuration(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  let result = '';
  if (hrs > 0) result += `${hrs}h `;
  if (mins > 0 || hrs === 0) result += `${mins}m`;

  return result.trim();
}
function formatBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(1)} ${units[i]}`;
}

async function loadDataAndUpdateUI() {
  try {
    // Fetch total recordings
    const totalRecordings = await ipcRenderer.invoke('get-recording-count');
    idsToUpdate.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = totalRecordings;
    });

    // Fetch total transcripts
    const totalTranscripts = await ipcRenderer.invoke('get-transcription-count');
    const transcriptsEl = document.getElementById('total-transcripts');
    if (transcriptsEl) transcriptsEl.textContent = totalTranscripts;

    // Calculate pending transcripts = totalRecordings - totalTranscripts
    const pendingEl = document.getElementById('pending-transcripts');
    if (pendingEl) pendingEl.textContent = totalRecordings - totalTranscripts;

    // Fetch total summaries
    const totalSummaries = await ipcRenderer.invoke('get-summary-count');
    const summariesEl = document.getElementById('total-summaries');
    if (summariesEl) summariesEl.textContent = totalSummaries;

    const totalDuration = await ipcRenderer.invoke('get-time-count');
    const time = document.getElementById("total-duration");
    if (time) time.textContent = formatDuration(totalDuration);

    const k = await ipcRenderer.invoke("recalculate-space")
    const space = document.getElementById("total-space")
    if(space) space.textContent = formatBytes(k);

    const rt = await ipcRenderer.invoke("get-recordingsToday-count")
    const temper = document.getElementById("recording-Today")
    if(temper) temper.textContent = rt;

  } catch (err) {
    console.error('Failed to load counts:', err);
  }
}

window.addEventListener('DOMContentLoaded', loadDataAndUpdateUI);

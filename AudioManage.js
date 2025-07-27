// Node.js 'fs' module to interact with the filesystem (reading files, deleting, etc.)
const fs = require('fs');
// Node.js 'path' module to handle file and directory paths cross-platform
const path = require('path');
// Define the directory where recordings (audio files) are stored
const recordingsDir = path.join(__dirname, 'recordings');
// Select the container element in the DOM where audio items will be inserted
const audioList = document.querySelector('.audio-list');

/**
 * Create a UI element representing one audio recording file
 * @param {string} filename - The name of the audio file (e.g., "recording1.mp3")
 * @returns {HTMLElement} The constructed DOM element representing the audio item
 */
function createAudioItem(filename) {
  // Main container for one audio file
  const item = document.createElement('div');
  item.className = 'audio-item';

  // Section for displaying audio title and recording number
  const audioInfo = document.createElement('div');
  audioInfo.className = 'audio-info';

  // Display the audio file name as the title
  const title = document.createElement('div');
  title.className = 'audio-title';
  title.textContent = filename;

  // Calculate the "recording number" (based on file index in sorted list)
  const recordingNumber = document.createElement('div');
  recordingNumber.className = 'recording-number';
  // Read all .mp3 files, sort alphabetically, and find index of current file
  const files = fs.readdirSync(recordingsDir).filter(f => f.endsWith('.mp3')).sort();
  const fileIndex = files.indexOf(filename);
  recordingNumber.textContent = `Recording #${fileIndex + 1}`;

  audioInfo.appendChild(title);
  audioInfo.appendChild(recordingNumber);

  // Container for audio waveform visualization
  const waveform = document.createElement('div');
  waveform.style.width = '160px';
  waveform.style.height = '28px';
  waveform.style.flexShrink = '0';

  // Duration badge that will show the length of the audio once loaded
  const durationBadge = document.createElement('div');
  durationBadge.className = 'duration-badge';
  durationBadge.textContent = 'Loading...'; // Placeholder before duration is known

  // Container that holds waveform and duration badge side by side
  const waveformContainer = document.createElement('div');
  waveformContainer.style.display = 'flex';
  waveformContainer.style.alignItems = 'center';
  waveformContainer.style.gap = '8px';
  waveformContainer.appendChild(waveform);
  waveformContainer.appendChild(durationBadge);

  // Container for action buttons: play, download, delete
  const actionButtons = document.createElement('div');
  actionButtons.className = 'action-buttons';

  // Play/pause button setup
  const playBtn = document.createElement('button');
  playBtn.className = 'action-btn';
  playBtn.setAttribute('aria-label', 'Play');
  playBtn.innerHTML = '▶';

  // Download button to open the folder containing the recording file
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'action-btn';
  downloadBtn.setAttribute('aria-label', 'Download');
  downloadBtn.innerHTML = '⬇';
  downloadBtn.onclick = () => {
    const { shell } = require('electron');
    shell.showItemInFolder(path.join(recordingsDir, filename));
  };

  // Delete button to remove the audio file and related cached data
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'action-btn';
  deleteBtn.setAttribute('aria-label', 'Delete');
  deleteBtn.innerHTML = '🗑';
  deleteBtn.onclick = () => {
    if (confirm(`Delete "${filename}"?`)) {
      // Delete the audio file
      fs.unlinkSync(path.join(recordingsDir, filename));
      // Also delete waveform peaks cache if exists
      const peaksPath = path.join(recordingsDir, filename + '.peaks.json');
      if (fs.existsSync(peaksPath)) {
        fs.unlinkSync(peaksPath);
      }
      // Remove the item from the UI
      item.remove();
    }
  };

  // Append all buttons to the action buttons container
  actionButtons.appendChild(playBtn);
  actionButtons.appendChild(downloadBtn);
  actionButtons.appendChild(deleteBtn);

  // Append audio info, waveform container, and action buttons to main item
  item.appendChild(audioInfo);
  item.appendChild(waveformContainer);
  item.appendChild(actionButtons);

  // Check if waveform peaks data is cached for faster loading
  const peaksPath = path.join(recordingsDir, filename + '.peaks.json');
  let peaks = null;
  if (fs.existsSync(peaksPath)) {
    try {
      peaks = JSON.parse(fs.readFileSync(peaksPath));
    } catch (e) {
      peaks = null; // Fail silently if JSON parsing fails
    }
  }

  // Initialize WaveSurfer instance to show waveform visualization
  const ws = WaveSurfer.create({
    container: waveform,
    waveColor: '#00000065',
    progressColor: '#18472D',
    height: 28,
    barWidth: 4,
    barRadius: 3,
    responsive: true,
    cursorColor: '#18472D',
    interact: true,
    backend: 'MediaElement', // Use HTML5 audio element as backend
  });

  // Load waveform using cached peaks if available, else just load audio
  if (peaks) {
    ws.load(path.join('recordings', filename), peaks);
  } else {
    ws.load(path.join('recordings', filename));
    // After waveform is ready, export peaks and save to cache file
    ws.on('ready', () => {
      const peaksData = ws.exportPeaks(512);
      try {
        fs.writeFileSync(peaksPath, JSON.stringify(peaksData));
      } catch (e) {
        // Ignore write errors silently
      }
    });
  }

  // Update duration badge text once audio metadata is loaded
  ws.on('ready', () => {
    const duration = ws.getDuration();
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    durationBadge.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  });

  // Play/pause button click toggles audio playback
  playBtn.onclick = () => {
    ws.playPause();
  };

  // Update play button icon based on playback state
  ws.on('play', () => {
    playBtn.innerHTML = '⏸'; // pause symbol
  });
  ws.on('pause', () => {
    playBtn.innerHTML = '▶'; // play symbol
  });
  ws.on('finish', () => {
    playBtn.innerHTML = '▶'; // reset to play symbol when audio ends
  });

  // Return the constructed audio item DOM element
  return item;
}

/**
 * Load and display all .mp3 audio files from the recordings directory
 */
function loadAudioList() {
  if (!audioList) return;  // If the container does not exist, do nothing

  audioList.innerHTML = ''; // Clear existing list items

  let files = [];
  try {
    // Read and filter .mp3 files in recordings folder
    files = fs.readdirSync(recordingsDir).filter(f => f.endsWith('.mp3'));
  } catch (e) {
    // If reading directory fails, display message in UI
    audioList.innerHTML = '<div style="opacity:0.7;">No recordings found</div>';
    return;
  }

  if (files.length === 0) {
    // Show message if no mp3 files found
    audioList.innerHTML = '<div style="opacity:0.7;">No recordings found</div>';
    return;
  }

  // For each audio file, create and append an audio item to the list
  files.forEach(filename => {
    audioList.appendChild(createAudioItem(filename));
  });
}

// Automatically load audio list when script runs (e.g. on page load)
if (audioList) loadAudioList();


    // Transcription functionality
    const { exec } = require('child_process');
    const axios = require('axios')
    require('dotenv').config();

const API_KEY = process.env.API_KEY;

    const transcriptionDir = path.join(__dirname, 'transcription');
    
    // Ensure transcription directory exists
    if (!fs.existsSync(transcriptionDir)) {
      fs.mkdirSync(transcriptionDir);
    }
    
    let selectedRecordings = new Set();
    let transcriptionRecordings = [];
    
    function checkTranscriptionStatus(filename) {
      const transcriptPath = path.join(transcriptionDir, filename.replace('.mp3', '.txt'));
      return fs.existsSync(transcriptPath);
    }
    
    function getTranscriptionText(filename) {
      const transcriptPath = path.join(transcriptionDir, filename.replace('.mp3', '.txt'));
      if (fs.existsSync(transcriptPath)) {
        return fs.readFileSync(transcriptPath, 'utf8');
      }
      return null;
    }
    
    function createTranscriptionItem(filename) {
      const item = document.createElement('div');
      item.className = 'transcription-item';
      item.dataset.filename = filename;
      
      const isTranscribed = checkTranscriptionStatus(filename);
      
      // Checkbox
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'transcription-checkbox';
      checkbox.checked = selectedRecordings.has(filename);
      checkbox.onchange = (e) => {
        if (e.target.checked) {
          selectedRecordings.add(filename);
          item.classList.add('selected');
        } else {
          selectedRecordings.delete(filename);
          item.classList.remove('selected');
        }
        updateTranscribeButton();
      };
      
      // Info section
      const info = document.createElement('div');
      info.className = 'transcription-info';
      
      const title = document.createElement('div');
      title.className = 'transcription-title';
      title.textContent = filename;
      
      const duration = document.createElement('div');
      duration.className = 'transcription-duration';
      duration.textContent = 'Loading duration...';
      
      info.appendChild(title);
      info.appendChild(duration);
      
      // Status section
      const status = document.createElement('div');
      status.className = 'transcription-status';
      
      const statusBadge = document.createElement('div');
      statusBadge.className = `status-badge ${isTranscribed ? 'transcribed' : 'not-transcribed'}`;
      statusBadge.textContent = isTranscribed ? 'Transcribed' : 'Not Transcribed';
      
      status.appendChild(statusBadge);
      
      // Actions section
      const actions = document.createElement('div');
      actions.className = 'transcription-actions';
      
      const progress = document.createElement('div');
      progress.className = 'transcription-progress';
      progress.innerHTML = '<div class="progress-spinner"></div><span>Transcribing...</span>';
      
      const transcribeBtn = document.createElement('button');
      transcribeBtn.className = 'transcribe-btn';
      transcribeBtn.textContent = 'Transcribe';
      transcribeBtn.onclick = () => transcribeRecording(filename, item);
      
      const viewBtn = document.createElement('button');
      viewBtn.className = 'view-transcript-btn';
      viewBtn.textContent = 'View';
      viewBtn.onclick = () => viewTranscription(filename);
      
      if (isTranscribed) {
        actions.appendChild(viewBtn);
      } else {
        actions.appendChild(transcribeBtn);
      }
      
      actions.appendChild(progress);
      
      // Add all elements
      item.appendChild(checkbox);
      item.appendChild(info);
      item.appendChild(status);
      item.appendChild(actions);
      
      // Load duration
      loadAudioDuration(filename, duration);
      
      return item;
    }
    
    function loadAudioDuration(filename, durationElement) {
      const audioPath = path.join(recordingsDir, filename);
      if (fs.existsSync(audioPath)) {
        // Create a temporary audio element to get duration
        const audio = new Audio();
        audio.src = `file://${audioPath}`;
        audio.onloadedmetadata = () => {
          const minutes = Math.floor(audio.duration / 60);
          const seconds = Math.floor(audio.duration % 60);
          durationElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };
        audio.onerror = () => {
          durationElement.textContent = 'Unknown duration';
        };
      }
    }
    
    function updateTranscribeButton() {
      const transcribeBtn = document.getElementById('transcribe-selected-btn');
      if (selectedRecordings.size > 0) {
        transcribeBtn.style.display = 'block';
        transcribeBtn.textContent = `Transcribe ${selectedRecordings.size} Selected`;
      } else {
        transcribeBtn.style.display = 'none';
      }
    }
    
    function filterRecordings(filter) {
      const recordingsList = document.getElementById('transcription-recordings-list');
      const items = recordingsList.querySelectorAll('.transcription-item');
      
      items.forEach(item => {
        const filename = item.dataset.filename;
        const isTranscribed = checkTranscriptionStatus(filename);
        
        let show = true;
        if (filter === 'transcribed' && !isTranscribed) show = false;
        if (filter === 'not-transcribed' && isTranscribed) show = false;
        
        item.style.display = show ? 'flex' : 'none';
      });
    }
    
async function transcribeRecording(filename, item) {
  const audioPath = path.join(recordingsDir, filename);
  const transcriptPath = path.join(transcriptionDir, filename.replace('.mp3', '.txt'));

  if (!fs.existsSync(audioPath)) {
    alert('Audio file not found!');
    return;
  }

  // UI: Show progress spinner
  const progress = item.querySelector('.transcription-progress');
  const transcribeBtn = item.querySelector('.transcribe-btn');
  progress.style.display = 'flex';
  transcribeBtn.style.display = 'none';
  const progressText = progress.querySelector('span');
  progressText.textContent = 'Uploading audio...';

  try {
    // Step 1: Upload audio file
    const audioData = fs.readFileSync(audioPath);
    const uploadRes = await axios.post('https://api.assemblyai.com/v2/upload', audioData, {
      headers: {
        authorization: API_KEY,
        'content-type': 'application/octet-stream'
      }
    });

    const uploadUrl = uploadRes.data.upload_url;
    progressText.textContent = 'Starting transcription...';

    // Step 2: Start transcription
    const transcriptRes = await axios.post('https://api.assemblyai.com/v2/transcript', {
      audio_url: uploadUrl
    }, {
      headers: {
        authorization: API_KEY,
        'content-type': 'application/json'
      }
    });

    const transcriptId = transcriptRes.data.id;

    // Step 3: Poll for status
    progressText.textContent = 'Transcribing...';
    let completed = false;
    let transcriptData;

    while (!completed) {
      await new Promise(resolve => setTimeout(resolve, 4000));
      const statusRes = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
        headers: { authorization: API_KEY }
      });

      transcriptData = statusRes.data;

      if (transcriptData.status === 'completed') {
        completed = true;
      } else if (transcriptData.status === 'error') {
        throw new Error(transcriptData.error);
      }
    }

    // Step 4: Save the transcript locally
    const fullTranscript = `Transcription for ${filename}\n\n${transcriptData.text}\n\nTranscription Method: AssemblyAI\nTimestamp: ${new Date().toLocaleString()}`;
    fs.writeFileSync(transcriptPath, fullTranscript);

    // UI updates
    progress.style.display = 'none';
    const statusBadge = item.querySelector('.status-badge');
    statusBadge.className = 'status-badge transcribed';
    statusBadge.textContent = 'Transcribed';

    const actions = item.querySelector('.transcription-actions');
    const viewBtn = document.createElement('button');
    viewBtn.className = 'view-transcript-btn';
    viewBtn.textContent = 'View';
    viewBtn.onclick = () => viewTranscription(filename);
    actions.appendChild(viewBtn);
    await ipcRenderer.invoke('increment-transcript-count');
    loadTranscriptionRecordings();

  } catch (error) {
    console.error('Transcription error:', error);
    progressText.textContent = 'Error occurred';
    progress.style.display = 'none';
    transcribeBtn.style.display = 'block';
    alert(`Transcription failed: ${error.message}`);
  }
}

    
   function viewTranscription(filename) {
  const transcriptText = getTranscriptionText(filename);
  if (transcriptText) {
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 600px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e5e7eb;
    `;

    const title = document.createElement('h3');
    title.textContent = `Transcription: ${filename}`;
    title.style.margin = '0';
    title.style.fontSize = '18px';
    title.style.fontWeight = '600';

    // Create close button.
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s;
    `;
    closeBtn.onclick = () => modal.remove();
    closeBtn.onmouseenter = () => closeBtn.style.background = '#f3f4f6';
    closeBtn.onmouseleave = () => closeBtn.style.background = 'transparent';

    // Create copy button.
    const copyBtn = document.createElement('button');
    copyBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="#374151" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    `;
    copyBtn.style.cssText = `
      position: relative;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 50%;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
    `;

    // Create the tooltip element (pop-up).
    const tooltip = document.createElement('div');
    tooltip.textContent = 'Copied to clipboard';
    tooltip.style.cssText = `
      position: absolute;
      bottom: 120%; /* position the tooltip above the button */
      left: 50%;
      transform: translateX(-50%);
      background-color: #333;
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    `;
    copyBtn.appendChild(tooltip);

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(transcriptText)
        .then(() => {
          // Show success visual feedback on button.
          copyBtn.style.background = 'linear-gradient(40deg, #11301f 10%, #227d53 100%)'; // green
          copyBtn.querySelector('svg').setAttribute('stroke', '#ffffff');
          
          // Show the tooltip.
          tooltip.style.opacity = '1';
          
          // Reset visuals after 2 seconds.
          setTimeout(() => {
            tooltip.style.opacity = '0';
            copyBtn.style.background = 'white';
            copyBtn.querySelector('svg').setAttribute('stroke', '#374151');
          }, 2000);
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          copyBtn.style.background = '#ef4444'; // red
          copyBtn.querySelector('svg').setAttribute('stroke', '#ffffff');
          // Optionally update tooltip text for error feedback.
          tooltip.textContent = 'Copy failed';
          tooltip.style.opacity = '1';
          setTimeout(() => {
            tooltip.style.opacity = '0';
            // Reset to original tooltip text.
            tooltip.textContent = 'Copied to clipboard';
            copyBtn.style.background = 'white';
            copyBtn.querySelector('svg').setAttribute('stroke', '#374151');
          }, 2000);
        });
    };

    copyBtn.onmouseenter = () => copyBtn.style.borderColor = '#9ca3af';
    copyBtn.onmouseleave = () => copyBtn.style.borderColor = '#d1d5db';

    const content = document.createElement('div');
    content.style.cssText = `
      font-family: 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
      white-space: pre-wrap;
      color: #374151;
      margin-top: 16px;
    `;
    content.textContent = transcriptText;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(closeBtn);

    header.appendChild(title);
    header.appendChild(buttonContainer);
    modalContent.appendChild(header);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };
  }
}

    
    function loadTranscriptionRecordings() {
      const recordingsList = document.getElementById('transcription-recordings-list');
      if (!recordingsList) return;
      
      recordingsList.innerHTML = '';
      let files = [];
      
      try {
        files = fs.readdirSync(recordingsDir)
          .filter(f => f.endsWith('.mp3'))
          .sort();
      } catch (e) {
        recordingsList.innerHTML = '<div style="opacity:0.7; text-align: center; padding: 40px;">No recordings found</div>';
        return;
      }
      
      if (files.length === 0) {
        recordingsList.innerHTML = '<div style="opacity:0.7; text-align: center; padding: 40px;">No recordings found</div>';
        return;
      }
      
      files.forEach(filename => {
        recordingsList.appendChild(createTranscriptionItem(filename));
      });
      
      // Apply current filter
      const filterSelect = document.getElementById('transcription-filter');
      if (filterSelect) {
        filterRecordings(filterSelect.value);
      }
    }
    
    // Initialize transcription functionality
    document.addEventListener('DOMContentLoaded', () => {
      const filterSelect = document.getElementById('transcription-filter');
      const transcribeSelectedBtn = document.getElementById('transcribe-selected-btn');
      
      if (filterSelect) {
        filterSelect.onchange = (e) => {
          filterRecordings(e.target.value);
        };
      }
      
      if (transcribeSelectedBtn) {
        transcribeSelectedBtn.onclick = async () => {
          const selectedArray = Array.from(selectedRecordings);
          const totalFiles = selectedArray.length;
          
          for (let i = 0; i < selectedArray.length; i++) {
            const filename = selectedArray[i];
            const item = document.querySelector(`[data-filename="${filename}"]`);
            if (item) {
              // Update progress text to show current file
              const progress = item.querySelector('.transcription-progress');
              const progressText = progress.querySelector('span');
              progressText.textContent = `Processing ${i + 1}/${totalFiles}...`;
              
              await transcribeRecording(filename, item);
            }
          }
          selectedRecordings.clear();
          updateTranscribeButton();
        };
      }
    });
    
    // Load recordings when transcribe tab is shown
    const originalShowTab = window.showTab;
    window.showTab = function(targetTab) {
      originalShowTab(targetTab);
      if (targetTab === 'transcribe') {
        loadTranscriptionRecordings();
      }
      if (targetTab === 'edit') {
        loadEditTranscripts();
      }
    };


// edit.js - Transcript list with confirmation before summarizing
document.addEventListener('DOMContentLoaded', () => {
  const editSection = document.getElementById('edit-transcripts-list');
  if (!editSection) return;

  try {
    // Check if we're in a Node.js environment with filesystem access
    if (typeof require === 'function' && typeof process === 'object') {
      const fs = require('fs');
      const path = require('path');
      const { InferenceClient } = require('@huggingface/inference');
      
      const transcriptionDir = path.join(__dirname, 'transcription');
      const summarizeDir = path.join(__dirname, 'summarize');

      // Create summarize directory if it doesn't exist
      if (!fs.existsSync(summarizeDir)) {
        fs.mkdirSync(summarizeDir);
      }

      if (fs.existsSync(transcriptionDir)) {
        const txtFiles = fs.readdirSync(transcriptionDir)
          .filter(file => file.endsWith('.txt'))
          .sort();

        if (txtFiles.length === 0) {
          editSection.innerHTML = `
            <div style="opacity:0.7; text-align: center; padding: 40px;">
              No transcripts found
            </div>
          `;
          return;
        }

        // Clear existing content
        editSection.innerHTML = '';

        // Create an item for each txt file
        txtFiles.forEach(file => {
          const isSummarized = fs.existsSync(path.join(summarizeDir, `summary_${file}`));
          createTranscriptItem(editSection, file, isSummarized, fs, transcriptionDir);
        });
      } else {
        throw new Error('Transcription directory not found');
      }
    } else {
      throw new Error('No filesystem access');
    }
  } catch (error) {
    editSection.innerHTML = `
      <div style="opacity:0.7; text-align: center; padding: 40px; color: #ef4444;">
        Error: ${error.message}
      </div>
    `;
  }
});

function createTranscriptItem(container, filename, isSummarized, fs, transcriptionDir) {
  const item = document.createElement('div');
  item.className = 'transcription-item';
  item.style.display = 'flex';
  item.style.alignItems = 'center';
  item.style.padding = '10px 14px';
  item.style.marginBottom = '0px';
  item.style.backgroundColor = '#fff';
  item.style.borderRadius = '8px';
  item.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
  item.style.transition = 'all 0.2s ease';

  // File info section
  const info = document.createElement('div');
  info.className = 'transcription-info';
  info.style.flex = '1';
  info.style.marginLeft = '12px';
  info.style.display = 'flex';
  info.style.alignItems = 'center';
  info.style.gap = '12px';

  // Status badge
  const statusBadge = document.createElement('div');
  statusBadge.textContent = isSummarized ? 'Summarized' : 'Raw';
  statusBadge.style.fontSize = '10px';
  statusBadge.style.fontWeight = '600';
  statusBadge.style.padding = '2px 8px';
  statusBadge.style.borderRadius = '10px';
  statusBadge.style.backgroundColor = isSummarized ? '#e6f6e6' : '#f0f0f0';
  statusBadge.style.color = isSummarized ? '#047857' : '#666';

  const titleContainer = document.createElement('div');
  const title = document.createElement('div');
  title.className = 'transcription-title';
  title.textContent = filename.replace('.txt', '');
  title.style.fontWeight = '500';
  title.style.marginBottom = '2px';

  const date = document.createElement('div');
  date.className = 'transcription-date';
  const stats = fs.statSync(path.join(transcriptionDir, filename));
  date.textContent = new Date(stats.mtime).toLocaleString();
  date.style.fontSize = '11px';
  date.style.color = '#666';

  titleContainer.appendChild(title);
  titleContainer.appendChild(date);
  
  info.appendChild(statusBadge);
  info.appendChild(titleContainer);

  // Action buttons
  const actions = document.createElement('div');
  actions.className = 'transcription-actions';
  actions.style.display = 'flex';
  actions.style.gap = '8px';

  const actionBtn = document.createElement('button');
  actionBtn.className = isSummarized ? 'btn-view' : 'btn-summarize';
  actionBtn.textContent = isSummarized ? 'View Notes' : 'Summarize';
  actionBtn.style.padding = '6px 12px';
  actionBtn.style.backgroundColor = isSummarized ? '#e6f6e6' : '#10b981';
  actionBtn.style.color = isSummarized ? '#047857' : 'white';
  actionBtn.style.border = isSummarized ? '1px solid #d1fae5' : 'none';
  actionBtn.style.borderRadius = '4px';
  actionBtn.style.cursor = 'pointer';
  actionBtn.style.fontSize = '13px';
  actionBtn.style.transition = 'all 0.2s';
  actionBtn.style.minWidth = isSummarized ? '100px' : '90px';
  
  actionBtn.onmouseenter = () => {
    if (isSummarized) {
      actionBtn.style.backgroundColor = '#d1fae5';
    } else {
      actionBtn.style.backgroundColor = '#059669';
    }
  };
  
  actionBtn.onmouseleave = () => {
    if (isSummarized) {
      actionBtn.style.backgroundColor = '#e6f6e6';
    } else {
      actionBtn.style.backgroundColor = '#10b981';
    }
  };

  actionBtn.addEventListener('click', () => {
    if (isSummarized) {
      viewSummary(filename);
    } else {
      showSummarizeConfirmation(filename);
    }
  });

  actions.appendChild(actionBtn);
  
  // Add all elements
  item.appendChild(info);
  item.appendChild(actions);
  container.appendChild(item);
}

function showSummarizeConfirmation(filename) {
  // Create confirmation modal
  const modal = document.createElement('div');
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.right = '0';
  modal.style.bottom = '0';
  modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
  modal.style.zIndex = '2000';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  
  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = 'white';
  modalContent.style.borderRadius = '8px';
  modalContent.style.width = '400px';
  modalContent.style.maxWidth = '90%';
  modalContent.style.padding = '20px';
  modalContent.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
  
  const title = document.createElement('h3');
  title.textContent = 'Confirm Summarization';
  title.style.marginTop = '0';
  title.style.color = '#333';
  
  const message = document.createElement('p');
  message.textContent = `Are you sure you want to summarize "${filename.replace('.txt', '')}"?`;
  message.style.margin = '15px 0';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.justifyContent = 'flex-end';
  buttonContainer.style.gap = '10px';
  buttonContainer.style.marginTop = '20px';
  
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = 'Summarize';
  confirmBtn.style.padding = '8px 16px';
  confirmBtn.style.backgroundColor = '#10b981';
  confirmBtn.style.color = 'white';
  confirmBtn.style.border = 'none';
  confirmBtn.style.borderRadius = '4px';
  confirmBtn.style.cursor = 'pointer';
  
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.padding = '8px 16px';
  cancelBtn.style.backgroundColor = '#f0f0f0';
  cancelBtn.style.color = '#333';
  cancelBtn.style.border = 'none';
  cancelBtn.style.borderRadius = '4px';
  cancelBtn.style.cursor = 'pointer';
  
  confirmBtn.addEventListener('click', () => {
    modal.remove();
    summarizeTranscript(filename);
  });
  
  cancelBtn.addEventListener('click', () => {
    modal.remove();
  });
  
  buttonContainer.appendChild(cancelBtn);
  buttonContainer.appendChild(confirmBtn);
  
  modalContent.appendChild(title);
  modalContent.appendChild(message);
  modalContent.appendChild(buttonContainer);
  modal.appendChild(modalContent);
  
  document.body.appendChild(modal);
}

async function summarizeTranscript(filename) {
  try {
    const fs = require('fs');
    const path = require('path');
    const { GoogleGenAI } = require('@google/genai');

    const filePath = path.join(__dirname, 'transcription', filename);
    const summarizeDir = path.join(__dirname, 'summarize');
    const outputPath = path.join(summarizeDir, `summary_${filename}`);

    if (!fs.existsSync(filePath)) {
      showAlert(`File not found: ${filename}`, 'error');
      return;
    }

    // Ensure summarize directory exists
    if (!fs.existsSync(summarizeDir)) {
      fs.mkdirSync(summarizeDir, { recursive: true });
    }

    const content = fs.readFileSync(filePath, 'utf8');

    if (!content.trim()) {
      showAlert(`File is empty: ${filename}`, 'error');
      return;
    }

    // Show processing message
    const processingId = showProcessingMessage(`Summarizing ${filename}...`);
require('dotenv').config();
    try {

      process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({});
      const prompt = `You are an expert meeting assistant. Read the following transcript and generate structured meeting notes in markdown format. Use clear headings, bullet points, and action items. Only output markdown.\n\nTranscript:\n${content}`;
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      }).then(response => {
        let finalNotes = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!finalNotes) {
          finalNotes = `Meeting Summary:\n\n${content.trim()}`;
        }
        // Add header with metadata
        const timestamp = new Date().toLocaleString();
        const finalOutput = `Meeting Notes - ${filename}\nGenerated: ${timestamp}\n\n${finalNotes}`;
        fs.writeFileSync(outputPath, finalOutput, 'utf8');
        updateProcessingMessage(processingId, `✓ Meeting notes saved to summarize/summary_${filename}`);
        // Refresh UI after completion
        setTimeout(() => {
          try {
            const editSection = document.getElementById('edit-transcripts-list');
            if (editSection) {
              editSection.innerHTML = '';
              const transcriptionDir = path.join(__dirname, 'transcription');
              if (fs.existsSync(transcriptionDir)) {
                const txtFiles = fs.readdirSync(transcriptionDir)
                  .filter(file => file.endsWith('.txt'))
                  .sort();
                txtFiles.forEach(file => {
                  const isSummarized = fs.existsSync(path.join(__dirname, 'summarize', `summary_${file}`));
                  createTranscriptItem(editSection, file, isSummarized, fs, transcriptionDir);
                });
              }
            }
          } catch (uiError) {
            console.error('Error refreshing UI:', uiError);
          }
          // Remove processing message after UI refresh
          setTimeout(() => {
            removeProcessingMessage(processingId);
          }, 1000);
        }, 1000);
      }).catch(err => {
        removeProcessingMessage(processingId);
        showAlert('Gemini API error: ' + err.message, 'error');
      });
    } catch (apiError) {
      removeProcessingMessage(processingId);
      showAlert('Gemini API error: ' + apiError.message, 'error');
    }
  } catch (error) {
    showAlert(`Error summarizing: ${error.message}`, 'error');
    try {
      if (typeof processingId !== 'undefined') {
        removeProcessingMessage(processingId);
      }
    } catch (cleanupError) {}
  }
}

function viewSummary(filename) {
  try {
    const fs = require('fs');
    const path = require('path');
    const summaryPath = path.join(__dirname, 'summarize', `summary_${filename}`);
    
    if (!fs.existsSync(summaryPath)) {
      showAlert(`Summary not found for: ${filename}`, 'error');
      return;
    }

    const summaryContent = fs.readFileSync(summaryPath, 'utf8');
    
    // Create modal for viewing
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.right = '0';
    modal.style.bottom = '0';
    modal.style.backgroundColor = 'rgba(0,0,0,0.5)';
    modal.style.zIndex = '2000';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    
    const modalContent = document.createElement('div');
    modalContent.style.backgroundColor = 'white';
    modalContent.style.borderRadius = '8px';
    modalContent.style.width = '80%';
    modalContent.style.maxWidth = '800px';
    modalContent.style.maxHeight = '80vh';
    modalContent.style.overflow = 'auto';
    modalContent.style.padding = '20px';
    modalContent.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
    
    const title = document.createElement('h3');
    title.textContent = `Meeting Notes: ${filename.replace('.txt', '')}`;
    title.style.marginTop = '0';
    title.style.color = '#333';
    
    const content = document.createElement('div');
    // Render markdown to HTML if marked.js is available, else fallback to pre-wrap
    if (window.marked) {
      content.innerHTML = window.marked.parse(summaryContent);
    } else {
      content.textContent = summaryContent;
      content.style.whiteSpace = 'pre-wrap';
    }
    content.style.padding = '12px';
    content.style.backgroundColor = '#f9f9f9';
    content.style.borderRadius = '4px';
    content.style.marginTop = '15px';
    content.style.maxHeight = '60vh';
    content.style.overflow = 'auto';
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.padding = '8px 16px';
    closeBtn.style.backgroundColor = '#f0f0f0';
    closeBtn.style.color = '#333';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.marginTop = '15px';
    
    closeBtn.addEventListener('click', () => {
      modal.remove();
    });
    
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modalContent.appendChild(closeBtn);
    modal.appendChild(modalContent);
    
    document.body.appendChild(modal);
    
  } catch (error) {
    showAlert(`Error viewing summary: ${error.message}`, 'error');
  }
}

// Helper functions for UI feedback
function showProcessingMessage(message) {
  const id = 'hf-processing-' + Date.now();
  const processing = document.createElement('div');
  processing.id = id;
  processing.textContent = message;
  processing.style.position = 'fixed';
  processing.style.top = '20px';
  processing.style.right = '20px';
  processing.style.padding = '10px 20px';
  processing.style.backgroundColor = '#4f46e5';
  processing.style.color = 'white';
  processing.style.borderRadius = '4px';
  processing.style.zIndex = '1000';
  processing.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  document.body.appendChild(processing);
  return id;
}

function updateProcessingMessage(id, newMessage) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = newMessage;
    element.style.backgroundColor = '#10b981';
    setTimeout(() => {
      removeProcessingMessage(id);
    }, 3000);
  }
}

function removeProcessingMessage(id) {
  const element = document.getElementById(id);
  if (element) {
    document.body.removeChild(element);
  }
}

function showAlert(message, type = 'info') {
  const colors = {
    error: '#ef4444',
    info: '#3b82f6',
    success: '#10b981'
  };
  
  const alert = document.createElement('div');
  alert.textContent = message;
  alert.style.position = 'fixed';
  alert.style.bottom = '20px';
  alert.style.right = '20px';
  alert.style.padding = '12px 24px';
  alert.style.backgroundColor = colors[type] || colors.info;
  alert.style.color = 'white';
  alert.style.borderRadius = '4px';
  alert.style.zIndex = '1000';
  alert.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  document.body.appendChild(alert);
  
  setTimeout(() => {
    document.body.removeChild(alert);
  }, 5000);
}

async function startPipeline(filename, alreadySummarized) {
  const fs = require('fs');
  const path = require('path');
  const { GoogleGenAI } = require('path-to-google-genai-sdk'); // Adjust the import based on your setup

  const transcriptionDir = path.join(__dirname, 'transcription');
  const summarizeDir = path.join(__dirname, 'summarize');
  const filePath = path.join(transcriptionDir, filename);

  if (!fs.existsSync(filePath)) {
    showAlert(`Transcription file not found: ${filename}`, 'error');
    return;
  }

  // Read and preprocess the transcript
  let transcriptText = fs.readFileSync(filePath, 'utf8').trim();
  
  if (transcriptText.length === 0) {
    showAlert(`Transcription file is empty: ${filename}`, 'error');
    return;
  }

  // Initialize GoogleGenAI

  const ai = new GoogleGenAI({});

  // Set up progress tracking
  let progress = 0;
  const setProgress = (value, message) => {
    progress = value;
    updateProcessingMessage(processingId, `${message} (${value}%)`);
  };

  // Show initial processing message
  const processingId = showProcessingMessage(`Starting summarization pipeline for ${filename}...`);

  // If already summarized, just show the editor
  if (alreadySummarized) {
    setProgress(100, 'Summary already exists, opening editor...');
    setTimeout(() => {
      showEditor();
    }, 1000);
    return;
  }

  // Summarize with Gemini Pro
  try {
    const prompt = `Please summarize the following meeting content into structured meeting notes:\n\n${transcriptText}`;
    ai.models.generateContent({
      model: "gemini-pro",
      contents: prompt,
    }).then(response => {
      markdownContent = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      pdfContent = markdownContent;
      setProgress(80, 'Formatting markdown and PDF...');
      setTimeout(() => {
        // Save summary
        fs.writeFileSync(path.join(summarizeDir, `summary_${filename}`), markdownContent, 'utf8');
        setProgress(100, 'Ready to edit and finalize!');
        showEditor();
      }, 900);
    }).catch(err => {
      setProgress(0, 'Gemini API error: ' + err.message);
    });
  } catch (err) {
    setProgress(0, 'Gemini API error: ' + err.message);
    return;
  }
}
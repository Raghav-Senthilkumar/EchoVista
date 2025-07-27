# Audio Recorder & Transcriber Dashboard

A desktop app built with Electron that lets you record microphone and system audio, organize your recordings into folders, transcribe audio using the AssemblyAI SDK, and generate clean, formatted notes from your recordings.

## Features

- Record microphone and system audio simultaneously  
- Save recordings locally in `.mp3` format  
- Organize recordings into folders for easy management  
- Transcribe audio files automatically using AssemblyAI  
- Generate formatted text notes from transcriptions  
- Simple dashboard interface for managing recordings and transcriptions  

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root and add your AssemblyAI API key:

   ```
   ASSEMBLYAI_API_KEY=your_api_key_here
   ```

4. Start the app in development mode:

   ```bash
   npm start
   ```

## Usage

- Use the dashboard to start and stop audio recording (mic + system audio).  
- Recordings are saved under the `recordings/` folder by default.  
- Organize your recordings by creating and selecting folders within the app.  
- Select a recording and trigger transcription using AssemblyAI.  
- View the generated formatted notes for easy reading or exporting.  

## Folder Structure

- `input/` — (ignored by git) local input audio files  
- `recordings/` — (ignored by git) saved audio recordings  
- `transcription/` — (ignored by git) transcription text files  
- `node_modules/` — dependencies  
- `output/` — (ignored by git) any build or output files  

## .gitignore

The following folders are ignored from Git commits and pushes:

```
input/
node_modules/
output/
recordings/
transcription/
```

## Tech Stack

- [Electron](https://www.electronjs.org/) — cross-platform desktop app  
- [Node.js](https://nodejs.org/) — backend runtime and file management  
- [AssemblyAI SDK](https://www.assemblyai.com/docs) — speech-to-text transcription  
- HTML, CSS, and JavaScript — user interface  

## Contributing

Contributions welcome! Feel free to open issues or submit pull requests.

## License

MIT License © 2025 Your Name

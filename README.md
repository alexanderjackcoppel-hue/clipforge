# ClipForge

A local web app for creating YouTube Shorts from YouTube, Instagram, and TikTok videos. Download a clip, trim it to vertical 9:16, add auto-generated subtitles, a voiceover, and an image overlay — then export a ready-to-upload MP4.

## Prerequisites

Install the required CLI tools:

```bash
brew install ffmpeg
brew install yt-dlp
brew install whisper-cpp
whisper-cpp --download-model base
```

- **ffmpeg** — required for video encoding
- **yt-dlp** — required for video downloading
- **whisper-cpp** — optional, needed only for subtitle generation

## Setup

```bash
git clone <repo> && cd clipforge
npm install
npm run dev
# Open http://localhost:3000
```

The Next.js frontend runs on port 3000. The Express API server runs on port 3001 (bound to 127.0.0.1 only). Next.js rewrites proxy all `/api/*`, `/jobs/*`, and `/files/*` requests to the API server.

## Features

### 1. Import Video
Paste a YouTube, Instagram, or TikTok URL. The app downloads the best available MP4 using yt-dlp and shows real-time download progress.

### 2. Trim Clip
Enter start and end times (mm:ss format). FFmpeg trims the video and re-encodes it to 1080×1920 vertical format (9:16 aspect ratio) suitable for YouTube Shorts.

### 3. Subtitles
Toggle subtitles on and click "Generate Subtitles" to auto-transcribe the clip using whisper-cpp. Edit any subtitle line. Customise font size (24–72px), color (white/yellow/black/custom), and position (top/middle/bottom).

### 4. Voiceover
Toggle voiceover on and upload an audio file (MP3, WAV, M4A, AAC). Two sliders control the mix: original audio volume and voiceover volume (both 0–100%).

### 5. Overlay Image
Toggle overlay on and upload a PNG, JPEG, or WebP image. Choose position using a 3×3 grid picker (top-left, top-right, center, bottom-left, bottom-right) and set the size as a percentage of frame width (5–50%).

### 6. Export
Click "Export for YouTube Shorts" to run the final FFmpeg encode combining all elements. Download the finished 1080×1920 MP4.

## Architecture

- **Next.js 14** (App Router, TypeScript, Tailwind CSS) on port 3000
- **Express** (TypeScript, tsx) on port 3001
- SSE (Server-Sent Events) for real-time job progress
- In-memory job queue with max 1 concurrent job
- Temp files stored in `/tmp/clipforge/<jobId>/`, cleaned up after 2 hours

## Security Notes

- The API server binds to `127.0.0.1` only — not accessible from other machines on your network.
- All video downloads use `spawn()` with argument arrays, never shell string interpolation.
- Only YouTube, Instagram, and TikTok URLs are accepted.
- Job IDs are validated against a UUID regex before use in file paths.
- File uploads are limited to 100MB and restricted to known audio/image MIME types.

## Node version

Requires Node.js >= 20. Use [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm use
```

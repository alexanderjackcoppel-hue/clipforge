# ClipForge

A local web app for creating YouTube Shorts from YouTube, Instagram, and TikTok videos. Download a clip, trim it, add effects, captions, watermarks, and export a ready-to-upload MP4. No cloud, no subscription.

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

### 2. Trim & Clip
Set start/end times with a visual timeline scrubber. Create multiple clips from one video. Drag to reorder clips. Crop any clip to a specific region. Detect and remove silences automatically.

### 3. Video Effects (21 presets)
Apply color and style effects with live preview:
- **Basic:** Normal, Warm, Cool, Vivid, Cinematic, B&W, Faded, Night
- **Stylized FX:** Vintage, Retro, Cyberpunk, Dreamy, Film, Vignette, Hi-Con, Bleach, Teal&Orange, Sunset, Arctic, Neon, Sepia, Lomo, Chrome, Noir, Pop Art, Golden, Moody, Pastel

Also per-clip: speed (0.25x–2x), flip H/V, reverse, fade in/out, zoom.

### 4. Platform Presets
Export for YouTube Shorts, Instagram Reels, TikTok, Twitter/X, LinkedIn, Pinterest, or custom dimensions. Four visual styles: Regular, Social Post, Cinematic, Blur Background.

### 5. Captions & Text
Auto-transcribe with whisper-cpp. Three text layers (auto + 2 custom). 8 caption style presets (Clean, Impact, Hormozi, Neon, Soft, Fire, Gold, Minimal). Emoji stickers with drag positioning.

### 6. Audio
- Voiceover: upload audio or generate from text (TTS)
- Background music with volume, fade in/out, and loop
- Audio ducking (auto-lower music when speech detected)
- Lower thirds (name + subtitle overlay with templates)

### 7. Watermarks
Two independent watermarks, each with:
- **Text mode:** custom text, 9 color presets + picker, thickness slider, Trebuchet MS font
- **Image mode:** upload PNG/JPG
- Outline/stroke with color picker
- 5 position presets + draggable custom positioning
- Size and opacity controls

### 8. Overlay
Upload a PNG/JPEG/WebP image overlay. Drag to position in preview. Adjust size, rotation, and opacity.

### 9. Export
- Custom filename per clip
- Save directly to a configured folder (persists across sessions)
- Browser download option
- Export all clips at once
- Undo/redo (Cmd+Z / Cmd+Shift+Z)

## Architecture

- **Next.js 14** (App Router, TypeScript, Tailwind CSS) on port 3000
- **Express** (TypeScript, bun) on port 3001
- SSE (Server-Sent Events) for real-time job progress
- Job queues: IO (2 concurrent), Render (2), AI (1)
- Hardware-accelerated encoding (VideoToolbox on macOS)
- Temp files stored in `/tmp/clipforge/<jobId>/`, cleaned up after 2 hours

## Design System

Dark-only UI with violet (#7c3aed) accent. See `DESIGN.md` for the full design system:
- Blue-tinted surface colors (not flat black)
- Icon rail sidebar (72px, Lucide React)
- Instrument Sans + JetBrains Mono typography
- Glassmorphism panels with backdrop blur

## Security Notes

- The API server binds to `127.0.0.1` only — not accessible from other machines.
- All video downloads use `spawn()` with argument arrays, never shell interpolation.
- Only YouTube, Instagram, and TikTok URLs are accepted.
- Job IDs validated against UUID regex before use in file paths.
- File uploads limited to 100MB with MIME type restrictions.

## Testing

```bash
bun x vitest run    # 135 tests
bun run build       # TypeScript + Next.js build
```

## Node version

Requires Node.js >= 20.

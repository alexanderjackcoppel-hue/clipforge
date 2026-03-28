# Changelog

## 1.1.0 — 2026-03-28

### Features
- **Universal platform presets** — 11 presets across YouTube, Instagram, TikTok, Twitter/X, LinkedIn, Pinterest, and Custom, each with correct aspect ratio, resolution, and max duration
- **3-column editor layout** — TopBar + Sidebar step navigation + Preview canvas + PropertiesPanel (right)
- **Custom preset dimensions** — user-editable width/height with even-pixel enforcement; TopBar correctly displays the resolved dimensions
- **Visual styles** — standard, social-post (padded), cinematic (bars), blur-bg modes in FormatStep
- **Emoji sticker tab** — add/remove/resize emoji overlays on the subtitle canvas
- **Second subtitle track** — independent custom2 track with its own style controls
- **Text alignment** — center/left align option for all subtitle tracks
- **Background music** — VoiceoverStep now supports a background music file with independent volume mixing
- **Thumbnail extraction** — `POST /api/thumbnail` extracts a frame at a given timestamp
- **TTS route** — `POST /api/tts` stub for voiceover generation
- **Blur-bg visual format** — blurred background with crisp foreground video, configurable bar height

### Bug Fixes
- **TopBar dimension display** — custom preset now shows the user-configured dimensions instead of the placeholder 1080×1920
- **SSE proxy flush** — `res.end()` is called after terminal (done/error) events so the Next.js dev proxy flushes immediately and `EventSource` receives the final event
- **Focus-visible rings** — all new navigation buttons (Sidebar steps, export link, TopBar preset picker, PlatformStep radio buttons) now show a violet-600 focus ring for keyboard users

### Tests
- Added `buildExportArgs` test case for non-default `outputWidth`/`outputHeight` (1280×720) to verify platform dimensions propagate into the scale filter

## 1.0.0 — initial release

Single-clip YouTube Shorts editor with trim, transcribe, export, and AI video analysis.

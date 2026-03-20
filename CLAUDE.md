# CLAUDE.md — ClipForge

## Project
Local web app for YouTube Shorts creation. Next.js 14 frontend (port 3000) + Express API server (port 3001, `127.0.0.1` only). Run with `npm run dev`.

## Architecture
- `app/` — Next.js pages and components
- `server/` — Express API (download, trim, transcribe, export routes)
- `hooks/` — React hooks (SSE job progress tracking)
- `lib/` — Client-side API helpers

## Design System
Always read `DESIGN.md` before making any visual or UI decisions. All font choices, colors, spacing, and aesthetic direction are defined there. Do not deviate without explicit user approval. In QA mode, flag any code that doesn't match `DESIGN.md`.

Key rules:
- Primary font: **Instrument Sans** — must be loaded from Google Fonts
- Mono font: **JetBrains Mono** — all `font-mono` classes, timestamps, percentages, technical values (Geist Mono not available in Next.js 14 Google Fonts)
- Primary accent: `violet-600` (`#7c3aed`) — no other accent colors
- Clip rows inside step cards use `bg-zinc-800/50 border border-zinc-700/50` (not `bg-zinc-900`)
- Dark-only — never add light mode

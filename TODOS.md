# TODOS

## Non-YouTube download progress verification
**What:** Manually verify that yt-dlp download progress (the `[download] X%` regex) fires correctly for Instagram Reels and TikTok URLs — not just YouTube.
**Why:** The regex fires on yt-dlp's standard output format, which should be platform-agnostic, but this has never been verified for non-YouTube sources.
**Pros:** Confirms progress bar works across all three supported platforms.
**Cons:** Requires test accounts / real URLs for each platform.
**Context:** See `server/routes/download.ts` — `onStdout` handler, line ~30. The regex `\[download\]\s+([\d.]+)%` should match yt-dlp output universally, but yt-dlp sometimes uses different progress formats for certain extractors.
**Depends on:** None.

---

## Surface 60-second duration warning in UI
**What:** Show a visible UI warning (not a hard error) when the trim duration exceeds 60 seconds.
**Why:** YouTube Shorts rejects videos longer than 60s. Currently only a `console.warn` fires — the user has no indication until their upload fails on YouTube.
**Pros:** Saves users the frustration of a successful export that can't be uploaded.
**Cons:** Minor — adds a conditional warning component to TrimStep.
**Context:** See `server/routes/trim.ts` — `console.warn` on line ~30 when `duration > 60`. The warning should be surfaced back to the frontend as part of the trim response (e.g. `{ jobId, durationWarning: true }`) and displayed in the TrimStep UI.
**Depends on:** None.

---

## Detect dead jobs on SSE error (server restart recovery)
**What:** When the SSE connection fails repeatedly (e.g. after a server restart), show the user a "Server restarted — please refresh" message instead of silently hanging.
**Why:** If the Express server restarts mid-job, `useJobProgress` enters an infinite SSE reconnect loop. The UI shows a spinner forever. The user has no path forward except to guess they should refresh.
**Pros:** Makes the app resilient to the very common dev workflow: `ctrl+C` + `npm run dev`.
**Cons:** Requires a retry counter in `useJobProgress` and a new error state in AppState.
**Context:** See `hooks/useJobProgress.ts` — `es.onerror` handler is currently a no-op. After N retries (e.g. 5), fire a special `{ type: 'error', message: 'server_restart' }` synthetic event. Each step component can handle this gracefully.
**Depends on:** None.

# TODOS

## Non-YouTube download progress verification
**What:** Manually verify that yt-dlp download progress (the `[download] X%` regex) fires correctly for Instagram Reels and TikTok URLs — not just YouTube.
**Why:** The regex fires on yt-dlp's standard output format, which should be platform-agnostic, but this has never been verified for non-YouTube sources.
**Pros:** Confirms progress bar works across all three supported platforms.
**Cons:** Requires test accounts / real URLs for each platform.
**Context:** See `server/routes/download.ts` — `onStdout` handler, line ~30. The regex `\[download\]\s+([\d.]+)%` should match yt-dlp output universally, but yt-dlp sometimes uses different progress formats for certain extractors.
**Depends on:** None.

---

## ~~Surface 60-second duration warning in UI~~ ✓ DONE — Added yellow warning banner in `TrimStep.tsx` on 2026-03-19.

---

## Detect dead jobs on SSE error (server restart recovery)
**What:** When the SSE connection fails repeatedly (e.g. after a server restart), show the user a "Server restarted — please refresh" message instead of silently hanging.
**Why:** If the Express server restarts mid-job, `useJobProgress` enters an infinite SSE reconnect loop. The UI shows a spinner forever. The user has no path forward except to guess they should refresh.
**Pros:** Makes the app resilient to the very common dev workflow: `ctrl+C` + `npm run dev`.
**Cons:** Requires a retry counter in `useJobProgress` and a new error state in AppState.
**Context:** See `hooks/useJobProgress.ts` — `es.onerror` handler is currently a no-op. After N retries (e.g. 5), fire a special `{ type: 'error', message: 'server_restart' }` synthetic event. Each step component can handle this gracefully.
**Depends on:** None.

---

## ~~Create DESIGN.md~~ ✓ DONE — Fixed by `/design-consultation` on 2026-03-19. See `DESIGN.md`.

---

## Keyboard navigation in clip list
**What:** Add arrow-key navigation between clips in TrimStep.
**Why:** Keyboard users cannot move between clips without Tab. For 5+ clips this is friction. Found during `/plan-design-review`.
**Pros:** Meets WCAG 2.1 AA composite widget pattern. ~20 lines.
**Cons:** Requires managing focus with refs.
**Context:** Each clip row has a label-edit button, trim button, delete button. Arrow keys should move between rows; Enter activates trim.
**Depends on:** Nothing.

---

## Screen reader announcement on clip add
**What:** Add a visually-hidden `aria-live` region announcing "Clip N added" when `onAddClip` fires in TrimStep.
**Why:** No audio feedback on clip add. Screen reader users have no confirmation. Found during `/plan-design-review`.
**Pros:** ~5 lines, `aria-live="polite"`.
**Cons:** Negligible.
**Context:** `TrimStep.tsx`.
**Depends on:** Nothing.

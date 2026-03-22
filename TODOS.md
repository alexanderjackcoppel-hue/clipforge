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

## ~~Detect dead jobs on SSE error (server restart recovery)~~ ✓ DONE — Fixed on 2026-03-22. `useJobProgress` now counts consecutive `onerror` events; after 5 with no successful message it emits `{ type: 'error', message: 'server_restart' }` and closes. ImportStep and TrimStep show "Server restarted — please refresh" to the user. 4 regression tests added.

---

## ~~Create DESIGN.md~~ ✓ DONE — Fixed by `/design-consultation` on 2026-03-19. See `DESIGN.md`.

---

## ~~Keyboard navigation in clip list~~ ✓ DONE — Fixed on 2026-03-22. Clip rows now have `tabIndex=0 role="listitem"` with `ArrowDown/Up` navigation, `Enter` to trim, `Delete/Backspace` to remove. `focus-visible:ring-violet-500` ring shows keyboard focus.

---

## ~~Screen reader announcement on clip add~~ ✓ DONE — Fixed on 2026-03-22. `aria-live="polite"` region in TrimStep announces "Clip N added" on each `onAddClip`, auto-clears after 1.5s.

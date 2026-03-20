# Design System — ClipForge

## Product Context
- **What this is:** Local web app for creating YouTube Shorts from downloaded social video
- **Who it's for:** Technical content creators, developer-YouTubers, social media editors who want a no-cloud, no-subscription tool
- **Space/industry:** Video editing tools / creator tooling (peers: CapCut, Descript, Runway)
- **Project type:** Single-page web app — sequential step workflow, data-dense, power-user oriented

## Aesthetic Direction
- **Direction:** Industrial / Utilitarian — "Developer-grade creator tool"
- **Decoration level:** Minimal — the workflow is the interface; no decoration that doesn't earn its place
- **Mood:** Precise, purposeful, fast. The tool should feel like a well-engineered CLI wrapped in a thoughtful UI. Vercel/Linear energy applied to video editing. No gradients, no hero imagery, no ambient glow.
- **Competitive position:** CapCut is consumer/teal, Descript is editorial/maroon, Runway is cinematic/monochrome. ClipForge owns the **violet + developer-tools** space — nobody else in video editing is here.

## Typography

- **UI + headings:** [Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans) — geometric, warm-neutral, precise without being cold. Not associated with a big brand.
  - Load via: `https://fonts.googleapis.com/css2?family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`
- **Mono (timestamps, percentages, file paths, technical values):** [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) — precise, legible, designed for technical content. Used exclusively for `font-mono` instances. Every timestamp should feel like a code value.
  - Load via: `https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap`
- **Code:** JetBrains Mono (same as above)

### Type Scale
| Role          | Size  | Weight | Letter-spacing | Class example        |
|---------------|-------|--------|----------------|----------------------|
| Display       | 38px  | 700    | -0.03em        | Hero headings        |
| Section h2    | 22px  | 600    | -0.02em        | Step card titles     |
| Body          | 15px  | 400    | 0              | Descriptions, copy   |
| UI label      | 13px  | 500    | 0              | Buttons, form labels |
| Small / meta  | 11–12px | 500  | 0              | Captions, hint text  |
| Mono          | 11–13px | 400–500 | 0            | Timestamps, %s, paths |

## Color

- **Approach:** Restrained — single violet accent + cool neutral scale. Color is rare and meaningful; it's not decoration.

### Palette
| Token         | Hex       | Tailwind        | Usage                                      |
|---------------|-----------|-----------------|--------------------------------------------|
| Primary       | `#7c3aed` | `violet-600`    | Buttons, progress bars, active states, step numbers |
| Primary hover | `#8b5cf6` | `violet-500`    | Button hover, interactive element hover    |
| Mono accent   | `#a78bfa` | `violet-400`    | Mono text (timestamps in violet context)   |
| Bg base       | `#09090b` | `zinc-950`      | Page background                            |
| Bg raised     | `#18181b` | `zinc-900`      | Step cards                                 |
| Bg float      | `#27272a` | `zinc-800`      | Input backgrounds, clip rows               |
| Border        | `#3f3f46` | `zinc-700`      | Card borders, input borders                |
| Border sub    | `#27272a` | `zinc-800`      | Subtle dividers, inner card borders        |
| Text hi       | `#f4f4f5` | `zinc-100`      | Primary text, headings                     |
| Text mid      | `#a1a1aa` | `zinc-400`      | Secondary text, labels                     |
| Text lo       | `#71717a` | `zinc-500`      | Placeholder, disabled, hint text           |
| Text dim      | `#52525b` | `zinc-600`      | Time range labels, decorative mono text    |
| Success       | `#34d399` | `emerald-400`   | Done states, success indicators            |
| Success bg    | `#047857` | `emerald-700`   | Download button background                 |
| Error         | `#f87171` | `red-400`       | Error text, error borders                  |
| Error bg      | `rgba(127,29,29,0.2)` | `red-900/20` | Error alert background            |
| Warning       | `#fbbf24` | `amber-400`     | Duration warning text                      |

### Dark mode
This is a dark-only tool. No light mode. Do not add light mode variants unless explicitly requested.

## Spacing
- **Base unit:** 4px
- **Density:** Compact — this is a power tool, not a marketing site. Information density is appropriate.

| Token | px  | Tailwind |
|-------|-----|----------|
| sp-1  | 4   | `p-1`    |
| sp-2  | 8   | `p-2`    |
| sp-3  | 12  | `p-3`    |
| sp-4  | 16  | `p-4`    |
| sp-6  | 24  | `p-6`    |
| sp-8  | 32  | `p-8`    |
| sp-12 | 48  | `p-12`   |
| sp-16 | 64  | `p-16`   |

- **Card padding:** `p-6` (24px)
- **Section gap:** `space-y-4` (16px) between step cards
- **Inner section gap:** `space-y-3` (12px) within a step card
- **Max content width:** `max-w-2xl` (42rem / 672px) centered

## Layout
- **Approach:** Grid-disciplined, single-column
- **Grid:** Single column, centered, constrained max-width
- **Max content width:** `max-w-2xl` (42rem)
- **Responsive:** Single column at all breakpoints. Two-column only for small paired inputs (e.g., start/end time). Never multi-column for step cards.

## Border Radius

| Token     | px   | Tailwind       | Usage                            |
|-----------|------|----------------|----------------------------------|
| radius-sm | 6px  | `rounded`      | Small pills, delete buttons      |
| radius-md | 10px | `rounded-lg`   | Buttons, inputs, clip rows       |
| radius-lg | 14px | `rounded-xl`   | Step cards, alert boxes          |
| radius-xl | 18px | `rounded-2xl`  | App shell, modal containers      |
| radius-full | 9999px | `rounded-full` | Progress bars, toggle pills |

## Motion
- **Approach:** Minimal-functional — only transitions that aid comprehension. No decorative animation.
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out) for all transitions
- **Duration:**
  - **Micro (color/hover):** 150ms — `transition-colors duration-150`
  - **Short (state change):** 200ms — `transition-all duration-200`
  - **Medium (progress bars):** 300ms — `transition-all duration-300`
- **Never use:** Entrance animations, scroll-driven effects, decorative loaders, skeleton shimmer (not needed for a local tool)

## Component Conventions

### Step Cards
```tsx
// Standard step card wrapper
<div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 transition-all duration-200">
  <div className="flex items-center gap-3 mb-5">
    <span className="bg-violet-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
      {n}
    </span>
    <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
  </div>
  {children}
</div>
```

### Clip Rows (inside step cards)
```tsx
// Use bg-zinc-800/50 (not bg-zinc-900) — must differentiate from card background
<div className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2.5">
```

### Inputs
```tsx
<input className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm" />
```

### Monospace values
All timestamps, percentages, frame counts, file paths, and technical measurements use `font-mono`. This is a design signal — it communicates precision.
```tsx
<span className="font-mono text-xs text-zinc-600">0:45→1:20</span>
<span className="font-mono text-xs text-zinc-400">62%</span>
```

### Error states
```tsx
<div className="bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3">
  <p className="text-red-400 text-sm">{error}</p>
</div>
```

### Progress bars
```tsx
// Standard: h-1.5 for download/export, h-1 for inline/mini
<div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
  <div className="bg-violet-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${percent}%` }} />
</div>
```

## Decisions Log

| Date       | Decision                             | Rationale |
|------------|--------------------------------------|-----------|
| 2026-03-19 | Initial design system created        | Created by `/design-consultation` based on codebase analysis + competitive research (CapCut, Descript, Runway) |
| 2026-03-19 | Violet-600 as primary accent         | Nobody in video editing owns violet. Signals "developer-grade creator tool" vs CapCut's teal/consumer positioning |
| 2026-03-19 | Instrument Sans for UI               | Geometric, warm-neutral, not brand-associated. Replaces implicit system-font fallback |
| 2026-03-19 | JetBrains Mono for technical values only | Monospace exclusively for timestamps/percentages reinforces precision signal. Geist Mono not available in Next.js 14 Google Fonts integration. |
| 2026-03-19 | Clip rows use bg-zinc-800/50         | Differentiates clip rows from step card background (zinc-900). Found during `/plan-design-review` audit |
| 2026-03-19 | Dark-only, no light mode             | Creator tools live in dark. Light mode adds complexity without user demand for this product |

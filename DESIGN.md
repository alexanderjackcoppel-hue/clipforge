# Design System — ClipForge

## Product Context
- **What this is:** Local web app for creating YouTube Shorts from downloaded social video
- **Who it's for:** Technical content creators, developer-YouTubers, social media editors who want a no-cloud, no-subscription tool
- **Space/industry:** Video editing tools / creator tooling (peers: CapCut, Descript, Runway)
- **Project type:** Single-page web app — sequential step workflow, data-dense, power-user oriented

## Aesthetic Direction
- **Direction:** Industrial / Utilitarian — "Developer-grade creator tool"
- **Decoration level:** Minimal — the workflow is the interface; no decoration that doesn't earn its place
- **Mood:** Precise, purposeful, fast. The tool should feel like a well-engineered CLI wrapped in a thoughtful UI. Vercel/Linear energy applied to video editing. Subtle ambient gradient orbs (violet top-left, blue bottom-right) provide depth for glassmorphic panels.
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

### Surface System (blue-tinted layered darks)
| Token         | Hex       | Tailwind        | Usage                                      |
|---------------|-----------|-----------------|--------------------------------------------|
| Surface base  | `#0f0f14` | `bg-surface-base` | Page background (blue-tinted, not pure black) |
| Surface 1     | `#1a1a24` | `bg-surface-1`  | Panels, sidebar, step cards                |
| Surface 2     | `#222230` | `bg-surface-2`  | Input backgrounds, clip rows, cards        |
| Surface 3     | `#2a2a3a` | `bg-surface-3`  | Hover states, active items                 |
| Border subtle | `rgba(255,255,255,0.06)` | `border-subtle` | Glass panel borders       |
| Border default| `#2e2e3e` | `border-border` | Card borders, input borders                |
| Border bright | `#3a3a4e` | `border-bright` | Hover borders                              |

### Accent Palette
| Token         | Hex       | Tailwind        | Usage                                      |
|---------------|-----------|-----------------|--------------------------------------------|
| Primary       | `#7c3aed` | `violet-600`    | Buttons, progress bars, active states      |
| Primary hover | `#8b5cf6` | `violet-500`    | Button hover, interactive element hover    |
| Mono accent   | `#a78bfa` | `violet-400`    | Mono text, sidebar active icons            |
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
- **Approach:** Purposeful — transitions that aid comprehension plus micro-delight at key moments.
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out) for all transitions
- **Duration:**
  - **Micro (color/hover):** 150ms — `transition-colors duration-150`
  - **Short (state change):** 200ms — `transition-all duration-200`
  - **Medium (progress bars):** 300ms — `transition-all duration-300`
- **Allowed animations:**
  - **Progress shimmer:** Diagonal white-to-transparent gradient sweep on active progress bars (`.progress-shimmer`)
  - **Step transitions:** 150ms slide-up + fade when switching step panels (`.step-content-enter`)
  - **Export celebration:** 300ms scale-in on export completion row; ring-pulse on checkmarks
  - **Completion glow:** 600ms violet box-shadow pulse when progress reaches 100%
- **Never use:** Scroll-driven effects, skeleton shimmer, decorative loaders

## Glassmorphism

Sidebar, top bar, properties panel, and dropdowns use translucent glass surfaces:
```css
.glass-panel {
  background: rgba(24, 24, 27, 0.65);
  backdrop-filter: blur(16px);
  border-color: rgba(255, 255, 255, 0.06);
}
```

The ambient background gradient orbs (`.ambient-bg`) on the main container provide the color underneath that makes the glass visible. Without them, glass on flat black is invisible.

## Sidebar

Icon rail navigation (72px wide). Each step: centered Lucide icon (20px, strokeWidth 1.8) + label below (10px text). Active state: `rounded-xl bg-surface-3 border border-violet-500/20` with violet icon fill. Completed: small emerald dot at top-right of icon. Package: `lucide-react`.

## Component Conventions

### Buttons
```tsx
// Primary (gradient)
<button className="btn-gradient btn-press text-white font-semibold rounded-lg px-6 py-2.5 text-sm">
  Export
</button>

// Secondary
<button className="bg-surface-2 hover:bg-surface-3 border border-border text-zinc-300 rounded-lg px-4 py-2.5 text-sm transition-colors">
  Choose File
</button>
```

### Segmented Tab Control
```tsx
<div className="flex gap-0.5 bg-surface-2 rounded-lg p-[3px] border border-border">
  <button className={active ? 'bg-violet-600 text-white rounded-md' : 'text-zinc-500'}>Tab</button>
</div>
```

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
| 2026-03-29 | Ambient gradient orbs + glassmorphism | Flat dark surfaces feel utilitarian. Subtle violet/blue gradient orbs at 5-8% opacity give depth; glass panels float over them. Researched CapCut, Runway, Opus Clip patterns |
| 2026-03-29 | Progress bar shimmer animation       | Static progress fills don't signal activity. Diagonal white sweep (1.5s loop) signals the app is working |
| 2026-03-29 | Step panel slide-in transition       | Instant content swap on step change feels jarring. 150ms slide-up + fade matches Linear's panel transitions |
| 2026-03-29 | Richer empty state with drop-zone    | First-time experience matters. Dashed violet border + "Paste a URL" + Cmd+V hint is more inviting than a small icon |
| 2026-03-29 | Sidebar active state glow            | Step number gets violet box-shadow glow + bg-violet-600/10 tint. Makes active step feel alive |
| 2026-03-29 | Export celebration animation         | Scale-in + ring-pulse on completion provides micro-delight. Subtle enough to not annoy on repeat |
| 2026-04-05 | Surface colors: blue-tinted darks    | Replaced flat zinc grays (#09090b/#18181b/#27272a) with blue-tinted surfaces (#0f0f14/#1a1a24/#222230). Gives depth like CapCut/Runway |
| 2026-04-05 | Sidebar: 72px icon rail              | Replaced 192px text sidebar with Lucide React icons + tiny labels. Reclaims 120px for preview. CapCut-style navigation |
| 2026-04-05 | Gradient primary buttons              | Export buttons use violet-500→violet-600 gradient with glow shadow. Feels premium vs flat bg-violet-600 |
| 2026-04-05 | Pill segmented tab control           | SubtitlesStep tabs use bg-surface-2 container + bg-violet-600 active pill. Matches CapCut/Linear pattern |
| 2026-04-05 | Export specs as pill badges           | Output format shown as individual pills (1080x1920, H.264, AAC, MP4) instead of plain text |

'use client'

export type VideoFormat = 'standard' | 'social-post' | 'cinematic' | 'blur-bg'

interface FormatStepProps {
  videoFormat: VideoFormat
  onFormatChange: (f: VideoFormat) => void
  // Social post
  socialBgColor: string
  onSocialBgColorChange: (c: string) => void
  // Cinematic
  cinematicBgColor: string
  onCinematicBgColorChange: (c: string) => void
  // Cinematic + blur-bg
  videoBarHeight: number
  onVideoBarHeightChange: (v: number) => void
  disabled: boolean
}

interface FormatDef {
  id: VideoFormat
  label: string
  description: string
  icon: React.ReactNode
}

const FORMATS: FormatDef[] = [
  {
    id: 'standard',
    label: 'Full Bleed',
    description: 'Video fills the entire 9:16 frame',
    icon: (
      <svg viewBox="0 0 36 64" className="w-9 h-16" fill="none">
        <rect x="0" y="0" width="36" height="64" rx="4" fill="#27272a" />
        <rect x="1" y="1" width="34" height="62" rx="3" fill="#6d28d9" opacity="0.7" />
        <path d="M13 24l13 8-13 8z" fill="white" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: 'social-post',
    label: 'Social Post',
    description: 'Video on a color background — resize & drag in preview',
    icon: (
      <svg viewBox="0 0 36 64" className="w-9 h-16" fill="none">
        <rect x="0" y="0" width="36" height="64" rx="4" fill="#27272a" />
        <rect x="1" y="1" width="34" height="62" rx="3" fill="#e4e4e7" />
        <rect x="4" y="14" width="28" height="36" rx="2" fill="#6d28d9" opacity="0.75" />
        <path d="M14 28l10 6-10 6z" fill="white" opacity="0.6" />
      </svg>
    ),
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    description: 'Video centered with colored bars above and below',
    icon: (
      <svg viewBox="0 0 36 64" className="w-9 h-16" fill="none">
        <rect x="0" y="0" width="36" height="64" rx="4" fill="#27272a" />
        <rect x="1" y="1" width="34" height="62" rx="3" fill="#111" />
        <rect x="1" y="22" width="34" height="20" fill="#6d28d9" opacity="0.7" />
        <path d="M14 29l10 4-10 4z" fill="white" opacity="0.5" />
      </svg>
    ),
  },
  {
    id: 'blur-bg',
    label: 'Blur BG',
    description: 'Video centered with blurred video bars above and below',
    icon: (
      <svg viewBox="0 0 36 64" className="w-9 h-16" fill="none">
        <rect x="0" y="0" width="36" height="64" rx="4" fill="#27272a" />
        <rect x="1" y="1" width="34" height="62" rx="3" fill="#6d28d9" opacity="0.25" />
        <rect x="1" y="1" width="34" height="62" rx="3" fill="url(#blur-grad)" opacity="0.4" />
        <defs>
          <linearGradient id="blur-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4c1d95" />
          </linearGradient>
        </defs>
        <rect x="1" y="22" width="34" height="20" rx="1" fill="#6d28d9" opacity="0.85" />
        <path d="M14 29l10 4-10 4z" fill="white" opacity="0.7" />
      </svg>
    ),
  },
]

const PRESET_BG_COLORS = [
  { label: 'White',  value: 'FFFFFF' },
  { label: 'Black',  value: '000000' },
  { label: 'Cream',  value: 'FFF8DC' },
  { label: 'Slate',  value: '1E293B' },
  { label: 'Sand',   value: 'E8D5B0' },
  { label: 'Blush',  value: 'FFD6E0' },
  { label: 'Sky',    value: 'BAE6FD' },
  { label: 'Forest', value: '14532D' },
]

const PRESET_CINEMATIC_COLORS = [
  { label: 'Black',   value: '000000' },
  { label: 'White',   value: 'FFFFFF' },
  { label: 'Slate',   value: '1E293B' },
  { label: 'Navy',    value: '0F172A' },
  { label: 'Wine',    value: '4C0519' },
  { label: 'Forest',  value: '14532D' },
  { label: 'Sand',    value: 'E8D5B0' },
  { label: 'Cream',   value: 'FFF8DC' },
]

function ColorPicker({
  presets, value, onChange, label,
}: {
  presets: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
  label: string
}) {
  const hexToInput = (h: string) => `#${h}`
  const inputToHex = (v: string) => v.replace('#', '').toUpperCase().slice(0, 6).padEnd(6, '0')
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400">{label}</label>
      <div className="flex items-center gap-1.5 flex-wrap">
        {presets.map(p => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            title={p.label}
            className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all ${
              value === p.value ? 'border-violet-500 scale-110' : 'border-zinc-600 hover:border-zinc-400'
            }`}
            style={{ backgroundColor: `#${p.value}` }}
          />
        ))}
        <label className="flex items-center gap-1 text-xs text-zinc-500 cursor-pointer">
          Custom
          <input
            type="color"
            value={hexToInput(value)}
            onChange={e => onChange(inputToHex(e.target.value))}
            className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
          />
        </label>
      </div>
    </div>
  )
}

export default function FormatStep({
  videoFormat, onFormatChange,
  socialBgColor, onSocialBgColorChange,
  cinematicBgColor, onCinematicBgColorChange,
  videoBarHeight, onVideoBarHeightChange,
  disabled,
}: FormatStepProps) {
  return (
    <div className={`space-y-4 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {/* Format grid */}
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Video format">
        {FORMATS.map(f => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={videoFormat === f.id}
            onClick={() => onFormatChange(f.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-left ${
              videoFormat === f.id
                ? 'border-violet-500 bg-violet-600/10'
                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
            }`}
          >
            {f.icon}
            <div className="w-full">
              <p className={`text-xs font-semibold ${videoFormat === f.id ? 'text-violet-300' : 'text-zinc-300'}`}>{f.label}</p>
              <p className="text-[10px] text-zinc-500 leading-tight mt-0.5">{f.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Format-specific settings */}
      {videoFormat === 'social-post' && (
        <div className="space-y-3 bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <ColorPicker
            presets={PRESET_BG_COLORS}
            value={socialBgColor}
            onChange={onSocialBgColorChange}
            label="Background Color"
          />
          <p className="text-[10px] text-zinc-600">Drag to reposition video in the preview. Drag corners to resize.</p>
        </div>
      )}

      {videoFormat === 'cinematic' && (
        <div className="space-y-3 bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <ColorPicker
            presets={PRESET_CINEMATIC_COLORS}
            value={cinematicBgColor}
            onChange={onCinematicBgColorChange}
            label="Bar Color"
          />
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-400">
              <label>Bar Height</label>
              <span className="font-mono text-zinc-300">{videoBarHeight}%</span>
            </div>
            <input
              type="range" min={5} max={45} step={1}
              value={videoBarHeight}
              onChange={e => onVideoBarHeightChange(Number(e.target.value))}
              className="w-full"
              aria-label="Bar height"
            />
          </div>
        </div>
      )}

      {videoFormat === 'blur-bg' && (
        <div className="space-y-3 bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-400">
              <label>Bar Height</label>
              <span className="font-mono text-zinc-300">{videoBarHeight}%</span>
            </div>
            <input
              type="range" min={5} max={45} step={1}
              value={videoBarHeight}
              onChange={e => onVideoBarHeightChange(Number(e.target.value))}
              className="w-full"
              aria-label="Bar height"
            />
          </div>
          <p className="text-[10px] text-zinc-600">Bars are filled with a blurred version of your video.</p>
        </div>
      )}

      {videoFormat === 'standard' && (
        <div className="bg-zinc-900 rounded-xl p-3 border border-zinc-800">
          <p className="text-xs text-zinc-500">Video fills the entire 9:16 frame. No bars or background.</p>
        </div>
      )}
    </div>
  )
}

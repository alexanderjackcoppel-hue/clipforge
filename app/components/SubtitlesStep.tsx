'use client'
import type { Clip } from '../page'

interface SubtitleLine {
  id: number
  start: number
  end: number
  text: string
}

interface SubtitlesStepProps {
  clips: Clip[]               // only trimmed clips
  activeClipId: string | null
  onActiveClipChange: (id: string) => void
  onToggle: (v: boolean) => void
  onGenerate: () => void
  onLinesChange: (lines: SubtitleLine[]) => void
  fontSize: number
  onFontSizeChange: (v: number) => void
  color: string
  onColorChange: (v: string) => void
  position: 'top' | 'middle' | 'bottom'
  onPositionChange: (v: 'top' | 'middle' | 'bottom') => void
  disabled: boolean
}

const PRESET_COLORS = [
  { label: 'White', value: 'FFFFFF' },
  { label: 'Yellow', value: 'FFFF00' },
  { label: 'Black', value: '000000' },
]

export default function SubtitlesStep({
  clips,
  activeClipId,
  onActiveClipChange,
  onToggle,
  onGenerate,
  onLinesChange,
  fontSize,
  onFontSizeChange,
  color,
  onColorChange,
  position,
  onPositionChange,
  disabled,
}: SubtitlesStepProps) {
  const activeClip = clips.find(c => c.id === activeClipId) ?? clips[0] ?? null
  const enabled = activeClip?.subtitlesEnabled ?? false
  const status = activeClip?.subtitleStatus ?? 'idle'
  const error = activeClip?.subtitleError ?? null
  const lines = activeClip?.subtitleLines ?? []

  const hexToInput = (hex: string) => `#${hex}`
  const inputToHex = (val: string) => val.replace('#', '').toUpperCase()

  const handleTextChange = (id: number, text: string) => {
    onLinesChange(lines.map(l => l.id === id ? { ...l, text } : l))
  }

  if (clips.length === 0) {
    return <p className="text-sm text-zinc-500">Trim at least one clip to generate subtitles.</p>
  }

  return (
    <div className={`space-y-4 ${disabled ? 'pointer-events-none' : ''}`}>
      {/* Clip selector — shown when multiple trimmed clips */}
      {clips.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400 whitespace-nowrap">Generate subtitles for:</span>
          <select
            value={activeClip?.id ?? ''}
            onChange={e => onActiveClipChange(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          >
            {clips.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
            enabled ? 'bg-violet-600' : 'bg-zinc-700'
          }`}
          aria-pressed={enabled}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-zinc-300">{enabled ? 'Subtitles on' : 'Subtitles off'}</span>
      </div>

      {enabled && (
        <div className="space-y-4">
          {/* Generate button */}
          <button
            type="button"
            onClick={onGenerate}
            disabled={status === 'loading'}
            className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors duration-150"
          >
            {status === 'loading' ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Transcribing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Generate Subtitles
              </>
            )}
          </button>

          {error && (
            <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Style controls */}
          <div className="space-y-4 border-t border-zinc-800 pt-4">
            <h3 className="text-sm font-medium text-zinc-300">Style</h3>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-400">
                <label>Font Size</label>
                <span>{fontSize}px</span>
              </div>
              <input
                type="range"
                min={24}
                max={72}
                value={fontSize}
                onChange={e => onFontSizeChange(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-zinc-600">
                <span>24</span>
                <span>72</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Color</label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => onColorChange(p.value)}
                    title={p.label}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === p.value ? 'border-violet-500 scale-110' : 'border-zinc-600 hover:border-zinc-400'
                    }`}
                    style={{ backgroundColor: `#${p.value}` }}
                  />
                ))}
                <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer">
                  <span>Custom:</span>
                  <input
                    type="color"
                    value={hexToInput(color)}
                    onChange={e => onColorChange(inputToHex(e.target.value))}
                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Position</label>
              <div className="flex gap-2">
                {(['top', 'middle', 'bottom'] as const).map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => onPositionChange(p)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      position === p
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {lines.length > 0 && (
            <div className="space-y-3 border-t border-zinc-800 pt-4">
              <h3 className="text-sm font-medium text-zinc-300">Edit Subtitles ({lines.length} lines)</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {lines.map(line => (
                  <div key={line.id} className="flex gap-2 items-start">
                    <span className="text-xs text-zinc-600 mt-2 font-mono flex-shrink-0 w-10 text-right">
                      {Math.floor(line.start / 60)}:{String(Math.floor(line.start % 60)).padStart(2, '0')}
                    </span>
                    <textarea
                      value={line.text}
                      onChange={e => handleTextChange(line.id, e.target.value)}
                      rows={1}
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

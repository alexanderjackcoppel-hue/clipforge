'use client'
import { useRef } from 'react'

type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'

interface OverlayStepProps {
  enabled: boolean
  onToggle: (v: boolean) => void
  overlayFile: File | null
  onOverlayFile: (f: File | null) => void
  previewUrl: string | null
  overlayPosition: OverlayPosition
  onPositionChange: (v: OverlayPosition) => void
  overlayScale: number
  onScaleChange: (v: number) => void
  disabled: boolean
}

const POSITIONS: { id: OverlayPosition; row: number; col: number; label: string }[] = [
  { id: 'top-left', row: 1, col: 1, label: 'TL' },
  { id: 'top-right', row: 1, col: 3, label: 'TR' },
  { id: 'center', row: 2, col: 2, label: 'C' },
  { id: 'bottom-left', row: 3, col: 1, label: 'BL' },
  { id: 'bottom-right', row: 3, col: 3, label: 'BR' },
]

export default function OverlayStep({
  enabled,
  onToggle,
  overlayFile,
  onOverlayFile,
  previewUrl,
  overlayPosition,
  onPositionChange,
  overlayScale,
  onScaleChange,
  disabled,
}: OverlayStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    onOverlayFile(f)
  }

  return (
    <div className={`space-y-4 ${disabled ? 'pointer-events-none' : ''}`}>
      {/* Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-zinc-900 ${
            enabled ? 'bg-violet-600' : 'bg-zinc-700'
          }`}
          aria-pressed={enabled}
          aria-label={enabled ? 'Overlay on' : 'Overlay off'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-sm text-zinc-300">{enabled ? 'Overlay on' : 'Overlay off'}</span>
      </div>

      {enabled && (
        <div className="space-y-5">
          {/* File upload */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Image File</label>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 rounded-lg px-4 py-2.5 text-sm transition-colors duration-150"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Choose Image
              </button>
              <span className="text-sm text-zinc-400 truncate max-w-xs">
                {overlayFile ? overlayFile.name : 'No file chosen'}
              </span>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <p className="text-xs text-zinc-600">Supported: PNG, JPEG, WebP (max 100MB)</p>
          </div>

          {/* Preview thumbnail */}
          {previewUrl && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Preview</label>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Overlay preview"
                className="max-h-24 rounded-lg object-contain border border-zinc-700"
              />
            </div>
          )}

          {/* Position picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Position</label>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: 'repeat(3, 2.5rem)', gridTemplateRows: 'repeat(3, 2.5rem)' }}
              role="group"
              aria-label="Overlay position"
            >
              {POSITIONS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPositionChange(p.id)}
                  title={p.id.replace('-', ' ')}
                  style={{ gridRow: p.row, gridColumn: p.col }}
                  className={`w-10 h-10 rounded-lg text-xs font-bold transition-colors duration-150 ${
                    overlayPosition === p.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600 capitalize">{overlayPosition.replace('-', ' ')}</p>
          </div>

          {/* Size slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-zinc-300">
              <label>Size</label>
              <span className="text-zinc-400">{overlayScale}% of frame width</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              value={overlayScale}
              onChange={e => onScaleChange(Number(e.target.value))}
              className="w-full"
              aria-label="Overlay size"
            />
            <div className="flex justify-between text-xs text-zinc-600">
              <span>5%</span>
              <span>50%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

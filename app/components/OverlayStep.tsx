'use client'
import { useRef, useCallback } from 'react'

interface OverlayStepProps {
  enabled: boolean
  onToggle: (v: boolean) => void
  overlayFile: File | null
  onOverlayFile: (f: File | null) => void
  previewUrl: string | null
  overlayX: number
  overlayY: number
  onPositionChange: (x: number, y: number) => void
  overlayScale: number
  onScaleChange: (v: number) => void
  overlayRotation: number
  onRotationChange: (v: number) => void
  disabled: boolean
}

// Preview canvas: 9:16 frame, 108×192 px
const FRAME_W = 108
const FRAME_H = 192

export default function OverlayStep({
  enabled,
  onToggle,
  overlayFile,
  onOverlayFile,
  previewUrl,
  overlayX,
  overlayY,
  onPositionChange,
  overlayScale,
  onScaleChange,
  overlayRotation,
  onRotationChange,
  disabled,
}: OverlayStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null
    onOverlayFile(f)
  }

  const getPositionFromEvent = useCallback((e: MouseEvent | React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current
    if (!canvas) return { x: overlayX, y: overlayY }
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100))
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
  }, [overlayX, overlayY])

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    const { x, y } = getPositionFromEvent(e)
    onPositionChange(x, y)

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const pos = getPositionFromEvent(ev)
      onPositionChange(pos.x, pos.y)
    }
    const onUp = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [getPositionFromEvent, onPositionChange])

  // Image size in the preview canvas (as fraction of frame width)
  const imgPreviewW = Math.round(FRAME_W * overlayScale / 100)

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

          {/* Draggable position canvas */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-400">Position</label>
            <div className="flex items-start gap-4">
              {/* 9:16 canvas */}
              <div
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                className="relative flex-shrink-0 rounded-lg overflow-hidden border border-zinc-700 cursor-crosshair select-none"
                style={{ width: FRAME_W, height: FRAME_H, background: '#18181b' }}
                title="Click or drag to position the overlay"
              >
                {/* Grid lines hint */}
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'linear-gradient(#6d28d9 1px, transparent 1px), linear-gradient(90deg, #6d28d9 1px, transparent 1px)',
                  backgroundSize: `${FRAME_W/3}px ${FRAME_H/3}px`,
                }} />

                {/* Overlay image positioned at overlayX%, overlayY% */}
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Overlay"
                    draggable={false}
                    style={{
                      position: 'absolute',
                      width: imgPreviewW,
                      height: 'auto',
                      left: `${overlayX}%`,
                      top: `${overlayY}%`,
                      transform: `translate(-50%, -50%) rotate(${overlayRotation}deg)`,
                      pointerEvents: 'none',
                    }}
                  />
                ) : (
                  /* Placeholder dot */
                  <div
                    style={{
                      position: 'absolute',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: '#7c3aed',
                      left: `${overlayX}%`,
                      top: `${overlayY}%`,
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>

              <div className="flex-1 space-y-1 pt-1">
                <p className="text-xs text-zinc-500">Click or drag to place</p>
                <p className="text-xs font-mono text-zinc-500">
                  X {overlayX.toFixed(0)}% · Y {overlayY.toFixed(0)}%
                </p>
                <button
                  type="button"
                  onClick={() => onPositionChange(50, 50)}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-1"
                >
                  Reset to center
                </button>
              </div>
            </div>
          </div>

          {/* Size slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-zinc-300">
              <label>Size</label>
              <span className="text-zinc-400">{overlayScale}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={100}
              value={overlayScale}
              onChange={e => onScaleChange(Number(e.target.value))}
              className="w-full"
              aria-label="Overlay size"
            />
            <div className="flex justify-between text-xs text-zinc-600">
              <span>5%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Rotation slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm text-zinc-300">
              <label>Rotation</label>
              <span className="text-zinc-400">{overlayRotation}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={359}
              value={overlayRotation}
              onChange={e => onRotationChange(Number(e.target.value))}
              className="w-full"
              aria-label="Overlay rotation"
            />
            <div className="flex justify-between text-xs text-zinc-600">
              <span>0°</span>
              <span>359°</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

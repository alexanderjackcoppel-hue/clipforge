'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import type { Clip } from '../page'

interface CropRect { x: number; y: number; w: number; h: number }

interface TrimStepProps {
  clips: Clip[]
  onAddClip: (startSecs: number, endSecs: number) => void
  onRemoveClip: (clipId: string) => void
  onTrimClip: (clipId: string) => void
  onTrimAll: () => void
  onUpdateClipLabel: (clipId: string, label: string) => void
  onUpdateClipCrop: (clipId: string, crop: CropRect) => void
  onToggleClipFade: (clipId: string, field: 'fadeIn' | 'fadeOut', value: boolean) => void
  onToggleClipZoom: (clipId: string, value: boolean) => void
  onStartZoomSelect: (clipId: string) => void
  zoomSelectClipId: string | null
  cropEditClipId: string | null
  onStartCropEdit: (clipId: string) => void
  onEndCropEdit: () => void
  onSourceVideoAR: (ar: number) => void
  sourceVideoUrl: string | null
  disabled: boolean
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseTime(str: string): number {
  const parts = str.split(':')
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseFloat(parts[1])
  }
  return parseFloat(str)
}

// Check if a crop is effectively full-frame
function isFullFrame(crop: CropRect): boolean {
  return crop.x < 0.5 && crop.y < 0.5 && crop.w > 99.5 && crop.h > 99.5
}

// Clamp a number between min and max
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

export default function TrimStep({
  clips,
  onAddClip,
  onRemoveClip,
  onTrimClip,
  onTrimAll,
  onUpdateClipLabel,
  onUpdateClipCrop,
  onToggleClipFade,
  onToggleClipZoom,
  onStartZoomSelect,
  zoomSelectClipId,
  cropEditClipId,
  onStartCropEdit,
  onEndCropEdit,
  onSourceVideoAR,
  sourceVideoUrl,
  disabled,
}: TrimStepProps) {
  const [startSecs, setStartSecs] = useState(0)
  const [endSecs, setEndSecs] = useState(30)
  const [duration, setDuration] = useState(0)
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [videoAR, setVideoAR] = useState<number | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const cropVideoRef = useRef<HTMLVideoElement>(null)
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'start' | 'end' | null>(null)

  const startSecsRef = useRef(startSecs)
  const endSecsRef = useRef(endSecs)
  const durationRef = useRef(duration)
  useEffect(() => { startSecsRef.current = startSecs }, [startSecs])
  useEffect(() => { endSecsRef.current = endSecs }, [endSecs])
  useEffect(() => { durationRef.current = duration }, [duration])

  // Crop drag state
  type CropDragMode = 'idle' | 'drawing' | 'moving' | 'tl' | 'tr' | 'bl' | 'br'
  const cropDragMode = useRef<CropDragMode>('idle')
  const cropDragStart = useRef<{
    mx: number; my: number
    initCrop: CropRect
  } | null>(null)

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration
      setDuration(dur)
      setEndSecs(Math.min(30, dur))
      if (videoRef.current.videoWidth && videoRef.current.videoHeight) {
        const ar = videoRef.current.videoWidth / videoRef.current.videoHeight
        setVideoAR(ar)
        onSourceVideoAR(ar)
      }
    }
  }

  useEffect(() => {
    if (sourceVideoUrl) {
      setStartSecs(0)
      setEndSecs(30)
      setDuration(0)
      setVideoAR(null)
    }
  }, [sourceVideoUrl])

  const getSecsFromPointer = useCallback((e: MouseEvent | TouchEvent): number => {
    if (!timelineRef.current || durationRef.current === 0) return 0
    const rect = timelineRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return ratio * durationRef.current
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return
      const secs = getSecsFromPointer(e)
      if (dragging.current === 'start') {
        const clamped = Math.max(0, Math.min(secs, endSecsRef.current - 1))
        setStartSecs(clamped)
        if (videoRef.current) videoRef.current.currentTime = clamped
      } else {
        const clamped = Math.min(durationRef.current, Math.max(secs, startSecsRef.current + 1))
        setEndSecs(clamped)
        if (videoRef.current) videoRef.current.currentTime = clamped
      }
    }
    const onUp = () => { dragging.current = null }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [getSecsFromPointer])

  // ── Crop drag: global mouse events ──
  useEffect(() => {
    if (!cropEditClipId) return
    const clip = clips.find(c => c.id === cropEditClipId)
    if (!clip) return

    const onMove = (e: MouseEvent) => {
      if (cropDragMode.current === 'idle') return
      const container = cropContainerRef.current
      if (!container || !cropDragStart.current) return
      const rect = container.getBoundingClientRect()
      const dx = ((e.clientX - cropDragStart.current.mx) / rect.width) * 100
      const dy = ((e.clientY - cropDragStart.current.my) / rect.height) * 100
      const init = cropDragStart.current.initCrop
      let next: CropRect

      if (cropDragMode.current === 'drawing') {
        // Drawing: anchor = start corner, opposite = current mouse
        const anchorX = init.x
        const anchorY = init.y
        const curX = clamp(anchorX + dx, 0, 100)
        const curY = clamp(anchorY + dy, 0, 100)
        next = {
          x: Math.min(anchorX, curX),
          y: Math.min(anchorY, curY),
          w: Math.abs(curX - anchorX),
          h: Math.abs(curY - anchorY),
        }
      } else if (cropDragMode.current === 'moving') {
        next = {
          x: clamp(init.x + dx, 0, 100 - init.w),
          y: clamp(init.y + dy, 0, 100 - init.h),
          w: init.w,
          h: init.h,
        }
      } else if (cropDragMode.current === 'tl') {
        const newX = clamp(init.x + dx, 0, init.x + init.w - 5)
        const newY = clamp(init.y + dy, 0, init.y + init.h - 5)
        next = { x: newX, y: newY, w: init.x + init.w - newX, h: init.y + init.h - newY }
      } else if (cropDragMode.current === 'tr') {
        const newY = clamp(init.y + dy, 0, init.y + init.h - 5)
        const newW = clamp(init.w + dx, 5, 100 - init.x)
        next = { x: init.x, y: newY, w: newW, h: init.y + init.h - newY }
      } else if (cropDragMode.current === 'bl') {
        const newX = clamp(init.x + dx, 0, init.x + init.w - 5)
        const newH = clamp(init.h + dy, 5, 100 - init.y)
        next = { x: newX, y: init.y, w: init.x + init.w - newX, h: newH }
      } else { // br
        const newW = clamp(init.w + dx, 5, 100 - init.x)
        const newH = clamp(init.h + dy, 5, 100 - init.y)
        next = { x: init.x, y: init.y, w: newW, h: newH }
      }
      onUpdateClipCrop(cropEditClipId, next)
    }

    const onUp = () => {
      cropDragMode.current = 'idle'
      cropDragStart.current = null
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [cropEditClipId, clips, onUpdateClipCrop])

  // ── Crop container: mousedown to start drawing ──
  const handleCropMouseDown = (e: React.MouseEvent, clip: Clip) => {
    if (e.button !== 0) return
    e.preventDefault()
    const container = cropContainerRef.current
    if (!container) return
    const rect = container.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * 100
    const py = ((e.clientY - rect.top) / rect.height) * 100

    // Check if inside existing crop box (for move)
    const { cropX: x, cropY: y, cropW: w, cropH: h } = clip
    const inside = px >= x && px <= x + w && py >= y && py <= y + h

    cropDragMode.current = inside ? 'moving' : 'drawing'
    cropDragStart.current = {
      mx: e.clientX, my: e.clientY,
      initCrop: inside ? { x, y, w, h } : { x: px, y: py, w: 0, h: 0 },
    }
    if (!inside) {
      // Immediately set the crop to start point (will grow as user drags)
      onUpdateClipCrop(clip.id, { x: px, y: py, w: 0, h: 0 })
    }
  }

  // ── Corner handle mousedown ──
  const handleCornerMouseDown = (
    e: React.MouseEvent,
    mode: 'tl' | 'tr' | 'bl' | 'br',
    clip: Clip,
  ) => {
    e.stopPropagation()
    e.preventDefault()
    cropDragMode.current = mode
    cropDragStart.current = {
      mx: e.clientX, my: e.clientY,
      initCrop: { x: clip.cropX, y: clip.cropY, w: clip.cropW, h: clip.cropH },
    }
  }

  const secsToPercent = (secs: number) =>
    duration > 0 ? (secs / duration) * 100 : 0

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragging.current || !duration || !timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const secs = Math.max(0, Math.min(ratio * duration, duration))
    if (videoRef.current) videoRef.current.currentTime = secs
  }

  const idleOrErrorClips = clips.filter(c => c.trimStatus === 'idle' || c.trimStatus === 'error')

  const openCropEditor = (clip: Clip) => {
    onStartCropEdit(clip.id)
    // Sync crop video time to main video
    setTimeout(() => {
      if (cropVideoRef.current && videoRef.current) {
        cropVideoRef.current.currentTime = videoRef.current.currentTime
      }
    }, 50)
  }

  return (
    <div className={`space-y-4 ${disabled ? 'pointer-events-none' : ''}`}>
      {/* Source video + timeline scrubber */}
      {sourceVideoUrl && (
        <div className="space-y-3">
          <video
            ref={videoRef}
            src={sourceVideoUrl}
            onLoadedMetadata={handleLoadedMetadata}
            playsInline
            controls
            className="w-full max-h-[300px] rounded-lg object-contain bg-black"
          />

          {duration > 0 && (
            <div className="space-y-1.5">
              <div
                ref={timelineRef}
                className="relative h-8 bg-zinc-800 rounded-lg cursor-pointer select-none"
                onClick={handleTimelineClick}
              >
                <div
                  className="absolute top-0 bottom-0 left-0 bg-zinc-900/70 rounded-l-lg pointer-events-none"
                  style={{ width: `${secsToPercent(startSecs)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 right-0 bg-zinc-900/70 rounded-r-lg pointer-events-none"
                  style={{ width: `${100 - secsToPercent(endSecs)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 bg-violet-600/30 border-t border-b border-violet-500/50 pointer-events-none"
                  style={{
                    left: `${secsToPercent(startSecs)}%`,
                    width: `${secsToPercent(endSecs) - secsToPercent(startSecs)}%`,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-3 -translate-x-1/2 bg-violet-500 hover:bg-violet-400 rounded cursor-ew-resize flex items-center justify-center z-10 transition-colors"
                  style={{ left: `${secsToPercent(startSecs)}%` }}
                  onMouseDown={e => { e.preventDefault(); dragging.current = 'start' }}
                  onTouchStart={e => { e.stopPropagation(); dragging.current = 'start' }}
                >
                  <div className="w-px h-4 bg-white/70 rounded" />
                </div>
                <div
                  className="absolute top-0 bottom-0 w-3 -translate-x-1/2 bg-violet-500 hover:bg-violet-400 rounded cursor-ew-resize flex items-center justify-center z-10 transition-colors"
                  style={{ left: `${secsToPercent(endSecs)}%` }}
                  onMouseDown={e => { e.preventDefault(); dragging.current = 'end' }}
                  onTouchStart={e => { e.stopPropagation(); dragging.current = 'end' }}
                >
                  <div className="w-px h-4 bg-white/70 rounded" />
                </div>
              </div>

              <div className="flex justify-between text-xs font-mono">
                <span className="text-zinc-500">{formatTime(0)}</span>
                <span className="text-violet-400">{formatTime(endSecs - startSecs)} selected</span>
                <span className="text-zinc-500">{formatTime(duration)}</span>
              </div>
            </div>
          )}

          {/* Time inputs + Add Clip */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="start-time" className="block text-sm font-medium text-zinc-400 mb-1.5">
                Start (mm:ss)
              </label>
              <input
                id="start-time"
                type="text"
                value={formatTime(startSecs)}
                onChange={e => {
                  const secs = parseTime(e.target.value)
                  if (!isNaN(secs)) {
                    const clamped = Math.max(0, Math.min(secs, endSecs - 1))
                    setStartSecs(clamped)
                    if (videoRef.current) videoRef.current.currentTime = clamped
                  }
                }}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="end-time" className="block text-sm font-medium text-zinc-400 mb-1.5">
                End (mm:ss)
              </label>
              <input
                id="end-time"
                type="text"
                value={formatTime(endSecs)}
                onChange={e => {
                  const secs = parseTime(e.target.value)
                  if (!isNaN(secs) && duration > 0) {
                    const clamped = Math.min(duration, Math.max(secs, startSecs + 1))
                    setEndSecs(clamped)
                    if (videoRef.current) videoRef.current.currentTime = clamped
                  }
                }}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onAddClip(startSecs, endSecs)
                const newEnd = Math.min(endSecs + (endSecs - startSecs), duration)
                setStartSecs(endSecs)
                setEndSecs(newEnd > endSecs ? newEnd : Math.min(endSecs + 30, duration))
              }}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add Clip
            </button>
            {clips.length === 0 && (
              <span className="text-xs text-zinc-500">Drag the handles to select a range, then add it.</span>
            )}
          </div>
        </div>
      )}

      {/* Clip list */}
      {clips.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-zinc-300">Clips ({clips.length})</h3>
            {idleOrErrorClips.length > 1 && (
              <button
                type="button"
                onClick={onTrimAll}
                className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-medium rounded px-3 py-1.5 transition-colors"
              >
                Trim All
              </button>
            )}
          </div>

          <div className="space-y-2">
            {clips.map(clip => (
              <div key={clip.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Label */}
                  {editingLabelId === clip.id ? (
                    <input
                      autoFocus
                      type="text"
                      defaultValue={clip.label}
                      onBlur={e => {
                        onUpdateClipLabel(clip.id, e.target.value || clip.label)
                        setEditingLabelId(null)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          onUpdateClipLabel(clip.id, e.currentTarget.value || clip.label)
                          setEditingLabelId(null)
                        }
                        if (e.key === 'Escape') setEditingLabelId(null)
                      }}
                      className="bg-zinc-800 border border-violet-500 rounded px-2 py-0.5 text-sm text-zinc-100 focus:outline-none w-24"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingLabelId(clip.id)}
                      className="text-sm font-medium text-zinc-200 hover:text-violet-400 transition-colors text-left"
                    >
                      {clip.label}
                    </button>
                  )}

                  {/* Time range */}
                  <span className="text-xs text-zinc-600 font-mono flex-1 truncate">
                    {formatTime(clip.startSecs)}→{formatTime(clip.endSecs)}
                  </span>

                  {/* Crop button */}
                  {clip.trimStatus !== 'loading' && sourceVideoUrl && videoAR && (
                    <button
                      type="button"
                      onClick={() => cropEditClipId === clip.id ? onEndCropEdit() : openCropEditor(clip)}
                      className={`text-xs font-medium rounded px-2 py-1.5 transition-colors flex items-center gap-1 ${
                        cropEditClipId === clip.id
                          ? 'bg-violet-600 text-white'
                          : !isFullFrame({ x: clip.cropX, y: clip.cropY, w: clip.cropW, h: clip.cropH })
                            ? 'bg-violet-900/50 border border-violet-600/60 text-violet-300'
                            : 'bg-zinc-700/60 hover:bg-zinc-700 border border-zinc-600/40 text-zinc-400 hover:text-zinc-200'
                      }`}
                      title="Crop video frame"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M4 7h16M4 17h16" />
                      </svg>
                      {!isFullFrame({ x: clip.cropX, y: clip.cropY, w: clip.cropW, h: clip.cropH }) ? 'Cropped' : 'Crop'}
                    </button>
                  )}

                  {/* Status / action */}
                  {clip.trimStatus === 'loading' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-zinc-800 rounded-full h-1">
                        <div
                          className="bg-violet-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${clip.trimProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400">{clip.trimProgress}%</span>
                    </div>
                  ) : clip.trimStatus === 'done' ? (
                    <span className="text-xs text-emerald-400 font-medium">Trimmed ✓</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onTrimClip(clip.id)}
                      className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-medium rounded px-3 py-1.5 transition-colors"
                    >
                      Trim
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => onRemoveClip(clip.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors ml-1 p-1.5 -m-1.5 rounded"
                    title="Remove clip"
                    aria-label="Remove clip"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Clip-level error */}
                {clip.trimError && (
                  <p className="text-red-400 text-xs mt-1.5">{clip.trimError}</p>
                )}

                {/* Effects row: fade + zoom */}
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-700/40 flex-wrap">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={clip.fadeIn}
                      onChange={e => onToggleClipFade(clip.id, 'fadeIn', e.target.checked)}
                      className="w-3.5 h-3.5 accent-violet-500"
                    />
                    <span className="text-[11px] text-zinc-400">Fade in</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={clip.fadeOut}
                      onChange={e => onToggleClipFade(clip.id, 'fadeOut', e.target.checked)}
                      className="w-3.5 h-3.5 accent-violet-500"
                    />
                    <span className="text-[11px] text-zinc-400">Fade out</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={clip.zoomEnabled}
                      onChange={e => onToggleClipZoom(clip.id, e.target.checked)}
                      className="w-3.5 h-3.5 accent-violet-500"
                    />
                    <span className="text-[11px] text-zinc-400">Zoom in</span>
                  </label>
                  {clip.zoomEnabled && (
                    <button
                      type="button"
                      onClick={() => onStartZoomSelect(clip.id)}
                      className={`text-[11px] rounded px-2 py-0.5 transition-colors ${
                        zoomSelectClipId === clip.id
                          ? 'bg-violet-600 text-white'
                          : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300'
                      }`}
                    >
                      {zoomSelectClipId === clip.id ? 'Click preview →' : `Target: ${clip.zoomX}%,${clip.zoomY}%`}
                    </button>
                  )}
                </div>

                {/* ── Crop editor ── */}
                {cropEditClipId === clip.id && sourceVideoUrl && videoAR && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] text-zinc-500">
                      Drag to draw a crop region · drag corners to resize · drag inside to move
                    </p>

                    {/* Crop video container — sized to exact AR so no letterbox offsets needed */}
                    <div
                      ref={cropContainerRef}
                      className="relative rounded-lg overflow-hidden select-none"
                      style={{
                        width: '100%',
                        aspectRatio: String(videoAR),
                        maxHeight: '260px',
                        background: '#000',
                        cursor: 'crosshair',
                      }}
                      onMouseDown={e => handleCropMouseDown(e, clip)}
                    >
                      <video
                        ref={cropVideoRef}
                        src={sourceVideoUrl}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none' }}
                        preload="metadata"
                        playsInline
                      />

                      {/* Dark overlay outside crop box — 4 panels */}
                      {/* Top */}
                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0,
                        height: `${clip.cropY}%`,
                        background: 'rgba(0,0,0,0.55)', pointerEvents: 'none',
                      }} />
                      {/* Bottom */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: `${100 - clip.cropY - clip.cropH}%`,
                        background: 'rgba(0,0,0,0.55)', pointerEvents: 'none',
                      }} />
                      {/* Left */}
                      <div style={{
                        position: 'absolute',
                        top: `${clip.cropY}%`, height: `${clip.cropH}%`,
                        left: 0, width: `${clip.cropX}%`,
                        background: 'rgba(0,0,0,0.55)', pointerEvents: 'none',
                      }} />
                      {/* Right */}
                      <div style={{
                        position: 'absolute',
                        top: `${clip.cropY}%`, height: `${clip.cropH}%`,
                        right: 0, width: `${100 - clip.cropX - clip.cropW}%`,
                        background: 'rgba(0,0,0,0.55)', pointerEvents: 'none',
                      }} />

                      {/* Crop border */}
                      <div style={{
                        position: 'absolute',
                        left: `${clip.cropX}%`, top: `${clip.cropY}%`,
                        width: `${clip.cropW}%`, height: `${clip.cropH}%`,
                        border: '2px solid rgba(255,255,255,0.85)',
                        boxSizing: 'border-box',
                        pointerEvents: 'none',
                      }} />

                      {/* Corner handles */}
                      {([
                        ['tl', clip.cropX, clip.cropY, 'nwse-resize', '-translate-x-1/2 -translate-y-1/2'],
                        ['tr', clip.cropX + clip.cropW, clip.cropY, 'nesw-resize', 'translate-x-1/2 -translate-y-1/2'],  // adjusted below
                        ['bl', clip.cropX, clip.cropY + clip.cropH, 'nesw-resize', '-translate-x-1/2 translate-y-1/2'],
                        ['br', clip.cropX + clip.cropW, clip.cropY + clip.cropH, 'nwse-resize', 'translate-x-1/2 translate-y-1/2'],
                      ] as ['tl'|'tr'|'bl'|'br', number, number, string, string][]).map(([corner, cx, cy, cursor]) => (
                        <div
                          key={corner}
                          onMouseDown={e => handleCornerMouseDown(e, corner, clip)}
                          style={{
                            position: 'absolute',
                            left: `${cx}%`, top: `${cy}%`,
                            transform: 'translate(-50%, -50%)',
                            width: 12, height: 12,
                            background: '#fff',
                            borderRadius: 2,
                            cursor,
                            zIndex: 10,
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
                          }}
                        />
                      ))}
                    </div>

                    {/* Crop info + controls */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-zinc-500 flex-1">
                        {Math.round(clip.cropW)}×{Math.round(clip.cropH)} @ {Math.round(clip.cropX)},{Math.round(clip.cropY)}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateClipCrop(clip.id, { x: 0, y: 0, w: 100, h: 100 })}
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => onEndCropEdit()}
                        className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-medium rounded px-3 py-1 transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {/* Trimmed preview */}
                {clip.trimStatus === 'done' && clip.trimmedVideoUrl && (
                  <video
                    src={clip.trimmedVideoUrl}
                    controls
                    playsInline
                    className="w-full max-h-48 rounded object-contain bg-black mt-2"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!sourceVideoUrl && (
        <p className="text-sm text-zinc-500">Import a video first to define clip ranges.</p>
      )}
    </div>
  )
}

'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import Tooltip from './Tooltip'
import type { Clip } from '../page'

interface CropRect { x: number; y: number; w: number; h: number }

interface SilenceResult {
  silenceIntervals: Array<{ start: number; end: number }>
  speakingSegments: Array<{ start: number; end: number }>
  totalDuration: number | null
}

interface TrimStepProps {
  clips: Clip[]
  onAddClip: (startSecs: number, endSecs: number) => void
  onAddClipsFromSegments: (segments: Array<{ start: number; end: number }>) => void
  onRemoveClip: (clipId: string) => void
  onTrimClip: (clipId: string) => void
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
  onUpdateClipSpeed: (clipId: string, speed: number) => void
  onToggleClipFlip: (clipId: string, axis: 'flipH' | 'flipV', value: boolean) => void
  onUpdateClipColorPreset: (clipId: string, preset: string) => void
  onToggleClipReverse: (clipId: string, value: boolean) => void
  onReorderClips: (fromIdx: number, toIdx: number) => void
  onDetectSilence: (clipId: string) => Promise<SilenceResult | null>
  importJobId: string | null
  sourceVideoDuration: number | null
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

const SPEED_OPTIONS = [
  { label: '0.25×', value: 0.25 },
  { label: '0.5×',  value: 0.5 },
  { label: '1×',    value: 1.0 },
  { label: '1.5×',  value: 1.5 },
  { label: '2×',    value: 2.0 },
]

const COLOR_PRESETS = [
  { label: 'Normal',    value: '',           group: 'basic' },
  { label: 'Warm',      value: 'warm',       group: 'basic' },
  { label: 'Cool',      value: 'cool',       group: 'basic' },
  { label: 'Vivid',     value: 'vivid',      group: 'basic' },
  { label: 'Cinematic', value: 'cinematic',  group: 'basic' },
  { label: 'B&W',       value: 'bw',         group: 'basic' },
  { label: 'Faded',     value: 'faded',      group: 'basic' },
  { label: 'Night',     value: 'night',      group: 'basic' },
  { label: 'Vintage',   value: 'vintage',    group: 'stylized' },
  { label: 'Retro',     value: 'retro',      group: 'stylized' },
  { label: 'Cyberpunk', value: 'cyberpunk',  group: 'stylized' },
  { label: 'Dreamy',    value: 'dreamy',     group: 'stylized' },
  { label: 'Film',      value: 'film',       group: 'stylized' },
  { label: 'Vignette',  value: 'vignette',   group: 'stylized' },
  { label: 'Hi-Con',    value: 'hicon',      group: 'stylized' },
  { label: 'Bleach',    value: 'bleach',     group: 'stylized' },
  { label: 'Teal&Org',  value: 'tealorg',    group: 'stylized' },
  { label: 'Sunset',    value: 'sunset',     group: 'stylized' },
  { label: 'Arctic',    value: 'arctic',     group: 'stylized' },
  { label: 'Neon',      value: 'neon',       group: 'stylized' },
  { label: 'Sepia',    value: 'sepia',      group: 'stylized' },
  { label: 'Lomo',     value: 'lomo',       group: 'stylized' },
  { label: 'Chrome',   value: 'chrome',     group: 'stylized' },
  { label: 'Noir',     value: 'noir',       group: 'stylized' },
  { label: 'Pop Art',  value: 'popart',     group: 'stylized' },
  { label: 'Golden',   value: 'golden',     group: 'stylized' },
  { label: 'Moody',    value: 'moody',      group: 'stylized' },
  { label: 'Pastel',   value: 'pastel',     group: 'stylized' },
]

export default function TrimStep({
  clips,
  onAddClip,
  onAddClipsFromSegments,
  onRemoveClip,
  onTrimClip,
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
  onUpdateClipSpeed,
  onToggleClipFlip,
  onUpdateClipColorPreset,
  onToggleClipReverse,
  onReorderClips,
  onDetectSilence,
  importJobId,
  sourceVideoDuration,
  disabled,
}: TrimStepProps) {
  const [startSecs, setStartSecs] = useState(0)
  const [endSecs, setEndSecs] = useState(30)
  const [duration, setDuration] = useState(0)
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const [videoAR, setVideoAR] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [focusedClipIndex, setFocusedClipIndex] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [silenceResults, setSilenceResults] = useState<Record<string, { loading: boolean; data: { start: number; end: number }[] | null; speaking: { start: number; end: number }[] | null }>>({})
  const [waveformUrls, setWaveformUrls] = useState<Record<string, string>>({})
  const dragFromIdx = useRef<number | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const cropCanvasRef = useRef<HTMLCanvasElement>(null)
  const clipRowRefs = useRef<(HTMLDivElement | null)[]>([])
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'start' | 'end' | null>(null)

  const startSecsRef = useRef(startSecs)
  const endSecsRef = useRef(endSecs)
  const durationRef = useRef(duration)
  useEffect(() => { startSecsRef.current = startSecs }, [startSecs])
  useEffect(() => { endSecsRef.current = endSecs }, [endSecs])
  useEffect(() => { durationRef.current = duration }, [duration])

  // Clear announcement after screen reader has had time to read it
  useEffect(() => {
    if (!announcement) return
    const t = setTimeout(() => setAnnouncement(''), 1500)
    return () => clearTimeout(t)
  }, [announcement])

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

  // Load waveform images for trimmed clips
  useEffect(() => {
    if (!importJobId) return
    for (const clip of clips) {
      if (clip.trimStatus === 'done' && !waveformUrls[clip.id]) {
        const url = `/api/waveform?jobId=${importJobId}&clipSuffix=${clip.clipSuffix}`
        setWaveformUrls(prev => ({ ...prev, [clip.id]: url }))
      }
    }
  }, [clips, importJobId, waveformUrls])

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

  const openCropEditor = (clip: Clip) => {
    onStartCropEdit(clip.id)
  }

  // Draw the current video frame into the crop canvas after it mounts
  useEffect(() => {
    if (!cropEditClipId) return
    const video = videoRef.current
    const canvas = cropCanvasRef.current
    if (!video || !canvas) return
    canvas.width = video.videoWidth || canvas.offsetWidth
    canvas.height = video.videoHeight || canvas.offsetHeight
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
  }, [cropEditClipId])

  return (
    <div className={`space-y-4 ${disabled ? 'pointer-events-none' : ''}`}>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Trim</p>
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
                className="relative h-8 bg-surface-2 rounded-lg cursor-pointer select-none"
                onClick={handleTimelineClick}
              >
                <div
                  className="absolute top-0 bottom-0 left-0 bg-surface-1/70 rounded-l-lg pointer-events-none"
                  style={{ width: `${secsToPercent(startSecs)}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 right-0 bg-surface-1/70 rounded-r-lg pointer-events-none"
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

          {/* 60-second warning for YouTube Shorts */}
          {endSecs - startSecs > 60 && (
            <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/50 rounded-lg px-3 py-2.5">
              <svg className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <p className="text-xs text-amber-400">
                Clip is over 60 seconds ({formatTime(Math.round(endSecs - startSecs))}). YouTube Shorts must be 60 seconds or under.
              </p>
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
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm font-mono"
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
                className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm font-mono"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                onAddClip(startSecs, endSecs)
                setAnnouncement(`Clip ${clips.length + 1} added`)
                const newEnd = Math.min(endSecs + (endSecs - startSecs), duration)
                setStartSecs(endSecs)
                setEndSecs(newEnd > endSecs ? newEnd : Math.min(endSecs + 30, duration))
              }}
              className="flex items-center gap-2 btn-gradient btn-press text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors shadow-md shadow-violet-600/20"
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
          <h3 className="text-sm font-medium text-zinc-300">Clips ({clips.length})</h3>

          {/* aria-live region for screen reader announcements */}
          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {announcement}
          </div>

          <div className="space-y-2" role="list" aria-label="Clips">
            {clips.map((clip, idx) => (
              <div
                key={clip.id}
                role="listitem"
                tabIndex={0}
                ref={el => { clipRowRefs.current[idx] = el }}
                onFocus={() => setFocusedClipIndex(idx)}
                onBlur={() => setFocusedClipIndex(null)}
                onKeyDown={e => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                    e.preventDefault()
                    const next = clipRowRefs.current[idx + 1]
                    if (next) next.focus()
                  } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                    e.preventDefault()
                    const prev = clipRowRefs.current[idx - 1]
                    if (prev) prev.focus()
                  } else if ((e.key === 'Delete' || e.key === 'Backspace') && !editingLabelId) {
                    onRemoveClip(clip.id)
                  }
                }}
                draggable
                onDragStart={() => { dragFromIdx.current = idx }}
                onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
                onDragLeave={() => setDragOverIdx(null)}
                onDrop={e => {
                  e.preventDefault()
                  setDragOverIdx(null)
                  if (dragFromIdx.current !== null && dragFromIdx.current !== idx) {
                    onReorderClips(dragFromIdx.current, idx)
                  }
                  dragFromIdx.current = null
                }}
                onDragEnd={() => { setDragOverIdx(null); dragFromIdx.current = null }}
                className={`bg-surface-2/50 border rounded-lg px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900 transition-all cursor-grab active:cursor-grabbing ${
                  dragOverIdx === idx ? 'border-violet-500/60 bg-violet-600/5' : focusedClipIndex === idx ? 'border-border/50' : 'border-border/50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {/* Drag handle */}
                  <Tooltip text="Drag to reorder"><span className="text-zinc-600 hover:text-zinc-400 cursor-grab active:cursor-grabbing flex-shrink-0 select-none">⠿</span></Tooltip>
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
                      className="bg-surface-2 border border-violet-500 rounded px-2 py-0.5 text-sm text-zinc-100 focus:outline-none w-24"
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
                            : 'bg-surface-3/60 hover:bg-surface-3 border border-border/40 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Tooltip text="Select a region of the video to keep">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M4 7h16M4 17h16" />
                      </svg>
                      {cropEditClipId === clip.id ? 'Recrop' : !isFullFrame({ x: clip.cropX, y: clip.cropY, w: clip.cropW, h: clip.cropH }) ? 'Recrop' : 'Crop'}
                      </Tooltip>
                    </button>
                  )}

                  {/* Status / action */}
                  {clip.trimStatus === 'loading' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-surface-2 rounded-full h-1 overflow-hidden" role="progressbar" aria-valuenow={clip.trimProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Trim progress">
                        <div
                          className="bg-violet-500 h-1 rounded-full transition-all duration-300 progress-shimmer"
                          style={{ width: `${clip.trimProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-zinc-400 font-mono">{clip.trimProgress}%</span>
                    </div>
                  ) : clip.trimStatus === 'done' ? (
                    <span className="text-xs text-emerald-400 font-medium">✓</span>
                  ) : clip.trimStatus === 'error' ? (
                    <button
                      type="button"
                      onClick={() => onTrimClip(clip.id)}
                      className="text-xs bg-red-800/60 hover:bg-red-700/60 border border-red-700/60 text-red-300 font-medium rounded px-2.5 py-1.5 transition-colors"
                    >
                      Retry
                    </button>
                  ) : (
                    <span className="text-xs text-zinc-500">Queued…</span>
                  )}

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => onRemoveClip(clip.id)}
                    className="text-zinc-600 hover:text-red-400 transition-colors ml-1 p-1.5 -m-1.5 rounded"
                    aria-label="Remove clip"
                  >
                    <Tooltip text="Remove this clip">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    </Tooltip>
                  </button>
                </div>

                {/* Clip-level error */}
                {clip.trimError && (
                  <p className="text-red-400 text-xs mt-1.5">
                    {clip.trimError === 'server_restart'
                      ? 'Server restarted — please refresh the page and try again.'
                      : clip.trimError}
                  </p>
                )}

                {/* Effects row: fade + zoom */}
                <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-border/40 flex-wrap">
                  <button
                    type="button"
                    onClick={() => onToggleClipFade(clip.id, 'fadeIn', !clip.fadeIn)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-all select-none ${clip.fadeIn ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-border bg-surface-2 text-zinc-400 hover:border-bright hover:text-zinc-300'}`}
                  >
                    Fade in
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleClipFade(clip.id, 'fadeOut', !clip.fadeOut)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-all select-none ${clip.fadeOut ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-border bg-surface-2 text-zinc-400 hover:border-bright hover:text-zinc-300'}`}
                  >
                    Fade out
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleClipZoom(clip.id, !clip.zoomEnabled)}
                    className={`text-[11px] px-2.5 py-1 rounded-full border transition-all select-none ${clip.zoomEnabled ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-border bg-surface-2 text-zinc-400 hover:border-bright hover:text-zinc-300'}`}
                  >
                    Zoom in
                  </button>
                  {clip.zoomEnabled && (
                    <button
                      type="button"
                      onClick={() => onStartZoomSelect(clip.id)}
                      className={`text-[11px] rounded px-2 py-0.5 transition-colors ${
                        zoomSelectClipId === clip.id
                          ? 'bg-violet-600 text-white'
                          : 'bg-surface-3 hover:bg-surface-3 text-zinc-300'
                      }`}
                    >
                      {zoomSelectClipId === clip.id ? 'Click preview →' : `Target: ${clip.zoomX}%,${clip.zoomY}%`}
                    </button>
                  )}
                  {/* Flip buttons */}
                  <Tooltip text="Mirror horizontally"><button type="button"
                    onClick={() => onToggleClipFlip(clip.id, 'flipH', !clip.flipH)}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-all ${clip.flipH ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-border bg-surface-2 text-zinc-400 hover:border-bright'}`}>
                    ↔
                  </button></Tooltip>
                  <Tooltip text="Flip upside down"><button type="button"
                    onClick={() => onToggleClipFlip(clip.id, 'flipV', !clip.flipV)}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-all ${clip.flipV ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-border bg-surface-2 text-zinc-400 hover:border-bright'}`}>
                    ↕
                  </button></Tooltip>
                  {/* Reverse */}
                  <Tooltip text="Play in reverse"><button type="button"
                    onClick={() => onToggleClipReverse(clip.id, !clip.reversed)}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-all ${clip.reversed ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-border bg-surface-2 text-zinc-400 hover:border-bright'}`}>
                    ↩
                  </button></Tooltip>
                </div>

                {/* Waveform visualization */}
                {clip.trimStatus === 'done' && waveformUrls[clip.id] && (
                  <div className="mt-3 rounded-lg overflow-hidden opacity-60 h-10 bg-surface-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={waveformUrls[clip.id]}
                      alt="Waveform"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Silence detection */}
                {clip.trimStatus === 'done' && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <button type="button"
                      onClick={async () => {
                        setSilenceResults(prev => ({ ...prev, [clip.id]: { loading: true, data: null, speaking: null } }))
                        const result = await onDetectSilence(clip.id)
                        setSilenceResults(prev => ({
                          ...prev,
                          [clip.id]: {
                            loading: false,
                            data: result?.silenceIntervals ?? null,
                            speaking: result?.speakingSegments ?? null,
                          }
                        }))
                      }}
                      disabled={silenceResults[clip.id]?.loading}
                      className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-border bg-surface-2 text-zinc-300 hover:border-bright hover:text-zinc-100 transition-all disabled:opacity-50"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                      </svg>
                      {silenceResults[clip.id]?.loading ? 'Detecting...' : 'Detect silences'}
                    </button>
                    {silenceResults[clip.id]?.data && (
                      <span className="text-[11px] text-zinc-500">
                        {silenceResults[clip.id].data!.length === 0
                          ? 'No silences found'
                          : `${silenceResults[clip.id].data!.length} silent segment${silenceResults[clip.id].data!.length !== 1 ? 's' : ''} detected`}
                      </span>
                    )}
                    {silenceResults[clip.id]?.speaking && silenceResults[clip.id].speaking!.length > 0 && (
                      <button type="button"
                        onClick={() => {
                          const segments = silenceResults[clip.id].speaking!
                          // Map speaking segments from trimmed-clip-relative times back to source video times
                          const mapped = segments.map(s => ({
                            start: clip.startSecs + s.start,
                            end: clip.startSecs + s.end,
                          }))
                          onAddClipsFromSegments(mapped)
                        }}
                        className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-violet-600/60 bg-violet-600/10 text-violet-300 hover:bg-violet-600/20 transition-all font-medium"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Remove silences ({silenceResults[clip.id].speaking!.length} clips)
                      </button>
                    )}
                  </div>
                )}

                {/* Speed + Color row */}
                <div className="mt-2 pt-2 border-t border-border/40 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] text-zinc-500 w-10 flex-shrink-0">Speed</span>
                    {SPEED_OPTIONS.map(s => (
                      <button key={s.value} type="button"
                        onClick={() => onUpdateClipSpeed(clip.id, s.value)}
                        className={`text-[11px] px-2 py-0.5 rounded border transition-all ${clip.speed === s.value ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-border bg-surface-2 text-zinc-400 hover:border-bright'}`}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-zinc-500 w-10 flex-shrink-0">Color</span>
                      {COLOR_PRESETS.filter(p => p.group === 'basic').map(p => (
                        <button key={p.value} type="button"
                          onClick={() => onUpdateClipColorPreset(clip.id, p.value)}
                          className={`text-[11px] px-2 py-0.5 rounded border transition-all ${clip.colorPreset === p.value ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-border bg-surface-2 text-zinc-400 hover:border-bright'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-zinc-500 w-10 flex-shrink-0">FX</span>
                      {COLOR_PRESETS.filter(p => p.group === 'stylized').map(p => (
                        <button key={p.value} type="button"
                          onClick={() => onUpdateClipColorPreset(clip.id, p.value)}
                          className={`text-[11px] px-2 py-0.5 rounded border transition-all ${clip.colorPreset === p.value ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-border bg-surface-2 text-zinc-400 hover:border-bright'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
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
                      <canvas
                        ref={cropCanvasRef}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
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
                        className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded bg-surface-2 hover:bg-surface-3"
                      >
                        Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => onEndCropEdit()}
                        className="text-xs bg-violet-600 hover:bg-violet-500 btn-press text-white font-medium rounded px-3 py-1 transition-colors"
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

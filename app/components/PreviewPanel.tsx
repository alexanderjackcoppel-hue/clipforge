'use client'
import { useRef, useEffect, useCallback, useState } from 'react'

interface Pos { x: number; y: number }
type CropRect = { x: number; y: number; w: number; h: number }

interface SubtitleLayerStyle {
  fontSize: number
  color: string
  position: Pos
  fontFamily: string
  bold: boolean
  outlineWidth: number
}

interface PreviewPanelProps {
  videoUrl: string | null
  autoEnabled: boolean
  autoLines: { id: number; start: number; end: number; text: string }[]
  autoStyle: SubtitleLayerStyle
  onAutoPositionChange: (pos: Pos) => void
  customEnabled: boolean
  customLines: { id: number; start: number; end: number; text: string }[]
  customStyle: SubtitleLayerStyle
  onCustomPositionChange: (pos: Pos) => void
  activeLayer: 'auto' | 'custom'
  overlayEnabled: boolean
  overlayPreviewUrl: string | null
  overlayPosition: string
  overlayScale: number
  videoFormat: 'standard' | 'social-post' | 'cinematic' | 'blur-bg'
  socialBgColor: string
  socialVideoScale: number
  onSocialVideoScaleChange: (v: number) => void
  cinematicBgColor: string
  videoBarHeight: number
  videoOffsetX: number
  videoOffsetY: number
  onVideoOffsetChange: (x: number, y: number) => void
  // Crop editor
  sourceVideoUrl: string | null
  sourceVideoAR: number | null
  cropEditClipId: string | null
  activeCropRect: CropRect | null
  onCropChange: (crop: CropRect) => void
  onCropDone: () => void
  onCropCancel: () => void
  // Zoom point selection
  zoomSelectClipId: string | null
  onZoomPointSet: (x: number, y: number) => void
}

function overlayCSS(pos: string, scale: number): React.CSSProperties {
  const w = `${scale}%`
  const gap = '1.5%'
  switch (pos) {
    case 'top-left':     return { position: 'absolute', top: gap, left: gap, width: w }
    case 'top-right':    return { position: 'absolute', top: gap, right: gap, width: w }
    case 'bottom-left':  return { position: 'absolute', bottom: gap, left: gap, width: w }
    case 'bottom-right': return { position: 'absolute', bottom: gap, right: gap, width: w }
    case 'center':       return { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: w }
    default:             return { position: 'absolute', bottom: gap, right: gap, width: w }
  }
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

export default function PreviewPanel({
  videoUrl,
  autoEnabled, autoLines, autoStyle, onAutoPositionChange,
  customEnabled, customLines, customStyle, onCustomPositionChange,
  activeLayer,
  overlayEnabled, overlayPreviewUrl, overlayPosition, overlayScale,
  videoFormat, socialBgColor, socialVideoScale, onSocialVideoScaleChange,
  cinematicBgColor, videoBarHeight,
  videoOffsetX, videoOffsetY, onVideoOffsetChange,
  sourceVideoUrl, sourceVideoAR,
  cropEditClipId, activeCropRect, onCropChange, onCropDone, onCropCancel,
  zoomSelectClipId, onZoomPointSet,
}: PreviewPanelProps) {
  const containerRef     = useRef<HTMLDivElement>(null)
  const videoRef         = useRef<HTMLVideoElement>(null)

  // Crop editor refs
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const cropVideoRef     = useRef<HTMLVideoElement>(null)
  const cropDragModeRef  = useRef<'idle' | 'drawing' | 'moving' | 'tl' | 'tr' | 'bl' | 'br'>('idle')
  const cropDragStartRef = useRef<{ mx: number; my: number; initCrop: CropRect } | null>(null)
  const activeCropRectRef = useRef(activeCropRect)
  const onCropChangeRef   = useRef(onCropChange)
  useEffect(() => { activeCropRectRef.current = activeCropRect }, [activeCropRect])
  useEffect(() => { onCropChangeRef.current = onCropChange }, [onCropChange])

  // Tracks main video time persistently (survives conditional unmount in crop mode)
  const lastMainVideoTimeRef = useRef(0)

  // Reset error state when entering crop mode
  useEffect(() => {
    if (cropEditClipId) {
      setCropVideoError(false)
    }
  }, [cropEditClipId])

  // Playback state
  const [isPlaying, setIsPlaying]   = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]     = useState(0)
  const [cropVideoError, setCropVideoError] = useState(false)

  // Subtitle drag
  const isDraggingRef   = useRef(false)
  const rafRef          = useRef<number | null>(null)
  const lastPosRef      = useRef<{ pos: Pos; layer: 'auto' | 'custom' } | null>(null)

  // Video drag (social-post only)
  const isVideoMovingRef    = useRef(false)
  const videoRafRef         = useRef<number | null>(null)
  const lastVideoPosRef     = useRef<{ x: number; y: number } | null>(null)
  const videoMoveStartRef   = useRef<{ mouseX: number; mouseY: number; initX: number; initY: number } | null>(null)

  // Video resize (social-post corner handles)
  const isResizingRef   = useRef(false)
  const scaleRafRef     = useRef<number | null>(null)
  const lastScaleRef    = useRef<number | null>(null)
  const resizeStartRef  = useRef<{ mouseY: number; initScale: number; dir: 'top' | 'bottom' } | null>(null)

  // ── Sync subtitle CSS vars ──
  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    c.style.setProperty('--auto-x', `${autoStyle.position.x}%`)
    c.style.setProperty('--auto-y', `${autoStyle.position.y}%`)
  }, [autoStyle.position.x, autoStyle.position.y])

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    c.style.setProperty('--custom-x', `${customStyle.position.x}%`)
    c.style.setProperty('--custom-y', `${customStyle.position.y}%`)
  }, [customStyle.position.x, customStyle.position.y])

  // ── Sync video offset + scale CSS vars ──
  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    c.style.setProperty('--vid-x', `${videoOffsetX}%`)
    c.style.setProperty('--vid-y', `${videoOffsetY}%`)
    c.style.setProperty('--vid-scale', `${socialVideoScale}%`)
  }, [videoOffsetX, videoOffsetY, socialVideoScale])

  // ── Playback event listeners ──
  useEffect(() => {
    const v = videoRef.current
    if (!v || !videoUrl) return
    const onTime     = () => { lastMainVideoTimeRef.current = v.currentTime; setCurrentTime(v.currentTime) }
    const onDuration = () => setDuration(v.duration || 0)
    const onEnded    = () => { setIsPlaying(false) }
    const onPause    = () => setIsPlaying(false)
    const onPlay     = () => setIsPlaying(true)
    v.addEventListener('timeupdate',     onTime)
    v.addEventListener('durationchange', onDuration)
    v.addEventListener('ended',          onEnded)
    v.addEventListener('pause',          onPause)
    v.addEventListener('play',           onPlay)
    return () => {
      v.removeEventListener('timeupdate',     onTime)
      v.removeEventListener('durationchange', onDuration)
      v.removeEventListener('ended',          onEnded)
      v.removeEventListener('pause',          onPause)
      v.removeEventListener('play',           onPlay)
    }
  }, [videoUrl])

  // ── Playback helpers ──
  const playAll = useCallback(() => {
    videoRef.current?.play().catch(() => {})
  }, [])

  const pauseAll = useCallback(() => {
    videoRef.current?.pause()
  }, [])

  const seekAll = useCallback((t: number) => {
    if (videoRef.current) videoRef.current.currentTime = t
  }, [])

  const togglePlay = () => { isPlaying ? pauseAll() : playAll() }

  const handleScrubClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seekAll(pct * duration)
  }

  // ── Helper: get subtitle position from mouse event ──
  const getPosFromEvent = useCallback((e: MouseEvent | React.MouseEvent): Pos | null => {
    const el = containerRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return {
      x: Math.round(Math.max(2, Math.min(98, ((e.clientX - rect.left)  / rect.width)  * 100))),
      y: Math.round(Math.max(2, Math.min(98, ((e.clientY - rect.top)   / rect.height) * 100))),
    }
  }, [])

  const setCSSSubPos = useCallback((pos: Pos, layer: 'auto' | 'custom') => {
    const c = containerRef.current
    if (!c) return
    c.style.setProperty(layer === 'auto' ? '--auto-x' : '--custom-x', `${pos.x}%`)
    c.style.setProperty(layer === 'auto' ? '--auto-y' : '--custom-y', `${pos.y}%`)
  }, [])

  // ── Thumbnail capture ──
  const captureFrame = useCallback(() => {
    const v = videoRef.current
    if (!v) return
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth || 1080
    canvas.height = v.videoHeight || 1920
    canvas.getContext('2d')?.drawImage(v, 0, 0)
    canvas.toBlob(blob => {
      if (!blob) return
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `thumbnail_${Math.floor(v.currentTime)}s.jpg`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/jpeg', 0.92)
  }, [])

  // ── Container mousedown → zoom-select or subtitle drag ──
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isVideoMovingRef.current || isResizingRef.current) return
    // Zoom point selection mode
    if (zoomSelectClipId) {
      const el = containerRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
      const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)))
      onZoomPointSet(x, y)
      return
    }
    e.preventDefault()
    isDraggingRef.current = true
    const pos = getPosFromEvent(e)
    if (!pos) return
    setCSSSubPos(pos, activeLayer)
    activeLayer === 'auto' ? onAutoPositionChange(pos) : onCustomPositionChange(pos)
  }

  // ── Video drag start (social-post) ──
  const handleVideoDragStart = (e: React.MouseEvent) => {
    if (videoFormat !== 'social-post') return
    e.stopPropagation()
    e.preventDefault()
    isVideoMovingRef.current = true
    videoMoveStartRef.current = { mouseX: e.clientX, mouseY: e.clientY, initX: videoOffsetX, initY: videoOffsetY }
  }

  // ── Resize corner start (social-post) ──
  const handleResizeStart = (e: React.MouseEvent, dir: 'top' | 'bottom') => {
    e.stopPropagation()
    e.preventDefault()
    isResizingRef.current = true
    resizeStartRef.current = { mouseY: e.clientY, initScale: socialVideoScale, dir }
  }

  // ── Crop editor mousedown ──
  const handleCropMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || !cropContainerRef.current) return
    e.preventDefault()
    const rect = cropContainerRef.current.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * 100
    const py = ((e.clientY - rect.top) / rect.height) * 100
    const cur = activeCropRectRef.current
    const inside = cur && px >= cur.x && px <= cur.x + cur.w && py >= cur.y && py <= cur.y + cur.h
    cropDragModeRef.current = inside ? 'moving' : 'drawing'
    cropDragStartRef.current = {
      mx: e.clientX, my: e.clientY,
      initCrop: inside && cur ? { ...cur } : { x: px, y: py, w: 0, h: 0 },
    }
    if (!inside) {
      onCropChangeRef.current({ x: px, y: py, w: 0, h: 0 })
    }
  }

  const handleCropCornerDown = (e: React.MouseEvent, corner: 'tl' | 'tr' | 'bl' | 'br') => {
    e.stopPropagation()
    e.preventDefault()
    const cur = activeCropRectRef.current
    if (!cur) return
    cropDragModeRef.current = corner
    cropDragStartRef.current = { mx: e.clientX, my: e.clientY, initCrop: { ...cur } }
  }

  // ── Global mouse events ──
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Crop drag
      if (cropDragModeRef.current !== 'idle') {
        const container = cropContainerRef.current
        const start = cropDragStartRef.current
        if (!container || !start) return
        const rect = container.getBoundingClientRect()
        const dx = ((e.clientX - start.mx) / rect.width) * 100
        const dy = ((e.clientY - start.my) / rect.height) * 100
        const init = start.initCrop
        let next: CropRect
        const mode = cropDragModeRef.current
        if (mode === 'drawing') {
          const curX = clamp(init.x + dx, 0, 100)
          const curY = clamp(init.y + dy, 0, 100)
          next = { x: Math.min(init.x, curX), y: Math.min(init.y, curY), w: Math.abs(curX - init.x), h: Math.abs(curY - init.y) }
        } else if (mode === 'moving') {
          next = { x: clamp(init.x + dx, 0, 100 - init.w), y: clamp(init.y + dy, 0, 100 - init.h), w: init.w, h: init.h }
        } else if (mode === 'tl') {
          const newX = clamp(init.x + dx, 0, init.x + init.w - 5)
          const newY = clamp(init.y + dy, 0, init.y + init.h - 5)
          next = { x: newX, y: newY, w: init.x + init.w - newX, h: init.y + init.h - newY }
        } else if (mode === 'tr') {
          const newY = clamp(init.y + dy, 0, init.y + init.h - 5)
          next = { x: init.x, y: newY, w: clamp(init.w + dx, 5, 100 - init.x), h: init.y + init.h - newY }
        } else if (mode === 'bl') {
          const newX = clamp(init.x + dx, 0, init.x + init.w - 5)
          next = { x: newX, y: init.y, w: init.x + init.w - newX, h: clamp(init.h + dy, 5, 100 - init.y) }
        } else { // br
          next = { x: init.x, y: init.y, w: clamp(init.w + dx, 5, 100 - init.x), h: clamp(init.h + dy, 5, 100 - init.y) }
        }
        onCropChangeRef.current(next)
        return
      }

      // Resize
      if (isResizingRef.current) {
        const start = resizeStartRef.current
        if (!start || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const deltaY = e.clientY - start.mouseY
        const signedDelta = start.dir === 'top' ? -deltaY : deltaY
        const deltaScale = (signedDelta / rect.height) * 150
        const newScale = Math.max(20, Math.min(150, start.initScale + deltaScale))
        containerRef.current.style.setProperty('--vid-scale', `${newScale}%`)
        lastScaleRef.current = newScale
        if (scaleRafRef.current === null) {
          scaleRafRef.current = requestAnimationFrame(() => {
            scaleRafRef.current = null
            if (lastScaleRef.current !== null) onSocialVideoScaleChange(lastScaleRef.current)
          })
        }
        return
      }
      // Video drag
      if (isVideoMovingRef.current) {
        const start = videoMoveStartRef.current
        if (!start || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const dxPct = ((e.clientX - start.mouseX) / rect.width)  * 100
        const dyPct = ((e.clientY - start.mouseY) / rect.height) * 100
        const newX  = Math.max(-80, Math.min(80, start.initX + dxPct))
        const newY  = Math.max(-80, Math.min(80, start.initY + dyPct))
        containerRef.current.style.setProperty('--vid-x', `${newX}%`)
        containerRef.current.style.setProperty('--vid-y', `${newY}%`)
        lastVideoPosRef.current = { x: newX, y: newY }
        if (videoRafRef.current === null) {
          videoRafRef.current = requestAnimationFrame(() => {
            videoRafRef.current = null
            const p = lastVideoPosRef.current
            if (p) onVideoOffsetChange(p.x, p.y)
          })
        }
        return
      }
      // Subtitle drag
      if (!isDraggingRef.current) return
      const pos = getPosFromEvent(e)
      if (!pos) return
      setCSSSubPos(pos, activeLayer)
      lastPosRef.current = { pos, layer: activeLayer }
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          const p = lastPosRef.current
          if (p) { p.layer === 'auto' ? onAutoPositionChange(p.pos) : onCustomPositionChange(p.pos) }
        })
      }
    }

    const onUp = () => {
      if (cropDragModeRef.current !== 'idle') {
        cropDragModeRef.current = 'idle'
        cropDragStartRef.current = null
        return
      }
      if (isResizingRef.current) {
        isResizingRef.current = false
        if (scaleRafRef.current !== null) { cancelAnimationFrame(scaleRafRef.current); scaleRafRef.current = null }
        if (lastScaleRef.current !== null) { onSocialVideoScaleChange(lastScaleRef.current); lastScaleRef.current = null }
        resizeStartRef.current = null
        return
      }
      if (isVideoMovingRef.current) {
        isVideoMovingRef.current = false
        if (videoRafRef.current !== null) { cancelAnimationFrame(videoRafRef.current); videoRafRef.current = null }
        const p = lastVideoPosRef.current
        if (p) { onVideoOffsetChange(p.x, p.y); lastVideoPosRef.current = null }
        videoMoveStartRef.current = null
        return
      }
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      const p = lastPosRef.current
      if (p) {
        p.layer === 'auto' ? onAutoPositionChange(p.pos) : onCustomPositionChange(p.pos)
        lastPosRef.current = null
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [activeLayer, getPosFromEvent, setCSSSubPos, onAutoPositionChange, onCustomPositionChange, onVideoOffsetChange, onSocialVideoScaleChange, videoFormat, socialVideoScale])

  // ── Text helpers ──
  const autoText   = autoLines.length   > 0 ? autoLines[Math.floor(autoLines.length / 2)].text   : 'Auto subtitle'
  const customText = customLines.length > 0 ? customLines[Math.floor(customLines.length / 2)].text : 'Custom text'

  const FONT_SCALE = 1 / 1080
  function subtitleStyle(style: SubtitleLayerStyle, dim: boolean): React.CSSProperties {
    return {
      color: `#${style.color}`,
      fontSize: `${style.fontSize * FONT_SCALE * 100}cqw`,
      fontFamily: style.fontFamily,
      fontWeight: style.bold ? 'bold' : 'normal',
      textShadow: style.outlineWidth > 0
        ? `0 0 ${style.outlineWidth * FONT_SCALE * 100}cqw #000, 0 0 ${style.outlineWidth * 2 * FONT_SCALE * 100}cqw #000, 1px 1px 0 #000, -1px -1px 0 #000`
        : 'none',
      WebkitTextStroke: style.outlineWidth > 0 ? `${style.outlineWidth * 0.4 * FONT_SCALE * 100}cqw #000` : undefined,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      textAlign: 'center',
      opacity: dim ? 0.45 : 1,
      transition: 'opacity 0.15s',
    }
  }

  const barH = Math.max(5, Math.min(45, videoBarHeight))

  const containerBg =
    videoFormat === 'social-post' ? `#${socialBgColor}` : undefined

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // Corner resize handle — shared style
  const cornerBase = 'absolute w-3 h-3 bg-white/90 rounded-sm pointer-events-auto z-10 shadow-md'

  return (
    <div className="flex flex-col items-center h-full pt-5 pb-3 px-4 gap-2">
      <div className="text-xs text-zinc-600 font-medium tracking-wide uppercase flex-shrink-0">
        {cropEditClipId ? 'Crop Editor' : 'Preview'}
      </div>

      {/* ── Crop editor mode (full-panel) ── */}
      {cropEditClipId && activeCropRect !== null && (
        <div className="flex-1 flex flex-col gap-2 w-full min-h-0">

          {/* Top toolbar: Cancel / hint / readout / Reset / Done */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={onCropCancel}
              className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <span className="text-[11px] text-zinc-600 flex-1 min-w-0 truncate">Drag to draw · corners to resize · move inside</span>
            <span className="text-[11px] font-mono text-zinc-500 flex-shrink-0 tabular-nums">
              {Math.round(activeCropRect.w)}×{Math.round(activeCropRect.h)}
            </span>
            <button
              type="button"
              onClick={() => onCropChange({ x: 0, y: 0, w: 100, h: 100 })}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 flex-shrink-0"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onCropDone}
              className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-medium rounded px-3 py-1.5 transition-colors flex-shrink-0"
            >
              Done
            </button>
          </div>

          {/* Crop container sized to source AR — no letterboxing */}
          <div className="flex-1 flex items-center justify-center w-full min-h-0">
            <div
              ref={cropContainerRef}
              className="relative overflow-hidden rounded-xl border border-zinc-700 select-none"
              style={{
                aspectRatio: sourceVideoAR ? String(sourceVideoAR) : '16/9',
                maxWidth: '100%',
                maxHeight: '100%',
                cursor: 'crosshair',
              }}
              onMouseDown={handleCropMouseDown}
            >
              {sourceVideoUrl ? (
                <>
                  <video
                    ref={cropVideoRef}
                    src={sourceVideoUrl}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none', display: cropVideoError ? 'none' : 'block' }}
                    autoPlay
                    loop
                    playsInline
                    muted
                    onError={() => setCropVideoError(true)}
                  />
                  {cropVideoError && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#18181b', gap: 8, pointerEvents: 'none' }}>
                      <span style={{ color: '#f87171', fontSize: 13, fontWeight: 500 }}>Video unavailable</span>
                      <span style={{ color: '#71717a', fontSize: 11 }}>Re-import your video to reload the source</span>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#18181b', gap: 8, pointerEvents: 'none' }}>
                  <span style={{ color: '#a1a1aa', fontSize: 13, fontWeight: 500 }}>No source video</span>
                  <span style={{ color: '#71717a', fontSize: 11 }}>Re-import your video to use the crop editor</span>
                </div>
              )}

              {/* Dark overlay panels outside crop box */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${activeCropRect.y}%`, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${100 - activeCropRect.y - activeCropRect.h}%`, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: `${activeCropRect.y}%`, height: `${activeCropRect.h}%`, left: 0, width: `${activeCropRect.x}%`, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', top: `${activeCropRect.y}%`, height: `${activeCropRect.h}%`, right: 0, width: `${100 - activeCropRect.x - activeCropRect.w}%`, background: 'rgba(0,0,0,0.55)', pointerEvents: 'none' }} />

              {/* Rule-of-thirds grid inside crop box */}
              {[1,2].map(i => (
                <div key={`rv${i}`} style={{
                  position: 'absolute',
                  left: `${activeCropRect.x + activeCropRect.w * (i/3)}%`,
                  top: `${activeCropRect.y}%`,
                  width: 1,
                  height: `${activeCropRect.h}%`,
                  background: 'rgba(255,255,255,0.18)',
                  pointerEvents: 'none',
                }} />
              ))}
              {[1,2].map(i => (
                <div key={`rh${i}`} style={{
                  position: 'absolute',
                  left: `${activeCropRect.x}%`,
                  top: `${activeCropRect.y + activeCropRect.h * (i/3)}%`,
                  width: `${activeCropRect.w}%`,
                  height: 1,
                  background: 'rgba(255,255,255,0.18)',
                  pointerEvents: 'none',
                }} />
              ))}

              {/* Crop border */}
              <div style={{
                position: 'absolute',
                left: `${activeCropRect.x}%`, top: `${activeCropRect.y}%`,
                width: `${activeCropRect.w}%`, height: `${activeCropRect.h}%`,
                border: '2px solid rgba(255,255,255,0.85)',
                boxSizing: 'border-box',
                pointerEvents: 'none',
              }} />

              {/* Corner handles (8: 4 corners + 4 edge midpoints) */}
              {(['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br'] as const).map(handle => {
                const isCorner = handle.length === 2 && !handle.includes('c') && !handle.includes('m')
                const isMid = handle.includes('c') || handle.includes('m')
                const lx = handle.startsWith('t') || handle.startsWith('b')
                  ? (handle.endsWith('l') ? activeCropRect.x : handle.endsWith('r') ? activeCropRect.x + activeCropRect.w : activeCropRect.x + activeCropRect.w / 2)
                  : (handle === 'ml' ? activeCropRect.x : activeCropRect.x + activeCropRect.w)
                const ly = handle.startsWith('t') ? activeCropRect.y
                  : handle.startsWith('b') ? activeCropRect.y + activeCropRect.h
                  : handle === 'tc' ? activeCropRect.y
                  : handle === 'bc' ? activeCropRect.y + activeCropRect.h
                  : activeCropRect.y + activeCropRect.h / 2
                const cursor = handle === 'tl' || handle === 'br' ? 'nwse-resize'
                  : handle === 'tr' || handle === 'bl' ? 'nesw-resize'
                  : handle === 'tc' || handle === 'bc' ? 'ns-resize'
                  : 'ew-resize'
                const corner = isCorner ? handle as 'tl'|'tr'|'bl'|'br' : null
                if (!isCorner && !isMid) return null
                return (
                  <div
                    key={handle}
                    onMouseDown={corner ? e => handleCropCornerDown(e, corner) : undefined}
                    style={{
                      position: 'absolute',
                      left: `${lx}%`, top: `${ly}%`,
                      transform: 'translate(-50%, -50%)',
                      width: isCorner ? 12 : 10,
                      height: isCorner ? 12 : 10,
                      background: '#fff',
                      borderRadius: 2,
                      cursor,
                      zIndex: 10,
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
                    }}
                  />
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Normal 9:16 preview ── */}
      {!cropEditClipId && (
        <div className="flex-1 flex items-center justify-center w-full min-h-0">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            className="relative overflow-hidden rounded-xl border border-zinc-800 shadow-2xl bg-zinc-900 select-none"
            style={{
              aspectRatio: '9/16',
              height: '100%',
              maxHeight: 'calc(100vh - 140px)',
              containerType: 'inline-size',
              backgroundColor: containerBg,
              cursor: zoomSelectClipId ? 'crosshair' : 'default',
            }}
          >
            {videoUrl ? (
              <>
                {/* ── Standard: full bleed ── */}
                {videoFormat === 'standard' && (
                  <video ref={videoRef} src={videoUrl}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    preload="metadata" playsInline />
                )}

                {/* ── Social Post: solid bg + draggable/resizable video ── */}
                {videoFormat === 'social-post' && (
                  <div
                    onMouseDown={handleVideoDragStart}
                    style={{
                      position: 'absolute',
                      width: 'var(--vid-scale)',
                      height: 'auto',
                      top:  'calc(50% + var(--vid-y, 0%))',
                      left: 'calc(50% + var(--vid-x, 0%))',
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'auto',
                      cursor: 'move',
                    }}
                    title="Drag to reposition"
                  >
                    <video ref={videoRef} src={videoUrl}
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                      preload="metadata" playsInline />
                    <div className="absolute inset-0 ring-2 ring-white/30 rounded pointer-events-none" />
                    <div className={`${cornerBase} -top-1.5 -left-1.5 cursor-nwse-resize`}
                      onMouseDown={e => handleResizeStart(e, 'top')} />
                    <div className={`${cornerBase} -top-1.5 -right-1.5 cursor-nesw-resize`}
                      onMouseDown={e => handleResizeStart(e, 'top')} />
                    <div className={`${cornerBase} -bottom-1.5 -left-1.5 cursor-nesw-resize`}
                      onMouseDown={e => handleResizeStart(e, 'bottom')} />
                    <div className={`${cornerBase} -bottom-1.5 -right-1.5 cursor-nwse-resize`}
                      onMouseDown={e => handleResizeStart(e, 'bottom')} />
                  </div>
                )}

                {/* ── Cinematic: full-frame video + solid colored bar overlays ── */}
                {videoFormat === 'cinematic' && (
                  <>
                    <video ref={videoRef} src={videoUrl}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                      preload="metadata" playsInline />
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0,
                      height: `${barH}%`,
                      background: `#${cinematicBgColor}`,
                      pointerEvents: 'none',
                    }} />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: `${barH}%`,
                      background: `#${cinematicBgColor}`,
                      pointerEvents: 'none',
                    }} />
                  </>
                )}

                {/* ── Blur BG: single video + frosted-glass blur divs over bar zones ── */}
                {videoFormat === 'blur-bg' && (
                  <>
                    <video ref={videoRef} src={videoUrl}
                      style={{
                        position: 'absolute', inset: 0,
                        width: '100%', height: '100%',
                        objectFit: 'cover',
                        pointerEvents: 'none',
                      }}
                      preload="metadata" playsInline />
                    <div style={{
                      position: 'absolute', top: 0, left: 0, right: 0,
                      height: `${barH}%`,
                      backdropFilter: 'blur(14px) brightness(0.55)',
                      WebkitBackdropFilter: 'blur(14px) brightness(0.55)',
                      pointerEvents: 'none',
                    }} />
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      height: `${barH}%`,
                      backdropFilter: 'blur(14px) brightness(0.55)',
                      WebkitBackdropFilter: 'blur(14px) brightness(0.55)',
                      pointerEvents: 'none',
                    }} />
                  </>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                style={{
                  backgroundImage: 'linear-gradient(rgba(63,63,70,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(63,63,70,0.15) 1px, transparent 1px)',
                  backgroundSize: '33.33% 33.33%',
                }}>
                <div className="text-center space-y-2">
                  <svg className="h-10 w-10 text-zinc-700 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-zinc-700">Import a video to preview</p>
                </div>
              </div>
            )}

            {/* Overlay image */}
            {overlayEnabled && overlayPreviewUrl && (
              <img src={overlayPreviewUrl} alt="overlay"
                className="pointer-events-none object-contain"
                style={overlayCSS(overlayPosition, overlayScale)} />
            )}

            {/* Auto subtitle layer */}
            {autoEnabled && (
              <div className="absolute pointer-events-none"
                style={{ left: 'var(--auto-x)', top: 'var(--auto-y)', transform: 'translate(-50%,-50%)', maxWidth: '92%' }}>
                <span style={subtitleStyle(autoStyle, activeLayer === 'custom')}>{autoText}</span>
              </div>
            )}

            {/* Custom text layer */}
            {customEnabled && (
              <div className="absolute pointer-events-none"
                style={{ left: 'var(--custom-x)', top: 'var(--custom-y)', transform: 'translate(-50%,-50%)', maxWidth: '92%' }}>
                <span style={subtitleStyle(customStyle, activeLayer === 'auto')}>{customText}</span>
              </div>
            )}

            {/* Hints */}
            {(autoEnabled || customEnabled) && videoFormat !== 'social-post' && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                <span className="text-[10px] text-white/40 bg-black/30 rounded-full px-2 py-0.5">drag to reposition text</span>
              </div>
            )}
            {videoFormat === 'social-post' && videoUrl && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                <span className="text-[10px] text-white/40 bg-black/30 rounded-full px-2 py-0.5">drag to move · drag corners to resize</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Video Controls (hidden in crop mode) ── */}
      {!cropEditClipId && videoUrl && (
        <div className="flex-shrink-0 w-full flex flex-col gap-1.5 px-2" style={{ maxWidth: 'calc(min(100%, (100vh - 140px) * 9 / 16))' }}>
          <div
            className="w-full h-1.5 bg-zinc-700 rounded-full cursor-pointer overflow-hidden"
            onClick={handleScrubClick}
          >
            <div className="h-full bg-violet-500 rounded-full transition-none" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors flex-shrink-0"
            >
              {isPlaying ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            <span className="text-[10px] font-mono text-zinc-500 tabular-nums">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>

            {/* Thumbnail capture */}
            <button
              type="button"
              onClick={captureFrame}
              title="Capture thumbnail (JPG)"
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {zoomSelectClipId && (
              <span className="text-[10px] text-violet-400 bg-violet-900/30 rounded px-1.5 py-0.5">Click frame to set zoom target</span>
            )}

            {videoFormat !== 'standard' && !zoomSelectClipId && (
              <span className="ml-auto text-[9px] font-medium bg-zinc-800 text-zinc-500 rounded px-1.5 py-0.5 uppercase tracking-wide">
                {videoFormat.replace('-', ' ')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

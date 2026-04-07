'use client'
import { useRef, useEffect, useCallback, useState } from 'react'
import Tooltip from './Tooltip'

interface Pos { x: number; y: number }
type CropRect = { x: number; y: number; w: number; h: number }

interface SubtitleLayerStyle {
  fontSize: number
  color: string
  position: Pos
  fontFamily: string
  bold: boolean
  outlineWidth: number
  textAlign?: 'center' | 'left'
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
  activeLayer: 'auto' | 'custom' | 'custom2' | 'emoji'
  // Text 2 layer
  custom2Enabled: boolean
  custom2Lines: { id: number; start: number; end: number; text: string }[]
  custom2Style: SubtitleLayerStyle
  onCustom2PositionChange: (pos: Pos) => void
  // Emoji stickers
  emojiStickers: { id: string; emoji: string; x: number; y: number; size: number }[]
  onEmojiMove: (id: string, x: number, y: number) => void
  overlayEnabled: boolean
  overlayPreviewUrl: string | null
  overlayX: number
  overlayY: number
  overlayRotation: number
  overlayScale: number
  onOverlayMove: (x: number, y: number) => void
  // Watermark 1
  watermarkEnabled: boolean
  watermarkMode: 'image' | 'text'
  watermarkPreviewUrl: string | null
  watermarkText: string
  watermarkTextColor: string
  watermarkTextWeight: number
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom'
  watermarkCustomX: number
  watermarkCustomY: number
  onWatermarkPositionDrag: (x: number, y: number) => void
  watermarkScale: number
  watermarkOpacity: number
  watermarkStroke: number
  watermarkStrokeColor: string
  // Watermark 2
  watermark2Enabled: boolean
  watermark2PreviewUrl: string | null
  watermark2Position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom'
  watermark2Scale: number
  watermark2Opacity: number
  watermark2Stroke: number
  watermark2StrokeColor: string
  videoFormat: 'standard' | 'social-post' | 'cinematic' | 'blur-bg'
  standardBgColor: string
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
  // Output dimensions (for correct aspect ratio preview)
  presetWidth: number
  presetHeight: number
  // Preview toggles
  showOriginal?: boolean
  onToggleShowOriginal?: () => void
  showGrid?: boolean
  onToggleShowGrid?: () => void
  // Active clip effects for live preview
  clipColorPreset?: string
  clipFlipH?: boolean
  clipFlipV?: boolean
  // Active clip crop (for CSS preview while re-trim is pending)
  clipCrop?: { x: number; y: number; w: number; h: number }
  clipIsTrimming?: boolean
}

function overlayCSS(x: number, y: number, rotation: number, scale: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    width: `${scale}%`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
  }
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

const SNAP_X_GUIDES = [50]
const SNAP_Y_GUIDES = [25, 50, 75]
const SNAP_THRESHOLD = 4

function applySnap(x: number, y: number): { x: number; y: number; hx: number | null; hy: number | null } {
  let hx: number | null = null
  let hy: number | null = null
  for (const g of SNAP_X_GUIDES) { if (Math.abs(x - g) < SNAP_THRESHOLD) { x = g; hx = g; break } }
  for (const g of SNAP_Y_GUIDES) { if (Math.abs(y - g) < SNAP_THRESHOLD) { y = g; hy = g; break } }
  return { x, y, hx, hy }
}

export default function PreviewPanel({
  videoUrl,
  autoEnabled, autoLines, autoStyle, onAutoPositionChange,
  customEnabled, customLines, customStyle, onCustomPositionChange,
  activeLayer,
  custom2Enabled, custom2Lines, custom2Style, onCustom2PositionChange,
  emojiStickers, onEmojiMove,
  overlayEnabled, overlayPreviewUrl, overlayX, overlayY, overlayRotation, overlayScale, onOverlayMove,
  watermarkEnabled, watermarkMode, watermarkPreviewUrl, watermarkText, watermarkTextColor, watermarkTextWeight, watermarkPosition, watermarkCustomX, watermarkCustomY, onWatermarkPositionDrag, watermarkScale, watermarkOpacity, watermarkStroke, watermarkStrokeColor,
  watermark2Enabled, watermark2PreviewUrl, watermark2Position, watermark2Scale, watermark2Opacity, watermark2Stroke, watermark2StrokeColor,
  videoFormat, standardBgColor, socialBgColor, socialVideoScale, onSocialVideoScaleChange,
  cinematicBgColor, videoBarHeight,
  videoOffsetX, videoOffsetY, onVideoOffsetChange,
  sourceVideoUrl, sourceVideoAR,
  cropEditClipId, activeCropRect, onCropChange, onCropDone, onCropCancel,
  zoomSelectClipId, onZoomPointSet,
  presetWidth, presetHeight,
  showOriginal, onToggleShowOriginal,
  showGrid, onToggleShowGrid,
  clipColorPreset, clipFlipH, clipFlipV,
  clipCrop, clipIsTrimming,
}: PreviewPanelProps) {
  const containerRef     = useRef<HTMLDivElement>(null)
  const videoRef         = useRef<HTMLVideoElement>(null)

  // CSS filter to approximate FFmpeg color presets in real-time preview
  const videoFilterStyle: React.CSSProperties = (() => {
    const filters: string[] = []
    const transforms: string[] = []
    switch (clipColorPreset) {
      // Basic
      case 'warm':      filters.push('contrast(1.05)', 'brightness(1.02)', 'saturate(1.2)', 'sepia(0.1)'); break
      case 'cool':      filters.push('contrast(1.05)', 'saturate(1.1)', 'hue-rotate(10deg)'); break
      case 'vivid':     filters.push('contrast(1.15)', 'brightness(1.03)', 'saturate(1.6)'); break
      case 'cinematic': filters.push('contrast(1.1)', 'brightness(0.98)', 'saturate(0.85)'); break
      case 'bw':        filters.push('grayscale(1)', 'contrast(1.1)'); break
      case 'faded':     filters.push('contrast(0.85)', 'brightness(1.08)', 'saturate(0.7)'); break
      case 'night':     filters.push('contrast(1.2)', 'brightness(0.92)', 'saturate(0.9)', 'hue-rotate(-10deg)'); break
      // Stylized FX
      case 'vintage':   filters.push('contrast(0.9)', 'brightness(1.05)', 'saturate(0.6)', 'sepia(0.3)'); break
      case 'retro':     filters.push('contrast(1.0)', 'brightness(1.04)', 'saturate(0.8)', 'sepia(0.2)'); break
      case 'cyberpunk': filters.push('contrast(1.3)', 'brightness(0.97)', 'saturate(1.4)', 'hue-rotate(280deg)'); break
      case 'dreamy':    filters.push('contrast(0.8)', 'brightness(1.1)', 'saturate(0.9)', 'blur(0.5px)'); break
      case 'film':      filters.push('contrast(1.05)', 'brightness(0.99)', 'saturate(0.9)', 'sepia(0.05)'); break
      case 'vignette':  filters.push('contrast(1.05)'); break // vignette done via CSS shadow below
      case 'hicon':     filters.push('contrast(1.4)', 'brightness(0.97)', 'saturate(1.1)'); break
      case 'bleach':    filters.push('contrast(1.3)', 'saturate(0.4)'); break
      case 'tealorg':   filters.push('contrast(1.1)', 'saturate(1.2)', 'hue-rotate(-5deg)'); break
      case 'sunset':    filters.push('contrast(1.05)', 'brightness(1.03)', 'saturate(1.3)', 'sepia(0.15)'); break
      case 'arctic':    filters.push('contrast(1.1)', 'brightness(1.05)', 'saturate(0.7)', 'hue-rotate(15deg)'); break
      case 'neon':      filters.push('contrast(1.25)', 'saturate(2.0)'); break
      case 'sepia':     filters.push('sepia(0.8)', 'contrast(1.05)'); break
      case 'lomo':      filters.push('contrast(1.3)', 'brightness(0.95)', 'saturate(1.3)', 'sepia(0.1)'); break
      case 'chrome':    filters.push('contrast(1.2)', 'brightness(1.02)', 'saturate(0.3)'); break
      case 'noir':      filters.push('grayscale(1)', 'contrast(1.35)', 'brightness(0.95)'); break
      case 'popart':    filters.push('contrast(1.5)', 'brightness(1.05)', 'saturate(2.5)'); break
      case 'golden':    filters.push('contrast(1.05)', 'brightness(1.04)', 'saturate(1.1)', 'sepia(0.15)'); break
      case 'moody':     filters.push('contrast(1.15)', 'brightness(0.94)', 'saturate(0.75)', 'hue-rotate(-5deg)'); break
      case 'pastel':    filters.push('contrast(0.75)', 'brightness(1.12)', 'saturate(0.65)'); break
    }
    // Vignette uses an inset box-shadow overlay instead of a filter
    if (clipColorPreset === 'vignette') {
      // handled via a separate overlay div
    }
    if (clipFlipH) transforms.push('scaleX(-1)')
    if (clipFlipV) transforms.push('scaleY(-1)')
    // Show CSS crop preview ONLY while re-trim is in progress (the source video
    // is showing, not yet cropped by FFmpeg). Once trim completes, the trimmed video
    // file is already cropped so clip-path would double-crop.
    const hasCrop = clipCrop && clipIsTrimming && !(clipCrop.x === 0 && clipCrop.y === 0 && clipCrop.w === 100 && clipCrop.h === 100)
    const cropStyle: React.CSSProperties = hasCrop ? {
      clipPath: `inset(${clipCrop!.y}% ${100 - clipCrop!.x - clipCrop!.w}% ${100 - clipCrop!.y - clipCrop!.h}% ${clipCrop!.x}%)`,
    } : {}

    return {
      ...(filters.length > 0 ? { filter: filters.join(' ') } : {}),
      ...(transforms.length > 0 ? { transform: transforms.join(' ') } : {}),
      ...cropStyle,
    }
  })()

  // Crop editor refs
  const cropContainerRef = useRef<HTMLDivElement>(null)
  const cropDragModeRef  = useRef<'idle' | 'drawing' | 'moving' | 'tl' | 'tr' | 'bl' | 'br'>('idle')
  const cropDragStartRef = useRef<{ mx: number; my: number; initCrop: CropRect } | null>(null)
  const activeCropRectRef = useRef(activeCropRect)
  const onCropChangeRef   = useRef(onCropChange)
  useEffect(() => { activeCropRectRef.current = activeCropRect }, [activeCropRect])
  useEffect(() => { onCropChangeRef.current = onCropChange }, [onCropChange])

  // Tracks main video time persistently (survives conditional unmount in crop mode)
  const lastMainVideoTimeRef = useRef(0)

  // Thumbnail for crop editor — direct img src, no blob URLs
  const cropJobId = sourceVideoUrl?.match(/^\/files\/([^/]+)\//)?.[1] ?? null
  const thumbnailSrc = cropEditClipId && cropJobId
    ? `/api/thumbnail?jobId=${encodeURIComponent(cropJobId)}`
    : null

  const [thumbLoaded, setThumbLoaded] = useState(false)
  const [thumbError, setThumbError] = useState(false)
  const [thumbnailNaturalSize, setThumbnailNaturalSize] = useState<{ w: number; h: number } | null>(null)

  // Reset load states whenever the thumbnail source changes
  useEffect(() => {
    setThumbLoaded(false)
    setThumbError(false)
    setThumbnailNaturalSize(null)
  }, [thumbnailSrc])

  // Playback state
  const [isPlaying, setIsPlaying]   = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]     = useState(0)

  // Subtitle drag
  const isDraggingRef   = useRef(false)
  const rafRef          = useRef<number | null>(null)
  const lastPosRef      = useRef<{ pos: Pos; layer: 'auto' | 'custom' | 'custom2' | 'emoji' } | null>(null)

  // Emoji drag refs
  const emojiDragIdRef    = useRef<string | null>(null)
  const emojiRafRef       = useRef<number | null>(null)
  const lastEmojiPosRef   = useRef<{ x: number; y: number } | null>(null)
  const emojiDragStartRef = useRef<{ mx: number; my: number; initX: number; initY: number } | null>(null)

  // Overlay drag
  const overlayImgRef       = useRef<HTMLImageElement>(null)
  const overlayDragRef      = useRef(false)
  const overlayDragStartRef = useRef<{ mx: number; my: number; initX: number; initY: number } | null>(null)
  const lastOverlayPosRef   = useRef<{ x: number; y: number } | null>(null)
  const overlayRafRef       = useRef<number | null>(null)

  // Watermark drag
  const wmDragRef      = useRef(false)
  const wmDragStartRef = useRef<{ mx: number; my: number; initX: number; initY: number } | null>(null)

  // Snap guide lines
  const snapVLineRef    = useRef<HTMLDivElement>(null)
  const snapHLineRef    = useRef<HTMLDivElement>(null)
  const snapH25LineRef  = useRef<HTMLDivElement>(null)
  const snapH75LineRef  = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const c = containerRef.current
    if (!c) return
    c.style.setProperty('--custom2-x', `${custom2Style.position.x}%`)
    c.style.setProperty('--custom2-y', `${custom2Style.position.y}%`)
  }, [custom2Style.position.x, custom2Style.position.y])

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

  const setCSSSubPos = useCallback((pos: Pos, layer: 'auto' | 'custom' | 'custom2' | 'emoji') => {
    const c = containerRef.current
    if (!c) return
    if (layer === 'auto') { c.style.setProperty('--auto-x', `${pos.x}%`); c.style.setProperty('--auto-y', `${pos.y}%`) }
    else if (layer === 'custom') { c.style.setProperty('--custom-x', `${pos.x}%`); c.style.setProperty('--custom-y', `${pos.y}%`) }
    else if (layer === 'custom2') { c.style.setProperty('--custom2-x', `${pos.x}%`); c.style.setProperty('--custom2-y', `${pos.y}%`) }
  }, [])

  // ── Snap guide line helpers ──
  const updateSnapLines = useCallback((hx: number | null, hy: number | null) => {
    if (snapVLineRef.current)   snapVLineRef.current.style.display   = hx === 50 ? 'block' : 'none'
    if (snapHLineRef.current)   snapHLineRef.current.style.display   = hy === 50 ? 'block' : 'none'
    if (snapH25LineRef.current) snapH25LineRef.current.style.display = hy === 25 ? 'block' : 'none'
    if (snapH75LineRef.current) snapH75LineRef.current.style.display = hy === 75 ? 'block' : 'none'
  }, [])
  const clearSnapLines = useCallback(() => { updateSnapLines(null, null) }, [updateSnapLines])

  // ── Overlay drag start ──
  const handleOverlayDragStart = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation()
    e.preventDefault()
    overlayDragRef.current = true
    overlayDragStartRef.current = { mx: e.clientX, my: e.clientY, initX: overlayX, initY: overlayY }
  }, [overlayX, overlayY])

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

  // ── Emoji drag start ──
  const handleEmojiDragStart = (e: React.MouseEvent, id: string, initX: number, initY: number) => {
    e.stopPropagation()
    e.preventDefault()
    emojiDragIdRef.current = id
    emojiDragStartRef.current = { mx: e.clientX, my: e.clientY, initX, initY }
  }

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
    if (activeLayer === 'emoji') return
    e.preventDefault()
    isDraggingRef.current = true
    const raw = getPosFromEvent(e)
    if (!raw) return
    const { x, y, hx, hy } = applySnap(raw.x, raw.y)
    const pos = { x, y }
    updateSnapLines(hx, hy)
    setCSSSubPos(pos, activeLayer)
    if (activeLayer === 'auto') onAutoPositionChange(pos)
    else if (activeLayer === 'custom') onCustomPositionChange(pos)
    else if (activeLayer === 'custom2') onCustom2PositionChange(pos)
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
      // Overlay drag
      if (overlayDragRef.current) {
        const start = overlayDragStartRef.current
        if (!start || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const dxPct = ((e.clientX - start.mx) / rect.width) * 100
        const dyPct = ((e.clientY - start.my) / rect.height) * 100
        const rawX = Math.max(0, Math.min(100, start.initX + dxPct))
        const rawY = Math.max(0, Math.min(100, start.initY + dyPct))
        const { x: newX, y: newY, hx, hy } = applySnap(rawX, rawY)
        updateSnapLines(hx, hy)
        lastOverlayPosRef.current = { x: newX, y: newY }
        if (overlayImgRef.current) {
          overlayImgRef.current.style.left = `${newX}%`
          overlayImgRef.current.style.top = `${newY}%`
        }
        if (overlayRafRef.current === null) {
          overlayRafRef.current = requestAnimationFrame(() => {
            overlayRafRef.current = null
            const p = lastOverlayPosRef.current
            if (p) onOverlayMove(p.x, p.y)
          })
        }
        return
      }

      // Watermark drag
      if (wmDragRef.current) {
        const start = wmDragStartRef.current
        if (!start || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const dxPct = ((e.clientX - start.mx) / rect.width) * 100
        const dyPct = ((e.clientY - start.my) / rect.height) * 100
        const newX = Math.max(0, Math.min(100, start.initX + dxPct))
        const newY = Math.max(0, Math.min(100, start.initY + dyPct))
        onWatermarkPositionDrag(Math.round(newX * 10) / 10, Math.round(newY * 10) / 10)
        return
      }

      // Emoji drag
      if (emojiDragIdRef.current !== null) {
        const start = emojiDragStartRef.current
        if (!start || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const dxPct = ((e.clientX - start.mx) / rect.width) * 100
        const dyPct = ((e.clientY - start.my) / rect.height) * 100
        const rawX = Math.max(2, Math.min(98, start.initX + dxPct))
        const rawY = Math.max(2, Math.min(98, start.initY + dyPct))
        const { x: newX, y: newY, hx, hy } = applySnap(rawX, rawY)
        updateSnapLines(hx, hy)
        lastEmojiPosRef.current = { x: newX, y: newY }
        const el = containerRef.current.querySelector(`[data-emoji-id="${emojiDragIdRef.current}"]`) as HTMLElement | null
        if (el) {
          el.style.left = `${newX}%`
          el.style.top = `${newY}%`
        }
        if (emojiRafRef.current === null) {
          emojiRafRef.current = requestAnimationFrame(() => {
            emojiRafRef.current = null
            const p = lastEmojiPosRef.current
            const id = emojiDragIdRef.current
            if (p && id) onEmojiMove(id, p.x, p.y)
          })
        }
        return
      }

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
      // Video drag (social-post) — snap to center offset (0,0)
      if (isVideoMovingRef.current) {
        const start = videoMoveStartRef.current
        if (!start || !containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const dxPct = ((e.clientX - start.mouseX) / rect.width)  * 100
        const dyPct = ((e.clientY - start.mouseY) / rect.height) * 100
        let newX = Math.max(-80, Math.min(80, start.initX + dxPct))
        let newY = Math.max(-80, Math.min(80, start.initY + dyPct))
        // snap offset to 0 = perfectly centered
        let hx: number | null = null, hy: number | null = null
        if (Math.abs(newX) < SNAP_THRESHOLD) { newX = 0; hx = 50 }
        if (Math.abs(newY) < SNAP_THRESHOLD) { newY = 0; hy = 50 }
        updateSnapLines(hx, hy)
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
      const raw = getPosFromEvent(e)
      if (!raw) return
      const { x, y, hx, hy } = applySnap(raw.x, raw.y)
      const pos = { x, y }
      updateSnapLines(hx, hy)
      setCSSSubPos(pos, activeLayer)
      lastPosRef.current = { pos, layer: activeLayer }
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null
          const p = lastPosRef.current
          if (p) {
            if (p.layer === 'auto') onAutoPositionChange(p.pos)
            else if (p.layer === 'custom') onCustomPositionChange(p.pos)
            else if (p.layer === 'custom2') onCustom2PositionChange(p.pos)
          }
        })
      }
    }

    const onUp = () => {
      if (overlayDragRef.current) {
        overlayDragRef.current = false
        if (overlayRafRef.current !== null) { cancelAnimationFrame(overlayRafRef.current); overlayRafRef.current = null }
        const p = lastOverlayPosRef.current
        if (p) { onOverlayMove(p.x, p.y); lastOverlayPosRef.current = null }
        overlayDragStartRef.current = null
        clearSnapLines()
        return
      }
      if (wmDragRef.current) {
        wmDragRef.current = false
        wmDragStartRef.current = null
        return
      }
      if (emojiDragIdRef.current !== null) {
        if (emojiRafRef.current !== null) { cancelAnimationFrame(emojiRafRef.current); emojiRafRef.current = null }
        const p = lastEmojiPosRef.current
        const id = emojiDragIdRef.current
        if (p && id) { onEmojiMove(id, p.x, p.y); lastEmojiPosRef.current = null }
        emojiDragIdRef.current = null
        emojiDragStartRef.current = null
        clearSnapLines()
        return
      }
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
        clearSnapLines()
        return
      }
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
      const p = lastPosRef.current
      if (p) {
        if (p.layer === 'auto') onAutoPositionChange(p.pos)
        else if (p.layer === 'custom') onCustomPositionChange(p.pos)
        else if (p.layer === 'custom2') onCustom2PositionChange(p.pos)
        lastPosRef.current = null
      }
      clearSnapLines()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [activeLayer, getPosFromEvent, setCSSSubPos, onAutoPositionChange, onCustomPositionChange, onCustom2PositionChange, onEmojiMove, onVideoOffsetChange, onSocialVideoScaleChange, videoFormat, socialVideoScale, onOverlayMove, updateSnapLines, clearSnapLines])

  // ── Text helpers ──
  const autoText    = autoLines.length    > 0 ? autoLines[Math.floor(autoLines.length / 2)].text    : 'Auto subtitle'
  const customText  = customLines.length  > 0 ? customLines[Math.floor(customLines.length / 2)].text  : 'Custom text'
  const custom2Text = custom2Lines.length > 0 ? custom2Lines[Math.floor(custom2Lines.length / 2)].text : 'Text 2'

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
      textAlign: style.textAlign === 'left' ? 'left' : 'center',
      opacity: dim ? 0.45 : 1,
      transition: 'opacity 0.15s',
    }
  }

  const barH = Math.max(5, Math.min(45, videoBarHeight))

  const containerBg =
    videoFormat === 'social-post' ? `#${socialBgColor}` :
    videoFormat === 'standard'    ? `#${standardBgColor}` : undefined

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
        <div className="flex-1 flex flex-col gap-3 w-full min-h-0">

          {/* Top toolbar: Cancel / hint / readout / Reset / Done */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={onCropCancel}
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 flex-shrink-0"
            >
              Cancel
            </button>
            <span className="text-xs text-zinc-600 flex-1 min-w-0 truncate">Drag corners to resize · drag inside to move</span>
            <span className="text-xs font-mono text-zinc-400 flex-shrink-0 tabular-nums">
              {thumbnailNaturalSize && thumbLoaded
                ? `${Math.round(activeCropRect.w / 100 * thumbnailNaturalSize.w)}×${Math.round(activeCropRect.h / 100 * thumbnailNaturalSize.h)} @ ${Math.round(activeCropRect.x / 100 * thumbnailNaturalSize.w)},${Math.round(activeCropRect.y / 100 * thumbnailNaturalSize.h)}`
                : `${Math.round(activeCropRect.w)}×${Math.round(activeCropRect.h)}`
              }
            </span>
            <button
              type="button"
              onClick={() => onCropChange({ x: 0, y: 0, w: 100, h: 100 })}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2.5 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 flex-shrink-0"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onCropDone}
              className="text-sm bg-violet-600 hover:bg-violet-500 btn-press text-white font-semibold rounded-lg px-5 py-2 transition-colors flex-shrink-0"
            >
              Done
            </button>
          </div>

          {/* Crop container sized to source AR */}
          <div className="flex-1 flex items-center justify-center w-full min-h-0">
            <div
              ref={cropContainerRef}
              className="relative overflow-hidden rounded-xl border border-border select-none"
              style={{
                aspectRatio: sourceVideoAR ? String(sourceVideoAR) : '9/16',
                // Drive from height for portrait (AR≤1), from width for landscape (AR>1)
                ...(sourceVideoAR && sourceVideoAR > 1
                  ? { width: '100%', maxHeight: '100%' }
                  : { height: '100%', maxWidth: '100%' }
                ),
                cursor: 'crosshair',
              }}
              onMouseDown={handleCropMouseDown}
            >
              {/* Background: always zinc-900 so no black flash */}
              <div className="absolute inset-0 bg-surface-1" />

              {/* Spinner while image loads */}
              {thumbnailSrc && !thumbLoaded && !thumbError && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-9 h-9 rounded-full border-[3px] border-violet-500 border-t-transparent animate-spin" />
                </div>
              )}

              {/* Thumbnail — always in DOM when src is set, hidden until loaded */}
              {thumbnailSrc && (
                <img
                  key={thumbnailSrc}
                  src={thumbnailSrc}
                  alt="Video frame"
                  onLoad={(e) => {
                    const img = e.currentTarget
                    setThumbnailNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
                    setThumbLoaded(true)
                  }}
                  onError={() => setThumbError(true)}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0,
                    width: '100%', height: '100%',
                    objectFit: 'fill',
                    pointerEvents: 'none',
                    display: thumbLoaded ? 'block' : 'none',
                  }}
                />
              )}

              {/* Fallback: no source or load error */}
              {(!thumbnailSrc || thumbError) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
                  <span className="text-zinc-400 text-sm">Frame unavailable</span>
                  <span className="text-zinc-600 text-xs">Re-import your video to use the crop editor</span>
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

              {/* Corner + edge handles */}
              {(['tl', 'tc', 'tr', 'ml', 'mr', 'bl', 'bc', 'br'] as const).map(handle => {
                const isCorner = handle.length === 2 && !handle.includes('c') && !handle.includes('m')
                const isMid = handle.includes('c') || handle.includes('m')
                if (!isCorner && !isMid) return null
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
                return (
                  <div
                    key={handle}
                    onMouseDown={corner ? e => handleCropCornerDown(e, corner) : undefined}
                    style={{
                      position: 'absolute',
                      left: `${lx}%`, top: `${ly}%`,
                      transform: 'translate(-50%, -50%)',
                      width: isCorner ? 14 : 10,
                      height: isCorner ? 14 : 10,
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
            className="relative overflow-hidden rounded-xl border border-border shadow-2xl bg-surface-1 select-none"
            style={{
              aspectRatio: `${presetWidth}/${presetHeight}`,
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
                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    style={videoFilterStyle}
                    preload="metadata" playsInline />
                )}

                {/* ── Social Post: solid bg + draggable/resizable video ── */}
                {videoFormat === 'social-post' && (
                  <div
                    onMouseDown={handleVideoDragStart}
                    style={{
                      position: 'absolute',
                      width: 'var(--vid-scale)',
                      top:  'calc(50% + var(--vid-y, 0%))',
                      left: 'calc(50% + var(--vid-x, 0%))',
                      transform: 'translate(-50%, -50%)',
                      pointerEvents: 'auto',
                      cursor: 'move',
                      lineHeight: 0,
                    }}
                  >
                    <video ref={videoRef} src={videoUrl}
                      style={{ width: '100%', height: 'auto', display: 'block', ...videoFilterStyle }}
                      preload="metadata" playsInline />
                    <div className="absolute inset-0 ring-2 ring-white/30 rounded pointer-events-none" />
                    <div className={`${cornerBase} top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize`}
                      onMouseDown={e => handleResizeStart(e, 'top')} />
                    <div className={`${cornerBase} top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize`}
                      onMouseDown={e => handleResizeStart(e, 'top')} />
                    <div className={`${cornerBase} bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize`}
                      onMouseDown={e => handleResizeStart(e, 'bottom')} />
                    <div className={`${cornerBase} bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize`}
                      onMouseDown={e => handleResizeStart(e, 'bottom')} />
                  </div>
                )}

                {/* ── Cinematic: full-frame video + solid colored bar overlays ── */}
                {videoFormat === 'cinematic' && (
                  <>
                    <video ref={videoRef} src={videoUrl}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', ...videoFilterStyle }}
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
                        ...videoFilterStyle,
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
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Ambient violet glow behind icon */}
                <div className="absolute w-48 h-48 rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
                <div className="relative text-center space-y-3">
                  {/* Dashed drop-zone border */}
                  <div className="mx-auto w-20 h-20 rounded-2xl border-2 border-dashed border-violet-600/20 flex items-center justify-center">
                    <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-zinc-500 font-medium">Paste a URL to get started</p>
                  <p className="text-[11px] text-zinc-700 font-mono tracking-wide">Cmd+V to paste</p>
                </div>
              </div>
            )}

            {/* Snap guide lines — shown during drag when snapping */}
            <div ref={snapVLineRef}   style={{ display: 'none', position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(139,92,246,0.75)', pointerEvents: 'none', zIndex: 50 }} />
            <div ref={snapHLineRef}   style={{ display: 'none', position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(139,92,246,0.75)', pointerEvents: 'none', zIndex: 50 }} />
            <div ref={snapH25LineRef} style={{ display: 'none', position: 'absolute', top: '25%', left: 0, right: 0, height: 1, background: 'rgba(139,92,246,0.5)',  pointerEvents: 'none', zIndex: 50 }} />
            <div ref={snapH75LineRef} style={{ display: 'none', position: 'absolute', top: '75%', left: 0, right: 0, height: 1, background: 'rgba(139,92,246,0.5)',  pointerEvents: 'none', zIndex: 50 }} />

            {/* Overlay image — draggable */}
            {overlayEnabled && overlayPreviewUrl && !showOriginal && (
              <img
                ref={overlayImgRef}
                src={overlayPreviewUrl}
                alt="overlay"
                draggable={false}
                className="object-contain"
                style={{ ...overlayCSS(overlayX, overlayY, overlayRotation, overlayScale), cursor: 'move', pointerEvents: 'auto', zIndex: 15 }}
                onMouseDown={handleOverlayDragStart}
              />
            )}

            {/* Vignette effect overlay (for vignette and lomo presets) */}
            {(clipColorPreset === 'vignette' || clipColorPreset === 'lomo') && !showOriginal && (
              <div className="absolute inset-0 pointer-events-none" style={{
                boxShadow: 'inset 0 0 80px 30px rgba(0,0,0,0.6)',
                zIndex: 14,
              }} />
            )}

            {/* Watermark 1 — image mode */}
            {watermarkEnabled && !showOriginal && watermarkMode === 'image' && watermarkPreviewUrl && (
              <img
                src={watermarkPreviewUrl}
                alt="watermark"
                draggable={false}
                className="absolute object-contain"
                style={{
                  width: `${watermarkScale}%`,
                  opacity: watermarkOpacity,
                  zIndex: 16,
                  cursor: watermarkPosition === 'custom' ? 'move' : 'default',
                  pointerEvents: watermarkPosition === 'custom' ? 'auto' : 'none',
                  ...(watermarkStroke > 0 ? { filter: `drop-shadow(0 0 ${watermarkStroke}px #${watermarkStrokeColor})` } : {}),
                  ...(watermarkPosition === 'custom' ? { left: `${watermarkCustomX}%`, top: `${watermarkCustomY}%`, transform: 'translate(-50%, -50%)' } : {}),
                  ...(watermarkPosition === 'top-left' && { top: '3%', left: '3%' }),
                  ...(watermarkPosition === 'top-right' && { top: '3%', right: '3%' }),
                  ...(watermarkPosition === 'bottom-left' && { bottom: '3%', left: '3%' }),
                  ...(watermarkPosition === 'bottom-right' && { bottom: '3%', right: '3%' }),
                  ...(watermarkPosition === 'center' && { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
                }}
                onMouseDown={watermarkPosition === 'custom' ? (e) => {
                  e.stopPropagation(); e.preventDefault()
                  wmDragRef.current = true
                  wmDragStartRef.current = { mx: e.clientX, my: e.clientY, initX: watermarkCustomX, initY: watermarkCustomY }
                } : undefined}
              />
            )}
            {/* Watermark 1 — text mode */}
            {watermarkEnabled && !showOriginal && watermarkMode === 'text' && watermarkText && (
              <span
                className="absolute whitespace-nowrap"
                style={{
                  fontFamily: "'Trebuchet MS', 'DejaVu Sans', var(--font-ui), sans-serif",
                  fontWeight: watermarkTextWeight,
                  fontSize: `${Math.max(2, watermarkScale * 0.6)}cqi`,
                  color: `#${watermarkTextColor}`,
                  opacity: watermarkOpacity,
                  letterSpacing: '0.02em',
                  zIndex: 16,
                  cursor: watermarkPosition === 'custom' ? 'move' : 'default',
                  pointerEvents: watermarkPosition === 'custom' ? 'auto' : 'none',
                  ...(watermarkStroke > 0 ? {
                    textShadow: `0 0 ${watermarkStroke}px #${watermarkStrokeColor}, 0 0 ${watermarkStroke}px #${watermarkStrokeColor}`,
                  } : {}),
                  ...(watermarkPosition === 'custom' ? { left: `${watermarkCustomX}%`, top: `${watermarkCustomY}%`, transform: 'translate(-50%, -50%)' } : {}),
                  ...(watermarkPosition === 'top-left' && { top: '3%', left: '3%' }),
                  ...(watermarkPosition === 'top-right' && { top: '3%', right: '3%' }),
                  ...(watermarkPosition === 'bottom-left' && { bottom: '3%', left: '3%' }),
                  ...(watermarkPosition === 'bottom-right' && { bottom: '3%', right: '3%' }),
                  ...(watermarkPosition === 'center' && { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
                }}
                onMouseDown={watermarkPosition === 'custom' ? (e) => {
                  e.stopPropagation(); e.preventDefault()
                  wmDragRef.current = true
                  wmDragStartRef.current = { mx: e.clientX, my: e.clientY, initX: watermarkCustomX, initY: watermarkCustomY }
                } : undefined}
              >
                {watermarkText}
              </span>
            )}

            {/* Watermark 2 — static position */}
            {watermark2Enabled && watermark2PreviewUrl && !showOriginal && (
              <img
                src={watermark2PreviewUrl}
                alt="watermark 2"
                draggable={false}
                className="absolute object-contain pointer-events-none"
                style={{
                  width: `${watermark2Scale}%`,
                  opacity: watermark2Opacity,
                  zIndex: 16,
                  ...(watermark2Stroke > 0 ? { filter: `drop-shadow(0 0 ${watermark2Stroke}px #${watermark2StrokeColor})` } : {}),
                  ...(watermark2Position === 'top-left' && { top: '3%', left: '3%' }),
                  ...(watermark2Position === 'top-right' && { top: '3%', right: '3%' }),
                  ...(watermark2Position === 'bottom-left' && { bottom: '3%', left: '3%' }),
                  ...(watermark2Position === 'bottom-right' && { bottom: '3%', right: '3%' }),
                  ...(watermark2Position === 'center' && { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }),
                }}
              />
            )}

            {/* Auto subtitle layer */}
            {autoEnabled && !showOriginal && (
              <div className="absolute pointer-events-none"
                style={{ left: 'var(--auto-x, 50%)', top: 'var(--auto-y, 85%)', transform: autoStyle.textAlign === 'left' ? 'translate(0%,-50%)' : 'translate(-50%,-50%)', maxWidth: '92%', zIndex: 25 }}>
                <span style={subtitleStyle(autoStyle, activeLayer === 'custom')}>{autoText}</span>
              </div>
            )}

            {/* Custom text layer */}
            {customEnabled && !showOriginal && (
              <div className="absolute pointer-events-none"
                style={{ left: 'var(--custom-x, 50%)', top: 'var(--custom-y, 50%)', transform: customStyle.textAlign === 'left' ? 'translate(0%,-50%)' : 'translate(-50%,-50%)', maxWidth: '92%', zIndex: 25 }}>
                <span style={subtitleStyle(customStyle, activeLayer === 'auto')}>{customText}</span>
              </div>
            )}

            {/* Custom text 2 layer */}
            {custom2Enabled && !showOriginal && (
              <div className="absolute pointer-events-none"
                style={{ left: 'var(--custom2-x, 50%)', top: 'var(--custom2-y, 50%)', transform: custom2Style.textAlign === 'left' ? 'translate(0%,-50%)' : 'translate(-50%,-50%)', maxWidth: '92%', zIndex: 25 }}>
                <span style={subtitleStyle(custom2Style, activeLayer !== 'custom2')}>{custom2Text}</span>
              </div>
            )}

            {/* Emoji stickers */}
            {emojiStickers.map(sticker => (
              <div
                key={sticker.id}
                data-emoji-id={sticker.id}
                className="absolute select-none pointer-events-auto"
                style={{
                  left: `${sticker.x}%`,
                  top: `${sticker.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: `${sticker.size}cqw`,
                  cursor: 'move',
                  lineHeight: 1,
                  zIndex: 20,
                }}
                onMouseDown={e => handleEmojiDragStart(e, sticker.id, sticker.x, sticker.y)}
              >
                {sticker.emoji}
              </div>
            ))}

            {/* Grid overlay (rule of thirds) */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 30 }}>
                <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)' }} />
                <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.15)' }} />
                <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.15)' }} />
                <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.15)' }} />
              </div>
            )}

            {/* Before/after: show original (hide subtitle/overlay layers) */}
            {showOriginal && (
              <div className="absolute inset-0 bg-black/0 pointer-events-none z-40 flex items-end justify-center pb-2">
                <span className="text-[10px] text-white/60 bg-black/40 rounded-full px-2 py-0.5">Original</span>
              </div>
            )}

            {/* Hints */}
            {(autoEnabled || customEnabled || custom2Enabled) && activeLayer !== 'emoji' && videoFormat !== 'social-post' && !showOriginal && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center pointer-events-none">
                <span className="text-[10px] text-white/40 bg-black/30 rounded-full px-2 py-0.5">drag to reposition text</span>
              </div>
            )}
            {videoFormat === 'social-post' && videoUrl && !showOriginal && (
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
            className="w-full h-1.5 bg-surface-3 rounded-full cursor-pointer overflow-hidden"
            onClick={handleScrubClick}
          >
            <div className="h-full bg-violet-500 rounded-full transition-none" style={{ width: `${progress}%` }} />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-2 hover:bg-surface-3 text-zinc-300 transition-colors flex-shrink-0"
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
            <Tooltip text="Capture current frame as JPG thumbnail">
            <button
              type="button"
              onClick={captureFrame}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-2 hover:bg-surface-3 text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            </Tooltip>

            {zoomSelectClipId && (
              <span className="text-[10px] text-violet-400 bg-violet-900/30 rounded px-1.5 py-0.5">Click frame to set zoom target</span>
            )}

            <div className="ml-auto flex items-center gap-1">
              {/* Before/After toggle */}
              {onToggleShowOriginal && (
                <Tooltip text={showOriginal ? 'Show edited preview' : 'Show original video'}>
                <button
                  type="button"
                  onClick={onToggleShowOriginal}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-all ${showOriginal ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-border bg-surface-2 text-zinc-500 hover:text-zinc-300'}`}
                >
                  {showOriginal ? 'Original' : 'Edited'}
                </button>
                </Tooltip>
              )}
              {/* Grid overlay toggle */}
              {onToggleShowGrid && (
                <Tooltip text="Rule of thirds grid">
                <button
                  type="button"
                  onClick={onToggleShowGrid}
                  className={`w-6 h-6 flex items-center justify-center rounded border transition-all ${showGrid ? 'border-violet-500 bg-violet-600/20 text-violet-300' : 'border-border bg-surface-2 text-zinc-500 hover:text-zinc-300'}`}
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16M8 4v16M16 4v16" />
                  </svg>
                </button>
                </Tooltip>
              )}
              {videoFormat !== 'standard' && !zoomSelectClipId && (
                <span className="text-[9px] font-medium bg-surface-2 text-zinc-500 rounded px-1.5 py-0.5 uppercase tracking-wide">
                  {videoFormat.replace('-', ' ')}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import StepCard from './components/StepCard'
import ImportStep from './components/ImportStep'
import TrimStep from './components/TrimStep'
import SubtitlesStep from './components/SubtitlesStep'
import VoiceoverStep from './components/VoiceoverStep'
import OverlayStep from './components/OverlayStep'
import type { VideoFormat } from './components/FormatStep'
import ExportStep from './components/ExportStep'
import PreviewPanel from './components/PreviewPanel'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import type { EditorStep } from './components/Sidebar'
import PlatformStep from './components/PlatformStep'
import { PLATFORM_PRESETS, DEFAULT_PRESET } from '../lib/platformPresets'
import type { PlatformPreset } from '../lib/platformPresets'
import { useJobProgress } from '../hooks/useJobProgress'
import { useMultiJobProgress } from '../hooks/useMultiJobProgress'
import { downloadVideo, trimVideo, transcribeVideo, exportVideo } from '../lib/api'
import type { ProgressEvent } from '../hooks/useJobProgress'

type Status = 'idle' | 'loading' | 'done' | 'error'
type SubtitlePosition = { x: number; y: number }

interface EmojiSticker {
  id: string
  emoji: string
  x: number
  y: number
  size: number
}

interface SubtitleLine {
  id: number
  start: number
  end: number
  text: string
}

export interface Clip {
  id: string
  clipSuffix: string        // id.replace(/-/g,'').slice(0,8)
  label: string
  startSecs: number
  endSecs: number
  // Spatial crop (percentages of source video frame, 0-100)
  cropX: number
  cropY: number
  cropW: number
  cropH: number
  // Fade effects
  fadeIn: boolean
  fadeOut: boolean
  // Zoom effect
  zoomEnabled: boolean
  zoomX: number   // 0-100 percent of frame width
  zoomY: number   // 0-100 percent of frame height
  trimJobId: string | null
  trimStatus: Status
  trimProgress: number
  trimError: string | null
  trimmedVideoUrl: string | null
  subtitlesEnabled: boolean
  subtitleJobId: string | null
  subtitleLines: SubtitleLine[]
  subtitleStatus: Status
  subtitleError: string | null
  customTextEnabled: boolean
  customTextLines: SubtitleLine[]
  custom2TextEnabled: boolean
  custom2TextLines: SubtitleLine[]
  emojiStickers: EmojiSticker[]
  exportJobId: string | null
  exportPresetId: string | null  // preset id used for this export (guard against stale results)
  exportStatus: Status
  exportProgress: number
  exportError: string | null
  exportUrl: string | null
}

interface AppState {
  // Import
  importJobId: string | null
  importProgress: number
  importStatus: Status
  importError: string | null
  sourceVideoUrl: string | null
  sourceVideoDuration: number | null

  // Clips
  clips: Clip[]
  activeClipId: string | null
  activeSubtitleLayer: 'auto' | 'custom' | 'custom2' | 'emoji'
  cropEditClipId: string | null
  cropEditOriginalCrop: { x: number; y: number; w: number; h: number } | null
  sourceVideoAR: number | null
  zoomSelectClipId: string | null

  // Audio
  muteOriginalAudio: boolean
  bgMusicEnabled: boolean
  bgMusicFile: File | null
  bgMusicVolume: number
  bgMusicFadeIn: boolean
  bgMusicFadeOut: boolean

  // Shared auto-subtitle style
  subtitlesEnabled: boolean      // default for new clips
  subtitleFontSize: number
  subtitleColor: string
  subtitlePosition: SubtitlePosition
  subtitleFontFamily: string
  subtitleBold: boolean
  subtitleOutlineWidth: number

  // Custom text layer style
  customTextFontSize: number
  customTextColor: string
  customTextPosition: SubtitlePosition
  customTextFontFamily: string
  customTextBold: boolean
  customTextOutlineWidth: number

  // Custom text 2 layer style
  custom2TextFontSize: number
  custom2TextColor: string
  custom2TextPosition: SubtitlePosition
  custom2TextFontFamily: string
  custom2TextBold: boolean
  custom2TextOutlineWidth: number

  // Voiceover
  voiceoverEnabled: boolean
  voiceoverFile: File | null
  originalVolume: number
  voiceoverVolume: number

  // Overlay
  overlayEnabled: boolean
  overlayFile: File | null
  overlayPreviewUrl: string | null
  overlayX: number
  overlayY: number
  overlayRotation: number
  overlayScale: number

  // Text alignment
  subtitleTextAlign: 'center' | 'left'
  customTextAlign: 'center' | 'left'
  custom2TextAlign: 'center' | 'left'

  // Platform / output preset
  activePlatformPreset: PlatformPreset
  activeStep: EditorStep
  customPresetWidth: number
  customPresetHeight: number

  // Format
  videoFormat: VideoFormat
  standardBgColor: string
  socialBgColor: string
  socialVideoScale: number
  videoOffsetX: number
  videoOffsetY: number
  cinematicBgColor: string
  videoBarHeight: number
}

function makeClip(startSecs: number, endSecs: number, index: number): Clip {
  const id = uuidv4()
  return {
    id,
    clipSuffix: id.replace(/-/g, '').slice(0, 8),
    label: `Clip ${index}`,
    startSecs,
    endSecs,
    cropX: 0,
    cropY: 0,
    cropW: 100,
    cropH: 100,
    fadeIn: false,
    fadeOut: false,
    zoomEnabled: false,
    zoomX: 50,
    zoomY: 50,
    trimJobId: null,
    trimStatus: 'idle',
    trimProgress: 0,
    trimError: null,
    trimmedVideoUrl: null,
    subtitlesEnabled: false,
    subtitleJobId: null,
    subtitleLines: [],
    subtitleStatus: 'idle',
    subtitleError: null,
    customTextEnabled: false,
    customTextLines: [],
    custom2TextEnabled: false,
    custom2TextLines: [],
    emojiStickers: [],
    exportJobId: null,
    exportPresetId: null,
    exportStatus: 'idle',
    exportProgress: 0,
    exportError: null,
    exportUrl: null,
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const initialState: AppState = {
  importJobId: null,
  importProgress: 0,
  importStatus: 'idle',
  importError: null,
  sourceVideoUrl: null,
  sourceVideoDuration: null,

  clips: [],
  activeClipId: null,
  activeSubtitleLayer: 'auto',
  cropEditClipId: null,
  cropEditOriginalCrop: null,
  sourceVideoAR: null,
  zoomSelectClipId: null,

  muteOriginalAudio: false,
  bgMusicEnabled: false,
  bgMusicFile: null,
  bgMusicVolume: 0.7,
  bgMusicFadeIn: false,
  bgMusicFadeOut: false,

  subtitlesEnabled: false,
  subtitleFontSize: 48,
  subtitleColor: 'FFFFFF',
  subtitlePosition: { x: 50, y: 85 },
  subtitleFontFamily: 'Arial',
  subtitleBold: true,
  subtitleOutlineWidth: 3,

  customTextFontSize: 48,
  customTextColor: 'FFFF00',
  customTextPosition: { x: 50, y: 50 },
  customTextFontFamily: 'Impact',
  customTextBold: true,
  customTextOutlineWidth: 3,

  custom2TextFontSize: 48,
  custom2TextColor: 'FF0000',
  custom2TextPosition: { x: 50, y: 50 },
  custom2TextFontFamily: 'Arial',
  custom2TextBold: true,
  custom2TextOutlineWidth: 3,

  voiceoverEnabled: false,
  voiceoverFile: null,
  originalVolume: 0.8,
  voiceoverVolume: 1.0,

  overlayEnabled: false,
  overlayFile: null,
  overlayPreviewUrl: null,
  overlayX: 50,
  overlayY: 50,
  overlayRotation: 0,
  overlayScale: 20,

  subtitleTextAlign: 'center',
  customTextAlign: 'center',
  custom2TextAlign: 'center',

  activePlatformPreset: DEFAULT_PRESET,
  activeStep: 'import' as EditorStep,
  customPresetWidth: 1080,
  customPresetHeight: 1920,

  videoFormat: 'standard',
  standardBgColor: '000000',
  socialBgColor: 'FFFFFF',
  socialVideoScale: 70,
  videoOffsetX: 0,
  videoOffsetY: 0,
  cinematicBgColor: '000000',
  videoBarHeight: 34,
}

export default function HomePage() {
  const [state, setState] = useState<AppState>(initialState)
  const overlayPreviewUrlRef = useRef<string | null>(null)

  const updateState = useCallback((patch: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...patch }))
  }, [])

  // --- Import job SSE ---
  const handleImportEvent = useCallback((event: ProgressEvent) => {
    if (event.type === 'progress') {
      updateState({ importProgress: event.percent ?? 0, importStatus: 'loading' })
    } else if (event.type === 'done') {
      updateState({ importStatus: 'done', importProgress: 100, sourceVideoUrl: event.url ?? null, sourceVideoDuration: event.duration ?? null })
    } else if (event.type === 'error') {
      updateState({ importStatus: 'error', importError: event.message ?? 'Download failed' })
    }
  }, [updateState])

  useJobProgress(state.importJobId, handleImportEvent)

  // --- Trim SSE for all clips ---
  const handleTrimEvent = useCallback((clipId: string, event: ProgressEvent) => {
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => {
        if (c.id !== clipId) return c
        if (event.type === 'progress') {
          return { ...c, trimProgress: event.percent ?? 0, trimStatus: 'loading' }
        } else if (event.type === 'done') {
          return { ...c, trimStatus: 'done', trimProgress: 100, trimmedVideoUrl: event.url ?? null }
        } else if (event.type === 'error') {
          return { ...c, trimStatus: 'error', trimError: event.message ?? 'Trim failed' }
        }
        return c
      }),
      // Auto-select first trimmed clip if none active yet
      activeClipId: event.type === 'done' && !prev.activeClipId ? clipId : prev.activeClipId,
    }))
  }, [])

  const trimJobMap = Object.fromEntries(state.clips.map(c => [c.id, c.trimJobId]))
  useMultiJobProgress(trimJobMap, handleTrimEvent)

  // --- Subtitle SSE for all clips ---
  const handleSubtitleEvent = useCallback((clipId: string, event: ProgressEvent) => {
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => {
        if (c.id !== clipId) return c
        if (event.type === 'progress') {
          return { ...c, subtitleStatus: 'loading' }
        } else if (event.type === 'done') {
          const lines = (event as ProgressEvent & { subtitles?: SubtitleLine[] }).subtitles ?? []
          return { ...c, subtitleStatus: 'done', subtitleLines: lines, subtitleError: null }
        } else if (event.type === 'error') {
          return { ...c, subtitleStatus: 'error', subtitleError: event.message ?? 'Transcription failed' }
        }
        return c
      }),
    }))
  }, [])

  const subtitleJobMap = Object.fromEntries(state.clips.map(c => [c.id, c.subtitleJobId]))
  useMultiJobProgress(subtitleJobMap, handleSubtitleEvent)

  // --- Export SSE for all clips ---
  const handleExportEvent = useCallback((clipId: string, event: ProgressEvent) => {
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => {
        if (c.id !== clipId) return c
        // Guard: if exportJobId was cleared (preset changed), ignore stale SSE events
        if (c.exportJobId === null) return c
        if (event.type === 'progress') {
          return { ...c, exportProgress: event.percent ?? 0, exportStatus: 'loading' }
        } else if (event.type === 'done') {
          return { ...c, exportStatus: 'done', exportProgress: 100, exportUrl: event.url ?? null }
        } else if (event.type === 'error') {
          return { ...c, exportStatus: 'error', exportError: event.message ?? 'Export failed' }
        }
        return c
      }),
    }))
  }, [])

  const exportJobMap = Object.fromEntries(state.clips.map(c => [c.id, c.exportJobId]))
  useMultiJobProgress(exportJobMap, handleExportEvent)

  // ── Undo history (must be declared before handlers that call pushHistory) ──
  const historyRef = useRef<AppState[]>([])
  const stateRef = useRef(state)
  useEffect(() => { stateRef.current = state }, [state])

  const pushHistory = useCallback(() => {
    historyRef.current = [...historyRef.current.slice(-9), stateRef.current]
  }, [])

  const handleUndo = useCallback(() => {
    const history = historyRef.current
    if (history.length === 0) return
    const prev = history[history.length - 1]
    historyRef.current = history.slice(0, -1)
    setState(prev)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleUndo])

  // --- Handlers ---
  const handleDownload = useCallback(async (url: string) => {
    updateState({
      importStatus: 'loading',
      importProgress: 0,
      importError: null,
      sourceVideoUrl: null,
      sourceVideoDuration: null,
      clips: [],
      activeClipId: null,
    })
    try {
      const { jobId } = await downloadVideo(url)
      updateState({ importJobId: jobId })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed'
      updateState({ importStatus: 'error', importError: message })
    }
  }, [updateState])

  const handleTrimClip = useCallback(async (clipId: string, clipOverride?: Clip) => {
    const importJobId = state.importJobId
    if (!importJobId) return
    const clip = clipOverride ?? state.clips.find(c => c.id === clipId)
    if (!clip) return

    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === clipId
        ? { ...c, trimStatus: 'loading', trimProgress: 0, trimError: null, trimmedVideoUrl: null }
        : c
      ),
    }))

    try {
      const { jobId: opJobId } = await trimVideo(
        importJobId,
        formatTime(clip.startSecs),
        formatTime(clip.endSecs),
        clip.clipSuffix,
        { x: clip.cropX, y: clip.cropY, w: clip.cropW, h: clip.cropH },
      )
      setState(prev => ({
        ...prev,
        clips: prev.clips.map(c => c.id === clipId ? { ...c, trimJobId: opJobId } : c),
      }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Trim failed'
      setState(prev => ({
        ...prev,
        clips: prev.clips.map(c => c.id === clipId
          ? { ...c, trimStatus: 'error', trimError: message }
          : c
        ),
      }))
    }
  }, [state.importJobId, state.clips])

  const handleTrimAll = useCallback(() => {
    for (const clip of state.clips) {
      if (clip.trimStatus === 'idle' || clip.trimStatus === 'error') {
        handleTrimClip(clip.id)
      }
    }
  }, [state.clips, handleTrimClip])

  const handleAddClip = useCallback((startSecs: number, endSecs: number) => {
    pushHistory()
    const clip = makeClip(startSecs, endSecs, state.clips.length + 1)
    setState(prev => ({ ...prev, clips: [...prev.clips, clip] }))
    handleTrimClip(clip.id, clip)
  }, [pushHistory, state.clips.length, handleTrimClip])

  const handleRemoveClip = useCallback((clipId: string) => {
    pushHistory()
    setState(prev => {
      const remaining = prev.clips.filter(c => c.id !== clipId)
      const activeClipId = prev.activeClipId === clipId
        ? (remaining.find(c => c.trimStatus === 'done')?.id ?? remaining[0]?.id ?? null)
        : prev.activeClipId
      return { ...prev, clips: remaining, activeClipId }
    })
  }, [pushHistory])

  const handleUpdateClipLabel = useCallback((clipId: string, label: string) => {
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === clipId ? { ...c, label } : c),
    }))
  }, [])

  const handleSetSourceVideoAR = useCallback((ar: number) => {
    updateState({ sourceVideoAR: ar })
  }, [updateState])

  const handleUpdateClipCrop = useCallback((clipId: string, crop: { x: number; y: number; w: number; h: number }) => {
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === clipId
        ? { ...c, cropX: crop.x, cropY: crop.y, cropW: crop.w, cropH: crop.h }
        : c
      ),
    }))
  }, [])

  const handleCropCancel = useCallback(() => {
    setState(prev => {
      const original = prev.cropEditOriginalCrop
      const clipId = prev.cropEditClipId
      return {
        ...prev,
        clips: clipId && original
          ? prev.clips.map(c => c.id === clipId
              ? { ...c, cropX: original.x, cropY: original.y, cropW: original.w, cropH: original.h }
              : c
            )
          : prev.clips,
        cropEditClipId: null,
        cropEditOriginalCrop: null,
      }
    })
  }, [])

  const handleToggleClipFade = useCallback((clipId: string, field: 'fadeIn' | 'fadeOut', value: boolean) => {
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === clipId ? { ...c, [field]: value } : c),
    }))
  }, [])

  const handleToggleClipZoom = useCallback((clipId: string, value: boolean) => {
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === clipId ? { ...c, zoomEnabled: value } : c),
    }))
  }, [])

  const handleSetZoomPoint = useCallback((x: number, y: number) => {
    setState(prev => {
      const clipId = prev.zoomSelectClipId
      if (!clipId) return prev
      return {
        ...prev,
        clips: prev.clips.map(c => c.id === clipId ? { ...c, zoomX: x, zoomY: y } : c),
        zoomSelectClipId: null,
      }
    })
  }, [])

  const handlePresetChange = useCallback((preset: PlatformPreset) => {
    setState(prev => ({
      ...prev,
      activePlatformPreset: preset,
      // Clear all export results — they were encoded for the previous preset dimensions
      clips: prev.clips.map(c => ({
        ...c,
        exportJobId: null,
        exportPresetId: null,
        exportStatus: 'idle' as Status,
        exportProgress: 0,
        exportError: null,
        exportUrl: null,
      })),
    }))
  }, [])

  const bgMusicFileRef = useRef<string | null>(null)
  const handleBgMusicFile = useCallback((f: File | null) => {
    if (bgMusicFileRef.current) { URL.revokeObjectURL(bgMusicFileRef.current); bgMusicFileRef.current = null }
    updateState({ bgMusicFile: f })
  }, [updateState])


  const handleGenerateSubtitles = useCallback(async () => {
    const importJobId = state.importJobId
    const activeClipId = state.activeClipId
    if (!importJobId || !activeClipId) return
    const clip = state.clips.find(c => c.id === activeClipId)
    if (!clip) return

    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === activeClipId
        ? { ...c, subtitleStatus: 'loading', subtitleError: null, subtitlesEnabled: true }
        : c
      ),
    }))

    try {
      const { jobId: opJobId } = await transcribeVideo(importJobId, clip.clipSuffix)
      setState(prev => ({
        ...prev,
        clips: prev.clips.map(c => c.id === activeClipId ? { ...c, subtitleJobId: opJobId } : c),
      }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transcription failed'
      setState(prev => ({
        ...prev,
        clips: prev.clips.map(c => c.id === activeClipId
          ? { ...c, subtitleStatus: 'error', subtitleError: message }
          : c
        ),
      }))
    }
  }, [state.importJobId, state.activeClipId, state.clips])

  const handleOverlayFile = useCallback((f: File | null) => {
    if (overlayPreviewUrlRef.current) {
      URL.revokeObjectURL(overlayPreviewUrlRef.current)
      overlayPreviewUrlRef.current = null
    }
    if (f) {
      const url = URL.createObjectURL(f)
      overlayPreviewUrlRef.current = url
      updateState({ overlayFile: f, overlayPreviewUrl: url })
    } else {
      updateState({ overlayFile: null, overlayPreviewUrl: null })
    }
  }, [updateState])

  useEffect(() => {
    return () => {
      if (overlayPreviewUrlRef.current) {
        URL.revokeObjectURL(overlayPreviewUrlRef.current)
      }
    }
  }, [])

  const handleAddEmoji = useCallback((emoji: string) => {
    const id = state.activeClipId
    if (!id) return
    const stickerId = Math.random().toString(36).slice(2, 10)
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === id
        ? { ...c, emojiStickers: [...c.emojiStickers, { id: stickerId, emoji, x: 50, y: 50, size: 8 }] }
        : c
      ),
    }))
  }, [state.activeClipId])

  const handleRemoveEmoji = useCallback((stickerId: string) => {
    const id = state.activeClipId
    if (!id) return
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === id
        ? { ...c, emojiStickers: c.emojiStickers.filter(s => s.id !== stickerId) }
        : c
      ),
    }))
  }, [state.activeClipId])

  const handleEmojiSizeChange = useCallback((stickerId: string, size: number) => {
    const id = state.activeClipId
    if (!id) return
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === id
        ? { ...c, emojiStickers: c.emojiStickers.map(s => s.id === stickerId ? { ...s, size } : s) }
        : c
      ),
    }))
  }, [state.activeClipId])

  const handleEmojiMove = useCallback((stickerId: string, x: number, y: number) => {
    setState(prev => {
      const id = prev.activeClipId
      if (!id) return prev
      return {
        ...prev,
        clips: prev.clips.map(c => c.id === id
          ? { ...c, emojiStickers: c.emojiStickers.map(s => s.id === stickerId ? { ...s, x, y } : s) }
          : c
        ),
      }
    })
  }, [])

  const handleExportClip = useCallback(async (clipId: string) => {
    const importJobId = state.importJobId
    if (!importJobId) return
    const clip = state.clips.find(c => c.id === clipId)
    if (!clip) return

    const presetId = state.activePlatformPreset.id
    const presetWidth = presetId === 'custom' ? state.customPresetWidth : state.activePlatformPreset.width
    const presetHeight = presetId === 'custom' ? state.customPresetHeight : state.activePlatformPreset.height

    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === clipId
        ? { ...c, exportStatus: 'loading', exportProgress: 0, exportError: null, exportUrl: null, exportPresetId: presetId }
        : c
      ),
    }))

    try {
      const { jobId: opJobId } = await exportVideo({
        jobId: importJobId,
        clipSuffix: clip.clipSuffix,
        subtitles: clip.subtitlesEnabled && clip.subtitleLines.length > 0 ? clip.subtitleLines : undefined,
        subtitleStyle: clip.subtitlesEnabled && clip.subtitleLines.length > 0 ? {
          fontSize: state.subtitleFontSize,
          color: state.subtitleColor,
          position: state.subtitlePosition,
          fontFamily: state.subtitleFontFamily,
          bold: state.subtitleBold,
          outlineWidth: state.subtitleOutlineWidth,
          textAlign: state.subtitleTextAlign,
        } : undefined,
        customTextSubtitles: clip.customTextEnabled && clip.customTextLines.length > 0 ? clip.customTextLines : undefined,
        customTextSubtitleStyle: clip.customTextEnabled && clip.customTextLines.length > 0 ? {
          fontSize: state.customTextFontSize,
          color: state.customTextColor,
          position: state.customTextPosition,
          fontFamily: state.customTextFontFamily,
          bold: state.customTextBold,
          outlineWidth: state.customTextOutlineWidth,
          textAlign: state.customTextAlign,
        } : undefined,
        custom2TextSubtitles: clip.custom2TextEnabled && clip.custom2TextLines.length > 0 ? clip.custom2TextLines : undefined,
        custom2TextSubtitleStyle: clip.custom2TextEnabled && clip.custom2TextLines.length > 0 ? {
          fontSize: state.custom2TextFontSize,
          color: state.custom2TextColor,
          position: state.custom2TextPosition,
          fontFamily: state.custom2TextFontFamily,
          bold: state.custom2TextBold,
          outlineWidth: state.custom2TextOutlineWidth,
          textAlign: state.custom2TextAlign,
        } : undefined,
        emojiStickers: clip.emojiStickers.length > 0 ? clip.emojiStickers : undefined,
        voiceoverEnabled: state.voiceoverEnabled,
        voiceoverFile: state.voiceoverEnabled ? (state.voiceoverFile ?? undefined) : undefined,
        originalVolume: state.muteOriginalAudio ? 0 : state.originalVolume,
        voiceoverVolume: state.voiceoverVolume,
        bgMusicEnabled: state.bgMusicEnabled,
        bgMusicFile: state.bgMusicEnabled ? (state.bgMusicFile ?? undefined) : undefined,
        bgMusicVolume: state.bgMusicVolume,
        bgMusicFadeIn: state.bgMusicFadeIn,
        bgMusicFadeOut: state.bgMusicFadeOut,
        overlayEnabled: state.overlayEnabled,
        overlayFile: state.overlayEnabled ? (state.overlayFile ?? undefined) : undefined,
        overlayX: state.overlayX,
        overlayY: state.overlayY,
        overlayRotation: state.overlayRotation,
        overlayScale: state.overlayScale,
        videoFormat: state.videoFormat,
        standardBgColor: state.standardBgColor,
        socialBgColor: state.socialBgColor,
        socialVideoScale: state.socialVideoScale,
        videoOffsetX: state.videoOffsetX,
        videoOffsetY: state.videoOffsetY,
        cinematicBgColor: state.cinematicBgColor,
        videoBarHeight: state.videoBarHeight,
        fadeIn: clip.fadeIn,
        fadeOut: clip.fadeOut,
        clipDuration: clip.endSecs - clip.startSecs,
        zoomEnabled: clip.zoomEnabled,
        zoomX: clip.zoomX,
        zoomY: clip.zoomY,
        presetWidth,
        presetHeight,
      })
      setState(prev => ({
        ...prev,
        clips: prev.clips.map(c => c.id === clipId ? { ...c, exportJobId: opJobId } : c),
      }))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed'
      setState(prev => ({
        ...prev,
        clips: prev.clips.map(c => c.id === clipId
          ? { ...c, exportStatus: 'error', exportError: message }
          : c
        ),
      }))
    }
  }, [state])

  const handleExportAll = useCallback(() => {
    for (const clip of state.clips) {
      if (clip.trimStatus === 'done' && clip.exportStatus !== 'done' && clip.exportStatus !== 'loading') {
        handleExportClip(clip.id)
      }
    }
  }, [state.clips, handleExportClip])

  const anyTrimDone = state.clips.some(c => c.trimStatus === 'done')

  const activeClip = state.clips.find(c => c.id === state.activeClipId) ?? state.clips.find(c => c.trimStatus === 'done') ?? null
  const previewVideoUrl = activeClip?.trimmedVideoUrl ?? state.sourceVideoUrl ?? null

  const cropEditClip = state.cropEditClipId ? state.clips.find(c => c.id === state.cropEditClipId) : null
  const activeCropRect = cropEditClip
    ? { x: cropEditClip.cropX, y: cropEditClip.cropY, w: cropEditClip.cropW, h: cropEditClip.cropH }
    : null

  // Output dimensions from active preset
  const outputWidth = state.activePlatformPreset.id === 'custom' ? state.customPresetWidth : state.activePlatformPreset.width
  const outputHeight = state.activePlatformPreset.id === 'custom' ? state.customPresetHeight : state.activePlatformPreset.height

  // Sidebar state
  const completedSteps = new Set<EditorStep>([
    ...(state.importStatus === 'done' ? ['import'] as EditorStep[] : []),
    ...(anyTrimDone ? ['trim'] as EditorStep[] : []),
  ])
  const lockedSteps = new Set<EditorStep>([
    // Platform is always accessible — configure output format before importing
    ...(state.importStatus !== 'done'
      ? ['trim', 'subtitles', 'voiceover', 'overlay', 'export'] as EditorStep[]
      : []),
    ...((!anyTrimDone && state.importStatus === 'done')
      ? ['subtitles', 'voiceover', 'overlay', 'export'] as EditorStep[]
      : []),
  ])
  const errorSteps = new Set<EditorStep>([
    ...(state.importStatus === 'error' ? ['import'] as EditorStep[] : []),
    ...(state.clips.some(c => c.trimStatus === 'error') ? ['trim'] as EditorStep[] : []),
    ...(state.clips.some(c => c.exportStatus === 'error') ? ['export'] as EditorStep[] : []),
  ])

  const canExport = anyTrimDone

  // Shared TrimStep crop edit callbacks (used in both old TrimStep and the new crop UI)
  const handleStartCropEdit = useCallback((clipId: string) => {
    pushHistory()
    setState(prev => {
      const clip = prev.clips.find(c => c.id === clipId)
      if (!clip) return { ...prev, cropEditClipId: clipId, cropEditOriginalCrop: null }
      const originalCrop = { x: clip.cropX, y: clip.cropY, w: clip.cropW, h: clip.cropH }
      const isFullFrame = clip.cropX < 0.5 && clip.cropY < 0.5 && clip.cropW > 99.5 && clip.cropH > 99.5
      let initCrop = originalCrop
      if (isFullFrame && prev.sourceVideoAR) {
        const ar = prev.sourceVideoAR
        if (ar > 9 / 16) {
          const w = (9 / 16 / ar) * 100
          initCrop = { x: (100 - w) / 2, y: 0, w, h: 100 }
        }
      }
      return {
        ...prev,
        cropEditClipId: clipId,
        cropEditOriginalCrop: originalCrop,
        clips: prev.clips.map(c => c.id === clipId
          ? { ...c, cropX: initCrop.x, cropY: initCrop.y, cropW: initCrop.w, cropH: initCrop.h }
          : c
        ),
      }
    })
  }, [pushHistory])

  const handleEndCropEdit = useCallback(() => {
    const clipId = state.cropEditClipId
    const clip = state.clips.find(c => c.id === clipId)
    const original = state.cropEditOriginalCrop
    updateState({ cropEditClipId: null, cropEditOriginalCrop: null })
    if (clipId && clip) {
      const cropChanged = !original || clip.cropX !== original.x || clip.cropY !== original.y || clip.cropW !== original.w || clip.cropH !== original.h
      if (cropChanged || clip.trimStatus !== 'done') handleTrimClip(clipId)
    }
  }, [state.cropEditClipId, state.clips, state.cropEditOriginalCrop, updateState, handleTrimClip])

  // Render the active step's properties panel content
  const renderStepContent = () => {
    switch (state.activeStep) {
      case 'import':
        return (
          <ImportStep
            status={state.importStatus}
            progress={state.importProgress}
            error={state.importError}
            videoUrl={state.sourceVideoUrl}
            importJobId={state.importJobId}
            videoDuration={state.sourceVideoDuration}
            onDownload={handleDownload}
            onUseAnalysisText={(text) => {
              setState(prev => {
                if (prev.clips.length === 0) return prev
                return {
                  ...prev,
                  clips: prev.clips.map(clip => ({
                    ...clip,
                    customTextEnabled: true,
                    customTextLines: [{ id: 1, start: 0, end: Math.max(1, clip.endSecs - clip.startSecs), text }],
                  })),
                }
              })
            }}
          />
        )
      case 'trim':
        return (
          <TrimStep
            clips={state.clips}
            onAddClip={handleAddClip}
            onRemoveClip={handleRemoveClip}
            onTrimClip={handleTrimClip}
            onUpdateClipLabel={handleUpdateClipLabel}
            onUpdateClipCrop={handleUpdateClipCrop}
            onToggleClipFade={handleToggleClipFade}
            onToggleClipZoom={handleToggleClipZoom}
            onStartZoomSelect={clipId => updateState({ zoomSelectClipId: clipId })}
            zoomSelectClipId={state.zoomSelectClipId}
            cropEditClipId={state.cropEditClipId}
            onStartCropEdit={handleStartCropEdit}
            onEndCropEdit={handleEndCropEdit}
            onSourceVideoAR={handleSetSourceVideoAR}
            sourceVideoUrl={state.sourceVideoUrl}
            disabled={state.importStatus !== 'done'}
          />
        )
      case 'platform':
        return (
          <PlatformStep
            activePreset={state.activePlatformPreset}
            onPresetChange={handlePresetChange}
            customWidth={state.customPresetWidth}
            customHeight={state.customPresetHeight}
            onCustomWidthChange={v => {
              setState(prev => ({
                ...prev,
                customPresetWidth: v,
                // Clear exports — they were encoded at the old custom dimensions
                clips: prev.activePlatformPreset.id === 'custom'
                  ? prev.clips.map(c => ({
                      ...c, exportJobId: null, exportPresetId: null,
                      exportStatus: 'idle' as Status, exportProgress: 0,
                      exportError: null, exportUrl: null,
                    }))
                  : prev.clips,
              }))
            }}
            onCustomHeightChange={v => {
              setState(prev => ({
                ...prev,
                customPresetHeight: v,
                clips: prev.activePlatformPreset.id === 'custom'
                  ? prev.clips.map(c => ({
                      ...c, exportJobId: null, exportPresetId: null,
                      exportStatus: 'idle' as Status, exportProgress: 0,
                      exportError: null, exportUrl: null,
                    }))
                  : prev.clips,
              }))
            }}
            videoFormat={state.videoFormat}
            onFormatChange={v => updateState({ videoFormat: v })}
            standardBgColor={state.standardBgColor}
            onStandardBgColorChange={v => updateState({ standardBgColor: v })}
            socialBgColor={state.socialBgColor}
            onSocialBgColorChange={v => updateState({ socialBgColor: v })}
            cinematicBgColor={state.cinematicBgColor}
            onCinematicBgColorChange={v => updateState({ cinematicBgColor: v })}
            videoBarHeight={state.videoBarHeight}
            onVideoBarHeightChange={v => updateState({ videoBarHeight: v })}
            disabled={false}
          />
        )
      case 'subtitles':
        return (
          <SubtitlesStep
            clips={state.clips.filter(c => c.trimStatus === 'done')}
            activeClipId={state.activeClipId}
            onActiveClipChange={id => updateState({ activeClipId: id })}
            activeTab={state.activeSubtitleLayer}
            onTabChange={v => updateState({ activeSubtitleLayer: v })}
            onToggleAuto={v => {
              const id = state.activeClipId
              if (!id) return
              setState(prev => ({ ...prev, clips: prev.clips.map(c => c.id === id ? { ...c, subtitlesEnabled: v } : c) }))
            }}
            onGenerate={handleGenerateSubtitles}
            onAutoLinesChange={lines => {
              const id = state.activeClipId
              if (!id) return
              setState(prev => ({ ...prev, clips: prev.clips.map(c => c.id === id ? { ...c, subtitleLines: lines } : c) }))
            }}
            onToggleCustom={v => {
              const id = state.activeClipId
              if (!id) return
              setState(prev => ({ ...prev, clips: prev.clips.map(c => c.id === id ? { ...c, customTextEnabled: v } : c) }))
            }}
            onCustomLinesChange={lines => {
              const id = state.activeClipId
              if (!id) return
              setState(prev => ({ ...prev, clips: prev.clips.map(c => c.id === id ? { ...c, customTextLines: lines } : c) }))
            }}
            autoFontSize={state.subtitleFontSize}
            onAutoFontSizeChange={v => updateState({ subtitleFontSize: v })}
            autoColor={state.subtitleColor}
            onAutoColorChange={v => updateState({ subtitleColor: v })}
            autoPosition={state.subtitlePosition}
            autoFontFamily={state.subtitleFontFamily}
            onAutoFontFamilyChange={v => updateState({ subtitleFontFamily: v })}
            autoBold={state.subtitleBold}
            onAutoBoldChange={v => updateState({ subtitleBold: v })}
            autoOutlineWidth={state.subtitleOutlineWidth}
            onAutoOutlineWidthChange={v => updateState({ subtitleOutlineWidth: v })}
            autoTextAlign={state.subtitleTextAlign}
            onAutoTextAlignChange={v => updateState({ subtitleTextAlign: v })}
            customFontSize={state.customTextFontSize}
            onCustomFontSizeChange={v => updateState({ customTextFontSize: v })}
            customColor={state.customTextColor}
            onCustomColorChange={v => updateState({ customTextColor: v })}
            customPosition={state.customTextPosition}
            customFontFamily={state.customTextFontFamily}
            onCustomFontFamilyChange={v => updateState({ customTextFontFamily: v })}
            customBold={state.customTextBold}
            onCustomBoldChange={v => updateState({ customTextBold: v })}
            customOutlineWidth={state.customTextOutlineWidth}
            onCustomOutlineWidthChange={v => updateState({ customTextOutlineWidth: v })}
            customTextAlign={state.customTextAlign}
            onCustomTextAlignChange={v => updateState({ customTextAlign: v })}
            onToggleCustom2={v => {
              const id = state.activeClipId
              if (!id) return
              setState(prev => ({ ...prev, clips: prev.clips.map(c => c.id === id ? { ...c, custom2TextEnabled: v } : c) }))
            }}
            onCustom2LinesChange={lines => {
              const id = state.activeClipId
              if (!id) return
              setState(prev => ({ ...prev, clips: prev.clips.map(c => c.id === id ? { ...c, custom2TextLines: lines } : c) }))
            }}
            custom2FontSize={state.custom2TextFontSize}
            onCustom2FontSizeChange={v => updateState({ custom2TextFontSize: v })}
            custom2Color={state.custom2TextColor}
            onCustom2ColorChange={v => updateState({ custom2TextColor: v })}
            custom2Position={state.custom2TextPosition}
            custom2FontFamily={state.custom2TextFontFamily}
            onCustom2FontFamilyChange={v => updateState({ custom2TextFontFamily: v })}
            custom2Bold={state.custom2TextBold}
            onCustom2BoldChange={v => updateState({ custom2TextBold: v })}
            custom2OutlineWidth={state.custom2TextOutlineWidth}
            onCustom2OutlineWidthChange={v => updateState({ custom2TextOutlineWidth: v })}
            custom2TextAlign={state.custom2TextAlign}
            onCustom2TextAlignChange={v => updateState({ custom2TextAlign: v })}
            onAddEmoji={handleAddEmoji}
            onRemoveEmoji={handleRemoveEmoji}
            onEmojiSizeChange={handleEmojiSizeChange}
            emojiStickers={activeClip?.emojiStickers ?? []}
            disabled={!anyTrimDone}
          />
        )
      case 'voiceover':
        return (
          <VoiceoverStep
            enabled={state.voiceoverEnabled}
            onToggle={v => updateState({ voiceoverEnabled: v })}
            voiceoverFile={state.voiceoverFile}
            onVoiceoverFile={f => updateState({ voiceoverFile: f })}
            originalVolume={state.originalVolume}
            onOriginalVolume={v => updateState({ originalVolume: v })}
            voiceoverVolume={state.voiceoverVolume}
            onVoiceoverVolume={v => updateState({ voiceoverVolume: v })}
            muteOriginalAudio={state.muteOriginalAudio}
            onMuteOriginalAudio={v => updateState({ muteOriginalAudio: v })}
            bgMusicEnabled={state.bgMusicEnabled}
            onBgMusicToggle={v => updateState({ bgMusicEnabled: v })}
            bgMusicFile={state.bgMusicFile}
            onBgMusicFile={handleBgMusicFile}
            bgMusicVolume={state.bgMusicVolume}
            onBgMusicVolume={v => updateState({ bgMusicVolume: v })}
            bgMusicFadeIn={state.bgMusicFadeIn}
            onBgMusicFadeIn={v => updateState({ bgMusicFadeIn: v })}
            bgMusicFadeOut={state.bgMusicFadeOut}
            onBgMusicFadeOut={v => updateState({ bgMusicFadeOut: v })}
            disabled={!anyTrimDone}
          />
        )
      case 'overlay':
        return (
          <OverlayStep
            enabled={state.overlayEnabled}
            onToggle={v => updateState({ overlayEnabled: v })}
            overlayFile={state.overlayFile}
            onOverlayFile={handleOverlayFile}
            previewUrl={state.overlayPreviewUrl}
            overlayX={state.overlayX}
            overlayY={state.overlayY}
            onPositionChange={(x, y) => updateState({ overlayX: x, overlayY: y })}
            overlayScale={state.overlayScale}
            onScaleChange={v => updateState({ overlayScale: v })}
            overlayRotation={state.overlayRotation}
            onRotationChange={v => updateState({ overlayRotation: v })}
            disabled={!anyTrimDone}
          />
        )
      case 'export':
        return (
          <ExportStep
            clips={state.clips}
            onExportClip={handleExportClip}
            onExportAll={handleExportAll}
            disabled={!anyTrimDone}
          />
        )
    }
  }

  return (
    <main className="flex flex-col h-screen overflow-hidden bg-zinc-950">
      {/* ── Top bar (hidden in crop edit mode) ── */}
      {!state.cropEditClipId && (
        <TopBar
          activePreset={state.activePlatformPreset}
          onPresetChange={handlePresetChange}
          onExport={handleExportAll}
          canExport={canExport}
          displayWidth={outputWidth}
          displayHeight={outputHeight}
        />
      )}

      {/* ── 3-column body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Sidebar (hidden in crop edit mode) ── */}
        {!state.cropEditClipId && (
          <Sidebar
            activeStep={state.activeStep}
            onStepChange={step => updateState({ activeStep: step })}
            completedSteps={completedSteps}
            lockedSteps={lockedSteps}
            errorSteps={errorSteps}
          />
        )}

        {/* ── Center: Preview ── */}
        <div className="flex-1 bg-black overflow-hidden min-w-0">
          <PreviewPanel
            videoUrl={previewVideoUrl}
            sourceVideoUrl={state.sourceVideoUrl}
            sourceVideoAR={state.sourceVideoAR}
            cropEditClipId={state.cropEditClipId}
            activeCropRect={activeCropRect}
            onCropChange={crop => state.cropEditClipId && handleUpdateClipCrop(state.cropEditClipId, crop)}
            onCropDone={() => {
              const clipId = state.cropEditClipId
              const clip = state.clips.find(c => c.id === clipId)
              const original = state.cropEditOriginalCrop
              updateState({ cropEditClipId: null, cropEditOriginalCrop: null })
              if (clipId && clip) {
                const cropChanged = !original || clip.cropX !== original.x || clip.cropY !== original.y || clip.cropW !== original.w || clip.cropH !== original.h
                if (cropChanged || clip.trimStatus !== 'done') handleTrimClip(clipId)
              }
            }}
            onCropCancel={handleCropCancel}
            zoomSelectClipId={state.zoomSelectClipId}
            onZoomPointSet={handleSetZoomPoint}
            autoEnabled={activeClip?.subtitlesEnabled ?? false}
            autoLines={activeClip?.subtitleLines ?? []}
            autoStyle={{
              fontSize: state.subtitleFontSize,
              color: state.subtitleColor,
              position: state.subtitlePosition,
              fontFamily: state.subtitleFontFamily,
              bold: state.subtitleBold,
              outlineWidth: state.subtitleOutlineWidth,
              textAlign: state.subtitleTextAlign,
            }}
            onAutoPositionChange={v => updateState({ subtitlePosition: v })}
            customEnabled={activeClip?.customTextEnabled ?? false}
            customLines={activeClip?.customTextLines ?? []}
            customStyle={{
              fontSize: state.customTextFontSize,
              color: state.customTextColor,
              position: state.customTextPosition,
              fontFamily: state.customTextFontFamily,
              bold: state.customTextBold,
              outlineWidth: state.customTextOutlineWidth,
              textAlign: state.customTextAlign,
            }}
            onCustomPositionChange={v => updateState({ customTextPosition: v })}
            custom2Enabled={activeClip?.custom2TextEnabled ?? false}
            custom2Lines={activeClip?.custom2TextLines ?? []}
            custom2Style={{
              fontSize: state.custom2TextFontSize,
              color: state.custom2TextColor,
              position: state.custom2TextPosition,
              fontFamily: state.custom2TextFontFamily,
              bold: state.custom2TextBold,
              outlineWidth: state.custom2TextOutlineWidth,
              textAlign: state.custom2TextAlign,
            }}
            onCustom2PositionChange={v => updateState({ custom2TextPosition: v })}
            emojiStickers={activeClip?.emojiStickers ?? []}
            onEmojiMove={handleEmojiMove}
            activeLayer={state.activeSubtitleLayer}
            overlayEnabled={state.overlayEnabled}
            overlayPreviewUrl={state.overlayPreviewUrl}
            overlayX={state.overlayX}
            overlayY={state.overlayY}
            overlayRotation={state.overlayRotation}
            overlayScale={state.overlayScale}
            onOverlayMove={(x, y) => updateState({ overlayX: x, overlayY: y })}
            videoFormat={state.videoFormat}
            standardBgColor={state.standardBgColor}
            socialBgColor={state.socialBgColor}
            socialVideoScale={state.socialVideoScale}
            onSocialVideoScaleChange={v => updateState({ socialVideoScale: v })}
            cinematicBgColor={state.cinematicBgColor}
            videoBarHeight={state.videoBarHeight}
            videoOffsetX={state.videoOffsetX}
            videoOffsetY={state.videoOffsetY}
            onVideoOffsetChange={(x, y) => updateState({ videoOffsetX: x, videoOffsetY: y })}
            presetWidth={outputWidth}
            presetHeight={outputHeight}
          />
        </div>

        {/* ── Right: Properties panel (hidden in crop edit mode) ── */}
        {!state.cropEditClipId && (
          <div className="w-80 flex-shrink-0 bg-zinc-950 border-l border-zinc-800 flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {renderStepContent()}
            </div>
            <p className="text-center text-xs text-zinc-700 pb-2 flex-shrink-0">
              Local tool — API binds to 127.0.0.1 only
            </p>
          </div>
        )}
      </div>
    </main>
  )
}

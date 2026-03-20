'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import StepCard from './components/StepCard'
import ImportStep from './components/ImportStep'
import TrimStep from './components/TrimStep'
import SubtitlesStep from './components/SubtitlesStep'
import VoiceoverStep from './components/VoiceoverStep'
import OverlayStep from './components/OverlayStep'
import FormatStep from './components/FormatStep'
import type { VideoFormat } from './components/FormatStep'
import ExportStep from './components/ExportStep'
import PreviewPanel from './components/PreviewPanel'
import { useJobProgress } from '../hooks/useJobProgress'
import { useMultiJobProgress } from '../hooks/useMultiJobProgress'
import { downloadVideo, trimVideo, transcribeVideo, exportVideo } from '../lib/api'
import type { ProgressEvent } from '../hooks/useJobProgress'

type Status = 'idle' | 'loading' | 'done' | 'error'
type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
type SubtitlePosition = { x: number; y: number }

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
  exportJobId: string | null
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

  // Clips
  clips: Clip[]
  activeClipId: string | null
  activeSubtitleLayer: 'auto' | 'custom'
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

  // Voiceover
  voiceoverEnabled: boolean
  voiceoverFile: File | null
  originalVolume: number
  voiceoverVolume: number

  // Overlay
  overlayEnabled: boolean
  overlayFile: File | null
  overlayPreviewUrl: string | null
  overlayPosition: OverlayPosition
  overlayScale: number

  // Format
  videoFormat: VideoFormat
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
    exportJobId: null,
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
  customTextPosition: { x: 50, y: 15 },
  customTextFontFamily: 'Impact',
  customTextBold: true,
  customTextOutlineWidth: 3,

  voiceoverEnabled: false,
  voiceoverFile: null,
  originalVolume: 0.8,
  voiceoverVolume: 1.0,

  overlayEnabled: false,
  overlayFile: null,
  overlayPreviewUrl: null,
  overlayPosition: 'bottom-right',
  overlayScale: 20,

  videoFormat: 'standard',
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

  // Resizable panel
  const [leftWidth, setLeftWidth] = useState(400)
  const isPanelDragging = useRef(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isPanelDragging.current) return
      setLeftWidth(Math.max(280, Math.min(700, e.clientX)))
    }
    const onUp = () => { isPanelDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const updateState = useCallback((patch: Partial<AppState>) => {
    setState(prev => ({ ...prev, ...patch }))
  }, [])

  // --- Import job SSE ---
  const handleImportEvent = useCallback((event: ProgressEvent) => {
    if (event.type === 'progress') {
      updateState({ importProgress: event.percent ?? 0, importStatus: 'loading' })
    } else if (event.type === 'done') {
      updateState({ importStatus: 'done', importProgress: 100, sourceVideoUrl: event.url ?? null })
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

  const handleAddClip = useCallback((startSecs: number, endSecs: number) => {
    pushHistory()
    setState(prev => {
      const clip = makeClip(startSecs, endSecs, prev.clips.length + 1)
      return { ...prev, clips: [...prev.clips, clip] }
    })
  }, [pushHistory])

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

  const bgMusicFileRef = useRef<string | null>(null)
  const handleBgMusicFile = useCallback((f: File | null) => {
    if (bgMusicFileRef.current) { URL.revokeObjectURL(bgMusicFileRef.current); bgMusicFileRef.current = null }
    updateState({ bgMusicFile: f })
  }, [updateState])

  const handleTrimClip = useCallback(async (clipId: string) => {
    const importJobId = state.importJobId
    if (!importJobId) return
    const clip = state.clips.find(c => c.id === clipId)
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

  const handleExportClip = useCallback(async (clipId: string) => {
    const importJobId = state.importJobId
    if (!importJobId) return
    const clip = state.clips.find(c => c.id === clipId)
    if (!clip) return

    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === clipId
        ? { ...c, exportStatus: 'loading', exportProgress: 0, exportError: null, exportUrl: null }
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
        } : undefined,
        customTextSubtitles: clip.customTextEnabled && clip.customTextLines.length > 0 ? clip.customTextLines : undefined,
        customTextSubtitleStyle: clip.customTextEnabled && clip.customTextLines.length > 0 ? {
          fontSize: state.customTextFontSize,
          color: state.customTextColor,
          position: state.customTextPosition,
          fontFamily: state.customTextFontFamily,
          bold: state.customTextBold,
          outlineWidth: state.customTextOutlineWidth,
        } : undefined,
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
        overlayPosition: state.overlayPosition,
        overlayScale: state.overlayScale,
        videoFormat: state.videoFormat,
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

  return (
    <main className="flex h-screen overflow-hidden bg-zinc-950">
      {/* ── Left: resizable scrollable editing panel (hidden in crop mode) ── */}
      <div
        className="flex-shrink-0 flex flex-col h-full border-r border-zinc-800 transition-none"
        style={{ width: state.cropEditClipId ? 0 : leftWidth, overflow: 'hidden' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <div className="bg-violet-600 rounded-lg p-1.5">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100 leading-none">ClipForge</h1>
            <p className="text-xs text-zinc-500">YouTube Shorts creator</p>
          </div>
        </div>

        {/* Scrollable steps */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <StepCard number={1} title="Import Video">
          <ImportStep
            status={state.importStatus}
            progress={state.importProgress}
            error={state.importError}
            videoUrl={state.sourceVideoUrl}
            onDownload={handleDownload}
          />
        </StepCard>

        <StepCard number={2} title="Clips" disabled={state.importStatus !== 'done'}>
          <TrimStep
            clips={state.clips}
            onAddClip={handleAddClip}
            onRemoveClip={handleRemoveClip}
            onTrimClip={handleTrimClip}
            onTrimAll={handleTrimAll}
            onUpdateClipLabel={handleUpdateClipLabel}
            onUpdateClipCrop={handleUpdateClipCrop}
            onToggleClipFade={handleToggleClipFade}
            onToggleClipZoom={handleToggleClipZoom}
            onStartZoomSelect={clipId => updateState({ zoomSelectClipId: clipId })}
            zoomSelectClipId={state.zoomSelectClipId}
            cropEditClipId={state.cropEditClipId}
            onStartCropEdit={clipId => {
              pushHistory()
              const clip = state.clips.find(c => c.id === clipId)
              updateState({
                cropEditClipId: clipId,
                cropEditOriginalCrop: clip ? { x: clip.cropX, y: clip.cropY, w: clip.cropW, h: clip.cropH } : null,
              })
            }}
            onEndCropEdit={() => updateState({ cropEditClipId: null, cropEditOriginalCrop: null })}
            onSourceVideoAR={handleSetSourceVideoAR}
            sourceVideoUrl={state.sourceVideoUrl}
            disabled={state.importStatus !== 'done'}
          />
        </StepCard>

        <StepCard number={3} title="Format" disabled={!anyTrimDone}>
          <FormatStep
            videoFormat={state.videoFormat}
            onFormatChange={v => updateState({ videoFormat: v })}
            socialBgColor={state.socialBgColor}
            onSocialBgColorChange={v => updateState({ socialBgColor: v })}
            cinematicBgColor={state.cinematicBgColor}
            onCinematicBgColorChange={v => updateState({ cinematicBgColor: v })}
            videoBarHeight={state.videoBarHeight}
            onVideoBarHeightChange={v => updateState({ videoBarHeight: v })}
            disabled={!anyTrimDone}
          />
        </StepCard>

        <StepCard number={4} title="Subtitles" disabled={!anyTrimDone}>
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
            disabled={!anyTrimDone}
          />
        </StepCard>

        <StepCard number={5} title="Audio" disabled={!anyTrimDone}>
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
        </StepCard>

        <StepCard number={6} title="Overlay Image" disabled={!anyTrimDone}>
          <OverlayStep
            enabled={state.overlayEnabled}
            onToggle={v => updateState({ overlayEnabled: v })}
            overlayFile={state.overlayFile}
            onOverlayFile={handleOverlayFile}
            previewUrl={state.overlayPreviewUrl}
            overlayPosition={state.overlayPosition}
            onPositionChange={v => updateState({ overlayPosition: v })}
            overlayScale={state.overlayScale}
            onScaleChange={v => updateState({ overlayScale: v })}
            disabled={!anyTrimDone}
          />
        </StepCard>

        <StepCard number={7} title="Export" disabled={!anyTrimDone}>
          <ExportStep
            clips={state.clips}
            onExportClip={handleExportClip}
            onExportAll={handleExportAll}
            disabled={!anyTrimDone}
          />
        </StepCard>

          <p className="text-center text-xs text-zinc-700 pb-2">
            Local tool — API binds to 127.0.0.1 only
          </p>
        </div>
      </div>

      {/* ── Resize handle (hidden in crop mode) ── */}
      {!state.cropEditClipId && (
        <div
          className="w-1 h-full bg-zinc-800 hover:bg-violet-600/60 transition-colors cursor-col-resize flex-shrink-0"
          onMouseDown={e => { e.preventDefault(); isPanelDragging.current = true }}
        />
      )}

      {/* ── Right: sticky preview panel ── */}
      <div className="flex-1 bg-black overflow-hidden">
        <PreviewPanel
          videoUrl={previewVideoUrl}
          sourceVideoUrl={state.sourceVideoUrl}
          sourceVideoAR={state.sourceVideoAR}
          cropEditClipId={state.cropEditClipId}
          activeCropRect={activeCropRect}
          onCropChange={crop => state.cropEditClipId && handleUpdateClipCrop(state.cropEditClipId, crop)}
          onCropDone={() => updateState({ cropEditClipId: null, cropEditOriginalCrop: null })}
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
          }}
          onCustomPositionChange={v => updateState({ customTextPosition: v })}
          activeLayer={state.activeSubtitleLayer}
          overlayEnabled={state.overlayEnabled}
          overlayPreviewUrl={state.overlayPreviewUrl}
          overlayPosition={state.overlayPosition}
          overlayScale={state.overlayScale}
          videoFormat={state.videoFormat}
          socialBgColor={state.socialBgColor}
          socialVideoScale={state.socialVideoScale}
          onSocialVideoScaleChange={v => updateState({ socialVideoScale: v })}
          cinematicBgColor={state.cinematicBgColor}
          videoBarHeight={state.videoBarHeight}
          videoOffsetX={state.videoOffsetX}
          videoOffsetY={state.videoOffsetY}
          onVideoOffsetChange={(x, y) => updateState({ videoOffsetX: x, videoOffsetY: y })}
        />
      </div>
    </main>
  )
}

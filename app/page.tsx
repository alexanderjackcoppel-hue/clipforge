'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import StepCard from './components/StepCard'
import ImportStep from './components/ImportStep'
import TrimStep from './components/TrimStep'
import SubtitlesStep from './components/SubtitlesStep'
import VoiceoverStep from './components/VoiceoverStep'
import OverlayStep from './components/OverlayStep'
import ExportStep from './components/ExportStep'
import { useJobProgress } from '../hooks/useJobProgress'
import { useMultiJobProgress } from '../hooks/useMultiJobProgress'
import { downloadVideo, trimVideo, transcribeVideo, exportVideo } from '../lib/api'
import type { ProgressEvent } from '../hooks/useJobProgress'

type Status = 'idle' | 'loading' | 'done' | 'error'
type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
type SubtitlePosition = 'top' | 'middle' | 'bottom'

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

  // Shared subtitle style
  subtitlesEnabled: boolean      // default for new clips
  subtitleFontSize: number
  subtitleColor: string
  subtitlePosition: SubtitlePosition

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
}

function makeClip(startSecs: number, endSecs: number, index: number): Clip {
  const id = uuidv4()
  return {
    id,
    clipSuffix: id.replace(/-/g, '').slice(0, 8),
    label: `Clip ${index}`,
    startSecs,
    endSecs,
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

  subtitlesEnabled: false,
  subtitleFontSize: 48,
  subtitleColor: 'FFFFFF',
  subtitlePosition: 'bottom',

  voiceoverEnabled: false,
  voiceoverFile: null,
  originalVolume: 0.8,
  voiceoverVolume: 1.0,

  overlayEnabled: false,
  overlayFile: null,
  overlayPreviewUrl: null,
  overlayPosition: 'bottom-right',
  overlayScale: 20,
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
    setState(prev => {
      const clip = makeClip(startSecs, endSecs, prev.clips.length + 1)
      return { ...prev, clips: [...prev.clips, clip] }
    })
  }, [])

  const handleRemoveClip = useCallback((clipId: string) => {
    setState(prev => {
      const remaining = prev.clips.filter(c => c.id !== clipId)
      const activeClipId = prev.activeClipId === clipId
        ? (remaining.find(c => c.trimStatus === 'done')?.id ?? remaining[0]?.id ?? null)
        : prev.activeClipId
      return { ...prev, clips: remaining, activeClipId }
    })
  }, [])

  const handleUpdateClipLabel = useCallback((clipId: string, label: string) => {
    setState(prev => ({
      ...prev,
      clips: prev.clips.map(c => c.id === clipId ? { ...c, label } : c),
    }))
  }, [])

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
        ? { ...c, subtitleStatus: 'loading', subtitleError: null }
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
        subtitleStyle: clip.subtitlesEnabled ? {
          fontSize: state.subtitleFontSize,
          color: state.subtitleColor,
          position: state.subtitlePosition,
        } : undefined,
        voiceoverEnabled: state.voiceoverEnabled,
        voiceoverFile: state.voiceoverEnabled ? (state.voiceoverFile ?? undefined) : undefined,
        originalVolume: state.originalVolume,
        voiceoverVolume: state.voiceoverVolume,
        overlayEnabled: state.overlayEnabled,
        overlayFile: state.overlayEnabled ? (state.overlayFile ?? undefined) : undefined,
        overlayPosition: state.overlayPosition,
        overlayScale: state.overlayScale,
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

  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="bg-violet-600 rounded-lg p-1.5">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-zinc-100 leading-none">ClipForge</h1>
            <p className="text-xs text-zinc-500 mt-0.5">YouTube Shorts creator</p>
          </div>
        </div>
      </header>

      {/* Steps */}
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
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
            sourceVideoUrl={state.sourceVideoUrl}
            disabled={state.importStatus !== 'done'}
          />
        </StepCard>

        <StepCard number={3} title="Subtitles" disabled={!anyTrimDone}>
          <SubtitlesStep
            clips={state.clips.filter(c => c.trimStatus === 'done')}
            activeClipId={state.activeClipId}
            onActiveClipChange={id => updateState({ activeClipId: id })}
            onToggle={v => {
              const id = state.activeClipId
              if (!id) return
              setState(prev => ({
                ...prev,
                clips: prev.clips.map(c => c.id === id ? { ...c, subtitlesEnabled: v } : c),
              }))
            }}
            onGenerate={handleGenerateSubtitles}
            onLinesChange={lines => {
              const id = state.activeClipId
              if (!id) return
              setState(prev => ({
                ...prev,
                clips: prev.clips.map(c => c.id === id ? { ...c, subtitleLines: lines } : c),
              }))
            }}
            fontSize={state.subtitleFontSize}
            onFontSizeChange={v => updateState({ subtitleFontSize: v })}
            color={state.subtitleColor}
            onColorChange={v => updateState({ subtitleColor: v })}
            position={state.subtitlePosition}
            onPositionChange={v => updateState({ subtitlePosition: v })}
            disabled={!anyTrimDone}
          />
        </StepCard>

        <StepCard number={4} title="Voiceover" disabled={!anyTrimDone}>
          <VoiceoverStep
            enabled={state.voiceoverEnabled}
            onToggle={v => updateState({ voiceoverEnabled: v })}
            voiceoverFile={state.voiceoverFile}
            onVoiceoverFile={f => updateState({ voiceoverFile: f })}
            originalVolume={state.originalVolume}
            onOriginalVolume={v => updateState({ originalVolume: v })}
            voiceoverVolume={state.voiceoverVolume}
            onVoiceoverVolume={v => updateState({ voiceoverVolume: v })}
            disabled={!anyTrimDone}
          />
        </StepCard>

        <StepCard number={5} title="Overlay Image" disabled={!anyTrimDone}>
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

        <StepCard number={6} title="Export" disabled={!anyTrimDone}>
          <ExportStep
            clips={state.clips}
            onExportClip={handleExportClip}
            onExportAll={handleExportAll}
            disabled={!anyTrimDone}
          />
        </StepCard>

        <p className="text-center text-xs text-zinc-700 pb-4">
          ClipForge — local tool, API binds to 127.0.0.1 only
        </p>
      </div>
    </main>
  )
}

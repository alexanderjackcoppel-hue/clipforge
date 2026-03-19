'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import type { Clip } from '../page'

interface TrimStepProps {
  clips: Clip[]
  onAddClip: (startSecs: number, endSecs: number) => void
  onRemoveClip: (clipId: string) => void
  onTrimClip: (clipId: string) => void
  onTrimAll: () => void
  onUpdateClipLabel: (clipId: string, label: string) => void
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

export default function TrimStep({
  clips,
  onAddClip,
  onRemoveClip,
  onTrimClip,
  onTrimAll,
  onUpdateClipLabel,
  sourceVideoUrl,
  disabled,
}: TrimStepProps) {
  const [startSecs, setStartSecs] = useState(0)
  const [endSecs, setEndSecs] = useState(30)
  const [duration, setDuration] = useState(0)
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)
  const dragging = useRef<'start' | 'end' | null>(null)

  const startSecsRef = useRef(startSecs)
  const endSecsRef = useRef(endSecs)
  const durationRef = useRef(duration)
  useEffect(() => { startSecsRef.current = startSecs }, [startSecs])
  useEffect(() => { endSecsRef.current = endSecs }, [endSecs])
  useEffect(() => { durationRef.current = duration }, [duration])

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration
      setDuration(dur)
      setEndSecs(Math.min(30, dur))
    }
  }

  useEffect(() => {
    if (sourceVideoUrl) {
      setStartSecs(0)
      setEndSecs(30)
      setDuration(0)
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

          <button
            type="button"
            onClick={() => onAddClip(startSecs, endSecs)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-medium rounded-lg px-4 py-2 text-sm transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Clip
          </button>
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
              <div key={clip.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-2">
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
                  <span className="text-xs text-zinc-600 font-mono flex-1">
                    {formatTime(clip.startSecs)}→{formatTime(clip.endSecs)}
                  </span>

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
                    className="text-zinc-600 hover:text-red-400 transition-colors ml-1"
                    title="Remove clip"
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

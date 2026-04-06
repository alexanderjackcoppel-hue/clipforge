'use client'
import { useState, useEffect, useCallback } from 'react'
import type { Clip } from '../page'
import Tooltip from './Tooltip'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface ExportStepProps {
  clips: Clip[]
  onExportClip: (clipId: string) => void
  onExportAll: () => void
  disabled: boolean
  outputWidth?: number
  outputHeight?: number
  importJobId: string | null
}

export default function ExportStep({ clips, onExportClip, onExportAll, disabled, outputWidth = 1080, outputHeight = 1920, importJobId }: ExportStepProps) {
  const [fileNames, setFileNames] = useState<Record<string, string>>({})
  const [saveFolder, setSaveFolder] = useState<string | null>(null)
  const [folderInput, setFolderInput] = useState('')
  const [editingFolder, setEditingFolder] = useState(false)
  const [saveStatus, setSaveStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({})

  useEffect(() => {
    fetch('/api/save-folder').then(r => r.json()).then(d => {
      if (d.folder) { setSaveFolder(d.folder); setFolderInput(d.folder) }
    }).catch(() => {})
  }, [])

  const handleSetFolder = useCallback(async () => {
    if (!folderInput.trim()) return
    try {
      const res = await fetch('/api/save-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: folderInput.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setSaveFolder(data.folder)
        setEditingFolder(false)
      }
    } catch { /* ignore */ }
  }, [folderInput])

  const handleSaveToFolder = useCallback(async (clip: Clip) => {
    if (!importJobId) return
    setSaveStatus(prev => ({ ...prev, [clip.id]: 'saving' }))
    try {
      const res = await fetch('/api/save-to-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: importJobId,
          clipSuffix: clip.clipSuffix,
          fileName: getFileName(clip),
        }),
      })
      if (res.ok) {
        setSaveStatus(prev => ({ ...prev, [clip.id]: 'saved' }))
      } else {
        setSaveStatus(prev => ({ ...prev, [clip.id]: 'error' }))
      }
    } catch {
      setSaveStatus(prev => ({ ...prev, [clip.id]: 'error' }))
    }
  }, [importJobId])

  const getFileName = (clip: Clip) => fileNames[clip.id] || clip.label

  const updateFileName = (clipId: string, name: string) => {
    setFileNames(prev => ({ ...prev, [clipId]: name }))
  }
  const trimmedClips = clips.filter(c => c.trimStatus === 'done')
  const exportableClips = trimmedClips.filter(
    c => c.exportStatus !== 'done' && c.exportStatus !== 'loading'
  )

  if (trimmedClips.length === 0) {
    return (
      <div className={disabled ? 'pointer-events-none' : ''}>
        <p className="text-sm text-zinc-500">Trim at least one clip to export.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${disabled ? 'pointer-events-none' : ''}`}>
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Export</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="bg-surface-2 rounded px-1.5 py-0.5 text-xs font-mono text-zinc-400">{outputWidth}×{outputHeight}</span>
        <span className="bg-surface-2 rounded px-1.5 py-0.5 text-xs font-mono text-zinc-400">H.264</span>
        <span className="bg-surface-2 rounded px-1.5 py-0.5 text-xs font-mono text-zinc-400">AAC</span>
        <span className="bg-surface-2 rounded px-1.5 py-0.5 text-xs font-mono text-zinc-400">MP4</span>
      </div>

      {/* Save folder config */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Save folder</span>
          {saveFolder && !editingFolder && (
            <button type="button" onClick={() => setEditingFolder(true)}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">Change</button>
          )}
        </div>
        {saveFolder && !editingFolder ? (
          <div className="flex items-center gap-2 bg-surface-2/50 border border-border/50 rounded-lg px-3 py-2">
            <svg className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-xs text-zinc-300 truncate font-mono">{saveFolder}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={folderInput}
              onChange={e => setFolderInput(e.target.value)}
              placeholder="~/Desktop/ClipForge Exports"
              className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono input-shadow"
              onKeyDown={e => e.key === 'Enter' && handleSetFolder()}
            />
            <button type="button" onClick={handleSetFolder}
              className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-lg px-3 py-2 transition-colors whitespace-nowrap">
              Set
            </button>
          </div>
        )}
        {!saveFolder && !editingFolder && (
          <p className="text-[11px] text-zinc-600">Set a folder to auto-save exports (e.g. ~/Desktop/Shorts)</p>
        )}
      </div>

      {/* Export All button — only when multiple clips are exportable */}
      {exportableClips.length > 1 && (
        <button
          type="button"
          onClick={onExportAll}
          className="flex items-center justify-center gap-2 btn-gradient btn-press text-white font-semibold rounded-lg px-6 py-3 text-sm w-full shadow-lg shadow-violet-600/20"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Export All ({exportableClips.length} clips)
        </button>
      )}

      {/* Per-clip rows */}
      <div className="space-y-2">
        {trimmedClips.map(clip => (
          <div key={clip.id} className="bg-surface-2/50 border border-border/50 rounded-lg px-3 py-3">
            {/* Filename input */}
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={getFileName(clip)}
                onChange={e => updateFileName(clip.id, e.target.value)}
                placeholder="Video name..."
                className="flex-1 bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-transparent input-shadow"
              />
              <span className="text-xs text-zinc-600 font-mono">.mp4</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-xs text-zinc-500 font-mono">
                  {formatTime(clip.startSecs)}→{formatTime(clip.endSecs)}
                </span>
              </div>

              {clip.exportStatus === 'loading' ? (
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-surface-2 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow={clip.exportProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Export progress">
                    <div
                      className="bg-violet-500 h-1.5 rounded-full transition-all duration-300 progress-shimmer"
                      style={{ width: `${clip.exportProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 font-mono w-8 text-right">{clip.exportProgress}%</span>
                </div>
              ) : clip.exportStatus === 'done' && clip.exportUrl ? (
                <div className="flex items-center gap-2 animate-[scale-in_300ms_cubic-bezier(0.16,1,0.3,1)]">
                  {saveFolder && (
                    <button
                      type="button"
                      onClick={() => handleSaveToFolder(clip)}
                      disabled={saveStatus[clip.id] === 'saving'}
                      className={`text-xs font-medium rounded px-3 py-1.5 transition-colors whitespace-nowrap ${
                        saveStatus[clip.id] === 'saved'
                          ? 'bg-emerald-700 text-white'
                          : saveStatus[clip.id] === 'error'
                            ? 'bg-red-800/60 text-red-300'
                            : 'bg-violet-600 hover:bg-violet-500 text-white'
                      }`}
                    >
                      {saveStatus[clip.id] === 'saving' ? 'Saving...'
                        : saveStatus[clip.id] === 'saved' ? '✓ Saved'
                        : saveStatus[clip.id] === 'error' ? 'Failed'
                        : 'Save to folder'}
                    </button>
                  )}
                  <a
                    href={clip.exportUrl}
                    download={`${getFileName(clip).replace(/\.mp4$/i, '')}.mp4`}
                    className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-medium rounded px-3 py-1.5 transition-colors whitespace-nowrap"
                  >
                    Download
                  </a>
                  <Tooltip text="Re-export with current settings">
                    <button
                      type="button"
                      onClick={() => onExportClip(clip.id)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors whitespace-nowrap"
                    >
                      Re-export
                    </button>
                  </Tooltip>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onExportClip(clip.id)}
                  className="text-xs bg-violet-600 hover:bg-violet-500 text-white font-medium rounded px-3 py-1.5 transition-colors"
                >
                  Export
                </button>
              )}
            </div>

            {/* Error */}
            {clip.exportError && (
              <p className="text-red-400 text-xs mt-1.5">{clip.exportError}</p>
            )}

            {/* Done preview */}
            {clip.exportStatus === 'done' && clip.exportUrl && (
              <video
                src={clip.exportUrl}
                controls
                playsInline
                className="w-full max-h-48 rounded object-contain bg-black mt-2"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'
import type { Clip } from '../page'

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
}

export default function ExportStep({ clips, onExportClip, onExportAll, disabled, outputWidth = 1080, outputHeight = 1920 }: ExportStepProps) {
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
      <p className="text-xs text-zinc-500"><span className="font-mono">{outputWidth}×{outputHeight}</span> · H.264 · AAC · MP4</p>

      {/* Export All button — only when multiple clips are exportable */}
      {exportableClips.length > 1 && (
        <button
          type="button"
          onClick={onExportAll}
          className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors duration-150 w-full"
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
          <div key={clip.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-zinc-200">{clip.label}</span>
                <span className="text-xs text-zinc-600 font-mono ml-2">
                  {formatTime(clip.startSecs)}→{formatTime(clip.endSecs)}
                </span>
              </div>

              {clip.exportStatus === 'loading' ? (
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-zinc-800 rounded-full h-1.5" role="progressbar" aria-valuenow={clip.exportProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Export progress">
                    <div
                      className="bg-violet-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${clip.exportProgress}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 font-mono w-8 text-right">{clip.exportProgress}%</span>
                </div>
              ) : clip.exportStatus === 'done' && clip.exportUrl ? (
                <div className="flex items-center gap-2">
                  <a
                    href={clip.exportUrl}
                    download={`${clip.label}.mp4`}
                    className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white font-medium rounded px-3 py-1.5 transition-colors whitespace-nowrap"
                  >
                    Download MP4
                  </a>
                  <button
                    type="button"
                    onClick={() => onExportClip(clip.id)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors whitespace-nowrap"
                    title="Re-export with current settings"
                  >
                    Re-export
                  </button>
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

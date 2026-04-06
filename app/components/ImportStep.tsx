'use client'
import { useState } from 'react'
import AnalysisPanel from './AnalysisPanel'

interface ImportStepProps {
  status: 'idle' | 'loading' | 'done' | 'error'
  progress: number
  error: string | null
  videoUrl: string | null
  importJobId: string | null
  videoDuration: number | null
  onDownload: (url: string) => void
  onUseAnalysisText?: (text: string) => void
}

export default function ImportStep({ status, progress, error, videoUrl, importJobId, videoDuration, onDownload, onUseAnalysisText }: ImportStepProps) {
  const [urlInput, setUrlInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = urlInput.trim()
    if (trimmed) onDownload(trimmed)
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Import</p>

      {/* Empty state paste area */}
      {status === 'idle' && !urlInput.trim() && (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-border hover:border-violet-500/50 rounded-xl py-8 px-4 transition-colors bg-surface-2/30">
          <svg className="h-8 w-8 text-zinc-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.858a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.34 8.374" />
          </svg>
          <p className="text-sm text-zinc-400 mb-1">Paste a video link to get started</p>
          <p className="text-xs text-zinc-600">YouTube, Instagram, or TikTok</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="video-url" className="block text-sm font-medium text-zinc-400 mb-1.5">
            YouTube, Instagram, or TikTok URL
          </label>
          <input
            id="video-url"
            type="text"
            autoComplete="off"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-surface-2 border border-border rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm input-shadow"
            disabled={status === 'loading'}
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading' || !urlInput.trim()}
          className="flex items-center justify-center gap-2 btn-gradient btn-press disabled:bg-surface-3 disabled:text-zinc-500 disabled:cursor-not-allowed disabled:bg-none text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors duration-150 w-full sm:w-auto"
        >
          {status === 'loading' ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Downloading...
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Video
            </>
          )}
        </button>
      </form>

      {/* Progress bar */}
      {status === 'loading' && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Downloading...</span>
            <span className="font-mono">{progress}%</span>
          </div>
          <div className="w-full bg-surface-2 rounded-full h-1.5 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Download progress">
            <div
              className="bg-violet-500 h-1.5 rounded-full transition-all duration-300 progress-shimmer"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3">
          <svg className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-red-400 text-sm">
            {error === 'server_restart'
              ? 'Server restarted — please refresh the page and try again.'
              : error}
          </p>
        </div>
      )}

      {/* AI Analysis — available once video is downloaded */}
      {status === 'done' && importJobId && videoDuration && videoDuration > 0 && (
        <AnalysisPanel jobId={importJobId} duration={videoDuration} onUseText={onUseAnalysisText} />
      )}

    </div>
  )
}

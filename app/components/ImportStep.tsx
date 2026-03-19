'use client'
import { useState } from 'react'

interface ImportStepProps {
  status: 'idle' | 'loading' | 'done' | 'error'
  progress: number
  error: string | null
  videoUrl: string | null
  onDownload: (url: string) => void
}

export default function ImportStep({ status, progress, error, videoUrl, onDownload }: ImportStepProps) {
  const [urlInput, setUrlInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = urlInput.trim()
    if (trimmed) onDownload(trimmed)
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="video-url" className="block text-sm font-medium text-zinc-400 mb-1.5">
            YouTube, Instagram, or TikTok URL
          </label>
          <input
            id="video-url"
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
            disabled={status === 'loading'}
          />
        </div>
        <button
          type="submit"
          disabled={status === 'loading' || !urlInput.trim()}
          className="flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg px-6 py-2.5 text-sm transition-colors duration-150 w-full sm:w-auto"
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
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-violet-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800/50 rounded-lg px-4 py-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Video preview */}
      {videoUrl && status === 'done' && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Source video</p>
          <video
            src={videoUrl}
            controls
            playsInline
            className="w-full max-h-[400px] rounded-lg object-contain bg-black"
          />
        </div>
      )}
    </div>
  )
}

'use client'
import { useState } from 'react'
import { analyseVideo } from '../../lib/api'
import type { VideoAnalysis } from '../../lib/api'

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

const MOOD_COLORS: Record<string, string> = {
  energetic: 'text-orange-400',
  calm: 'text-sky-400',
  funny: 'text-yellow-400',
  dramatic: 'text-red-400',
  informative: 'text-violet-400',
  inspiring: 'text-emerald-400',
  suspenseful: 'text-amber-400',
  emotional: 'text-pink-400',
}

interface AnalysisPanelProps {
  jobId: string
  duration: number
}

export default function AnalysisPanel({ jobId, duration }: AnalysisPanelProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyse = async () => {
    setStatus('loading')
    setError(null)
    try {
      const result = await analyseVideo(jobId, duration)
      setAnalysis(result)
      setStatus('done')
    } catch (err) {
      setError((err as Error).message)
      setStatus('error')
    }
  }

  if (status === 'idle') {
    return (
      <div className="mt-3">
        <button
          type="button"
          onClick={handleAnalyse}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-violet-400 transition-colors duration-150"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.522A2.5 2.5 0 0115 18.5H9a2.5 2.5 0 01-2.196-1.314l-.347-.522z" />
          </svg>
          Analyse with AI
        </button>
      </div>
    )
  }

  if (status === 'loading') {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
        <svg className="animate-spin h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Analysing video…
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="mt-3">
        <p className="text-xs text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="text-xs text-zinc-500 hover:text-zinc-300 mt-1 transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!analysis) return null

  const moodColor = MOOD_COLORS[analysis.mood] ?? 'text-zinc-400'

  return (
    <div className="mt-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm text-zinc-200 leading-relaxed">{analysis.summary}</p>
        </div>
        <span className={`text-xs font-medium capitalize flex-shrink-0 ${moodColor}`}>
          {analysis.mood}
        </span>
      </div>

      {analysis.suggestedTitle && (
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Suggested title</p>
          <p className="text-sm text-zinc-300 font-medium">{analysis.suggestedTitle}</p>
        </div>
      )}

      {analysis.suggestedDescription && (
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Caption</p>
          <p className="text-sm text-zinc-400">{analysis.suggestedDescription}</p>
        </div>
      )}

      {analysis.highlights.length > 0 && (
        <div>
          <p className="text-xs text-zinc-500 mb-1.5">Highlights</p>
          <div className="space-y-1">
            {analysis.highlights.map((h, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-xs font-mono text-violet-400 flex-shrink-0 mt-0.5">
                  {formatTime(h.time)}
                </span>
                <span className="text-xs text-zinc-400">{h.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setStatus('idle')}
        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        Dismiss
      </button>
    </div>
  )
}

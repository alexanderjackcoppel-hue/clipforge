'use client'
import { useState, useCallback } from 'react'
import Tooltip from './Tooltip'
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

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }, [text])
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors px-1.5 py-0.5 rounded border border-border hover:border-bright"
    >
      {copied ? (
        <svg className="w-3 h-3 text-emerald-400" viewBox="0 0 12 12" fill="currentColor"><path d="M10 3L5 9 2 6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
      ) : (
        <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><path d="M2 9V2h7" strokeLinecap="round"/></svg>
      )}
      {copied ? 'Copied!' : label}
    </button>
  )
}

function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <Tooltip text="Regenerate">
      <button type="button" onClick={onClick} disabled={loading}
        className="text-zinc-600 hover:text-violet-400 transition-colors disabled:opacity-50 p-0.5">
        <svg className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </Tooltip>
  )
}

function UseAsButton({ text, label, onClick }: { text: string; label: string; onClick: (text: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 transition-colors px-1.5 py-0.5 rounded border border-violet-700/60 hover:border-violet-500"
    >
      <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6h8M7 3l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
      {label}
    </button>
  )
}

interface AnalysisPanelProps {
  jobId: string
  duration: number
  onUseText?: (text: string) => void
}

export default function AnalysisPanel({ jobId, duration, onUseText }: AnalysisPanelProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [analysis, setAnalysis] = useState<VideoAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [followUpPrompt, setFollowUpPrompt] = useState('')
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)

  const runAnalysis = useCallback(async (prompt?: string) => {
    try {
      const result = await analyseVideo(jobId, duration, prompt)
      setAnalysis(result)
      setStatus('done')
    } catch (err) {
      setError((err as Error).message)
      setStatus('error')
    }
  }, [jobId, duration])

  const handleAnalyse = async () => {
    setStatus('loading')
    setError(null)
    await runAnalysis()
  }

  const handleFollowUp = async (prompt: string) => {
    if (!prompt.trim()) return
    setRegeneratingSection('all')
    setError(null)
    try {
      const result = await analyseVideo(jobId, duration, prompt)
      setAnalysis(result)
      setFollowUpPrompt('')
    } catch (err) {
      setError((err as Error).message)
    }
    setRegeneratingSection(null)
  }

  const handleRegenerateSection = async (section: string) => {
    setRegeneratingSection(section)
    const prompts: Record<string, string> = {
      funny: 'Generate a different funny overlay text suggestion. Make it wittier and more viral.',
      caption: 'Write a completely different social media caption. Make it more engaging and hook-driven.',
      hashtags: 'Generate 15 more unique, trending hashtags for this video. Different from the previous ones.',
      title: 'Suggest a different, catchier title for this video.',
    }
    try {
      const result = await analyseVideo(jobId, duration, prompts[section] ?? `Regenerate the ${section}`)
      if (analysis) {
        // Merge: keep old analysis but replace the regenerated section
        const merged = { ...analysis }
        if (section === 'funny') merged.funnyText = result.funnyText
        if (section === 'caption') { merged.caption = result.caption; merged.suggestedDescription = result.suggestedDescription }
        if (section === 'hashtags') {
          // Append new hashtags, deduplicate
          const existing = new Set(analysis.hashtags.map(h => h.toLowerCase()))
          const newTags = result.hashtags.filter(h => !existing.has(h.toLowerCase()))
          merged.hashtags = [...analysis.hashtags, ...newTags]
        }
        if (section === 'title') merged.suggestedTitle = result.suggestedTitle
        setAnalysis(merged)
      }
    } catch (err) {
      setError((err as Error).message)
    }
    setRegeneratingSection(null)
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

  if (status === 'error' && !analysis) {
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
  const hashtagString = analysis.hashtags.map(h => `#${h}`).join(' ')
  const isRegenerating = regeneratingSection !== null

  return (
    <div className="mt-3 bg-surface-2/50 border border-border/50 rounded-lg p-4 space-y-3">
      {/* Summary + mood */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-zinc-200 leading-relaxed flex-1">{analysis.summary}</p>
        <span className={`text-xs font-medium capitalize flex-shrink-0 ${moodColor}`}>
          {analysis.mood}
        </span>
      </div>

      {/* Suggested title */}
      {analysis.suggestedTitle && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Suggested Title</p>
            <div className="flex items-center gap-1">
              <RefreshButton onClick={() => handleRegenerateSection('title')} loading={regeneratingSection === 'title'} />
              <CopyButton text={analysis.suggestedTitle} />
            </div>
          </div>
          <p className="text-sm text-zinc-100 font-medium">{analysis.suggestedTitle}</p>
          {onUseText && (
            <UseAsButton text={analysis.suggestedTitle} label="Use as title overlay" onClick={onUseText} />
          )}
        </div>
      )}

      {/* Funny text suggestion */}
      {analysis.funnyText && (
        <div className="bg-surface-1/60 border border-border/50 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">😂</span>
              <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wide">Funny overlay suggestion</p>
            </div>
            <RefreshButton onClick={() => handleRegenerateSection('funny')} loading={regeneratingSection === 'funny'} />
          </div>
          <p className="text-sm text-zinc-100 font-medium">&ldquo;{analysis.funnyText}&rdquo;</p>
          <div className="flex items-center gap-2">
            <CopyButton text={analysis.funnyText} />
            {onUseText && (
              <UseAsButton text={analysis.funnyText} label="Use as text overlay" onClick={onUseText} />
            )}
          </div>
        </div>
      )}

      {/* Caption */}
      {(analysis.caption || analysis.suggestedDescription) && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Caption</p>
            <div className="flex items-center gap-1">
              <RefreshButton onClick={() => handleRegenerateSection('caption')} loading={regeneratingSection === 'caption'} />
              <CopyButton text={(analysis.caption ?? analysis.suggestedDescription)!} />
            </div>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{analysis.caption ?? analysis.suggestedDescription}</p>
          {onUseText && (
            <UseAsButton text={(analysis.caption ?? analysis.suggestedDescription)!} label="Use as caption overlay" onClick={onUseText} />
          )}
        </div>
      )}

      {/* Hashtags */}
      {analysis.hashtags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">Hashtags ({analysis.hashtags.length})</p>
            <div className="flex items-center gap-1">
              <RefreshButton onClick={() => handleRegenerateSection('hashtags')} loading={regeneratingSection === 'hashtags'} />
              <CopyButton text={hashtagString} label="Copy all" />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {analysis.hashtags.map(tag => (
              <Tooltip key={tag} text="Click to copy">
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`#${tag}`)
                  }}
                  className="text-[11px] text-violet-400 bg-violet-600/10 border border-violet-700/40 hover:border-violet-500/60 hover:bg-violet-600/20 rounded-full px-2 py-0.5 transition-colors font-mono"
                >
                  #{tag}
                </button>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* Highlights */}
      {analysis.highlights.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">Highlights</p>
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

      {/* Error from follow-up */}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Quick action buttons */}
      <div className="border-t border-border/50 pt-3 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '🔄 More hashtags', prompt: 'Generate 15 more unique trending hashtags, different from the ones already given' },
            { label: '✏️ Different caption', prompt: 'Write a completely different social media caption, more engaging and hook-driven' },
            { label: '😂 Funnier text', prompt: 'Give me a funnier, more viral overlay text suggestion' },
            { label: '🎭 Different tone', prompt: 'Rewrite everything with a completely different tone and mood' },
          ].map(action => (
            <button
              key={action.label}
              type="button"
              disabled={isRegenerating}
              onClick={() => handleFollowUp(action.prompt)}
              className="text-[11px] px-2.5 py-1.5 rounded-lg border border-border bg-surface-2 text-zinc-400 hover:text-zinc-200 hover:border-bright transition-all disabled:opacity-50 btn-press"
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Custom follow-up input */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={followUpPrompt}
            onChange={e => setFollowUpPrompt(e.target.value)}
            placeholder="Ask for something specific..."
            disabled={isRegenerating}
            className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-violet-500 input-shadow disabled:opacity-50"
            onKeyDown={e => e.key === 'Enter' && handleFollowUp(followUpPrompt)}
          />
          <button
            type="button"
            disabled={!followUpPrompt.trim() || isRegenerating}
            onClick={() => handleFollowUp(followUpPrompt)}
            className="text-xs bg-violet-600 hover:bg-violet-500 btn-press text-white font-medium rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {isRegenerating ? '...' : 'Ask'}
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={() => { setStatus('idle'); setAnalysis(null) }}
        className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
      >
        Dismiss
      </button>
    </div>
  )
}

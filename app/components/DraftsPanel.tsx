'use client'
import { useState, useEffect, useCallback } from 'react'
import { listDrafts, deleteDraft } from '../../lib/api'
import type { DraftMeta } from '../../lib/api'

interface DraftsPanelProps {
  currentDraftId: string | null
  onLoadDraft: (id: string) => void
  onClose: () => void
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatDuration(secs: number | null): string {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function DraftsPanel({ currentDraftId, onLoadDraft, onClose }: DraftsPanelProps) {
  const [drafts, setDrafts] = useState<DraftMeta[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const list = await listDrafts()
    setDrafts(list)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteDraft(id)
    setDrafts(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Drafts</p>
        <button type="button" onClick={onClose}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          Back
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <svg className="animate-spin h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Loading drafts…
        </div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-8">
          <svg className="h-8 w-8 text-zinc-700 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="text-sm text-zinc-500">No drafts yet</p>
          <p className="text-xs text-zinc-600 mt-1">Your work auto-saves as you edit</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {drafts.map(draft => (
            <button
              key={draft.id}
              type="button"
              onClick={() => onLoadDraft(draft.id)}
              className={`w-full text-left bg-surface-2/50 border rounded-lg px-3 py-2.5 transition-all hover:bg-surface-3/50 group ${
                currentDraftId === draft.id
                  ? 'border-violet-500/40 bg-violet-600/5'
                  : 'border-border/50 hover:border-border'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {draft.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-zinc-500">
                      {timeAgo(draft.savedAt)}
                    </span>
                    {draft.clipCount > 0 && (
                      <span className="text-[10px] text-zinc-600">
                        {draft.clipCount} clip{draft.clipCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {draft.sourceVideoDuration != null && (
                      <span className="text-[10px] text-zinc-600 font-mono">
                        {formatDuration(draft.sourceVideoDuration)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {currentDraftId === draft.id && (
                    <span className="text-[9px] text-violet-400 font-medium">Current</span>
                  )}
                  <button type="button" onClick={e => handleDelete(draft.id, e)}
                    className="text-zinc-600 hover:text-red-400 transition-colors p-1 -m-1 rounded"
                    aria-label="Delete draft">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useRef } from 'react'
import type { ProgressEvent } from './useJobProgress'

export function useMultiJobProgress(
  jobMap: Record<string, string | null>, // clipId → jobId
  onEvent: (clipId: string, event: ProgressEvent) => void
): void {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const sourcesRef = useRef<Map<string, { clipId: string; es: EventSource }>>(new Map())

  // Reconcile EventSources on every render (idempotent: skips already-open jobIds)
  useEffect(() => {
    const desiredJobIds = new Set<string>()
    const jobIdToClipId: Record<string, string> = {}

    for (const [clipId, jobId] of Object.entries(jobMap)) {
      if (!jobId) continue
      desiredJobIds.add(jobId)
      jobIdToClipId[jobId] = clipId
    }

    // Open new EventSources
    for (const jobId of Array.from(desiredJobIds)) {
      if (sourcesRef.current.has(jobId)) continue
      const clipId = jobIdToClipId[jobId]
      const es = new EventSource(`/jobs/${jobId}/progress`)
      sourcesRef.current.set(jobId, { clipId, es })

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as ProgressEvent
          onEventRef.current(clipId, data)
          if (data.type === 'done' || data.type === 'error') {
            es.close()
            sourcesRef.current.delete(jobId)
          }
        } catch {
          // ignore parse errors
        }
      }

      es.onerror = () => {
        // SSE reconnects automatically; only close on done/error
      }
    }

    // Close EventSources for jobIds no longer in the map
    const toClose: string[] = []
    for (const jobId of Array.from(sourcesRef.current.keys())) {
      if (!desiredJobIds.has(jobId)) toClose.push(jobId)
    }
    for (const jobId of toClose) {
      sourcesRef.current.get(jobId)?.es.close()
      sourcesRef.current.delete(jobId)
    }
  })

  // Close all on unmount
  useEffect(() => {
    return () => {
      for (const { es } of Array.from(sourcesRef.current.values())) {
        es.close()
      }
      sourcesRef.current.clear()
    }
  }, [])
}

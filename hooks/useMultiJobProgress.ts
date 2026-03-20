'use client'
import { useEffect, useRef } from 'react'
import type { ProgressEvent } from './useJobProgress'

export function useMultiJobProgress(
  jobMap: Record<string, string | null>, // clipId → jobId
  onEvent: (clipId: string, event: ProgressEvent) => void
): void {
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const sourcesRef = useRef<Map<string, {
    clipId: string
    es: EventSource
    done: boolean
    pollTimer: ReturnType<typeof setTimeout> | null
    pollInterval: ReturnType<typeof setInterval> | null
  }>>(new Map())

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
      const entry = { clipId, es, done: false, pollTimer: null as ReturnType<typeof setTimeout> | null, pollInterval: null as ReturnType<typeof setInterval> | null }
      sourcesRef.current.set(jobId, entry)

      const cleanup = () => {
        entry.done = true
        es.close()
        if (entry.pollTimer) clearTimeout(entry.pollTimer)
        if (entry.pollInterval) clearInterval(entry.pollInterval)
        sourcesRef.current.delete(jobId)
      }

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as ProgressEvent
          onEventRef.current(clipId, data)
          if (data.type === 'done' || data.type === 'error') {
            cleanup()
          }
        } catch {
          // ignore parse errors
        }
      }

      es.onerror = () => {
        // SSE auto-reconnects; polling covers the gap
      }

      // Polling fallback: after 2s with no terminal event, poll every 1.5s
      entry.pollTimer = setTimeout(() => {
        if (entry.done) return
        entry.pollInterval = setInterval(async () => {
          if (entry.done) {
            clearInterval(entry.pollInterval!)
            return
          }
          try {
            const res = await fetch(`/jobs/${jobId}`)
            if (!res.ok) return
            const { status, events } = await res.json() as {
              status: string
              events: ProgressEvent[]
            }
            for (const event of events) {
              onEventRef.current(clipId, event)
            }
            if (status === 'done' || status === 'error') {
              cleanup()
            }
          } catch {
            // keep polling
          }
        }, 1500)
      }, 2000)
    }

    // Close EventSources for jobIds no longer in the map
    const toClose: string[] = []
    for (const jobId of Array.from(sourcesRef.current.keys())) {
      if (!desiredJobIds.has(jobId)) toClose.push(jobId)
    }
    for (const jobId of toClose) {
      const entry = sourcesRef.current.get(jobId)
      if (entry) {
        entry.done = true
        entry.es.close()
        if (entry.pollTimer) clearTimeout(entry.pollTimer)
        if (entry.pollInterval) clearInterval(entry.pollInterval)
      }
      sourcesRef.current.delete(jobId)
    }
  })

  // Close all on unmount
  useEffect(() => {
    return () => {
      for (const entry of Array.from(sourcesRef.current.values())) {
        entry.done = true
        entry.es.close()
        if (entry.pollTimer) clearTimeout(entry.pollTimer)
        if (entry.pollInterval) clearInterval(entry.pollInterval)
      }
      sourcesRef.current.clear()
    }
  }, [])
}

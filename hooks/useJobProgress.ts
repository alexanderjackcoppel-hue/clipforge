'use client'
import { useEffect, useRef } from 'react'

export interface ProgressEvent {
  type: 'progress' | 'done' | 'error'
  stage?: string
  percent?: number
  message?: string
  url?: string
  subtitles?: Array<{ id: number; start: number; end: number; text: string }>
}

const MAX_SSE_ERRORS = 5

export function useJobProgress(
  jobId: string | null,
  onEvent: (event: ProgressEvent) => void
) {
  const esRef = useRef<EventSource | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const doneRef = useRef(false)
  const errorCountRef = useRef(0)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!jobId) return

    doneRef.current = false
    errorCountRef.current = 0
    esRef.current?.close()
    if (pollRef.current) clearInterval(pollRef.current)

    // --- SSE ---
    const es = new EventSource(`/jobs/${jobId}/progress`)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as ProgressEvent
        errorCountRef.current = 0 // reset on successful message
        onEventRef.current(data)
        if (data.type === 'done' || data.type === 'error') {
          doneRef.current = true
          es.close()
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      if (doneRef.current) return
      errorCountRef.current++
      if (errorCountRef.current >= MAX_SSE_ERRORS) {
        // Server likely restarted — stop reconnecting and notify the user
        doneRef.current = true
        es.close()
        if (pollRef.current) clearInterval(pollRef.current)
        onEventRef.current({ type: 'error', message: 'server_restart' })
      }
      // Otherwise SSE auto-reconnects; polling covers the gap
    }

    // --- Polling fallback ---
    // If SSE doesn't deliver a terminal event within 2 seconds, start polling
    // the REST status endpoint every 1.5s. This handles: server restarts, proxy
    // buffering, and fast jobs that complete before the EventSource connects.
    const pollStart = setTimeout(() => {
      if (doneRef.current) return
      pollRef.current = setInterval(async () => {
        if (doneRef.current) {
          clearInterval(pollRef.current!)
          return
        }
        try {
          const res = await fetch(`/jobs/${jobId}`)
          if (!res.ok) return
          const { status, events } = await res.json() as {
            status: string
            events: ProgressEvent[]
          }
          // Replay any events not yet delivered by SSE
          for (const event of events) {
            onEventRef.current(event)
          }
          if (status === 'done' || status === 'error') {
            doneRef.current = true
            es.close()
            clearInterval(pollRef.current!)
          }
        } catch {
          // network error - keep polling
        }
      }, 1500)
    }, 2000)

    return () => {
      doneRef.current = true
      es.close()
      clearTimeout(pollStart)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [jobId])
}

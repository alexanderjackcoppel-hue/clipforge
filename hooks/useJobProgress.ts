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

export function useJobProgress(
  jobId: string | null,
  onEvent: (event: ProgressEvent) => void
) {
  const esRef = useRef<EventSource | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!jobId) return

    esRef.current?.close()

    const es = new EventSource(`/jobs/${jobId}/progress`)
    esRef.current = es

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as ProgressEvent
        onEventRef.current(data)
        if (data.type === 'done' || data.type === 'error') {
          es.close()
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      // SSE reconnects automatically; only close on done/error
    }

    return () => {
      es.close()
    }
  }, [jobId])
}

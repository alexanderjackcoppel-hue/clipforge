import type { Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function isValidJobId(id: string | undefined | null): id is string {
  if (!id || typeof id !== 'string') return false
  return UUID_REGEX.test(id)
}

export interface ProgressEvent {
  type: 'progress' | 'done' | 'error'
  stage?: string
  percent?: number
  message?: string
  url?: string
  subtitles?: Array<{ id: number; start: number; end: number; text: string }>
}

export interface JobState {
  id: string
  status: 'queued' | 'running' | 'done' | 'error'
  stage?: string
  percent: number
  events: ProgressEvent[]
  createdAt: number
}

type JobFn = () => Promise<void>
export type QueueType = 'io' | 'render' | 'ai'

// Separate concurrency limits by work type:
//   io     — download + trim (disk I/O bound)          → 2 concurrent
//   render — export (VideoToolbox / libx264)            → 2 concurrent
//   ai     — transcription + analysis (Whisper, Claude) → 1 concurrent
const QUEUE_LIMITS: Record<QueueType, number> = { io: 2, render: 2, ai: 1 }

export class JobManager {
  private jobs = new Map<string, JobState>()
  private clients = new Map<string, Response[]>()
  private queues: Record<QueueType, Array<{ fn: JobFn; resolve: () => void; reject: (e: Error) => void }>> = {
    io: [], render: [], ai: [],
  }
  private activeCounts: Record<QueueType, number> = { io: 0, render: 0, ai: 0 }

  createJob(): string {
    const id: string = uuidv4()
    this.jobs.set(id, {
      id,
      status: 'queued',
      percent: 0,
      events: [],
      createdAt: Date.now(),
    })
    this.clients.set(id, [])
    return id
  }

  sendProgress(jobId: string, event: ProgressEvent): void {
    const job = this.jobs.get(jobId)
    if (!job) return

    job.events.push(event)

    if (event.type === 'progress') {
      job.status = 'running'
      if (event.stage) job.stage = event.stage
      if (event.percent !== undefined) job.percent = event.percent
    } else if (event.type === 'done') {
      job.status = 'done'
      job.percent = 100
    } else if (event.type === 'error') {
      job.status = 'error'
    }

    const clientList = this.clients.get(jobId) ?? []
    const payload = `data: ${JSON.stringify(event)}\n\n`
    const deadClients: Response[] = []

    const isFinal = event.type === 'done' || event.type === 'error'
    for (const res of clientList) {
      try {
        res.write(payload)
        // Close the SSE connection after the final event so HTTP proxies
        // (e.g. Next.js dev proxy) flush their buffers immediately.
        if (isFinal) res.end()
      } catch {
        deadClients.push(res)
      }
    }

    if (deadClients.length > 0) {
      const alive = clientList.filter(r => !deadClients.includes(r))
      this.clients.set(jobId, alive)
    }
  }

  connectSSE(jobId: string, res: Response): void {
    const job = this.jobs.get(jobId)
    const isTerminal = job && (job.status === 'done' || job.status === 'error')

    if (!isTerminal) {
      // Job still running — register client for future events
      const clientList = this.clients.get(jobId) ?? []
      clientList.push(res)
      this.clients.set(jobId, clientList)
      res.on('close', () => {
        const list = this.clients.get(jobId) ?? []
        this.clients.set(jobId, list.filter(r => r !== res))
      })
    }

    // Replay buffered events (catches fast-completing jobs where the SSE
    // client connects after the job is already done, or reconnects after close)
    if (job) {
      for (const event of job.events) {
        try {
          res.write(`data: ${JSON.stringify(event)}\n\n`)
        } catch {
          return
        }
      }
      // For terminal jobs: close the connection so the Next.js dev proxy
      // flushes its buffer and the EventSource receives the done/error event.
      // The headers + heartbeat were already written before connectSSE was
      // called, so the proxy already knows this is an SSE stream.
      if (isTerminal) {
        try { res.end() } catch { /* ignore */ }
      }
    }
  }

  enqueue(fn: JobFn, queue: QueueType = 'render'): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queues[queue].push({ fn, resolve, reject })
      this.drain(queue)
    })
  }

  /** Download + trim: disk I/O bound, up to 2 concurrent */
  enqueueIO(fn: JobFn): Promise<void> { return this.enqueue(fn, 'io') }
  /** FFmpeg export: GPU/CPU bound via VideoToolbox or libx264, up to 2 concurrent */
  enqueueRender(fn: JobFn): Promise<void> { return this.enqueue(fn, 'render') }
  /** Whisper transcription + Claude analysis: long-running AI, 1 at a time */
  enqueueAI(fn: JobFn): Promise<void> { return this.enqueue(fn, 'ai') }

  private drain(queue: QueueType): void {
    const limit = QUEUE_LIMITS[queue]
    if (this.activeCounts[queue] >= limit || this.queues[queue].length === 0) return

    const item = this.queues[queue].shift()
    if (!item) return

    this.activeCounts[queue]++
    item.fn()
      .then(() => item.resolve())
      .catch((err: Error) => item.reject(err))
      .finally(() => {
        this.activeCounts[queue]--
        this.drain(queue)
      })
  }

  getJob(id: string): JobState | undefined {
    return this.jobs.get(id)
  }

  getActiveJobIds(): Set<string> {
    const active = new Set<string>()
    for (const [id, job] of Array.from(this.jobs.entries())) {
      if (job.status === 'queued' || job.status === 'running') {
        active.add(id)
      }
    }
    return active
  }

  pruneJob(id: string): void {
    this.jobs.delete(id)
    this.clients.delete(id)
  }
}

export const jobManager = new JobManager()

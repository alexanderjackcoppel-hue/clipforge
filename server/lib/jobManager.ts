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

class JobManager {
  private jobs = new Map<string, JobState>()
  private clients = new Map<string, Response[]>()
  private queue: Array<{ fn: JobFn; resolve: () => void; reject: (e: Error) => void }> = []
  private activeCount = 0
  private readonly maxConcurrent = 1

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

    for (const res of clientList) {
      try {
        res.write(payload)
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

    // Register client and cleanup handler before replaying events so that
    // res.on('close') is always wired up regardless of job state.
    const clientList = this.clients.get(jobId) ?? []
    clientList.push(res)
    this.clients.set(jobId, clientList)
    res.on('close', () => {
      const list = this.clients.get(jobId) ?? []
      this.clients.set(jobId, list.filter(r => r !== res))
    })

    // Replay buffered events (catches fast-completing jobs where the SSE
    // client connects after the job is already done)
    if (job) {
      for (const event of job.events) {
        try {
          res.write(`data: ${JSON.stringify(event)}\n\n`)
        } catch {
          return
        }
      }
    }

    // Do NOT call res.end() here — even for already-terminal jobs.
    // Calling res.end() immediately causes Next.js dev proxy to treat this as
    // a buffered HTTP response rather than an SSE stream, dropping events for
    // fast-completing jobs (e.g. short YouTube Shorts).
    // The SSE hook closes the EventSource on receiving done/error, which
    // triggers res.on('close') above to remove the client from the list.
  }

  enqueue(fn: JobFn): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject })
      this.drain()
    })
  }

  private drain(): void {
    if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) return

    const item = this.queue.shift()
    if (!item) return

    this.activeCount++
    item.fn()
      .then(() => {
        item.resolve()
      })
      .catch((err: Error) => {
        item.reject(err)
      })
      .finally(() => {
        this.activeCount--
        this.drain()
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

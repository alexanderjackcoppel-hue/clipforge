import { describe, it, expect, vi } from 'vitest'
import { isValidJobId, UUID_REGEX, JobManager } from '../server/lib/jobManager.js'

describe('isValidJobId', () => {
  it('accepts a valid UUID v4', () => {
    expect(isValidJobId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isValidJobId('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
  })

  it('rejects non-UUID strings', () => {
    expect(isValidJobId('not-a-uuid')).toBe(false)
    expect(isValidJobId('12345')).toBe(false)
    expect(isValidJobId('550e8400-e29b-41d4-a716')).toBe(false) // too short
  })

  it('rejects empty / null / undefined', () => {
    expect(isValidJobId('')).toBe(false)
    expect(isValidJobId(null)).toBe(false)
    expect(isValidJobId(undefined)).toBe(false)
  })

  it('rejects uppercase UUIDs (must be lowercase hex)', () => {
    expect(isValidJobId('550E8400-E29B-41D4-A716-446655440000')).toBe(false)
  })

  it('UUID_REGEX matches the pattern used by uuid v4', () => {
    expect(UUID_REGEX.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(UUID_REGEX.test('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')).toBe(false)
  })
})

describe('JobManager — queue and concurrency', () => {
  it('runs a single enqueued job', async () => {
    const jm = new JobManager()
    let ran = false
    await jm.enqueue(async () => { ran = true })
    expect(ran).toBe(true)
  })

  it('runs multiple jobs sequentially when limit is 1 (ai queue)', async () => {
    const jm = new JobManager()
    const order: number[] = []
    await Promise.all([
      jm.enqueueAI(async () => { order.push(1) }),
      jm.enqueueAI(async () => { order.push(2) }),
      jm.enqueueAI(async () => { order.push(3) }),
    ])
    expect(order).toEqual([1, 2, 3])
  })

  it('respects concurrency limit: io queue allows 2 concurrent', async () => {
    const jm = new JobManager()
    let concurrent = 0
    let maxConcurrent = 0
    const makeJob = () => async () => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise(r => setTimeout(r, 10))
      concurrent--
    }
    await Promise.all([
      jm.enqueueIO(makeJob()),
      jm.enqueueIO(makeJob()),
      jm.enqueueIO(makeJob()),
    ])
    expect(maxConcurrent).toBe(2)
  })

  it('respects concurrency limit: ai queue allows only 1 concurrent', async () => {
    const jm = new JobManager()
    let concurrent = 0
    let maxConcurrent = 0
    const makeJob = () => async () => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise(r => setTimeout(r, 10))
      concurrent--
    }
    await Promise.all([
      jm.enqueueAI(makeJob()),
      jm.enqueueAI(makeJob()),
      jm.enqueueAI(makeJob()),
    ])
    expect(maxConcurrent).toBe(1)
  })

  it('rejects the promise if the job throws', async () => {
    const jm = new JobManager()
    await expect(
      jm.enqueue(async () => { throw new Error('job failed') })
    ).rejects.toThrow('job failed')
  })

  it('drains the queue after a failed job (next job still runs)', async () => {
    const jm = new JobManager()
    let secondRan = false
    await Promise.allSettled([
      jm.enqueueAI(async () => { throw new Error('fail') }),
      jm.enqueueAI(async () => { secondRan = true }),
    ])
    expect(secondRan).toBe(true)
  })
})

describe('JobManager — job lifecycle and sendProgress', () => {
  it('createJob returns a valid UUID and stores the job as queued', () => {
    const jm = new JobManager()
    const id = jm.createJob()
    expect(isValidJobId(id)).toBe(true)
    const job = jm.getJob(id)
    expect(job).toBeDefined()
    expect(job!.status).toBe('queued')
    expect(job!.percent).toBe(0)
  })

  it('sendProgress updates status to running on progress event', () => {
    const jm = new JobManager()
    const id = jm.createJob()
    jm.sendProgress(id, { type: 'progress', stage: 'downloading', percent: 42 })
    const job = jm.getJob(id)!
    expect(job.status).toBe('running')
    expect(job.percent).toBe(42)
    expect(job.stage).toBe('downloading')
  })

  it('sendProgress updates status to done and percent to 100', () => {
    const jm = new JobManager()
    const id = jm.createJob()
    jm.sendProgress(id, { type: 'done', stage: 'exported', percent: 100 })
    const job = jm.getJob(id)!
    expect(job.status).toBe('done')
    expect(job.percent).toBe(100)
  })

  it('sendProgress updates status to error', () => {
    const jm = new JobManager()
    const id = jm.createJob()
    jm.sendProgress(id, { type: 'error', message: 'something went wrong' })
    expect(jm.getJob(id)!.status).toBe('error')
  })

  it('events are buffered in job.events', () => {
    const jm = new JobManager()
    const id = jm.createJob()
    jm.sendProgress(id, { type: 'progress', percent: 10 })
    jm.sendProgress(id, { type: 'progress', percent: 50 })
    jm.sendProgress(id, { type: 'done', percent: 100 })
    expect(jm.getJob(id)!.events).toHaveLength(3)
  })

  it('sendProgress is a no-op for unknown job IDs', () => {
    const jm = new JobManager()
    // Should not throw
    expect(() => jm.sendProgress('00000000-0000-0000-0000-000000000000', { type: 'done' })).not.toThrow()
  })
})

describe('JobManager — SSE connectSSE event replay', () => {
  it('replays buffered events to a late-connecting SSE client', () => {
    const jm = new JobManager()
    const id = jm.createJob()
    jm.sendProgress(id, { type: 'progress', percent: 50 })
    jm.sendProgress(id, { type: 'done', percent: 100 })

    const written: string[] = []
    let ended = false
    const fakeRes = {
      write: (data: string) => { written.push(data) },
      end: () => { ended = true },
      on: vi.fn(),
    }
    jm.connectSSE(id, fakeRes as never)

    expect(written).toHaveLength(2)
    expect(written[0]).toContain('"percent":50')
    expect(written[1]).toContain('"percent":100')
    expect(ended).toBe(true) // closes connection after terminal event replay
  })

  it('registers client for future events when job is still running', () => {
    const jm = new JobManager()
    const id = jm.createJob()
    jm.sendProgress(id, { type: 'progress', percent: 10 })

    const written: string[] = []
    const fakeRes = {
      write: (data: string) => { written.push(data) },
      end: vi.fn(),
      on: vi.fn(),
    }
    jm.connectSSE(id, fakeRes as never)

    // Only replays the one buffered progress event
    expect(written).toHaveLength(1)

    // Subsequent events are fanned out to the registered client
    jm.sendProgress(id, { type: 'done', percent: 100 })
    expect(written).toHaveLength(2)
    expect(written[1]).toContain('"type":"done"')
  })
})

describe('JobManager — pruneJob and getActiveJobIds', () => {
  it('pruneJob removes the job from getJob', () => {
    const jm = new JobManager()
    const id = jm.createJob()
    expect(jm.getJob(id)).toBeDefined()
    jm.pruneJob(id)
    expect(jm.getJob(id)).toBeUndefined()
  })

  it('getActiveJobIds returns queued and running jobs only', () => {
    const jm = new JobManager()
    const id1 = jm.createJob() // queued
    const id2 = jm.createJob()
    jm.sendProgress(id2, { type: 'progress', percent: 50 }) // running
    const id3 = jm.createJob()
    jm.sendProgress(id3, { type: 'done', percent: 100 }) // done

    const active = jm.getActiveJobIds()
    expect(active.has(id1)).toBe(true)
    expect(active.has(id2)).toBe(true)
    expect(active.has(id3)).toBe(false)
  })
})

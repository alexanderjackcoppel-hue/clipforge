import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'

const TMP = '/tmp/clipforge-test-routes'

// Mock TMP_DIR before importing routes — vi.mock factories are hoisted
vi.mock('../server/index.js', () => ({ TMP_DIR: '/tmp/clipforge-test-routes' }))

// Mock spawnJob so routes never actually spawn ffmpeg/yt-dlp
vi.mock('../server/lib/spawnJob.js', () => ({
  spawnJob: vi.fn(async () => ({ stdout: '', stderr: '' })),
}))

// Import routes *after* mocks are wired
import downloadRouter from '../server/routes/download.js'
import trimRouter from '../server/routes/trim.js'
import transcribeRouter from '../server/routes/transcribe.js'
import exportRouter from '../server/routes/export.js'
import ttsRouter from '../server/routes/tts.js'

// Stable UUIDs for testing
const VALID_UUID = 'a0000000-0000-4000-8000-000000000001'
const BAD_UUID = 'not-a-uuid'

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/download', downloadRouter)
  app.use('/api/trim', trimRouter)
  app.use('/api/transcribe', transcribeRouter)
  app.use('/api/export', exportRouter)
  app.use('/api/tts', ttsRouter)
  return app
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  mkdirSync(TMP, { recursive: true })
})

afterEach(() => {
  try { rmSync(TMP, { recursive: true, force: true }) } catch { /* ignore */ }
})

// ─── Download route ───────────────────────────────────────────────────────────

describe('POST /api/download', () => {
  it('returns 400 when url is missing', async () => {
    const res = await request(buildApp())
      .post('/api/download')
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/url/i)
  })

  it('returns 400 when url is not a string', async () => {
    const res = await request(buildApp())
      .post('/api/download')
      .send({ url: 123 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/url/i)
  })

  it('returns 400 for an invalid URL', async () => {
    const res = await request(buildApp())
      .post('/api/download')
      .send({ url: 'not-a-url' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('returns jobId for a valid YouTube URL', async () => {
    const res = await request(buildApp())
      .post('/api/download')
      .send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
    expect(res.status).toBe(200)
    expect(res.body.jobId).toBeDefined()
    expect(typeof res.body.jobId).toBe('string')
  })
})

// ─── Trim route ───────────────────────────────────────────────────────────────

describe('POST /api/trim', () => {
  it('returns 400 for invalid jobId', async () => {
    const res = await request(buildApp())
      .post('/api/trim')
      .send({ jobId: BAD_UUID, startTime: '0:00', endTime: '0:10' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/job/i)
  })

  it('returns 400 for invalid clipSuffix', async () => {
    const res = await request(buildApp())
      .post('/api/trim')
      .send({ jobId: VALID_UUID, startTime: '0:00', endTime: '0:10', clipSuffix: 'ZZZZZZZZ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/clipSuffix/i)
  })

  it('returns 400 for invalid time format', async () => {
    const res = await request(buildApp())
      .post('/api/trim')
      .send({ jobId: VALID_UUID, startTime: 'abc', endTime: '0:10' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBeDefined()
  })

  it('returns 400 when end time <= start time', async () => {
    const jobDir = join(TMP, VALID_UUID)
    mkdirSync(jobDir, { recursive: true })
    writeFileSync(join(jobDir, 'source.mp4'), '')
    const res = await request(buildApp())
      .post('/api/trim')
      .send({ jobId: VALID_UUID, startTime: '0:10', endTime: '0:05' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/end time/i)
  })

  it('returns 400 when source video does not exist', async () => {
    const res = await request(buildApp())
      .post('/api/trim')
      .send({ jobId: VALID_UUID, startTime: '0:00', endTime: '0:10' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/source video/i)
  })

  it('returns jobId when source video exists', async () => {
    const jobDir = join(TMP, VALID_UUID)
    mkdirSync(jobDir, { recursive: true })
    writeFileSync(join(jobDir, 'source.mp4'), '')
    const res = await request(buildApp())
      .post('/api/trim')
      .send({ jobId: VALID_UUID, startTime: '0:00', endTime: '0:10' })
    expect(res.status).toBe(200)
    expect(res.body.jobId).toBeDefined()
  })
})

// ─── Transcribe route ─────────────────────────────────────────────────────────

describe('POST /api/transcribe', () => {
  it('returns 400 for invalid jobId', async () => {
    const res = await request(buildApp())
      .post('/api/transcribe')
      .send({ jobId: BAD_UUID })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/job/i)
  })

  it('returns 400 for invalid model name', async () => {
    const res = await request(buildApp())
      .post('/api/transcribe')
      .send({ jobId: VALID_UUID, model: 'large' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/model/i)
  })

  it('returns 400 for invalid clipSuffix', async () => {
    const res = await request(buildApp())
      .post('/api/transcribe')
      .send({ jobId: VALID_UUID, model: 'base', clipSuffix: 'ZZZZZZZZ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/clipSuffix/i)
  })

  it('returns 400 when trimmed video does not exist', async () => {
    // Skip if whisper model file is not present (CI may not have it)
    const modelPath = '/opt/homebrew/share/whisper-cpp/models/ggml-base.bin'
    const { existsSync } = await import('fs')
    if (!existsSync(modelPath)) return

    const jobDir = join(TMP, VALID_UUID)
    mkdirSync(jobDir, { recursive: true })
    const res = await request(buildApp())
      .post('/api/transcribe')
      .send({ jobId: VALID_UUID })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/trimmed video/i)
  })
})

// ─── Export route ─────────────────────────────────────────────────────────────

describe('POST /api/export', () => {
  it('returns 400 for invalid jobId', async () => {
    const res = await request(buildApp())
      .post('/api/export?jobId=' + BAD_UUID)
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/job/i)
  })

  it('returns 400 for invalid clipSuffix', async () => {
    const res = await request(buildApp())
      .post('/api/export?jobId=' + VALID_UUID + '&clipSuffix=ZZZZZZZZ')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/clipSuffix/i)
  })

  it('returns 400 when trimmed video does not exist', async () => {
    const jobDir = join(TMP, VALID_UUID)
    mkdirSync(jobDir, { recursive: true })
    const res = await request(buildApp())
      .post('/api/export?jobId=' + VALID_UUID)
      .field('presetWidth', '1080')
      .field('presetHeight', '1920')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/trimmed video/i)
  })

  it('returns 400 for invalid presetWidth', async () => {
    const jobDir = join(TMP, VALID_UUID)
    mkdirSync(jobDir, { recursive: true })
    writeFileSync(join(jobDir, 'trimmed.mp4'), '')
    const res = await request(buildApp())
      .post('/api/export?jobId=' + VALID_UUID)
      .field('presetWidth', '50')
      .field('presetHeight', '1920')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/presetWidth/i)
  })

  it('returns 400 for invalid presetHeight', async () => {
    const jobDir = join(TMP, VALID_UUID)
    mkdirSync(jobDir, { recursive: true })
    writeFileSync(join(jobDir, 'trimmed.mp4'), '')
    const res = await request(buildApp())
      .post('/api/export?jobId=' + VALID_UUID)
      .field('presetWidth', '1080')
      .field('presetHeight', '99999')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/presetHeight/i)
  })

  it('returns 400 for invalid hex color', async () => {
    const jobDir = join(TMP, VALID_UUID)
    mkdirSync(jobDir, { recursive: true })
    writeFileSync(join(jobDir, 'trimmed.mp4'), '')
    const res = await request(buildApp())
      .post('/api/export?jobId=' + VALID_UUID)
      .field('presetWidth', '1080')
      .field('presetHeight', '1920')
      .field('standardBgColor', 'ZZZZZZ')
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/standardBgColor/i)
  })

  it('returns jobId for valid export request', async () => {
    const jobDir = join(TMP, VALID_UUID)
    mkdirSync(jobDir, { recursive: true })
    writeFileSync(join(jobDir, 'trimmed.mp4'), '')
    const res = await request(buildApp())
      .post('/api/export?jobId=' + VALID_UUID)
      .field('presetWidth', '1080')
      .field('presetHeight', '1920')
    expect(res.status).toBe(200)
    expect(res.body.jobId).toBeDefined()
  })
})

// ─── TTS route ────────────────────────────────────────────────────────────────

describe('POST /api/tts', () => {
  it('returns 400 when text is missing', async () => {
    const res = await request(buildApp())
      .post('/api/tts')
      .send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/text/i)
  })

  it('returns 400 when text is empty', async () => {
    const res = await request(buildApp())
      .post('/api/tts')
      .send({ text: '   ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/text/i)
  })

  it('returns 400 when text is not a string', async () => {
    const res = await request(buildApp())
      .post('/api/tts')
      .send({ text: 42 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/text/i)
  })
})

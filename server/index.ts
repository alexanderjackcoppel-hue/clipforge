import express from 'express'
import { mkdirSync, existsSync, copyFileSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'
import { cleanupOldJobs } from './lib/cleanup.js'
import { jobManager, isValidJobId } from './lib/jobManager.js'
import downloadRouter from './routes/download.js'
import trimRouter from './routes/trim.js'
import transcribeRouter from './routes/transcribe.js'
import exportRouter from './routes/export.js'
import analyseRouter from './routes/analyse.js'
import thumbnailRouter from './routes/thumbnail.js'
import ttsRouter from './routes/tts.js'
import silenceRouter from './routes/silence.js'
import waveformRouter from './routes/waveform.js'

export const TMP_DIR = join('/tmp', 'clipforge')
mkdirSync(TMP_DIR, { recursive: true })

// --- Startup dependency check ---
function checkBinary(name: string, required: boolean): boolean {
  try {
    const extraPath = '/opt/homebrew/bin:/usr/local/bin'
    const env = { ...process.env, PATH: `${extraPath}:${process.env.PATH ?? ''}` }
    execSync(`which ${name}`, { stdio: 'ignore', env })
    console.log(`✓ ${name} found`)
    return true
  } catch {
    const msg = `✗ ${name} not found`
    if (required) {
      console.error(`${msg}\n  Install: brew install ${name}`)
      return false
    } else {
      console.warn(`${msg} (optional — subtitles won't work)\n  Install: brew install whisper-cpp\n  Model:   curl -L https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin -o /opt/homebrew/share/whisper-cpp/models/ggml-base.bin`)
      return true
    }
  }
}

const ffmpegOk = checkBinary('ffmpeg', true)
const ytdlpOk = checkBinary('yt-dlp', true)
checkBinary('whisper-cli', false) // optional — Homebrew installs as whisper-cli

if (!ffmpegOk || !ytdlpOk) {
  console.error('\nMissing required binaries. Exiting.')
  process.exit(1)
}

const app = express()
app.use(express.json())
// Allow the Next.js dev server (localhost:3000) to load media directly from this server
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

// --- Job status REST endpoint (polling fallback) ---
app.get('/jobs/:id', (req, res) => {
  const { id } = req.params
  if (!isValidJobId(id)) {
    res.status(400).json({ error: 'Invalid job ID' })
    return
  }
  const job = jobManager.getJob(id)
  if (!job) {
    res.status(404).json({ error: 'Job not found' })
    return
  }
  res.json({ status: job.status, percent: job.percent, events: job.events })
})

// --- SSE progress endpoint ---
app.get('/jobs/:id/progress', (req, res) => {
  const { id } = req.params
  if (!isValidJobId(id)) {
    res.status(400).json({ error: 'Invalid job ID' })
    return
  }
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()
  res.write(': connected\n\n')
  jobManager.connectSSE(id, res)
})

// --- Static file serving for job temp files ---
app.get('/files/:jobId/:filename', (req, res) => {
  const { jobId, filename } = req.params
  if (!isValidJobId(jobId)) {
    res.status(400).json({ error: 'Invalid job ID' })
    return
  }
  // Allowlist regex: base names + optional 8-char hex suffix, safe extensions only
  const ALLOWED_FILE_RE = /^(source|trimmed|final|audio|waveform)(_[0-9a-f]{8})?\.(mp4|wav|png)$/
  if (!ALLOWED_FILE_RE.test(filename)) {
    res.status(400).json({ error: 'File not found' })
    return
  }
  const filePath = join(TMP_DIR, jobId, filename)
  if (!existsSync(filePath)) {
    res.status(404).json({ error: 'File not found' })
    return
  }
  res.sendFile(filePath)
})

// --- API routes ---
app.use('/api/download', downloadRouter)
app.use('/api/trim', trimRouter)
app.use('/api/transcribe', transcribeRouter)
app.use('/api/export', exportRouter)
app.use('/api/analyse', analyseRouter)
app.use('/api/thumbnail', thumbnailRouter)
app.use('/api/tts', ttsRouter)
app.use('/api/silence-detect', silenceRouter)
app.use('/api/waveform', waveformRouter)

// --- Save folder config ---
const CONFIG_PATH = join(homedir(), '.clipforge-config.json')

function getSaveFolder(): string | null {
  try {
    const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    return config.saveFolder || null
  } catch { return null }
}

function setSaveFolder(folder: string) {
  let config: Record<string, unknown> = {}
  try { config = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) } catch { /* new config */ }
  config.saveFolder = folder
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
}

app.get('/api/save-folder', (_req, res) => {
  res.json({ folder: getSaveFolder() })
})

app.post('/api/save-folder', express.json(), (req, res) => {
  const { folder } = req.body as { folder?: string }
  if (!folder || typeof folder !== 'string') {
    res.status(400).json({ error: 'folder is required' })
    return
  }
  const resolved = resolve(folder.replace(/^~/, homedir()))
  mkdirSync(resolved, { recursive: true })
  setSaveFolder(resolved)
  res.json({ folder: resolved })
})

app.post('/api/save-to-folder', express.json(), (req, res) => {
  const { jobId, clipSuffix, fileName } = req.body as { jobId?: string; clipSuffix?: string; fileName?: string }
  if (!jobId || !isValidJobId(jobId)) {
    res.status(400).json({ error: 'Invalid job ID' })
    return
  }
  const folder = getSaveFolder()
  if (!folder) {
    res.status(400).json({ error: 'No save folder configured. Set one first.' })
    return
  }
  const sfx = clipSuffix ? `_${clipSuffix}` : ''
  const srcPath = join(TMP_DIR, jobId, `final${sfx}.mp4`)
  if (!existsSync(srcPath)) {
    res.status(404).json({ error: 'Exported file not found' })
    return
  }
  const safeName = (fileName || `clip${sfx}`).replace(/[/\\<>:"|?*]/g, '_').replace(/\.mp4$/i, '')
  const destPath = join(folder, `${safeName}.mp4`)
  try {
    copyFileSync(srcPath, destPath)
    res.json({ path: destPath })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Save failed'
    res.status(500).json({ error: message })
  }
})

// --- Cleanup ---
setInterval(cleanupOldJobs, 30 * 60 * 1000)
cleanupOldJobs() // run once on startup

// --- Start ---
const PORT = 3001
app.listen(PORT, '127.0.0.1', () => {
  console.log(`\nClipForge API server running on http://127.0.0.1:${PORT}`)
})

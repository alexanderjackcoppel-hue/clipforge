import { Router } from 'express'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { jobManager } from '../lib/jobManager.js'
import { spawnJob } from '../lib/spawnJob.js'
import { TMP_DIR } from '../index.js'

const router = Router()

router.post('/', async (req, res) => {
  const { text, voice } = req.body as { text?: string; voice?: string }

  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'text is required' })
    return
  }

  const trimmed = text.trim().slice(0, 5000)
  const safeVoice = /^[A-Za-z ]+$/.test(voice ?? '') ? voice! : 'Samantha'

  const jobId = jobManager.createJob()
  const dir = join(TMP_DIR, jobId)
  mkdirSync(dir, { recursive: true })

  const aiffPath = join(dir, 'tts.aiff')
  const wavPath  = join(dir, 'audio.wav')

  try {
    // Generate speech using macOS built-in TTS
    await spawnJob('say', ['-v', safeVoice, '-o', aiffPath, '--', trimmed])
    // Convert AIFF → WAV (44.1kHz stereo) so browsers play it natively
    await spawnJob('ffmpeg', ['-i', aiffPath, '-ar', '44100', '-ac', '2', '-y', wavPath])
    jobManager.sendProgress(jobId, { type: 'done', stage: 'tts', percent: 100, url: `/files/${jobId}/audio.wav` })
    res.json({ url: `/files/${jobId}/audio.wav` })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'TTS failed'
    jobManager.sendProgress(jobId, { type: 'error', message: msg })
    res.status(500).json({ error: msg })
  }
})

export default router

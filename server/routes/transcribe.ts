import { Router } from 'express'
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { jobManager, isValidJobId } from '../lib/jobManager.js'
import { spawnJob } from '../lib/spawnJob.js'
import { parseSRT } from '../lib/parseSRT.js'
import { TMP_DIR } from '../index.js'

const WHISPER_MODELS_DIR = '/opt/homebrew/share/whisper-cpp/models'
const MODEL_FILES: Record<string, string> = {
  tiny:   'ggml-tiny.bin',
  base:   'ggml-base.bin',
  small:  'ggml-small.bin',
  medium: 'ggml-medium.bin',
}

const router = Router()

router.post('/', async (req, res) => {
  const { jobId: importJobId, model = 'base', clipSuffix } = req.body

  if (!isValidJobId(importJobId)) {
    res.status(400).json({ error: 'Invalid job ID' })
    return
  }

  if (!(model in MODEL_FILES)) {
    res.status(400).json({ error: 'Invalid model. Use: tiny, base, small, medium' })
    return
  }

  const modelPath = join(WHISPER_MODELS_DIR, MODEL_FILES[model])
  if (!existsSync(modelPath)) {
    res.status(400).json({ error: `Model not found: ${modelPath}. Download it from https://huggingface.co/ggerganov/whisper.cpp` })
    return
  }

  if (clipSuffix !== undefined && !/^[0-9a-f]{8}$/.test(clipSuffix)) {
    res.status(400).json({ error: 'Invalid clipSuffix' })
    return
  }

  const sfx = clipSuffix ? `_${clipSuffix}` : ''
  const jobDir = join(TMP_DIR, importJobId)
  const inputVideo = join(jobDir, `trimmed${sfx}.mp4`)
  const audioPath = join(jobDir, `audio${sfx}.wav`)
  const srtPath = join(jobDir, `subtitles${sfx}.srt`)

  if (!existsSync(inputVideo)) {
    res.status(400).json({ error: 'Trimmed video not found. Trim a video first.' })
    return
  }

  const opJobId = jobManager.createJob()
  res.json({ jobId: opJobId })

  jobManager.enqueue(async () => {
    try {
      jobManager.sendProgress(opJobId, { type: 'progress', stage: 'extracting_audio', percent: 10 })

      // Extract audio as 16kHz mono WAV (required by whisper.cpp)
      await spawnJob('ffmpeg', [
        '-i', inputVideo,
        '-ar', '16000',
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        '-y',
        audioPath,
      ])

      jobManager.sendProgress(opJobId, { type: 'progress', stage: 'transcribing', percent: 30 })

      // Use whisper-cli (Homebrew installs as whisper-cli, not whisper-cpp)
      await spawnJob('whisper-cli', [
        '-m', modelPath,
        '--output-srt',
        '--output-file', join(jobDir, `subtitles${sfx}`),
        audioPath,
      ])

      // whisper-cli may output to audioPath.srt or the specified output path
      const whisperSrtPath = audioPath + '.srt'
      let srtContent = ''
      if (existsSync(whisperSrtPath)) {
        srtContent = readFileSync(whisperSrtPath, 'utf-8')
        writeFileSync(srtPath, srtContent)
      } else if (existsSync(srtPath)) {
        srtContent = readFileSync(srtPath, 'utf-8')
      } else {
        throw new Error('whisper-cli did not produce an SRT file. Check that the model file exists.')
      }

      // Parse SRT into structured lines
      const subtitles = parseSRT(srtContent)

      jobManager.sendProgress(opJobId, { type: 'done', stage: 'transcribed', percent: 100, subtitles })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transcription failed'
      const msg = classifyWhisperError(message)
      jobManager.sendProgress(opJobId, { type: 'error', message: msg })
    }
  })
})


function classifyWhisperError(msg: string): string {
  if (msg.includes('not found') || msg.includes('ENOENT')) return 'whisper-cli not installed. Run: brew install whisper-cpp'
  if (msg.includes('model') || msg.includes('ggml')) return 'Whisper model not found at expected path.'
  if (msg.includes('audio')) return 'No audio track found in this video.'
  return `Transcription failed: ${msg.slice(0, 200)}`
}

export default router

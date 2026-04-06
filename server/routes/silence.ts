import { Router } from 'express'
import { join } from 'path'
import { existsSync } from 'fs'
import { jobManager, isValidJobId } from '../lib/jobManager.js'
import { spawnJob } from '../lib/spawnJob.js'
import { TMP_DIR } from '../index.js'

const router = Router()

router.post('/', async (req, res) => {
  const { jobId, clipSuffix, noiseDb = '-40', minDuration = '0.5' } = req.body as Record<string, string>

  if (!isValidJobId(jobId)) {
    res.status(400).json({ error: 'Invalid job ID' })
    return
  }
  if (clipSuffix !== undefined && !/^[0-9a-f]{8}$/.test(clipSuffix)) {
    res.status(400).json({ error: 'Invalid clipSuffix' })
    return
  }

  const noiseDbl = Math.max(-60, Math.min(-20, parseFloat(noiseDb) || -40))
  const minDur   = Math.max(0.1, Math.min(5.0, parseFloat(minDuration) || 0.5))

  const sfx = clipSuffix ? `_${clipSuffix}` : ''
  const trimmedPath = join(TMP_DIR, jobId, `trimmed${sfx}.mp4`)

  if (!existsSync(trimmedPath)) {
    res.status(400).json({ error: 'Trimmed video not found. Trim a video first.' })
    return
  }

  try {
    // Run FFmpeg silencedetect and capture stderr output
    const output: string[] = []
    await spawnJob('ffmpeg', [
      '-i', trimmedPath,
      '-af', `silencedetect=noise=${noiseDbl}dB:d=${minDur}`,
      '-f', 'null', '-',
    ], {
      onStderr: (chunk) => { output.push(chunk) },
    })

    const fullOutput = output.join('')

    // Parse silence_start / silence_end pairs
    const silenceStarts: number[] = []
    const silenceEnds: number[] = []

    let match: RegExpExecArray | null
    const startRe = /silence_start:\s*([\d.]+)/g
    while ((match = startRe.exec(fullOutput)) !== null) {
      silenceStarts.push(parseFloat(match[1]))
    }
    const endRe = /silence_end:\s*([\d.]+)/g
    while ((match = endRe.exec(fullOutput)) !== null) {
      silenceEnds.push(parseFloat(match[1]))
    }

    // Build speaking segments (gaps between silence intervals)
    // Get total duration from output
    const durationMatch = fullOutput.match(/Duration:\s*(\d+):(\d+):([\d.]+)/)
    const totalDuration = durationMatch
      ? parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseFloat(durationMatch[3])
      : null

    const silenceIntervals: Array<{ start: number; end: number }> = []
    const len = Math.max(silenceStarts.length, silenceEnds.length)
    for (let i = 0; i < len; i++) {
      const start = silenceStarts[i] ?? 0
      const end   = silenceEnds[i]   ?? totalDuration ?? start + 1
      silenceIntervals.push({ start, end })
    }

    // Invert to get speaking segments
    const speakingSegments: Array<{ start: number; end: number }> = []
    let cursor = 0
    for (const sil of silenceIntervals.sort((a, b) => a.start - b.start)) {
      if (cursor < sil.start) {
        speakingSegments.push({ start: cursor, end: sil.start })
      }
      cursor = sil.end
    }
    if (totalDuration && cursor < totalDuration) {
      speakingSegments.push({ start: cursor, end: totalDuration })
    }

    res.json({
      silenceIntervals,
      speakingSegments,
      totalDuration,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Silence detection failed'
    res.status(500).json({ error: message })
  }
})

// Use jobManager to keep TS happy (imported for side effects)
void jobManager

export default router

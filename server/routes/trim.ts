import { Router } from 'express'
import { join } from 'path'
import { existsSync } from 'fs'
import { jobManager, isValidJobId } from '../lib/jobManager.js'
import { buildTrimArgs, parseTime } from '../lib/ffmpegBuilder.js'
import { spawnJob } from '../lib/spawnJob.js'
import { TMP_DIR } from '../index.js'

const router = Router()

router.post('/', async (req, res) => {
  const { jobId: importJobId, startTime, endTime, clipSuffix, cropX, cropY, cropW, cropH } = req.body

  if (!isValidJobId(importJobId)) {
    res.status(400).json({ error: 'Invalid job ID' })
    return
  }

  if (clipSuffix !== undefined && !/^[0-9a-f]{8}$/.test(clipSuffix)) {
    res.status(400).json({ error: 'Invalid clipSuffix' })
    return
  }

  let startSeconds: number
  let endSeconds: number
  try {
    startSeconds = parseTime(startTime)
    endSeconds = parseTime(endTime)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid time'
    res.status(400).json({ error: message })
    return
  }

  if (endSeconds <= startSeconds) {
    res.status(400).json({ error: 'End time must be after start time.' })
    return
  }

  const duration = endSeconds - startSeconds

  const sfx = clipSuffix ? `_${clipSuffix}` : ''
  const jobDir = join(TMP_DIR, importJobId)
  const inputPath = join(jobDir, 'source.mp4')
  const outputPath = join(jobDir, `trimmed${sfx}.mp4`)

  if (!existsSync(inputPath)) {
    res.status(400).json({ error: 'Source video not found. Download a video first.' })
    return
  }

  const opJobId = jobManager.createJob()
  res.json({ jobId: opJobId })

  jobManager.enqueue(async () => {
    try {
      jobManager.sendProgress(opJobId, { type: 'progress', stage: 'trimming', percent: 0 })

      const crop = (cropX !== undefined && cropY !== undefined && cropW !== undefined && cropH !== undefined)
        ? {
            x: parseFloat(cropX) || 0,
            y: parseFloat(cropY) || 0,
            w: parseFloat(cropW) || 100,
            h: parseFloat(cropH) || 100,
          }
        : undefined

      const args = buildTrimArgs({
        inputVideo: inputPath,
        outputVideo: outputPath,
        startSeconds,
        durationSeconds: duration,
        crop,
      })

      let totalDuration: number | null = null
      await spawnJob('ffmpeg', args, {
        onStderr: (chunk) => {
          // Parse total duration
          if (!totalDuration) {
            const durMatch = chunk.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/)
            if (durMatch) {
              totalDuration = parseInt(durMatch[1]) * 3600 + parseInt(durMatch[2]) * 60 + parseFloat(durMatch[3])
            }
          }
          // Parse current time for progress
          const timeMatch = chunk.match(/time=(\d+):(\d+):(\d+\.\d+)/)
          if (timeMatch && totalDuration) {
            const currentTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseFloat(timeMatch[3])
            const percent = Math.min(99, Math.round((currentTime / duration) * 100))
            jobManager.sendProgress(opJobId, { type: 'progress', stage: 'trimming', percent })
          }
        },
      })

      jobManager.sendProgress(opJobId, {
        type: 'done',
        stage: 'trimmed',
        percent: 100,
        url: `/files/${importJobId}/trimmed${sfx}.mp4`,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Trim failed'
      jobManager.sendProgress(opJobId, { type: 'error', message: `Trim failed: ${message}` })
    }
  })
})

export default router

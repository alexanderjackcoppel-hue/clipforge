import { Router } from 'express'
import { join } from 'path'
import { existsSync } from 'fs'
import { spawnJob } from '../lib/spawnJob.js'
import { isValidJobId } from '../lib/jobManager.js'
import { TMP_DIR } from '../index.js'

const router = Router()

router.get('/', async (req, res) => {
  const { jobId, clipSuffix } = req.query as Record<string, string>

  if (!isValidJobId(jobId)) {
    res.status(400).json({ error: 'Invalid job ID' })
    return
  }
  if (clipSuffix !== undefined && !/^[0-9a-f]{8}$/.test(clipSuffix)) {
    res.status(400).json({ error: 'Invalid clipSuffix' })
    return
  }

  const sfx = clipSuffix ? `_${clipSuffix}` : ''
  const jobDir = join(TMP_DIR, jobId)
  const trimmedPath = join(jobDir, `trimmed${sfx}.mp4`)
  const waveformPath = join(jobDir, `waveform${sfx}.png`)

  if (!existsSync(trimmedPath)) {
    res.status(400).json({ error: 'Trimmed video not found' })
    return
  }

  // Use cached waveform if it exists
  if (!existsSync(waveformPath)) {
    try {
      await spawnJob('ffmpeg', [
        '-i', trimmedPath,
        '-filter_complex', 'aformat=channel_layouts=mono,showwavespic=s=600x80:colors=7c3aed',
        '-frames:v', '1',
        '-y',
        waveformPath,
      ])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Waveform generation failed'
      res.status(500).json({ error: message })
      return
    }
  }

  res.sendFile(waveformPath)
})

export default router

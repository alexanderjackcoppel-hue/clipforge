import { Router } from 'express'
import { join } from 'path'
import { existsSync } from 'fs'
import { isValidJobId } from '../lib/jobManager.js'
import { spawnJob } from '../lib/spawnJob.js'
import { TMP_DIR } from '../index.js'

const router = Router()

async function extractThumbnail(jobId: string): Promise<string | null> {
  const inputPath = join(TMP_DIR, jobId, 'source.mp4')
  if (!existsSync(inputPath)) return null

  const outputPath = join(TMP_DIR, jobId, 'thumbnail.jpg')
  if (existsSync(outputPath)) return outputPath

  const args = ['-y', '-ss', '1', '-i', inputPath, '-vframes', '1', '-q:v', '2', outputPath]
  try {
    await spawnJob('ffmpeg', args)
    if (existsSync(outputPath)) return outputPath
  } catch {
    // seek to 1s failed, try from start
  }

  const args0 = ['-y', '-i', inputPath, '-vframes', '1', '-q:v', '2', outputPath]
  try {
    await spawnJob('ffmpeg', args0)
    if (existsSync(outputPath)) return outputPath
  } catch {
    return null
  }
  return null
}

// GET /api/thumbnail?jobId=xxx  — used by <img src="..."> directly
router.get('/', async (req, res) => {
  const jobId = req.query.jobId as string
  if (!jobId || !isValidJobId(jobId)) {
    res.status(400).json({ error: 'Invalid job ID' })
    return
  }
  const outputPath = await extractThumbnail(jobId)
  if (!outputPath) {
    res.status(404).json({ error: 'Failed to extract thumbnail' })
    return
  }
  res.setHeader('Content-Type', 'image/jpeg')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  res.sendFile(outputPath)
})

// POST /api/thumbnail — kept for backwards compatibility
router.post('/', async (req, res) => {
  const { jobId } = req.body
  if (!isValidJobId(jobId)) {
    res.status(400).json({ error: 'Invalid job ID' })
    return
  }
  const outputPath = await extractThumbnail(jobId)
  if (!outputPath) {
    res.status(404).json({ error: 'Failed to extract thumbnail' })
    return
  }
  res.setHeader('Content-Type', 'image/jpeg')
  res.sendFile(outputPath)
})

export default router

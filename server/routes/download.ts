import { Router } from 'express'
import { join } from 'path'
import { mkdirSync } from 'fs'
import { jobManager } from '../lib/jobManager.js'
import { validateUrl } from '../lib/validateUrl.js'
import { spawnJob } from '../lib/spawnJob.js'
import { TMP_DIR } from '../index.js'

const router = Router()

router.post('/', async (req, res) => {
  const { url } = req.body
  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'url is required' })
    return
  }

  let validatedUrl: string
  try {
    validatedUrl = validateUrl(url)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid URL'
    res.status(400).json({ error: message })
    return
  }

  const jobId = jobManager.createJob()
  const jobDir = join(TMP_DIR, jobId)
  mkdirSync(jobDir, { recursive: true })
  const outputPath = join(jobDir, 'source.mp4')

  res.json({ jobId })

  // Run download in background queue
  jobManager.enqueue(async () => {
    try {
      jobManager.sendProgress(jobId, { type: 'progress', stage: 'downloading', percent: 0 })

      await spawnJob('yt-dlp', [
        validatedUrl,
        '-f', 'bestvideo[ext=mp4][vcodec^=avc]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '--no-playlist',
        '--js-runtimes', `bun:${process.execPath}`,
        '--output', outputPath,
      ], {
        onStdout: (chunk) => {
          // Parse yt-dlp progress: "[download]  45.2% of 123.45MiB"
          const match = chunk.match(/\[download\]\s+([\d.]+)%/)
          if (match) {
            const percent = Math.round(parseFloat(match[1]))
            jobManager.sendProgress(jobId, { type: 'progress', stage: 'downloading', percent })
          }
        },
      })

      jobManager.sendProgress(jobId, {
        type: 'done',
        stage: 'downloaded',
        percent: 100,
        url: `/files/${jobId}/source.mp4`,
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed'
      const msg = classifyYtdlpError(message)
      jobManager.sendProgress(jobId, { type: 'error', message: msg })
    }
  })
})

function classifyYtdlpError(stderr: string): string {
  if (stderr.includes('DRM') || stderr.includes('drm')) return 'This video is DRM-protected and cannot be downloaded.'
  if (stderr.includes('Private video') || stderr.includes('private')) return 'This video is private or unavailable.'
  if (stderr.includes('geo') || stderr.includes('not available in your country')) return 'This video is geo-blocked in your region.'
  if (stderr.includes('timed out')) return 'Download timed out after 10 minutes.'
  if (stderr.includes('not found')) return 'yt-dlp not installed. Run: brew install yt-dlp'
  return `Download failed: ${stderr.slice(0, 200)}`
}

export default router

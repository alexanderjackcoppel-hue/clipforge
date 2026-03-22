import { Router } from 'express'
import { isValidJobId } from '../lib/jobManager.js'
import { analyseVideo } from '../lib/videoAnalysis.js'

const router = Router()

// POST /api/analyse
// Body: { jobId: string, duration: number, prompt?: string }
router.post('/', async (req, res) => {
  const { jobId, duration, prompt } = req.body as {
    jobId?: string
    duration?: number
    prompt?: string
  }

  if (!jobId || !isValidJobId(jobId)) {
    res.status(400).json({ error: 'valid jobId is required' })
    return
  }
  if (!duration || duration <= 0) {
    res.status(400).json({ error: 'duration must be a positive number' })
    return
  }

  try {
    const analysis = await analyseVideo(jobId, duration, prompt ?? undefined)
    res.json(analysis)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

export default router

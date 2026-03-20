import { Router } from 'express'
import { join } from 'path'
import { existsSync, writeFileSync } from 'fs'
import multer from 'multer'
import { jobManager, isValidJobId } from '../lib/jobManager.js'
import { buildExportArgs, buildASSSubtitles, type SubtitleLine, type SubtitleStyle } from '../lib/ffmpegBuilder.js'
import { spawnJob } from '../lib/spawnJob.js'
import { TMP_DIR } from '../index.js'

const router = Router()

function createUpload(jobId: string) {
  const storage = multer.diskStorage({
    destination: join(TMP_DIR, jobId),
    filename: (_req, file, cb) => {
      const ext = file.mimetype.includes('audio')
        ? (file.originalname.endsWith('.wav') ? '.wav' : '.mp3')
        : '.png'
      cb(null, `upload_${Date.now()}${ext}`)
    },
  })
  return multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter: (_req, file, cb) => {
      const allowed = new Set([
        'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav',
        'audio/mp4', 'audio/x-m4a', 'audio/aac',
        'image/png', 'image/jpeg', 'image/jpg', 'image/webp',
      ])
      if (allowed.has(file.mimetype)) {
        cb(null, true)
      } else {
        cb(new Error(`File type not allowed: ${file.mimetype}`))
      }
    },
  })
}

router.post('/', (req, res) => {
  // Parse jobId and clipSuffix from query before multer
  const preJobId = req.query.jobId as string
  if (!isValidJobId(preJobId)) {
    res.status(400).json({ error: 'Invalid job ID' })
    return
  }

  const preClipSuffix = req.query.clipSuffix as string | undefined
  if (preClipSuffix !== undefined && !/^[0-9a-f]{8}$/.test(preClipSuffix)) {
    res.status(400).json({ error: 'Invalid clipSuffix' })
    return
  }

  const upload = createUpload(preJobId)
  upload.fields([
    { name: 'voiceover', maxCount: 1 },
    { name: 'overlay', maxCount: 1 },
    { name: 'bgMusic', maxCount: 1 },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ])(req, res as any, async (err: unknown) => {
    if (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Upload error' })
      return
    }

    const {
      subtitles,
      subtitleStyle,
      customTextSubtitles,
      customTextSubtitleStyle,
      voiceoverEnabled,
      overlayEnabled,
      bgMusicEnabled,
      overlayPosition = 'bottom-right',
      overlayScale = '20',
      originalVolume = '0.8',
      voiceoverVolume = '1.0',
      bgMusicVolume = '0.7',
      bgMusicFadeIn,
      bgMusicFadeOut,
      videoFormat = 'standard',
      socialBgColor = 'FFFFFF',
      socialVideoScale = '70',
      videoOffsetX = '0',
      videoOffsetY = '0',
      cinematicBgColor = '000000',
      videoBarHeight = '34',
      fadeIn,
      fadeOut,
      clipDuration,
      zoomEnabled,
      zoomX,
      zoomY,
    } = req.body as Record<string, string>

    // preJobId and preClipSuffix are validated before multer
    const importJobId = preJobId
    const sfx = preClipSuffix ? `_${preClipSuffix}` : ''
    const jobDir = join(TMP_DIR, importJobId)
    const trimmedPath = join(jobDir, `trimmed${sfx}.mp4`)
    const finalPath = join(jobDir, `final${sfx}.mp4`)

    if (!existsSync(trimmedPath)) {
      res.status(400).json({ error: 'Trimmed video not found. Trim a video first.' })
      return
    }

    const files = (req.files as { [fieldname: string]: Express.Multer.File[] }) || {}
    const voiceoverFile = voiceoverEnabled === 'true' ? files['voiceover']?.[0]?.path : undefined
    const overlayFile = overlayEnabled === 'true' ? files['overlay']?.[0]?.path : undefined
    const bgMusicFile = bgMusicEnabled === 'true' ? files['bgMusic']?.[0]?.path : undefined

    // Helper to build a style object with safe defaults
    function parseStyle(raw: string | undefined, defaults: Partial<SubtitleStyle> = {}): SubtitleStyle {
      const p = raw ? JSON.parse(raw) : {}
      return {
        fontSize: p.fontSize ?? defaults.fontSize ?? 48,
        color: p.color ?? defaults.color ?? 'FFFFFF',
        position: p.position ?? defaults.position ?? { x: 50, y: 85 },
        fontFamily: p.fontFamily ?? defaults.fontFamily ?? 'Arial',
        bold: p.bold ?? defaults.bold ?? true,
        outlineWidth: p.outlineWidth ?? defaults.outlineWidth ?? 3,
      }
    }

    // Build ASS file for auto-generated subtitles
    let assPath: string | undefined
    if (subtitles) {
      try {
        const parsedSubs: SubtitleLine[] = JSON.parse(subtitles)
        const style = parseStyle(subtitleStyle)
        if (!/^[0-9A-Fa-f]{6}$/.test(style.color)) {
          res.status(400).json({ error: 'Invalid subtitle color. Use a 6-digit hex value (e.g. FFFFFF).' })
          return
        }
        assPath = join(jobDir, `subtitles${sfx}.ass`)
        writeFileSync(assPath, buildASSSubtitles(parsedSubs, style))
      } catch (e) {
        if ((e as NodeJS.ErrnoException)?.code === undefined && res.headersSent) return
        console.error('Failed to build ASS subtitles:', e)
      }
    }

    // Build ASS file for custom text layer
    let customAssPath: string | undefined
    if (customTextSubtitles) {
      try {
        const parsedSubs: SubtitleLine[] = JSON.parse(customTextSubtitles)
        const style = parseStyle(customTextSubtitleStyle, { color: 'FFFF00', position: { x: 50, y: 15 } })
        if (!/^[0-9A-Fa-f]{6}$/.test(style.color)) {
          res.status(400).json({ error: 'Invalid custom text color.' })
          return
        }
        customAssPath = join(jobDir, `customtext${sfx}.ass`)
        writeFileSync(customAssPath, buildASSSubtitles(parsedSubs, style))
      } catch (e) {
        if ((e as NodeJS.ErrnoException)?.code === undefined && res.headersSent) return
        console.error('Failed to build custom text ASS:', e)
      }
    }

    const opJobId = jobManager.createJob()
    res.json({ jobId: opJobId })

    jobManager.enqueue(async () => {
      try {
        jobManager.sendProgress(opJobId, { type: 'progress', stage: 'exporting', percent: 0 })

        const overlayPos = overlayPosition as
          | 'top-left'
          | 'top-right'
          | 'bottom-left'
          | 'bottom-right'
          | 'center'

        const args = buildExportArgs({
          inputVideo: trimmedPath,
          outputVideo: finalPath,
          subtitlesFile: assPath,
          customTextFile: customAssPath,
          voiceoverFile,
          originalVolume: parseFloat(originalVolume) || 0.8,
          voiceoverVolume: parseFloat(voiceoverVolume) || 1.0,
          bgMusicFile,
          bgMusicVolume: parseFloat(bgMusicVolume) || 0.7,
          bgMusicFadeIn: bgMusicFadeIn === 'true',
          bgMusicFadeOut: bgMusicFadeOut === 'true',
          overlayImage: overlayFile,
          overlayPosition: overlayPos,
          overlayScale: parseInt(overlayScale) || 20,
          videoFormat: (['social-post', 'cinematic', 'blur-bg'].includes(videoFormat) ? videoFormat : 'standard') as 'standard' | 'social-post' | 'cinematic' | 'blur-bg',
          socialBgColor,
          socialVideoScale: parseInt(socialVideoScale) || 70,
          videoOffsetX: parseFloat(videoOffsetX) || 0,
          videoOffsetY: parseFloat(videoOffsetY) || 0,
          cinematicBgColor,
          videoBarHeight: parseInt(videoBarHeight) || 34,
          fadeIn: fadeIn === 'true',
          fadeOut: fadeOut === 'true',
          clipDuration: clipDuration ? parseFloat(clipDuration) : undefined,
          zoomEnabled: zoomEnabled === 'true',
          zoomX: zoomX ? parseFloat(zoomX) : 50,
          zoomY: zoomY ? parseFloat(zoomY) : 50,
        })

        let totalDuration: number | null = null
        await spawnJob('ffmpeg', args, {
          onStderr: (chunk) => {
            if (!totalDuration) {
              const m = chunk.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/)
              if (m) {
                totalDuration = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3])
              }
            }
            const t = chunk.match(/time=(\d+):(\d+):(\d+\.\d+)/)
            if (t && totalDuration) {
              const cur = parseInt(t[1]) * 3600 + parseInt(t[2]) * 60 + parseFloat(t[3])
              const pct = Math.min(99, Math.round((cur / totalDuration) * 100))
              jobManager.sendProgress(opJobId, { type: 'progress', stage: 'exporting', percent: pct })
            }
          },
        })

        jobManager.sendProgress(opJobId, {
          type: 'done',
          stage: 'exported',
          percent: 100,
          url: `/files/${importJobId}/final${sfx}.mp4`,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Export failed'
        jobManager.sendProgress(opJobId, { type: 'error', message: `Export failed: ${message}` })
      }
    })
  })
})

export default router

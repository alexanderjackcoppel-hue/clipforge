import { Router } from 'express'
import { join } from 'path'
import { existsSync, writeFileSync, utimesSync } from 'fs'
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
    { name: 'watermark', maxCount: 1 },
    { name: 'watermark2', maxCount: 1 },
    { name: 'bgMusic', maxCount: 1 },
    { name: 'emojiOverlay', maxCount: 1 },
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
      custom2TextSubtitles,
      custom2TextSubtitleStyle,
      voiceoverEnabled,
      overlayEnabled,
      bgMusicEnabled,
      overlayX = '50',
      overlayY = '50',
      overlayScale = '20',
      overlayRotation = '0',
      originalVolume = '0.8',
      voiceoverVolume = '1.0',
      bgMusicVolume = '0.7',
      bgMusicFadeIn,
      bgMusicFadeOut,
      videoFormat = 'standard',
      standardBgColor = '000000',
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
      speed,
      flipH,
      flipV,
      colorPreset,
      reversed,
      audioDuckEnabled,
      audioDuckVolume,
      lowerThirdEnabled,
      lowerThirdName = '',
      lowerThirdSubtitle = '',
      lowerThirdTemplate = 'dark-chip',
      lowerThirdDuration = '5',
      presetWidth = '1080',
      presetHeight = '1920',
      watermarkEnabled,
      watermarkPosition = 'bottom-right',
      watermarkScale = '10',
      watermarkOpacity = '0.8',
      watermarkStroke = '0',
      watermarkStrokeColor = 'FFFFFF',
      watermarkMode = 'text',
      watermarkText = '',
      watermarkTextColor = 'CCCCCC',
      watermarkTextWeight = '300',
      watermarkCustomX = '50',
      watermarkCustomY = '50',
      watermark2Enabled,
      watermark2Position = 'bottom-right',
      watermark2Scale = '10',
      watermark2Opacity = '0.8',
      watermark2Stroke = '0',
      watermark2StrokeColor = 'FFFFFF',
    } = req.body as Record<string, string>

    const rawPresetWidth = parseInt(presetWidth)
    const rawPresetHeight = parseInt(presetHeight)
    if (isNaN(rawPresetWidth) || rawPresetWidth < 100 || rawPresetWidth > 7680) {
      res.status(400).json({ error: 'Invalid presetWidth' })
      return
    }
    if (isNaN(rawPresetHeight) || rawPresetHeight < 100 || rawPresetHeight > 7680) {
      res.status(400).json({ error: 'Invalid presetHeight' })
      return
    }
    // H.264/5 requires even dimensions
    const outputWidth = rawPresetWidth % 2 === 0 ? rawPresetWidth : rawPresetWidth - 1
    const outputHeight = rawPresetHeight % 2 === 0 ? rawPresetHeight : rawPresetHeight - 1

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

    const HEX6 = /^[0-9A-Fa-f]{6}$/
    if (!HEX6.test(standardBgColor)) {
      res.status(400).json({ error: 'Invalid standardBgColor.' })
      return
    }
    if (!HEX6.test(socialBgColor)) {
      res.status(400).json({ error: 'Invalid socialBgColor. Use a 6-digit hex value (e.g. FFFFFF).' })
      return
    }
    if (!HEX6.test(cinematicBgColor)) {
      res.status(400).json({ error: 'Invalid cinematicBgColor. Use a 6-digit hex value (e.g. 000000).' })
      return
    }

    const files = (req.files as { [fieldname: string]: Express.Multer.File[] }) || {}
    const voiceoverFile = voiceoverEnabled === 'true' ? files['voiceover']?.[0]?.path : undefined
    const overlayFile = overlayEnabled === 'true' ? files['overlay']?.[0]?.path : undefined
    const watermarkFile = watermarkEnabled === 'true' ? files['watermark']?.[0]?.path : undefined
    const watermark2File = watermark2Enabled === 'true' ? files['watermark2']?.[0]?.path : undefined
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
        textAlign: p.textAlign === 'left' ? 'left' : 'center',
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
        writeFileSync(assPath, buildASSSubtitles(parsedSubs, style, outputWidth, outputHeight))
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
        writeFileSync(customAssPath, buildASSSubtitles(parsedSubs, style, outputWidth, outputHeight))
      } catch (e) {
        if ((e as NodeJS.ErrnoException)?.code === undefined && res.headersSent) return
        console.error('Failed to build custom text ASS:', e)
      }
    }

    // Build ASS file for custom text 2 layer
    let customAss2Path: string | undefined
    if (custom2TextSubtitles) {
      try {
        const parsedSubs: SubtitleLine[] = JSON.parse(custom2TextSubtitles)
        const style = parseStyle(custom2TextSubtitleStyle, { color: 'FF0000', position: { x: 50, y: 30 } })
        if (!/^[0-9A-Fa-f]{6}$/.test(style.color)) {
          res.status(400).json({ error: 'Invalid custom text 2 color.' })
          return
        }
        customAss2Path = join(jobDir, `customtext2${sfx}.ass`)
        writeFileSync(customAss2Path, buildASSSubtitles(parsedSubs, style, outputWidth, outputHeight))
      } catch (e) {
        if ((e as NodeJS.ErrnoException)?.code === undefined && res.headersSent) return
        console.error('Failed to build custom text 2 ASS:', e)
      }
    }

    const emojiOverlayFile = (files['emojiOverlay']?.[0]?.path) as string | undefined

    const opJobId = jobManager.createJob()
    res.json({ jobId: opJobId })

    // Touch the importJobId directory so the cleanup sweeper's 2-hour mtime
    // clock resets. The export job (opJobId) may wait in the render queue for
    // a while; without this, the sweeper could delete the source files before
    // the export runs.
    try { const now = new Date(); utimesSync(jobDir, now, now) } catch { /* ignore */ }

    console.log(`[export] format=${videoFormat} scale=${socialVideoScale} bg=${socialBgColor} offset=${videoOffsetX},${videoOffsetY}`)

    jobManager.enqueueRender(async () => {
      try {
        jobManager.sendProgress(opJobId, { type: 'progress', stage: 'exporting', percent: 0 })

        const args = buildExportArgs({
          inputVideo: trimmedPath,
          outputVideo: finalPath,
          subtitlesFile: assPath,
          customTextFile: customAssPath,
          customText2File: customAss2Path,
          emojiOverlayFile,
          voiceoverFile,
          originalVolume: parseFloat(originalVolume) || 0.8,
          voiceoverVolume: parseFloat(voiceoverVolume) || 1.0,
          bgMusicFile,
          bgMusicVolume: parseFloat(bgMusicVolume) || 0.7,
          bgMusicFadeIn: bgMusicFadeIn === 'true',
          bgMusicFadeOut: bgMusicFadeOut === 'true',
          overlayImage: overlayFile,
          overlayX: Math.max(0, Math.min(100, parseFloat(overlayX) || 50)),
          overlayY: Math.max(0, Math.min(100, parseFloat(overlayY) || 50)),
          overlayScale: Math.max(1, Math.min(100, parseInt(overlayScale) || 20)),
          overlayRotation: ((parseFloat(overlayRotation) || 0) % 360 + 360) % 360,
          videoFormat: (['social-post', 'cinematic', 'blur-bg'].includes(videoFormat) ? videoFormat : 'standard') as 'standard' | 'social-post' | 'cinematic' | 'blur-bg',
          standardBgColor,
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
          speed: speed ? Math.max(0.25, Math.min(4.0, parseFloat(speed))) : 1.0,
          flipH: flipH === 'true',
          flipV: flipV === 'true',
          colorPreset: colorPreset || undefined,
          reversed: reversed === 'true',
          audioDuckEnabled: audioDuckEnabled === 'true',
          audioDuckVolume: audioDuckVolume ? Math.max(0.05, Math.min(0.9, parseFloat(audioDuckVolume))) : 0.3,
          lowerThirdEnabled: lowerThirdEnabled === 'true',
          lowerThirdName: lowerThirdName || undefined,
          lowerThirdSubtitle: lowerThirdSubtitle || undefined,
          lowerThirdTemplate: (['clean-line', 'dark-chip', 'broadcast'].includes(lowerThirdTemplate)
            ? lowerThirdTemplate : 'dark-chip') as 'clean-line' | 'dark-chip' | 'broadcast',
          lowerThirdDuration: lowerThirdDuration ? Math.max(1, Math.min(30, parseFloat(lowerThirdDuration))) : 5,
          outputWidth,
          outputHeight,
          watermarkImage: watermarkFile,
          watermarkPosition: (['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'custom'].includes(watermarkPosition)
            ? watermarkPosition : 'bottom-right') as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom',
          watermarkScale: Math.max(1, Math.min(50, parseInt(watermarkScale) || 10)),
          watermarkOpacity: Math.max(0, Math.min(1, parseFloat(watermarkOpacity) || 0.8)),
          watermarkStroke: Math.max(0, Math.min(10, parseInt(watermarkStroke) || 0)),
          watermarkStrokeColor: /^[0-9A-Fa-f]{6}$/.test(watermarkStrokeColor) ? watermarkStrokeColor : 'FFFFFF',
          watermarkText: watermarkMode === 'text' ? watermarkText : undefined,
          watermarkTextColor: /^[0-9A-Fa-f]{6}$/.test(watermarkTextColor) ? watermarkTextColor : 'CCCCCC',
          watermarkTextWeight: parseInt(watermarkTextWeight) || 300,
          watermarkCustomX: Math.max(0, Math.min(100, parseFloat(watermarkCustomX) || 50)),
          watermarkCustomY: Math.max(0, Math.min(100, parseFloat(watermarkCustomY) || 50)),
          watermark2Image: watermark2File,
          watermark2Position: (['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'].includes(watermark2Position)
            ? watermark2Position : 'bottom-right') as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center',
          watermark2Scale: Math.max(1, Math.min(50, parseInt(watermark2Scale) || 10)),
          watermark2Opacity: Math.max(0, Math.min(1, parseFloat(watermark2Opacity) || 0.8)),
          watermark2Stroke: Math.max(0, Math.min(10, parseInt(watermark2Stroke) || 0)),
          watermark2StrokeColor: /^[0-9A-Fa-f]{6}$/.test(watermark2StrokeColor) ? watermark2StrokeColor : 'FFFFFF',
        })

        console.log(`[export] ffmpeg args count: ${args.length}`)
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
          url: `/files/${importJobId}/final${sfx}.mp4?t=${Date.now()}`,
        })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Export failed'
        console.error(`[export] FAILED: ${message}`)
        jobManager.sendProgress(opJobId, { type: 'error', message: `Export failed: ${message}` })
      }
    })
  })
})

export default router

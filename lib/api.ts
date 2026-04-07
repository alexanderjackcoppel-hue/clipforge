const API = '' // empty = same origin (via Next.js rewrites)

export interface VideoAnalysis {
  summary: string
  mood: string
  funnyText: string | null
  caption: string | null
  hashtags: string[]
  highlights: Array<{ time: number; description: string }>
  suggestedTitle: string | null
  suggestedDescription: string | null
  transcript: string | null
  frameCount: number
}

export async function generateVoiceover(
  text: string,
  voice?: string
): Promise<{ url: string }> {
  const res = await fetch(`${API}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' })) as { error?: string }
    throw new Error(err.error || 'TTS failed')
  }
  return res.json() as Promise<{ url: string }>
}

export async function analyseVideo(
  jobId: string,
  duration: number,
  prompt?: string
): Promise<VideoAnalysis> {
  const res = await fetch(`${API}/api/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, duration, ...(prompt && { prompt }) }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' })) as { error?: string }
    throw new Error(err.error || 'Analysis failed')
  }
  return res.json() as Promise<VideoAnalysis>
}

export async function downloadVideo(url: string): Promise<{ jobId: string }> {
  const res = await fetch(`${API}/api/download`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' })) as { error?: string }
    throw new Error(err.error || 'Download failed')
  }
  return res.json() as Promise<{ jobId: string }>
}

export async function trimVideo(
  jobId: string,
  startTime: string,
  endTime: string,
  clipSuffix?: string,
  crop?: { x: number; y: number; w: number; h: number },
): Promise<{ jobId: string }> {
  const cropPayload = crop && !(crop.x === 0 && crop.y === 0 && crop.w === 100 && crop.h === 100)
    ? { cropX: crop.x, cropY: crop.y, cropW: crop.w, cropH: crop.h }
    : {}
  const res = await fetch(`${API}/api/trim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, startTime, endTime, ...(clipSuffix && { clipSuffix }), ...cropPayload }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' })) as { error?: string }
    throw new Error(err.error || 'Trim failed')
  }
  return res.json() as Promise<{ jobId: string }>
}

export async function detectSilence(
  jobId: string,
  clipSuffix?: string,
  noiseDb = -40,
  minDuration = 0.5,
): Promise<{
  silenceIntervals: Array<{ start: number; end: number }>
  speakingSegments: Array<{ start: number; end: number }>
  totalDuration: number | null
}> {
  const res = await fetch(`${API}/api/silence-detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, ...(clipSuffix && { clipSuffix }), noiseDb: String(noiseDb), minDuration: String(minDuration) }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' })) as { error?: string }
    throw new Error(err.error || 'Silence detection failed')
  }
  return res.json()
}

export function getWaveformUrl(jobId: string, clipSuffix?: string): string {
  const params = new URLSearchParams({ jobId })
  if (clipSuffix) params.set('clipSuffix', clipSuffix)
  return `${API}/api/waveform?${params}`
}

export async function transcribeVideo(jobId: string, clipSuffix?: string): Promise<{ jobId: string }> {
  const res = await fetch(`${API}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, ...(clipSuffix && { clipSuffix }) }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' })) as { error?: string }
    throw new Error(err.error || 'Transcription failed')
  }
  return res.json() as Promise<{ jobId: string }>
}

export interface SubtitleStylePayload {
  fontSize: number
  color: string
  position: { x: number; y: number }
  fontFamily: string
  bold: boolean
  outlineWidth: number
  textAlign?: 'center' | 'left'
}

export interface ExportParams {
  jobId: string
  clipSuffix?: string
  subtitles?: Array<{ id: number; start: number; end: number; text: string }>
  subtitleStyle?: SubtitleStylePayload
  customTextSubtitles?: Array<{ id: number; start: number; end: number; text: string }>
  customTextSubtitleStyle?: SubtitleStylePayload
  voiceoverEnabled: boolean
  voiceoverFile?: File
  originalVolume: number
  voiceoverVolume: number
  bgMusicEnabled?: boolean
  bgMusicFile?: File
  bgMusicVolume?: number
  bgMusicFadeIn?: boolean
  bgMusicFadeOut?: boolean
  overlayEnabled: boolean
  overlayFile?: File
  overlayX: number
  overlayY: number
  overlayScale: number
  overlayRotation: number
  videoFormat?: 'standard' | 'social-post' | 'cinematic' | 'blur-bg'
  socialBgColor?: string
  socialVideoScale?: number
  videoOffsetX?: number
  videoOffsetY?: number
  cinematicBgColor?: string
  videoBarHeight?: number
  // Per-clip effects
  fadeIn?: boolean
  fadeOut?: boolean
  clipDuration?: number
  zoomEnabled?: boolean
  zoomX?: number
  zoomY?: number
  speed?: number
  flipH?: boolean
  flipV?: boolean
  colorPreset?: string
  custom2TextSubtitles?: Array<{ id: number; start: number; end: number; text: string }>
  custom2TextSubtitleStyle?: SubtitleStylePayload
  emojiStickers?: Array<{ id: string; emoji: string; x: number; y: number; size: number }>
  standardBgColor?: string
  presetWidth?: number
  presetHeight?: number
  reversed?: boolean
  audioDuckEnabled?: boolean
  audioDuckVolume?: number
  lowerThirdEnabled?: boolean
  lowerThirdName?: string
  lowerThirdSubtitle?: string
  lowerThirdTemplate?: 'clean-line' | 'dark-chip' | 'broadcast'
  lowerThirdDuration?: number
  // Watermark
  watermarkEnabled?: boolean
  watermarkFile?: File
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom'
  watermarkScale?: number
  watermarkOpacity?: number
  watermarkStroke?: number
  watermarkStrokeColor?: string
  watermarkMode?: 'image' | 'text'
  watermarkText?: string
  watermarkTextColor?: string
  watermarkTextWeight?: number
  watermarkCustomX?: number
  watermarkCustomY?: number
  // Watermark 2
  watermark2Enabled?: boolean
  watermark2File?: File
  watermark2Position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom'
  watermark2Scale?: number
  watermark2Opacity?: number
  watermark2Stroke?: number
  watermark2StrokeColor?: string
}

async function renderEmojiCanvas(
  stickers: Array<{ emoji: string; x: number; y: number; size: number }>,
  width = 1080,
  height = 1920,
): Promise<Blob | null> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) { resolve(null); return }
    ctx.clearRect(0, 0, width, height)
    for (const s of stickers) {
      const fontSize = Math.max(8, Math.round(s.size * width / 100))
      ctx.font = `${fontSize}px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif`
      ctx.textBaseline = 'middle'
      ctx.textAlign = 'center'
      ctx.fillText(s.emoji, s.x * width / 100, s.y * height / 100)
    }
    canvas.toBlob(blob => resolve(blob), 'image/png')
  })
}

export async function exportVideo(params: ExportParams): Promise<{ jobId: string }> {
  const form = new FormData()
  form.append('jobId', params.jobId)
  if (params.subtitles) form.append('subtitles', JSON.stringify(params.subtitles))
  if (params.subtitleStyle) form.append('subtitleStyle', JSON.stringify(params.subtitleStyle))
  if (params.customTextSubtitles) form.append('customTextSubtitles', JSON.stringify(params.customTextSubtitles))
  if (params.customTextSubtitleStyle) form.append('customTextSubtitleStyle', JSON.stringify(params.customTextSubtitleStyle))
  if (params.custom2TextSubtitles) form.append('custom2TextSubtitles', JSON.stringify(params.custom2TextSubtitles))
  if (params.custom2TextSubtitleStyle) form.append('custom2TextSubtitleStyle', JSON.stringify(params.custom2TextSubtitleStyle))
  form.append('voiceoverEnabled', String(params.voiceoverEnabled))
  if (params.voiceoverEnabled && params.voiceoverFile) form.append('voiceover', params.voiceoverFile)
  form.append('bgMusicEnabled', String(!!params.bgMusicEnabled))
  if (params.bgMusicEnabled && params.bgMusicFile) form.append('bgMusic', params.bgMusicFile)
  if (params.bgMusicVolume !== undefined) form.append('bgMusicVolume', String(params.bgMusicVolume))
  if (params.bgMusicFadeIn) form.append('bgMusicFadeIn', 'true')
  if (params.bgMusicFadeOut) form.append('bgMusicFadeOut', 'true')
  form.append('overlayEnabled', String(params.overlayEnabled))
  if (params.overlayEnabled && params.overlayFile) form.append('overlay', params.overlayFile)
  form.append('overlayX', String(params.overlayX))
  form.append('overlayY', String(params.overlayY))
  form.append('overlayRotation', String(params.overlayRotation))
  form.append('originalVolume', String(params.originalVolume))
  form.append('voiceoverVolume', String(params.voiceoverVolume))
  form.append('overlayScale', String(params.overlayScale))
  if (params.videoFormat) form.append('videoFormat', params.videoFormat)
  if (params.standardBgColor) form.append('standardBgColor', params.standardBgColor)
  if (params.socialBgColor) form.append('socialBgColor', params.socialBgColor)
  if (params.socialVideoScale !== undefined) form.append('socialVideoScale', String(params.socialVideoScale))
  if (params.videoOffsetX !== undefined) form.append('videoOffsetX', String(params.videoOffsetX))
  if (params.videoOffsetY !== undefined) form.append('videoOffsetY', String(params.videoOffsetY))
  if (params.cinematicBgColor) form.append('cinematicBgColor', params.cinematicBgColor)
  if (params.videoBarHeight !== undefined) form.append('videoBarHeight', String(params.videoBarHeight))
  if (params.fadeIn) form.append('fadeIn', 'true')
  if (params.fadeOut) form.append('fadeOut', 'true')
  if (params.clipDuration !== undefined) form.append('clipDuration', String(params.clipDuration))
  if (params.zoomEnabled) form.append('zoomEnabled', 'true')
  if (params.zoomX !== undefined) form.append('zoomX', String(params.zoomX))
  if (params.zoomY !== undefined) form.append('zoomY', String(params.zoomY))
  if (params.speed !== undefined && params.speed !== 1.0) form.append('speed', String(params.speed))
  if (params.flipH) form.append('flipH', 'true')
  if (params.flipV) form.append('flipV', 'true')
  if (params.colorPreset) form.append('colorPreset', params.colorPreset)

  if (params.presetWidth) form.append('presetWidth', String(params.presetWidth))
  if (params.presetHeight) form.append('presetHeight', String(params.presetHeight))
  if (params.reversed) form.append('reversed', 'true')
  if (params.audioDuckEnabled) form.append('audioDuckEnabled', 'true')
  if (params.audioDuckVolume !== undefined) form.append('audioDuckVolume', String(params.audioDuckVolume))
  if (params.lowerThirdEnabled) form.append('lowerThirdEnabled', 'true')
  if (params.lowerThirdName) form.append('lowerThirdName', params.lowerThirdName)
  if (params.lowerThirdSubtitle) form.append('lowerThirdSubtitle', params.lowerThirdSubtitle)
  if (params.lowerThirdTemplate) form.append('lowerThirdTemplate', params.lowerThirdTemplate)
  if (params.lowerThirdDuration !== undefined) form.append('lowerThirdDuration', String(params.lowerThirdDuration))

  // Watermark
  form.append('watermarkEnabled', String(!!params.watermarkEnabled))
  if (params.watermarkEnabled && params.watermarkFile) form.append('watermark', params.watermarkFile)
  if (params.watermarkPosition) form.append('watermarkPosition', params.watermarkPosition)
  if (params.watermarkScale !== undefined) form.append('watermarkScale', String(params.watermarkScale))
  if (params.watermarkOpacity !== undefined) form.append('watermarkOpacity', String(params.watermarkOpacity))
  if (params.watermarkStroke !== undefined) form.append('watermarkStroke', String(params.watermarkStroke))
  if (params.watermarkStrokeColor) form.append('watermarkStrokeColor', params.watermarkStrokeColor)
  if (params.watermarkMode) form.append('watermarkMode', params.watermarkMode)
  if (params.watermarkText) form.append('watermarkText', params.watermarkText)
  if (params.watermarkTextColor) form.append('watermarkTextColor', params.watermarkTextColor)
  if (params.watermarkTextWeight !== undefined) form.append('watermarkTextWeight', String(params.watermarkTextWeight))
  if (params.watermarkCustomX !== undefined) form.append('watermarkCustomX', String(params.watermarkCustomX))
  if (params.watermarkCustomY !== undefined) form.append('watermarkCustomY', String(params.watermarkCustomY))

  // Watermark 2
  form.append('watermark2Enabled', String(!!params.watermark2Enabled))
  if (params.watermark2Enabled && params.watermark2File) form.append('watermark2', params.watermark2File)
  if (params.watermark2Position) form.append('watermark2Position', params.watermark2Position)
  if (params.watermark2Scale !== undefined) form.append('watermark2Scale', String(params.watermark2Scale))
  if (params.watermark2Opacity !== undefined) form.append('watermark2Opacity', String(params.watermark2Opacity))
  if (params.watermark2Stroke !== undefined) form.append('watermark2Stroke', String(params.watermark2Stroke))
  if (params.watermark2StrokeColor) form.append('watermark2StrokeColor', params.watermark2StrokeColor)

  if (params.emojiStickers && params.emojiStickers.length > 0) {
    const blob = await renderEmojiCanvas(params.emojiStickers, params.presetWidth ?? 1080, params.presetHeight ?? 1920)
    if (blob) form.append('emojiOverlay', blob, 'emoji-overlay.png')
  }

  const queryParams = new URLSearchParams({ jobId: params.jobId })
  if (params.clipSuffix) queryParams.set('clipSuffix', params.clipSuffix)
  const res = await fetch(`${API}/api/export?${queryParams}`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' })) as { error?: string }
    throw new Error(err.error || 'Export failed')
  }
  return res.json() as Promise<{ jobId: string }>
}

// ── Drafts API ──

export interface DraftMeta {
  id: string
  name: string
  savedAt: string | null
  sourceVideoUrl: string | null
  sourceVideoDuration: number | null
  clipCount: number
}

export async function listDrafts(): Promise<DraftMeta[]> {
  const res = await fetch(`${API}/api/drafts`)
  if (!res.ok) return []
  const data = await res.json()
  return data.drafts ?? []
}

export async function saveDraft(draft: {
  id?: string
  name: string
  sourceVideoUrl: string | null
  sourceVideoDuration: number | null
  state: Record<string, unknown>
}): Promise<{ id: string; savedAt: string }> {
  const res = await fetch(`${API}/api/drafts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  })
  if (!res.ok) throw new Error('Failed to save draft')
  return res.json()
}

export async function loadDraft(id: string): Promise<{
  id: string
  name: string
  savedAt: string
  sourceVideoUrl: string | null
  sourceVideoDuration: number | null
  state: Record<string, unknown>
}> {
  const res = await fetch(`${API}/api/drafts/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error('Draft not found')
  return res.json()
}

export async function deleteDraft(id: string): Promise<void> {
  await fetch(`${API}/api/drafts/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

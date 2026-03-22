const API = '' // empty = same origin (via Next.js rewrites)

export interface VideoAnalysis {
  summary: string
  mood: string
  highlights: Array<{ time: number; description: string }>
  suggestedTitle: string | null
  suggestedDescription: string | null
  transcript: string | null
  frameCount: number
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
  overlayPosition: string
  overlayScale: number
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
}

export async function exportVideo(params: ExportParams): Promise<{ jobId: string }> {
  const form = new FormData()
  form.append('jobId', params.jobId)
  if (params.subtitles) form.append('subtitles', JSON.stringify(params.subtitles))
  if (params.subtitleStyle) form.append('subtitleStyle', JSON.stringify(params.subtitleStyle))
  if (params.customTextSubtitles) form.append('customTextSubtitles', JSON.stringify(params.customTextSubtitles))
  if (params.customTextSubtitleStyle) form.append('customTextSubtitleStyle', JSON.stringify(params.customTextSubtitleStyle))
  form.append('voiceoverEnabled', String(params.voiceoverEnabled))
  if (params.voiceoverEnabled && params.voiceoverFile) form.append('voiceover', params.voiceoverFile)
  form.append('bgMusicEnabled', String(!!params.bgMusicEnabled))
  if (params.bgMusicEnabled && params.bgMusicFile) form.append('bgMusic', params.bgMusicFile)
  if (params.bgMusicVolume !== undefined) form.append('bgMusicVolume', String(params.bgMusicVolume))
  if (params.bgMusicFadeIn) form.append('bgMusicFadeIn', 'true')
  if (params.bgMusicFadeOut) form.append('bgMusicFadeOut', 'true')
  form.append('overlayEnabled', String(params.overlayEnabled))
  if (params.overlayEnabled && params.overlayFile) form.append('overlay', params.overlayFile)
  form.append('originalVolume', String(params.originalVolume))
  form.append('voiceoverVolume', String(params.voiceoverVolume))
  form.append('overlayPosition', params.overlayPosition)
  form.append('overlayScale', String(params.overlayScale))
  if (params.videoFormat) form.append('videoFormat', params.videoFormat)
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

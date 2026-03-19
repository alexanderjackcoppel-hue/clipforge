const API = '' // empty = same origin (via Next.js rewrites)

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

export async function trimVideo(jobId: string, startTime: string, endTime: string, clipSuffix?: string): Promise<{ jobId: string }> {
  const res = await fetch(`${API}/api/trim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId, startTime, endTime, ...(clipSuffix && { clipSuffix }) }),
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

export interface ExportParams {
  jobId: string
  clipSuffix?: string
  subtitles?: Array<{ id: number; start: number; end: number; text: string }>
  subtitleStyle?: { fontSize: number; color: string; position: string }
  voiceoverEnabled: boolean
  voiceoverFile?: File
  originalVolume: number
  voiceoverVolume: number
  overlayEnabled: boolean
  overlayFile?: File
  overlayPosition: string
  overlayScale: number
}

export async function exportVideo(params: ExportParams): Promise<{ jobId: string }> {
  const form = new FormData()
  form.append('jobId', params.jobId)
  if (params.subtitles) form.append('subtitles', JSON.stringify(params.subtitles))
  if (params.subtitleStyle) form.append('subtitleStyle', JSON.stringify(params.subtitleStyle))
  form.append('voiceoverEnabled', String(params.voiceoverEnabled))
  if (params.voiceoverEnabled && params.voiceoverFile) form.append('voiceover', params.voiceoverFile)
  form.append('overlayEnabled', String(params.overlayEnabled))
  if (params.overlayEnabled && params.overlayFile) form.append('overlay', params.overlayFile)
  form.append('originalVolume', String(params.originalVolume))
  form.append('voiceoverVolume', String(params.voiceoverVolume))
  form.append('overlayPosition', params.overlayPosition)
  form.append('overlayScale', String(params.overlayScale))

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

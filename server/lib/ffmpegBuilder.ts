export interface ExportOptions {
  inputVideo: string      // trimmed.mp4 path
  outputVideo: string     // final.mp4 path
  subtitlesFile?: string  // .ass file path (already styled)
  voiceoverFile?: string  // audio file path
  originalVolume: number  // 0-1 (from slider: 1 = 100% original)
  voiceoverVolume: number // 0-1 (from slider: 1 = 100% voiceover)
  overlayImage?: string   // image file path
  overlayPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  overlayScale: number    // 1-100 (percent of frame width)
}

export function buildExportArgs(opts: ExportOptions): string[] {
  const inputs: string[] = ['-i', opts.inputVideo]
  let overlayIdx: number | null = null
  let voiceoverIdx: number | null = null

  if (opts.overlayImage) {
    overlayIdx = 1
    inputs.push('-i', opts.overlayImage)
  }
  if (opts.voiceoverFile) {
    voiceoverIdx = overlayIdx !== null ? 2 : 1
    inputs.push('-i', opts.voiceoverFile)
  }

  const filterParts: string[] = []
  let lastVideoLabel = '[sv]'

  // Base scale/crop to 1080x1920
  filterParts.push(
    `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[sv]`
  )

  // Overlay image
  if (overlayIdx !== null) {
    const pos = getOverlayPosition(opts.overlayPosition)
    const scale = Math.max(1, Math.min(100, opts.overlayScale))
    const overlayWidth = Math.round(1080 * scale / 100)
    filterParts.push(`[${overlayIdx}:v]scale=${overlayWidth}:-1[ol]`)
    filterParts.push(`${lastVideoLabel}[ol]overlay=${pos}[ov]`)
    lastVideoLabel = '[ov]'
  }

  // Subtitles
  if (opts.subtitlesFile) {
    const escapedPath = opts.subtitlesFile
      .replace(/\\/g, '\\\\')
      .replace(/:/g, '\\:')
      .replace(/'/g, "\\'")
    filterParts.push(`${lastVideoLabel}ass='${escapedPath}'[vout]`)
    lastVideoLabel = '[vout]'
  } else {
    // Pass through to [vout] with a no-op null filter
    filterParts.push(`${lastVideoLabel}null[vout]`)
    lastVideoLabel = '[vout]'
  }

  // Audio filters
  const audioFilters: string[] = []
  if (voiceoverIdx !== null) {
    const origVol = Math.max(0, Math.min(1, opts.originalVolume)).toFixed(2)
    const voiceVol = Math.max(0, Math.min(1, opts.voiceoverVolume)).toFixed(2)
    audioFilters.push(`[0:a]volume=${origVol}[a0]`)
    audioFilters.push(`[${voiceoverIdx}:a]volume=${voiceVol}[a1]`)
    audioFilters.push(`[a0][a1]amix=inputs=2:duration=first:dropout_transition=0[aout]`)
  }

  const allFilters = [...filterParts, ...audioFilters]
  const filterComplex = allFilters.join(';')

  const args: string[] = [
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', '[vout]',
  ]

  if (voiceoverIdx !== null) {
    args.push('-map', '[aout]')
  } else {
    args.push('-map', '0:a?')
  }

  args.push(
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-y',
    opts.outputVideo,
  )

  return args
}

function getOverlayPosition(pos: ExportOptions['overlayPosition']): string {
  switch (pos) {
    case 'top-left':     return '20:20'
    case 'top-right':    return 'W-w-20:20'
    case 'bottom-left':  return '20:H-h-20'
    case 'bottom-right': return 'W-w-20:H-h-20'
    case 'center':       return '(W-w)/2:(H-h)/2'
  }
}

export function buildTrimArgs(opts: {
  inputVideo: string
  outputVideo: string
  startSeconds: number
  durationSeconds: number
}): string[] {
  return [
    '-i', opts.inputVideo,
    '-ss', String(opts.startSeconds),
    '-t', String(opts.durationSeconds),
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-y',
    opts.outputVideo,
  ]
}

export function parseTime(mmss: string): number {
  const parts = mmss.trim().split(':')
  if (parts.length !== 2) throw new Error(`Invalid time format: "${mmss}". Use mm:ss`)
  const [m, s] = parts.map(Number)
  if (isNaN(m) || isNaN(s) || s < 0 || s >= 60 || m < 0) {
    throw new Error(`Invalid time: "${mmss}". Use mm:ss (e.g. 1:30)`)
  }
  return m * 60 + s
}

export interface SubtitleLine {
  start: number  // seconds
  end: number    // seconds
  text: string
}

export interface SubtitleStyle {
  fontSize: number      // 16-72
  color: string         // hex like 'FFFFFF' (no #, ASS format)
  position: 'top' | 'middle' | 'bottom'
}

export function buildASSSubtitles(lines: SubtitleLine[], style: SubtitleStyle): string {
  const alignment = style.position === 'top' ? 8 : style.position === 'middle' ? 5 : 2
  const marginV = style.position === 'top' ? 50 : style.position === 'bottom' ? 50 : 0

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,${style.fontSize},&H00${style.color},&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,3,1,${alignment},40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`

  const events = lines.map(line => {
    const start = formatASSTime(line.start)
    const end = formatASSTime(line.end)
    const text = line.text.replace(/\n/g, '\\N')
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`
  }).join('\n')

  return header + '\n' + events + '\n'
}

export function formatASSTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s.toFixed(2)).padStart(5, '0')}`
}

export interface ExportOptions {
  inputVideo: string      // trimmed.mp4 path
  outputVideo: string     // final.mp4 path
  subtitlesFile?: string  // .ass file path — auto-generated layer
  customTextFile?: string // .ass file path — custom text layer
  emojiOverlayFile?: string
  customText2File?: string
  voiceoverFile?: string  // audio file path
  originalVolume: number  // 0-1
  voiceoverVolume: number // 0-1
  bgMusicFile?: string    // background music audio path (loops if shorter than clip)
  bgMusicVolume?: number  // 0-1
  bgMusicFadeIn?: boolean
  bgMusicFadeOut?: boolean
  overlayImage?: string   // image file path
  overlayX: number        // 0-100 (center X as % of frame width)
  overlayY: number        // 0-100 (center Y as % of frame height)
  overlayScale: number    // 1-100 (percent of frame width)
  overlayRotation: number // 0-359 degrees
  // Watermark: persistent logo/trademark applied to every export
  watermarkImage?: string // image file path
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom'
  watermarkScale?: number // 1-50 (percent of frame width, default 10)
  watermarkOpacity?: number // 0-1 (default 0.8)
  watermarkStroke?: number // 0-10 px outline thickness
  watermarkStrokeColor?: string // 6-char hex for outline color
  watermarkText?: string // text mode: render text instead of image
  watermarkTextColor?: string // 6-char hex
  watermarkTextWeight?: number // font weight 100-900
  watermarkCustomX?: number // 0-100 for custom position
  watermarkCustomY?: number // 0-100 for custom position
  // Watermark 2: second persistent logo/trademark
  watermark2Image?: string // image file path
  watermark2Position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
  watermark2Scale?: number // 1-50 (percent of frame width, default 10)
  watermark2Opacity?: number // 0-1 (default 0.8)
  watermark2Stroke?: number
  watermark2StrokeColor?: string
  videoFormat?: 'standard' | 'social-post' | 'cinematic' | 'blur-bg'
  standardBgColor?: string // 6-char hex for standard (Regular) format pad color
  socialBgColor?: string  // 6-char hex like 'FFFFFF'
  socialVideoScale?: number // 40-95 (% of frame height the video occupies)
  videoOffsetX?: number   // -45 to 45 (% of frame width)
  videoOffsetY?: number   // -45 to 45 (% of frame height)
  cinematicBgColor?: string // 6-char hex for cinematic bar color
  videoBarHeight?: number   // 5-45 (% of frame height for each bar in cinematic/blur-bg)
  // Per-clip effects
  fadeIn?: boolean        // 1-second video+audio fade in at start
  fadeOut?: boolean       // 1-second video+audio fade out at end
  clipDuration?: number   // seconds — required for fade out timing
  zoomEnabled?: boolean   // slow zoom-in toward zoomX,zoomY over clip duration
  zoomX?: number          // 0-100 percent of frame width (zoom target)
  zoomY?: number          // 0-100 percent of frame height (zoom target)
  speed?: number          // playback speed multiplier: 0.25, 0.5, 1.0, 1.5, 2.0
  flipH?: boolean         // horizontal mirror
  flipV?: boolean         // vertical flip
  colorPreset?: string    // 'warm'|'cool'|'vivid'|'cinematic'|'bw'|'faded'|'night'|''
  reversed?: boolean      // play clip backwards (reverse + areverse)
  // Auto-duck: lower bg music volume when speech is detected
  audioDuckEnabled?: boolean
  audioDuckVolume?: number  // 0-1, target music volume during speech (default 0.3)
  // Lower thirds
  lowerThirdEnabled?: boolean
  lowerThirdName?: string
  lowerThirdSubtitle?: string
  lowerThirdTemplate?: 'clean-line' | 'dark-chip' | 'broadcast'
  lowerThirdDuration?: number  // seconds to show (default 5)
  // Output resolution (defaults to 1080x1920 for backwards compatibility)
  outputWidth?: number    // pixels — must be even
  outputHeight?: number   // pixels — must be even
}

export function buildExportArgs(opts: ExportOptions): string[] {
  const inputs: string[] = ['-i', opts.inputVideo]
  let overlayIdx: number | null = null
  let voiceoverIdx: number | null = null
  let bgMusicIdx: number | null = null
  let nextInputIdx = 1  // track actual ffmpeg input index (0 = main video)

  if (opts.overlayImage) {
    overlayIdx = nextInputIdx++
    inputs.push('-i', opts.overlayImage)
  }
  let watermarkIdx: number | null = null
  if (opts.watermarkImage) {
    watermarkIdx = nextInputIdx++
    inputs.push('-i', opts.watermarkImage)
  }
  let watermark2Idx: number | null = null
  if (opts.watermark2Image) {
    watermark2Idx = nextInputIdx++
    inputs.push('-i', opts.watermark2Image)
  }
  let emojiOverlayIdx: number | null = null
  if (opts.emojiOverlayFile) {
    emojiOverlayIdx = nextInputIdx++
    inputs.push('-i', opts.emojiOverlayFile)
  }
  if (opts.voiceoverFile) {
    voiceoverIdx = nextInputIdx++
    inputs.push('-i', opts.voiceoverFile)
  }
  if (opts.bgMusicFile) {
    bgMusicIdx = nextInputIdx++
    // -stream_loop -1 must come before -i for looping to apply
    inputs.push('-stream_loop', '-1', '-i', opts.bgMusicFile)
  }

  const filterParts: string[] = []
  let lastVideoLabel = '[sv]'

  // Output dimensions — default to 1080x1920 for backwards compatibility
  const outW = opts.outputWidth ?? 1080
  const outH = opts.outputHeight ?? 1920

  // ── Pre-processing: speed change and/or flip (applied before format/scale step) ──
  const speed = opts.speed ?? 1.0
  const needsPreProcess = (speed !== 1.0) || opts.flipH || opts.flipV
  let videoSrcLabel = '[0:v]'
  let audioSrcLabel = '[0:a]'

  // Reverse clip (reverse + areverse) — must come before other filters
  if (opts.reversed) {
    filterParts.push(`[0:v]reverse[vrev]`)
    filterParts.push(`[0:a]areverse[arev]`)
    videoSrcLabel = '[vrev]'
    audioSrcLabel = '[arev]'
  }

  if (needsPreProcess) {
    const preParts: string[] = []
    if (speed !== 1.0) preParts.push(`setpts=PTS/${speed.toFixed(4)}`)
    if (opts.flipH) preParts.push('hflip')
    if (opts.flipV) preParts.push('vflip')
    filterParts.push(`${videoSrcLabel}${preParts.join(',')}[vpre]`)
    videoSrcLabel = '[vpre]'

    // Audio speed via atempo (valid range 0.5–2.0 per filter; chain for extreme values)
    if (speed !== 1.0) {
      const atempoChain = buildAtempoChain(speed)
      filterParts.push(`${audioSrcLabel}${atempoChain}[aspre]`)
      audioSrcLabel = '[aspre]'
    }
  }

  // ── Color preset (eq filter on source video) ──
  const colorEq = buildColorEqFilter(opts.colorPreset)
  if (colorEq) {
    filterParts.push(`${videoSrcLabel}${colorEq}[vcol]`)
    videoSrcLabel = '[vcol]'
  }

  // Base scale/crop to outW×outH, with optional format transform
  const fmt   = opts.videoFormat ?? 'standard'
  const scale = Math.max(20, Math.min(150, opts.socialVideoScale ?? 70)) / 100
  const bgHex = (opts.socialBgColor ?? 'FFFFFF').replace('#', '')
  const offXpx = Math.round(((opts.videoOffsetX ?? 0) / 100) * outW)
  const offYpx = Math.round(((opts.videoOffsetY ?? 0) / 100) * outH)
  const overlayExpr = `(W-w)/2+${offXpx}:(H-h)/2+${offYpx}`

  if (fmt === 'social-post') {
    // CSS sizes the video container by width (width: var(--vid-scale)), with
    // height: auto on the <video> to maintain aspect ratio.  Match that here
    // by scaling to the target width and letting FFmpeg auto-calculate height.
    const targetW = Math.round(outW * scale)
    // -2 keeps height divisible by 2 (required by most codecs)
    filterParts.push(
      `${videoSrcLabel}scale=${targetW}:-2[vsmall];` +
      `color=c=0x${bgHex}:size=${outW}x${outH}:r=30000/1001,format=yuv420p[bg];` +
      `[bg][vsmall]overlay=${overlayExpr}[sv]`
    )
  } else if (fmt === 'cinematic') {
    // Fit video within frame (no crop), pad with bar color, then draw solid bars on top/bottom
    const rawBarH = Math.max(5, Math.min(45, opts.videoBarHeight ?? 34))
    const barPx   = Math.round((rawBarH / 100) * outH)
    const cinBgHex = (opts.cinematicBgColor ?? '000000').replace('#', '')
    const cinBg = `0x${cinBgHex}`
    filterParts.push(
      `${videoSrcLabel}scale=${outW}:${outH}:force_original_aspect_ratio=decrease:force_divisible_by=2,` +
      `pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:color=${cinBg},format=yuv420p,` +
      `drawbox=x=0:y=0:w=${outW}:h=${barPx}:color=${cinBgHex}@1.0:t=fill,` +
      `drawbox=x=0:y=${outH - barPx}:w=${outW}:h=${barPx}:color=${cinBgHex}@1.0:t=fill[sv]`
    )
  } else if (fmt === 'blur-bg') {
    // Background: blurred + zoomed to fill frame (crop ok — it's blurred anyway)
    // Foreground: crisp video fitted without crop into center region
    const rawBarH = Math.max(5, Math.min(45, opts.videoBarHeight ?? 34))
    const barPx   = Math.round((rawBarH / 100) * outH)
    const vidH    = outH - 2 * barPx
    const vidHEven = vidH % 2 === 0 ? vidH : vidH - 1
    const barPxFinal = (outH - vidHEven) / 2
    filterParts.push(
      `${videoSrcLabel}split=2[raw1][raw2];` +
      `[raw1]scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH},scale=trunc(iw/4)*2:trunc(ih/4)*2,boxblur=5:2,scale=${outW}:${outH},format=yuv420p[bg];` +
      `[raw2]scale=w=${outW}:h=${vidHEven}:force_original_aspect_ratio=decrease:force_divisible_by=2,` +
      `pad=${outW}:${vidHEven}:(ow-iw)/2:(oh-ih)/2,format=yuv420p[fg];` +
      `[bg][fg]overlay=(W-w)/2:${barPxFinal}[sv]`
    )
  } else {
    // standard (Regular): fit within outW×outH with configurable padding color, no distortion
    const stdBg = `0x${(opts.standardBgColor ?? '000000').replace('#', '')}`
    filterParts.push(
      `${videoSrcLabel}scale=${outW}:${outH}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:color=${stdBg},format=yuv420p[sv]`
    )
  }

  // Zoom effect (slow zoom toward target point over clip duration)
  if (opts.zoomEnabled) {
    const zx = Math.max(0.05, Math.min(0.95, (opts.zoomX ?? 50) / 100))
    const zy = Math.max(0.05, Math.min(0.95, (opts.zoomY ?? 50) / 100))
    const dur = Math.max(1, opts.clipDuration ?? 10)
    const fps = 30
    const frames = Math.round(dur * fps)
    const zoomRate = (0.5 / dur).toFixed(6)
    // x/y expressions keep the zoom target centered, clamped to valid range
    filterParts.push(
      `${lastVideoLabel}zoompan=` +
      `z='min(1.5,1+on/${fps}*${zoomRate})':` +
      `x='max(0,min(iw-iw/zoom,iw*${zx.toFixed(4)}-iw/zoom/2))':` +
      `y='max(0,min(ih-ih/zoom,ih*${zy.toFixed(4)}-ih/zoom/2))':` +
      `d=${frames}:fps=${fps}:s=${outW}x${outH}[svz]`
    )
    lastVideoLabel = '[svz]'
  }

  // Overlay image
  if (overlayIdx !== null) {
    const scale = Math.max(1, Math.min(100, opts.overlayScale))
    const overlayWidth = Math.round(outW * scale / 100)
    const angle = ((opts.overlayRotation ?? 0) % 360 + 360) % 360
    // center-based position: x = W*(x%/100) - w/2, y = H*(y%/100) - h/2
    const px = (opts.overlayX ?? 50).toFixed(4)
    const py = (opts.overlayY ?? 50).toFixed(4)
    const posExpr = `x=W*${px}/100-w/2:y=H*${py}/100-h/2`
    if (angle !== 0) {
      // rotate expands bounding box, transparent fill for PNG alpha
      const rad = (angle * Math.PI / 180).toFixed(6)
      filterParts.push(`[${overlayIdx}:v]scale=${overlayWidth}:-1,rotate=${rad}:ow=rotw(${rad}):oh=roth(${rad}):c=none[ol]`)
    } else {
      filterParts.push(`[${overlayIdx}:v]scale=${overlayWidth}:-1[ol]`)
    }
    filterParts.push(`${lastVideoLabel}[ol]overlay=${posExpr}[ov]`)
    lastVideoLabel = '[ov]'
  }

  // Watermark — text mode (drawtext, no image input needed)
  if (!opts.watermarkImage && opts.watermarkText) {
    const wmText = escapeDrawtext(opts.watermarkText)
    const wmOpacity = Math.max(0, Math.min(1, opts.watermarkOpacity ?? 0.8))
    const wmScale = Math.max(3, Math.min(50, opts.watermarkScale ?? 10))
    const fontSize = Math.round(outW * wmScale / 100 * 0.6)
    const color = opts.watermarkTextColor ?? 'CCCCCC'
    const pad = Math.round(outW * 0.03)
    const wmStroke = Math.max(0, Math.min(10, opts.watermarkStroke ?? 0))
    const strokeColor = opts.watermarkStrokeColor ?? 'FFFFFF'
    const pos = opts.watermarkPosition ?? 'bottom-right'
    let posExpr: string
    switch (pos) {
      case 'top-left':     posExpr = `x=${pad}:y=${pad}`; break
      case 'top-right':    posExpr = `x=w-tw-${pad}:y=${pad}`; break
      case 'bottom-left':  posExpr = `x=${pad}:y=h-th-${pad}`; break
      case 'bottom-right': posExpr = `x=w-tw-${pad}:y=h-th-${pad}`; break
      case 'center':       posExpr = `x=(w-tw)/2:y=(h-th)/2`; break
      case 'custom': {
        const cx = opts.watermarkCustomX ?? 50
        const cy = opts.watermarkCustomY ?? 50
        posExpr = `x=w*${(cx / 100).toFixed(4)}-tw/2:y=h*${(cy / 100).toFixed(4)}-th/2`
        break
      }
    }
    filterParts.push(
      `${lastVideoLabel}drawtext=text='${wmText}':font='Trebuchet MS':fontsize=${fontSize}:fontcolor=0x${color}@${wmOpacity.toFixed(2)}` +
      `:${posExpr}` +
      (wmStroke > 0 ? `:borderw=${wmStroke}:bordercolor=0x${strokeColor}` : '') +
      `[ov_wm]`
    )
    lastVideoLabel = '[ov_wm]'
  }

  // Watermark — image mode (persistent logo/trademark)
  if (watermarkIdx !== null) {
    const wmScale = Math.max(1, Math.min(50, opts.watermarkScale ?? 10))
    const wmWidth = Math.round(outW * wmScale / 100)
    const wmOpacity = Math.max(0, Math.min(1, opts.watermarkOpacity ?? 0.8))
    const pad = 3 // percent padding from edges
    const pos = opts.watermarkPosition ?? 'bottom-right'
    let posExpr: string
    switch (pos) {
      case 'top-left':     posExpr = `x=W*${pad}/100:y=H*${pad}/100`; break
      case 'top-right':    posExpr = `x=W*${100 - pad}/100-w:y=H*${pad}/100`; break
      case 'bottom-left':  posExpr = `x=W*${pad}/100:y=H*${100 - pad}/100-h`; break
      case 'bottom-right': posExpr = `x=W*${100 - pad}/100-w:y=H*${100 - pad}/100-h`; break
      case 'center':       posExpr = `x=W/2-w/2:y=H/2-h/2`; break
      case 'custom': {
        const cx = opts.watermarkCustomX ?? 50
        const cy = opts.watermarkCustomY ?? 50
        posExpr = `x=W*${(cx / 100).toFixed(4)}-w/2:y=H*${(cy / 100).toFixed(4)}-h/2`
        break
      }
    }
    const opacityFilter = wmOpacity < 1 ? `,format=rgba,colorchannelmixer=aa=${wmOpacity.toFixed(2)}` : ''
    const wmStroke = Math.max(0, Math.min(10, opts.watermarkStroke ?? 0))
    if (wmStroke > 0) {
      const sc = (opts.watermarkStrokeColor ?? 'FFFFFF').replace('#', '')
      const r = parseInt(sc.slice(0, 2), 16) / 255
      const g = parseInt(sc.slice(2, 4), 16) / 255
      const b = parseInt(sc.slice(4, 6), 16) / 255
      // Scale → split → colorize+blur one copy for glow → overlay original on top
      filterParts.push(`[${watermarkIdx}:v]scale=${wmWidth}:-1,format=rgba,split[wm_orig][wm_glow]`)
      filterParts.push(`[wm_glow]colorchannelmixer=rr=0:rg=0:rb=0:ra=1:gr=0:gg=0:gb=0:ga=1:br=0:bg=0:bb=0:ba=1:ar=0:ag=0:ab=0:aa=1,` +
        `geq=r=${Math.round(r * 255)}:g=${Math.round(g * 255)}:b=${Math.round(b * 255)}:a='alpha(X,Y)',` +
        `gblur=sigma=${wmStroke}${opacityFilter}[wm_shadow]`)
      filterParts.push(`[wm_shadow][wm_orig]overlay=0:0${opacityFilter}[wm]`)
    } else {
      filterParts.push(`[${watermarkIdx}:v]scale=${wmWidth}:-1${opacityFilter}[wm]`)
    }
    filterParts.push(`${lastVideoLabel}[wm]overlay=${posExpr}[ov_wm]`)
    lastVideoLabel = '[ov_wm]'
  }

  // Watermark 2 (second persistent logo/trademark)
  if (watermark2Idx !== null) {
    const wm2Scale = Math.max(1, Math.min(50, opts.watermark2Scale ?? 10))
    const wm2Width = Math.round(outW * wm2Scale / 100)
    const wm2Opacity = Math.max(0, Math.min(1, opts.watermark2Opacity ?? 0.8))
    const pad = 3 // percent padding from edges
    const pos2 = opts.watermark2Position ?? 'bottom-right'
    let posExpr2: string
    switch (pos2) {
      case 'top-left':     posExpr2 = `x=W*${pad}/100:y=H*${pad}/100`; break
      case 'top-right':    posExpr2 = `x=W*${100 - pad}/100-w:y=H*${pad}/100`; break
      case 'bottom-left':  posExpr2 = `x=W*${pad}/100:y=H*${100 - pad}/100-h`; break
      case 'bottom-right': posExpr2 = `x=W*${100 - pad}/100-w:y=H*${100 - pad}/100-h`; break
      case 'center':       posExpr2 = `x=W/2-w/2:y=H/2-h/2`; break
    }
    const opacityFilter2 = wm2Opacity < 1 ? `,format=rgba,colorchannelmixer=aa=${wm2Opacity.toFixed(2)}` : ''
    const wm2Stroke = Math.max(0, Math.min(10, opts.watermark2Stroke ?? 0))
    if (wm2Stroke > 0) {
      const sc2 = (opts.watermark2StrokeColor ?? 'FFFFFF').replace('#', '')
      const r2 = parseInt(sc2.slice(0, 2), 16) / 255
      const g2 = parseInt(sc2.slice(2, 4), 16) / 255
      const b2 = parseInt(sc2.slice(4, 6), 16) / 255
      filterParts.push(`[${watermark2Idx}:v]scale=${wm2Width}:-1,format=rgba,split[wm2_orig][wm2_glow]`)
      filterParts.push(`[wm2_glow]colorchannelmixer=rr=0:rg=0:rb=0:ra=1:gr=0:gg=0:gb=0:ga=1:br=0:bg=0:bb=0:ba=1:ar=0:ag=0:ab=0:aa=1,` +
        `geq=r=${Math.round(r2 * 255)}:g=${Math.round(g2 * 255)}:b=${Math.round(b2 * 255)}:a='alpha(X,Y)',` +
        `gblur=sigma=${wm2Stroke}${opacityFilter2}[wm2_shadow]`)
      filterParts.push(`[wm2_shadow][wm2_orig]overlay=0:0${opacityFilter2}[wm2]`)
    } else {
      filterParts.push(`[${watermark2Idx}:v]scale=${wm2Width}:-1${opacityFilter2}[wm2]`)
    }
    filterParts.push(`${lastVideoLabel}[wm2]overlay=${posExpr2}[ov_wm2]`)
    lastVideoLabel = '[ov_wm2]'
  }

  // Emoji overlay (full-frame transparent PNG)
  if (emojiOverlayIdx !== null) {
    filterParts.push(`${lastVideoLabel}[${emojiOverlayIdx}:v]overlay=0:0:format=auto[ov_emoji]`)
    lastVideoLabel = '[ov_emoji]'
  }

  // Lower thirds (drawtext before subtitle layers)
  if (opts.lowerThirdEnabled && opts.lowerThirdName) {
    const ltDur  = Math.max(1, opts.lowerThirdDuration ?? 5)
    const enable = `enable='between(t,0,${ltDur})'`
    const safeName = escapeDrawtext(opts.lowerThirdName)
    const safeSub  = escapeDrawtext(opts.lowerThirdSubtitle ?? '')
    const tmpl = opts.lowerThirdTemplate ?? 'dark-chip'
    const nameY = tmpl === 'broadcast' ? Math.round(outH * 0.82) : Math.round(outH * 0.85)
    const subY  = nameY + Math.round(outH * 0.045)
    if (tmpl === 'dark-chip') {
      filterParts.push(
        `${lastVideoLabel}drawtext=text='${safeName}':fontsize=${Math.round(outW * 0.042)}:fontcolor=white:` +
        `box=1:boxcolor=black@0.65:boxborderw=12:x=(w-text_w)/2:y=${nameY}:${enable}[lt0]`
      )
    } else if (tmpl === 'clean-line') {
      filterParts.push(
        `${lastVideoLabel}drawtext=text='${safeName}':fontsize=${Math.round(outW * 0.042)}:fontcolor=white:` +
        `x=(w-text_w)/2:y=${nameY}:${enable}[lt0]`
      )
    } else {
      // broadcast: name + subtitle, left-aligned at 8% from left
      const lx = Math.round(outW * 0.08)
      filterParts.push(
        `${lastVideoLabel}drawtext=text='${safeName}':fontsize=${Math.round(outW * 0.042)}:fontcolor=white:` +
        `box=1:boxcolor=black@0.65:boxborderw=10:x=${lx}:y=${nameY}:${enable},` +
        `drawtext=text='${safeSub}':fontsize=${Math.round(outW * 0.032)}:fontcolor=white@0.8:` +
        `x=${lx}:y=${subY}:${enable}[lt0]`
      )
    }
    if (tmpl !== 'broadcast' && safeSub) {
      const lx = Math.round(outW * 0.5)
      filterParts.push(
        `[lt0]drawtext=text='${safeSub}':fontsize=${Math.round(outW * 0.032)}:fontcolor=white@0.8:` +
        `x=${lx}-text_w/2:y=${subY}:${enable}[lt1]`
      )
      lastVideoLabel = '[lt1]'
    } else {
      lastVideoLabel = '[lt0]'
    }
  }

  // Subtitle layers — burned sequentially
  const escASSPath = (p: string) => p.replace(/\\/g, '\\\\').replace(/:/g, '\\:')

  const hasSubtitleLayers = opts.subtitlesFile || opts.customTextFile || opts.customText2File
  if (!hasSubtitleLayers) {
    filterParts.push(`${lastVideoLabel}null[vout]`)
    lastVideoLabel = '[vout]'
  } else {
    if (opts.subtitlesFile) {
      const more = opts.customTextFile || opts.customText2File
      const nextLabel = more ? '[v_s0]' : '[vout]'
      filterParts.push(`${lastVideoLabel}ass=${escASSPath(opts.subtitlesFile)}${nextLabel}`)
      lastVideoLabel = nextLabel
    }
    if (opts.customTextFile) {
      const more = opts.customText2File
      const nextLabel = more ? '[v_s1]' : '[vout]'
      filterParts.push(`${lastVideoLabel}ass=${escASSPath(opts.customTextFile)}${nextLabel}`)
      lastVideoLabel = nextLabel
    }
    if (opts.customText2File) {
      filterParts.push(`${lastVideoLabel}ass=${escASSPath(opts.customText2File)}[vout]`)
      lastVideoLabel = '[vout]'
    }
  }

  // Video fade (applied after subtitle burn, before final map)
  let videoOutLabel = '[vout]'
  if (opts.fadeIn || opts.fadeOut) {
    const dur = Math.max(1, opts.clipDuration ?? 10)
    const fadeParts: string[] = []
    if (opts.fadeIn)  fadeParts.push(`fade=t=in:st=0:d=1`)
    if (opts.fadeOut) fadeParts.push(`fade=t=out:st=${Math.max(0, dur - 1).toFixed(3)}:d=1`)
    filterParts.push(`[vout]${fadeParts.join(',')}[vfinal]`)
    videoOutLabel = '[vfinal]'
  }

  // Audio filters — build per-stream chains, then amix all active streams
  const audioFilters: string[] = []
  const audioStreamLabels: string[] = []

  // Original audio (always present unless muted via originalVolume=0)
  const origVol = Math.max(0, Math.min(1, opts.originalVolume)).toFixed(2)
  if (opts.fadeIn || opts.fadeOut) {
    const dur = Math.max(1, opts.clipDuration ?? 10)
    const aParts: string[] = [`volume=${origVol}`]
    if (opts.fadeIn)  aParts.push(`afade=t=in:st=0:d=1`)
    if (opts.fadeOut) aParts.push(`afade=t=out:st=${Math.max(0, dur - 1).toFixed(3)}:d=1`)
    audioFilters.push(`${audioSrcLabel}${aParts.join(',')}[a0]`)
  } else {
    audioFilters.push(`${audioSrcLabel}volume=${origVol}[a0]`)
  }
  audioStreamLabels.push('[a0]')

  // Voiceover
  if (voiceoverIdx !== null) {
    const voiceVol = Math.max(0, Math.min(1, opts.voiceoverVolume)).toFixed(2)
    audioFilters.push(`[${voiceoverIdx}:a]volume=${voiceVol}[a1]`)
    audioStreamLabels.push('[a1]')
  }

  // Background music (with optional auto-duck)
  if (bgMusicIdx !== null) {
    const dur = Math.max(1, opts.clipDuration ?? 10)
    // When auto-duck is enabled, reduce music to duck volume instead of normal volume
    const effectiveVol = opts.audioDuckEnabled
      ? Math.max(0.05, Math.min(0.9, opts.audioDuckVolume ?? 0.3))
      : Math.max(0, Math.min(1, opts.bgMusicVolume ?? 0.7))
    const musicVol = effectiveVol.toFixed(2)
    const mParts: string[] = [`volume=${musicVol}`]
    if (opts.bgMusicFadeIn)  mParts.push(`afade=t=in:st=0:d=1`)
    if (opts.bgMusicFadeOut) mParts.push(`afade=t=out:st=${Math.max(0, dur - 1).toFixed(3)}:d=1`)
    audioFilters.push(`[${bgMusicIdx}:a]${mParts.join(',')}[am]`)
    audioStreamLabels.push('[am]')
  }

  // Mix all streams; if only one stream use it directly (skip anull no-op)
  let audioOutLabel = ''
  if (audioStreamLabels.length > 1) {
    audioFilters.push(
      `${audioStreamLabels.join('')}amix=inputs=${audioStreamLabels.length}:duration=first:dropout_transition=0[aout]`
    )
    audioOutLabel = '[aout]'
  } else {
    audioOutLabel = '[a0]'
  }

  const allFilters = [...filterParts, ...audioFilters]
  const filterComplex = allFilters.join(';')

  const args: string[] = [
    ...inputs,
    '-filter_complex', filterComplex,
    '-map', videoOutLabel,
  ]

  args.push('-map', audioOutLabel)

  // Use Apple VideoToolbox hardware encoder on macOS (M-series: ~4-5× faster than libx264).
  // -allow_sw 1 falls back to software if VT is unavailable (non-Mac or unsupported GPU).
  // Quality: VT q:v 65 ≈ libx264 crf 23 (VT scale: 0=best, 100=worst).
  const isMac = process.platform === 'darwin'
  if (isMac) {
    args.push(
      '-c:v', 'h264_videotoolbox',
      '-q:v', '65',
      '-allow_sw', '1',
    )
  } else {
    args.push(
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-threads', '0',  // 0 = use all available CPU cores
    )
  }
  args.push(
    '-c:a', 'aac',
    '-b:a', '192k',
    '-movflags', '+faststart',
    '-y',
    opts.outputVideo,
  )

  return args
}


export function buildTrimArgs(opts: {
  inputVideo: string
  outputVideo: string
  startSeconds: number
  durationSeconds: number
  crop?: { x: number; y: number; w: number; h: number }  // percentages 0-100
}): string[] {
  const vfParts: string[] = []

  // Spatial crop: applied before scale so user selects which region of the source frame to use
  if (opts.crop) {
    const { x, y, w, h } = opts.crop
    const cx = Math.max(0, Math.min(100, x)) / 100
    const cy = Math.max(0, Math.min(100, y)) / 100
    const cw = Math.max(1, Math.min(100, w)) / 100
    const ch = Math.max(1, Math.min(100, h)) / 100
    vfParts.push(`crop=iw*${cw.toFixed(4)}:ih*${ch.toFixed(4)}:iw*${cx.toFixed(4)}:ih*${cy.toFixed(4)}`)
  }
  // Snap to even pixel dimensions (H.264 requires even width/height) and ensure yuv420p.
  // Preserve source resolution — the export step handles final scaling to the preset dimensions.
  vfParts.push(`scale=trunc(iw/2)*2:trunc(ih/2)*2`)
  vfParts.push(`format=yuv420p`)

  // -ss before -i = container-level fast seek (instant for any start time).
  // Tradeoff: may land up to ~1 keyframe interval off — not noticeable in a video editor.
  // -ss after -i = slow decode-from-start (penalises long source videos heavily).
  return [
    '-ss', String(opts.startSeconds),
    '-i', opts.inputVideo,
    '-t', String(opts.durationSeconds),
    '-vf', vfParts.join(','),
    '-c:v', 'libx264',
    '-preset', 'ultrafast',   // intermediate file — nobody sees this, speed > quality
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
  position: { x: number; y: number }  // 0-100% of 1080x1920 frame
  fontFamily: string    // e.g. 'Arial', 'Impact'
  bold: boolean
  outlineWidth: number  // 0-8 pixels
  textAlign?: 'center' | 'left'  // default: 'center'
}

export function buildASSSubtitles(
  lines: SubtitleLine[],
  style: SubtitleStyle,
  outputWidth = 1080,
  outputHeight = 1920,
): string {
  // Convert percentage position to pixel coordinates on the output canvas
  const xPx = Math.round((style.position.x / 100) * outputWidth)
  const yPx = Math.round((style.position.y / 100) * outputHeight)
  // \an5 = center anchor, \an4 = left anchor; \pos(x,y) = absolute pixel position
  const an = style.textAlign === 'left' ? 4 : 5
  const posTag = `{\\an${an}\\pos(${xPx},${yPx})}`

  const boldFlag = style.bold ? 1 : 0
  const outline = Math.max(0, Math.min(8, style.outlineWidth))

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${outputWidth}
PlayResY: ${outputHeight}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.fontFamily},${style.fontSize},&H00${style.color},&H000000FF,&H00000000,&H80000000,${boldFlag},0,0,0,100,100,0,0,1,${outline},1,5,40,40,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`

  const events = lines.map(line => {
    const start = formatASSTime(line.start)
    const end = formatASSTime(line.end)
    const text = line.text.replace(/\n/g, '\\N')
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${posTag}${text}`
  }).join('\n')

  return header + '\n' + events + '\n'
}

export function formatASSTime(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${h}:${String(m).padStart(2, '0')}:${String(s.toFixed(2)).padStart(5, '0')}`
}

// ── Helpers for speed and color preset filters ────────────────────────────────

/**
 * Build an atempo filter chain for a given speed multiplier.
 * atempo only accepts 0.5–2.0 per stage; chain for extreme values.
 */
function buildAtempoChain(speed: number): string {
  const stages: string[] = []
  let remaining = speed
  if (remaining < 0.5) {
    // e.g. 0.25 = atempo=0.5,atempo=0.5
    while (remaining < 0.5) {
      stages.push('atempo=0.5')
      remaining /= 0.5
    }
  } else if (remaining > 2.0) {
    while (remaining > 2.0) {
      stages.push('atempo=2.0')
      remaining /= 2.0
    }
  }
  stages.push(`atempo=${remaining.toFixed(4)}`)
  return stages.join(',')
}

/**
 * Build an FFmpeg eq filter string for a named color preset.
 * Returns empty string for 'normal'/undefined (no filter needed).
 */
function buildColorEqFilter(preset: string | undefined): string {
  switch (preset) {
    // Basic
    case 'warm':      return 'eq=contrast=1.05:brightness=0.02:saturation=1.2:gamma_r=1.1:gamma_b=0.9'
    case 'cool':      return 'eq=contrast=1.05:brightness=0.0:saturation=1.1:gamma_r=0.9:gamma_b=1.1'
    case 'vivid':     return 'eq=contrast=1.15:brightness=0.03:saturation=1.6'
    case 'cinematic': return 'eq=contrast=1.1:brightness=-0.02:saturation=0.85:gamma=0.95'
    case 'bw':        return 'hue=s=0,eq=contrast=1.1:brightness=0.0'
    case 'faded':     return 'eq=contrast=0.85:brightness=0.08:saturation=0.7'
    case 'night':     return 'eq=contrast=1.2:brightness=-0.08:saturation=0.9:gamma_b=1.2'
    // Stylized FX
    case 'vintage':   return 'eq=contrast=0.9:brightness=0.05:saturation=0.6:gamma_r=1.15:gamma_b=0.85,curves=vintage'
    case 'retro':     return 'eq=contrast=1.0:brightness=0.04:saturation=0.8:gamma_r=1.2:gamma_g=1.05:gamma_b=0.8'
    case 'cyberpunk': return 'eq=contrast=1.3:brightness=-0.03:saturation=1.4:gamma_r=0.85:gamma_b=1.3'
    case 'dreamy':    return 'eq=contrast=0.8:brightness=0.1:saturation=0.9:gamma=1.15'
    case 'film':      return 'eq=contrast=1.05:brightness=-0.01:saturation=0.9:gamma_r=1.05:gamma_g=1.0:gamma_b=0.95'
    case 'vignette':  return 'eq=contrast=1.05:brightness=0.0:saturation=1.0,vignette=PI/4'
    case 'hicon':     return 'eq=contrast=1.4:brightness=-0.03:saturation=1.1'
    case 'bleach':    return 'eq=contrast=1.3:brightness=0.0:saturation=0.4:gamma=0.9'
    case 'tealorg':   return 'eq=contrast=1.1:brightness=0.0:saturation=1.2:gamma_r=1.15:gamma_g=0.95:gamma_b=1.2'
    case 'sunset':    return 'eq=contrast=1.05:brightness=0.03:saturation=1.3:gamma_r=1.2:gamma_g=1.0:gamma_b=0.75'
    case 'arctic':    return 'eq=contrast=1.1:brightness=0.05:saturation=0.7:gamma_r=0.85:gamma_b=1.25'
    case 'neon':      return 'eq=contrast=1.25:brightness=0.0:saturation=2.0:gamma=1.05'
    case 'sepia':     return 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131:0,eq=contrast=1.05'
    case 'lomo':      return 'eq=contrast=1.3:brightness=-0.05:saturation=1.3:gamma_r=1.1:gamma_b=0.85,vignette=PI/3.5'
    case 'chrome':    return 'eq=contrast=1.2:brightness=0.02:saturation=0.3:gamma=1.1'
    case 'noir':      return 'hue=s=0,eq=contrast=1.35:brightness=-0.05:gamma=0.85'
    case 'popart':    return 'eq=contrast=1.5:brightness=0.05:saturation=2.5'
    case 'golden':    return 'eq=contrast=1.05:brightness=0.04:saturation=1.1:gamma_r=1.15:gamma_g=1.05:gamma_b=0.8'
    case 'moody':     return 'eq=contrast=1.15:brightness=-0.06:saturation=0.75:gamma=0.85:gamma_b=1.1'
    case 'pastel':    return 'eq=contrast=0.75:brightness=0.12:saturation=0.65:gamma=1.2'
    default:          return ''
  }
}

/**
 * Escape a string for use in an ffmpeg drawtext `text=` option.
 * The text is embedded inside single quotes in the filter_complex string:
 *   drawtext=text='<value>'
 * Within single-quoted ffmpeg filter values, backslash is the escape char.
 * `:` must also be escaped because it separates filter options at parse level.
 * `[` and `]` are filter-graph metacharacters that must be escaped inside values.
 */
export function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, '\\\\')  // backslash first
    .replace(/'/g, "\\'")    // single quote
    .replace(/:/g, '\\:')    // option separator
    .replace(/\[/g, '\\[')   // filter-graph label open
    .replace(/\]/g, '\\]')   // filter-graph label close
}

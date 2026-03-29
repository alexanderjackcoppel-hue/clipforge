import { describe, it, expect } from 'vitest'
import {
  parseTime,
  buildTrimArgs,
  buildExportArgs,
  buildASSSubtitles,
  formatASSTime,
  escapeDrawtext,
  type SubtitleLine,
  type SubtitleStyle,
} from '../server/lib/ffmpegBuilder.js'

// ─── parseTime ───────────────────────────────────────────────────────────────

describe('parseTime', () => {
  it('parses minutes and seconds correctly', () => {
    expect(parseTime('1:30')).toBe(90)
    expect(parseTime('0:00')).toBe(0)
    expect(parseTime('10:59')).toBe(659)
  })

  it('throws on invalid format', () => {
    expect(() => parseTime('90')).toThrow()
    expect(() => parseTime('1:2:3')).toThrow()
    expect(() => parseTime('')).toThrow()
  })

  it('throws when seconds >= 60', () => {
    expect(() => parseTime('1:60')).toThrow()
    expect(() => parseTime('0:99')).toThrow()
  })

  it('throws on negative values', () => {
    expect(() => parseTime('-1:30')).toThrow()
  })
})

// ─── formatASSTime ───────────────────────────────────────────────────────────

describe('formatASSTime', () => {
  it('formats zero correctly', () => {
    expect(formatASSTime(0)).toBe('0:00:00.00')
  })

  it('formats sub-minute correctly', () => {
    expect(formatASSTime(5.5)).toBe('0:00:05.50')
  })

  it('formats minutes correctly', () => {
    expect(formatASSTime(90)).toBe('0:01:30.00')
  })

  it('formats hours correctly', () => {
    expect(formatASSTime(3661)).toBe('1:01:01.00')
  })
})

// ─── buildTrimArgs ───────────────────────────────────────────────────────────

describe('buildTrimArgs', () => {
  it('produces correct ffmpeg arguments', () => {
    const args = buildTrimArgs({
      inputVideo: '/tmp/source.mp4',
      outputVideo: '/tmp/trimmed.mp4',
      startSeconds: 10,
      durationSeconds: 30,
    })
    expect(args).toContain('-ss')
    expect(args).toContain('10')
    expect(args).toContain('-t')
    expect(args).toContain('30')
    expect(args).toContain('-i')
    expect(args).toContain('/tmp/source.mp4')
    expect(args[args.length - 1]).toBe('/tmp/trimmed.mp4')
  })

  it('normalizes pixel dimensions without scaling to fixed resolution', () => {
    const args = buildTrimArgs({
      inputVideo: '/tmp/source.mp4',
      outputVideo: '/tmp/out.mp4',
      startSeconds: 0,
      durationSeconds: 15,
    })
    const vfIdx = args.indexOf('-vf')
    expect(vfIdx).toBeGreaterThan(-1)
    // Preserves source resolution, ensures even pixels (H.264 requirement)
    expect(args[vfIdx + 1]).toContain('trunc(iw/2)*2')
    expect(args[vfIdx + 1]).toContain('format=yuv420p')
  })
})

// ─── buildExportArgs ─────────────────────────────────────────────────────────

describe('buildExportArgs', () => {
  const base = {
    inputVideo: '/tmp/trimmed.mp4',
    outputVideo: '/tmp/final.mp4',
    originalVolume: 0.8,
    voiceoverVolume: 1.0,
    overlayPosition: 'bottom-right' as const,
    overlayScale: 20,
  }

  it('case 1: no overlay, no voiceover, no subtitles — produces valid args', () => {
    const args = buildExportArgs(base)
    expect(args).toContain('-filter_complex')
    expect(args).toContain('[vout]')
    // Should map video and audio via filter_complex
    const mapIdx = args.indexOf('-map')
    expect(args[mapIdx + 1]).toBe('[vout]')
    // Single audio stream: mapped as [a0] directly (no anull no-op pass-through)
    const audioMapLabel = args[args.lastIndexOf('-map') + 1]
    expect(audioMapLabel).toMatch(/^\[a/)
    expect(args[args.length - 1]).toBe('/tmp/final.mp4')
  })

  it('case 2: overlay only — includes overlay in filter_complex', () => {
    const args = buildExportArgs({ ...base, overlayImage: '/tmp/logo.png' })
    const fcIdx = args.indexOf('-filter_complex')
    expect(args[fcIdx + 1]).toContain('overlay')
    expect(args[fcIdx + 1]).toContain('[vout]')
  })

  it('case 3: voiceover only — includes amix in filter_complex', () => {
    const args = buildExportArgs({ ...base, voiceoverFile: '/tmp/voice.mp3' })
    const fcIdx = args.indexOf('-filter_complex')
    expect(args[fcIdx + 1]).toContain('amix')
    expect(args[fcIdx + 1]).toContain('[aout]')
    expect(args).toContain('[aout]')
  })

  it('case 4: subtitles only — includes ass filter in filter_complex', () => {
    const args = buildExportArgs({ ...base, subtitlesFile: '/tmp/subs.ass' })
    const fcIdx = args.indexOf('-filter_complex')
    expect(args[fcIdx + 1]).toContain('ass=')
    expect(args[fcIdx + 1]).toContain('[vout]')
  })

  it('case 5: all three combined — filter_complex includes overlay, ass, and amix', () => {
    const args = buildExportArgs({
      ...base,
      overlayImage: '/tmp/logo.png',
      voiceoverFile: '/tmp/voice.mp3',
      subtitlesFile: '/tmp/subs.ass',
    })
    const fcIdx = args.indexOf('-filter_complex')
    const fc = args[fcIdx + 1]
    expect(fc).toContain('overlay')
    expect(fc).toContain('ass=')
    expect(fc).toContain('amix')
    expect(fc).toContain('[vout]')
    expect(fc).toContain('[aout]')
  })

  it('no-subtitle path uses null passthrough to [vout]', () => {
    const args = buildExportArgs(base)
    const fc = args[args.indexOf('-filter_complex') + 1]
    // Should contain null filter passthrough, not a bare label rename
    expect(fc).toContain('null[vout]')
  })

  it('non-default outputWidth/outputHeight appear in filter_complex scale', () => {
    const args = buildExportArgs({ ...base, outputWidth: 1280, outputHeight: 720 })
    const fc = args[args.indexOf('-filter_complex') + 1]
    expect(fc).toContain('1280')
    expect(fc).toContain('720')
    // Default 1080x1920 should NOT appear since we overrode both dimensions
    expect(fc).not.toContain('1920')
  })
})

// ─── buildASSSubtitles ───────────────────────────────────────────────────────

describe('buildASSSubtitles', () => {
  const lines: SubtitleLine[] = [
    { start: 0, end: 2, text: 'Hello world' },
    { start: 2.5, end: 5, text: 'Second line' },
  ]
  const baseStyle = { fontSize: 48, color: 'FFFFFF', position: { x: 50, y: 85 }, fontFamily: 'Arial', bold: true, outlineWidth: 3 }

  it('produces valid ASS file header', () => {
    const ass = buildASSSubtitles(lines, baseStyle)
    expect(ass).toContain('[Script Info]')
    expect(ass).toContain('[V4+ Styles]')
    expect(ass).toContain('[Events]')
  })

  it('includes the hex color in the style', () => {
    const ass = buildASSSubtitles(lines, { ...baseStyle, color: 'FFFF00' })
    expect(ass).toContain('FFFF00')
  })

  it('uses \\an5 with absolute \\pos() for positioning', () => {
    const ass = buildASSSubtitles(lines, { ...baseStyle, position: { x: 50, y: 85 } })
    // \an5 = center anchor, \pos(540,1632) for 50%/85% of 1080x1920
    expect(ass).toContain('\\an5')
    expect(ass).toContain('\\pos(540,1632)')
  })

  it('encodes position correctly for top-left (10%, 10%)', () => {
    const ass = buildASSSubtitles(lines, { ...baseStyle, position: { x: 10, y: 10 } })
    expect(ass).toContain('\\pos(108,192)')
  })

  it('uses bold flag in style line', () => {
    const ass = buildASSSubtitles(lines, { ...baseStyle, bold: true })
    // ASS Style: ...,Bold=1,...
    expect(ass).toMatch(/Style: Default,Arial,48,.+,1,0,0,0/)
  })

  it('uses not-bold flag in style line', () => {
    const ass = buildASSSubtitles(lines, { ...baseStyle, bold: false })
    expect(ass).toMatch(/Style: Default,Arial,48,.+,0,0,0,0/)
  })

  it('uses custom font family in style line', () => {
    const ass = buildASSSubtitles(lines, { ...baseStyle, fontFamily: 'Impact' })
    expect(ass).toContain('Style: Default,Impact,')
  })

  it('clamps outlineWidth to 0-8', () => {
    const ass = buildASSSubtitles(lines, { ...baseStyle, outlineWidth: 10 })
    // Should be clamped to 8 in the Style line
    expect(ass).toContain(',8,')
  })

  it('includes Dialogue lines for each subtitle', () => {
    const ass = buildASSSubtitles(lines, baseStyle)
    expect(ass).toContain('Hello world')
    expect(ass).toContain('Second line')
    expect((ass.match(/^Dialogue:/gm) ?? []).length).toBe(2)
  })
})

// ─── escapeDrawtext ───────────────────────────────────────────────────────────
// Regression: lower-thirds names with ffmpeg filter metacharacters (colon,
// brackets) were not escaped, breaking the filter_complex string silently.
// Found by /plan-eng-review on 2026-03-29.

describe('escapeDrawtext', () => {
  it('leaves plain text unchanged', () => {
    expect(escapeDrawtext('Hello World')).toBe('Hello World')
    expect(escapeDrawtext('Alex Johnson')).toBe('Alex Johnson')
  })

  it('escapes backslash first (to avoid double-escaping)', () => {
    // 'a\\b' is the string a\b — one backslash. Should become a\\b (two backslashes).
    expect(escapeDrawtext('a\\b')).toBe('a\\\\b')
    // backslash must be escaped before other chars to avoid double-escaping
    expect(escapeDrawtext('a\\:b')).toBe('a\\\\\\:b')
  })

  it('escapes single quotes', () => {
    expect(escapeDrawtext("it's")).toBe("it\\'s")
  })

  it('escapes colons (ffmpeg option separator)', () => {
    expect(escapeDrawtext('Alex: CEO')).toBe('Alex\\: CEO')
    expect(escapeDrawtext('Title: Sub')).toBe('Title\\: Sub')
  })

  it('escapes square brackets (filter-graph label chars)', () => {
    expect(escapeDrawtext('Tom [Smith]')).toBe('Tom \\[Smith\\]')
  })

  it('handles combined metacharacters', () => {
    expect(escapeDrawtext("[CEO]: it's Tom")).toBe("\\[CEO\\]\\: it\\'s Tom")
  })
})

import { describe, it, expect } from 'vitest'
import {
  parseTime,
  buildTrimArgs,
  buildExportArgs,
  buildASSSubtitles,
  formatASSTime,
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

  it('includes vertical crop filter', () => {
    const args = buildTrimArgs({
      inputVideo: '/tmp/source.mp4',
      outputVideo: '/tmp/out.mp4',
      startSeconds: 0,
      durationSeconds: 15,
    })
    const vfIdx = args.indexOf('-vf')
    expect(vfIdx).toBeGreaterThan(-1)
    expect(args[vfIdx + 1]).toContain('1080:1920')
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
    // Should map video and pass through audio
    const mapIdx = args.indexOf('-map')
    expect(args[mapIdx + 1]).toBe('[vout]')
    expect(args).toContain('0:a?')
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
})

// ─── buildASSSubtitles ───────────────────────────────────────────────────────

describe('buildASSSubtitles', () => {
  const lines: SubtitleLine[] = [
    { start: 0, end: 2, text: 'Hello world' },
    { start: 2.5, end: 5, text: 'Second line' },
  ]

  it('produces valid ASS file header', () => {
    const ass = buildASSSubtitles(lines, { fontSize: 48, color: 'FFFFFF', position: 'bottom' })
    expect(ass).toContain('[Script Info]')
    expect(ass).toContain('[V4+ Styles]')
    expect(ass).toContain('[Events]')
  })

  it('includes the hex color in the style', () => {
    const ass = buildASSSubtitles(lines, { fontSize: 36, color: 'FFFF00', position: 'bottom' })
    expect(ass).toContain('FFFF00')
  })

  it('bottom position uses alignment 2', () => {
    const ass = buildASSSubtitles(lines, { fontSize: 48, color: 'FFFFFF', position: 'bottom' })
    // Alignment 2 = bottom-center in ASS
    expect(ass).toMatch(/,2,/)
  })

  it('top position uses alignment 8', () => {
    const ass = buildASSSubtitles(lines, { fontSize: 48, color: 'FFFFFF', position: 'top' })
    expect(ass).toMatch(/,8,/)
  })

  it('middle position uses alignment 5', () => {
    const ass = buildASSSubtitles(lines, { fontSize: 48, color: 'FFFFFF', position: 'middle' })
    expect(ass).toMatch(/,5,/)
  })

  it('includes Dialogue lines for each subtitle', () => {
    const ass = buildASSSubtitles(lines, { fontSize: 48, color: 'FFFFFF', position: 'bottom' })
    expect(ass).toContain('Hello world')
    expect(ass).toContain('Second line')
    expect((ass.match(/^Dialogue:/gm) ?? []).length).toBe(2)
  })
})

import { describe, it, expect } from 'vitest'

// Validation regex patterns used in server routes (trim.ts, export.ts, server/index.ts)
// Tested here to prevent regressions if the patterns are ever refactored

// Regression: ISSUE-003 — socialBgColor and cinematicBgColor not validated before ffmpeg filtergraph
// Found by /plan-eng-review on 2026-03-20
// Report: .gstack/qa-reports/qa-report-localhost-2026-03-20.md

const CLIP_SUFFIX_RE = /^[0-9a-f]{8}$/
const HEX6_RE = /^[0-9A-Fa-f]{6}$/
const ALLOWED_FILE_RE = /^(source|trimmed|final|audio|waveform)(_[0-9a-f]{8})?\.(mp4|wav|png)$/

describe('clipSuffix validation (trim.ts, transcribe.ts, export.ts)', () => {
  it('accepts exactly 8 lowercase hex characters', () => {
    expect(CLIP_SUFFIX_RE.test('a3f2c1b9')).toBe(true)
    expect(CLIP_SUFFIX_RE.test('00000000')).toBe(true)
    expect(CLIP_SUFFIX_RE.test('ffffffff')).toBe(true)
    expect(CLIP_SUFFIX_RE.test('deadbeef')).toBe(true)
  })

  it('rejects uppercase hex', () => {
    expect(CLIP_SUFFIX_RE.test('A3F2C1B9')).toBe(false)
    expect(CLIP_SUFFIX_RE.test('DEADBEEF')).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(CLIP_SUFFIX_RE.test('a3f2c1b')).toBe(false)    // 7 chars
    expect(CLIP_SUFFIX_RE.test('a3f2c1b99')).toBe(false)  // 9 chars
    expect(CLIP_SUFFIX_RE.test('')).toBe(false)
  })

  it('rejects non-hex characters', () => {
    expect(CLIP_SUFFIX_RE.test('g3f2c1b9')).toBe(false)
    expect(CLIP_SUFFIX_RE.test('a3f2c1b_')).toBe(false)
    expect(CLIP_SUFFIX_RE.test('a3f2c1b ')).toBe(false)
  })
})

describe('hex color validation (export.ts — socialBgColor, cinematicBgColor)', () => {
  it('accepts standard 6-digit hex colors', () => {
    expect(HEX6_RE.test('FFFFFF')).toBe(true)
    expect(HEX6_RE.test('000000')).toBe(true)
    expect(HEX6_RE.test('ff0000')).toBe(true)
    expect(HEX6_RE.test('7c3aed')).toBe(true)  // violet-600
  })

  it('accepts mixed case', () => {
    expect(HEX6_RE.test('Ff0000')).toBe(true)
    expect(HEX6_RE.test('aAbBcC')).toBe(true)
  })

  it('rejects with hash prefix', () => {
    expect(HEX6_RE.test('#FFFFFF')).toBe(false)
    expect(HEX6_RE.test('#000000')).toBe(false)
  })

  it('rejects wrong length', () => {
    expect(HEX6_RE.test('FFFF')).toBe(false)    // 4 chars
    expect(HEX6_RE.test('FFFFFFF')).toBe(false)  // 7 chars
    expect(HEX6_RE.test('')).toBe(false)
  })

  it('rejects non-hex characters', () => {
    expect(HEX6_RE.test('GGGGGG')).toBe(false)
    expect(HEX6_RE.test('FFFFFF ')).toBe(false)
    expect(HEX6_RE.test('FF FF FF')).toBe(false)
  })
})

describe('static file allowlist regex (server/index.ts)', () => {
  it('accepts base file names', () => {
    expect(ALLOWED_FILE_RE.test('source.mp4')).toBe(true)
    expect(ALLOWED_FILE_RE.test('trimmed.mp4')).toBe(true)
    expect(ALLOWED_FILE_RE.test('final.mp4')).toBe(true)
    expect(ALLOWED_FILE_RE.test('audio.wav')).toBe(true)
    expect(ALLOWED_FILE_RE.test('waveform.png')).toBe(true)
  })

  it('accepts suffixed file names', () => {
    expect(ALLOWED_FILE_RE.test('trimmed_a3f2c1b9.mp4')).toBe(true)
    expect(ALLOWED_FILE_RE.test('final_deadbeef.mp4')).toBe(true)
    expect(ALLOWED_FILE_RE.test('audio_00000000.wav')).toBe(true)
    expect(ALLOWED_FILE_RE.test('waveform_a3f2c1b9.png')).toBe(true)
  })

  it('rejects path traversal attempts', () => {
    expect(ALLOWED_FILE_RE.test('../source.mp4')).toBe(false)
    expect(ALLOWED_FILE_RE.test('source.mp4.sh')).toBe(false)
    expect(ALLOWED_FILE_RE.test('../../etc/passwd')).toBe(false)
  })

  it('rejects unknown extensions', () => {
    expect(ALLOWED_FILE_RE.test('source.avi')).toBe(false)
    expect(ALLOWED_FILE_RE.test('source.sh')).toBe(false)
    expect(ALLOWED_FILE_RE.test('source.mp4.txt')).toBe(false)
  })

  it('rejects unknown base names', () => {
    expect(ALLOWED_FILE_RE.test('malicious.mp4')).toBe(false)
    expect(ALLOWED_FILE_RE.test('upload_123.mp3')).toBe(false)
  })

  it('rejects suffixes with wrong length or case', () => {
    expect(ALLOWED_FILE_RE.test('trimmed_A3F2C1B9.mp4')).toBe(false)  // uppercase
    expect(ALLOWED_FILE_RE.test('trimmed_a3f2c1b.mp4')).toBe(false)   // 7 chars
    expect(ALLOWED_FILE_RE.test('trimmed_a3f2c1b99.mp4')).toBe(false) // 9 chars
  })
})

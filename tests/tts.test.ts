import { describe, it, expect } from 'vitest'

// Unit tests for TTS route validation logic.
// Tests the text and voice sanitization used in tts.ts to prevent
// command injection into the `say` CLI call.

// Mirrors tts.ts validation:
//   text: required, string, non-empty after trim, max 5000 chars
//   voice: must match /^[A-Za-z ]+$/, defaults to 'Samantha'
const VOICE_RE = /^[A-Za-z ]+$/

function sanitizeVoice(voice: unknown): string {
  return typeof voice === 'string' && VOICE_RE.test(voice) ? voice : 'Samantha'
}

function validateText(text: unknown): { ok: boolean; error?: string; value?: string } {
  if (!text || typeof text !== 'string' || !text.trim()) {
    return { ok: false, error: 'text is required' }
  }
  return { ok: true, value: text.trim().slice(0, 5000) }
}

describe('tts route — text validation', () => {
  it('accepts a non-empty string', () => {
    const result = validateText('Hello world')
    expect(result.ok).toBe(true)
    expect(result.value).toBe('Hello world')
  })

  it('trims whitespace', () => {
    const result = validateText('  Hello  ')
    expect(result.ok).toBe(true)
    expect(result.value).toBe('Hello')
  })

  it('truncates at 5000 chars', () => {
    const long = 'a'.repeat(6000)
    const result = validateText(long)
    expect(result.ok).toBe(true)
    expect(result.value!.length).toBe(5000)
  })

  it('rejects empty string', () => {
    expect(validateText('')).toMatchObject({ ok: false })
    expect(validateText('   ')).toMatchObject({ ok: false })
  })

  it('rejects non-string types', () => {
    expect(validateText(null)).toMatchObject({ ok: false })
    expect(validateText(undefined)).toMatchObject({ ok: false })
    expect(validateText(42)).toMatchObject({ ok: false })
  })
})

describe('tts route — voice sanitization', () => {
  it('accepts valid voice names (letters and spaces only)', () => {
    expect(sanitizeVoice('Samantha')).toBe('Samantha')
    expect(sanitizeVoice('Alex')).toBe('Alex')
    expect(sanitizeVoice('Daniel')).toBe('Daniel')
    expect(sanitizeVoice('Karen')).toBe('Karen')
    expect(sanitizeVoice('Moira')).toBe('Moira')
    expect(sanitizeVoice('Tom')).toBe('Tom')
  })

  it('defaults to Samantha for missing or invalid voice', () => {
    expect(sanitizeVoice(undefined)).toBe('Samantha')
    expect(sanitizeVoice(null)).toBe('Samantha')
    expect(sanitizeVoice('')).toBe('Samantha')
    expect(sanitizeVoice(42)).toBe('Samantha')
  })

  it('rejects voice names with injection characters', () => {
    // These would be shell-injected into: say -v <voice>
    expect(sanitizeVoice('Samantha; rm -rf /')).toBe('Samantha')
    expect(sanitizeVoice('Samantha && id')).toBe('Samantha')
    expect(sanitizeVoice('../voices/evil')).toBe('Samantha')
    expect(sanitizeVoice('$(whoami)')).toBe('Samantha')
    expect(sanitizeVoice('`id`')).toBe('Samantha')
  })

  it('rejects voice names with digits or punctuation', () => {
    expect(sanitizeVoice('Voice123')).toBe('Samantha')
    expect(sanitizeVoice('My-Voice')).toBe('Samantha')
    expect(sanitizeVoice('voice_name')).toBe('Samantha')
  })
})

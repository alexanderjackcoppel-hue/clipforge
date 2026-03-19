import { describe, it, expect } from 'vitest'
import { validateUrl } from '../server/lib/validateUrl.js'

describe('validateUrl', () => {
  it('accepts standard YouTube URLs', () => {
    expect(() => validateUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).not.toThrow()
    expect(() => validateUrl('https://youtu.be/dQw4w9WgXcQ')).not.toThrow()
    expect(() => validateUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).not.toThrow()
  })

  it('accepts Instagram URLs', () => {
    expect(() => validateUrl('https://www.instagram.com/reel/abc123/')).not.toThrow()
    expect(() => validateUrl('https://instagram.com/p/abc123/')).not.toThrow()
  })

  it('accepts TikTok URLs', () => {
    expect(() => validateUrl('https://www.tiktok.com/@user/video/123')).not.toThrow()
    expect(() => validateUrl('https://vm.tiktok.com/abc123/')).not.toThrow()
  })

  it('rejects unsupported platforms', () => {
    expect(() => validateUrl('https://vimeo.com/12345')).toThrow(/Unsupported platform/)
    expect(() => validateUrl('https://evil.com/video')).toThrow(/Unsupported platform/)
  })

  it('rejects non-http protocols', () => {
    expect(() => validateUrl('ftp://youtube.com/watch?v=abc')).toThrow()
    expect(() => validateUrl('javascript:alert(1)')).toThrow()
  })

  it('rejects malformed URLs', () => {
    expect(() => validateUrl('not-a-url')).toThrow(/Invalid URL/)
    expect(() => validateUrl('')).toThrow()
  })

  it('returns the normalized URL string', () => {
    const result = validateUrl('  https://youtu.be/abc  ')
    expect(typeof result).toBe('string')
    expect(result).toContain('youtu.be')
  })
})

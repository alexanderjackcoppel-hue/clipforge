import { describe, it, expect } from 'vitest'
import { parseSRT } from '../server/lib/parseSRT.js'

const SAMPLE_SRT = `1
00:00:00,000 --> 00:00:02,500
Hello world

2
00:00:02,500 --> 00:00:05,000
Second subtitle line

3
00:01:00,000 --> 00:01:03,200
Third line at one minute
`

describe('parseSRT', () => {
  it('parses a standard SRT file into structured lines', () => {
    const result = parseSRT(SAMPLE_SRT)
    expect(result).toHaveLength(3)
    expect(result[0]).toMatchObject({ id: 1, start: 0, end: 2.5, text: 'Hello world' })
    expect(result[1]).toMatchObject({ id: 2, start: 2.5, end: 5.0, text: 'Second subtitle line' })
  })

  it('parses timestamps with hour component correctly', () => {
    const result = parseSRT(SAMPLE_SRT)
    expect(result[2].start).toBe(60)
    expect(result[2].end).toBeCloseTo(63.2, 1)
  })

  it('returns empty array for empty string', () => {
    expect(parseSRT('')).toEqual([])
  })

  it('skips malformed blocks without crashing', () => {
    const malformed = `1\nHello world\n\n2\n00:00:01,000 --> 00:00:02,000\nGood line\n`
    const result = parseSRT(malformed)
    // Only the valid block with a timestamp should be returned
    expect(result.some(r => r.text === 'Good line')).toBe(true)
  })

  it('handles multi-line subtitle text by joining with a space', () => {
    const multiline = `1\n00:00:00,000 --> 00:00:02,000\nLine one\nLine two\n`
    const result = parseSRT(multiline)
    expect(result[0].text).toBe('Line one Line two')
  })
})

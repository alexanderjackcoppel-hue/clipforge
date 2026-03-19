import { describe, it, expect } from 'vitest'
import { isValidJobId, UUID_REGEX } from '../server/lib/jobManager.js'

describe('isValidJobId', () => {
  it('accepts a valid UUID v4', () => {
    expect(isValidJobId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isValidJobId('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true)
  })

  it('rejects non-UUID strings', () => {
    expect(isValidJobId('not-a-uuid')).toBe(false)
    expect(isValidJobId('12345')).toBe(false)
    expect(isValidJobId('550e8400-e29b-41d4-a716')).toBe(false) // too short
  })

  it('rejects empty / null / undefined', () => {
    expect(isValidJobId('')).toBe(false)
    expect(isValidJobId(null)).toBe(false)
    expect(isValidJobId(undefined)).toBe(false)
  })

  it('rejects uppercase UUIDs (must be lowercase hex)', () => {
    expect(isValidJobId('550E8400-E29B-41D4-A716-446655440000')).toBe(false)
  })

  it('UUID_REGEX matches the pattern used by uuid v4', () => {
    expect(UUID_REGEX.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(UUID_REGEX.test('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')).toBe(false)
  })
})

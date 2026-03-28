import { describe, it, expect } from 'vitest'

// Unit tests for thumbnail route validation logic.
// Tests the isValidJobId pattern used in thumbnail.ts to guard against
// path traversal and injection via the jobId parameter.

// Mirrors the isValidJobId guard from server/lib/jobManager.ts:
// jobId must be a UUID v4 (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isValidJobId(id: unknown): id is string {
  return typeof id === 'string' && UUID_V4_RE.test(id)
}

describe('thumbnail route — jobId validation', () => {
  it('accepts a well-formed UUID v4', () => {
    expect(isValidJobId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)  // v4, variant a
    expect(isValidJobId('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true)  // v4, variant a
    expect(isValidJobId('00000000-0000-4000-8000-000000000000')).toBe(true)  // v4 minimal, variant 8
  })

  it('rejects non-string types', () => {
    expect(isValidJobId(undefined)).toBe(false)
    expect(isValidJobId(null)).toBe(false)
    expect(isValidJobId(123)).toBe(false)
    expect(isValidJobId({})).toBe(false)
  })

  it('rejects path traversal attempts', () => {
    expect(isValidJobId('../etc/passwd')).toBe(false)
    expect(isValidJobId('../../secret')).toBe(false)
    expect(isValidJobId('/tmp/clipforge/../../etc')).toBe(false)
  })

  it('rejects empty or whitespace', () => {
    expect(isValidJobId('')).toBe(false)
    expect(isValidJobId('   ')).toBe(false)
  })

  it('rejects UUIDs with wrong version digit', () => {
    // Version digit must be 4
    expect(isValidJobId('f47ac10b-58cc-1372-a567-0e02b2c3d479')).toBe(false) // v1
    expect(isValidJobId('f47ac10b-58cc-3372-a567-0e02b2c3d479')).toBe(false) // v3
    expect(isValidJobId('f47ac10b-58cc-5372-a567-0e02b2c3d479')).toBe(false) // v5
  })

  it('rejects UUIDs with wrong variant digit', () => {
    // Variant digit must be 8, 9, a, or b
    expect(isValidJobId('f47ac10b-58cc-4372-0567-0e02b2c3d479')).toBe(false) // variant 0
    expect(isValidJobId('f47ac10b-58cc-4372-c567-0e02b2c3d479')).toBe(false) // variant c
    expect(isValidJobId('f47ac10b-58cc-4372-f567-0e02b2c3d479')).toBe(false) // variant f
  })

  it('rejects UUIDs with injection payloads', () => {
    expect(isValidJobId('f47ac10b-58cc-4372-a567-0e02b2c3d479; rm -rf /')).toBe(false)
    expect(isValidJobId("f47ac10b-58cc-4372-a567-0e02b2c3d479' OR '1'='1")).toBe(false)
    expect(isValidJobId('f47ac10b-58cc-4372-a567-0e02b2c3d479\x00')).toBe(false)
  })
})

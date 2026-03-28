// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useJobProgress } from '../hooks/useJobProgress'
import type { ProgressEvent } from '../hooks/useJobProgress'

// Regression: useJobProgress server_restart detection — after MAX_SSE_ERRORS consecutive
// onerror callbacks with no successful message, emit a synthetic { type: 'error', message: 'server_restart' }.
// Found during TODOS implementation on 2026-03-22.

type ESInstance = {
  url: string
  onmessage: ((e: MessageEvent) => void) | null
  onerror: (() => void) | null
  close: ReturnType<typeof vi.fn>
  _fire: (data: ProgressEvent) => void
  _error: () => void
}

const openInstances: ESInstance[] = []

class MockEventSource {
  url: string
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  close = vi.fn(() => {
    const idx = openInstances.findIndex(i => i === (this as unknown as ESInstance))
    if (idx !== -1) openInstances.splice(idx, 1)
  })

  constructor(url: string) {
    this.url = url
    openInstances.push(this as unknown as ESInstance)
  }

  _fire(data: ProgressEvent) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent)
  }
  _error() {
    this.onerror?.()
  }
}

beforeEach(() => {
  openInstances.length = 0
  vi.useFakeTimers()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).EventSource = MockEventSource
  globalThis.fetch = vi.fn().mockResolvedValue({ ok: false })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function lastInstance(): ESInstance {
  return openInstances[openInstances.length - 1] as unknown as ESInstance
}

describe('useJobProgress — server_restart detection', () => {
  it('emits server_restart error after 5 consecutive onerror with no successful message', () => {
    const onEvent = vi.fn()
    renderHook(() => useJobProgress('job-aaa', onEvent))

    const inst = lastInstance()
    act(() => {
      inst._error()
      inst._error()
      inst._error()
      inst._error()
      inst._error() // 5th error triggers server_restart
    })

    expect(onEvent).toHaveBeenCalledWith({ type: 'error', message: 'server_restart' })
  })

  it('closes the EventSource after server_restart', () => {
    const onEvent = vi.fn()
    renderHook(() => useJobProgress('job-aaa', onEvent))

    const inst = lastInstance()
    act(() => {
      for (let i = 0; i < 5; i++) inst._error()
    })

    expect(inst.close).toHaveBeenCalled()
  })

  it('does not emit server_restart if a successful message resets the counter', () => {
    const onEvent = vi.fn()
    renderHook(() => useJobProgress('job-aaa', onEvent))

    const inst = lastInstance()
    act(() => {
      inst._error()
      inst._error()
      inst._error()
      // Successful message resets counter
      inst._fire({ type: 'progress', percent: 50 })
      inst._error()
      inst._error()
      inst._error()
      inst._error() // only 4 since reset — not yet at 5
    })

    // server_restart should NOT have been emitted
    expect(onEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'server_restart' })
    )
  })

  it('resets error counter when a new jobId is provided', () => {
    const onEvent = vi.fn()
    const { rerender } = renderHook(
      ({ jobId }) => useJobProgress(jobId, onEvent),
      { initialProps: { jobId: 'job-aaa' } }
    )

    // Fire 4 errors on first job
    act(() => {
      const inst = openInstances[0]
      inst._error(); inst._error(); inst._error(); inst._error()
    })

    // Switch to new jobId — counter should reset
    rerender({ jobId: 'job-bbb' })

    const newInst = lastInstance()
    act(() => {
      // Only 1 more error — should NOT trigger server_restart since counter reset
      newInst._error()
    })

    expect(onEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ message: 'server_restart' })
    )
  })
})

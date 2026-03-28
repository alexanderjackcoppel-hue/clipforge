// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMultiJobProgress } from '../hooks/useMultiJobProgress'
import type { ProgressEvent } from '../hooks/useJobProgress'

// Regression: useMultiJobProgress had no tests — event routing, cleanup, and dep-array
// behavior all untested. Found by /plan-eng-review on 2026-03-20.
// Report: .gstack/qa-reports/qa-report-localhost-2026-03-20.md

// ─── EventSource mock ──────────────────────────────────────────────────────────

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
  close = vi.fn(() => { openInstances.splice(openInstances.indexOf(self), 1) })

  constructor(url: string) {
    this.url = url
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    openInstances.push(self as unknown as ESInstance)
  }

  _fire(data: ProgressEvent) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent)
  }
  _error() {
    this.onerror?.()
  }
}

// ─── fetch mock ───────────────────────────────────────────────────────────────

let fetchMock = vi.fn()

beforeEach(() => {
  openInstances.length = 0
  vi.useFakeTimers()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).EventSource = MockEventSource
  fetchMock = vi.fn().mockResolvedValue({ ok: false })
  globalThis.fetch = fetchMock
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

// ─── helpers ──────────────────────────────────────────────────────────────────

function lastInstance(): ESInstance {
  return openInstances[openInstances.length - 1] as unknown as ESInstance
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('useMultiJobProgress', () => {
  it('opens an EventSource for each non-null jobId', () => {
    const onEvent = vi.fn()
    renderHook(() =>
      useMultiJobProgress({ clip1: 'job-aaa', clip2: 'job-bbb' }, onEvent)
    )
    expect(openInstances).toHaveLength(2)
    expect(openInstances[0].url).toContain('job-aaa')
    expect(openInstances[1].url).toContain('job-bbb')
  })

  it('ignores null jobIds', () => {
    const onEvent = vi.fn()
    renderHook(() =>
      useMultiJobProgress({ clip1: null, clip2: 'job-ccc' }, onEvent)
    )
    expect(openInstances).toHaveLength(1)
    expect(openInstances[0].url).toContain('job-ccc')
  })

  it('routes onmessage events to the correct clipId', () => {
    const onEvent = vi.fn()
    renderHook(() =>
      useMultiJobProgress({ clip1: 'job-aaa', clip2: 'job-bbb' }, onEvent)
    )

    const progress: ProgressEvent = { type: 'progress', stage: 'trimming', percent: 50 }
    act(() => { openInstances[0]._fire(progress) })

    expect(onEvent).toHaveBeenCalledWith('clip1', progress)
    expect(onEvent).toHaveBeenCalledTimes(1)
  })

  it('closes EventSource after receiving a done event', () => {
    const onEvent = vi.fn()
    renderHook(() =>
      useMultiJobProgress({ clip1: 'job-aaa' }, onEvent)
    )
    const instance = lastInstance()
    const done: ProgressEvent = { type: 'done', stage: 'trimmed', percent: 100, url: '/files/x/trimmed.mp4' }
    act(() => { instance._fire(done) })

    expect(instance.close).toHaveBeenCalled()
    expect(openInstances).toHaveLength(0)
  })

  it('closes EventSource after receiving an error event', () => {
    const onEvent = vi.fn()
    renderHook(() =>
      useMultiJobProgress({ clip1: 'job-aaa' }, onEvent)
    )
    const instance = lastInstance()
    const err: ProgressEvent = { type: 'error', message: 'trim failed' }
    act(() => { instance._fire(err) })

    expect(instance.close).toHaveBeenCalled()
  })

  it('does not open duplicate EventSource for the same jobId', () => {
    const onEvent = vi.fn()
    const { rerender } = renderHook(
      ({ map }) => useMultiJobProgress(map, onEvent),
      { initialProps: { map: { clip1: 'job-aaa' } } }
    )
    expect(openInstances).toHaveLength(1)

    // Re-render with same jobId (different object reference) — should NOT open new ES
    rerender({ map: { clip1: 'job-aaa' } })
    expect(openInstances).toHaveLength(1)
  })

  it('opens a new EventSource when a new jobId appears', () => {
    const onEvent = vi.fn()
    const { rerender } = renderHook(
      ({ map }) => useMultiJobProgress(map, onEvent),
      { initialProps: { map: { clip1: 'job-aaa' } as Record<string, string | null> } }
    )
    expect(openInstances).toHaveLength(1)

    rerender({ map: { clip1: 'job-aaa', clip2: 'job-bbb' } })
    expect(openInstances).toHaveLength(2)
  })

  it('closes EventSources removed from jobMap', () => {
    const onEvent = vi.fn()
    const { rerender } = renderHook(
      ({ map }) => useMultiJobProgress(map, onEvent),
      { initialProps: { map: { clip1: 'job-aaa', clip2: 'job-bbb' } as Record<string, string | null> } }
    )
    const first = openInstances[0]
    expect(openInstances).toHaveLength(2)

    rerender({ map: { clip2: 'job-bbb' } })
    expect(first.close).toHaveBeenCalled()
    expect(openInstances).toHaveLength(1)
  })

  it('closes all EventSources on unmount', () => {
    const onEvent = vi.fn()
    const { unmount } = renderHook(() =>
      useMultiJobProgress({ clip1: 'job-aaa', clip2: 'job-bbb' }, onEvent)
    )
    const instances = [...openInstances]
    unmount()

    for (const inst of instances) {
      expect(inst.close).toHaveBeenCalled()
    }
    expect(openInstances).toHaveLength(0)
  })

  it('starts polling fallback after 2s with no terminal event', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'running', events: [] }),
    })
    const onEvent = vi.fn()
    renderHook(() =>
      useMultiJobProgress({ clip1: 'job-aaa' }, onEvent)
    )

    // No event fired — polling timer should start at 2s
    await act(async () => { vi.advanceTimersByTime(2001) })
    await act(async () => { vi.advanceTimersByTime(1500) })

    expect(fetchMock).toHaveBeenCalledWith('/jobs/job-aaa')
  })

  it('stops polling after done status from poll', async () => {
    const onEvent = vi.fn()
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'done',
        events: [{ type: 'done', stage: 'trimmed', percent: 100, url: '/files/x/trimmed.mp4' }],
      }),
    })
    renderHook(() =>
      useMultiJobProgress({ clip1: 'job-aaa' }, onEvent)
    )

    await act(async () => { vi.advanceTimersByTime(2001) })
    await act(async () => { vi.advanceTimersByTime(1500) })

    const callCount = fetchMock.mock.calls.length

    // Should not poll again after done
    await act(async () => { vi.advanceTimersByTime(3000) })
    expect(fetchMock.mock.calls.length).toBe(callCount)
  })
})

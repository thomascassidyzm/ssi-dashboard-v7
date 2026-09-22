// The dot must outlast a deploy restart (Deborah, 2026-09-22)
//
// A native-speaker reviewer, outside the tailnet, opened Popty during one of
// the five auto-deploy restarts that afternoon, saw "SSi Machine (Cloud)" with
// a red dot, could not choose anything else (every other machine is a personal
// tunnel, dead from outside, so the switcher snapped her back), and gave up
// for the evening. The API had been back within seconds. The rule under test:
// one refused probe is not a verdict — the switcher tries again before it
// paints red, and a red dot keeps asking until the machine answers.
//
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { PROBE_RETRY_MS, PROBE_RECHECK_MS } from '@/services/default-environment.js'

const ok = { ok: true }

async function mountSwitcher() {
  const { default: EnvironmentSwitcher } = await import('./EnvironmentSwitcher.vue')
  return mount(EnvironmentSwitcher)
}

async function settle(ms) {
  await vi.advanceTimersByTimeAsync(ms)
  await flushPromises()
}

describe('EnvironmentSwitcher connection dot across a restart', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    sessionStorage.clear()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('stays green when the first probe lands inside a restart window', async () => {
    // Attempt 1: connection refused (the API is between stop and start).
    // Attempt 2: back up. This is the whole of a routine deploy restart.
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValue(ok)
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = await mountSwitcher()
    await settle(0)
    await settle(PROBE_RETRY_MS)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.status-dot').classes()).toContain('connected')
  })

  it('goes red only after every attempt fails, then heals on its own', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    vi.stubGlobal('fetch', fetchMock)

    const wrapper = await mountSwitcher()
    await settle(0)
    await settle(PROBE_RETRY_MS)
    await settle(PROBE_RETRY_MS)
    expect(wrapper.find('.status-dot').classes()).toContain('disconnected')
    const attemptsBeforeRed = fetchMock.mock.calls.length
    expect(attemptsBeforeRed).toBeGreaterThanOrEqual(3)

    // The machine comes back. Nobody reloads. The dot notices.
    fetchMock.mockResolvedValue(ok)
    await settle(PROBE_RECHECK_MS)
    expect(fetchMock.mock.calls.length).toBeGreaterThan(attemptsBeforeRed)
    expect(wrapper.find('.status-dot').classes()).toContain('connected')
  })
})

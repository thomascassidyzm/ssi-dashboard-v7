import { describe, it, expect } from 'vitest'
import { shouldFallBackToDefault } from '../default-environment.js'

// The regression this guards is Aran's, 2026-08-10: proofing Welsh pod scripts
// on popty.app, saves died as the browser's bare "Failed to fetch" while the
// navbar quietly said "Connection failed" about a backend he had picked once,
// months earlier, and which was now asleep.
const base = {
  savedEnv: 'tom',
  currentEnv: 'tom',
  defaultEnv: 'watson',
  isLocalHost: false,
  connected: false,
}

describe('shouldFallBackToDefault', () => {
  it('heals off a saved backend that is unreachable', () => {
    expect(shouldFallBackToDefault(base)).toBe(true)
  })

  it('leaves a working backend alone', () => {
    expect(shouldFallBackToDefault({ ...base, connected: true })).toBe(false)
  })

  it('never moves a developer off their own localhost API', () => {
    expect(shouldFallBackToDefault({ ...base, isLocalHost: true })).toBe(false)
  })

  it('does nothing when there is no saved preference to leave', () => {
    expect(shouldFallBackToDefault({ ...base, savedEnv: null })).toBe(false)
  })

  it('does not loop when the default itself is what is down', () => {
    expect(shouldFallBackToDefault({
      ...base, savedEnv: 'watson', currentEnv: 'watson',
    })).toBe(false)
  })

  it('heals from any of the personal dev tunnels', () => {
    for (const env of ['tom', 'kai', 'ssi']) {
      expect(shouldFallBackToDefault({ ...base, savedEnv: env, currentEnv: env })).toBe(true)
    }
  })
})

// Deborah, 2026-09-22: a probe that lands inside a deploy restart must not be
// the last word. See PROBE_ATTEMPTS in the module.
import { probeUntilAlive } from '../default-environment.js'

describe('probeUntilAlive', () => {
  const noSleep = async () => {}

  it('answers yes as soon as one attempt succeeds', async () => {
    const answers = [false, true]
    const probe = async () => answers.shift()
    expect(await probeUntilAlive(probe, { attempts: 3, sleep: noSleep })).toBe(true)
    expect(answers).toEqual([])
  })

  it('answers no only after every attempt failed', async () => {
    let calls = 0
    const probe = async () => { calls++; return false }
    expect(await probeUntilAlive(probe, { attempts: 3, sleep: noSleep })).toBe(false)
    expect(calls).toBe(3)
  })

  it('waits between attempts but not after the last', async () => {
    const waits = []
    const probe = async () => false
    await probeUntilAlive(probe, { attempts: 3, delayMs: 7, sleep: async (ms) => { waits.push(ms) } })
    expect(waits).toEqual([7, 7])
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { ENVIRONMENTS, DEFAULT_ENV, pinMachineEnvironment } from '../machineEnvironment.js'

// The ngrok machines (tom/kai/ssi) were retired 2026-10-12: popty.app serves
// through watson-1's Tailscale Funnel. A browser that saved one of them must
// land on the default, not on a dead tunnel.
function fakeLocalStorage(initial = {}) {
  const store = { ...initial }
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v) },
    _store: store,
  }
}

describe('retired ngrok environments', () => {
  beforeEach(() => { globalThis.localStorage = fakeLocalStorage() })

  it('are not selectable and no URL mentions ngrok', () => {
    for (const k of ['tom', 'kai', 'ssi']) expect(ENVIRONMENTS[k]).toBeUndefined()
    for (const e of Object.values(ENVIRONMENTS)) expect(e.url).not.toMatch(/ngrok/i)
  })

  it.each(['tom', 'kai', 'ssi'])('a saved "%s" choice falls back to the default', (saved) => {
    globalThis.localStorage = fakeLocalStorage({
      ssi_environment: saved,
      api_base_url: 'https://popty.ngrok.app',
    })
    expect(pinMachineEnvironment()).toBe(DEFAULT_ENV)
    expect(localStorage.getItem('ssi_environment')).toBe(DEFAULT_ENV)
    expect(localStorage.getItem('api_base_url')).toBe(ENVIRONMENTS[DEFAULT_ENV].url)
  })
})

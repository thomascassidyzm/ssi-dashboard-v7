// @vitest-environment jsdom
// Job #380: a private booth link's key is read off /r/<voice>?k= once, kept per voice in
// localStorage (a refresh or a home-screen icon without the query still works), and put on
// every booth API URL — including a setup-check pack's, which is the same artist's booth.
import { describe, it, expect, beforeEach } from 'vitest'
import { withBoothKey, boothKey, privateBoothLink } from './recordingApi'

describe('private booth link keys', () => {
  beforeEach(() => { localStorage.clear(); window.history.replaceState({}, '', '/') })

  it('captures ?k= from the booth URL and keeps it after the query is gone', () => {
    window.history.replaceState({}, '', '/r/human_dan_cym_s?k=abc123')
    expect(withBoothKey('/api/recording/voice/human_dan_cym_s/summary', 'human_dan_cym_s'))
      .toBe('/api/recording/voice/human_dan_cym_s/summary?k=abc123')
    window.history.replaceState({}, '', '/r/human_dan_cym_s')
    expect(boothKey('human_dan_cym_s')).toBe('abc123')
    expect(withBoothKey('/clip?variant=raw', 'pack-setup-human_dan_cym_s')).toBe('/clip?variant=raw&k=abc123')
  })

  it("never hands one voice's key to another, and leaves a keyless URL byte-identical", () => {
    window.history.replaceState({}, '', '/r/human_dan_cym_s?k=abc123')
    boothKey('human_dan_cym_s')
    expect(withBoothKey('/api/recording/voice/human_aran_cym_n', 'human_aran_cym_n')).toBe('/api/recording/voice/human_aran_cym_n')
  })

  it('builds the link to send', () => {
    expect(privateBoothLink('https://popty.app', 'human_dan_cym_s', 'k/1')).toBe('https://popty.app/r/human_dan_cym_s?k=k%2F1')
    expect(privateBoothLink('https://popty.app', 'human_dan_cym_s', null)).toBe('https://popty.app/r/human_dan_cym_s')
  })
})

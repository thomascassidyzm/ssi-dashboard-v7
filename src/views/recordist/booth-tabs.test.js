// @vitest-environment jsdom
// Job #392 (Aran 2026-10-14): one booth page, a tab per voice. The words on the tabs and in the
// batch header, and the keys a device offers the server for its other voices.
import { describe, it, expect, beforeEach } from 'vitest'
import { tabLabel, headerLanguage, heldKeysHeader, loadTabsSnapshot, saveTabsSnapshot } from './booth-tabs.js'

const ARAN = [
  { voiceId: 'human_aran_cym_n', language: 'cym', languageName: 'Welsh', dialect: 'north', displayName: 'Aran' },
  { voiceId: 'human_aran_eng', language: 'eng', languageName: 'English', dialect: null, displayName: 'Aran' },
]

describe('booth tabs', () => {
  beforeEach(() => localStorage.clear())

  it('names each tab in its own language: Cymraeg | English', () => {
    expect(ARAN.map((t) => tabLabel(t, ARAN))).toEqual(['Cymraeg', 'English'])
  })

  it('tells two voices in one language apart by dialect, else by name', () => {
    const two = [{ ...ARAN[0] }, { ...ARAN[0], voiceId: 'x', dialect: 'south' }]
    expect(two.map((t) => tabLabel(t, two))).toEqual(['Cymraeg · North', 'Cymraeg · South'])
    const sameDialect = [{ ...ARAN[0], displayName: 'Catrin' }, { ...ARAN[0], voiceId: 'y', displayName: 'Catrin Cae Gosen' }]
    expect(sameDialect.map((t) => tabLabel(t, sameDialect))).toEqual(['Cymraeg · Catrin', 'Cymraeg · Catrin Cae Gosen'])
  })

  it('the batch header leads with the language unless the course words already say it', () => {
    expect(headerLanguage('New Welsh — North', 'cym', 'Welsh')).toBe('Cymraeg')
    expect(headerLanguage('English for New Welsh — North', 'eng', 'English')).toBe('')
    expect(headerLanguage('Course', 'fin', 'Finnish')).toBe('Finnish')
  })

  it('offers the server every other voice key this device holds, never the page\'s own', () => {
    localStorage.setItem('popty.boothKey.human_aran_cym_n', 'kcym')
    localStorage.setItem('popty.boothKey.human_aran_eng', 'keng')
    localStorage.setItem('unrelated', 'x')
    expect(heldKeysHeader('human_aran_cym_n')).toBe('human_aran_eng:keng')
  })

  it('keeps the last tabs under every voice of the set, and forgets a set of one', () => {
    saveTabsSnapshot('human_aran_cym_n', ARAN)
    expect(loadTabsSnapshot('human_aran_eng').map((t) => t.voiceId)).toEqual(['human_aran_cym_n', 'human_aran_eng'])
    saveTabsSnapshot('human_aran_eng', [ARAN[1]])
    expect(loadTabsSnapshot('human_aran_eng')).toBeNull()
  })
})

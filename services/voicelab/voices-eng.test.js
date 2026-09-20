/**
 * THE VOICE LAB MUST OFFER THE ESTATE'S OWN CLONES FOR ENGLISH.
 *
 * Tom, 2026-08-29: "I can't see MY own Cartesia clone voice in the list of
 * available voices for English." He was right, and the cause was arithmetic
 * rather than policy: Cartesia publishes 419 English voices in an order nobody
 * here chose, his clone came back at position 210 of them, and the Languages
 * registry caps a language's candidate list at 80. Every other language has
 * fewer voices than the cap, which is why English alone was broken.
 *
 * These tests are pure — no key, no network, no database. They pin the two
 * facts that made the omission possible: the play picker names the clone
 * itself, and the registry sorts voices this estate OWNS ahead of the cap.
 *
 * Run: npx vitest run services/voicelab/voices-eng.test.js
 */

import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require_ = createRequire(import.meta.url)
const params = require_('./params.cjs')
const registry = require_('./registry.cjs')

const ENGLISH = params.LANGUAGES.find((l) => l.code === 'eng')

/** Cartesia's English shelf, with the two owned clones where they really sit. */
function catalogueLikeCartesia () {
  const en = []
  for (let i = 0; i < 419; i += 1) en.push({ id: `stock-${i}`, name: `Stock ${i}`, gender: 'm', owner: false })
  en.splice(209, 0, { id: '33890587-a29f-4416-ba61-2615c74f92fe', name: 'aran_english_003', gender: 'm', owner: true })
  en.splice(210, 0, { id: params.TOM_CLONE.id, name: 'tom_001', gender: 'm', owner: true })
  return { en }
}

describe('the English voice list — the play picker', () => {
  it("names Tom's Cartesia clone, and names it first", () => {
    const voices = params.voicesFor(ENGLISH, {})
    expect(voices[0].id).toBe(params.TOM_CLONE.id)
    expect(voices[0].group).toBe('Clone')
  })

  it('offers it for English only — the standing ruling, not an accident of this test', () => {
    for (const lang of params.LANGUAGES.filter((l) => l.code !== 'eng')) {
      expect(params.voicesFor(lang, {}).some((v) => v.id === params.TOM_CLONE.id)).toBe(false)
    }
  })
})

describe('the English voice list — the per-language registry', () => {
  it("offers Tom's clone even though Cartesia returns it past the 80-candidate cap", () => {
    const candidates = registry.cartesiaCandidates('eng', catalogueLikeCartesia(), []).slice(0, 80)
    expect(candidates.some((c) => c.voiceId === `cartesia_${params.TOM_CLONE.id}`)).toBe(true)
  })

  it("offers the estate's other clone too — the same omission hid both", () => {
    const candidates = registry.cartesiaCandidates('eng', catalogueLikeCartesia(), []).slice(0, 80)
    expect(candidates.some((c) => c.voiceId === 'cartesia_33890587-a29f-4416-ba61-2615c74f92fe')).toBe(true)
  })

  it('puts every owned voice ahead of every stock voice, so the cap can never reach them', () => {
    const candidates = registry.cartesiaCandidates('eng', catalogueLikeCartesia(), [])
    const lastOwned = candidates.map((c) => c.owned).lastIndexOf(true)
    const firstStock = candidates.findIndex((c) => !c.owned)
    expect(lastOwned).toBeLessThan(firstStock)
  })

  it('offers an owned clone for the guide slot, which carried no Cartesia voices at all', () => {
    const guide = registry.guideCandidates({
      code: 'eng', voices: [], guideRoles: [], voiceById: new Map(), inUse: [], catalogue: catalogueLikeCartesia(),
    })
    expect(guide.some((c) => c.voiceId === `cartesia_${params.TOM_CLONE.id}`)).toBe(true)
  })

  it('does NOT pour the whole stock catalogue into the guide list', () => {
    const guide = registry.guideCandidates({
      code: 'eng', voices: [], guideRoles: [], voiceById: new Map(), inUse: [], catalogue: catalogueLikeCartesia(),
    })
    expect(guide.every((c) => !/^cartesia_stock-/.test(c.voiceId))).toBe(true)
  })
})

describe('the picker facts — language + gender + accent (Tom, 2026-09-19)', () => {
  const catalogue = {
    en: [
      { id: 'brit-1', name: 'Gemma', gender: 'f', owner: false, accent: 'british', accentLocale: 'en-GB', country: 'GB', description: 'Warm and clear.', tagline: 'Narrator', otherAccents: ['australian'] },
      { id: 'bare-1', name: 'Bare', gender: null, owner: true },
    ],
  }

  it('carries accent, locale, country, description, tagline and other accents onto a catalogue candidate', () => {
    const c = registry.cartesiaCandidates('eng', catalogue, []).find((x) => x.voiceId === 'cartesia_brit-1')
    expect(c).toMatchObject({ accent: 'british', accentLocale: 'en-GB', country: 'GB', description: 'Warm and clear.', tagline: 'Narrator', otherAccents: ['australian'] })
  })

  it('leaves a null where the vendor said nothing, rather than inventing an accent', () => {
    const c = registry.cartesiaCandidates('eng', catalogue, []).find((x) => x.voiceId === 'cartesia_bare-1')
    expect(c.accent).toBeNull()
    expect(c.otherAccents).toEqual([])
  })

  it('finds the same facts for a registered voice by its cartesia_ id', () => {
    expect(registry.catalogueFactsById('cartesia_brit-1', catalogue).accent).toBe('british')
    expect(registry.catalogueFactsById('cartesia_nobody', catalogue)).toEqual({})
  })
})

/**
 * ── OUR OWN CLONES ARE ALWAYS FINDABLE (Tom, 2026-09-20) ───────────────────
 *
 *   "our own clones should be always findable - prioritised above any other
 *    filter … at the moment I can't select Aran's voice as the guide"
 *
 * The 2026-08-29 fix above put owned CATALOGUE voices ahead of the cap, and it
 * still holds. What it could not see was a clone that ALSO has a `voices` row —
 * and by 2026-09-20 all four English clones did, so `voiceById.has(id)` dropped
 * them from the owned path while the registered path never carried `owner` at
 * all. Measured live that evening: `owned` was undefined on every candidate in
 * the estate and Aran's clone sat at position 18 of 28 in the English guide
 * list, under the name `aran_english_003`.
 */
describe('a clone that has a voices row is still OURS (Tom, 2026-09-20)', () => {
  const ARAN = 'cartesia_33890587-a29f-4416-ba61-2615c74f92fe'
  const catalogue = {
    en: [
      { id: 'stock-a', name: 'Stock A', gender: 'f', owner: false },
      { id: 'stock-b', name: 'Stock B', gender: 'm', owner: false },
      { id: '33890587-a29f-4416-ba61-2615c74f92fe', name: 'aran_english_003', gender: null, owner: true },
    ],
  }
  /** The registered rows, with the clone LAST — the order the database returns. */
  const voices = [
    { voice_id: 'en-GB-RyanNeural', type: 'tts', tts_engine: 'azure', display_name: 'Ryan', languages: ['eng'], is_active: true },
    { voice_id: 'en-GB-MiaNeural', type: 'tts', tts_engine: 'azure', display_name: 'Mia', languages: ['eng'], is_active: true },
    { voice_id: ARAN, type: 'tts', tts_engine: 'cartesia', display_name: 'aran_english_003', languages: ['en'], is_active: true },
  ]

  it('offers the clone for the GUIDE slot, first, not eighteenth', () => {
    const guide = registry.guideCandidates({
      code: 'eng', voices, guideRoles: [], voiceById: new Map(voices.map((v) => [v.voice_id, v])), inUse: [], catalogue,
    })
    expect(guide[0].voiceId).toBe(ARAN)
    expect(guide[0].owned).toBe(true)
  })

  it('marks it owned in the PHRASE list too, and puts it first there', () => {
    const lang = registry.describeLanguage({
      code: 'eng', langCourses: [{ course_code: 'cym_for_eng', target_lang: 'eng', known_lang: 'cym' }],
      roles: [], voiceById: new Map(voices.map((v) => [v.voice_id, v])), voices, catalogue,
    })
    expect(lang.candidates[0].voiceId).toBe(ARAN)
    expect(lang.candidates[0].owned).toBe(true)
  })

  it('RETIRING a clone beats owning it — a deactivated row does not walk back in from the catalogue', () => {
    const retired = voices.map((v) => (v.voice_id === ARAN ? { ...v, is_active: false } : v))
    const lang = registry.describeLanguage({
      code: 'eng', langCourses: [{ course_code: 'cym_for_eng', target_lang: 'eng', known_lang: 'cym' }],
      roles: [], voiceById: new Map(retired.map((v) => [v.voice_id, v])), voices: retired, catalogue,
    })
    expect(lang.candidates.some((c) => c.voiceId === ARAN)).toBe(false)
    const guide = registry.guideCandidates({
      code: 'eng', voices: retired, guideRoles: [], voiceById: new Map(retired.map((v) => [v.voice_id, v])), inUse: [], catalogue,
    })
    expect(guide.some((c) => c.voiceId === ARAN)).toBe(false)
  })
})

/**
 * ── ROOM FOR THREE PER GENDER, AND COMPLETENESS DOES NOT MOVE ──────────────
 *
 * Tom, 2026-09-20: "I think we should probably have a space for up to 3
 * male/female voices - for the future of when PODS have more voices - we may as
 * well have those as optional". Optional is the load-bearing word: the extra
 * ranks are capacity, and a language with four more empty slots must read
 * exactly as complete as it did with two.
 */
describe('three phrase ranks per gender, optional (Tom, 2026-09-20)', () => {
  const voices = [
    { voice_id: 'm1', type: 'tts', tts_engine: 'cartesia', display_name: 'M1', gender: 'm', languages: ['spa'], is_active: true },
    { voice_id: 'f1', type: 'tts', tts_engine: 'cartesia', display_name: 'F1', gender: 'f', languages: ['spa'], is_active: true },
  ]
  const lang = () => registry.describeLanguage({
    code: 'spa',
    langCourses: [{ course_code: 'spa_for_eng', target_lang: 'spa', known_lang: 'eng' }],
    roles: [
      { slot: 'phrase', gender: 'm', rank: 0, voice_id: 'm1' },
      { slot: 'phrase', gender: 'f', rank: 0, voice_id: 'f1' },
    ],
    voiceById: new Map(voices.map((v) => [v.voice_id, v])), voices, catalogue: {},
  })

  it('draws three male and three female slots', () => {
    expect(lang().slots.m).toHaveLength(3)
    expect(lang().slots.f).toHaveLength(3)
  })

  it('still reads COMPLETE on the two primaries alone — the rule Tom did not change', () => {
    const l = lang()
    expect(l.status).toBe('complete')
    expect(l.required).toBe(2)
    expect(l.filled).toBe(2)
  })

  it('leaves the GUIDE at two ranks — a guide is one voice, not a pod cast', () => {
    expect(lang().guide.slots).toHaveLength(2)
  })
})

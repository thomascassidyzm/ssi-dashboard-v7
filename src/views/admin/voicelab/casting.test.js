/**
 * THE CASTING RULES, PINNED. Each test is one of Tom's 2026-09-19 sentences.
 * Run: npx vitest run src/views/admin/voicelab/casting.test.js
 */
import { describe, it, expect } from 'vitest'
import {
  ROLES, isAmericanEnglish, shelfFor, accentsOf, filterShelf, rolesFor, cloneLabel,
  stageRole, stageClear, unstageRole, stagedCount, castFacts, podFacts, rowSummary, isFixedEnglish, podVoiceOf,
  POD_ROLES, stageHouseEnglish, stagedEntry, isStagedOn, FIXED_ENGLISH,
} from './casting'

const cart = (id, extra = {}) => ({ voiceId: `cartesia_${id}`, name: `${id} — Cartesia`, kind: 'cartesia', engine: 'cartesia', gender: 'f', accent: 'british', accentLocale: 'en-GB', ...extra })
const azure = (id, extra = {}) => ({ voiceId: `azure_${id}`, name: id, kind: 'azure', engine: 'azure', gender: null, ...extra })

describe('"we do NOT use American English for any voices"', () => {
  it('excludes every voice whose native locale is en-US, whatever the accent is called', () => {
    for (const accent of ['general-american', 'southern-us', 'new-york', 'california', 'arabic-english']) {
      expect(isAmericanEnglish({ accent, accentLocale: 'en-US' })).toBe(true)
    }
  })
  it('keeps British, Australian, Irish, Indian and every other English', () => {
    expect(isAmericanEnglish({ accent: 'british', accentLocale: 'en-GB' })).toBe(false)
    expect(isAmericanEnglish({ accent: 'australian', accentLocale: 'en-AU' })).toBe(false)
    expect(isAmericanEnglish({ accent: 'indian-english', accentLocale: 'en-IN' })).toBe(false)
  })
  it('does not exclude a British voice merely because it can be steered into en-US', () => {
    expect(isAmericanEnglish({ accent: 'british', accentLocale: 'en-GB', otherAccents: ['general-american'] })).toBe(false)
  })
  it('never reaches the shelf', () => {
    const lang = { candidates: [cart('a', { accent: 'general-american', accentLocale: 'en-US' }), cart('b')] }
    expect(shelfFor(lang).voices.map((v) => v.voiceId)).toEqual(['cartesia_b'])
  })
})

describe('"Cartesia … with Azure as fallback for any Cartesia voices that don\'t exist for that language"', () => {
  it('shows only Cartesia when Cartesia has a voice, owned clones first', () => {
    const lang = { candidates: [azure('it-IT-ElsaNeural'), cart('stock'), cart('mine', { owned: true })] }
    const shelf = shelfFor(lang)
    expect(shelf.provider).toBe('cartesia')
    expect(shelf.fallback).toBe(false)
    expect(shelf.voices.map((v) => v.voiceId)).toEqual(['cartesia_mine', 'cartesia_stock'])
  })
  it('falls to Azure only when there is no Cartesia voice at all', () => {
    const lang = { candidates: [azure('cy-GB-NiaNeural'), { voiceId: 'elevenlabs_x', kind: 'elevenlabs', engine: 'elevenlabs' }] }
    const shelf = shelfFor(lang)
    expect(shelf.provider).toBe('azure')
    expect(shelf.fallback).toBe(true)
    expect(shelf.voices.map((v) => v.voiceId)).toEqual(['azure_cy-GB-NiaNeural'])
  })
})

describe('"select from Cartesia by Language + gender + accent"', () => {
  const voices = [
    cart('a', { gender: 'f', accent: 'castilian' }), cart('b', { gender: 'm', accent: 'castilian' }),
    cart('c', { gender: 'm', accent: 'mexican', description: 'A warm narrator from Guadalajara' }), cart('d', { gender: null, accent: null }),
  ]
  it('lists every accent the language has, most common first, blanks last', () => {
    expect(accentsOf(voices).map((a) => a.accent)).toEqual(['castilian', 'mexican', ''])
  })
  it('filters by gender without hiding a voice whose gender the vendor left blank', () => {
    expect(filterShelf(voices, { gender: 'm' }).map((v) => v.voiceId)).toEqual(['cartesia_b', 'cartesia_c', 'cartesia_d'])
  })
  it('filters by accent and searches the vendor description', () => {
    expect(filterShelf(voices, { accent: 'mexican' }).map((v) => v.voiceId)).toEqual(['cartesia_c'])
    expect(filterShelf(voices, { query: 'guadalajara' }).map((v) => v.voiceId)).toEqual(['cartesia_c'])
  })
})

describe('a clone with no vendor display name is still findable by search (Tom, 2026-09-20: searched "aran", got nothing)', () => {
  const aran = { voiceId: 'cartesia_33890587-a29f-4416-ba61-2615c74f92fe', name: 'aran_english_003 — this estate\'s Cartesia clone', kind: 'cartesia', engine: 'cartesia', gender: 'm', owned: true }
  it('humanises a slug-shaped vendor name into "Person (clone)"', () => {
    expect(cloneLabel(aran)).toBe('Aran (clone)')
  })
  it('leaves a real vendor name untouched', () => {
    expect(cloneLabel({ name: 'Skylar — Cartesia' })).toBe('Skylar')
  })
  it('searches the raw voiceId when the display name does not contain it', () => {
    const clone = cart('aran_english_003', { name: 'Private voice', owned: true })
    const query = 'aran_english_003'
    expect(clone.name.toLowerCase()).not.toContain(query)
    expect(filterShelf([clone, cart('other')], { query })).toEqual([clone])
  })
  it('searches the humanised clone label absent from the raw name and voiceId', () => {
    const clone = { ...aran, name: 'aran_english_003' }
    const query = 'Aran (clone)'
    expect(clone.name.toLowerCase()).not.toContain(query.toLowerCase())
    expect(clone.voiceId.toLowerCase()).not.toContain(query.toLowerCase())
    expect(cloneLabel(clone)).toBe(query)
    expect(filterShelf([clone, cart('other')], { query })).toEqual([clone])
  })
})

describe('"I can\'t edit any of the voice assignments here" — English is cast like every other language', () => {
  const eng = {
    code: 'eng', knownCourses: 2,
    slots: { m: [{ rank: 0, filled: true, filledBy: null, voiceId: FIXED_ENGLISH.male.voiceId, voiceName: 'tom_001', engine: 'cartesia', active: true }, { rank: 1, filled: true, voiceId: 'cartesia_daniel', voiceName: 'Daniel', engine: 'cartesia', active: true }], f: [{ rank: 0, filled: true, voiceId: FIXED_ENGLISH.female.voiceId, voiceName: 'Gemma', engine: 'cartesia', active: true }] },
    guide: { slots: [] },
  }
  const podRow = { language: 'eng', human: false, slots: [{ gender: 'f', pick: null }, { gender: 'm', pick: null }] }

  it('still knows which language the house cast belongs to', () => {
    expect(isFixedEnglish('eng')).toBe(true)
    expect(isFixedEnglish('spa_mx')).toBe(false)
  })
  it('no longer reads as a settled, unchangeable fact — it states its real cast like any row', () => {
    expect(rowSummary(eng, podRow)).not.toMatch(/Fixed:/)
    expect(rowSummary(eng, podRow)).toMatch(/Male and female cast/)
  })
  it('offers English the same role targets as anywhere else, second male included', () => {
    expect(rolesFor(cart('aran', { gender: 'm' }), eng).map((r) => r.key)).toEqual(['male', 'male2', 'guide'])
  })
  it('the house cast is a one-tap reset that stages the three voices, and stages nothing it does not change', () => {
    const facts = castFacts(eng)
    const staged = stageHouseEnglish({ slots: {}, picks: {} }, { podRow, langName: 'English', facts })
    // male and female already hold the house voice: only the second male moves.
    expect(Object.keys(staged.slots)).toEqual(['phrase:m:1'])
    expect(staged.slots['phrase:m:1']).toMatchObject({ action: 'cast', voiceId: FIXED_ENGLISH.male2.voiceId })
    // the pod has no pick yet, so the house male and female are staged there too.
    expect(staged.picks.m.voice.voice_id).toBe(FIXED_ENGLISH.male.voiceId.replace('cartesia_', ''))
    expect(staged.picks.f.voice.voice_id).toBe(FIXED_ENGLISH.female.voiceId.replace('cartesia_', ''))
  })
  it('stages nothing at all once everything already holds the house cast', () => {
    const full = { ...eng, slots: { ...eng.slots, m: [eng.slots.m[0], { rank: 1, filled: true, voiceId: FIXED_ENGLISH.male2.voiceId, voiceName: 'aran_english_003', engine: 'cartesia', active: true }] } }
    const pods = { language: 'eng', human: false, slots: [{ gender: 'f', pick: { provider: 'cartesia', voice_id: FIXED_ENGLISH.female.voiceId.replace('cartesia_', '') } }, { gender: 'm', pick: { provider: 'cartesia', voice_id: FIXED_ENGLISH.male.voiceId.replace('cartesia_', '') } }] }
    expect(stagedCount(stageHouseEnglish({ slots: {}, picks: {} }, { podRow: pods, facts: castFacts(full) }))).toBe(0)
  })
})

describe('the pod voice is pickable in its own right, without miscasting a course', () => {
  const lang = { code: 'ita', knownCourses: 1 }
  const podRow = { language: 'ita', human: false, slots: [{ gender: 'f', pick: { provider: 'xai', voice_id: 'Ara' } }, { gender: 'm', pick: null }] }
  const podFemale = () => (POD_ROLES || []).find((r) => r.key === 'podFemale')

  it('offers pod targets only where there is a pod, and only of the voice\'s own gender', () => {
    expect(rolesFor(cart('bella', { gender: 'f' }), lang, podRow).map((r) => r.key)).toEqual(['female', 'guide', 'podFemale'])
    expect(rolesFor(cart('bella', { gender: 'f' }), lang).map((r) => r.key)).toEqual(['female', 'guide'])
    expect(rolesFor(cart('bella', { gender: 'f' }), lang, { ...podRow, human: true }).map((r) => r.key)).toEqual(['female', 'guide'])
  })
  it('writes the pick and NOT the phrase slot, so the course cast is untouched', () => {
    const staged = stageRole(null, podFemale(), cart('bella', { name: 'Bella — Cartesia' }), { podRow, langName: 'Italian' })
    expect(staged.slots).toEqual({})
    expect(staged.picks.f).toMatchObject({ action: 'pick', voice: { provider: 'cartesia', voice_id: 'bella' }, expect: { voice_id: 'Ara' } })
    expect(stagedCount(staged)).toBe(1)
    expect(isStagedOn(staged, podFemale(), cart('bella'))).toBe(true)
    expect(isStagedOn(staged, podFemale(), cart('other'))).toBe(false)
    expect(stagedEntry(unstageRole(staged, podFemale()), podFemale())).toBe(null)
  })
  it('a MALE or FEMALE cast still writes the pod pick too — the coupling is not decoupled', () => {
    const female = ROLES.find((r) => r.key === 'female')
    const staged = stageRole(null, female, cart('bella'), { podRow })
    expect(Object.keys(staged.slots)).toEqual(['phrase:f:0'])
    expect(staged.picks.f.action).toBe('pick')
  })
})

describe('one tap casts a role — and a MALE or FEMALE tap is one decision written to both records', () => {
  const lang = { code: 'ita', knownCourses: 1 }
  const podRow = { language: 'ita', human: false, slots: [{ gender: 'f', pick: { provider: 'xai', voice_id: 'Ara', name: 'Ara' } }, { gender: 'm', pick: null }] }
  const female = ROLES.find((r) => r.key === 'female')
  const male2 = ROLES.find((r) => r.key === 'male2')

  it('stages the phrase slot AND the pod pick, carrying the current pick as the stale-tab guard', () => {
    const staged = stageRole(null, female, cart('bella', { name: 'Bella — Cartesia' }), { podRow, langName: 'Italian' })
    expect(staged.slots['phrase:f:0']).toMatchObject({ action: 'cast', voiceId: 'cartesia_bella', slot: { slot: 'phrase', gender: 'f', rank: 0 } })
    expect(staged.picks.f).toMatchObject({ action: 'pick', voice: { provider: 'cartesia', voice_id: 'bella', name: 'Bella' }, expect: { voice_id: 'Ara' } })
    expect(stagedCount(staged)).toBe(2)
  })
  it('a second male is a course slot only — the pod has one male voice', () => {
    const staged = stageRole(null, male2, cart('marco', { gender: 'm' }), { podRow })
    expect(Object.keys(staged.slots)).toEqual(['phrase:m:1'])
    expect(staged.picks).toEqual({})
  })
  it('clearing the female clears the pod pick too, and unstaging takes both back', () => {
    let staged = stageClear(null, female, { podRow })
    expect(staged.slots['phrase:f:0'].action).toBe('clear')
    expect(staged.picks.f.action).toBe('clear')
    staged = unstageRole(staged, female)
    expect(stagedCount(staged)).toBe(0)
  })
  it('never writes a pod pick for a human-recorded language', () => {
    const staged = stageRole(null, female, cart('x'), { podRow: { ...podRow, human: true } })
    expect(staged.picks).toEqual({})
  })
  it('offers a voice only the roles its gender fits, and the guide only on a known language', () => {
    expect(rolesFor(cart('f', { gender: 'f' }), lang).map((r) => r.key)).toEqual(['female', 'guide'])
    expect(rolesFor(cart('m', { gender: 'm' }), { code: 'ita', knownCourses: 0 }).map((r) => r.key)).toEqual(['male', 'male2'])
    expect(rolesFor(cart('u', { gender: null }), { code: 'ita', knownCourses: 0 }).map((r) => r.key)).toEqual(['male', 'female', 'male2'])
  })
  it('spells the pod voice bare with its provider beside it', () => {
    expect(podVoiceOf(azure('it-IT-ElsaNeural', { name: 'Elsa' }))).toEqual({ provider: 'azure', voice_id: 'it-IT-ElsaNeural', name: 'Elsa' })
  })
})

describe('every row states plainly what is cast', () => {
  it('a cast slot is a name and a provider; an empty one says "nothing cast"', () => {
    const lang = { knownCourses: 0, slots: { m: [{ rank: 0, filled: true, voiceName: 'Feng', engine: 'cartesia', active: true }, { rank: 1, filled: false }], f: [{ rank: 0, filled: false }, { rank: 1, filled: false }] }, guide: { slots: [] } }
    const f = castFacts(lang)
    expect(f.male.text).toBe('Feng · Cartesia')
    expect(f.female.text).toBe('nothing cast')
    expect(f.male2.state).toBe('empty')
    expect(f.guide.state).toBe('na')
  })
  it('the pod shows what it speaks today and what is picked as two facts', () => {
    const pod = podFacts({ state: 'held', human: false, slots: [{ gender: 'f', cast: [{ voice: { provider: 'xai', voice_id: 'Ara', name: 'Ara' }, speakers: ['A'] }], pick: { provider: 'cartesia', voice_id: 'b', name: 'Bella' }, drifted: true }] })
    expect(pod.text).toMatch(/held/)
    expect(pod.genders[0].speaking[0]).toMatchObject({ name: 'Ara', provider: 'xAI' })
    expect(pod.genders[0].pick).toMatchObject({ name: 'Bella', provider: 'Cartesia' })
    expect(pod.genders[0].drifted).toBe(true)
  })
})

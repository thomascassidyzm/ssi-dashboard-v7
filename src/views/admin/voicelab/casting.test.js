/**
 * THE CASTING RULES, PINNED. Each test is one of Tom's 2026-09-19 sentences.
 * Run: npx vitest run src/views/admin/voicelab/casting.test.js
 */
import { describe, it, expect } from 'vitest'
import {
  ROLES, isAmericanEnglish, shelfFor, accentsOf, filterShelf, rolesFor, cloneLabel, castRolesOf, castFacts,
  stageRole, stageClear, unstageRole, stagedCount, podFacts, rowSummary, isFixedEnglish, podVoiceOf,
  POD_ROLES, stageHouseEnglish, stagedEntry, isStagedOn, FIXED_ENGLISH, sortRows, inheritedFrom,
  regionNote, localeOf,
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
  it('shows a clone by its id-bearing name, exactly as the cast slot does', () => {
    expect(cloneLabel(aran)).toBe('aran_english_003')
    expect(cloneLabel({ name: 'tom_001', owned: true })).not.toBe(cloneLabel({ name: 'tom_002', owned: true }))
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

describe('the list marks the row that is cast in each slot (Tom, 2026-09-30: Charlotte cast Female, not findable)', () => {
  const lang = { knownCourses: 0, slots: { f: [{ rank: 0, filled: true, voiceId: 'cartesia_charlotte', voiceName: 'Charlotte', engine: 'cartesia', active: true }], m: [] }, guide: { slots: [] } }
  it('names every role holding a voice, and none for an uncast one', () => {
    const facts = castFacts(lang)
    expect(castRolesOf(facts, 'cartesia_charlotte').map((r) => r.label)).toEqual(['Female'])
    expect(castRolesOf(facts, 'cartesia_other')).toEqual([])
  })
})

describe('a language variety is its own row, and a copied voice says so (Tom, 2026-10-03)', () => {
  const slot = (voiceId, gender = 'm', rank = 0) => ({ rank, filled: true, voiceId, voiceName: voiceId, engine: 'cartesia', active: true, gender })
  const fra = { code: 'fra', courses: 4, released: 1, slots: { m: [slot('cartesia_a')], f: [slot('cartesia_b', 'f')] } }
  const ca = { code: 'fra_ca', dialectOf: 'fra', courses: 1, released: 0, slots: { m: [slot('cartesia_a')], f: [slot('cartesia_z', 'f')] } }
  it('marks a variety voice identical to its base as inherited, not picked', () => {
    const f = castFacts(ca, fra)
    expect(f.male.inherited).toEqual({ from: 'fra' })
    expect(f.female.inherited).toBe(null)
  })
  it('never marks anything inherited without a base', () => {
    expect(castFacts(ca).male.inherited).toBe(null)
    expect(inheritedFrom(fra, fra, ROLES[0])).toBe(false)
  })
  it('sits a variety directly under its base, not at the bottom of the list', () => {
    const spa = { code: 'spa', courses: 3, released: 1, slots: {} }
    const out = sortRows([ca, spa, fra], (l) => l.code).map((l) => l.code)
    expect(out).toEqual(['fra', 'fra_ca', 'spa'])
  })
})

describe('a variety finds its own regional voices (Tom, 2026-10-03: "the voices are usually named like CA")', () => {
  const fr = (id, locale, extra = {}) => cart(id, { accent: null, accentLocale: locale, ...extra })
  const az = (id) => ({ voiceId: id, name: id.split('-')[2].replace('Neural', ''), kind: 'azure', engine: 'azure', gender: null })
  const quebec = (candidates) => ({ code: 'fra_ca', dialectOf: 'fra', dialectName: 'Quebec French', regionLocales: ['fr-CA'], candidates })

  it('lists the fr-CA voices first, tagged, then the base-language voices', () => {
    const shelf = shelfFor(quebec([fr('paris', 'fr-FR'), fr('montreal', 'fr-CA'), fr('lyon', 'fr-FR')]))
    expect(shelf.voices.map((v) => v.voiceId)).toEqual(['cartesia_montreal', 'cartesia_paris', 'cartesia_lyon'])
    expect(shelf.voices[0]).toMatchObject({ regional: true, locale: 'fr-CA' })
    expect(shelf.voices[1].regional).toBeUndefined()
  })

  it('offers Azure regional voices only for a locale Cartesia has none of', () => {
    const withBoth = shelfFor(quebec([fr('montreal', 'fr-CA'), az('fr-CA-SylvieNeural')]))
    expect(withBoth.voices.map((v) => v.voiceId)).toEqual(['cartesia_montreal'])
    const azureOnly = shelfFor({ code: 'ara_eg', dialectOf: 'ara', regionLocales: ['ar-EG'], candidates: [cart('gulf', { accentLocale: 'ar-AE' }), az('ar-EG-SalmaNeural')] })
    expect(azureOnly.voices[0]).toMatchObject({ voiceId: 'ar-EG-SalmaNeural', regional: true, locale: 'ar-EG' })
    expect(regionNote({ code: 'ara_eg', dialectOf: 'ara', regionLocales: ['ar-EG'] }, azureOnly)).toMatch(/Cartesia has none/)
    // a server that never loaded Cartesia's catalogue must not claim Cartesia has none
    const blind = { code: 'fra_ca', dialectOf: 'fra', regionLocales: ['fr-CA'], candidates: [cart('x', { accentLocale: null }), az('fr-CA-SylvieNeural')] }
    expect(regionNote(blind, shelfFor(blind))).toMatch(/not loaded on this server/)
  })

  it('says so out loud when neither provider has the locale, and when the variety has no locale at all', () => {
    const lang = { code: 'ara_sy', dialectOf: 'ara', regionLocales: ['ar-SY'], candidates: [cart('gulf', { accentLocale: 'ar-AE' })] }
    expect(regionNote(lang, shelfFor(lang))).toMatch(/No ar-SY voice registered in Popty from Cartesia or Azure/)
    const welsh = { code: 'cym_north', dialectOf: 'cym', dialectName: 'North Welsh', regionLocales: [], candidates: [] }
    expect(regionNote(welsh, shelfFor(welsh))).toMatch(/no locale of its own/)
    expect(regionNote({ code: 'fra', dialectOf: null }, null)).toBeNull()
  })

  it('reads an Azure voice\'s locale off its id', () => {
    expect(localeOf(az('fr-CA-SylvieNeural'))).toBe('fr-CA')
    expect(localeOf(az('azure_fr-CA-SylvieNeural'))).toBe('fr-CA')
    expect(localeOf({ voiceId: 'cartesia_x' })).toBeNull()
  })

  it('leaves a plain language exactly as it was', () => {
    const lang = { code: 'fra', dialectOf: null, candidates: [fr('paris', 'fr-FR'), fr('montreal', 'fr-CA')] }
    expect(shelfFor(lang).voices.map((v) => v.voiceId)).toEqual(['cartesia_paris', 'cartesia_montreal'])
  })
})

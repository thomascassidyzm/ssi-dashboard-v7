// Unit tests for the audio fallback resolver — "ALWAYS PLAY WHAT IT HAS".
// Run: npx vitest run services/shared/audio-fallback-resolver.test.js
import { describe, it, expect } from 'vitest'
import { resolveAudio, resolveAudioBatch, looseKey, isAlive } from './audio-fallback-resolver.cjs'
import { normalizeForAudio } from './text-normalize.cjs'

// The DB trigger's normaliser, reproduced for the convergence test:
//   normalize_text(t) = rtrim(lower(trim(t)), '.?!¿¡。？！')
const dbNormalize = (t) => t.toLowerCase().trim().replace(/[.?!¿¡。！？]+$/, '')

const clip = (over = {}) => ({
  id: 'A',
  s3_key: 'mastered/A.mp3',
  text: 'hello',
  language: 'eng',
  role: 'known',
  origin: 'tts',
  created_at: '2026-01-01T00:00:00Z',
  ...over
})

describe('resolveAudio — tier 1: the link', () => {
  it('a linked-and-alive clip resolves to itself', () => {
    const linked = clip({ id: 'LINKED', s3_key: 'mastered/LINKED.mp3' })
    const r = resolveAudio({
      linkedRow: linked,
      candidates: [clip({ id: 'OTHER' })],
      text: 'hello',
      language: 'eng',
      role: 'known'
    })
    expect(r.tier).toBe('linked')
    expect(r.audioId).toBe('LINKED')
    expect(r.s3Key).toBe('mastered/LINKED.mp3')
  })

  it('a linked row with a null/missing s3_key falls THROUGH to the match tier, never to a dead link', () => {
    const dead = clip({ id: 'DEAD', s3_key: null })
    const live = clip({ id: 'LIVE', s3_key: 'mastered/LIVE.mp3' })
    const r = resolveAudio({ linkedRow: dead, candidates: [live], text: 'hello', language: 'eng', role: 'known' })
    expect(r.tier).toBe('preferred-match')
    expect(r.audioId).toBe('LIVE')
    expect(r.reason).toMatch(/no live s3_key/)

    // and the same when s3_key is absent entirely
    const missing = { id: 'MISSING', text: 'hello', language: 'eng', role: 'known' }
    expect(resolveAudio({ linkedRow: missing, candidates: [live], text: 'hello', language: 'eng', role: 'known' }).audioId).toBe('LIVE')
  })

  it('a pending/ placeholder is not alive — it is a slot, not a clip', () => {
    const pending = clip({ id: 'PENDING', s3_key: 'pending/abc.mp3' })
    expect(isAlive(pending)).toBe(false)
    const live = clip({ id: 'LIVE', s3_key: 'mastered/LIVE.mp3' })
    const r = resolveAudio({ linkedRow: pending, candidates: [live, pending], text: 'hello', language: 'eng', role: 'known' })
    expect(r.tier).toBe('preferred-match')
    expect(r.audioId).toBe('LIVE')
  })
})

describe('resolveAudio — tier 2: the preferred match (Azure beats silence)', () => {
  it('an UNLINKED but present Azure clip resolves to THAT clip, not to nothing', () => {
    const azure = clip({ id: 'AZURE-OLD', voice_id: 'azure-en-GB-Libby', s3_key: 'mastered/AZURE.mp3', created_at: '2025-03-01T00:00:00Z' })
    const r = resolveAudio({ linkedRow: null, candidates: [azure], text: 'hello', language: 'eng', role: 'known' })
    expect(r.tier).toBe('preferred-match')
    expect(r.audioId).toBe('AZURE-OLD')
    expect(r.s3Key).toBe('mastered/AZURE.mp3')
  })

  it('a voice that is NOT the course-configured voice still wins over silence', () => {
    // resolver never filters on voice_id at all — that is the whole point
    const wrongVoice = clip({ id: 'WRONG-VOICE', voice_id: 'some_retired_voice' })
    const r = resolveAudio({ linkedRow: null, candidates: [wrongVoice], text: 'hello', language: 'eng', role: 'known' })
    expect(r.tier).toBe('preferred-match')
    expect(r.audioId).toBe('WRONG-VOICE')
  })

  it('a human recording beats a newer TTS row', () => {
    const human = clip({ id: 'HUMAN', origin: 'human', created_at: '2025-01-01T00:00:00Z' })
    const newerTts = clip({ id: 'TTS', origin: 'tts', created_at: '2026-06-01T00:00:00Z' })
    expect(resolveAudio({ linkedRow: null, candidates: [human, newerTts], text: 'hello', language: 'eng', role: 'known' }).audioId).toBe('HUMAN')
    // order-independent
    expect(resolveAudio({ linkedRow: null, candidates: [newerTts, human], text: 'hello', language: 'eng', role: 'known' }).audioId).toBe('HUMAN')
  })

  it('matches only within the same language and role', () => {
    const wrongLang = clip({ id: 'FR', language: 'fra' })
    const wrongRole = clip({ id: 'T1', role: 'target1' })
    const r = resolveAudio({ linkedRow: null, candidates: [wrongLang, wrongRole], text: 'hello', language: 'eng', role: 'known' })
    expect(r.tier).toBe('none')
  })

  it('an exact match outranks a loose match', () => {
    const looseOnly = clip({ id: 'LOOSE', text: undefined, text_normalized: 'are you sure' })
    const exact = clip({ id: 'EXACT', text: 'Are you sure?', origin: 'tts', created_at: '2020-01-01T00:00:00Z' })
    const r = resolveAudio({ linkedRow: null, candidates: [looseOnly, exact], text: 'are you sure?', language: 'eng', role: 'known' })
    expect(r.tier).toBe('preferred-match')
    expect(r.audioId).toBe('EXACT')
  })
})

describe('resolveAudio — tier 3: the normaliser-disagreement (loose) tier', () => {
  it("content 'are you sure?' resolves to a row stored as text_normalized 'are you sure'", () => {
    // This is the 154,257-row defect: the DB trigger rtrims '?', the JS normaliser keeps it.
    const stripped = clip({ id: 'Q-STRIPPED', text: undefined, text_normalized: 'are you sure', s3_key: 'mastered/Q.mp3' })
    expect(normalizeForAudio('are you sure?')).toBe('are you sure?')      // JS keeps the ?
    expect(stripped.text_normalized).toBe('are you sure')                  // DB stripped it

    const r = resolveAudio({ linkedRow: null, candidates: [stripped], text: 'are you sure?', language: 'eng', role: 'known' })
    expect(r.tier).toBe('loose-match')
    expect(r.audioId).toBe('Q-STRIPPED')
    expect(r.s3Key).toBe('mastered/Q.mp3')
    expect(r.reason).toMatch(/normaliser disagreement/)
  })

  it('the loose key is convergent across BOTH normalisers (the property the tier relies on)', () => {
    for (const t of ['Are you sure?', '  ARE   you  sure ?! ', 'Vraiment?', '¿Estás seguro?', 'そうですか。']) {
      expect(looseKey(t)).toBe(looseKey(dbNormalize(t)))
      expect(looseKey(t)).toBe(looseKey(normalizeForAudio(t)))
    }
  })

  it('whitespace-only disagreement is repaired at the EXACT tier, not demoted to loose', () => {
    // The DB normaliser does not collapse internal whitespace; the JS one does.
    // Re-running normalizeForAudio over a stored text_normalized fixes that
    // without spending the loose tier's ?-intonation risk.
    const dbRow = clip({ id: 'WS', text: undefined, text_normalized: 'hello   there' })
    const r = resolveAudio({ linkedRow: null, candidates: [dbRow], text: 'Hello there.', language: 'eng', role: 'known' })
    expect(r.tier).toBe('preferred-match')
    expect(r.audioId).toBe('WS')
  })

  it('allowLooseMatch:false restores link-pass strictness (a question never takes flat audio)', () => {
    const stripped = clip({ id: 'Q-STRIPPED', text: undefined, text_normalized: 'are you sure' })
    const r = resolveAudio({ linkedRow: null, candidates: [stripped], text: 'are you sure?', language: 'eng', role: 'known', allowLooseMatch: false })
    expect(r.tier).toBe('none')
  })

  it('human still beats newer TTS inside the loose tier', () => {
    const human = clip({ id: 'H', text: undefined, text_normalized: 'are you sure', origin: 'human', created_at: '2024-01-01T00:00:00Z' })
    const tts = clip({ id: 'T', text: undefined, text_normalized: 'are you sure', origin: 'tts', created_at: '2026-06-01T00:00:00Z' })
    expect(resolveAudio({ linkedRow: null, candidates: [tts, human], text: 'are you sure?', language: 'eng', role: 'known' }).audioId).toBe('H')
  })
})

describe('resolveAudio — tier 4: none means SKIP THIS ITEM ONLY', () => {
  it('a genuinely absent clip resolves to tier none, without throwing', () => {
    const r = resolveAudio({ linkedRow: null, candidates: [], text: 'nothing exists for this', language: 'eng', role: 'known' })
    expect(r.tier).toBe('none')
    expect(r.audioId).toBeNull()
    expect(r.s3Key).toBeNull()
    expect(r.reason).toMatch(/skip this item only/)
  })

  it('survives junk input rather than throwing', () => {
    expect(resolveAudio().tier).toBe('none')
    expect(resolveAudio({ text: '   ', candidates: null }).tier).toBe('none')
    expect(resolveAudio({ text: 'hi', candidates: [null, undefined, {}] }).tier).toBe('none')
  })

  it('NO TRUNCATION: a missing middle item does not disturb its neighbours', () => {
    const candidates = [
      clip({ id: 'C1', text: 'one' }),
      clip({ id: 'C3', text: 'three', text_normalized: undefined }),
      clip({ id: 'C4', text: undefined, text_normalized: 'four' }) // loose-only
    ]
    const items = [
      { text: 'one', linkedRow: clip({ id: 'LINK1', s3_key: 'mastered/LINK1.mp3' }) }, // linked
      { text: 'two' },                                                                  // absent
      { text: 'three' },                                                                // preferred-match
      { text: 'four?' },                                                                // loose-match
      { text: 'five' }                                                                  // absent
    ]
    const out = resolveAudioBatch(items, { candidates, language: 'eng', role: 'known' })

    expect(out).toHaveLength(items.length)                       // same length in, same length out
    expect(out.map(r => r.tier)).toEqual(['linked', 'none', 'preferred-match', 'loose-match', 'none'])
    expect(out.map(r => r.audioId)).toEqual(['LINK1', null, 'C3', 'C4', null])

    // what the player actually queues: the gaps drop out, the round plays on
    const playable = out.filter(r => r.tier !== 'none')
    expect(playable.map(r => r.audioId)).toEqual(['LINK1', 'C3', 'C4'])
  })
})

// ---------------------------------------------------------------------------
// Tom's ruling, 2026-08-06: severity is per-ROLE, and the resolver must FIGHT
// HARDEST for LEGOs — silence there is course-breaking, not cosmetic.
// ---------------------------------------------------------------------------
describe('fight hardest for LEGOs', () => {
  const azureLoose = {
    id: 'az1', s3_key: 'mastered/az1.mp3', text: 'are you sure',
    language: 'fra', role: 'target1', origin: 'tts', created_at: '2026-01-01'
  }

  it('a LEGO target slot takes the loose tier even when the caller forbids it', () => {
    const r = resolveAudio({
      linkedRow: null, candidates: [azureLoose], text: 'are you sure?',
      language: 'fra', role: 'target1', slotKind: 'lego', allowLooseMatch: false
    })
    expect(r.tier).toBe('loose-match')
    expect(r.audioId).toBe('az1')
  })

  it('a practice phrase still honours link-pass strictness', () => {
    const r = resolveAudio({
      linkedRow: null, candidates: [azureLoose], text: 'are you sure?',
      language: 'fra', role: 'target1', slotKind: 'phrase', allowLooseMatch: false
    })
    expect(r.tier).toBe('none')
  })

  it('an unresolved LEGO voice-2 slot is reported course-breaking', () => {
    const r = resolveAudio({
      linkedRow: null, candidates: [], text: 'nothing here',
      language: 'fra', role: 'target2', slotKind: 'lego'
    })
    expect(r.tier).toBe('none')
    expect(r.severity).toBe('course-breaking')
  })

  it('an unresolved practice-phrase slot is only minor', () => {
    const r = resolveAudio({
      linkedRow: null, candidates: [], text: 'nothing here',
      language: 'fra', role: 'target1', slotKind: 'phrase'
    })
    expect(r.severity).toBe('minor')
  })

  it('a resolved slot carries no severity — nothing is broken', () => {
    const live = { id: 'x', s3_key: 'mastered/x.mp3' }
    const r = resolveAudio({ linkedRow: live, text: 'x', slotKind: 'lego', role: 'target1' })
    expect(r.tier).toBe('linked')
    expect(r.severity).toBe('none')
  })
})

// ── canonical language comparison ───────────────────────────────────────────
// sameSlot() used to do a strict `row.language !== language`, which made this
// resolver discard the very rows it exists to rescue: a take stored 'en-GB' is
// the same English clip a slot asking for 'eng' needs, and dropping it means
// the player gets silence while a good take sits in the table.
describe('resolveAudio — language is compared as an identity, not a string', () => {
  it('matches a candidate stored under a different spelling of the same language', () => {
    const candidate = clip({ id: 'C', language: 'en-GB' })
    const r = resolveAudio({
      linkedRow: null,
      candidates: [candidate],
      text: 'hello',
      language: 'eng',
      role: 'known'
    })
    expect(r.audioId).toBe('C')
    expect(r.tier).toBe('preferred-match')
  })

  it('matches in the other direction too (slot BCP-47, row ISO-3)', () => {
    const r = resolveAudio({
      linkedRow: null,
      candidates: [clip({ id: 'C', language: 'eng' })],
      text: 'hello',
      language: 'en-GB',
      role: 'known'
    })
    expect(r.audioId).toBe('C')
  })

  it('ignores region — a fr-CA row satisfies a fra slot, the voice carries the accent', () => {
    const r = resolveAudio({
      linkedRow: null,
      candidates: [clip({ id: 'C', language: 'fr-CA' })],
      text: 'hello',
      language: 'fra',
      role: 'known'
    })
    expect(r.audioId).toBe('C')
  })

  it('still refuses a genuinely different language', () => {
    const r = resolveAudio({
      linkedRow: null,
      candidates: [clip({ id: 'C', language: 'spa' })],
      text: 'hello',
      language: 'eng',
      role: 'known'
    })
    expect(r.tier).toBe('none')
  })

  it('an uncanonicalisable value falls back to exact string equality, never to a guess', () => {
    // Two 'auto' rows are the same slot only because the strings are identical.
    const same = resolveAudio({
      linkedRow: null,
      candidates: [clip({ id: 'C', language: 'auto' })],
      text: 'hello',
      language: 'auto',
      role: 'known'
    })
    expect(same.audioId).toBe('C')

    // 'auto' must NOT be treated as matching a real language.
    const different = resolveAudio({
      linkedRow: null,
      candidates: [clip({ id: 'C', language: 'auto' })],
      text: 'hello',
      language: 'eng',
      role: 'known'
    })
    expect(different.tier).toBe('none')
  })
})

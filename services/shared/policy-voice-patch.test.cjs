// ADD ONE VOICE SLOT without rewriting the list (job #562): every other reader carried over untouched, PUT's rules kept.
//   npx vitest run services/shared/policy-voice-patch.test.cjs
import { describe, it, expect } from 'vitest'
const { addVoiceSlot } = require('./policy-voice-patch.cjs')
const { bucketKey } = require('./dialect.cjs')

const ARAN = { name: 'Aran', gender: 'm', voiceId: 'human_aran_eng', onlyCastOn: true, castOn: [{ courseCode: 'cym_n_for_eng', role: 'known' }] }
const CATRIN = { name: 'Catrin', gender: 'f', voiceId: 'human_catrinlliar_eng', onlyCastOn: true, podEnglishOn: ['cym_n_for_eng', 'cym_s_for_eng'], email: 'Catrin@Example.com' }

describe('addVoiceSlot', () => {
  it('adds the slot and leaves every other reader byte-for-byte', () => {
    const voices = { 'm:known': ARAN }
    const out = addVoiceSlot(voices, 'f:known', CATRIN, bucketKey)
    expect(out.ok).toBe(true)
    expect(JSON.stringify(out.voices['m:known'])).toBe(JSON.stringify(ARAN))
    expect(out.voices['f:known']).toMatchObject({ voiceId: 'human_catrinlliar_eng', gender: 'f', email: 'catrin@example.com', podEnglishOn: ['cym_n_for_eng', 'cym_s_for_eng'] })
    expect(voices['f:known']).toBeUndefined() // the input is not mutated
  })

  it('refuses an occupied slot, a voice already in the list, a contradicting gender, an unknown field, a shared bucket', () => {
    expect(addVoiceSlot({ 'm:known': ARAN }, 'm:known', { voiceId: 'human_x_eng' }, bucketKey)).toMatchObject({ ok: false, status: 409 })
    expect(addVoiceSlot({ 'm:known': ARAN }, 'f', { voiceId: 'human_aran_eng' }, bucketKey)).toMatchObject({ ok: false, status: 409 })
    expect(addVoiceSlot({}, 'f', { voiceId: 'human_x_eng', gender: 'm' }, bucketKey)).toMatchObject({ ok: false, status: 400 })
    expect(addVoiceSlot({}, 'f', { voiceId: 'human_x_eng', human_only: true }, bucketKey)).toMatchObject({ ok: false, status: 400 })
    expect(addVoiceSlot({}, 'x', { voiceId: 'human_x_eng' }, bucketKey)).toMatchObject({ ok: false, status: 400 })
    expect(addVoiceSlot({ f: { voiceId: 'human_a_eng', gender: 'f' } }, 'f:two', { voiceId: 'human_b_eng' }, bucketKey)).toMatchObject({ ok: false, status: 409 })
    // a cast-on-only reader holds no bucket
    expect(addVoiceSlot({ f: { voiceId: 'human_a_eng', gender: 'f' } }, 'f:two', { voiceId: 'human_b_eng', onlyCastOn: true }, bucketKey).ok).toBe(true)
  })
})

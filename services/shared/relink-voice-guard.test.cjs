/**
 * The test that would have caught the Chinese case.
 *
 * zho_for_eng, 2026-08: a repair pass relinked 206 known-side prompts on TEXT
 * alone. 164 of them landed on `gfzdpspr5fdp` — Tom's cloned voice — while
 * courses.voice_config named `azure_en-GB-SoniaNeural`. Nothing failed, nothing
 * logged; the learner just heard the prompt voice change. The first test below
 * is that exact shape: a candidate whose text matches and whose voice does not
 * must NOT be selected.
 */

import { describe, it, expect } from 'vitest'
import {
  bareVoiceId,
  resolveVoices,
  voicesMatch,
  isRelinkAllowed,
  pickVoiceMatchedCandidate,
  RelinkRefusalLedger,
} from './relink-voice-guard.cjs'

// The real zho_for_eng config, as it stands in the live DB.
const ZHO_COURSE = {
  voice_config: {
    voices: {
      known: { name: 'Sonia', voiceId: 'en-GB-SoniaNeural', provider: 'azure' },
      target1: { name: 'Xiaoxiao', voiceId: 'zh-CN-XiaoxiaoMultilingualNeural', provider: 'azure' },
      target2: { name: 'Yunyi', voiceId: 'zh-CN-YunyiMultilingualNeural', provider: 'azure' },
      presentation: { name: 'Sonia', voiceId: 'en-GB-SoniaNeural', provider: 'azure' },
    },
  },
}

describe('THE CHINESE CASE — text matches, voice does not', () => {
  const wanted = resolveVoices(ZHO_COURSE).known
  // Both clips say the same English prompt. Only one is Sonia.
  const sonia = { id: 'clip-sonia', voice_id: 'azure_en-GB-SoniaNeural', text: 'I want to go' }
  const clone = { id: 'clip-clone', voice_id: 'gfzdpspr5fdp', text: 'I want to go' }

  it('resolves the configured known voice the way phase8 writes it', () => {
    expect(wanted).toBe('azure_en-GB-SoniaNeural')
  })

  it('REFUSES the clone even though its text is a perfect match', () => {
    const verdict = isRelinkAllowed({ role: 'known', wantedVoice: wanted, candidate: clone })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toBe('voice-mismatch')
    expect(verdict.candidateVoice).toBe('gfzdpspr5fdp')
  })

  it('does not select the clone when it is the ONLY text match — the 164-clip case', () => {
    const { picked, refusals } = pickVoiceMatchedCandidate({
      role: 'known', wantedVoice: wanted, candidates: [clone],
    })
    // The whole ruling in one assertion: no same-voice clip means NO relink.
    expect(picked).toBeNull()
    expect(refusals).toHaveLength(1)
    expect(refusals[0].verdict.reason).toBe('voice-mismatch')
  })

  it('still selects the configured voice when one exists, clone or no clone', () => {
    const { picked, refusals } = pickVoiceMatchedCandidate({
      role: 'known', wantedVoice: wanted, candidates: [clone, sonia],
    })
    expect(picked.id).toBe('clip-sonia')
    expect(refusals).toHaveLength(1) // the clone was seen and turned away, not ignored
  })

  it('refuses a target-voice clip offered for the known slot', () => {
    const xiaoxiao = { id: 'clip-zh', voice_id: 'azure_zh-CN-XiaoxiaoMultilingualNeural' }
    expect(isRelinkAllowed({ role: 'known', wantedVoice: wanted, candidate: xiaoxiao }).ok).toBe(false)
  })
})

// The real deu_at_for_eng config, as it stands in the live DB: Sasha (they/them)
// is a human voice artist, and a human voiceId ALREADY carries its provider.
const DEU_AT_COURSE = {
  voice_config: {
    voices: {
      known: { name: 'Eve', voiceId: 'eve', provider: 'xai' },
      target1: { name: 'Ingrid', voiceId: 'de-AT-IngridNeural', provider: 'azure' },
      target2: { name: 'Sasha', voiceId: 'human_sasha_wanasky_deu_at', provider: 'human' },
      presentation: { name: 'Eve', voiceId: 'eve', provider: 'xai' },
    },
  },
}

describe('THE SASHA CASE — the artist\'s own clips are not a mismatch', () => {
  // 2026-08-25 (job #581): resolveVoices concatenated provider + voiceId
  // unconditionally, so the wanted string was `human_human_sasha_wanasky_deu_at`
  // — a voice no clip in the estate has ever carried. The guard then refused
  // every one of Sasha's own recordings: 319 refusals in deu_at_for_eng and 44
  // in fin_for_eng between 19 and 23 Aug. The rule it had drifted from is
  // clip-identity.cjs's: the id's own provider prefix wins.
  const wanted = resolveVoices(DEU_AT_COURSE).target2

  it('does not double the human_ prefix', () => {
    expect(wanted).toBe('human_sasha_wanasky_deu_at')
  })

  it('ACCEPTS a clip Sasha actually recorded', () => {
    const sasha = { id: 'clip-sasha', voice_id: 'human_sasha_wanasky_deu_at' }
    expect(isRelinkAllowed({ role: 'target2', wantedVoice: wanted, candidate: sasha }).ok).toBe(true)
  })

  it('still refuses Jonas, the Azure voice Sasha replaced', () => {
    const jonas = { id: 'clip-jonas', voice_id: 'azure_de-AT-JonasNeural' }
    const verdict = isRelinkAllowed({ role: 'target2', wantedVoice: wanted, candidate: jonas })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toBe('voice-mismatch')
  })

  it('leaves the synthetic roles of the same course spelt exactly as before', () => {
    const v = resolveVoices(DEU_AT_COURSE)
    expect(v.known).toBe('xai_eve')
    expect(v.target1).toBe('azure_de-AT-IngridNeural')
    expect(v.presentation).toBe('xai_eve')
  })
})

describe('voice identity', () => {
  it('treats a bare id and its provider-prefixed sibling as one voice (Tom, 2026-08-07)', () => {
    expect(voicesMatch('xai_eve', 'eve').match).toBe(true)
    expect(voicesMatch('xai_eve', 'eve').viaAlias).toBe(true) // tagged, not invisible
    expect(bareVoiceId('azure_en-GB-SoniaNeural')).toBe('en-GB-SoniaNeural')
  })

  it('does NOT merge locales — an accent change is a voice change', () => {
    expect(voicesMatch('azure_en-GB-SoniaNeural', 'azure_en-US-JennyNeural').match).toBe(false)
    expect(voicesMatch('azure_fr-FR-DeniseNeural', 'azure_fr-CA-SylvieNeural').match).toBe(false)
  })

  it('honours an explicit alias group for equivalences the prefix rule cannot express', () => {
    expect(voicesMatch('legacy_id_a', 'new_id_b', [['legacy_id_a', 'new_id_b']]).match).toBe(true)
  })

  it('can be put back into strict exact matching', () => {
    expect(voicesMatch('xai_eve', 'eve', [], { mergeProviderEras: false }).match).toBe(false)
  })
})

describe('failing closed', () => {
  it('refuses when the course has no voice configured for the role', () => {
    const wanted = resolveVoices({ voice_config: { voices: {} } }).known
    const verdict = isRelinkAllowed({ role: 'known', wantedVoice: wanted, candidate: { id: 'x', voice_id: 'anything' } })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toBe('no-configured-voice')
  })

  it('refuses a clip that carries no voice_id at all', () => {
    const verdict = isRelinkAllowed({ role: 'known', wantedVoice: 'azure_en-GB-SoniaNeural', candidate: { id: 'x', voice_id: null } })
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toBe('candidate-voice-unknown')
  })

  it('resolves a provider-less config entry to the bare voice id', () => {
    expect(resolveVoices({ voice_config: { voices: { known: { voiceId: 'eve' } } } }).known).toBe('eve')
  })
})

describe('the refusal is LOUD, not swallowed', () => {
  it('counts refusals, names the wrong voice, and says the slot was left alone', () => {
    const ledger = new RelinkRefusalLedger('zho_for_eng')
    for (let i = 0; i < 164; i++) {
      ledger.record({
        slot: `S1L${i}`, table: 'course_legos', role: 'known', reason: 'voice-mismatch',
        detail: 'clone offered', wantedVoice: 'azure_en-GB-SoniaNeural', candidateVoice: 'gfzdpspr5fdp',
      })
    }
    expect(ledger.count).toBe(164)
    expect(ledger.breakdown().byReason['known:voice-mismatch']).toBe(164)
    expect(ledger.breakdown().byOfferedVoice['gfzdpspr5fdp']).toBe(164)

    const summary = ledger.summary()
    expect(summary).toContain('164')
    expect(summary).toContain('gfzdpspr5fdp')
    expect(summary).toContain('LEFT AS THEY WERE')
  })

  it('says nothing when nothing was refused', () => {
    expect(new RelinkRefusalLedger('eng_for_cym').summary()).toBe('')
  })

  it('hands the audio-pass queue a bounded metadata body', () => {
    const ledger = new RelinkRefusalLedger('zho_for_eng')
    for (let i = 0; i < 300; i++) {
      ledger.record({ slot: `S${i}`, table: 'course_seeds', role: 'target1', reason: 'voice-mismatch', candidateVoice: 'wrong' })
    }
    const meta = ledger.toPassMetadata()
    expect(meta.relinkRefusedCount).toBe(300)
    expect(meta.relinkRefusedSample).toHaveLength(25) // sampled, so the row stays storable
  })
})

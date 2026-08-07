/**
 * Unit tests for the pod sample-first gate (no DB, no TTS, no spend).
 * Run: npx vitest run services/pod-voice-approvals
 *
 * These hold the claims the gate is sold on:
 *
 *   - the fingerprint is ORDER-INDEPENDENT — reordering pods, or the JSON keys
 *     inside listening_pods.speakers, must not move it. If it drifted on key
 *     order, every approval would go stale on the next PostgREST round-trip and
 *     the gate would be a nuisance that gets switched off;
 *   - the fingerprint MOVES on any real casting change — provider, voice_id,
 *     locale, an added or removed speaker. This is the self-invalidation
 *     property: recast a course and its old approval stops counting by itself.
 *     That is the whole design;
 *   - locale is part of the identity — this is exactly the §4a defect (English
 *     target steered at locale "zh"), so an approval must not survive a fix to
 *     it, and must not have been transferable from the broken casting;
 *   - the fingerprint agrees with what phase8's resolvePodSpeakerVoice()
 *     actually sends to TTS, including the legacy target-only shape;
 *   - an approval for course A never lets course B through.
 */

import { describe, it, expect } from 'vitest'

const {
  castFingerprint, canonicalSpeaker, trackKey, evaluateApproval,
  parseSampleLimit, selectSample, SAMPLE_LIMIT_MAX,
} = require('./pod-voice-approvals.cjs')

const pod = (id, speakers) => ({ id, speakers })

const CAST = [
  pod('deu_at_for_eng:pod-0', {
    Anna: {
      gender: 'f',
      target: { name: 'Sonja', provider: 'xai', voice_id: '44c91d64' },
      known: { name: 'Olivia', provider: 'xai', voice_id: 'bedd6226' },
    },
    Guest: {
      gender: 'm',
      target: { name: 'Felix', provider: 'xai', voice_id: 'e1fc5a89' },
      known: { name: 'Tom', provider: 'xai', voice_id: 'gfzdpspr5fdp' },
    },
  }),
  pod('deu_at_for_eng:pod-1', {
    James: {
      gender: 'm',
      target: { name: 'Conrad', provider: 'azure', voice_id: 'de-DE-ConradNeural' },
      known: { name: 'Henry', provider: 'xai', voice_id: 'f15c6a6a' },
    },
  }),
]

// Deep clone with the key order of `speakers` reversed, and the pods reversed.
function shuffled(pods) {
  return [...pods].reverse().map(p => {
    const speakers = {}
    for (const k of Object.keys(p.speakers).reverse()) speakers[k] = p.speakers[k]
    return { id: p.id, speakers }
  })
}

function mutate(pods, fn) {
  const clone = JSON.parse(JSON.stringify(pods))
  fn(clone)
  return clone
}

describe('castFingerprint — stability', () => {
  it('is deterministic across calls', () => {
    expect(castFingerprint(CAST)).toBe(castFingerprint(CAST))
  })

  it('does not move when pod order or speaker key order changes', () => {
    expect(castFingerprint(shuffled(CAST))).toBe(castFingerprint(CAST))
  })

  it('ignores fields that do not reach TTS (voice display name, gender, variants)', () => {
    const cosmetic = mutate(CAST, c => {
      c[0].speakers.Anna.target.name = 'RENAMED'
      c[0].speakers.Anna.gender = 'm'
      c[0].speakers.Anna.variants = ['Anna', 'Anna (7 pm)']
    })
    expect(castFingerprint(cosmetic)).toBe(castFingerprint(CAST))
  })

  it('collapses raw speaker labels that canonicalise to the same character', () => {
    const withVariant = mutate(CAST, c => {
      c[0].speakers['Anna (08:00)'] = JSON.parse(JSON.stringify(c[0].speakers.Anna))
    })
    expect(castFingerprint(withVariant)).toBe(castFingerprint(CAST))
  })

  it('is empty-safe', () => {
    expect(castFingerprint([])).toBe(castFingerprint(null))
  })
})

describe('castFingerprint — self-invalidation (the point of the design)', () => {
  const base = castFingerprint(CAST)

  it('moves when a voice_id changes', () => {
    expect(castFingerprint(mutate(CAST, c => { c[0].speakers.Anna.target.voice_id = 'other' }))).not.toBe(base)
  })

  it('moves when a provider changes', () => {
    expect(castFingerprint(mutate(CAST, c => { c[0].speakers.Anna.target.provider = 'azure' }))).not.toBe(base)
  })

  it('moves when a LOCALE changes — the §4a zh-on-English defect', () => {
    const broken = mutate(CAST, c => { c[0].speakers.Anna.target.locale = 'zh' })
    const fixed = mutate(CAST, c => { c[0].speakers.Anna.target.locale = 'de-AT' })
    expect(castFingerprint(broken)).not.toBe(base)
    expect(castFingerprint(fixed)).not.toBe(base)
    expect(castFingerprint(broken)).not.toBe(castFingerprint(fixed))
  })

  it('moves when the KNOWN side changes, not just the target', () => {
    expect(castFingerprint(mutate(CAST, c => { c[0].speakers.Anna.known.voice_id = 'x' }))).not.toBe(base)
  })

  it('moves when a speaker is added or removed', () => {
    expect(castFingerprint(mutate(CAST, c => { delete c[0].speakers.Guest }))).not.toBe(base)
    expect(castFingerprint(mutate(CAST, c => {
      c[0].speakers.Newcomer = { gender: 'f', target: { provider: 'xai', voice_id: 'zzz' }, known: { provider: 'xai', voice_id: 'yyy' } }
    }))).not.toBe(base)
  })

  it('moves when a pod is added — a new pod is uncast until sampled', () => {
    expect(castFingerprint([...CAST, pod('deu_at_for_eng:pod-2', { Anna: CAST[0].speakers.Anna })])).not.toBe(base)
  })

  it('distinguishes the same casting under a different pod id', () => {
    expect(castFingerprint(mutate(CAST, c => { c[0].id = 'other:pod-0' }))).not.toBe(base)
  })

  it('END-TO-END: an approval taken on the broken zh casting does not survive the recast', () => {
    const broken = mutate(CAST, c => {
      c[0].speakers.Anna.target = { provider: 'xai', voice_id: 'jpi39icg', locale: 'zh' }
    })
    const approval = { approved_by: 'kai', approved_at: '2026-08-07T00:00:00Z', cast_fingerprint: castFingerprint(broken) }
    expect(evaluateApproval(approval, castFingerprint(broken)).ok).toBe(true)

    // pod-sync recasts the course onto a correct German voice…
    const recast = mutate(broken, c => {
      c[0].speakers.Anna.target = { provider: 'azure', voice_id: 'de-AT-IngridNeural', locale: 'de-AT' }
    })
    const verdict = evaluateApproval(approval, castFingerprint(recast))
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toBe('stale_approval')
  })
})

describe('trackKey — agrees with phase8 resolvePodSpeakerVoice()', () => {
  it('reads the per-track shape and defaults the provider to azure, as the resolver does', () => {
    expect(trackKey({ target: { voice_id: 'v1' } }, 'target')).toBe('azure:v1:')
    expect(trackKey({ target: { voice_id: 'v1', provider: 'xai', locale: 'pt-PT' } }, 'target')).toBe('xai:v1:pt-PT')
  })

  it('reads the LEGACY target-only shape (provider defaults to xai) and gives legacy pods no known voice', () => {
    expect(trackKey({ voice_id: 'legacy' }, 'target')).toBe('xai:legacy:')
    expect(trackKey({ voice_id: 'legacy' }, 'known')).toBe('none')
  })

  it('marks a deferred character rather than fingerprinting it as cast (fin_for_eng)', () => {
    expect(trackKey({ deferred: true }, 'target')).toBe('deferred')
  })

  it('a deferred cast is still fingerprintable, and differs from a real one', () => {
    const deferred = [pod('fin_for_eng:pod-0', { Anna: { deferred: true } })]
    expect(castFingerprint(deferred)).not.toBe(castFingerprint(CAST))
  })
})

describe('canonicalSpeaker', () => {
  it('strips paren groups and collapses whitespace', () => {
    expect(canonicalSpeaker('Susjed (08:00) (M)')).toBe('Susjed')
    expect(canonicalSpeaker('Friend (7 pm)')).toBe('Friend')
  })
})

describe('evaluateApproval', () => {
  const live = castFingerprint(CAST)

  it('refuses when there is no approval at all, and says how to get one', () => {
    const v = evaluateApproval(null, live)
    expect(v.ok).toBe(false)
    expect(v.reason).toBe('no_approval')
    expect(v.message).toMatch(/sample_limit/)
    expect(v.message).toMatch(/pod-approve-voices/)
  })

  it('passes an approval taken at the live fingerprint', () => {
    expect(evaluateApproval({ cast_fingerprint: live, approved_by: 'kai' }, live).ok).toBe(true)
  })

  it('refuses an approval carrying another casting fingerprint', () => {
    const v = evaluateApproval({ cast_fingerprint: 'deadbeefdeadbeef', approved_at: 'then' }, live)
    expect(v.ok).toBe(false)
    expect(v.reason).toBe('stale_approval')
    expect(v.message).toContain(live)
  })

  it('an approval with no fingerprint recorded never passes', () => {
    expect(evaluateApproval({ approved_by: 'kai' }, live).ok).toBe(false)
  })
})

describe('parseSampleLimit — the mode decision', () => {
  it('no sample_limit at all is BULK (so a plain run is gated)', () => {
    expect(parseSampleLimit(undefined).mode).toBe('bulk')
    expect(parseSampleLimit(null).mode).toBe('bulk')
  })

  it('a positive integer is SAMPLE', () => {
    expect(parseSampleLimit(5)).toEqual({ mode: 'sample', limit: 5 })
  })

  it('caps at the server maximum — the caller cannot widen a sample into a bulk run', () => {
    expect(parseSampleLimit(10_000).limit).toBe(SAMPLE_LIMIT_MAX)
  })

  it('MALFORMED VALUES ERROR, they never fall through to bulk — that would be the gate bypass', () => {
    // Every one of these would have been a silent mode change under a
    // Number()-coercing parse: `true` coerces to 1, `"5"` to 5, `""` to 0.
    for (const bad of [0, -1, 2.5, true, false, '5', '', 'all', {}, [], NaN, Infinity]) {
      expect(parseSampleLimit(bad).mode, `sample_limit=${JSON.stringify(bad)}`).toBe('error')
    }
  })
})

describe('selectSample — truncation covers the CAST, not just the first speaker', () => {
  const clip = (kind, voice_id, provider = 'xai', locale = null) =>
    ({ kind, voice: { voice_id, provider, locale }, sentence_id: `${kind}-${voice_id}-${Math.random()}` })

  it('truncates to the limit', () => {
    const q = Array.from({ length: 284 }, () => clip('target', 'a'))
    expect(selectSample(q, 5)).toHaveLength(5)
  })

  it('takes one clip per distinct voice-track before a second of any voice', () => {
    // 100 clips of voice A, then one each of B and C, exactly the real shape:
    // one character dominates the transcript, so an unsorted head misses the rest.
    const q = [...Array.from({ length: 100 }, () => clip('target', 'A')), clip('target', 'B'), clip('known', 'C')]
    const picked = selectSample(q, 3)
    expect(picked.map(p => p.voice.voice_id).sort()).toEqual(['A', 'B', 'C'])
  })

  it('treats the same voice on target and known as two things to hear', () => {
    const q = [clip('target', 'A'), clip('known', 'A'), clip('target', 'A')]
    expect(selectSample(q, 2).map(p => p.kind)).toEqual(['target', 'known'])
  })

  it('treats the same voice at a different locale as a different thing to hear (§4a)', () => {
    const q = [clip('target', 'A', 'xai', 'zh'), clip('target', 'A', 'xai', 'de-AT')]
    expect(selectSample(q, 2)).toHaveLength(2)
  })

  it('never invents work: a short queue stays short', () => {
    expect(selectSample([clip('target', 'A')], 10)).toHaveLength(1)
    expect(selectSample([], 10)).toHaveLength(0)
  })
})

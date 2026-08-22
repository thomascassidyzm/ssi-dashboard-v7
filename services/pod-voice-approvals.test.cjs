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
  parseSampleLimit, selectSample, selectExchange, EXCHANGE_MAX, SAMPLE_LIMIT_MAX, resolveCurrentPod0,
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

// Tom's T-14 rejection, 2026-08-11: "Pods are dialogue - they need distinct
// speakers... so Tom can judge how the two voices sound together." Coverage
// alone can't answer that: ten clips off ten different scenes never let an ear
// hear two people in one conversation.
describe('selectSample — leads with an EXCHANGE so the two voices are heard together', () => {
  const line = (pod, kind, voice_id, sentence_id) =>
    ({ kind, pod_id: pod, sentence_id, voice: { voice_id, provider: 'xai', locale: 'es' } })

  // A real pod shape: the queue interleaves each sentence's target and known
  // clip, so two turns of the conversation are NEVER array neighbours.
  const podQueue = (voices) => voices.flatMap((v, i) => [
    line('p0', 'target', v, `s${i}-t`),
    line('p0', 'known', v === 'Maria' ? 'Olivia' : 'Tom', `s${i}-k`),
  ])

  it('picks consecutive same-track lines where the voice changes', () => {
    const q = podQueue(['Maria', 'Maria', 'Pablo', 'Pablo', 'Maria'])
    const picked = selectSample(q, 10)
    const targets = picked.filter(p => p.kind === 'target').map(p => p.sentence_id)
    // The first four target lines, in order — Maria twice then Pablo twice.
    expect(targets.slice(0, 4)).toEqual(['s0-t', 's1-t', 's2-t', 's3-t'])
  })

  it('keeps the exchange contiguous and in line order (it has to play as a conversation)', () => {
    const q = podQueue(['Maria', 'Pablo', 'Maria', 'Pablo'])
    const ex = selectExchange(q, 6)
    expect(ex.map(p => p.sentence_id)).toEqual(['s0-t', 's1-t'])
    expect(new Set(ex.map(p => p.voice.voice_id)).size).toBe(2)
  })

  it('anchors the run at the voice change, not at the top of a monologue', () => {
    // Nine Maria lines then one Pablo: a window off the front would be Maria
    // talking to herself, which answers nothing.
    const q = podQueue([...Array(9).fill('Maria'), 'Pablo'])
    const ex = selectExchange(q, 3)
    expect(ex.map(p => p.voice.voice_id)).toEqual(['Maria', 'Maria', 'Pablo'])
  })

  it('never lets the exchange crowd out a voice nobody has heard', () => {
    // Two target voices in conversation + two known voices. A 6-line exchange
    // would fill a 6-clip sample and the known cast would go unheard.
    const q = podQueue(['Maria', 'Maria', 'Pablo', 'Pablo', 'Maria', 'Pablo'])
    const picked = selectSample(q, 6)
    const heard = new Set(picked.map(p => `${p.kind}|${p.voice.voice_id}`))
    expect(heard).toContain('target|Maria')
    expect(heard).toContain('target|Pablo')
    expect(heard).toContain('known|Olivia')
    expect(heard).toContain('known|Tom')
  })

  it('caps the exchange at EXCHANGE_MAX even when the limit would allow more', () => {
    const q = podQueue(['Maria', 'Pablo', 'Maria', 'Pablo', 'Maria', 'Pablo', 'Maria', 'Pablo'])
    expect(selectExchange(q, 99)).toHaveLength(2) // budget is the caller's; EXCHANGE_MAX applied in selectSample
    expect(selectSample(q, 10).filter(p => p.kind === 'target').length).toBeLessThanOrEqual(EXCHANGE_MAX + 2)
  })

  it('a one-voice pod has no exchange, and falls back to plain coverage', () => {
    const q = podQueue(['Maria', 'Maria', 'Maria'])
    expect(selectExchange(q, 6)).toEqual([])
    expect(selectSample(q, 2)).toHaveLength(2)
  })

  it('does not treat two different pods as one conversation', () => {
    const q = [line('p0', 'target', 'Maria', 'a'), line('p1', 'target', 'Pablo', 'b')]
    expect(selectExchange(q, 6)).toEqual([])
  })
})

// Tom's T-14 rejection, 2026-08-11, reason 1: the samples came off a ~140-line
// snapshot while the current pod holds 232. The cause is a hard-coded
// `<course>:pod-0` against a `pod-0-unrecorded` working copy.
describe('resolveCurrentPod0 — which pod actually holds the current content', () => {
  const p = (slug, sentence_count) => ({ id: `c:${slug}`, slug, sentence_count })

  it('prefers the working copy over a stale pod-0 (the spa_for_eng shape: 142 vs 232)', () => {
    expect(resolveCurrentPod0([p('pod-0', 142), p('pod-0-unrecorded', 232)]).slug).toBe('pod-0-unrecorded')
  })

  it('prefers the working copy over an EMPTIED, gated pod-0 (the cym shape: 0 vs 232)', () => {
    expect(resolveCurrentPod0([p('pod-0', 0), p('pod-0-unrecorded', 232)]).slug).toBe('pod-0-unrecorded')
  })

  it('uses pod-0 when that is all the course has', () => {
    expect(resolveCurrentPod0([p('pod-0', 231)]).slug).toBe('pod-0')
  })

  it('ignores pods outside the pod-0 family', () => {
    const got = resolveCurrentPod0([p('music', 749), p('travel-situations', 72), p('pod-0', 142)])
    expect(got.slug).toBe('pod-0')
  })

  it('does not pick an empty working copy over a populated pod-0', () => {
    expect(resolveCurrentPod0([p('pod-0', 142), p('pod-0-unrecorded', 0)]).slug).toBe('pod-0')
  })

  it('is null-safe for a course with no pod-0 at all', () => {
    expect(resolveCurrentPod0([p('music', 749)])).toBeNull()
    expect(resolveCurrentPod0([])).toBeNull()
    expect(resolveCurrentPod0(null)).toBeNull()
  })

  it('derives the slug from the id when the caller has none', () => {
    expect(resolveCurrentPod0([{ id: 'cym_n_for_eng:pod-0-unrecorded', sentence_count: 232 }]).id)
      .toBe('cym_n_for_eng:pod-0-unrecorded')
  })

  // Tom's ruling 2026-08-22: pods are 1-based from now on, hrv_for_eng first
  // across. After its cutover the course has NO pod-0 and NO pod-0-unrecorded.
  it('resolves a course whose only core pod is pod-1 (the hrv_for_eng shape)', () => {
    const got = resolveCurrentPod0([
      p('pod-1', 231),
      p('pod-0-retired-2026-08-22', 142),
      p('pod-1-retired-2026-08-22', 180),
    ])
    expect(got.slug).toBe('pod-1')
    expect(got.id).toBe('c:pod-1')
  })

  it('never serves an archived pod, however many lines it holds', () => {
    // Archive keeps pod_type='core' through the rename, so only the slug
    // allowlist stops a 300-line retired pod outranking the live one.
    expect(resolveCurrentPod0([p('pod-0-retired-2026-08-22', 300), p('pod-1', 231)]).slug).toBe('pod-1')
    expect(resolveCurrentPod0([p('pod-0-retired-2026-08-22', 300)])).toBeNull()
  })

  it('prefers pod-1 over a legacy pod-0 left in place', () => {
    expect(resolveCurrentPod0([p('pod-0', 142), p('pod-1', 231)]).slug).toBe('pod-1')
  })

  it('ignores a non-core pod that happens to sit on a serving slug', () => {
    const pods = [{ id: 'c:pod-1', slug: 'pod-1', sentence_count: 180, pod_type: 'themed' },
      { id: 'c:pod-0', slug: 'pod-0', sentence_count: 142, pod_type: 'core' }]
    expect(resolveCurrentPod0(pods).slug).toBe('pod-0')
  })
})

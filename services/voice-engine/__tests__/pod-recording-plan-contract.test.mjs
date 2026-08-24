// Contract tests for the dialogue-autocue CLIENT side of the pods
// recording-plan seam (keystone pods-recording-model.md §2-§4).
//
// The server endpoint (GET /api/production/:courseCode/pods/recording-plan)
// is built by the parallel casting workstream; these tests pin what the
// CLIENT consumes and what it sends to the upload seam, so either side
// drifting breaks loudly here.

import { describe, it, expect } from 'vitest'
import {
  normalizeRecordingPlan,
  roleForKind,
  planTotals,
  podProgress,
  firstUnrecordedIndex,
  nextRecordableIndex,
  buildPodUploadMetadata,
  speakerColor
} from '../../../src/utils/podRecordingPlan.js'

// ─── Canonical keystone-§2 shaped response ─────────────────────────────────
const canonicalPlan = {
  courseCode: 'cym_n_for_eng',
  voiceId: 'human_catrin_cym',
  voiceName: 'Catrin',
  speakers: ['Catrin', 'Elin'],
  totals: { items: 4, recorded: 1, remaining: 3 },
  items: [
    {
      podId: 'cym_n_for_eng:pod-0',
      podTitle: 'Pod 0 — Cyrraedd',
      sentenceId: 'cym_n_for_eng:pod-0:SC01-S002',
      kind: 'target',
      speaker: 'Catrin',
      sceneNumber: 1,
      sceneTitle: 'Yn y caffi',
      cues: [
        { speaker: 'Elin', targetText: 'Bore da!', knownText: 'Good morning!' }
      ],
      line: { targetText: 'Bore da, sut wyt ti?', knownText: 'Good morning, how are you?' },
      recorded: true,
      audioId: '11111111-1111-4111-8111-111111111111'
    },
    {
      podId: 'cym_n_for_eng:pod-0',
      podTitle: 'Pod 0 — Cyrraedd',
      sentenceId: 'cym_n_for_eng:pod-0:SC01-S004',
      kind: 'target',
      speaker: 'Catrin',
      sceneNumber: 1,
      sceneTitle: null, // not a scene boundary
      cues: [
        { speaker: 'Catrin', targetText: 'Bore da, sut wyt ti?', knownText: 'Good morning, how are you?' },
        { speaker: 'Elin', targetText: 'Da iawn, diolch.', knownText: 'Very well, thanks.' }
      ],
      line: { targetText: 'Dw i eisiau coffi.', knownText: 'I want a coffee.' },
      glueSentenceIds: ['cym_n_for_eng:pod-0:SC01-S004', 'cym_n_for_eng:pod-0:SC01-S005'],
      recorded: false,
      audioId: null
    },
    {
      podId: 'cym_n_for_eng:pod-1',
      podTitle: 'Pod 1 — Y dref',
      sentenceId: 'cym_n_for_eng:pod-1:SC01-S001',
      kind: 'target',
      speaker: 'Catrin',
      sceneNumber: 1,
      sceneTitle: 'Ar y stryd',
      cues: [],
      line: { targetText: 'Esgusodwch fi.', knownText: 'Excuse me.' },
      recorded: false,
      audioId: null
    },
    {
      podId: 'cym_n_for_eng:pod-1',
      podTitle: 'Pod 1 — Y dref',
      sentenceId: 'cym_n_for_eng:pod-1:SC02-S003',
      kind: 'known',
      speaker: '__explainer__',
      sceneNumber: 2,
      sceneTitle: 'Yn y siop',
      cues: [],
      line: { text: 'Excuse me, where is the shop?' },
      recorded: false,
      audioId: null
    }
  ]
}

describe('roleForKind — course_audio roles per recon §1 (never invented)', () => {
  it('maps target → target1 and known → known', () => {
    expect(roleForKind('target')).toBe('target1')
    expect(roleForKind('known')).toBe('known')
  })
  it('returns null for unknown kinds (caller must not guess)', () => {
    expect(roleForKind('presentation')).toBeNull()
    expect(roleForKind(undefined)).toBeNull()
  })
  // Deprecated 2026-08-24 (Tom's ruling): the pod explainer track is gone, so
  // 'explainer' is no longer a recordable kind. Pinned so a future caller that
  // reintroduces the string gets null rather than a resurrected role.
  it('no longer maps explainer to a role', () => {
    expect(roleForKind('explainer')).toBeNull()
  })
})

describe('normalizeRecordingPlan — canonical keystone shape', () => {
  const plan = normalizeRecordingPlan(canonicalPlan)

  it('preserves server order exactly (pod → scene → global_order is server-owned)', () => {
    expect(plan.items.map(i => i.sentenceId)).toEqual([
      'cym_n_for_eng:pod-0:SC01-S002',
      'cym_n_for_eng:pod-0:SC01-S004',
      'cym_n_for_eng:pod-1:SC01-S001',
      'cym_n_for_eng:pod-1:SC02-S003'
    ])
  })

  it('carries identity, cues, line text + gloss', () => {
    const it1 = plan.items[1]
    expect(it1.podId).toBe('cym_n_for_eng:pod-0')
    expect(it1.kind).toBe('target')
    expect(it1.role).toBe('target1')
    expect(it1.cues).toHaveLength(2)
    expect(it1.cues[1]).toEqual({ speaker: 'Elin', targetText: 'Da iawn, diolch.', knownText: 'Very well, thanks.', draft: false })
    expect(it1.lineText).toBe('Dw i eisiau coffi.')
    expect(it1.lineGloss).toBe('I want a coffee.')
  })

  it('keeps glued rows as ONE item carrying their sentence ids', () => {
    expect(plan.items[1].glueSentenceIds).toEqual([
      'cym_n_for_eng:pod-0:SC01-S004',
      'cym_n_for_eng:pod-0:SC01-S005'
    ])
    expect(plan.items[0].glueSentenceIds).toBeNull()
  })

  it('consumes the recorded flag + audioId (resume contract)', () => {
    expect(plan.items[0].recorded).toBe(true)
    expect(plan.items[0].audioId).toBe('11111111-1111-4111-8111-111111111111')
    expect(plan.items[1].recorded).toBe(false)
  })

  // The __explainer__ cast key survives the explainer deprecation because it is
  // also what casts the KNOWN-language lines (pods-cast.cjs). This pins that
  // surviving leg: a known line routed via __explainer__ still gets role 'known'.
  it('a known line cast to __explainer__ gets role known and a bare line text', () => {
    const kn = plan.items[3]
    expect(kn.speaker).toBe('__explainer__')
    expect(kn.role).toBe('known')
    expect(kn.lineText).toMatch(/shop/)
  })

  it('prefers server totals when present', () => {
    expect(plan.totals).toEqual({ total: 4, recorded: 1, remaining: 3 })
  })
})

describe('normalizeRecordingPlan — tolerated variants (parallel-build drift)', () => {
  it('accepts snake_case fields and line-as-string', () => {
    const plan = normalizeRecordingPlan({
      course_code: 'cym_n_for_eng',
      voice_id: 'human_catrin_cym',
      items: [{
        pod_id: 'cym_n_for_eng:pod-0',
        sentence_id: 'cym_n_for_eng:pod-0:SC01-S002',
        kind: 'target',
        speaker: 'Catrin',
        scene_number: 1,
        scene_title: 'Yn y caffi',
        cues: [{ speaker: 'Elin', target_text: 'Bore da!', known_text: 'Good morning!' }],
        line: 'Bore da, sut wyt ti?',
        known_text: 'Good morning, how are you?',
        is_recorded: true,
        audio_id: 'abc'
      }]
    })
    const it0 = plan.items[0]
    expect(plan.voiceId).toBe('human_catrin_cym')
    expect(it0.sentenceId).toBe('cym_n_for_eng:pod-0:SC01-S002')
    expect(it0.sceneTitle).toBe('Yn y caffi')
    expect(it0.lineText).toBe('Bore da, sut wyt ti?')
    expect(it0.lineGloss).toBe('Good morning, how are you?')
    expect(it0.cues[0].targetText).toBe('Bore da!')
    expect(it0.recorded).toBe(true)
    expect(it0.audioId).toBe('abc')
  })

  it('accepts a pods-grouped response, inheriting pod identity', () => {
    const plan = normalizeRecordingPlan({
      voiceId: 'human_catrin_cym',
      pods: [
        {
          podId: 'cym_n_for_eng:pod-0', title: 'Pod 0',
          items: [
            { sentenceId: 'a', kind: 'target', line: { targetText: 'x' } },
            { sentenceId: 'b', kind: 'target', line: { targetText: 'y' }, recorded: true }
          ]
        },
        {
          podId: 'cym_n_for_eng:pod-1', title: 'Pod 1',
          items: [{ sentenceId: 'c', kind: 'known', line: { text: 'z' } }]
        }
      ]
    })
    expect(plan.items.map(i => i.podId)).toEqual([
      'cym_n_for_eng:pod-0', 'cym_n_for_eng:pod-0', 'cym_n_for_eng:pod-1'
    ])
    expect(plan.items[0].podTitle).toBe('Pod 0')
    expect(plan.items[2].role).toBe('known')
    expect(plan.totals).toEqual({ total: 3, recorded: 1, remaining: 2 })
  })

  it('degrades to an empty plan on junk input (404 / error body)', () => {
    for (const junk of [null, undefined, 'nope', { error: 'casting not set up' }]) {
      const plan = normalizeRecordingPlan(junk)
      expect(plan.items).toEqual([])
      expect(plan.totals.total).toBe(0)
    }
  })
})

describe('progress + resume helpers', () => {
  const { items } = normalizeRecordingPlan(canonicalPlan)

  it('planTotals counts the recorded flag honestly', () => {
    expect(planTotals(items)).toEqual({ total: 4, recorded: 1, remaining: 3 })
  })

  it('podProgress groups per pod in plan order, merging session captures', () => {
    expect(podProgress(items)).toEqual([
      { podId: 'cym_n_for_eng:pod-0', podTitle: 'Pod 0 — Cyrraedd', total: 2, recorded: 1 },
      { podId: 'cym_n_for_eng:pod-1', podTitle: 'Pod 1 — Y dref', total: 2, recorded: 0 }
    ])
    const session = new Set(['cym_n_for_eng:pod-1:SC01-S001'])
    expect(podProgress(items, session)[1].recorded).toBe(1)
  })

  it('firstUnrecordedIndex resumes past plan-recorded AND session-recorded items', () => {
    expect(firstUnrecordedIndex(items)).toBe(1)
    const session = new Set(['cym_n_for_eng:pod-0:SC01-S004'])
    expect(firstUnrecordedIndex(items, session)).toBe(2)
    const all = new Set(items.map(i => i.sentenceId))
    expect(firstUnrecordedIndex(items, all)).toBe(-1)
  })

  it('nextRecordableIndex skips recorded unless includeRecorded', () => {
    const planRecordedFirst = normalizeRecordingPlan(canonicalPlan).items
    expect(nextRecordableIndex(planRecordedFirst, -1)).toBe(1)
    expect(nextRecordableIndex(planRecordedFirst, -1, { includeRecorded: true })).toBe(0)
    expect(nextRecordableIndex(planRecordedFirst, 2)).toBe(3)
    expect(nextRecordableIndex(planRecordedFirst, 3)).toBe(-1)
  })
})

describe('buildPodUploadMetadata — the registration seam contract (keystone §4)', () => {
  const { items } = normalizeRecordingPlan(canonicalPlan)

  it('emits { mode:pod, podId, sentenceId, kind, role, voiceId, text, cadence:natural }', () => {
    const meta = buildPodUploadMetadata(items[1], { voiceId: 'human_catrin_cym', sessionId: 'sess_1' })
    expect(meta).toEqual({
      mode: 'pod',
      podId: 'cym_n_for_eng:pod-0',
      sentenceId: 'cym_n_for_eng:pod-0:SC01-S004',
      kind: 'target',
      role: 'target1',
      voiceId: 'human_catrin_cym',
      speaker: 'Catrin',
      text: 'Dw i eisiau coffi.',
      cadence: 'natural',
      glueSentenceIds: ['cym_n_for_eng:pod-0:SC01-S004', 'cym_n_for_eng:pod-0:SC01-S005'],
      replacesAudioId: null,
      scriptSessionId: 'sess_1'
    })
  })

  it('stamps replacesAudioId on re-records so old takes stay traceable', () => {
    const meta = buildPodUploadMetadata(items[0], { voiceId: 'human_catrin_cym' })
    expect(meta.replacesAudioId).toBe('11111111-1111-4111-8111-111111111111')
    expect(meta.cadence).toBe('natural')
  })

  it('known items cast to __explainer__ ride with role known', () => {
    const meta = buildPodUploadMetadata(items[3], { voiceId: 'human_tom_known' })
    expect(meta.role).toBe('known')
    expect(meta.kind).toBe('known')
  })
})

describe('speakerColor', () => {
  it('is deterministic and returns a hex colour', () => {
    expect(speakerColor('Catrin')).toBe(speakerColor('Catrin'))
    expect(speakerColor('Elin')).toMatch(/^#[0-9a-f]{6}$/i)
    expect(speakerColor(null)).toMatch(/^#[0-9a-f]{6}$/i)
  })
})

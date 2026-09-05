/**
 * podComposeDrift.test.js — the DRIFT GUARD between Popty's two pod-composition
 * paths and the learner's engine.
 *
 * Popty previews a pod two ways:
 *   • ListeningConfig.vue → src/lib/podArcCompose.js — a hand-written port of
 *     the learner composer, with NO sync mechanism. This is the copy that can
 *     drift silently.
 *   • PodLab.vue         → src/lib/podEngine/*  — a VERBATIM vendored copy of
 *     @ssi/core/pods, re-vendored by tools/sync-pod-engine.sh.
 *
 * This file pins the relationship between them on the same inputs. Where they
 * agree, the assertion locks it in and any future edit to either side fails
 * loudly. Where they genuinely diverge, the divergence is asserted EXPLICITLY
 * with the reason named at the assertion — a pinned known difference is honest;
 * a silent one is the defect.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { composeArc } from './podArcCompose'
import { buildMainStage, buildStage0Tier, DEFAULT_STAGE0 } from './podEngine'

const HERE = dirname(fileURLToPath(import.meta.url))

// ── realistic pod inputs ─────────────────────────────────────────────────────
const SENTENCE = {
  target_text: 'Dw i eisiau siarad.',
  known_text: 'I want to speak.',
  target_audio_id: 'aud-target-1',
  known_audio_id: 'aud-known-1',
  explainer_audio_id: 'aud-explainer-1',
  glue_to_next: false,
  atom_map: [
    { kind: 'atom', target_surface: 'Dw i', gloss: 'I am', lego_key: 'dw-i' },
    { kind: 'atom', target_surface: 'eisiau', gloss: 'want', lego_key: 'eisiau' },
    { kind: 'atom', target_surface: 'siarad', gloss: 'to speak', lego_key: 'siarad' },
  ],
}
const GLOSS_MAP = new Map([
  ['dw-i', 'aud-means-dwi'],
  ['eisiau', 'aud-means-eisiau'],
  ['siarad', 'aud-means-siarad'],
])
const TARGET_CLIP_MAP = new Map([
  ['dw i', 'aud-atom-dwi'],
  ['eisiau', 'aud-atom-eisiau'],
  ['siarad', 'aud-atom-siarad'],
])

// Comparable shape: the two composers return different envelopes (see the
// pinned-shape test below), so parity is asserted on the audible facts only.
const fromArc = (p) => ({ role: p.role, audioId: p.audioId, text: p.label, speed: p.speed })
const fromEngine = (p) => ({ role: p.playRole, audioId: p.audioId, text: p.text, speed: p.playbackSpeed })

const arcMainStage = (sentence, playlist) =>
  composeArc(sentence, new Map(), new Map(), null, { 1: playlist }).map(fromArc)

describe('stages 1..N — podArcCompose agrees with the vendored engine', () => {
  const PLAYLISTS = [
    ['ps', 'trans', 'ps'],
    ['ps08x', 'trans', 'ps', 'ps15x'],
    ['ps', 'trans'],            // exercises the end-on-target defensive close
    ['trans'],                  // close falls back to 'ps' on both sides
    ['ps', 'explainer', 'ps'],  // explainer slot resolves the explainer clip
    ['explainer'],              // no 'trans' in the playlist → phase-0 fallback
  ]
  for (const playlist of PLAYLISTS) {
    it(`matches for playlist [${playlist.join(', ')}]`, () => {
      expect(arcMainStage(SENTENCE, playlist))
        .toEqual(buildMainStage(SENTENCE, 1, 0, playlist).map(fromEngine))
    })
  }

  it('matches when the sentence has no known clip (trans slots drop)', () => {
    const s = { ...SENTENCE, known_audio_id: null }
    expect(arcMainStage(s, ['ps', 'trans', 'ps']))
      .toEqual(buildMainStage(s, 1, 0, ['ps', 'trans', 'ps']).map(fromEngine))
  })

  it('matches when the sentence has no explainer clip (phase-0 → translation)', () => {
    const s = { ...SENTENCE, explainer_audio_id: null }
    expect(arcMainStage(s, ['ps', 'explainer', 'ps']))
      .toEqual(buildMainStage(s, 1, 0, ['ps', 'explainer', 'ps']).map(fromEngine))
  })

  it('composes stages in ascending order, one block per stage', () => {
    const arc = composeArc(SENTENCE, new Map(), new Map(), null, { 2: ['ps'], 1: ['ps', 'trans', 'ps'] })
    expect(arc.map((p) => p.stageLabel)).toEqual(['1', '1', '1', '2'])
  })
})

describe('stage 0 — the breakdown ladder agrees with the vendored engine', () => {
  it('produces the same clips, speeds and trailing gaps', () => {
    const arc = composeArc(SENTENCE, GLOSS_MAP, TARGET_CLIP_MAP, DEFAULT_STAGE0, {})
    const engine = buildStage0Tier(SENTENCE, 'explainer', 0, DEFAULT_STAGE0, GLOSS_MAP, TARGET_CLIP_MAP)
    // `gapAfterMs ?? 0`: on the FINAL play the engine omits the key entirely
    // while podArcCompose writes 0 — the same "no trailing gap", spelled two
    // ways. Asserted as such below rather than papered over.
    expect(arc.map((p) => ({ audioId: p.audioId, text: p.label, speed: p.speed, gapAfterMs: p.gapAfterMs ?? 0 })))
      .toEqual(engine.map((p) => ({ audioId: p.audioId, text: p.text, speed: p.playbackSpeed, gapAfterMs: p.gapAfterMs ?? 0 })))
    expect(arc[arc.length - 1].gapAfterMs).toBe(0)
    expect('gapAfterMs' in engine[engine.length - 1]).toBe(false)
    // The ladder really is the 4-movement shape, not an empty list.
    expect(arc.map((p) => p.audioId)).toEqual([
      'aud-target-1', 'aud-known-1',
      'aud-atom-dwi', 'aud-means-dwi',
      'aud-atom-eisiau', 'aud-means-eisiau',
      'aud-atom-siarad', 'aud-means-siarad',
      'aud-target-1',
    ])
  })

  it('is skipped by both when no atom resolves to a target clip', () => {
    const arc = composeArc(SENTENCE, GLOSS_MAP, new Map(), DEFAULT_STAGE0, {})
    expect(arc).toEqual([])
    expect(buildStage0Tier(SENTENCE, 'explainer', 0, DEFAULT_STAGE0, GLOSS_MAP, new Map())
      .filter((p) => p.audioId && p.audioId.startsWith('aud-atom-'))).toEqual([])
  })

  // PINNED DIVERGENCE — tier.visits.
  // podArcCompose repeats a tier `visits` times; the engine's per-tier builder
  // is called once per tier by its caller and ignores `visits`. DEFAULT_STAGE0
  // and the live config both ship visits:1, so today the two agree; this test
  // exists so that a config raising visits shows up as a stated difference
  // rather than a silent one.
  it('DIVERGES on tier.visits > 1: podArcCompose repeats the tier, the engine does not', () => {
    const cfg = { ...DEFAULT_STAGE0, tiers: [{ ...DEFAULT_STAGE0.tiers[0], visits: 2 }] }
    const arc = composeArc(SENTENCE, GLOSS_MAP, TARGET_CLIP_MAP, cfg, {})
    const engine = buildStage0Tier(SENTENCE, 'explainer', 0, cfg, GLOSS_MAP, TARGET_CLIP_MAP)
    expect(arc.length).toBe(engine.length * 2)
    expect(DEFAULT_STAGE0.tiers.every((t) => (t.visits ?? 1) === 1)).toBe(true)
  })
})

describe('pinned known divergences (recorded, not fixed)', () => {
  // 1 · ENVELOPE. podArcCompose is a flat preview list keyed by a printable
  //     stageLabel; the engine carries scheduler fields (sentenceIdx, stage,
  //     glueToNextChunk) the preview has no use for. Deliberate.
  it('the two output envelopes differ by design', () => {
    const arc = composeArc(SENTENCE, new Map(), new Map(), null, { 1: ['ps'] })[0]
    const eng = buildMainStage(SENTENCE, 1, 0, ['ps'])[0]
    expect(Object.keys(arc).sort()).toEqual(['audioId', 'gapAfterMs', 'label', 'role', 'speed', 'stageLabel'])
    expect(Object.keys(eng).sort()).toEqual(['audioId', 'glueToNextChunk', 'playRole', 'playbackSpeed', 'sentenceIdx', 'stage', 'text'])
  })

  // 2 · SENTENCE SPLIT. The unit the learner hears is the SENTENCE, not the
  //     turn: a multi-sentence turn carries sentence_audio_ids. podArcCompose
  //     splits and composes each unit (matching the learner runtime);
  //     PodLab hands the WHOLE ROW to composeSentenceArc, so its arc preview
  //     plays the turn-level clip. Different screens, different unit — pinned
  //     here so the difference is stated rather than discovered.
  it('podArcCompose splits a multi-sentence turn into per-sentence units', () => {
    const row = {
      ...SENTENCE,
      target_text: 'Bore da. Dw i eisiau siarad.',
      known_text: 'Good morning. I want to speak.',
      sentence_audio_ids: ['aud-t-a', 'aud-t-b'],
      sentence_known_audio_ids: ['aud-k-a', 'aud-k-b'],
    }
    const arc = composeArc(row, new Map(), new Map(), null, { 1: ['ps', 'trans', 'ps'] })
    expect(arc.map((p) => p.stageLabel)).toEqual(['S1·1', 'S1·1', 'S1·1', 'S2·1', 'S2·1', 'S2·1'])
    expect(arc[0].audioId).toBe('aud-t-a')
    expect(arc[3].audioId).toBe('aud-t-b')
    // A split turn has ONE explainer clip for the whole turn and no way to
    // attribute it to a sentence, so split units carry none — see the
    // explainer pass-through comment in podArcCompose.composeArc.
    expect(arc.some((p) => p.audioId === 'aud-explainer-1')).toBe(false)
  })

  // 3 · UNIFORM SPEED. The canonical engine grew a `uniformSpeed` argument
  //     (Tom 2026-08-07: a listening phrase's four clips share one speed),
  //     applied by the learner's exposure ramp. NEITHER Popty copy has it —
  //     the vendored engine predates it (see the sync test below) and
  //     podArcCompose never had it. Both previews therefore show the historic
  //     per-role rates, which is what the admin auditioner wants; but a
  //     ramped learner hears one speed across all four clips.
  it('neither Popty copy applies the learner exposure ramp uniform speed', () => {
    expect(buildMainStage.length).toBe(4) // no 5th `uniformSpeed` parameter
    const arc = composeArc(SENTENCE, new Map(), new Map(), null, { 1: ['ps08x', 'trans', 'ps2x'] })
    expect(arc.map((p) => p.speed)).toEqual([0.8, 1.0, 2.0])
  })
})

describe('vendored engine vs its canonical source', () => {
  // tools/sync-pod-engine.sh expects the learning-app repo alongside this one;
  // in a git worktree it isn't, so fall back to the estate's checkout. Absent
  // (CI, a fresh clone) ⇒ skipped, never a false failure.
  const CANON = [
    resolve(HERE, '../../../ssi-learning-app/packages/core/src/pods'),
    resolve(process.env.HOME || '', 'SSi/ssi-learning-app/packages/core/src/pods'),
  ].find(existsSync)
  const has = !!CANON
  const read = (p) => readFileSync(p, 'utf8')

  // The sync script (tools/sync-pod-engine.sh) prepends a 10-line GENERATED
  // banner, so a synced file is the canonical file plus that banner.
  const stripBanner = (s) => s.split('\n').slice(10).join('\n')

  it.skipIf(!has)('records that the vendored copy has DRIFTED from @ssi/core (2026-09-05)', () => {
    // KNOWN DRIFT, deliberately pinned rather than fixed: the canonical engine
    // RETIRED the Stage-0 audio ladder on 2026-07-14 and deleted
    // composeSentenceArc / buildStage0Tier / loadStage0ClipMaps. PodLab.vue
    // still imports composeSentenceArc and loadStage0ClipMaps, so running
    // tools/sync-pod-engine.sh today would break Pod Lab's build. The vendored
    // copy is therefore frozen pre-retirement by consequence, and the banner's
    // "verbatim copy of the code the learner runs" claim no longer holds.
    // If this test starts FAILING, the two have been reconciled — delete it.
    const canonComposition = read(`${CANON}/podStageComposition.ts`)
    expect(canonComposition).not.toContain('export function composeSentenceArc')
    expect(canonComposition).not.toContain('export function buildStage0Tier')
    expect(canonComposition).toContain('uniformSpeed')

    const vendored = read(resolve(HERE, 'podEngine/podStageComposition.ts'))
    expect(vendored).toContain('export function composeSentenceArc')
    expect(vendored).toContain('export function buildStage0Tier')
    expect(vendored).not.toContain('uniformSpeed')
    expect(stripBanner(vendored)).not.toEqual(canonComposition)
  })
})

/**
 * STT ON TTS AUDIO IS REPORT-ONLY. This file is the gate that keeps it that way.
 *
 * Tom, 2026-09-28 (r-2026-09-28-no-automatic-whisper-stt-check-may):
 *   "we do NOT use automatic checks on listening content!!!! we are not supposed
 *    to anyway."
 * Standing since 2026-08-24 (ssi-stt-sampling-doctrine): STT on TTS audio is 10%
 * graduated sampling, never 100%, never a hard veto; full STT checks are for
 * HUMAN recordings only. Voice-match, level, length and tail are the hard gates.
 *
 * Why a test and not a note: the doctrine was written down on 2026-08-24 and the
 * code carried on vetoing. renderChecked re-rendered a failing sampled clip up to
 * three times and then refused it, the single-clip paths checked 100%
 * (ALWAYS_SAMPLER), and every ita_for_eng edit script copied that pattern, until
 * Whisper refusing correct Italian was noticed on 2026-09-28 (jobs #674, #678).
 *
 * Two halves:
 *  1. BEHAVIOUR — every place that used to veto or re-render on a Whisper verdict
 *     is driven with a failing verdict and must ship the audio as rendered.
 *  2. DECLARATION — every file under services/ and tools/ that runs Whisper must
 *     be listed below with the job it does. A new caller fails this test until
 *     its author declares it, which means reading this header first. If your new
 *     file re-rolls, re-renders, refuses or picks a take on a Whisper verdict for
 *     TTS audio, the answer is not to add it here — it is to not do that.
 */
import { describe, it, expect } from 'vitest'
const fs = require('fs')
const path = require('path')

const REPO = path.join(__dirname, '..')

// ─── 1. BEHAVIOUR ────────────────────────────────────────────────────────────

describe('renderChecked renders once and ships, whatever Whisper hears', () => {
  const V = require('./audio-veracity.cjs')
  const quiet = { info () {}, warn () {}, error () {}, log () {} }
  const failing = async () => ({ checked: true, pass: false, reason: 'cer_above_threshold', cer: 0.9, decode: 'altro' })

  for (const [name, sampler] of [
    ['a sampler that picks every clip', V.createSampler({ first: 1, trusted: 1, floor: 1 })],
    ['SPOT_SAMPLER', V.SPOT_SAMPLER],
    ['ALWAYS_SAMPLER (the old name ~40 scripts pass)', V.ALWAYS_SAMPLER],
  ]) {
    it(`with ${name}: one render, published, even with attempts: 5`, async () => {
      V._resetSpotSampler()
      let renders = 0
      const r = await V.renderChecked({
        sampler, attempts: 5, check: failing, logger: quiet,
        render: async () => { renders++; return { buffer: Buffer.from('x'), durationMs: 900 } },
        expectedText: "ha detto qualcos'altro?", language: 'ita',
        meta: { courseCode: 'tst_for_eng', role: 'target1', voiceId: 'it-IT-ElsaNeural' },
      })
      expect(renders).toBe(1)
      expect(r.published).toBe(true)
      expect(r.buffer).toBeTruthy()
    })
  }

  it('single-clip work is sampled, not checked 100%', () => {
    V._resetSpotSampler()
    let n = 0
    for (let i = 0; i < 50; i++) if (V.ALWAYS_SAMPLER.shouldCheck()) n++
    expect(n).toBeLessThanOrEqual(5)
  })
})

describe('the other places Whisper used to decide', () => {
  it('gate-stack: the words and phonology tiers never refuse a clip', () => {
    const { gateResult, disposition } = require('./audio-intelligence/gate-stack.cjs')
    const d = disposition([
      gateResult('words', { pass: false, refusing: true }),
      gateResult('phonology', { pass: null, available: false, refusing: true }),
    ])
    expect(d.admit).toBe(true)
  })

  it('reuse planner: a damaged verdict never promotes a clip to RENDER', async () => {
    const { verifyPlanVeracity } = require('./audio-reuse-planner.cjs')
    const plan = {
      clips: [{ clipKey: 'k', text: 'hallo', language: 'deu', role: 'target1', decision: 'SATISFIED', reason: 'linked', reuseSource: { s3Key: 'mastered/A.mp3' } }],
      summary: {}, byLayer: {},
    }
    await verifyPlanVeracity(plan, {
      fetchObject: async () => Buffer.from('x'),
      veracity: { checkAudioVeracity: async () => ({ checked: true, pass: false, reason: 'last_word_missing' }) },
      logger: { info () {} },
    })
    expect(plan.clips[0].decision).toBe('SATISFIED')
    expect(plan.clips[0].heard.pass).toBe(false)
  })

  it('tts-service: the xAI/Cartesia phonology check never throws or re-rolls', () => {
    const src = fs.readFileSync(path.join(__dirname, 'tts-service.cjs'), 'utf8')
    const start = src.indexOf('await detectSpokenLanguage(result.audioBuffer)')
    expect(start).toBeGreaterThan(0)
    const block = src.slice(start, src.indexOf('return result;', start))
    expect(block).not.toMatch(/\bthrow\b/)
  })
})

// ─── 2. DECLARATION ──────────────────────────────────────────────────────────

/**
 * Every file that runs Whisper, and the job it does. Roles:
 *   engine          the STT module itself (renderChecked: render once, sample, report)
 *   advisory        an STT result that is recorded on a TTS clip and never acts
 *   report          reads existing audio and prints/writes findings; renders nothing
 *   human-recording a check on a person's recording (full STT is doctrine there)
 *   infra           binary paths, wrappers, capability probes
 */
const STT_CALLERS = {
  'services/audio-veracity.cjs': 'engine',
  'services/tts-service.cjs': 'advisory',            // phonology sample, 1 in 10, logs only
  'services/audio-intelligence/gate-stack.cjs': 'advisory', // words + phonology tiers never refuse
  'services/audio-intelligence/decode.cjs': 'infra',
  'services/audio-processor.cjs': 'infra',
  'services/audio-repair.cjs': 'advisory',           // TTS candidates: verdict recorded; uploads: human-recording
  'services/audio-reuse-planner.cjs': 'report',      // verifyPlanVeracity annotates, never re-decides
  'services/production-api.cjs': 'human-recording',  // recordist upload text check, advisory
  'services/voicelab-playground/server.cjs': 'infra',
  'services/voicelab/runner.cjs': 'infra',
  'tools/a108/a133-artefact-rule-render-batch.cjs': 'report',
  'tools/a108/a133-chain-sample-batch.cjs': 'report',
  'tools/a108/a133-phrase-test.cjs': 'report',
  'tools/a108/isl-ell-est-render-verify.cjs': 'report',
  'tools/audio-word-loss-scan.cjs': 'report',
  'tools/band-verify-sample.cjs': 'report',
  'tools/course-optimization/swe-know-and-learner-fixes-2026-09-28.cjs': 'report', // renders via renderChecked
  'tools/fra-incumbent-veracity-sweep.cjs': 'report',
  'tools/pods/nld-vregister-decode-verify-2026-08-14.cjs': 'report',
  'tools/pods/pod1-sonic36-rerender.cjs': 'advisory',
  'tools/pods/pod1-tom-voice-render.cjs': 'advisory',
  'tools/pods/verify-pod-clips.cjs': 'report',
  'tools/pods/verify-spliced-sentences.cjs': 'report',
  'tools/recording-optimizer/segment-audio.cjs': 'human-recording',
  'tools/regen-seed-clips-from-scratch.cjs': 'advisory',
  'tools/render-take-g.cjs': 'advisory',
  'tools/repair-presentation-clips.cjs': 'advisory',
  'tools/rescue-child-voice-clips.cjs': 'advisory',
  'tools/rescue-wrong-language-clips.cjs': 'advisory',
  'tools/sweep-wrong-language-crosscourse.cjs': 'report',
  'tools/verify-regen-batch.cjs': 'report',
  'tools/whisper-capability-probe/probe.cjs': 'infra',
  'tools/whisper-capability-probe/verify-render-path.cjs': 'infra',
  'tools/whisper-cli-cap.sh': 'infra',
}

const RUNS_STT = /checkAudioVeracity\(|detectSpokenLanguage\(|whisper-cli|WHISPER_BIN|whisper\.cpp/

function sourceFiles (dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '__fixtures__' || e.name.startsWith('.')) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) sourceFiles(p, out)
    else if (/\.(cjs|js|mjs|ts|sh)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p)
  }
  return out
}

describe('every Whisper caller is declared', () => {
  const found = ['services', 'tools']
    .flatMap((d) => sourceFiles(path.join(REPO, d)))
    .filter((f) => RUNS_STT.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(REPO, f).split(path.sep).join('/'))
    .sort()

  it('no undeclared file runs Whisper — read this file\'s header before adding one', () => {
    const undeclared = found.filter((f) => !(f in STT_CALLERS))
    expect(undeclared, 'STT on TTS audio is report-only (Tom, 2026-09-28). Declare the new caller\'s role in services/stt-report-only.test.cjs — and if it vetoes, re-rolls or re-renders on a Whisper verdict, remove that instead.').toEqual([])
  })

  it('the ledger names no file that no longer runs Whisper', () => {
    expect(Object.keys(STT_CALLERS).filter((f) => !found.includes(f)).sort()).toEqual([])
  })
})

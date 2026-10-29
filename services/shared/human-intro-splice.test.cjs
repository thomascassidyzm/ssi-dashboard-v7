/**
 * Human-spliced LEGO intros (Aran 2026-10-27, job #210): cym_nv2/sv2 intros are made from Aran's own takes — fragment,
 * his English LEGO, joiner, the Welsh — through the one render route, and NEVER rendered (no Charlotte, no TTS).
 * No network, no DB. Run: npx vitest run services/shared/human-intro-splice.test.cjs
 */
import { describe, it, expect } from 'vitest'
const hi = require('./human-intro-splice.cjs')
const { renderClip } = require('./audio-render-entry.cjs')
const { normalizeForAudio } = require('./text-normalize.cjs')
const tool = require('../../tools/audio/human-intros.cjs')

const LEGO = { lego_id: 'S0001L01', known_text: 'I want', target_text: 'dw i isio', target1_audio_id: 'T1', presentation_audio_id: null }
const take = (id, text) => ({ id, s3_key: `mastered/${id}.mp3`, text })
const ALL_TAKES = new Map([['the welsh for', take('F', 'The Welsh for')], ['i want', take('X', 'I want')], ['is', take('J', 'is')]])
const WELSH = { id: 'T1', s3_key: 'mastered/T1.mp3', text: 'dw i isio', origin: 'human' }
// The splice switched ON, as it was from job #210 to job #587. The live config has it OFF ('whole-sentence intros').
const rule = { voiceId: 'human_aran_eng', fragment: 'The Welsh for', joiner: 'is', withTarget: true, splice: true }
const SPLICE_ON = { cym_nv2_for_eng: rule, cym_sv2_for_eng: rule }

function hooks({ lego = LEGO, takes = ALL_TAKES, target = WELSH, intro = null, table = SPLICE_ON } = {}) {
  const calls = { stored: [], linked: [] }
  return {
    calls,
    deps: {
      table,
      loadLego: async () => lego,
      findTakes: async (_v, texts) => new Map([...takes].filter(([k]) => texts.some((t) => normalizeForAudio(t) === k))),
      loadClip: async (id) => (target && target.id === id ? target : null),
      findIntro: async () => intro,
      fetchObject: async (k) => Buffer.from(k),
      decode: async () => Float32Array.from([0, 0.5, -0.5, 0]),
      join: (pcms, gaps) => { calls.gaps = gaps; return { pcm: new Float32Array(pcms.length) } },
      encode: () => Buffer.from('wav'),
      master: async () => ({ buffer: Buffer.from('mp3'), durationMs: 2100 }),
      store: async (x) => { calls.stored.push(x); return { audioId: 'NEW', s3Key: 'mastered/NEW.mp3' } },
      linkFill: async (c, l, a) => { calls.linked.push([c, l, a]); return { linked: true } },
    },
  }
}
const req = (o = {}) => ({ courseCode: 'cym_nv2_for_eng', legoId: 'S0001L01', ...o })

describe('the rule is data', () => {
  it('both v2 Welsh courses are human-spliced in human_aran_eng; nothing else is', () => {
    for (const c of ['cym_nv2_for_eng', 'cym_sv2_for_eng']) expect(hi.humanIntroConfig(c)).toMatchObject({ voiceId: 'human_aran_eng', fragment: 'The Welsh for', joiner: 'is', withTarget: true, splice: false })
    for (const c of ['cym_n_for_eng', 'spa_for_eng', 'toString', '']) expect(hi.humanIntroConfig(c)).toBeNull()
  })
  it('the stored text is the old cym markup', () => {
    expect(hi.humanIntroText(hi.humanIntroConfig('cym_nv2_for_eng'), LEGO)).toBe('The Welsh for <src>I want</src> is <tgt>dw i isio</tgt>.')
  })
  it('the booth owes one fragment and one joiner, shared by North and South', () => {
    expect(hi.fixedPiecesFor(['human_aran_eng'], SPLICE_ON)).toEqual([
      { key: 'fragment', text: 'The Welsh for', courseCodes: ['cym_nv2_for_eng', 'cym_sv2_for_eng'] },
      { key: 'joiner', text: 'is', courseCodes: ['cym_nv2_for_eng', 'cym_sv2_for_eng'] },
    ])
    expect(hi.fixedPiecesFor(['human_dan_cym_n'], SPLICE_ON)).toEqual([])
    // Whole-sentence intros (job #587): no pieces to read.
    expect(hi.fixedPiecesFor(['human_aran_eng'])).toEqual([])
  })
})

describe('whole-sentence intros: the splice is off (Aran 2026-10-29, job #587)', () => {
  const live = (o = {}) => hooks({ ...o, table: null }) // null = the live voicing-policy config
  it('a LEGO with no intro WAITS on his whole-sentence take — never spliced, even with every piece recorded', async () => {
    const { deps, calls } = live()
    const err = await hi.buildHumanIntro(req(), deps).catch((e) => e)
    expect(err.code).toBe('INTRO_WAITING')
    expect(err.waitingOn).toEqual([expect.objectContaining({ kind: 'sentence', text: 'The Welsh for <src>I want</src> is <tgt>dw i isio</tgt>.' })])
    expect(calls.stored).toEqual([])
    expect(calls.linked).toEqual([])
  })
  it('his take of the intro words, once filed, is what the route links (library), and a linked slot is left alone', async () => {
    const a = live({ intro: { id: 'TAKE', s3_key: 'mastered/TAKE.mp3' } })
    expect(await hi.buildHumanIntro(req(), a.deps)).toMatchObject({ source: 'library', audioId: 'TAKE' })
    expect(a.calls.linked).toEqual([['cym_nv2_for_eng', 'S0001L01', 'TAKE']])
    const b = live({ lego: { ...LEGO, presentation_audio_id: 'THERE' } })
    expect(await hi.buildHumanIntro(req(), b.deps)).toMatchObject({ source: 'already-linked', audioId: 'THERE' })
  })
})

describe('buildHumanIntro', () => {
  it('splices fragment, English, joiner, Welsh in that order, stores it as the human voice, fills the slot', async () => {
    const { deps, calls } = hooks()
    const out = await hi.buildHumanIntro(req(), deps)
    expect(out).toMatchObject({ ok: true, source: 'human-spliced', audioId: 'NEW', legoLinked: true, charsSpent: 0, voiceId: 'human_aran_eng' })
    expect(out.pieces.map((p) => p.audioId)).toEqual(['F', 'X', 'J', 'T1'])
    expect(calls.gaps).toEqual([190, 230, 320, 0])
    expect(calls.stored[0]).toMatchObject({ voiceId: 'human_aran_eng', legoId: 'S0001L01', text: 'The Welsh for <src>I want</src> is <tgt>dw i isio</tgt>.' })
    expect(calls.linked).toEqual([['cym_nv2_for_eng', 'S0001L01', 'NEW']])
  })
  it('a dry run names the pieces and writes nothing', async () => {
    const { deps, calls } = hooks()
    const out = await hi.buildHumanIntro(req({ dryRun: true }), deps)
    expect(out.source).toBe('would-splice')
    expect(calls.stored).toEqual([]); expect(calls.linked).toEqual([])
  })
  it('a missing English take, intro piece or Welsh take WAITS, naming it — nothing is stored', async () => {
    const noX = new Map([...ALL_TAKES].filter(([k]) => k !== 'i want'))
    const cases = [
      [{ takes: noX }, 'x'],
      [{ takes: new Map([['i want', take('X', 'I want')]]) }, 'fragment'],
      [{ target: { ...WELSH, origin: 'tts' } }, 'target'],
      [{ target: { ...WELSH, text: 'isio' } }, 'target'],
      [{ lego: { ...LEGO, target1_audio_id: null } }, 'target'],
    ]
    for (const [o, kind] of cases) {
      const { deps, calls } = hooks(o)
      const err = await hi.buildHumanIntro(req(), deps).catch((e) => e)
      expect(err.code).toBe('INTRO_WAITING')
      expect(err.waitingOn.map((w) => w.kind)).toContain(kind)
      expect(calls.stored).toEqual([])
    }
  })
  it('an intro already stored for these words is linked, not spliced again; a linked slot is left alone', async () => {
    const a = hooks({ intro: { id: 'OLD', s3_key: 'mastered/OLD.mp3' } })
    expect(await hi.buildHumanIntro(req(), a.deps)).toMatchObject({ source: 'library', audioId: 'OLD' })
    expect(a.calls.stored).toEqual([])
    const b = hooks({ lego: { ...LEGO, presentation_audio_id: 'THERE' } })
    expect(await hi.buildHumanIntro(req(), b.deps)).toMatchObject({ source: 'already-linked', audioId: 'THERE' })
    expect(b.calls.linked).toEqual([])
  })
  it('a stale text is refused; another course is not ours (null)', async () => {
    const { deps } = hooks()
    expect((await hi.buildHumanIntro(req({ text: "The Welsh for: 'I want', is:" }), deps).catch((e) => e)).code).toBe('INTRO_TEXT_MISMATCH')
    expect(await hi.buildHumanIntro(req({ courseCode: 'spa_for_eng' }), deps)).toBeNull()
  })
})

describe('through the one render route', () => {
  const routeDeps = (h, spoke) => ({
    resolve: async () => { spoke.push('resolve'); return { language: 'eng', voiceId: 'charlotte', provider: 'cartesia', providerConfig: {} } },
    link: async () => null,
    speak: async () => { spoke.push('speak'); return { audioBuffer: Buffer.alloc(1), charsSpent: 9 } },
    store: async () => ({ audioId: 'TTS', s3Key: 'k' }),
    linkLego: async () => ({ linked: true }),
    humanIntro: (r) => hi.buildHumanIntro(r, h),
  })
  const body = (o = {}) => ({ courseCode: 'cym_nv2_for_eng', role: 'presentation', legoId: 'S0001L01', text: 'The Welsh for <src>I want</src> is <tgt>dw i isio</tgt>.', purpose: 'p', requestedBy: 't', ...o })

  it('a cym_nv2 intro whose English take is missing is REFUSED 409 INTRO_WAITING — never rendered in Charlotte', async () => {
    const spoke = []
    const { deps } = hooks({ takes: new Map([...ALL_TAKES].filter(([k]) => k !== 'i want')) })
    const err = await renderClip(body(), routeDeps(deps, spoke)).catch((e) => e)
    expect(err.status).toBe(409)
    expect(err.code).toBe('INTRO_WAITING')
    expect(err.waitingOn[0]).toMatchObject({ kind: 'x', text: 'I want' })
    expect(spoke).toEqual([])
  })
  it('a ready one is spliced with no voice resolved and no character spent', async () => {
    const spoke = []
    const { deps } = hooks()
    const out = await renderClip(body(), routeDeps(deps, spoke))
    expect(out).toMatchObject({ ok: true, source: 'human-spliced', charsSpent: 0, purpose: 'p' })
    expect(spoke).toEqual([])
  })
  it('any other course carries on down the normal path', async () => {
    const spoke = []
    const { deps } = hooks()
    await renderClip(body({ courseCode: 'ita_for_eng', text: 'now you say' }), routeDeps(deps, spoke))
    expect(spoke).toEqual(['resolve', 'speak'])
  })
})

describe('tools/audio/human-intros.cjs census', () => {
  it('classifies ready / waiting and says whether a missing English take is already queued', () => {
    const cfg = hi.humanIntroConfig('cym_sv2_for_eng')
    const clips = new Map([['T1', WELSH]])
    const ready = tool.classify(cfg, LEGO, { takes: ALL_TAKES, clips, queued: new Set() })
    const waits = tool.classify(cfg, { ...LEGO, lego_id: 'S0002L01', known_text: 'to go' }, { takes: ALL_TAKES, clips, queued: new Set(['to go']) })
    expect(ready.ready).toBe(true)
    expect(waits).toMatchObject({ ready: false, xQueued: true })
    expect(tool.summarise('cym_sv2_for_eng', [ready, waits])).toMatchObject({ missingIntros: 2, readyNow: 1, waitingOnPiece: { x: 1 }, englishTakeMissing: { inHisQueueAlready: 1, notInAnyQueue: 0 } })
  })
})

/**
 * Unit tests for the pod cast gate (2026-08-23, Part B of Tom's Pod 1 rulings).
 *
 * What the gate is for: `movePod()` carries `speakers` across verbatim, so before
 * this existed a flip promoted whatever cast the staged pod happened to hold, and
 * the casting was bolted on afterwards by a separate recast sweep — per flip,
 * forever. The gate refuses to promote a pod that is not cast per conversation.
 *
 * The acceptance criterion under test is Tom's, and it is two numbers: ZERO
 * same-voice exchange pairs, and EXACTLY TWO voices in the cast. In his words —
 * "there's always male talking to female, so that two voices can actually do the
 * whole thing, rather than per character, which was the problem previously."
 */

import { describe, it, expect } from 'vitest'

const { checkPodCast } = require('./pod-cast-gate.cjs')

const F = { voice_id: 'sw-KE-ZuriNeural', name: 'Zuri', provider: 'azure' }
const M = { voice_id: 'sw-KE-RafikiNeural', name: 'Rafiki', provider: 'azure' }
const THIRD = { voice_id: 'sw-KE-SomeoneNeural', name: 'Someone', provider: 'azure' }

/** A two-hander: Anna and Guest alternating inside one scene. */
const twoHander = [
  { scene_number: 1, sentence_number: 1, global_order: 1, speaker: 'Anna', known_text: 'hello' },
  { scene_number: 1, sentence_number: 2, global_order: 2, speaker: 'Guest', known_text: 'hi' },
  { scene_number: 1, sentence_number: 3, global_order: 3, speaker: 'Anna', known_text: 'how are you' },
  { scene_number: 1, sentence_number: 4, global_order: 4, speaker: 'Guest', known_text: 'well' },
]

const castOf = (anna, guest, extra = {}) => ({
  Anna: { gender: 'f', target: anna, known: { voice_id: 'eng-narrator' } },
  Guest: { gender: 'm', target: guest, known: { voice_id: 'eng-narrator' } },
  ...extra,
})

describe('checkPodCast', () => {
  it('passes a two-hander cast to one voice each', () => {
    const r = checkPodCast({ rows: twoHander, speakers: castOf(F, M) })
    expect(r.ok).toBe(true)
    expect(r.failures).toEqual([])
    expect(r.voicesInUse).toHaveLength(2)
    expect(r.sameVoicePairs).toEqual([])
    expect(r.exchangePairs).toBe(1)
  })

  it('FAILS when two characters who talk to each other share a voice', () => {
    const r = checkPodCast({ rows: twoHander, speakers: castOf(F, F) })
    expect(r.ok).toBe(false)
    expect(r.sameVoicePairs).toHaveLength(1)
    expect(r.sameVoicePairs[0]).toMatchObject({ a: 'Anna', b: 'Guest', turns: 3 })
    expect(r.failures.join(' ')).toMatch(/same-voice exchange pair/)
  })

  it('FAILS a per-character cast — the exact shape Tom ruled against', () => {
    // Three characters, three voices, no same-voice collision anywhere. Under the
    // old per-character rule this was "correct"; it is the thing being replaced.
    const rows = [...twoHander,
      { scene_number: 1, sentence_number: 5, global_order: 5, speaker: 'Waiter', known_text: 'ready?' },
    ]
    const r = checkPodCast({
      rows,
      speakers: castOf(F, M, { Waiter: { gender: 'm', target: THIRD, known: { voice_id: 'eng-narrator' } } }),
    })
    expect(r.ok).toBe(false)
    expect(r.voicesInUse).toHaveLength(3)
    expect(r.sameVoicePairs).toEqual([])
    expect(r.failures.join(' ')).toMatch(/not 2/)
  })

  it('FAILS an uncast character rather than passing it silently', () => {
    const r = checkPodCast({ rows: twoHander, speakers: { Anna: { target: F } } })
    expect(r.ok).toBe(false)
    expect(r.uncast).toEqual(['Guest'])
    expect(r.failures.join(' ')).toMatch(/no target voice/)
  })

  it('FAILS a pod with no cast at all, and a pod with no rows', () => {
    expect(checkPodCast({ rows: twoHander, speakers: null }).ok).toBe(false)
    const empty = checkPodCast({ rows: [], speakers: castOf(F, M) })
    expect(empty.ok).toBe(false)
    expect(empty.failures.join(' ')).toMatch(/no sentence rows/)
  })

  it('does not count a scene boundary as an exchange', () => {
    // Anna ends scene 1, Guest opens scene 2: they never spoke to each other, so
    // sharing a voice across that boundary is not a collision.
    const rows = [
      { scene_number: 1, sentence_number: 1, global_order: 1, speaker: 'Anna', known_text: 'a' },
      { scene_number: 2, sentence_number: 1, global_order: 2, speaker: 'Guest', known_text: 'b' },
    ]
    const r = checkPodCast({ rows, speakers: castOf(F, F) })
    expect(r.exchangePairs).toBe(0)
    expect(r.sameVoicePairs).toEqual([])
    // Still fails, but on the voice COUNT — one voice, not two — never on a collision.
    expect(r.failures.join(' ')).toMatch(/not 2/)
  })

  it('normalises the voice-id prefix — `eve` and `xai_eve` are ONE voice', () => {
    const r = checkPodCast({
      rows: twoHander,
      speakers: castOf({ voice_id: 'eve' }, { voice_id: 'xai_eve' }),
    })
    expect(r.voicesInUse).toHaveLength(1)
    expect(r.sameVoicePairs).toHaveLength(1)
    expect(r.ok).toBe(false)
  })

  it('matches the cast on the CANONICAL speaker name, parenthesised markers and all', () => {
    // Estate rows carry "Anna (F)" / "Susjed (08:00)"; both cast stores are keyed
    // bare, so a gate that compared raw strings would report every pod uncast.
    const rows = twoHander.map(r => ({ ...r, speaker: `${r.speaker} (${r.speaker === 'Anna' ? 'F' : 'M'})` }))
    const r = checkPodCast({ rows, speakers: castOf(F, M) })
    expect(r.speakers).toEqual(['Anna', 'Guest'])
    expect(r.ok).toBe(true)
  })

  it('honours _default — and a _default-only cast is a ONE-voice pod, so it fails', () => {
    const r = checkPodCast({ rows: twoHander, speakers: { _default: { target: F } } })
    expect(r.uncast).toEqual([])            // nobody is uncast...
    expect(r.sameVoicePairs).toHaveLength(1) // ...they are all the same person
    expect(r.ok).toBe(false)
  })

  it('gates the TARGET track, never the known track', () => {
    // The eng_for_* shape is one narrator reading every character's known line.
    // That is a single voice by design and must not be judged by a two-voice rule.
    const r = checkPodCast({ rows: twoHander, speakers: castOf(F, M), track: 'known' })
    expect(r.voicesInUse).toEqual(['eng-narrator'])
    expect(r.ok).toBe(false) // it WOULD fail — which is why the callers pass target
    expect(checkPodCast({ rows: twoHander, speakers: castOf(F, M) }).track).toBe('target')
  })
})

/**
 * ---------------------------------------------------------------------------
 * THE SIX COLUMNS (2026-08-24, the ita_for_eng pod-1 scene 15 incident).
 *
 * A row has six audio slots; before today the gate read two of them, so a pod
 * whose SPLIT ARRAYS had been copied positionally out of a retired pod — wrong
 * conversation, wrong voice, and wrong on-screen text, because podSentenceSplit
 * takes targetText from the split clip's own course_audio.text — counted two
 * voices and went green. 113 Italian rows shipped that way. Tom: "the gate was
 * looking at the wrong columns."
 *
 * These fixtures are the incident, in miniature, plus the traps that make the
 * check honest: a non-Latin script (the first blast-radius table used a
 * Latin-only strip and so reported a false clean bill of health for jpn and
 * zho), a legitimately SHARED clip, and a sparse takeg array.
 */

const { checkPodClips, dense } = require('./pod-cast-gate.cjs')

const ARA = 'xai_ara'      // pod-1's recast female
const ENZO = 'xai_enzo'    // pod-1's male
const EVE = 'xai_eve'      // pod-0's retired female — NOT in the pod-1 cast
const OLIVIA = 'bedd6226'  // known-side narrator (f)
const TOM = 'gfzdpspr5fdp' // known-side narrator (m)

const itaCast = {
  'Diner 1': { target: { voice_id: ARA }, known: { voice_id: OLIVIA } },
  Waiter: { target: { voice_id: ENZO }, known: { voice_id: TOM } },
}

/** The live scene-15 row, with its whole turn correctly recast to Ara. */
const itaRow = (over = {}) => ({
  scene_number: 15,
  sentence_number: 1,
  global_order: 1,
  speaker: 'Diner 1',
  target_text: 'Quanto costa?',
  known_text: 'How much is it?',
  target_audio_id: 'ok-t',
  known_audio_id: 'ok-k',
  sentence_audio_ids: null,
  sentence_known_audio_ids: null,
  takeg_audio_ids: null,
  explainer_audio_id: null,
  ...over,
})

const itaReply = (over = {}) => ({
  scene_number: 15,
  sentence_number: 2,
  global_order: 2,
  speaker: 'Waiter',
  target_text: 'Sono dieci euro.',
  known_text: "It's ten euros.",
  target_audio_id: 'ok-t2',
  known_audio_id: 'ok-k2',
  ...over,
})

const itaClips = {
  'ok-t': { text: 'Quanto costa?', voice_id: ARA },
  'ok-k': { text: 'How much is it?', voice_id: OLIVIA },
  'ok-t2': { text: 'Sono dieci euro.', voice_id: ENZO },
  'ok-k2': { text: "It's ten euros.", voice_id: TOM },
  // The two clips inherited positionally from the retired pod-0: another
  // conversation entirely, in pod-0's female voice.
  'pod0-a': { text: "Le dispiacerebbe se provassi a praticare l'italiano con lei?", voice_id: EVE },
  'pod0-b': { text: 'Non sto imparando da molto tempo, e mi sento ancora un po\' nervoso di parlare con altre persone.', voice_id: EVE },
}

describe('checkPodCast — all six audio slots', () => {
  it('REPRODUCES ita scene 15: whole turns correctly cast, split array inherited from pod-0 — and FAILS it', () => {
    const rows = [itaRow({ sentence_audio_ids: ['pod0-a', 'pod0-b'] }), itaReply()]
    const r = checkPodCast({ rows, speakers: itaCast, clips: itaClips })

    // The old gate's two numbers are both still green — which is exactly how
    // this shipped. Everything below is what the old gate could not see.
    expect(r.voicesInUse).toHaveLength(2)
    expect(r.sameVoicePairs).toEqual([])

    expect(r.ok).toBe(false)
    expect(r.clipCheck).toBe('ran')
    expect(r.offCastClips).toBe(2)   // both split clips are Eve
    expect(r.wrongRowClips).toBe(2)  // ...speaking a different conversation
    const said = r.failures.join(' ')
    expect(said).toMatch(/off the pod cast/)
    expect(said).toMatch(/s15\/1 Diner 1 sentence_audio_ids/)
    expect(said).toMatch(/xai_eve|eve/)
    expect(said).toMatch(/does not belong to their own row/)
  })

  it('PASSES the same pod once the inherited array is nulled — the repair', () => {
    const r = checkPodCast({ rows: [itaRow(), itaReply()], speakers: itaCast, clips: itaClips })
    expect(r.failures).toEqual([])
    expect(r.ok).toBe(true)
    expect(r.clipsSeen).toBe(4)
  })

  it('is BACKWARD COMPATIBLE — no clips supplied means the old check, said out loud', () => {
    const rows = [itaRow({ sentence_audio_ids: ['pod0-a', 'pod0-b'] }), itaReply()]
    const r = checkPodCast({ rows, speakers: itaCast })
    expect(r.clipCheck).toBe('skipped')
    expect(r.ok).toBe(true) // the old verdict — the reason this incident happened
    expect(r.clipsSeen).toBe(0)
  })

  it('accepts a split array that genuinely tiles its own row, in order', () => {
    const rows = [itaRow({
      target_text: 'Buongiorno. Come stai?',
      target_audio_id: 'w',
      sentence_audio_ids: ['s1', 's2'],
    })]
    const clips = {
      w: { text: 'Buongiorno. Come stai?', voice_id: ARA },
      s1: { text: 'Buongiorno.', voice_id: ARA },
      s2: { text: 'Come stai?', voice_id: ARA },
      'ok-k': itaClips['ok-k'],
    }
    const r = checkPodClips({ rows, speakers: itaCast, clips })
    expect(r.failures).toEqual([])
    expect(r.wrongRowClips).toBe(0)
  })

  it('FAILS a split array whose pieces are in the WRONG ORDER — the live eus takeg defect', () => {
    // eus_for_eng pod-1 s4/2 holds its two glued takes back to front, so the
    // array plays the sentence in reverse. Every piece IS this row's text, so
    // only an ordering-aware walk catches it.
    const rows = [{
      scene_number: 4,
      sentence_number: 2,
      speaker: 'Diner 1',
      target_text: 'Kaixo! Barkatu, baina orain ezin dut hitz egin. Orain etxera joan behar dut.',
      takeg_audio_ids: ['g1', 'g2'],
    }]
    const clips = {
      g1: { text: 'orain ezin dut hitz egin. Orain, etxera joan behar dut.', voice_id: ARA },
      g2: { text: 'Kaixo! Barkatu, baina orain ezin dut hitz egin.', voice_id: ARA },
    }
    const r = checkPodClips({ rows, speakers: itaCast, clips })
    expect(r.incoherentSplits).toBe(1)
    expect(r.failures.join(' ')).toMatch(/out of order/)
  })

  it('does NOT punish a sparse takeg array — single-unit groups keep null by design', () => {
    const rows = [{
      scene_number: 1,
      sentence_number: 3,
      speaker: 'Diner 1',
      target_text: 'Sto molto bene, grazie. Vai a lavorare?',
      takeg_audio_ids: ['g1', null],
    }]
    const clips = { g1: { text: 'Sto molto bene, grazie.', voice_id: ARA } }
    const r = checkPodClips({ rows, speakers: itaCast, clips })
    expect(r.failures).toEqual([])
  })

  it('FAILS a split array that covers only a sliver of its own row', () => {
    const rows = [{
      scene_number: 1,
      sentence_number: 1,
      speaker: 'Diner 1',
      target_text: 'Sì, oggi ho una giornata impegnativa e spero che tu abbia una buona giornata.',
      sentence_audio_ids: ['a', 'b'],
    }]
    const clips = { a: { text: 'Sì,', voice_id: ARA }, b: { text: 'oggi', voice_id: ARA } }
    const r = checkPodClips({ rows, speakers: itaCast, clips })
    expect(r.incoherentSplits).toBe(1)
    expect(r.failures.join(' ')).toMatch(/tile only/)
  })

  it('FAILS a dangling audio id rather than skipping it', () => {
    const rows = [itaRow({ sentence_audio_ids: ['ghost', 'ok-t'] })]
    const r = checkPodClips({ rows, speakers: itaCast, clips: itaClips })
    expect(r.danglingClips).toBe(1)
    expect(r.failures.join(' ')).toMatch(/no course_audio row/)
  })

  it('treats a clip SHARED by two rows as legitimate on both', () => {
    // normalize_text-style equality means a seed and a use phrase — or two rows
    // with the same line — resolve to ONE clip. Sharing is not a defect.
    const rows = [
      { scene_number: 1, sentence_number: 1, speaker: 'Diner 1', target_text: 'Grazie.', target_audio_id: 'shared' },
      { scene_number: 3, sentence_number: 4, speaker: 'Diner 1', target_text: 'Grazie!', target_audio_id: 'shared' },
    ]
    const r = checkPodClips({ rows, speakers: itaCast, clips: { shared: { text: 'Grazie', voice_id: ARA } } })
    expect(r.failures).toEqual([])
    expect(r.clipsSeen).toBe(2)
  })

  it('gates the KNOWN-side clips even though the known TRACK is not two-voice gated', () => {
    const rows = [itaRow({ sentence_known_audio_ids: ['k-bad'] })]
    const clips = { ...itaClips, 'k-bad': { text: 'Would you mind if I practised my Italian with you?', voice_id: 'en-GB-SoniaNeural' } }
    const r = checkPodClips({ rows, speakers: itaCast, clips })
    expect(r.offCastClips).toBe(1)
    expect(r.wrongRowClips).toBe(1)
  })
})

describe('checkPodClips — script safety (the false-0% trap)', () => {
  // The first blast-radius measurement stripped non-Latin script before
  // comparing, so every Japanese and Chinese character fell out and everything
  // "matched": jpn_for_eng and zho_for_eng were reported 0% affected, which was
  // an artefact. These two fixtures fail if that ever comes back.
  const jpCast = { Sarah: { target: { voice_id: ARA }, known: { voice_id: OLIVIA } } }
  const jpRow = (over = {}) => ({
    scene_number: 1, sentence_number: 3, speaker: 'Sarah',
    target_text: 'とても元気です、ありがとうございます。お仕事に行くんですか。',
    known_text: "I'm very well, thank you. Are you going to work?",
    ...over,
  })

  it('normalises Japanese to something that still HAS content', () => {
    expect(dense('とても元気です、ありがとうございます。')).toBe('とても元気ですありがとうございます')
    expect(dense('你们有吃的吗？')).toBe('你们有吃的吗')
    expect(dense('')).toBe('')
  })

  it('PASSES a Japanese split array that really is its own row', () => {
    const r = checkPodClips({
      rows: [jpRow({ sentence_audio_ids: ['j1', 'j2'] })],
      speakers: jpCast,
      clips: {
        j1: { text: 'とても元気です、ありがとうございます。', voice_id: ARA },
        j2: { text: 'お仕事に行くんですか。', voice_id: ARA },
      },
    })
    expect(r.failures).toEqual([])
  })

  it('FAILS a Japanese split array inherited from a different conversation', () => {
    const r = checkPodClips({
      rows: [jpRow({ sentence_audio_ids: ['x1', 'x2'] })],
      speakers: jpCast,
      clips: {
        x1: { text: '何か食べ物はありますか。', voice_id: EVE },
        x2: { text: 'すみません、この席は空いていますか。', voice_id: EVE },
      },
    })
    expect(r.wrongRowClips).toBe(2)
    expect(r.offCastClips).toBe(2)
    expect(r.failures.join(' ')).toMatch(/does not belong/)
  })

  it('FAILS a Chinese split array from another row, and passes its own', () => {
    const zhRow = (ids) => ({
      scene_number: 7, sentence_number: 10, speaker: 'Sarah',
      target_text: '一共是八英镑四十便士。', sentence_audio_ids: ids,
    })
    const clips = {
      own1: { text: '一共是', voice_id: ARA },
      own2: { text: '八英镑四十便士。', voice_id: ARA },
      other: { text: '一共五十八块', voice_id: ARA },
    }
    expect(checkPodClips({ rows: [zhRow(['own1', 'own2'])], speakers: jpCast, clips }).failures).toEqual([])
    const bad = checkPodClips({ rows: [zhRow(['other', 'own2'])], speakers: jpCast, clips })
    expect(bad.wrongRowClips).toBe(1)
  })
})

describe('checkPodClips — the explainer slot', () => {
  const cast = { Sarah: { target: { voice_id: ARA }, known: { voice_id: TOM } } }
  const row = (over = {}) => ({
    scene_number: 1, sentence_number: 3, speaker: 'Sarah',
    target_text: 'Sto molto bene, grazie. Vai a lavorare?',
    explainer_audio_id: 'e', ...over,
  })

  it('accepts an explainer that quotes a chunk of its own row', () => {
    const clips = { e: { text: '"Sto molto bene". means I\'m very well. "grazie". means thank you.', voice_id: TOM } }
    const r = checkPodClips({ rows: [row()], speakers: cast, clips })
    expect(r.failures).toEqual([])
    expect(r.clipWarnings).toEqual([])
  })

  it('WARNS — does not block — on an explainer that quotes another row entirely', () => {
    const clips = { e: { text: '"Grazie mille". means thank you very much. "Arrivederci". means goodbye.', voice_id: TOM } }
    const r = checkPodClips({ rows: [row()], speakers: cast, clips })
    expect(r.failures).toEqual([])                 // not blocking by default…
    expect(r.explainerIssues).toBe(1)              // …but measured and named
    expect(r.clipWarnings.join(' ')).toMatch(/does not belong to their own row/)
  })

  it('blocks the same explainer when the caller asks it to', () => {
    const clips = { e: { text: '"Grazie mille". means thank you very much.', voice_id: TOM } }
    const r = checkPodClips({ rows: [row()], speakers: cast, clips, explainerBlocking: true })
    expect(r.failures.join(' ')).toMatch(/does not belong/)
    expect(checkPodCast({ rows: [row()], speakers: cast, clips, explainerBlocking: true }).ok).toBe(false)
  })

  it('reads a COMPOSITE voice id as its component voices, not as one string', () => {
    // The explainer is stitched: `comp:<chunk voice>+<gloss voice>`. Judging the
    // whole string would call every composite in the estate off-cast.
    const inCast = { e: { text: '"grazie". means thank you.', voice_id: `comp:${ARA}+${TOM}` } }
    expect(checkPodClips({ rows: [row()], speakers: cast, clips: inCast }).offCastClips).toBe(0)
    const legacy = { e: { text: '"grazie". means thank you.', voice_id: `comp:${ARA}+azure_en-GB-SoniaNeural` } }
    const r = checkPodClips({ rows: [row()], speakers: cast, clips: legacy })
    expect(r.offCastClips).toBe(1)
    expect(r.clipWarnings.join(' ')).toMatch(/en-gb-sonianeural/i)
  })

  it('says nothing about an explainer that quotes nothing it can check', () => {
    const clips = { e: { text: 'no quoted chunks at all', voice_id: TOM } }
    const r = checkPodClips({ rows: [row()], speakers: cast, clips })
    expect(r.explainerIssues).toBe(0)
    expect(r.unverifiableClips).toBe(1)
  })
})

/**
 * Tests for the human-recording speech-content gate.
 *
 * These pin the OPERATING POINT measured on 2026-08-23 against Catrin's four
 * real cym_n_for_eng:pod-0 takes — one genuine read and three recordings of an
 * empty room. If one of these fails after a threshold change, that is the
 * point: the gate no longer separates the four clips it was built from, and
 * the header's table must be re-measured in the same commit.
 *
 * The real decodes are not exercised here (ffmpeg subprocess, and the clips are
 * 2.8 MB of S3 objects). The end-to-end check against the four real takes is
 * `tools/recording/validate-speech-gate-catrin-four.cjs`; its result is
 * recorded in docs/pods/catrin-empty-takes-diagnosis-2026-08-23.md.
 */
import { describe, it, expect } from 'vitest'

const G = require('./recording-speech-gate.cjs')

// The four takes, verbatim from recording_provenance.quality_notes.text, with
// the durations course_audio actually stored for them.
const TAKE_1_GOOD = { text: 'Bore da. Sut wyt ti?', durationMs: 3250 }
const TAKE_2_ROOM = { text: 'Ydw,… mae gen i ddiwrnod prysur… heddiw. Gobeithio… cei di ddiwrnod da. Wela i di wedyn.', durationMs: 96798 }
const TAKE_3_ROOM = { text: "Esgusodwch fi,… ydy'r sedd yma… wedi'i chymryd?", durationMs: 46651 }
const TAKE_4_ROOM = { text: "Nac ydy, mae hi'n rhydd. Croeso i chi eistedd.", durationMs: 31455 }

describe('ceilingFor', () => {
  it('sizes a take from the syllables in the line, plus a flat grace', () => {
    const c = G.ceilingFor('Bore da. Sut wyt ti?', 'cym')
    expect(c.syllables).toBe(6)
    expect(c.ceilingSec).toBeCloseTo(6 * G.MAX_SEC_PER_SYLLABLE + G.GRACE_SEC, 5)
  })

  it('reports that a non-English/German counter is NOT calibrated', () => {
    // The qualifier must travel — the veracity gate lost its German-and-English
    // fitting caveat once and the estate paid for it.
    expect(G.ceilingFor('Bore da', 'cym').calibrated).toBe(false)
    expect(G.ceilingFor('good morning', 'eng').calibrated).toBe(true)
  })

  it('refuses to size a script it cannot count', () => {
    expect(G.ceilingFor('', 'cym').ceilingSec).toBeNull()
    expect(G.ceilingFor('   ', 'cym').ceilingSec).toBeNull()
    expect(G.ceilingFor('rhif 1984', 'cym').uncountable).toMatch(/digits/)
  })

  it('gives a one-word line enough room for a breath and a cough', () => {
    // Without GRACE_SEC a one-syllable line would have a ~1 s ceiling and every
    // real take of it would be refused.
    expect(G.ceilingFor('Ie', 'cym').ceilingSec).toBeGreaterThan(4)
  })
})

describe('the four real takes — the operating point', () => {
  // The good take is inside the ceiling, so it never reaches a decode at all.
  it('passes the genuine read on duration alone, with no decode', async () => {
    const r = await G.checkTakeHasSpeech({
      expectedText: TAKE_1_GOOD.text, language: 'cym', durationMs: TAKE_1_GOOD.durationMs,
      // No buffer and no filePath: if this test ever needed a decode it would
      // throw, which is exactly the assertion — a normal take costs nothing.
    })
    expect(r.pass).toBe(true)
    expect(r.checked).toBe(true)
    expect(r.reason).toBe('within_expected_duration')
    expect(r.detail.secPerSyllable).toBeLessThan(1)
  })

  it.each([
    ['take 2', TAKE_2_ROOM, 24],
    ['take 3', TAKE_3_ROOM, 14],
    ['take 4', TAKE_4_ROOM, 12],
  ])('%s trips the ceiling — the room is not a read', (_name, take, syllables) => {
    const c = G.ceilingFor(take.text, 'cym')
    expect(c.syllables).toBe(syllables)
    expect(take.durationMs / 1000).toBeGreaterThan(c.ceilingSec)
  })

  it('keeps a real margin on both sides of the line', () => {
    // Nearer the empty end on purpose: refusing a good take costs one re-read,
    // passing an empty one puts a sheep in front of a learner.
    const good = G.ceilingFor(TAKE_1_GOOD.text, 'cym')
    expect(TAKE_1_GOOD.durationMs / 1000).toBeLessThan(good.ceilingSec / 3)

    const worst = G.ceilingFor(TAKE_4_ROOM.text, 'cym') // the shortest empty take
    expect(TAKE_4_ROOM.durationMs / 1000).toBeGreaterThan(worst.ceilingSec * 1.5)
  })
})

describe('three outcomes, never two', () => {
  it('is UNCHECKED, not a pass, when there is no script to size against', async () => {
    const r = await G.checkTakeHasSpeech({ expectedText: null, language: 'cym', durationMs: 96798 })
    expect(r.pass).toBeNull()
    expect(r.checked).toBe(false)
    expect(r.reason).toBe('unchecked_no_countable_script')
  })

  it('is UNCHECKED, not a pass, when the script contains digits it cannot count', async () => {
    const r = await G.checkTakeHasSpeech({ expectedText: 'rhif 1984', language: 'cym', durationMs: 96798 })
    expect(r.pass).toBeNull()
    expect(r.checked).toBe(false)
  })

  it('is UNCHECKED, never a refusal, when the take cannot be decoded', async () => {
    // An over-ceiling take whose bytes ffmpeg cannot read. The gate must not
    // convict on the duration alone — an infrastructure absence may never cost
    // a recordist a good read.
    const r = await G.checkTakeHasSpeech({
      buffer: Buffer.from('not audio'),
      expectedText: TAKE_4_ROOM.text, language: 'cym', durationMs: TAKE_4_ROOM.durationMs,
    })
    expect(r.pass).toBeNull()
    expect(r.checked).toBe(false)
    expect(r.reason).toMatch(/^unchecked_/)
    expect(r.message).toBeNull()
  })

  it('gives the recordist a message ONLY when it is refusing', async () => {
    const passed = await G.checkTakeHasSpeech({ expectedText: TAKE_1_GOOD.text, language: 'cym', durationMs: 3250 })
    expect(passed.message).toBeNull()
    // Every refusal reason has a plain-English message behind it.
    for (const reason of Object.keys(G.MESSAGES)) {
      expect(G.MESSAGES[reason]).toMatch(/read the line again|try again/)
      expect(G.MESSAGES[reason]).not.toMatch(/dBFS|VAD|syllable|ffmpeg/)
    }
  })
})

describe('languageForTake', () => {
  it('reads the target half of the course code, without its regional suffix', () => {
    expect(G.languageForTake('cym_n_for_eng', 'target')).toBe('cym')
    expect(G.languageForTake('spa_mx_for_eng', 'target')).toBe('spa')
    expect(G.languageForTake('fra_for_eng', 'target')).toBe('fra')
  })

  it('reads the KNOWN half for a known-side line — that one is English', () => {
    expect(G.languageForTake('cym_n_for_eng', 'known')).toBe('eng')
  })

  it('returns null rather than guessing at a code it does not recognise', () => {
    expect(G.languageForTake('nonsense', 'target')).toBeNull()
    expect(G.languageForTake(null, 'target')).toBeNull()
  })
})

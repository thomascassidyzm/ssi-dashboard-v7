#!/usr/bin/env node
/**
 * Tests for splice-sentence-clips.cjs.
 *
 * Two things are worth testing here and they are both places where a silent
 * wrong answer would reach a learner:
 *
 *  1. THE SENTENCE SPLIT. The number of pieces this tool writes becomes the
 *     number of cards the app shows, because splitRowUnits takes its unit count
 *     from the clip array. If the split is wrong the learner gets the wrong
 *     number of cards with the wrong text on them.
 *
 *  2. THE MEASUREMENT. The seam gate is the only thing standing between a bad
 *     cut and the course, and during this tool's build it was wrong TWICE in
 *     the direction that passes bad cuts (fast `-ss` measured an empty window
 *     and reported silence; output-side `-ss` measured the whole file). Both
 *     bugs were invisible from the tool's own output — everything just passed.
 *     So the measurement is tested against synthesised audio whose true levels
 *     are known by construction, not against a real clip whose answer we'd be
 *     guessing at.
 *
 *   node tools/pods/splice-sentence-clips.test.cjs
 */
const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

process.env.PHASE8_NO_LISTEN = '1'
const T = require('./splice-sentence-clips.cjs')

const tmp = fs.mkdtempSync(path.join(process.env.CS_SCRATCH || os.tmpdir(), 'splice-test-'))
let pass = 0
const it = (name, fn) => {
  try { fn(); console.log(`  ok  ${name}`); pass++ } catch (e) {
    console.error(`  FAIL ${name}\n       ${e.message}`); process.exitCode = 1
  }
}
const itAsync = async (name, fn) => {
  try { await fn(); console.log(`  ok  ${name}`); pass++ } catch (e) {
    console.error(`  FAIL ${name}\n       ${e.message}`); process.exitCode = 1
  }
}

async function main () {
  const split = (t) => T.splitOn(t, T.SENTENCE_SPLIT)

  console.log('sentence split')

  it('splits Latin sentences on terminal punctuation + space', () => {
    assert.deepStrictEqual(split('Guten Morgen. Wie geht es dir?'),
      ['Guten Morgen.', 'Wie geht es dir?'])
  })

  it('does not split a decimal or an abbreviation', () => {
    // The Latin arm requires whitespace after the mark precisely for this.
    assert.deepStrictEqual(split('Das kostet 3.50 Euro.'), ['Das kostet 3.50 Euro.'])
  })

  it('splits CJK terminals with no following space', () => {
    // The app's own regex cannot do this; the tool extends it, and the app then
    // takes the per-card TEXT from each clip rather than from its regex.
    assert.deepStrictEqual(split('我是护士。你呢？'), ['我是护士。', '你呢？'])
  })

  it('splits Arabic ؟ like a Latin question mark', () => {
    assert.strictEqual(split('أنا بخير. وأنت؟ أراك غدا.').length, 3)
  })

  it('keeps the terminal punctuation on the sentence it ends', () => {
    for (const s of split('Bis dann. Ciao!')) assert.match(s, /[.!?]$/)
  })

  it('treats a single sentence as a single piece (no split, no work)', () => {
    assert.strictEqual(split('Quanto costa?').length, 1)
  })

  it('never emits an empty or untrimmed piece', () => {
    for (const s of split('Ja.   Nein.  Vielleicht.')) {
      assert.ok(s.length > 0 && s === s.trim(), `bad piece ${JSON.stringify(s)}`)
    }
  })

  console.log('level measurement (synthesised audio, true levels known by construction)')

  /** 1s of a full-scale tone, then `gapMs` of true digital silence, then 1s of tone. */
  function makeToneGapTone (file, gapMs) {
    const gap = gapMs / 1000
    execFileSync('ffmpeg', ['-y', '-v', 'error',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1',
      '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono:d=${gap}`,
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1',
      '-filter_complex', '[0:a][1:a][2:a]concat=n=3:v=0:a=1[out]',
      '-map', '[out]', '-c:a', 'libmp3lame', '-b:a', '96k', file])
  }

  const tgt = path.join(tmp, 'tone-gap-tone.mp3')
  makeToneGapTone(tgt, 800)

  await itAsync('reads a loud window as loud', async () => {
    const db = await T.peakDb(tgt, 0.5, 0.03)   // mid-tone
    // The bar is the seam gate's own floor (-35 dB), not full scale: ffmpeg's
    // `sine` through a 96k mp3 lands around -18 dB, and asserting "near 0 dB"
    // would be testing the encoder's gain rather than the measurement.
    assert.ok(db > -30, `expected an audible tone, measured ${db} dB`)
  })

  await itAsync('reads a silent window as silent', async () => {
    const db = await T.peakDb(tgt, 1.4, 0.03)   // mid-gap
    assert.ok(db < -60, `expected digital silence, measured ${db} dB`)
  })

  await itAsync('REGRESSION: a windowed read must not return the whole file', async () => {
    // The output-side `-ss` bug made every window return the clip's overall peak,
    // so a silent window read as loud. If this fails that way, the window is not
    // being applied at all.
    const quiet = await T.peakDb(tgt, 1.4, 0.03)
    const loud = await T.peakDb(tgt, 0.5, 0.03)
    assert.ok(loud - quiet > 40,
      `windows are not isolating: loud=${loud} quiet=${quiet}`)
  })

  await itAsync('REGRESSION: an unreadable window throws rather than reporting silence', async () => {
    // The fast-seek bug decoded nothing and the old code called that -91 dB.
    // Silence-shaped nothing must never be reported as measured silence.
    await assert.rejects(
      () => T.peakDb(tgt, 900, 0.03),   // far past the end of the file
      /no samples|no max_volume/,
      'a window past the end of the file must throw, not read as quiet')
  })

  console.log('gates')

  await itAsync('splices a clean two-sentence take and passes every gate', async () => {
    const r = await T.spliceAndGate(tgt, 2, path.join(tmp, 'clean'))
    assert.ok(r.ok, `expected pass, refused with ${r.reason}`)
    assert.strictEqual(r.measure.piece_durs.length, 2)
    for (const s of r.measure.seams_db) {
      assert.ok(s.db < -60, `seam ${s.edge} measured ${s.db} dB in synthetic silence`)
    }
  })

  await itAsync('refuses when there is no gap to cut at', async () => {
    // Two tones butted together: no silence anywhere, so no cut is possible.
    const nogap = path.join(tmp, 'nogap.mp3')
    makeToneGapTone(nogap, 0)
    const r = await T.spliceAndGate(nogap, 2, path.join(tmp, 'nogap'))
    assert.strictEqual(r.ok, false)
    assert.strictEqual(r.reason, 'too_few_gaps')
  })

  await itAsync('refuses rather than inventing a third piece from two sentences of audio', async () => {
    // Asking for 3 pieces from a take with one gap must refuse, not guess.
    const r = await T.spliceAndGate(tgt, 3, path.join(tmp, 'greedy'))
    assert.strictEqual(r.ok, false)
    assert.strictEqual(r.reason, 'too_few_gaps')
  })

  fs.rmSync(tmp, { recursive: true, force: true })
  console.log(`\n${pass} passed${process.exitCode ? ', SOME FAILED' : ''}`)
}

main().catch((e) => { console.error('ERR:', e); process.exit(1) })

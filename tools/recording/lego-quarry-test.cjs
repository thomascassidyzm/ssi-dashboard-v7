/**
 * lego-quarry-test.cjs — pins the minimal set.
 *
 * Cheap on purpose: one node process, a stub db, no vitest, no network unless
 * SUPABASE credentials are present. The blast radius of this module is one
 * queue section and one measurement report, so an application-wide suite would
 * be a ritual rather than a check.
 *
 * The number this pins is the one Tom reads off the booth screen before he
 * decides whether dice-and-splice is worth building. If a future change moves
 * it, it must move it out loud.
 *
 *   node tools/recording/lego-quarry-test.cjs
 */
'use strict'
require('dotenv').config()
const { buildLegoQuarry, tile, indexInventory } = require('../../services/voice-engine/lego-quarry.cjs')

let failed = 0
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failed += 1
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : `\n       expected ${JSON.stringify(expected)}\n       actual   ${JSON.stringify(actual)}`}`)
}

// ── the tiler, on its own ───────────────────────────────────────────────────
{
  const inv = [
    { key: 'me gusta', words: ['me', 'gusta'] },
    { key: 'gusta', words: ['gusta'] },
    { key: 'me', words: ['me'] },
  ].sort((a, b) => b.words.length - a.words.length)
  const idx = indexInventory(inv)
  // LONGEST WINS: 'me gusta' is one piece, not two. That is the whole point of
  // the LEGO being the covering unit — a joint we do not cut is a joint that
  // cannot sound wrong.
  check('tiler prefers the longest LEGO', tile('me gusta', idx), { used: ['me gusta'], leftover: [] })
  // A word no LEGO covers falls through to the fallback rather than vanishing.
  check('uncovered word becomes fallback', tile('me gusta mucho', idx), { used: ['me gusta'], leftover: ['mucho'] })
}

// ── the whole computation, over a stub db ───────────────────────────────────
function stubDb(tables) {
  const chain = (rows) => {
    const q = {
      rows,
      eq(col, v) { q.rows = q.rows.filter((r) => r[col] === v); return q },
      lte(col, v) { q.rows = q.rows.filter((r) => Number(r[col]) <= v); return q },
      in(col, vs) { q.rows = q.rows.filter((r) => vs.includes(r[col])); return q },
      maybeSingle() { return Promise.resolve({ data: q.rows[0] || null, error: null }) },
      range(from, to) { return Promise.resolve({ data: q.rows.slice(from, to + 1), error: null }) },
      then(res) { return Promise.resolve({ data: q.rows, error: null }).then(res) },
    }
    return q
  }
  return { from: (t) => ({ select: () => chain((tables[t] || []).map((r) => ({ ...r }))) }) }
}

;(async () => {
  const q = await buildLegoQuarry(stubDb({
    courses: [{ course_code: 'zzz_x_for_eng', target_lang: 'spa', known_lang: 'eng' }],
    course_legos: [
      { course_code: 'zzz_x_for_eng', lego_id: 'L1', seed_number: 1, known_text: 'I like', target_text: 'me gusta', target1_audio_id: null },
      { course_code: 'zzz_x_for_eng', lego_id: 'L2', seed_number: 1, known_text: 'a lot', target_text: 'mucho', target1_audio_id: 'clip-1' },
      { course_code: 'zzz_x_for_eng', lego_id: 'L3', seed_number: 9, known_text: 'later', target_text: 'luego', target1_audio_id: null },
    ],
    course_practice_phrases: [
      { course_code: 'zzz_x_for_eng', id: 'p1', seed_number: 1, target_text: 'me gusta mucho', target1_audio_id: null },
      { course_code: 'zzz_x_for_eng', id: 'p2', seed_number: 1, target_text: 'me gusta bailar', target1_audio_id: null },
    ],
    course_seeds: [
      { course_code: 'zzz_x_for_eng', id: 's1', seed_number: 1, known_text: 'I like it a lot', target_text: 'me gusta mucho', target1_audio_id: null },
    ],
  }), 'zzz_x_for_eng', { maxSeed: 5 })

  // Seed 9's LEGO is above the ceiling and must not appear anywhere.
  check('seed ceiling excludes later LEGOs', q.pieces.map((p) => p.key).includes('luego'), false)
  // THE SET DOES NOT SHRINK AS YOU READ IT (2026-09-03). 'mucho' already has its
  // own human clip, so it is FREE -- and it is still a piece of the set, marked
  // free and carrying the clip that makes it so. It used to be filtered out of
  // `pieces` entirely, and that is the whole of the booth defect Tom found: the
  // moment he read a chunk it vanished, so his screen could only ever say "none
  // recorded yet" with nothing left to mark done.
  check('a free piece stays in the set', q.pieces.map((p) => p.key), ['me gusta', 'bailar', 'mucho'])
  check('a free piece says it is free', q.pieces.find((p) => p.key === 'mucho').free, true)
  check('a free piece names the clip that fills its slot', q.pieces.find((p) => p.key === 'mucho').audioId, 'clip-1')
  check('an unread piece is not free', q.pieces.find((p) => p.key === 'me gusta').free, false)
  // A fallback WORD owns no row, so it never has a slot to be filled.
  check('a fallback word has no slot', q.pieces.find((p) => p.key === 'bailar').audioId, null)
  // The size of the set and the reading burden are two numbers, in two places.
  check('stats size the whole set', q.stats.quarryPieces, 3)
  check('stats also carry what is left', q.stats.toRead.pieces, 2)
  check('a LEGO with its own clip is free', q.stats.ownClip, 1)
  // The uncovered word is read too — words are the fallback, not free.
  check('fallback word is a quarry piece', q.pieces.find((p) => p.key === 'bailar').source, 'word')
  check('quarry pieces are read gapped', [...new Set(q.pieces.map((p) => p.readStyle))], ['gapped'])
  check('seeds are read whole and natural', q.seeds.map((s) => s.readStyle), ['natural'])
  check('longest piece first', q.pieces[0].key, 'me gusta')

  // ── the live pin ──────────────────────────────────────────────────────────
  // THE HEADLINE NUMBER. Measured 2026-09-02 against zzz_test2_for_eng, and it
  // is what the booth screen tells Tom before he stands at the mic. Skipped
  // without credentials rather than failed: a missing secret is not a bug in
  // this module, and saying so is more use than a red line.
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log('skip zzz_test2_for_eng live pin (no SUPABASE credentials)')
  } else {
    const { createClient } = require('@supabase/supabase-js')
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
    const live = await buildLegoQuarry(db, 'zzz_test2_for_eng', { maxSeed: 30 })
    const s = live.stats
    check('zzz_test2_for_eng @30: covering LEGOs', s.quarryLegos, 89)
    check('zzz_test2_for_eng @30: fallback words', s.quarryFallbackWords, 79)
    check('zzz_test2_for_eng @30: quarry pieces', s.quarryPieces, 168)
    check('zzz_test2_for_eng @30: whole seed sentences', s.seedsWhole, 30)
    check('zzz_test2_for_eng @30: lines in total', s.lines, 198)
    check('zzz_test2_for_eng @30: minutes of reading', Math.round(s.totalSeconds / 60), 13)
  }

  console.log(failed ? `\n${failed} FAILED` : '\nall good')
  process.exit(failed ? 1 : 0)
})().catch((e) => { console.error(e); process.exit(1) })

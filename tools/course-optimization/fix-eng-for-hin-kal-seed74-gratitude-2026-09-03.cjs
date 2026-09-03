#!/usr/bin/env node
/**
 * eng_for_hin seed 74 — the one कल prompt that still fixes no direction.
 *
 * `eng_for_hin:S0074L01U02`
 *   कल समझने में मेरी मदद करने के लिए बहुत-बहुत शुक्रिया।
 *   "thank you very much for helping me to understand yesterday"
 *
 * The frame is a bare nominal — करने के लिए … शुक्रिया, "thanks for X-ing" —
 * with NO finite verb anywhere, so nothing in the Hindi fixes कल to past. The
 * 2026-09-03 sentence-context pass judged the gratitude frame retrospective by
 * construction and left it; an independent re-reading the same day (job #346)
 * read it as ambiguous, because thanking someone in advance is idiomatic in
 * both languages. Two readings, so the safer one wins: under Kai's rule —
 * "every time we use 'yesterday'/'tomorrow', clear context in the sentence" —
 * this sentence has none.
 *
 * FIX SHAPE, on the precedent set by seed 305 in that same pass: the LEGO being
 * taught here is `समझने में मेरी मदद करने के लिए → "for helping me to
 * understand"`. कल is an INCIDENTAL adverbial in a slot the seed's other seven
 * phrases fill with आज / यहाँ / अंग्रेज़ी में / आज सुबह / पिछले हफ़्ते. Swapping it
 * for another taught, unambiguously past time word removes the ambiguity
 * without touching the teaching point, and re-teaches no कल sense by proxy.
 *
 * पिछले महीने ("last month") is taught at seed 37, is unambiguously past, and
 * is not already used in this LEGO's phrase set.
 *
 * AUDIO: this row carries no clips at all (known/target1/target2 all null), so
 * the edit drops nothing. Nothing is rendered here in any case.
 *
 *   node tools/course-optimization/fix-eng-for-hin-kal-seed74-gratitude-2026-09-03.cjs
 *   node tools/course-optimization/fix-eng-for-hin-kal-seed74-gratitude-2026-09-03.cjs --apply
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs')

const COURSE = 'eng_for_hin'
const ID = 'eng_for_hin:S0074L01U02'
const APPLY = process.argv.includes('--apply')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

const BEFORE = {
  known: 'कल समझने में मेरी मदद करने के लिए बहुत-बहुत शुक्रिया।',
  target: 'thank you very much for helping me to understand yesterday'
}
const AFTER = {
  known: 'पिछले महीने समझने में मेरी मदद करने के लिए बहुत-बहुत शुक्रिया।',
  target: 'thank you very much for helping me to understand last month'
}

async function main () {
  const { data: row, error } = await sb.from('course_practice_phrases')
    .select('id, seed_number, lego_index, position, phrase_role, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, decomposition, version')
    .eq('id', ID).single()
  if (error) throw error

  const problems = []
  if (row.known_text !== BEFORE.known) problems.push(`known_text moved: DB has "${row.known_text}"`)
  if (row.target_text !== BEFORE.target) problems.push(`target_text moved: DB has "${row.target_text}"`)

  // Containment: the phrase must still contain its LEGO's target text.
  const { data: lego } = await sb.from('course_legos')
    .select('lego_id, known_text, target_text').eq('course_code', COURSE).eq('lego_id', 'S0074L01').single()
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim()
  if (!norm(AFTER.target).includes(norm(lego.target_text))) problems.push('containment: replacement no longer contains the LEGO target')

  // The replacement's time word must already be taught by seed 74.
  const { data: legos } = await sb.from('course_legos')
    .select('seed_number, known_text, target_text').eq('course_code', COURSE).lte('seed_number', row.seed_number)
  const taught = legos.some(l => l.known_text === 'पिछले महीने' && l.target_text === 'last month')
  if (!taught) problems.push('पिछले महीने / last month is not taught by seed 74')

  // ZUT + duplicate, both sides.
  const { data: kClash } = await sb.from('course_practice_phrases')
    .select('id, target_text').eq('course_code', COURSE).eq('known_text', AFTER.known)
  if ((kClash || []).length) problems.push(`known prompt already in use: ${JSON.stringify(kClash)}`)
  const { data: tClash } = await sb.from('course_practice_phrases')
    .select('id, known_text').eq('course_code', COURSE).eq('target_text', AFTER.target)
  if ((tClash || []).length) problems.push(`target form already in use: ${JSON.stringify(tClash)}`)

  const clipsBefore = {
    known: row.known_audio_id, target1: row.target1_audio_id, target2: row.target2_audio_id
  }

  console.log(`${ID}`)
  console.log(`  before: ${row.known_text}\n          ${row.target_text}`)
  console.log(`  after:  ${AFTER.known}\n          ${AFTER.target}`)
  console.log(`  clips currently linked: ${JSON.stringify(clipsBefore)}`)

  const log = { course: COURSE, id: ID, ranAt: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run', before: row, after: AFTER, problems }

  if (problems.length) {
    console.error('REFUSING:'); problems.forEach(p => console.error('  - ' + p))
  } else if (APPLY) {
    // The known-side trigger re-resolves its own link on a text change; the
    // target side has no such trigger, so null it explicitly rather than leave
    // a clip speaking the old sentence pointed at the new text.
    const patch = { known_text: AFTER.known, target_text: AFTER.target }
    if (clipsBefore.target1) patch.target1_audio_id = null
    if (clipsBefore.target2) patch.target2_audio_id = null
    const { error: upErr } = await sb.from('course_practice_phrases').update(patch).eq('id', ID)
    if (upErr) throw upErr

    const dec = await decoratePhrasesWithDecomposition(sb, [{
      id: ID, course_code: COURSE, seed_number: row.seed_number, target_text: AFTER.target
    }])

    const { data: after } = await sb.from('course_practice_phrases')
      .select('known_text, target_text, decomposition, known_audio_id, target1_audio_id, target2_audio_id').eq('id', ID).single()
    const concat = Array.isArray(after.decomposition)
      ? after.decomposition.map(b => b.target).join('') : null
    log.decoration = dec
    log.verifiedAfter = {
      known_text: after.known_text,
      target_text: after.target_text,
      concatMatches: concat === after.target_text,
      blocks: Array.isArray(after.decomposition) ? after.decomposition.length : null,
      clips: { known: after.known_audio_id, target1: after.target1_audio_id, target2: after.target2_audio_id },
      stillMentionsKal: /कल/.test(after.known_text)
    }
    console.log('verify:', JSON.stringify(log.verifiedAfter, null, 1))
  } else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.')
  }

  const out = path.join(__dirname, `fix-eng-for-hin-kal-seed74-gratitude-2026-09-03-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`log → ${out}`)
  if (problems.length) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })

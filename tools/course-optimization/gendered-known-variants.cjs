#!/usr/bin/env node
/**
 * GENDERED KNOWN — two known voices, ONE form per phrase: dry-run, detect, apply
 * (Kai's rulings 2026-09-23 20:13Z / 20:23Z; jobs #883·H → #938·H → #941·H).
 *
 * For a course whose KNOWN language marks the speaker's gender (Hindi first):
 *   1. every gendered practice phrase is assigned ONE side by the balanced split
 *      (services/known-gender/gendered-known-plan.cjs) and, where its stored text
 *      is the other side's form, REWRITTEN to the pair's stored form for its
 *      side; the side is stamped on the row (metadata.known_gender) and never
 *      moves again. No row is ever added: never both forms of one phrase.
 *   2. gendered LEGO debuts flip to the female form; gendered seed lines are
 *      split half and half by a coin per seed;
 *   3. a doubled phrase (both forms already live as two rows, same target) is
 *      collapsed to one row;
 *   4. the voice then FOLLOWS THE TEXT (services/shared/known-voice-gender.cjs):
 *      a pair side takes its side's voice, everything else is hash-split.
 *
 * THE PAIR LIST OF RECORD IS THE DATABASE: course_gender_expansions rows with
 * text_side='known'. --detect can propose pairs for texts that have none
 * (Claude CLI, never the SDK) and --store-pairs writes them; the plan and the
 * apply read ONLY stored pairs, because phase8 reads only stored pairs, and a
 * plan built on pairs phase8 cannot see would render the wrong voice.
 *
 * Usage:
 *   node tools/course-optimization/gendered-known-variants.cjs <course>            dry run
 *   … --detect [--limit N] [--concurrency N]   ask the model about un-paired texts, write to evidence
 *   … --pairs-file <json> --store-pairs        store a previous --detect output's gendered pairs
 *   … --apply                                  apply the plan (identity-stamped), refresh the round
 *                                              index, queue an audio pass. Needs a dry-run plan on disk.
 *
 * RENDERS NOTHING, EVER. Audio is a queued audio-pass request, fulfilled by phase8
 * /generate on approval. Every mode writes its plan to
 *   ~/ssi-evidence/ssi-dashboard-v7/tools/course-optimization/gendered-known-variants/<course>/
 *
 * Also usable as a module: { loadCourse, planCourse, applyPlan } — the
 * course-specific tool (eng-for-hin-two-known-voices-2026-09-23.cjs) drives it.
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true })

const { evidencePath } = require('../lib/evidence-path.cjs')
const { buildGenderedKnownPlan } = require('../../services/known-gender/gendered-known-plan.cjs')
const { detectKnownSpeakerGender, storeKnownPairs, LANG_NAMES } = require('../../services/known-gender/detect-known-speaker-gender.cjs')
const { buildKnownGenderIndex, normalizeKnownKey, roleHasGenderedVoices, voiceIdsForRole } = require('../../services/shared/known-voice-gender.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs')
const { requestRoundIndexRefresh, flushRoundIndexRefresh } = require('../../services/shared/round-index-refresh.cjs')

const CARTESIA_MONTHLY_CHARS = 8_000_000
const SURFACE = 'tools/course-optimization/gendered-known-variants.cjs'

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
}
function outDirFor(courseCode) {
  const d = evidencePath(path.join('tools', 'course-optimization', 'gendered-known-variants', courseCode))
  fs.mkdirSync(d, { recursive: true })
  return d
}
async function pageAll(supabase, courseCode, table, select, filters = (q) => q) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filters(supabase.from(table).select(select).eq('course_code', courseCode)).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

/** Everything the plan needs, from the live DB. */
async function loadCourse(supabase, courseCode) {
  const { data: course, error } = await supabase.from('courses').select('course_code, known_lang, target_lang, voice_config').eq('course_code', courseCode).single()
  if (error || !course) throw new Error(`course ${courseCode}: ${error?.message || 'not found'}`)
  const [seeds, legos, phrases, storedPairs] = await Promise.all([
    pageAll(supabase, courseCode, 'course_seeds', 'seed_id, seed_number, known_text, target_text, status'),
    pageAll(supabase, courseCode, 'course_legos', 'lego_id, seed_number, lego_index, known_text, target_text, is_new, type'),
    pageAll(supabase, courseCode, 'course_practice_phrases', 'id, seed_number, lego_index, position, phrase_role, known_text, target_text, metadata'),
    pageAll(supabase, courseCode, 'course_gender_expansions', 'id, original_text, expanded_m, expanded_f, language, text_side', q => q.eq('text_side', 'known')),
  ])
  const pairs = storedPairs.filter(r => r.expanded_m && r.expanded_f && normalizeKnownKey(r.expanded_m) !== normalizeKnownKey(r.expanded_f))
  return { course, seeds, legos, phrases, storedPairs, pairs }
}

/** Build the plan and write it to the evidence dir. */
function planCourse({ courseCode, course, seeds, legos, phrases, pairs }, { stamp = new Date().toISOString().replace(/[:.]/g, '-') } = {}) {
  const voices = course.voice_config?.voices || {}
  const plan = buildGenderedKnownPlan({ courseCode, seeds, legos, phrases, pairs })
  plan.at = new Date().toISOString()
  plan.voices = {
    knownHasByGender: roleHasGenderedVoices(voices, 'known'),
    knownVoiceIds: voiceIdsForRole(voices, 'known'),
    presentationHasByGender: roleHasGenderedVoices(voices, 'presentation'),
  }
  plan.budget = {
    cartesiaMonthlyChars: CARTESIA_MONTHLY_CHARS,
    knownSideCharsTotal: plan.render.charsTotal,
    shareOfMonth: +(plan.render.charsTotal / CARTESIA_MONTHLY_CHARS * 100).toFixed(2),
    maleChars: plan.render.chars.m, femaleChars: plan.render.chars.f,
  }
  const outDir = outDirFor(courseCode)
  const planFile = path.join(outDir, `plan-${stamp}.json`)
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 1))
  fs.writeFileSync(path.join(outDir, 'plan-latest.json'), JSON.stringify(plan, null, 1))
  plan.planFile = planFile
  return plan
}

function summarise(plan) {
  const c = plan.counts, r = plan.render
  return `
── ${plan.courseCode} gendered-known plan (one form per phrase) ──
rows:                      ${c.rows.seed} seeds + ${c.rows.lego} legos + ${c.rows.phrase} phrases + ${c.rows.component} components
gendered rows:             ${c.genderedRows.seed} seeds, ${c.genderedRows.lego} legos, ${c.genderedRows.phrase} phrases, ${c.genderedRows.component} components (pair index ${plan.indexSize} forms)
phrase split (m / f):      ${c.split.phrase.m} / ${c.split.phrase.f}   rewrites ${c.rewrites.phrase}, already stamped ${c.stampedAlready}, refused on ZUT ${c.rewritesRefusedZut}
  longest same-side run:   ${c.longestRun} (cap 2); seeds skewed by more than 2: ${c.seedsSkewedOver2}
seed split (m / f):        ${c.split.seed.m} / ${c.split.seed.f}   rewrites ${c.rewrites.seed}
LEGO debuts → female form: ${c.legoFlips}  (refused on ZUT ${c.legoFlipsRefusedZut}); intros quoting both forms: ${plan.presentations.length}
doubled phrases collapsed: ${c.collapsed}
voice census after plan:   ${plan.voiced.m} male / ${plan.voiced.f} female rows (pair ${plan.bySource.pair}, anchored ${plan.bySource.anchor}, hash ${plan.bySource.hash})
render (distinct texts):   ${r.clipsTotal} clips = ${r.clips.m} male + ${r.clips.f} female; ${r.charsTotal.toLocaleString()} chars (${plan.budget.shareOfMonth}% of 8M/month; male ${r.chars.m.toLocaleString()}, female ${r.chars.f.toLocaleString()})
voice_config known byGender: ${plan.voices.knownHasByGender} (${plan.voices.knownVoiceIds.join(', ') || 'none'})
plan → ${plan.planFile}`
}

/**
 * APPLY. Identity-stamped, one content edit event. Order matters:
 *   1. collapse doubled rows (delete)            — before anything reads them
 *   2. LEGO debuts → female form                 — the text-change trigger nulls the audio
 *   3. phrase rewrites + stamps (both sides)     — stamp even the rows whose text stays
 *   4. seed rewrites                              — the seed trigger nulls the audio
 *   5. round-index refresh, audio pass queued     — nothing rendered
 * A row whose text moved under us (known_text ≠ the plan's "from") is skipped
 * and counted, never overwritten.
 */
async function applyPlan(supabase, courseCode, plan, { identityLabel = 'gendered-known-variants', reasonPrefix = '', phrases = [] } = {}) {
  const identity = serviceIdentity(identityLabel, { role: 'content-tool' })
  const eventId = await recordContentEdit(supabase, {
    identity, courseCode, surface: SURFACE, operation: 'update',
    scope: {
      phrase_ids: plan.phraseAssignments.map(a => a.id),
      lego_ids: plan.legoFlips.map(f => f.lego_id),
      seed_ids: plan.seedAssignments.filter(a => a.rewrite).map(a => a.seed_id),
      deleted_phrase_ids: plan.collapses.map(c => c.drop),
    },
    detail: {
      kind: 'gendered-known-one-form-per-phrase', plan: plan.planFile,
      counts: plan.counts, seedAssignments: plan.seedAssignments.map(a => ({ seed_id: a.seed_id, gender: a.gender, rewrite: a.rewrite })),
    },
  })
  const result = { eventId, collapsed: 0, flipped: 0, rewritten: 0, stamped: 0, seedsRewritten: 0, skippedMoved: [] }

  // 1. collapse
  for (const c of plan.collapses) {
    const { error, data } = await supabase.from('course_practice_phrases').delete()
      .eq('course_code', courseCode).eq('id', c.drop).eq('known_text', c.drop_known).select('id')
    if (error) throw new Error(`collapse ${c.drop}: ${error.message} (event ${eventId})`)
    if (!data || !data.length) { result.skippedMoved.push({ id: c.drop, step: 'collapse' }); continue }
    result.collapsed++
  }
  // 2. LEGO flips
  for (const f of plan.legoFlips) {
    const { error, data } = await supabase.from('course_legos')
      .update({ known_text: f.to, last_edit_event_id: eventId })
      .eq('course_code', courseCode).eq('lego_id', f.lego_id).eq('known_text', f.from).select('lego_id')
    if (error) throw new Error(`flip ${f.lego_id}: ${error.message} (flipped ${result.flipped}, event ${eventId})`)
    if (!data || !data.length) { result.skippedMoved.push({ id: f.lego_id, step: 'flip' }); continue }
    result.flipped++
  }
  // 3. phrases: rewrite + stamp
  const phraseMeta = new Map(phrases.map(p => [p.id, p.metadata || {}])) // stamps merge into the row's existing metadata
  for (const a of plan.phraseAssignments) {
    const meta = { ...(phraseMeta.get(a.id) || {}), known_gender: a.gender, known_gender_stamped_at: plan.at, known_gender_event: eventId }
    const patch = { metadata: meta, last_edit_event_id: eventId }
    if (a.rewrite) patch.known_text = a.to
    const { error, data } = await supabase.from('course_practice_phrases').update(patch)
      .eq('course_code', courseCode).eq('id', a.id).eq('known_text', a.from).select('id')
    if (error) throw new Error(`phrase ${a.id}: ${error.message} (rewritten ${result.rewritten}, event ${eventId})`)
    if (!data || !data.length) { result.skippedMoved.push({ id: a.id, step: 'phrase' }); continue }
    result.stamped++
    if (a.rewrite) result.rewritten++
  }
  // 4. seeds (no metadata column: the text IS the stamp, and the event detail records the coin)
  for (const a of plan.seedAssignments.filter(x => x.rewrite)) {
    const { error, data } = await supabase.from('course_seeds').update({ known_text: a.to, last_edit_event_id: eventId })
      .eq('course_code', courseCode).eq('seed_id', a.seed_id).eq('known_text', a.from).select('seed_id')
    if (error) throw new Error(`seed ${a.seed_id}: ${error.message} (event ${eventId})`)
    if (!data || !data.length) { result.skippedMoved.push({ id: a.seed_id, step: 'seed' }); continue }
    result.seedsRewritten++
  }
  // 5. round index + audio pass
  requestRoundIndexRefresh(courseCode); await flushRoundIndexRefresh()
  const r = plan.render
  const reason = `${reasonPrefix}gendered-known one-form-per-phrase (event ${eventId}): ${result.flipped} LEGO debuts → female form, ${result.rewritten} phrase rewrites (${result.stamped} rows stamped), ${result.seedsRewritten} seed lines rewritten, ${result.collapsed} doubled rows collapsed; known side renders in two voices by text — ${r.clips.m} male clips (${r.chars.m.toLocaleString()} chars) + ${r.clips.f} female clips (${r.chars.f.toLocaleString()} chars) = ${r.charsTotal.toLocaleString()} chars, ${plan.budget.shareOfMonth}% of the 8M/month Cartesia budget; render nothing until approved`
  await queueAudioPass(supabase, { courseCode, reason, requestedBy: identity.label, metadata: { event_id: eventId, plan: plan.planFile, render: plan.render, budget: plan.budget } })
  result.audioPassReason = reason
  return result
}

async function main() {
  const argv = process.argv.slice(2)
  const flag = (name) => argv.includes(name)
  const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null }
  const courseCode = argv.find(a => !a.startsWith('--') && /^[a-z]{2,4}(_[a-z]{2})?_for_[a-z]{2,4}$/.test(a))
  if (!courseCode) { console.error('usage: gendered-known-variants.cjs <course> [--detect] [--pairs-file f --store-pairs] [--apply] [--limit N]'); process.exit(2) }
  const APPLY = flag('--apply'), DETECT = flag('--detect'), STORE_PAIRS = flag('--store-pairs'), PAIRS_FILE = opt('--pairs-file')
  const LIMIT = opt('--limit') ? parseInt(opt('--limit'), 10) : null
  const CONCURRENCY = opt('--concurrency') ? parseInt(opt('--concurrency'), 10) : 4
  const supabase = supa()
  const outDir = outDirFor(courseCode)
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')

  const loaded = await loadCourse(supabase, courseCode)
  const knownLang = loaded.course.known_lang
  console.log(`${courseCode}: known ${knownLang} (${LANG_NAMES[knownLang] || knownLang}) — ${APPLY ? 'APPLY' : 'DRY RUN'}${DETECT ? ' +detect' : ''}`)
  console.log(`rows: ${loaded.seeds.length} seeds, ${loaded.legos.length} legos, ${loaded.phrases.length} phrases; stored known-side pairs: ${loaded.pairs.length}`)

  let detection = null
  if (PAIRS_FILE) detection = JSON.parse(fs.readFileSync(PAIRS_FILE, 'utf8'))
  if (DETECT) {
    const index = buildKnownGenderIndex(loaded.pairs)
    const allTexts = [...new Set([...loaded.seeds, ...loaded.legos, ...loaded.phrases].map(r => (r.known_text || '').trim()).filter(Boolean))]
    let toAsk = allTexts.filter(t => !index.has(normalizeKnownKey(t)))
    if (LIMIT) toAsk = toAsk.slice(0, LIMIT)
    console.log(`detect: ${allTexts.length} distinct known texts, ${allTexts.length - toAsk.length} already paired, asking the model about ${toAsk.length}`)
    const t0 = Date.now()
    detection = await detectKnownSpeakerGender(toAsk, { language: knownLang, concurrency: CONCURRENCY, onProgress: (done, total) => { if (done % 10 === 0 || done === total) console.log(`  batch ${done}/${total} (${Math.round((Date.now() - t0) / 1000)}s)`) } })
    detection.course_code = courseCode; detection.language = knownLang; detection.at = new Date().toISOString()
    const detFile = path.join(outDir, `detect-${stamp}.json`)
    fs.writeFileSync(detFile, JSON.stringify(detection, null, 1))
    console.log(`detect: coverage ${JSON.stringify(detection.coverage)} → ${detFile}`)
  }
  if (detection && STORE_PAIRS) {
    const stored = await storeKnownPairs(supabase, courseCode, knownLang, detection.results)
    console.log(`stored ${stored} known-side pairs into course_gender_expansions — re-run without --detect to plan on them`)
    return
  }
  if (detection && !STORE_PAIRS) console.log('note: detected pairs are NOT in the plan until --store-pairs writes them; the plan reads stored pairs only')

  const plan = planCourse({ courseCode, ...loaded }, { stamp })
  console.log(summarise(plan))
  if (plan.notes.length) console.log(`notes (${plan.notes.length}):\n` + plan.notes.slice(0, 20).map(n => `  ${n.id}: ${n.reason}`).join('\n'))
  if (!APPLY) return
  if (!plan.voices.knownHasByGender) throw new Error('apply refused: voice_config.voices.known has no byGender block — set the two known voices first, or the rewritten rows would all render in one voice')
  const result = await applyPlan(supabase, courseCode, plan, { phrases: loaded.phrases })
  console.log(`applied: ${JSON.stringify({ ...result, skippedMoved: result.skippedMoved.length })}`)
  if (result.skippedMoved.length) console.log('skipped (row moved under us):', result.skippedMoved.slice(0, 20))
}

module.exports = { loadCourse, planCourse, applyPlan, summarise, supa, outDirFor, CARTESIA_MONTHLY_CHARS }
if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1) })

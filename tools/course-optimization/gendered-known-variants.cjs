#!/usr/bin/env node
/**
 * GENDERED KNOWN VARIANTS — dry-run, detect, and apply (Kai's design, 2026-09-23; #883·H).
 *
 * For a course whose KNOWN language marks the speaker's gender (Hindi, Italian, …):
 *   1. every known line is assigned the voice gender it renders in — bound to its
 *      grammar where a stored speaker-gender pair says so, hash-split otherwise
 *      (services/shared/known-voice-gender.cjs);
 *   2. every gendered known line gets its counterpart as a FULL SEPARATE PHRASE
 *      with the same target (services/known-gender/gendered-known-plan.cjs).
 *
 * Usage:
 *   node tools/course-optimization/gendered-known-variants.cjs <course>            dry run from stored pairs
 *   … --detect                 put every live known text with no stored pair to the model (Claude CLI),
 *                              write the verified results to the evidence dir, and plan with them
 *   … --pairs-file <json>      plan with a previous --detect output instead of calling the model
 *   … --store-pairs            with --detect / --pairs-file: upsert the gendered pairs into
 *                              course_gender_expansions (text_side='known'). Inert for the player.
 *   … --apply                  insert the planned sibling phrases (identity-stamped) and queue an
 *                              audio pass. Refused unless the plan was written first (dry run).
 *   … --limit N                cap the number of distinct texts sent to the model (for probes)
 *   … --concurrency N          parallel model batches for --detect (default 4)
 *
 * RENDERS NOTHING, EVER. Audio is a queued audio-pass request, fulfilled by phase8 /generate
 * on approval. Default is a dry run; every mode writes its plan to
 *   ~/ssi-evidence/ssi-dashboard-v7/tools/course-optimization/gendered-known-variants/<course>/
 */

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const { evidencePath } = require('../lib/evidence-path.cjs')
const { buildGenderedKnownPlan } = require('../../services/known-gender/gendered-known-plan.cjs')
const { detectKnownSpeakerGender, toKnownPairRows, storeKnownPairs, LANG_NAMES } = require('../../services/known-gender/detect-known-speaker-gender.cjs')
const { buildKnownGenderIndex, normalizeKnownKey, roleHasGenderedVoices, voiceIdsForRole } = require('../../services/shared/known-voice-gender.cjs')
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs')
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs')
const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs')

const argv = process.argv.slice(2)
const flag = (name) => argv.includes(name)
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null }
const courseCode = argv.find(a => !a.startsWith('--') && /^[a-z]{2,4}(_[a-z]{2})?_for_[a-z]{2,4}$/.test(a))
if (!courseCode) { console.error('usage: gendered-known-variants.cjs <course> [--detect] [--pairs-file f] [--store-pairs] [--apply] [--limit N]'); process.exit(2) }

const DETECT = flag('--detect')
const APPLY = flag('--apply')
const STORE_PAIRS = flag('--store-pairs')
const PAIRS_FILE = opt('--pairs-file')
const LIMIT = opt('--limit') ? parseInt(opt('--limit'), 10) : null
const CONCURRENCY = opt('--concurrency') ? parseInt(opt('--concurrency'), 10) : 4
const CARTESIA_MONTHLY_CHARS = 8_000_000

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
const outDir = evidencePath(path.join('tools', 'course-optimization', 'gendered-known-variants', courseCode))
fs.mkdirSync(outDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-')

async function pageAll(table, select, filters = (q) => q) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await filters(supabase.from(table).select(select).eq('course_code', courseCode)).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  return out
}

async function main() {
  const { data: course, error } = await supabase.from('courses').select('course_code, known_lang, target_lang, voice_config').eq('course_code', courseCode).single()
  if (error || !course) throw new Error(`course ${courseCode}: ${error?.message || 'not found'}`)
  const knownLang = course.known_lang
  const voices = course.voice_config?.voices || {}

  console.log(`${courseCode}: known ${knownLang} (${LANG_NAMES[knownLang] || knownLang}) — ${APPLY ? 'APPLY' : 'DRY RUN'}${DETECT ? ' +detect' : ''}`)
  const [seeds, legos, phrases, storedPairs] = await Promise.all([
    pageAll('course_seeds', 'seed_id, seed_number, known_text, target_text, status'),
    pageAll('course_legos', 'lego_id, seed_number, lego_index, known_text, target_text, is_new, type'),
    pageAll('course_practice_phrases', 'id, seed_number, lego_index, position, phrase_role, known_text, target_text, metadata'),
    pageAll('course_gender_expansions', 'original_text, expanded_m, expanded_f, language, text_side', q => q.eq('text_side', 'known')),
  ])
  console.log(`rows: ${seeds.length} seeds, ${legos.length} legos, ${phrases.length} phrases; stored known-side pairs: ${storedPairs.length}`)

  // Already-planned siblings are recognisable by their metadata mark; a re-run must not pair them again.
  const priorSiblings = phrases.filter(p => p.metadata && p.metadata.gender_variant_of)
  if (priorSiblings.length) console.log(`note: ${priorSiblings.length} phrases already carry gender_variant_of (a previous apply)`)

  // ── pairs: stored, plus detected / file-loaded ──
  let pairs = storedPairs.filter(r => r.expanded_m && r.expanded_f && normalizeKnownKey(r.expanded_m) !== normalizeKnownKey(r.expanded_f))
  let detection = null
  if (PAIRS_FILE) {
    detection = JSON.parse(fs.readFileSync(PAIRS_FILE, 'utf8'))
    console.log(`pairs file: ${PAIRS_FILE} — ${detection.results.length} results, coverage ${JSON.stringify(detection.coverage)}`)
  }
  if (DETECT) {
    const index = buildKnownGenderIndex(pairs)
    const allTexts = [...new Set([...seeds, ...legos, ...phrases].map(r => (r.known_text || '').trim()).filter(Boolean))]
    let toAsk = allTexts.filter(t => !index.has(normalizeKnownKey(t)))
    const alreadyPaired = allTexts.length - toAsk.length
    if (LIMIT) toAsk = toAsk.slice(0, LIMIT)
    console.log(`detect: ${allTexts.length} distinct known texts, ${alreadyPaired} already paired, asking the model about ${toAsk.length}${LIMIT ? ` (limit ${LIMIT})` : ''}`)
    const t0 = Date.now()
    detection = await detectKnownSpeakerGender(toAsk, {
      language: knownLang,
      concurrency: CONCURRENCY,
      onProgress: (done, total) => { if (done % 10 === 0 || done === total) console.log(`  batch ${done}/${total} (${Math.round((Date.now() - t0) / 1000)}s)`) },
    })
    detection.course_code = courseCode
    detection.language = knownLang
    detection.at = new Date().toISOString()
    const detFile = path.join(outDir, `detect-${stamp}.json`)
    fs.writeFileSync(detFile, JSON.stringify(detection, null, 1))
    console.log(`detect: coverage ${JSON.stringify(detection.coverage)} in ${detection.batches} batches → ${detFile}`)
  }
  if (detection) {
    const detectedRows = toKnownPairRows(courseCode, knownLang, detection.results)
    pairs = [...pairs, ...detectedRows]
    if (STORE_PAIRS) {
      const stored = await storeKnownPairs(supabase, courseCode, knownLang, detection.results)
      console.log(`stored ${stored} known-side pairs into course_gender_expansions`)
    }
  }

  // ── the plan ──
  const plan = buildGenderedKnownPlan({ courseCode, seeds, legos, phrases, pairs })
  plan.at = new Date().toISOString()
  plan.voices = {
    knownHasByGender: roleHasGenderedVoices(voices, 'known'),
    knownVoiceIds: voiceIdsForRole(voices, 'known'),
    presentationHasByGender: roleHasGenderedVoices(voices, 'presentation'),
  }
  plan.detectionCoverage = detection ? detection.coverage : null
  plan.budget = {
    cartesiaMonthlyChars: CARTESIA_MONTHLY_CHARS,
    knownSideCharsTotal: plan.render.charsTotal,
    shareOfMonth: +(plan.render.charsTotal / CARTESIA_MONTHLY_CHARS * 100).toFixed(2),
    siblingCharsShareOfMonth: +(plan.render.siblingChars / CARTESIA_MONTHLY_CHARS * 100).toFixed(3),
  }
  const planFile = path.join(outDir, `plan-${stamp}.json`)
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 1))
  fs.writeFileSync(path.join(outDir, 'plan-latest.json'), JSON.stringify(plan, null, 1))

  const c = plan.counts, r = plan.render
  console.log(`
── ${courseCode} gendered-known plan ──
known lines (rows):        ${c.rows.seed} seeds + ${c.rows.lego} legos + ${c.rows.phrase} phrases + ${c.rows.component} components
  voiced male / female:    ${c.byGender.m} / ${c.byGender.f}   (pair-bound ${c.bySource.pair}, hash-split ${c.bySource.hash})
gendered rows:             ${c.genderedRows}
sibling phrases to add:    ${plan.siblings.length}  (from phrases ${c.siblingsPlanned.fromPhrase}, from legos ${c.siblingsPlanned.fromLego}, from seeds ${c.siblingsPlanned.fromSeed}; counterpart already authored ${c.siblingsSkippedExisting})
render (distinct texts):   ${r.clipsTotal} clips = ${r.clips.m} male + ${r.clips.f} female; ${r.charsTotal.toLocaleString()} chars (${plan.budget.shareOfMonth}% of 8M/month)
  of which siblings:       ${r.siblingClips} clips, ${r.siblingChars.toLocaleString()} chars
voice_config known byGender: ${plan.voices.knownHasByGender} (${plan.voices.knownVoiceIds.join(', ') || 'none'})
plan → ${planFile}`)

  if (!APPLY) return

  // ── apply: insert siblings, identity-stamped, then queue the audio pass ──
  if (!fs.existsSync(path.join(outDir, 'plan-latest.json'))) throw new Error('apply refused: no dry-run plan on disk')
  if (!plan.siblings.length) { console.log('apply: nothing to insert'); return }
  const identity = serviceIdentity('gendered-known-variants', { role: 'content-tool' })
  const eventId = await recordContentEdit(supabase, {
    identity, courseCode, surface: 'tools/course-optimization/gendered-known-variants.cjs', operation: 'insert',
    scope: { phrase_ids: plan.siblings.map(s => s.id) },
    detail: { kind: 'gendered-known-siblings', count: plan.siblings.length, plan: planFile },
  })
  let inserted = 0
  for (let i = 0; i < plan.siblings.length; i += 200) {
    const rows = plan.siblings.slice(i, i + 200).map(s => ({
      id: s.id, course_code: s.course_code, seed_number: s.seed_number, lego_index: s.lego_index, position: s.position,
      known_text: s.known_text, target_text: s.target_text, phrase_role: s.phrase_role,
      word_count: s.target_text.length, lego_count: (s.known_text.match(/\s+/g) || []).length + 1,
      connected_lego_ids: [], lego_position: s.lego_position, metadata: s.metadata,
      introduce: true, status: 'draft', version: 1, last_edit_event_id: eventId,
    }))
    const { error: insErr } = await supabase.from('course_practice_phrases').insert(rows)
    if (insErr) throw new Error(`insert failed at batch ${i / 200 + 1}: ${insErr.message} (inserted so far: ${inserted}, event ${eventId})`)
    inserted += rows.length
  }
  await queueAudioPass(supabase, { courseCode, reason: `gendered-known-variants: ${inserted} sibling phrases inserted (event ${eventId}); render nothing until approved`, requestedBy: identity.label, metadata: { event_id: eventId, plan: planFile } })
  console.log(`applied: ${inserted} sibling phrases inserted (content_edit_events ${eventId}); audio pass queued, nothing rendered`)
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1) })

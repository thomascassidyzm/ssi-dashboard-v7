#!/usr/bin/env node
/**
 * eng_for_hin — one extra USE drill on each कल LEGO that carries the SECOND
 * sense, plus the LEGO where the two senses meet.
 *
 * KAI'S RULING (2026-09-03): after the ambiguous word is reintroduced with the
 * other sense, "drill the new one with phrases it works in… it needs to be
 * drilled a lot", and "soon after, you can start drilling both versions".
 *
 * WHY ONLY FOUR, AND WHY NOT MIXED PHRASES. A practice phrase must CONTAIN its
 * LEGO's target text (the containment check in
 * services/course-builder/routes/v2.cjs runSeedChecks), and for these LEGOs the
 * target text IS the direction — "tomorrow morning", "everything last night".
 * So no single LEGO can ever drill both senses: the sense is nailed down by the
 * chunk the phrase is obliged to contain. Both senses can only be drilled
 * ACROSS rounds, which is what the teaching sequence below already does. That
 * is a structural answer to "drill both", not a refusal — and it is checkable.
 *
 * VOLUME. Every one of the seven कल LEGOs sits at the course norm of 8 build+use
 * phrases (1,279 of 1,337 is_new LEGOs are at 8). 47 LEGOs already carry 9 and
 * two carry 10, so 9 is inside live precedent and needs no new rule. Each LEGO
 * below goes 8 → 9. No LEGO is added or removed, so no round moves.
 *
 * AUDIO. Three clips per phrase (known, target1, target2) that cannot be
 * rendered today — this course's four voices are all xAI and xAI is retired.
 * That is not a new silent slot: the learner walk DROPS any phrase missing all
 * three clips (`phraseHasFullAudio`, ssi-learning-app api/courses/[code]/cycles.ts),
 * and only 1,240 of this course's 10,945 phrases (11.3%) currently have them.
 * These four join that queue and reach a learner when the course is recast.
 * An audio pass is queued. NO TTS IS GENERATED.
 *
 *   node tools/course-optimization/add-eng-for-hin-kal-sense-drills-2026-09-03.cjs
 *   node tools/course-optimization/add-eng-for-hin-kal-sense-drills-2026-09-03.cjs --apply
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs')

const COURSE = 'eng_for_hin'
const APPLY = process.argv.includes('--apply')
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

/**
 * Each drill is built only from chunks already taught by its own seed, and each
 * one pins its कल to a direction with a tense marker the learner already owns.
 */
const DRILLS = [
  {
    legoId: 'S0155L04', seedNumber: 155, legoIndex: 4,
    known: 'क्या आप कल सुबह बात करना चाहते हैं?',
    target: 'do you want to speak tomorrow morning?',
    sense: 'future', pin: 'चाहते हैं — a want points forward; Hindi present cannot host कल = yesterday'
  },
  {
    legoId: 'S0167L02', seedNumber: 167, legoIndex: 2,
    known: 'मुझे कल दोपहर इंतज़ार करने में कोई आपत्ति नहीं।',
    target: "I don't mind waiting tomorrow afternoon",
    sense: 'future', pin: 'present-tense frame with no past marker — the waiting is still ahead'
  },
  {
    legoId: 'S0192L02', seedNumber: 192, legoIndex: 2,
    known: 'मुझे कल रात इंतज़ार करने में कोई आपत्ति नहीं।',
    target: "I don't mind waiting tomorrow night",
    sense: 'future', pin: 'same present frame — and the round before it taught कल रात as tomorrow night'
  },
  {
    legoId: 'S0278L02', seedNumber: 278, legoIndex: 2,
    known: 'क्या आपको कल रात सब जल्दी पूरा करना था?',
    target: 'did you have to finish everything last night quickly?',
    sense: 'past', pin: 'करना था — past obligation. This is the LEGO where कल रात comes back in the OTHER direction, 86 seeds after seed 192 taught it as tomorrow night'
  }
]

const normTarget = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim()
const normKnown = (s) => String(s || '').replace(/[।?!.,\s]+/g, ' ').trim()

function legoPosition (phraseTarget, legoTarget) {
  const i = normTarget(phraseTarget).indexOf(normTarget(legoTarget))
  if (i <= 0) return 'start'
  return (i + normTarget(legoTarget).length >= normTarget(phraseTarget).length) ? 'end' : 'middle'
}

async function main () {
  const { data: legos } = await sb.from('course_legos')
    .select('lego_id, seed_number, lego_index, known_text, target_text, is_new, type, components')
    .eq('course_code', COURSE)
  const { data: phrases } = await sb.from('course_practice_phrases')
    .select('id, seed_number, lego_index, position, phrase_role, known_text, target_text')
    .eq('course_code', COURSE)

  // Cumulative target vocabulary, exactly as the sweep accumulates it.
  const vocabUpTo = (n) => {
    const v = new Set()
    for (const l of legos.filter(x => x.seed_number <= n)) {
      for (const w of normTarget(l.target_text).split(' ')) if (w) v.add(w)
      if (l.type === 'M' && Array.isArray(l.components)) {
        for (const c of l.components) for (const w of normTarget(c.target).split(' ')) if (w) v.add(w)
      }
    }
    return v
  }

  const problems = []
  const rows = []

  for (const d of DRILLS) {
    const lego = legos.find(l => l.lego_id === d.legoId)
    if (!lego) { problems.push(`${d.legoId}: LEGO not found`); continue }
    if (!lego.is_new) { problems.push(`${d.legoId}: is_new = false — generates no round`); continue }

    const group = phrases.filter(p => p.seed_number === d.seedNumber && p.lego_index === d.legoIndex)
    const buildUse = group.filter(p => p.phrase_role === 'build' || p.phrase_role === 'use')

    // Containment — the check that makes a single-sense drill the only kind possible.
    if (!normTarget(d.target).includes(normTarget(lego.target_text))) {
      problems.push(`${d.legoId}: containment — "${d.target}" does not contain "${lego.target_text}"`)
    }
    // Target vocabulary at this seed.
    const vocab = vocabUpTo(d.seedNumber)
    const missing = normTarget(d.target).split(' ').filter(w => w && !vocab.has(w))
    if (missing.length) problems.push(`${d.legoId}: target vocab not yet taught — ${missing.join(', ')}`)
    // ZUT and duplicates, on the KNOWN side (one known prompt → one target form).
    const clash = phrases.find(p => normKnown(p.known_text) === normKnown(d.known) && normTarget(p.target_text) !== normTarget(d.target))
    if (clash) problems.push(`${d.legoId}: ZUT — that known prompt already answers "${clash.target_text}" (seed ${clash.seed_number})`)
    const dup = phrases.find(p => normKnown(p.known_text) === normKnown(d.known) && normTarget(p.target_text) === normTarget(d.target))
    if (dup) problems.push(`${d.legoId}: duplicate of ${dup.id}`)
    // Known side is a controlled language too — every Hindi word must already
    // have been met somewhere in this course's prefix.
    const knownSeen = new Set()
    const addWords = (t) => { for (const w of String(t || '').split(/\s+/)) { const c = w.replace(/[।?!.,]/g, ''); if (c) knownSeen.add(c) } }
    legos.filter(l => l.seed_number <= d.seedNumber).forEach(l => addWords(l.known_text))
    phrases.filter(p => p.seed_number <= d.seedNumber).forEach(p => addWords(p.known_text))
    const kMissing = d.known.split(/\s+/).map(w => w.replace(/[।?!.,]/g, '')).filter(w => w && !knownSeen.has(w))
    if (kMissing.length) problems.push(`${d.legoId}: known-side words never met before seed ${d.seedNumber} — ${kMissing.join(' ')}`)

    const useCount = group.filter(p => p.phrase_role === 'use').length
    const id = `${COURSE}:${d.legoId}U${String(useCount + 1).padStart(2, '0')}`
    if (phrases.some(p => p.id === id)) { problems.push(`${d.legoId}: id ${id} already taken`); continue }
    const position = Math.max(...group.map(p => p.position), 0) + 1

    rows.push({
      id,
      course_code: COURSE,
      seed_number: d.seedNumber,
      lego_index: d.legoIndex,
      position,
      known_text: d.known,
      target_text: d.target,
      phrase_role: 'use',
      status: 'draft',
      introduce: true,
      connected_lego_ids: [],
      lego_position: legoPosition(d.target, lego.target_text),
      word_count: d.target.length,
      lego_count: d.known.split(/\s+/).length,
      metadata: {
        format: 'build_use',
        pipeline: 'v2',
        source: 'kal two-sense teaching (Kai 2026-09-03)',
        sense: d.sense,
        pin: d.pin
      }
    })
    console.log(`${d.legoId} ${d.sense}  ${buildUse.length} → ${buildUse.length + 1} phrases   ${id} @ position ${position}`)
    console.log(`   ${d.known}`)
    console.log(`   ${d.target}`)
    console.log(`   pins: ${d.pin}`)
  }

  const log = { course: COURSE, ranAt: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run', problems, rows }

  if (problems.length) {
    console.error(`\nREFUSING — ${problems.length} precondition failure(s):`)
    problems.forEach(p => console.error('  - ' + p))
  } else if (APPLY) {
    const { data: inserted, error } = await sb.from('course_practice_phrases').insert(rows).select('id, seed_number, target_text')
    if (error) throw error
    console.log(`\nInserted ${inserted.length} phrase(s).`)

    const dec = await decoratePhrasesWithDecomposition(sb, rows.map(r => ({
      id: r.id, course_code: COURSE, seed_number: r.seed_number, target_text: r.target_text
    })))
    console.log('decomposition:', JSON.stringify(dec))

    // The player's Strategy-0 guard is exact concat equality — assert it here
    // rather than discovering it as a fragile-path fallback on a learner's phone.
    const { data: after } = await sb.from('course_practice_phrases')
      .select('id, target_text, decomposition').in('id', rows.map(r => r.id))
    const concatOk = after.map(a => ({
      id: a.id,
      blocks: Array.isArray(a.decomposition) ? a.decomposition.length : null,
      concatMatches: Array.isArray(a.decomposition)
        ? a.decomposition.map(b => b.target).join('') === a.target_text : false
    }))
    log.inserted = inserted
    log.decoration = dec
    log.verifiedAfter = concatOk
    console.log('verify:', JSON.stringify(concatOk, null, 1))
    if (concatOk.some(c => !c.concatMatches)) console.error('WARNING: a decomposition does not concatenate back to its target text')
  } else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.')
  }

  const out = path.join(__dirname, `add-eng-for-hin-kal-sense-drills-2026-09-03-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`log → ${out}`)
  if (problems.length) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })

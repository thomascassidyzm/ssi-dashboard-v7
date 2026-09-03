#!/usr/bin/env node
/**
 * eng_for_hin — give every कल LEGO debut an unambiguous "as in" context.
 *
 * THE DEFECT. Hindi कल is both "yesterday" and "tomorrow"; कल रात is both
 * "last night" and "tomorrow night". A LEGO's known_text is what the learner
 * is PROMPTED with at its debut ("The debut IS the bare LEGO",
 * learning-script-generator.cjs:1291), and six कल LEGOs in this course are
 * bare adverbials — the cue alone fixes no direction. They cannot be GROWN to
 * reach a verb: Hindi is verb-final and every span between कल and its verb is
 * already owned by a sibling LEGO, so growth either overlaps or gaps (both
 * banned), and a MERGE deletes one is_new LEGO and therefore one round —
 * a learner-progress migration, which is Kai's call, not this script's.
 *
 * KAI'S RULING (2026-09-03): use the "as in" context in the presentation to
 * fix the sense — "make sure it kicks in and uses a phrase with the context in
 * it" — establish ONE sense, keep using only that sense, then reintroduce with
 * the other sense and its own context, and drill both.
 *
 * WHAT THIS SCRIPT DOES. For each कल LEGO it authors the Frame B presentation
 * line ("अंग्रेज़ी में — '<chunk>' — जैसे — '<context>' — में :") with a
 * context sentence chosen BY HAND to pin the direction, and writes it as a
 * PENDING course_audio row beside any existing one.
 *
 * MAKE-BEFORE-BREAK. Nothing is deleted, no course_legos.presentation_audio_id
 * is touched. This is exactly the shape phase8 /regenerate-presentations uses
 * (see its [MakeBeforeBreak] block): the learner keeps hearing the old clip —
 * stale words, but audible — until /generate renders the replacement, puts it
 * through the veracity gate and rebinds the link itself.
 *
 * NO TTS. This course's four voices are all xAI, which is retired, so none of
 * these lines can be rendered today by anyone. The script queues an audio pass
 * and stops there. It spends nothing.
 *
 * EVERY CONTEXT SENTENCE IS ALREADY LIVE COURSE TEXT — a seed sentence or a
 * practice phrase of that same LEGO. No Hindi is invented here, so the known
 * side stays a controlled language by construction. The script asserts that
 * each one is still present in the DB before writing.
 *
 *   node tools/course-optimization/fix-eng-for-hin-kal-presentation-context-2026-09-03.cjs           # dry run
 *   node tools/course-optimization/fix-eng-for-hin-kal-presentation-context-2026-09-03.cjs --apply
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')
const presentationAuthor = require('../../services/phases/presentation-author.cjs')

const COURSE = 'eng_for_hin'
const APPLY = process.argv.includes('--apply')

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
})

/**
 * The plan. `sense` is the direction the context must pin, `why` is the Hindi
 * evidence that pins it — the thing a reviewer should check first.
 *
 * Order matters and is the teaching sequence:
 *   12  future, but BOUND inside कल क्या होगा (होगा is the future marker) —
 *       not a bare cue, listed because its intro currently quotes a chunk the
 *       LEGO no longer has.
 *   30  the first BARE कल. Sense established here: PAST.
 *   42  PAST — consistent, no reintroduction needed.
 *  155  THE REINTRODUCTION. The other sense (future), with its own context.
 *  167  future — after the reintroduction.
 *  192  future — after the reintroduction.
 *  278  PAST again, and the same surface string कल रात as 192 in the opposite
 *       direction. This is the deliberate both-senses drill point.
 */
const PLAN = [
  {
    legoId: 'S0012L03',
    chunk: 'कल क्या होगा',
    context: 'मैं यह अंदाज़ा नहीं लगाना चाहूँगा कि कल क्या होगा।',
    contextFrom: 'seed 12 known_text',
    sense: 'future',
    why: 'होगा — future copula inside the chunk itself'
  },
  {
    legoId: 'S0030L03',
    chunk: 'कल',
    context: 'मैं कल आपसे कुछ पूछना चाहता था।',
    contextFrom: 'seed 30 known_text',
    sense: 'past',
    why: 'चाहता था — past imperfect; कल cannot be tomorrow under a past want'
  },
  {
    legoId: 'S0042L03',
    chunk: 'कल रात के मुक़ाबले',
    context: 'मैं कल रात के मुक़ाबले ज़्यादा अच्छा महसूस करने लगा था।',
    contextFrom: 'seed 42 known_text',
    sense: 'past',
    why: 'करने लगा था — past inceptive; the comparison is to a night already had'
  },
  {
    legoId: 'S0155L04',
    chunk: 'कल सुबह',
    context: 'मैं कल सुबह मिलना चाहूँगा।',
    contextFrom: 'seed 155 L4 use phrase',
    sense: 'future',
    why: 'चाहूँगा — future form; wanting to meet is necessarily ahead'
  },
  {
    legoId: 'S0167L02',
    chunk: 'कल दोपहर',
    context: 'क्या आप कल दोपहर जाना चाहते हैं?',
    contextFrom: 'seed 167 L2 use phrase',
    sense: 'future',
    why: 'चाहते हैं — present desiderative; a want to go points forward'
  },
  {
    legoId: 'S0192L02',
    chunk: 'कल रात',
    context: 'मुझे कल रात जाना है।',
    contextFrom: 'seed 192 L2 use phrase',
    sense: 'future',
    why: 'जाना है — present obligation; Hindi present cannot host कल = yesterday'
  },
  {
    legoId: 'S0278L02',
    chunk: 'कल रात सब',
    context: 'क्या आपको कल रात सब पूरा करना था?',
    contextFrom: 'seed 278 known_text',
    sense: 'past',
    why: 'करना था — past obligation; the night is over'
  }
]

/** The engine drops a context it would swamp — mirror the rule, don't guess. */
const OVERLAP_LIMIT = 0.5

async function main () {
  const { data: course, error: courseErr } = await sb
    .from('courses').select('known_lang, target_lang, voice_config')
    .eq('course_code', COURSE).single()
  if (courseErr) throw courseErr

  const template = await presentationAuthor.getOrCreatePresentationTemplate(
    sb, course.known_lang, presentationAuthor.localisedLangName(course.known_lang, 'eng'))
  const targetLangName = presentationAuthor.localisedLangName(course.target_lang, course.known_lang)
  const voiceId = presentationAuthor.resolvePresentationVoiceId(course)

  const legoIds = PLAN.map(p => p.legoId)
  const { data: legos, error: legoErr } = await sb
    .from('course_legos').select('lego_id, seed_number, known_text, target_text, is_new, presentation_audio_id')
    .eq('course_code', COURSE).in('lego_id', legoIds)
  if (legoErr) throw legoErr
  const legoById = new Map(legos.map(l => [l.lego_id, l]))

  const { data: existingPres, error: presErr } = await sb
    .from('course_audio').select('id, lego_id, text, s3_key, origin, voice_id')
    .eq('course_code', COURSE).eq('role', 'presentation').in('lego_id', legoIds)
  if (presErr) throw presErr

  // Every context must still exist as live course text — seed or practice phrase.
  const contexts = PLAN.map(p => p.context)
  const { data: seedHits } = await sb.from('course_seeds')
    .select('seed_number, known_text').eq('course_code', COURSE).in('known_text', contexts)
  const { data: phraseHits } = await sb.from('course_practice_phrases')
    .select('seed_number, lego_index, phrase_role, known_text').eq('course_code', COURSE).in('known_text', contexts)
  const liveText = new Set([...(seedHits || []).map(s => s.known_text), ...(phraseHits || []).map(p => p.known_text)])

  const rows = []
  const problems = []

  for (const item of PLAN) {
    const lego = legoById.get(item.legoId)
    if (!lego) { problems.push(`${item.legoId}: LEGO not found`); continue }
    if (lego.known_text !== item.chunk) {
      problems.push(`${item.legoId}: known_text moved — plan says "${item.chunk}", DB says "${lego.known_text}"`)
      continue
    }
    if (!lego.is_new) { problems.push(`${item.legoId}: is_new = false — it debuts to no learner, refusing to author`); continue }
    if (!liveText.has(item.context)) {
      problems.push(`${item.legoId}: context is not live course text any more — "${item.context}"`)
      continue
    }
    if (!item.context.includes(item.chunk)) {
      problems.push(`${item.legoId}: context does not contain the chunk`)
      continue
    }
    const overlap = item.chunk.length / item.context.length
    if (overlap > OVERLAP_LIMIT) {
      problems.push(`${item.legoId}: chunk/context overlap ${overlap.toFixed(2)} > ${OVERLAP_LIMIT} — the engine would drop this context`)
      continue
    }

    const text = presentationAuthor.renderIntro({
      frame: 'B', template, targetLangName, chunk: item.chunk, seed: item.context
    })
    if (!text.includes(item.context)) { problems.push(`${item.legoId}: rendered line lost its context`); continue }

    const current = existingPres.filter(p => p.lego_id === item.legoId)
    if (current.some(p => p.origin === 'human')) {
      problems.push(`${item.legoId}: a human recording holds this slot — never superseded by a script`)
      continue
    }
    const already = current.find(p => normalizeForAudio(p.text) === normalizeForAudio(text))

    rows.push({
      lego_id: item.legoId,
      seed_number: lego.seed_number,
      chunk: item.chunk,
      target: lego.target_text,
      sense: item.sense,
      why: item.why,
      context: item.context,
      context_from: item.contextFrom,
      overlap: Number(overlap.toFixed(3)),
      text,
      already_authored: Boolean(already),
      existing_rows: current.map(p => ({ id: p.id, text: p.text, rendered: Boolean(p.s3_key) && !p.s3_key.startsWith('pending/'), voice_id: p.voice_id })),
      currently_linked: lego.presentation_audio_id || null
    })
  }

  const toInsert = rows.filter(r => !r.already_authored)

  const log = {
    course: COURSE,
    ranAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run',
    template,
    presentationVoiceId: voiceId,
    planned: rows.length,
    toInsert: toInsert.length,
    alreadyAuthored: rows.length - toInsert.length,
    problems,
    rows
  }

  if (problems.length) {
    console.error(`REFUSING: ${problems.length} precondition failure(s)`)
    problems.forEach(p => console.error('  - ' + p))
  }

  for (const r of rows) {
    console.log(`${r.lego_id} (seed ${r.seed_number}) ${r.chunk} => ${r.target}  [${r.sense}]`)
    console.log(`   context: ${r.context}   (${r.context_from}; ${r.why})`)
    console.log(`   line:    ${r.text}`)
    console.log(`   existing: ${r.existing_rows.length ? r.existing_rows.map(e => (e.rendered ? 'rendered' : 'pending') + ' "' + e.text + '"').join(' | ') : 'none'}`)
    console.log(`   ${r.already_authored ? 'ALREADY AUTHORED — no write' : 'WILL INSERT pending row'}`)
  }

  if (APPLY && !problems.length && toInsert.length) {
    const records = toInsert.map(r => ({
      course_code: COURSE,
      text: r.text,
      text_normalized: normalizeForAudio(r.text),
      language: course.known_lang,
      role: 'presentation',
      voice_id: voiceId,
      origin: 'tts',
      s3_key: `pending/${crypto.randomUUID().toUpperCase()}.mp3`,
      lego_id: r.lego_id
    }))
    const { data: inserted, error: insErr } = await sb.from('course_audio')
      .upsert(records, { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true })
      .select('id, lego_id, text, s3_key')
    if (insErr) throw insErr
    log.inserted = inserted || []
    console.log(`\nInserted ${(inserted || []).length} pending presentation row(s).`)

    // Read back — assert the rows are there and that no link moved.
    const { data: after } = await sb.from('course_audio')
      .select('id, lego_id, text, s3_key').eq('course_code', COURSE).eq('role', 'presentation').in('lego_id', legoIds)
    const { data: legosAfter } = await sb.from('course_legos')
      .select('lego_id, presentation_audio_id').eq('course_code', COURSE).in('lego_id', legoIds)
    log.verifiedAfter = {
      presentationRowsPerLego: Object.fromEntries(legoIds.map(id => [id, after.filter(a => a.lego_id === id).length])),
      linksUnchanged: legosAfter.every(l => (l.presentation_audio_id || null) === (legoById.get(l.lego_id).presentation_audio_id || null))
    }
    console.log('verify:', JSON.stringify(log.verifiedAfter, null, 1))
  } else if (APPLY) {
    console.log('\nNothing written.')
  } else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.')
  }

  const out = path.join(__dirname, `fix-eng-for-hin-kal-presentation-context-2026-09-03-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`log → ${out}`)
  if (problems.length) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })

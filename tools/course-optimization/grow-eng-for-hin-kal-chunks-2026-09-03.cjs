#!/usr/bin/env node
/**
 * eng_for_hin — grow a कल chunk until it carries its own tense marker, WITHOUT
 * deleting the sister LEGO.
 *
 * KAI'S REDIRECT (2026-09-03): *"does the sister merge you were planning involve
 * a sister lego that actually holds the past/future context? Because if they
 * don't, it's pointless as a teaching opportunity! And whether it's cheap is not
 * relevant, I don't care about losing a few phrases, just make new ones"*.
 *
 * THE MOVE THIS TOOL MAKES, AND WHY IT COSTS NO ROUND. The received wisdom was
 * that a कल chunk cannot be grown, because everything between it and its verb is
 * already owned by a sibling and LEGOs may not overlap — so the only option was
 * a MERGE, which deletes an is_new LEGO and therefore a round, on a live course.
 *
 * That premise is false, and this course disproves it: **seed 42 already ships
 * two overlapping LEGOs** — S0042L02 `के मुक़ाबले` is wholly contained in
 * S0042L03 `कल रात के मुक़ाबले`, both `is_new`, and the seed PASSES the course's
 * own gate. Verified again here through `POST /v2/validate` with an in-memory
 * override, which is exact for downstream blast radius.
 *
 * So the कल chunk is GROWN to the tensed unit and the sister is LEFT IN PLACE.
 * The LEGO count is unchanged, so `course_round_index` does not move, no round
 * is deleted, and there is no learner-progress migration. The learner gets the
 * sister as one rung ("did you have to finish") and the grown, self-dating chunk
 * as the next ("did you have to finish everything last night").
 *
 * ONLY WHERE THE SISTER REALLY SUPPLIES THE TENSE. Each entry below quotes the
 * sister and names the marker. A growth that swallows a noun phrase and stops
 * short of the verb is exactly the pointless case Kai rejected, and is not here.
 *
 * NO TTS. All four voices on this course are xAI, which is retired.
 *
 *   node tools/course-optimization/grow-eng-for-hin-kal-chunks-2026-09-03.cjs <seed>
 *   node tools/course-optimization/grow-eng-for-hin-kal-chunks-2026-09-03.cjs <seed> --apply
 */

require('dotenv').config()
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs')
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')
const presentationAuthor = require('../../services/phases/presentation-author.cjs')

const COURSE = 'eng_for_hin'
const APPLY = process.argv.includes('--apply')
const SEED = Number(process.argv[2])
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })

const GROWTHS = {
  278: {
    legoId: 'S0278L02',
    from: { known: 'कल रात सब', target: 'everything last night' },
    to: { known: 'क्या आपको कल रात सब पूरा करना था', target: 'did you have to finish everything last night' },
    sister: { legoId: 'S0278L01', known: 'क्या आपको पूरा करना था', target: 'did you have to finish' },
    marker: 'करना था — past obligation. The sister already wraps the कल chunk, so the grown unit is the seed sentence itself and is contiguous in both languages.',
    // Measured through /v2/validate with an override, 2026-09-03: the sweep
    // returns 622/46 with an identical failing set, and all nine of this LEGO's
    // existing phrases already contain the grown chunk.
    expect: { newlyFailing: 0, phrasesNeedingReauthoring: 0 }
  },

  192: {
    legoId: 'S0192L02',
    from: { known: 'कल रात', target: 'tomorrow night' },
    to: { known: 'मैं कल रात व्यस्त हूँ', target: "I'm busy tomorrow night" },
    sister: { legoId: 'S0192L01', known: 'मैं व्यस्त हूँ', target: "I'm busy" },
    marker: 'हूँ — an overt present copula. Hindi present tense cannot host कल = yesterday, so the grown chunk dates itself forward. The sister already wraps the कल chunk, so the grown unit is the seed sentence and is contiguous in both languages.',
    // Only one of the nine existing drills contains the grown chunk, and a
    // bare-LEGO phrase does not count toward the BUILD floor, so the drill set
    // is re-authored whole — Kai, 2026-09-03: "I don't care about losing a few
    // phrases, just make new ones". Every frame below is taught at or before
    // seed 192, and every one keeps हूँ, so every drill dates itself forward.
    replacePhrases: [
      { role: 'build', known: 'इसलिए मैं कल रात व्यस्त हूँ', target: "so I'm busy tomorrow night" },
      { role: 'build', known: 'लेकिन मैं कल रात व्यस्त हूँ', target: "but I'm busy tomorrow night" },
      { role: 'build', known: 'और फिर मैं कल रात व्यस्त हूँ', target: "and then I'm busy tomorrow night" },
      { role: 'use', known: 'मुझे अफ़सोस है कि मैं कल रात व्यस्त हूँ।', target: "I'm sorry that I'm busy tomorrow night" },
      { role: 'use', known: 'मुझे डर है कि मैं कल रात व्यस्त हूँ।', target: "I'm afraid I'm busy tomorrow night" },
      { role: 'use', known: 'मुझे यकीन नहीं है कि मैं कल रात व्यस्त हूँ।', target: "I'm not sure if I'm busy tomorrow night" },
      { role: 'use', known: 'मुझे लगता है कि मैं कल रात व्यस्त हूँ।', target: "I think that I'm busy tomorrow night" },
      { role: 'use', known: 'दुर्भाग्य से मैं कल रात व्यस्त हूँ।', target: 'unfortunately I\'m busy tomorrow night' }
    ],
    // The only two phrases anywhere else in the course that tiled the bare
    // chunk. Both keep their own teaching point and swap the time word for
    // आज रात — taught at seed 31, and unambiguous.
    downstreamRepairs: [
      { id: 'eng_for_hin:S0193L02B02', fromKnown: 'कल रात मैं बहुत व्यस्त हूँ', fromTarget: "I'm too busy tomorrow night",
        toKnown: 'आज रात मैं बहुत व्यस्त हूँ', toTarget: "I'm too busy tonight" },
      { id: 'eng_for_hin:S0249L02U04', fromKnown: 'मैं चाहता हूँ कि आप कल रात मेरी मदद करें।', fromTarget: 'I want you to help me tomorrow night',
        toKnown: 'मैं चाहता हूँ कि आप आज रात मेरी मदद करें।', toTarget: 'I want you to help me tonight' }
    ],
    expect: { newlyFailing: 0, phrasesNeedingReauthoring: 8 }
  }
}

async function main () {
  const g = GROWTHS[SEED]
  if (!g) {
    console.error(`No growth defined for seed ${SEED}. Defined: ${Object.keys(GROWTHS).join(', ')}`)
    process.exit(1)
  }

  const { data: lego, error } = await sb.from('course_legos')
    .select('lego_id, seed_number, lego_index, known_text, target_text, is_new, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
    .eq('course_code', COURSE).eq('lego_id', g.legoId).single()
  if (error) throw error
  const { data: sister } = await sb.from('course_legos')
    .select('lego_id, known_text, target_text').eq('course_code', COURSE).eq('lego_id', g.sister.legoId).single()

  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim()
  const problems = []
  if (lego.known_text !== g.from.known) problems.push(`known_text moved: "${lego.known_text}"`)
  if (lego.target_text !== g.from.target) problems.push(`target_text moved: "${lego.target_text}"`)
  if (sister.known_text !== g.sister.known) problems.push(`sister known_text moved: "${sister.known_text}"`)
  if (!lego.is_new) problems.push('is_new = false')

  // The grown chunk must still be a real span of the seed, in both languages.
  const { data: seed } = await sb.from('course_seeds')
    .select('known_text, target_text').eq('course_code', COURSE).eq('seed_number', SEED).single()
  if (!seed.known_text.includes(g.to.known)) problems.push('grown known_text is not a span of the seed sentence')
  if (!norm(seed.target_text).includes(norm(g.to.target))) problems.push('grown target_text is not a span of the seed target')
  // …and it must contain the chunk it replaces, or it is not a growth.
  if (!g.to.known.includes(g.from.known)) problems.push('grown known_text does not contain the old chunk')

  // Every existing phrase on this LEGO must still contain the grown target.
  const { data: phrases } = await sb.from('course_practice_phrases')
    .select('id, seed_number, lego_index, phrase_role, target_text')
    .eq('course_code', COURSE).eq('seed_number', SEED).eq('lego_index', lego.lego_index)
  const buildUse = phrases.filter(p => p.phrase_role === 'build' || p.phrase_role === 'use')
  const surviving = buildUse.filter(p => norm(p.target_text).includes(norm(g.to.target)))
  const dropped = buildUse.filter(p => !norm(p.target_text).includes(norm(g.to.target)))
  if (dropped.length !== g.expect.phrasesNeedingReauthoring) {
    problems.push(`${dropped.length} phrase(s) would fail containment; the plan expects ${g.expect.phrasesNeedingReauthoring}`)
  }

  // The drill set after the growth: either the survivors, or the replacement
  // set when the plan re-authors the LEGO's phrases whole.
  const replacing = Array.isArray(g.replacePhrases) && g.replacePhrases.length > 0
  const finalSet = replacing
    ? g.replacePhrases.map(r => ({ phrase_role: r.role, target_text: r.target, known_text: r.known }))
    : surviving
  for (const r of finalSet) {
    if (!norm(r.target_text).includes(norm(g.to.target))) problems.push(`replacement fails containment: "${r.target_text}"`)
    // A phrase that IS the bare chunk does not count as a drill — the gate says so.
    if (norm(r.target_text) === norm(g.to.target)) problems.push(`replacement is the bare LEGO, which the gate refuses as a BUILD: "${r.target_text}"`)
  }
  const builds = finalSet.filter(p => p.phrase_role === 'build').length
  const uses = finalSet.filter(p => p.phrase_role === 'use').length
  if (builds < 3 || uses < 5) problems.push(`drill set below the gate floor: ${builds} build / ${uses} use (need 3 / 5)`)

  // Downstream repairs must still say what they said, minus the ambiguity.
  for (const r of (g.downstreamRepairs || [])) {
    const { data: row } = await sb.from('course_practice_phrases')
      .select('id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('id', r.id).maybeSingle()
    if (!row) { problems.push(`downstream repair target missing: ${r.id}`); continue }
    if (row.known_text !== r.fromKnown || row.target_text !== r.fromTarget) {
      problems.push(`downstream repair target moved: ${r.id} now "${row.known_text}" => "${row.target_text}"`)
    }
    if (/कल/.test(r.toKnown)) problems.push(`downstream repair still contains कल: ${r.id}`)
    r._clips = row ? { known: row.known_audio_id, target1: row.target1_audio_id, target2: row.target2_audio_id } : null
  }

  // Downstream phrases that tile the OLD chunk lose it.
  const { data: allPhrases } = await sb.from('course_practice_phrases')
    .select('id, seed_number, target_text, decomposition').eq('course_code', COURSE)
  const tilers = allPhrases.filter(p => Array.isArray(p.decomposition) && p.decomposition.some(b => b.legoId === g.legoId))
  const downstream = tilers.filter(p => p.seed_number !== SEED)

  console.log(`seed ${SEED}  ${g.legoId}`)
  console.log(`  sister ${g.sister.legoId}: "${sister.known_text}" => "${sister.target_text}"`)
  console.log(`  marker: ${g.marker}`)
  console.log(`  grow: "${lego.known_text}" => "${lego.target_text}"`)
  console.log(`    to: "${g.to.known}" => "${g.to.target}"`)
  console.log(`  own phrases: ${buildUse.length}, surviving containment ${surviving.length} (${builds} build / ${uses} use), needing re-authoring ${dropped.length}`)
  console.log(`  phrases tiling this chunk: ${tilers.length} total, ${downstream.length} downstream`)
  console.log(`  clips on this LEGO: known=${!!lego.known_audio_id} target1=${!!lego.target1_audio_id} target2=${!!lego.target2_audio_id}`)

  const log = {
    course: COURSE, seed: SEED, legoId: g.legoId, ranAt: new Date().toISOString(),
    mode: APPLY ? 'apply' : 'dry-run', from: g.from, to: g.to, sister: g.sister, marker: g.marker,
    ownPhrases: buildUse.length, surviving: surviving.length, dropped: dropped.map(d => d.id),
    downstreamTilers: downstream.map(d => ({ id: d.id, seed: d.seed_number, target: d.target_text })),
    clipsBefore: { known: lego.known_audio_id, target1: lego.target1_audio_id, target2: lego.target2_audio_id },
    problems
  }

  if (problems.length) {
    console.error('\nREFUSING:'); problems.forEach(p => console.error('  - ' + p))
  } else if (APPLY) {
    // 1. Grow the chunk. The known-side trigger re-resolves its own link; the
    //    target side has no trigger, so null it explicitly rather than leave a
    //    clip speaking the old chunk pointed at the new text.
    const patch = { known_text: g.to.known, target_text: g.to.target }
    if (lego.target1_audio_id) patch.target1_audio_id = null
    if (lego.target2_audio_id) patch.target2_audio_id = null
    const { error: upErr } = await sb.from('course_legos').update(patch).eq('course_code', COURSE).eq('lego_id', g.legoId)
    if (upErr) throw upErr

    // 1b. Re-author this LEGO's drill set, when the plan replaces it whole.
    //     Delete-then-insert on ONE LEGO's phrases only, with deterministic ids.
    let replaced = null
    if (replacing) {
      const { error: delErr } = await sb.from('course_practice_phrases')
        .delete().eq('course_code', COURSE).eq('seed_number', SEED).eq('lego_index', lego.lego_index)
        .in('phrase_role', ['build', 'use'])
      if (delErr) throw delErr
      let b = 0, u = 0, pos = 0
      const rows = g.replacePhrases.map(r => {
        pos++
        const n = r.role === 'build' ? ++b : ++u
        return {
          id: `${COURSE}:${g.legoId}${r.role === 'build' ? 'B' : 'U'}${String(n).padStart(2, '0')}`,
          course_code: COURSE, seed_number: SEED, lego_index: lego.lego_index, position: pos,
          known_text: r.known, target_text: r.target, phrase_role: r.role,
          status: 'draft', introduce: true, connected_lego_ids: [], lego_position: 'end',
          word_count: r.target.length, lego_count: r.known.split(/\s+/).length,
          metadata: { format: 'build_use', pipeline: 'v2', source: 'कल chunk growth (Kai 2026-09-03)' }
        }
      })
      const { data: ins, error: insPhErr } = await sb.from('course_practice_phrases').insert(rows).select('id')
      if (insPhErr) throw insPhErr
      replaced = ins
    }

    // 1c. Repair the phrases elsewhere in the course that tiled the old chunk.
    for (const r of (g.downstreamRepairs || [])) {
      const patch = { known_text: r.toKnown, target_text: r.toTarget }
      if (r._clips && r._clips.target1) patch.target1_audio_id = null
      if (r._clips && r._clips.target2) patch.target2_audio_id = null
      const { error: repErr } = await sb.from('course_practice_phrases').update(patch).eq('id', r.id)
      if (repErr) throw repErr
    }

    // 2. Every phrase that tiled the old chunk is re-decomposed against the new
    //    vocabulary — a stale edge map is what drops the player to its fragile path.
    const { data: nowPhrases } = await sb.from('course_practice_phrases')
      .select('id, seed_number, target_text').eq('course_code', COURSE).eq('seed_number', SEED)
    const repairIds = (g.downstreamRepairs || []).map(r => r.id)
    const { data: repaired } = repairIds.length
      ? await sb.from('course_practice_phrases').select('id, seed_number, target_text').in('id', repairIds)
      : { data: [] }
    const byId = new Map()
    for (const p of [...tilers, ...nowPhrases, ...repaired]) {
      byId.set(p.id, { id: p.id, course_code: COURSE, seed_number: p.seed_number ?? SEED, target_text: p.target_text })
    }
    const toRedecorate = [...byId.values()]
    const dec = await decoratePhrasesWithDecomposition(sb, toRedecorate)
    log.replacedPhrases = replaced

    // 3. The introduction must quote the chunk the learner is actually prompted
    //    with. The grown chunk carries its own tense, so it needs no "as in"
    //    context — and the engine would drop one anyway (chunk/context overlap
    //    above 0.5). Frame A, written as a pending row beside anything already
    //    there: make-before-break, no link touched.
    const { data: course } = await sb.from('courses')
      .select('known_lang, target_lang, voice_config').eq('course_code', COURSE).single()
    const template = await presentationAuthor.getOrCreatePresentationTemplate(
      sb, course.known_lang, presentationAuthor.localisedLangName(course.known_lang, 'eng'))
    const introText = presentationAuthor.renderIntro({
      frame: 'A', template,
      targetLangName: presentationAuthor.localisedLangName(course.target_lang, course.known_lang),
      chunk: g.to.known, seed: ''
    })
    const voiceId = presentationAuthor.resolvePresentationVoiceId(course)
    const { data: presRows } = await sb.from('course_audio')
      .select('id, text').eq('course_code', COURSE).eq('role', 'presentation').eq('lego_id', g.legoId)
    let presInserted = null
    if (!presRows.some(p => normalizeForAudio(p.text) === normalizeForAudio(introText))) {
      const { data: ins, error: insErr } = await sb.from('course_audio').upsert([{
        course_code: COURSE, text: introText, text_normalized: normalizeForAudio(introText),
        language: course.known_lang, role: 'presentation', voice_id: voiceId, origin: 'tts',
        s3_key: `pending/${crypto.randomUUID().toUpperCase()}.mp3`, lego_id: g.legoId
      }], { onConflict: 'course_code,text_normalized,language,role,voice_id', ignoreDuplicates: true }).select('id, text')
      if (insErr) throw insErr
      presInserted = ins
    }

    // 4. Read everything back.
    const { data: after } = await sb.from('course_legos')
      .select('known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
      .eq('course_code', COURSE).eq('lego_id', g.legoId).single()
    const { data: phAfter } = await sb.from('course_practice_phrases')
      .select('id, target_text, decomposition').in('id', toRedecorate.map(p => p.id))
    const concatBad = phAfter.filter(p => Array.isArray(p.decomposition) &&
      p.decomposition.map(b => b.target).join('') !== p.target_text)
    log.decoration = dec
    log.presentationInserted = presInserted
    log.introText = introText
    log.verifiedAfter = {
      known_text: after.known_text, target_text: after.target_text,
      clips: { known: after.known_audio_id, target1: after.target1_audio_id, target2: after.target2_audio_id },
      presentationLinkUnchanged: (after.presentation_audio_id || null) === (lego.presentation_audio_id || null),
      redecorated: phAfter.length, concatMismatches: concatBad.length
    }
    console.log('verify:', JSON.stringify(log.verifiedAfter, null, 1))
    if (concatBad.length) console.error('WARNING: concat mismatches', concatBad.map(c => c.id))
  } else {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.')
  }

  const out = path.join(__dirname, `grow-eng-for-hin-kal-chunks-2026-09-03-seed${SEED}-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`log → ${out}`)
  if (problems.length) process.exit(1)
}

main().catch(e => { console.error(e); process.exit(1) })

#!/usr/bin/env node
/**
 * unlink-wrong-dialect-seed-clips-2026-09-03.cjs — a seed slot may not be
 * filled by a human take from another dialect.
 *
 * WHY THIS EXISTS. A DIALECT IS ITS OWN LANGUAGE ON THIS ESTATE. On 2026-09-03
 * the seed linker wrote a take into EVERY course of the language holding the
 * same sentence, so eight cym_s_for_eng (Southern Welsh) seeds ended up serving
 * Aran's cym_n (Northern) takes — a wrong-dialect clip reaching a learner of a
 * RELEASED course, the same class of harm as the 2026-08-19 dialect bug. The
 * linker itself was fixed forward in #378 (seedBucketFor); these eight were
 * written before that and stay wrong without this.
 *
 * WHAT IT DOES. It CLEARS one column, course_seeds.<role>_audio_id, back to
 * NULL, for seed slots whose linked clip was recorded by a human voice of a
 * DIFFERENT dialect from the course. Nothing else is written.
 *
 * WHY NULL AND NOT A REPLACEMENT. There is no replacement to point at: none of
 * the eight sentences has ANY cym_s clip in course_audio, under either
 * normalisation, in any role. The slot was EMPTY before the linker filled it
 * (128 of cym_s's 136 filled target2 slots hold its own legacy_import clips;
 * these eight hold Aran's). NULL is therefore the restoration of the prior
 * state, and it is what the other 532 unfilled seeds of that course already
 * are — so nothing learner-facing is lost that was not already absent.
 *
 * NOTHING IS DELETED. Aran's clips are correctly his Northern recordings, stay
 * in course_audio, keep their S3 objects, and all eight remain linked to their
 * OWN cym_n_for_eng seeds — verified before this was written. Unlinking here
 * removes a wrong pointer, not a take. Make-before-break is not at issue: no
 * asset is replaced or destroyed.
 *
 * Every row's before-state is asserted at the moment of the write (the update
 * is conditioned on the exact audio id it expects) and the run aborts on drift.
 *
 * DRY RUN BY DEFAULT.  node tools/recording/unlink-wrong-dialect-seed-clips-2026-09-03.cjs
 * APPLY:               APPLY=1 node tools/recording/unlink-wrong-dialect-seed-clips-2026-09-03.cjs
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const Q = require('../../services/voice-engine/recordist-queue.cjs')
const { canonicalDialect, courseDialect } = require('../../services/shared/dialect.cjs')

const APPLY = process.env.APPLY === '1'
const SLOTS = ['known', 'target1', 'target2']

async function main() {
  const db = createClient(process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)

  // Every human recordist the estate knows, with the dialect they record in.
  const recordists = new Map()
  for (const policy of await Q.loadPolicies(db)) {
    for (const slot of Object.keys(policy.voices || {})) {
      const voiceId = (policy.voices[slot] || {}).voiceId
      if (!voiceId || recordists.has(voiceId)) continue
      const r = await Q.resolveRecordist(db, voiceId)
      if (r) recordists.set(voiceId, r)
    }
  }
  // Widened: a stored clip may carry any spelling or alias of the voice.
  const bySpelling = new Map()
  for (const r of recordists.values()) {
    for (const s of r.spellings) bySpelling.set(s, r)
  }

  const { data: courses, error: cErr } = await db.from('courses')
    .select('course_code, target_lang, dialect')
  if (cErr) throw new Error(`course read failed: ${cErr.message}`)
  const byCourse = new Map((courses || []).map(c => [c.course_code, c]))

  // Every filled seed slot, and the clip it points at.
  const seeds = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('course_seeds')
      .select('id, course_code, seed_number, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .range(from, from + 999)
    if (error) throw new Error(`seed read failed: ${error.message}`)
    seeds.push(...(data || []))
    if (!data || data.length < 1000) break
  }

  // ONLY THE HUMAN RECORDISTS' OWN CLIPS ARE READ, not the 128k clips the
  // estate's seed slots point at: a slot filled by TTS or by an import cannot
  // be a wrong-dialect HUMAN take, which is the only thing this tool touches.
  // Reading the small side turns 1,300 round trips into a handful.
  const clips = new Map()
  const spellings = [...bySpelling.keys()]
  for (let i = 0; i < spellings.length; i += 20) {
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from('course_audio')
        .select('id, course_code, voice_id, origin, text, language')
        .in('voice_id', spellings.slice(i, i + 20))
        .range(from, from + 999)
      if (error) throw new Error(`clip read failed: ${error.message}`)
      for (const c of data || []) clips.set(c.id, c)
      if (!data || data.length < 1000) break
    }
  }

  const plan = []
  const foreign = []   // dialect mismatches that are NOT mislinks — reported only
  for (const seed of seeds) {
    const course = byCourse.get(seed.course_code)
    if (!course) continue
    for (const slot of SLOTS) {
      const audioId = seed[`${slot}_audio_id`]
      if (!audioId) continue
      const clip = clips.get(audioId)
      if (!clip) continue
      const recordist = bySpelling.get(clip.voice_id)
      if (!recordist) continue                        // not a human recordist's take
      if (canonicalDialect(recordist.dialect) === courseDialect(course)) continue
      // TWO CONDITIONS, NOT ONE. A dialect mismatch on a clip filed under THIS
      // COURSE'S OWN code is not a mislink — it is the course's `dialect`
      // column disagreeing with the recordist's policy dialect, and clearing
      // the slot would silence a take that was recorded FOR this course.
      // cym_anthem_for_jpn is exactly that: three seeds served by Catrin's own
      // cym_anthem clips, the course marked 'standard' and Catrin 'north'.
      // Reported, deliberately not touched — the metadata is the question there.
      if (clip.course_code === seed.course_code) {
        foreign.push({ courseCode: seed.course_code, courseDialect: courseDialect(course),
          seedNumber: seed.seed_number, slot, clipVoice: clip.voice_id,
          clipDialect: canonicalDialect(recordist.dialect), why: 'own-course clip; course dialect metadata, not a mislink' })
        continue
      }
      plan.push({
        courseCode: seed.course_code, courseDialect: courseDialect(course),
        seedId: seed.id, seedNumber: seed.seed_number, slot,
        text: seed.target_text, audioId,
        clipCourse: clip.course_code, clipVoice: clip.voice_id,
        clipDialect: canonicalDialect(recordist.dialect),
      })
    }
  }

  const log = []
  for (const item of plan) {
    // BEFORE-STATE, read fresh and asserted at the moment of the write.
    const { data: seed, error } = await db.from('course_seeds')
      .select(`id, ${item.slot}_audio_id`).eq('id', item.seedId).maybeSingle()
    if (error) throw new Error(`seed re-read failed: ${error.message}`)
    if (!seed) { log.push({ ...item, action: 'skip', why: 'seed vanished' }); continue }
    if ((seed[`${item.slot}_audio_id`] || null) !== item.audioId) {
      log.push({ ...item, action: 'skip', why: 'slot moved under us' }); continue
    }
    log.push({ ...item, action: APPLY ? 'unlinked' : 'would-unlink' })
    if (!APPLY) continue
    const { error: upErr } = await db.from('course_seeds')
      .update({ [`${item.slot}_audio_id`]: null })
      .eq('id', item.seedId).eq(`${item.slot}_audio_id`, item.audioId)
    if (upErr) throw new Error(`unlink failed for ${item.seedId}: ${upErr.message}`)
  }

  const out = path.join(__dirname, `unlink-wrong-dialect-seed-clips-2026-09-03-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify({ log, reportedNotTouched: foreign }, null, 2))
  const counts = log.reduce((m, r) => (m[r.action] = (m[r.action] || 0) + 1, m), {})
  console.log(APPLY ? 'APPLIED' : 'DRY RUN', counts)
  if (foreign.length) {
    console.log(`\n  ${foreign.length} dialect mismatch(es) on a course's OWN clips — NOT touched:`)
    for (const f of foreign) {
      console.log(`    ${f.courseCode} (${f.courseDialect}) seed ${f.seedNumber} ${f.slot} <- ${f.clipVoice} (${f.clipDialect})`)
    }
  }
  for (const r of log) {
    console.log(`  ${r.courseCode} (${r.courseDialect}) seed ${r.seedNumber} ${r.slot} <- ${r.clipVoice} (${r.clipDialect}, ${r.clipCourse})  ${r.action}`)
  }
  console.log(`log: ${out}`)
}

main().catch((e) => { console.error(e.message); process.exit(1) })

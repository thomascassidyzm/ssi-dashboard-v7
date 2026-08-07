#!/usr/bin/env node
/**
 * The six "no authored presentation text" LEGOs in fra_for_eng rounds 1-200 are
 * not missing anything. Each one's course_legos.presentation_audio_id points at
 * a real, rendered presentation clip — but that clip's course_audio.lego_id is
 * NULL, and the reuse planner looks presentation text up BY lego_id
 * (fetchPresentationTexts). So the text is there and the planner cannot see it,
 * and six intros in rounds 32/85/96/102/119/137 get reported BLOCKED and are
 * skipped by the rebuild.
 *
 * This writes one column on six rows: lego_id, taken from the LEGO that already
 * points at the clip. Nothing is deleted, no s3_key moves, no FK changes, no
 * audio is rendered. Each row is asserted before it is touched — the clip must
 * still be the presentation clip that LEGO points at, and its lego_id must still
 * be null — and a row that has drifted is skipped, not forced.
 *
 *   node scripts/fra-link-blocked-presentations.cjs            # dry run
 *   node scripts/fra-link-blocked-presentations.cjs --apply
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const APPLY = process.argv.includes('--apply')
const COURSE = 'fra_for_eng'
const LEGO_IDS = ['S0010L02', 'S0027L03', 'S0033L01', 'S0035L01', 'S0041L02', 'S0049L01']
const OUT = path.join(__dirname, '..', 'docs', 'audio-repair-2026-08-07',
  `fra_for_eng-blocked-presentation-link-${APPLY ? 'applied' : 'dryrun'}-log.json`)

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function main () {
  const { data: legos, error } = await sb.from('course_legos')
    .select('lego_id, known_text, presentation_audio_id')
    .eq('course_code', COURSE).in('lego_id', LEGO_IDS)
  if (error) throw new Error(error.message)

  const log = []
  for (const lego of legos) {
    const entry = { legoId: lego.lego_id, known: lego.known_text, audioId: lego.presentation_audio_id }

    if (!lego.presentation_audio_id) { entry.action = 'SKIP'; entry.reason = 'lego has no presentation_audio_id'; log.push(entry); continue }

    const { data: row } = await sb.from('course_audio')
      .select('id, course_code, role, lego_id, text, voice_id, s3_key')
      .eq('id', lego.presentation_audio_id).maybeSingle()

    if (!row)                      { entry.action = 'SKIP'; entry.reason = 'no such course_audio row' }
    else if (row.role !== 'presentation') { entry.action = 'SKIP'; entry.reason = `role is ${row.role}, not presentation` }
    else if (row.course_code !== COURSE)  { entry.action = 'SKIP'; entry.reason = `row belongs to ${row.course_code}` }
    else if (row.lego_id === lego.lego_id) { entry.action = 'NONE'; entry.reason = 'already linked' }
    else if (row.lego_id)          { entry.action = 'SKIP'; entry.reason = `row already carries lego_id ${row.lego_id} — not overwriting` }
    else {
      entry.text = row.text
      entry.voiceId = row.voice_id
      entry.s3Key = row.s3_key
      entry.action = 'LINK'
      if (APPLY) {
        const { error: upErr } = await sb.from('course_audio')
          .update({ lego_id: lego.lego_id }).eq('id', row.id).is('lego_id', null)
        if (upErr) { entry.action = 'FAILED'; entry.reason = upErr.message }
        else entry.applied = true
      }
    }
    log.push(entry)
  }

  const counts = log.reduce((a, e) => (a[e.action] = (a[e.action] || 0) + 1, a), {})
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify({ course: COURSE, apply: APPLY, counts, entries: log }, null, 1))
  console.log(`${APPLY ? 'APPLIED' : 'DRY RUN'}: ${JSON.stringify(counts)}`)
  for (const e of log) console.log(` ${e.action.padEnd(6)} ${e.legoId} ${JSON.stringify(e.known)} ${e.reason || e.text || ''}`)
  console.log(OUT)
}

main().catch(e => { console.error(e); process.exit(1) })

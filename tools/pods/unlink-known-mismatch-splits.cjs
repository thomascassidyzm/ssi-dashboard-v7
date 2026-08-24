#!/usr/bin/env node
/**
 * unlink-known-mismatch-splits.cjs — put back to whole-turn any Pod 1 row whose
 * TARGET was split into more (or fewer) pieces than its KNOWN text has
 * sentences, because the app cannot pair them and the learner loses the
 * English on the unpaired cards.
 *
 * WHY THIS EXISTS. The splice pass (splice-sentence-clips.cjs) split every
 * multi-sentence turn it could cut cleanly, and cleanly is exactly what it
 * did — the audio is fine. The defect is upstream of the audio, in the TEXT:
 *
 *   hrv SC07-S009  target "Da, mogu li dobiti… i čašu vode, molim."
 *                  known  "Yes, can I have a glass of water as well, please."
 *
 * Croatian Pod 1 uses "…" as a mid-sentence HESITATION marker. The sentence
 * boundary regex — the app's own `POD_SENTENCE_BOUNDARY`, which the splicer
 * matches deliberately — counts "…" as a terminal mark, so that ONE sentence
 * becomes two pieces. Worse, generatePodAudio uses the same regex to decide
 * where to put its " … " TTS pause cue, so the take really does pause there
 * and the splicer finds a clean, wide, high-margin gap. Every audio gate
 * passes. The cut is good. The sentence it cuts is not a sentence.
 *
 * The learner-visible consequence is on the KNOWN side: splitRowUnits pairs
 * known text to cards by index (`kSents[i] || ''`), so a target split into 2
 * against an English text of 1 sentence gives card 2 an empty translation —
 * and card 1 a fragment, "Da, mogu li dobiti…", which is not something anyone
 * should be asked to learn.
 *
 * THE RULE, and why it is a count check rather than an ellipsis check.
 * Refusing specifically on "…" would fix Croatian and miss everything else.
 * The general, checkable invariant is: a row may only be split into as many
 * pieces as its known text can supply sentences for. That catches the
 * ellipsis over-split, and it catches the other causes too — of the 86
 * mismatched rows across the fleet, 78 are the Croatian ellipsis and 8 are
 * not. Same rule, one gate, no special cases.
 *
 * WHAT THIS DOES AND DOES NOT TOUCH. It NULLs `sentence_audio_ids` on the
 * offending rows, which returns them to exactly the whole-turn behaviour they
 * had before the splice pass — no worse than this morning, and the whole-turn
 * clip was never touched. It does NOT delete the spliced clips from
 * course_audio: they are correct audio of the wrong unit, they cost nothing to
 * keep, and if Tom rules that the Croatian text should lose its hesitation
 * ellipses then re-linking is free (make-before-break, and nothing to re-render).
 *
 * Progress: run migrate-split-progress-forward.cjs's inverse — the split-keyed
 * `<row>:s<i>` state — only if the rows had been live long enough to accrue
 * any. Reported by this tool so the decision is made on a number, not a guess.
 *
 *   node tools/pods/unlink-known-mismatch-splits.cjs [<course>] [--apply]
 *
 * Read-only without --apply. Logs to
 * docs/pods/known-mismatch-unlink-<date>-{dryrun,applied}-log.json.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const REPO = path.resolve(__dirname, '../..')
const COURSE = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null
const APPLY = process.argv.includes('--apply')
/**
 * --from-splice-logs=<date> restricts the unlink to rows THIS splice pass
 * linked, read from that date's applied logs.
 *
 * Use it. Fleet-wide, 97 rows have the mismatch but only 92 came from today —
 * the other 5 (ara_eg 1, hin 3, kor 1) were split by earlier work and have
 * been live for some time. They have the same learner-facing defect and they
 * belong in the report, but reverting somebody else's live content because it
 * failed a gate invented today is not this tool's call to make. Undo your own
 * work; surface theirs.
 */
const FROM_LOGS = (process.argv.find((a) => a.startsWith('--from-splice-logs=')) || '').split('=')[1] || null

// Must stay identical to the app's POD_SENTENCE_BOUNDARY (known side is always
// English here) and to splice-sentence-clips.cjs's known-side split.
const KNOWN_SPLIT = /(?<=[.!?…])\s+/
const splitOn = (t, re) => String(t || '').split(re).map((s) => s.trim()).filter(Boolean)

;(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const { rows } = await db.query(
    `select id, pod_id, target_text, known_text, sentence_audio_ids, sentence_known_audio_ids
       from listening_pod_sentences
      where pod_id like '%:pod-1'
        and sentence_audio_ids is not null
        and array_length(sentence_audio_ids, 1) >= 2
        ${COURSE ? "and pod_id = $1" : ''}
      order by id`, COURSE ? [`${COURSE}:pod-1`] : [])

  // Ids this splice pass linked, if we are scoping to our own work.
  let ownIds = null
  if (FROM_LOGS) {
    ownIds = new Set()
    const dir = path.join(REPO, 'docs', 'pods')
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(`-sentence-splice-${FROM_LOGS}-applied-log.json`)) continue
      for (const l of JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).linked || []) ownIds.add(l.id)
    }
    if (!ownIds.size) { console.error(`no applied splice logs for ${FROM_LOGS}`); process.exit(2) }
  }

  const bad = []
  const notOurs = []
  for (const r of rows) {
    const n = r.sentence_audio_ids.filter(Boolean).length
    const k = splitOn(r.known_text, KNOWN_SPLIT).length
    if (k === n) continue
    if (ownIds && !ownIds.has(r.id)) {
      notOurs.push({
        id: r.id, course: r.pod_id.replace(':pod-1', ''),
        target_pieces: n, known_parts: k,
        target_text: r.target_text, known_text: r.known_text,
      })
      continue
    }
    bad.push({
      id: r.id,
      course: r.pod_id.replace(':pod-1', ''),
      target_pieces: n,
      known_parts: k,
      mid_ellipsis: /… /.test(r.target_text || ''),
      target_text: r.target_text,
      known_text: r.known_text,
      before: { sentence_audio_ids: r.sentence_audio_ids },
    })
  }

  // How much learner progress is keyed on the split slots we are removing.
  let splitState = []
  if (bad.length) {
    const keys = bad.flatMap((b) =>
      Array.from({ length: b.target_pieces }, (_, i) => `${b.id}:s${i}`))
    splitState = (await db.query(
      `select sentence_id, count(*) learners, sum(exposures) exposures
         from learner_pod_state where sentence_id = any($1) group by 1`, [keys])).rows
  }

  const byCourse = {}
  for (const b of bad) {
    byCourse[b.course] = byCourse[b.course] || { rows: 0, mid_ellipsis: 0 }
    byCourse[b.course].rows++
    if (b.mid_ellipsis) byCourse[b.course].mid_ellipsis++
  }

  const at = new Date().toISOString()
  const log = {
    at, apply: APPLY, scope: COURSE || 'all pod-1 courses',
    checked_split_rows: rows.length,
    unlinking: bad.length,
    by_course: byCourse,
    split_keyed_progress_rows_affected: splitState.length,
    split_keyed_progress: splitState,
    // Same defect, not created by this pass — reported, deliberately untouched.
    pre_existing_mismatches_left_alone: notOurs.length,
    pre_existing_rows: notOurs,
    note: 'sentence_audio_ids NULLed only. Spliced clips are LEFT IN course_audio '
      + '— correct audio of the wrong unit; relinking is free if the text ruling changes.',
    rows: bad,
  }
  const logPath = path.join(REPO, 'docs', 'pods',
    `known-mismatch-unlink-${at.slice(0, 10)}-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(logPath, JSON.stringify(log, null, 2))

  if (!APPLY) {
    console.log(`[DRY] ${bad.length} of ${rows.length} split rows have a known/target count mismatch.`)
    for (const [c, v] of Object.entries(byCourse)) {
      console.log(`   ${c}: ${v.rows} rows (${v.mid_ellipsis} with a mid-sentence ellipsis)`)
    }
    console.log(`   split-keyed progress rows that would be orphaned: ${splitState.length}`)
    if (notOurs.length) {
      console.log(`   NOT touching ${notOurs.length} pre-existing mismatched rows (same defect, older work): `
        + Object.entries(notOurs.reduce((o, r) => (o[r.course] = (o[r.course] || 0) + 1, o), {}))
          .map(([c, n]) => `${c}=${n}`).join(' '))
    }
    console.log(`   log: ${logPath}`)
    await db.end()
    return
  }

  await db.query('begin')
  try {
    let n = 0
    for (const b of bad) {
      const r = await db.query(
        'update listening_pod_sentences set sentence_audio_ids = null where id = $1', [b.id])
      n += r.rowCount
    }
    await db.query('commit')
    console.log(`[APPLIED] unlinked ${n} rows back to whole-turn. Log: ${logPath}`)
  } catch (e) {
    await db.query('rollback')
    console.error(`ROLLED BACK: ${e.message}`)
    process.exitCode = 1
  }
  await db.end()
})().catch((e) => { console.error('ERR:', e.message); process.exit(1) })

#!/usr/bin/env node
/**
 * hrv-pod0-sarah-to-friend-2026-08-22.cjs — Tom's third-option ruling: the protagonist
 * stays male-voiced and loses the name; the FRIEND is the character who is female and
 * named. Three rows, both tracks, and nothing else.
 *
 * TOM'S RULING, 2026-08-22: "REWRITE THE GENDERS so it's the FRIEND character who is
 * female and named - keep the protagonist male-voiced as already cast. Adjust the
 * canonical English script so the named/female role belongs to the Friend, not the
 * protagonist. Only re-render the specific lines the text change touches - do not touch
 * anything else in the pod." His reasoning: pod-0 should stay simple with two voices
 * across every language it is built into, and a small text adjustment to match the
 * casting is an acceptable trade.
 *
 * THIS SUPERSEDES THE OPEN QUESTION IN §3 of docs/pods/hrv-pod0-two-voice-recast-2026-08-21.md,
 * which carried two options to him (drop the name / rename the protagonist). He picked a
 * third: move the name.
 *
 * STILL PROPOSED, NOT CANON. This is a change to Aran's canonical ENGLISH, which
 * propagates to every language pair built from pod-0. Every edited row gains a
 * `sarah_to_friend_pending_signoff` block naming Aran as signatory, and `old` in the
 * applied log is the way back.
 *
 * WHY THE NAME COULD NOT SIMPLY MOVE WITHIN A LINE. "Sarah" is spoken exactly twice, and
 * both times it is the NEIGHBOUR greeting the protagonist (SC01-S001, SC05-S001). The
 * Friend is not present in either scene. So the name is removed there and given to the
 * Friend at the one place the protagonist greets her: SC04-S002.
 *
 * THE KNOWN TRACK IS EDITED HERE, DELIBERATELY, unlike the 2026-08-21 pass. That pass
 * held to Croatian only because the progress matcher keys on the English text. This
 * ruling IS a canonical-English change — that is the whole point of it — so the English
 * moves and the progress consequence is carried to the switchover plan under the standing
 * content-change migration protocol (docs/pods/pod-migration-protocol.md), not dodged.
 *
 * THE SPEAKER RELABEL IS FORCED, NOT COSMETIC. The protagonist's speaker key in scenes
 * 1-5 is literally `Sarah`. Once the name belongs to the Friend, that key is a landmine
 * in two ways: SC04-S002 would read as speaker `Sarah` saying "Hello, Sarah!", and
 * casting resolves per speaker KEY, so a future pass that labelled the Friend `Sarah`
 * would resolve her to Voice A male. The 13 rows move to `Learner`, which is the pod's
 * own label for the protagonist thread (79 lines) and is already Voice A — so no voice
 * changes and no clip is re-rendered by the relabel. Labels are never spoken and are not
 * the progress key. Precedent: the `Passenger` -> `Fellow passenger` relabel in the
 * 2026-08-21 pass, which was carried to Aran on the same sign-off list.
 *
 * THE CAST MAP IS NOT TOUCHED. listening_pods.speakers keeps its now-unused `Sarah` key
 * on Voice A. Changing it would move the cast fingerprint and invalidate the render
 * approval for no gain, since no row carries the key any more. Flagged in the doc as a
 * switchover-time tidy, not done here — "do not touch anything else in the pod".
 *
 *   node tools/pods/hrv-pod0-sarah-to-friend-2026-08-22.cjs           # dry run
 *   node tools/pods/hrv-pod0-sarah-to-friend-2026-08-22.cjs --apply
 *
 * Refuses to run against any pod id but the working copy. Vocabulary: known / target / seed.
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const POD_ID = 'hrv_for_eng:pod-0-unrecorded'
const LIVE_POD = 'hrv_for_eng:pod-0'
const APPLY = process.argv.includes('--apply')

/**
 * Every edit: scene, sentence, the exact text it must find on BOTH tracks, the text it
 * writes, and the one reason it exists. `old` is asserted in the UPDATE's WHERE clause,
 * so a row whose words moved under us matches zero rows and aborts the transaction.
 */
const EDITS = [
  {
    sc: 1,
    sn: 1,
    speaker: 'Neighbour (8 am)',
    voice: 'B-female',
    why: 'the Neighbour greets the protagonist, who is male-voiced and is no longer named',
    known_old: 'Good morning, Sarah!',
    known_new: 'Good morning!',
    target_old: 'Dobro jutro, Sarah!',
    target_new: 'Dobro jutro!',
  },
  {
    sc: 5,
    sn: 1,
    speaker: 'Neighbour (10:30 pm)',
    voice: 'B-female',
    why: 'same greeting, evening; `imao` already agrees with the male addressee and stays',
    known_old: 'Good evening, Sarah. Did you have a long day?',
    known_new: 'Good evening. Did you have a long day?',
    target_old: 'Dobra večer, Sarah. Jesi li imao dug dan?',
    target_new: 'Dobra večer. Jesi li imao dug dan?',
  },
  {
    sc: 4,
    sn: 2,
    speaker: 'Sarah',           // -> relabelled to `Learner` in the same transaction
    voice: 'A-male',
    why: 'the one place the protagonist greets the Friend — the name lands here, on her',
    known_old: "Hello! I'm sorry but I can't talk at the moment. I need to go home now. Can we talk tomorrow?",
    known_new: "Hello, Sarah! I'm sorry but I can't talk at the moment. I need to go home now. Can we talk tomorrow?",
    target_old: 'Bok! Žao mi je, ali ne mogu sada razgovarati. Moram sada ići kući. Možemo li razgovarati sutra?',
    target_new: 'Bok, Sarah! Žao mi je, ali ne mogu sada razgovarati. Moram sada ići kući. Možemo li razgovarati sutra?',
  },
]

/** Forced by the ruling — see the header note. No voice moves, so no clip is re-rendered. */
const RELABEL = { from: 'Sarah', to: 'Learner', expect_rows: 13 }

const slot = (e) => `SC${String(e.sc).padStart(2, '0')}-S${String(e.sn).padStart(3, '0')}`

/**
 * The name is the ONLY thing allowed to move. Strip the vocative and the two sides must
 * be identical — that is what makes "minimal scope" a mechanical fact rather than a
 * claim. Catches any stray reword smuggled in alongside the name.
 */
function nameOnlyDiff (a, b) {
  const strip = (s) => s
    .replace(/,\s*Sarah\b/g, '')     // "Good morning, Sarah!" / "Bok, Sarah!"
    .replace(/\bSarah\b/g, '')
    .replace(/\s+([!?.,])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
  return strip(a) === strip(b)
}

async function main () {
  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  const liveBefore = (await db.query(
    `select count(*)::int n, count(target_audio_id)::int t, count(known_audio_id)::int k
       from listening_pod_sentences where pod_id = $1`, [LIVE_POD])).rows[0]
  const audioBefore = (await db.query('select count(*)::int n from course_audio')).rows[0].n

  const log = {
    pod_id: POD_ID,
    applied: APPLY,
    ruling: 'Tom 2026-08-22 — the FRIEND is the character who is female and named; the protagonist stays male-voiced and unnamed',
    supersedes: 'docs/pods/hrv-pod0-two-voice-recast-2026-08-21.md §3 (the open question)',
    status: "PROPOSED — pending Aran's personal sign-off on each line before this is canon",
    live_pod_before: { pod_id: LIVE_POD, ...liveBefore },
    course_audio_rows_before: audioBefore,
    edits: [],
    relabelled: [],
  }

  console.log(`\n${POD_ID} — Sarah moves to the Friend${APPLY ? ' (APPLY)' : ' (DRY RUN)'}`)
  console.log(`  live pod ${LIVE_POD} before: ${liveBefore.n} rows / ${liveBefore.t} target / ${liveBefore.k} known`)

  // ---- 1. prove every edit before writing any of them ------------------------
  for (const e of EDITS) {
    const { rows } = await db.query(
      `select id, speaker, known_text, target_text, target_audio_id, known_audio_id
         from listening_pod_sentences
        where pod_id = $1 and scene_number = $2 and sentence_number = $3`,
      [POD_ID, e.sc, e.sn])
    if (rows.length !== 1) throw new Error(`${slot(e)}: expected 1 row, found ${rows.length}`)
    const row = rows[0]
    if (row.known_text !== e.known_old) {
      throw new Error(`${slot(e)}: KNOWN BEFORE-STATE DRIFT\n   expected: ${e.known_old}\n   found:    ${row.known_text}`)
    }
    if (row.target_text !== e.target_old) {
      throw new Error(`${slot(e)}: TARGET BEFORE-STATE DRIFT\n   expected: ${e.target_old}\n   found:    ${row.target_text}`)
    }
    if (row.speaker !== e.speaker) {
      throw new Error(`${slot(e)}: speaker drift — expected ${e.speaker}, found ${row.speaker}`)
    }
    if (!nameOnlyDiff(e.known_old, e.known_new)) {
      throw new Error(`${slot(e)}: the KNOWN edit changes more than the name — refusing`)
    }
    if (!nameOnlyDiff(e.target_old, e.target_new)) {
      throw new Error(`${slot(e)}: the TARGET edit changes more than the name — refusing`)
    }
    log.edits.push({
      slot: slot(e), id: row.id, scene: e.sc, sentence: e.sn, speaker: row.speaker, voice: e.voice, why: e.why,
      known: { old: e.known_old, new: e.known_new },
      target: { old: e.target_old, new: e.target_new },
      // Both clips on this row now say the OLD words, so both pointers are unlinked here
      // and re-rendered by the phase8 pod path, which only generates where the id is null.
      // Nothing is deleted: the ids below are the way back.
      unlinked_target_audio_id: row.target_audio_id || null,
      unlinked_known_audio_id: row.known_audio_id || null,
    })
    console.log(`\n  ${slot(e)}  ${row.speaker} · ${e.voice}`)
    console.log(`     EN  ${JSON.stringify(e.known_old)}\n      -> ${JSON.stringify(e.known_new)}`)
    console.log(`     HR  ${JSON.stringify(e.target_old)}\n      -> ${JSON.stringify(e.target_new)}`)
  }

  // ---- 2. prove the relabel --------------------------------------------------
  const { rows: relRows } = await db.query(
    `select id, scene_number sc, sentence_number sn from listening_pod_sentences
      where pod_id = $1 and speaker = $2 order by global_order`, [POD_ID, RELABEL.from])
  if (relRows.length !== RELABEL.expect_rows) {
    throw new Error(`relabel: expected ${RELABEL.expect_rows} rows on speaker '${RELABEL.from}', found ${relRows.length}`)
  }
  log.relabelled = relRows.map(r => ({ slot: slot({ sc: r.sc, sn: r.sn }), id: r.id, from: RELABEL.from, to: RELABEL.to }))
  console.log(`\n  relabel ${RELABEL.from} -> ${RELABEL.to}: ${relRows.length} rows (both keys are Voice A — no clip re-rendered)`)
  console.log(`     ${log.relabelled.map(r => r.slot).join(', ')}`)

  // ---- 3. write, all or nothing ----------------------------------------------
  if (APPLY) {
    await db.query('begin')
    try {
      for (const e of EDITS) {
        const review = {
          sarah_to_friend_pending_signoff: {
            ruling: 'Tom 2026-08-22 — the FRIEND is female and named; the protagonist stays male-voiced and unnamed',
            signatory: 'Aran',
            status: 'PROPOSED — not canon until Aran signs off this specific line',
            note: 'CANONICAL ENGLISH CHANGE — propagates to every language pair built from pod-0',
            why: e.why,
            known_text_before: e.known_old,
            target_text_before: e.target_old,
            changed_by: 'tools/pods/hrv-pod0-sarah-to-friend-2026-08-22.cjs',
          },
        }
        const r = await db.query(
          `update listening_pod_sentences
              set known_text = $1,
                  target_text = $2,
                  target_text_review = coalesce(target_text_review, '{}'::jsonb) || $3::jsonb,
                  target_audio_id = null,
                  known_audio_id = null,
                  updated_at = now()
            where pod_id = $4 and scene_number = $5 and sentence_number = $6
              and known_text = $7 and target_text = $8`,
          [e.known_new, e.target_new, JSON.stringify(review), POD_ID, e.sc, e.sn, e.known_old, e.target_old])
        if (r.rowCount !== 1) throw new Error(`${slot(e)}: expected 1 row updated, got ${r.rowCount} — rolled back`)
      }

      const rr = await db.query(
        `update listening_pod_sentences set speaker = $1, updated_at = now()
          where pod_id = $2 and speaker = $3`, [RELABEL.to, POD_ID, RELABEL.from])
      if (rr.rowCount !== RELABEL.expect_rows) {
        throw new Error(`relabel: expected ${RELABEL.expect_rows} rows updated, got ${rr.rowCount} — rolled back`)
      }

      // Nothing may be deleted, and the live pod may not move.
      const audioAfter = (await db.query('select count(*)::int n from course_audio')).rows[0].n
      if (audioAfter !== audioBefore) throw new Error(`REFUSING: course_audio moved ${audioBefore} -> ${audioAfter}`)
      const liveAfter = (await db.query(
        `select count(*)::int n, count(target_audio_id)::int t, count(known_audio_id)::int k
           from listening_pod_sentences where pod_id = $1`, [LIVE_POD])).rows[0]
      if (JSON.stringify(liveAfter) !== JSON.stringify(liveBefore)) {
        throw new Error(`REFUSING: the LIVE pod moved ${JSON.stringify(liveBefore)} -> ${JSON.stringify(liveAfter)}`)
      }
      log.course_audio_rows_after = audioAfter
      log.live_pod_after = { pod_id: LIVE_POD, ...liveAfter }

      await db.query('commit')
      console.log(`\n  ${EDITS.length} rows edited on both tracks, ${relRows.length} rows relabelled.`)
      console.log(`  ${EDITS.length * 2} clip pointers unlinked, nothing deleted (course_audio unchanged at ${audioAfter}).`)
      console.log("  All PROPOSED, pending Aran's sign-off.")
    } catch (err) { await db.query('rollback'); throw err }
  } else {
    console.log(`\n  DRY RUN — ${EDITS.length} edits and ${relRows.length} relabels proved against their before-state, nothing written.`)
  }

  const out = path.join(__dirname, '..', '..', 'docs', 'pods',
    `hrv-pod0-sarah-to-friend-2026-08-22-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify(log, null, 2))
  console.log(`  wrote ${out}\n`)
  await db.end()
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })

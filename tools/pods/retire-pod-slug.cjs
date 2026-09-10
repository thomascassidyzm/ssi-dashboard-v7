#!/usr/bin/env node
/**
 * retire-pod-slug.cjs — give a pod the name it actually has.
 *
 * WHY THIS EXISTS. Tom's ruling of 2026-09-10: "THERE IS NO POD-0 anymore by
 * name, so giving it that slug name is legacy naming debt, we will trip up over
 * it again at a later date with new agents." On 2026-09-10 it had already cost
 * real hours: two workers and Watson each read `cym_n_for_eng:pod-0`, found it
 * live and populated with 231 current lines, and reasoned confidently from a
 * name that no longer means anything — producing two contradictory wrong answers
 * to a voice artist who was sitting at a microphone waiting. A name that is
 * wrong but still resolves is worse than one that is missing, because nothing
 * ever fails loudly enough to be noticed.
 *
 * THIS IS A RE-SLUG, NOT A SWITCHOVER, and the distinction is the whole safety
 * case. `pod-switchover.cjs` moves learner progress between two DIFFERENT canons
 * and has to match content to do it. Here there is one canon: the same 231 rows,
 * the same slots, the same linked clips, under a new name. Every id maps 1:1 by
 * its own tail, so progress follows by rewriting one segment of a string — no
 * content matching, nothing to guess.
 *
 * It is NOT a general-purpose renamer. Across the estate `pod-0` and `pod-1` are
 * a content switchover 22 of 68 courses in: on 44 courses `pod-0` still holds
 * the OLD 142-line slate, and renaming those would drop the new slate's name
 * onto old material. This tool therefore refuses unless the pod it is pointed at
 * is genuinely a stale NAME on current data — see the gates in `check()`.
 *
 * WHAT MOVES, in one transaction:
 *   listening_pods          id, slug, and the digit in the title
 *   listening_pod_sentences id and pod_id (the slug segment only)
 *   learner_pod_state       sentence_id — progress is filed under a slot, and
 *                           the slot is unchanged, so the key must follow it or
 *                           the learner loses what they heard
 *   recording_provenance    quality_notes.pod_id / .sentence_id — the POINTERS
 *                           only. Who recorded it, when, the S3 key and the text
 *                           as read are historical facts and are not touched.
 *                           The pointer has to move because it is read live:
 *                           tools/recording/propagate-take-quality-wants.cjs
 *                           looks listening_pod_sentences up by exactly that id
 *                           to carry a bad-take verdict through to the
 *                           recordist's list.
 *
 * WHAT DOES NOT MOVE. `content_audit_log` is the audit record of past events;
 * rewriting it would falsify history, so it keeps the ids it recorded. Clips are
 * keyed (course_code, text_normalized, language, role, voice_id) and linked by
 * uuid, never by sentence id, so no take is touched at all — which is why the
 * counts can be proved unchanged rather than hoped unchanged.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. Before the transaction opens it
 * writes a full row-level snapshot of everything it is about to change to the
 * evidence store, and prints the undo — which is this same tool, run backwards.
 *
 *   node tools/pods/retire-pod-slug.cjs --course=cym_n_for_eng --from=pod-0 --to=pod-1
 *   node tools/pods/retire-pod-slug.cjs --course=cym_n_for_eng --from=pod-0 --to=pod-1 --apply
 *
 * THE UNDO is the same command with --from and --to swapped:
 *   node tools/pods/retire-pod-slug.cjs --course=cym_n_for_eng --from=pod-1 --to=pod-0 --apply --allow-backwards
 * (--allow-backwards waives the "the target name must be the higher number"
 * sanity gate, which exists so a rename cannot silently run the wrong way.)
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql'), quiet: true })
const fs = require('fs')
const { Client } = require('pg')
const { evidencePath } = require('../lib/evidence-path.cjs')

const APPLY = process.argv.includes('--apply')
const ALLOW_BACKWARDS = process.argv.includes('--allow-backwards')
const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}
const COURSE = arg('course')
const FROM = arg('from')
const TO = arg('to')
const fromId = `${COURSE}:${FROM}`
const toId = `${COURSE}:${TO}`

/**
 * Rewrite ONLY the slug segment of a `<course>:<slug>:<tail>` id. The tail may
 * itself contain colons (a split-audio progress key is `…:SC01-S001:s2`), so the
 * remainder is joined back rather than re-split. Returns null when the shape is
 * not recognisable, which is a refusal, never a guess.
 */
function reslugId(id, course, fromSlug, toSlug) {
  const parts = String(id).split(':')
  if (parts.length < 3) return null
  if (parts[0] !== course || parts[1] !== fromSlug) return null
  return [course, toSlug, ...parts.slice(2)].join(':')
}

/** The digit in a human title: "… Listening Pods — Pod 0" → "… — Pod 1". */
function retitle(title, fromSlug, toSlug) {
  const fromN = /(\d+)$/.exec(fromSlug)?.[1]
  const toN = /(\d+)$/.exec(toSlug)?.[1]
  if (!title || !fromN || !toN) return title
  return title.replace(new RegExp(`\\bPod([\\s-]?)${fromN}\\b`, 'gi'), (m, sep) => `${m.slice(0, 3)}${sep}${toN}`)
}

/**
 * Rewrite every POINTER to a pod, wherever it sits in a provenance note, and say
 * how many it moved.
 *
 * TWO THINGS THIS GETS RIGHT, both learned the hard way on 2026-09-10.
 *
 * DEEP, NOT TOP-LEVEL. The first pass of this tool rewrote only the note's own
 * `pod_id` and `sentence_id` fields and left 100 rows carrying a dead id at
 * `take_quality.evidence.pod_sentence_id` — a nested pointer that
 * tools/recording/propagate-take-quality-wants.cjs reads as its fallback. So walk
 * the object rather than guessing field names.
 *
 * COUNTED, NOT DIFFED. `hits` exists because re-stringifying a parsed note changes
 * its whitespace and escaping, so `before !== after` flags a row whose pointers are
 * untouched and writes it back reformatted for nothing. Only a row whose `hits` is
 * non-zero has anything to say.
 *
 * EXACT BOUNDARY, NEVER A PREFIX. `cym_n_for_eng:pod-0-unrecorded` is a DIFFERENT
 * pod with 61 provenance rows of its own. A value qualifies only when it IS the pod
 * id or continues with a colon.
 */
function rewritePointers(value, fromId, toId) {
  let hits = 0
  const walk = (o) => {
    if (typeof o === 'string') {
      if (o === fromId) { hits++; return toId }
      if (o.startsWith(`${fromId}:`)) { hits++; return toId + o.slice(fromId.length) }
      return o
    }
    if (Array.isArray(o)) return o.map(walk)
    if (o && typeof o === 'object') {
      const out = {}
      for (const k of Object.keys(o)) out[k] = walk(o[k])
      return out
    }
    return o
  }
  const rewritten = walk(value)
  return { rewritten, hits }
}

/**
 * THE SNAPSHOT FILENAME MUST BE UNIQUE PER RUN, and this is not a tidiness point.
 *
 * The first version keyed the file on (course, from, to, applied|dryrun) alone. On
 * 2026-09-10 the resume run — which legitimately found 0 pods and 0 sentences, the
 * pod having already moved — wrote to the SAME path and overwrote the pre-change
 * snapshot of all 231 sentence rows with an empty one. Nothing was lost from the
 * database, but the backup of the change was destroyed by the second half of the
 * same change. A backup a later step can clobber is not a backup.
 *
 * So the run's own instant goes in the name. Runs accumulate; that is the point.
 */
function snapshotName(course, fromSlug, toSlug, applied, at) {
  const stamp = at.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  return `docs/pods/retire-pod-slug-${course}-${fromSlug}-to-${toSlug}-${applied ? 'applied' : 'dryrun'}-${stamp}-snapshot.json`
}

const log = (...a) => console.log(...a)

async function main () {
  if (!COURSE || !FROM || !TO) throw new Error('--course=<code> --from=<slug> --to=<slug> are all required')
  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    // ---- gates: is this a stale NAME, or would it be a content switchover? ----
    const pod = (await db.query('select * from listening_pods where id=$1', [fromId])).rows[0]
    const clash = (await db.query('select id from listening_pods where id=$1', [toId])).rows[0]
    // RESUMABLE, because a re-slug is idempotent: every step asks "is this pointer
    // still on the old name?" and does nothing when it is not. If the pod itself has
    // already moved, the run continues for whatever pointers are still behind —
    // which is how the 39 nested `pod_sentence_id` rows above were swept up without
    // a one-off script. A re-slug that can only run once cannot be finished.
    const RESUME = !pod && !!clash
    if (!pod && !clash) throw new Error(`${fromId}: no such pod, and ${toId} does not exist either`)
    if (pod && clash) throw new Error(`${toId} already exists — a rename onto a live pod would be a switchover, not a re-slug; use tools/pods/pod-switchover.cjs`)
    if (pod && pod.slug !== FROM) throw new Error(`${fromId}: slug column says "${pod.slug}", not "${FROM}"`)
    if (RESUME) console.log(`RESUMING: ${fromId} is already gone and ${toId} exists — sweeping up pointers left behind.`)
    const fromN = Number(/(\d+)$/.exec(FROM)?.[1])
    const toN = Number(/(\d+)$/.exec(TO)?.[1])
    if (Number.isFinite(fromN) && Number.isFinite(toN) && toN < fromN && !ALLOW_BACKWARDS) {
      throw new Error(`${FROM} → ${TO} runs backwards; pass --allow-backwards if that is the undo you mean`)
    }

    const sentences = (await db.query(
      'select id, global_order from listening_pod_sentences where pod_id=$1 order by global_order', [fromId])).rows
    if (!sentences.length && !RESUME) throw new Error(`${fromId}: no sentence rows — nothing to rename`)
    const newIds = sentences.map(r => {
      const next = reslugId(r.id, COURSE, FROM, TO)
      if (!next) throw new Error(`row id "${r.id}" is not ${COURSE}:${FROM}:<tail>; refusing to guess a new id`)
      return { from: r.id, to: next }
    })
    const collisions = (await db.query(
      'select id from listening_pod_sentences where id = any($1)', [newIds.map(x => x.to)])).rows
    if (collisions.length) throw new Error(`${collisions.length} new sentence id(s) already exist, e.g. ${collisions[0].id}`)

    const state = (await db.query(
      `select learner_id, course_code, sentence_id, exposures from learner_pod_state
        where course_code=$1 and (sentence_id = $2 or sentence_id like $3) order by learner_id, sentence_id`,
      [COURSE, fromId, `${fromId}:%`])).rows
    const stateMoves = state.map(r => ({ ...r, to: reslugId(r.sentence_id, COURSE, FROM, TO) }))
    const unmapped = stateMoves.filter(r => !r.to)
    if (unmapped.length) throw new Error(`${unmapped.length} learner_pod_state row(s) whose sentence_id is not ${COURSE}:${FROM}:<tail>, e.g. ${unmapped[0].sentence_id}`)

    // EVERY POINTER, WHEREVER IT SITS IN THE JSON. The first pass of this tool
    // rewrote only the top-level `pod_id` and `sentence_id` fields and left 39 rows
    // carrying a dead id at `take_quality.evidence.pod_sentence_id` — a nested
    // pointer that `tools/recording/propagate-take-quality-wants.cjs` reads as its
    // fallback. So walk the parsed object instead of guessing field names, and
    // rewrite any STRING whose value IS the pod id or sits under it.
    //
    // EXACT-BOUNDARY MATCH, never a prefix. `cym_n_for_eng:pod-0-unrecorded` is a
    // DIFFERENT pod with 61 provenance rows of its own, and
    // `like '%cym_n_for_eng:pod-0%'` eats them — which is why the value must either
    // equal the pod id or continue with a colon.
    const prov = (await db.query(
      `select audio_uuid, quality_notes from recording_provenance where quality_notes like $1`,
      [`%${fromId}%`])).rows
    const provMoves = prov.map(r => {
      let parsed
      try { parsed = JSON.parse(r.quality_notes) } catch { parsed = null }
      // An unparseable note is not ours to reformat. Fall back to the two literal
      // field forms, which is exactly what it would have got before.
      if (parsed === null) {
        const to = r.quality_notes
          .split(`"pod_id":"${fromId}"`).join(`"pod_id":"${toId}"`)
          .split(`"sentence_id":"${fromId}:`).join(`"sentence_id":"${toId}:`)
        return to === r.quality_notes ? null : { audio_uuid: r.audio_uuid, from: r.quality_notes, to, pointers: null }
      }
      const { rewritten, hits } = rewritePointers(parsed, fromId, toId)
      return hits === 0 ? null : { audio_uuid: r.audio_uuid, from: r.quality_notes, to: JSON.stringify(rewritten), pointers: hits }
    }).filter(Boolean)

    log(`${fromId} → ${toId}`)
    log(`  listening_pods           ${pod ? 1 : 0} row  (id, slug, title)`)
    if (pod) {
      log(`    title: ${JSON.stringify(pod.title)}`)
      log(`        →  ${JSON.stringify(retitle(pod.title, FROM, TO))}`)
    }
    log(`  listening_pod_sentences  ${newIds.length} rows (id, pod_id)`)
    log(`  learner_pod_state        ${stateMoves.length} rows (sentence_id), ${new Set(stateMoves.map(r => r.learner_id)).size} learner id(s)`)
    log(`  recording_provenance     ${provMoves.length} rows, ${provMoves.reduce((n, m) => n + (m.pointers || 1), 0)} pointer(s) — quality_notes pointers only, ` +
        `${prov.length - provMoves.length} row(s) mentioning a longer slug left untouched`)
    log(`  content_audit_log        0 rows — audit history keeps the ids it recorded, deliberately`)
    log(`  undo: node tools/pods/retire-pod-slug.cjs --course=${COURSE} --from=${TO} --to=${FROM} --apply --allow-backwards`)

    const snapshot = {
      taken_at: new Date().toISOString(), course: COURSE, from: FROM, to: TO,
      undo: `node tools/pods/retire-pod-slug.cjs --course=${COURSE} --from=${TO} --to=${FROM} --apply --allow-backwards`,
      listening_pods: pod ? [pod] : [],
      listening_pod_sentences: await (async () => (await db.query(
        'select * from listening_pod_sentences where pod_id=$1 order by global_order', [fromId])).rows)(),
      learner_pod_state: state,
      recording_provenance: prov,
    }
    const snapPath = evidencePath(snapshotName(COURSE, FROM, TO, APPLY, new Date(snapshot.taken_at)))
    fs.writeFileSync(snapPath, JSON.stringify(snapshot, null, 1))
    log(`  snapshot: ${snapPath}`)

    if (!APPLY) { log('\nDRY RUN — pass --apply to write.'); return }

    await db.query('begin')
    try {
      // The pod row first: the sentences' pod_id FK points at it, so the new row
      // must exist before any sentence can be moved onto it. Insert-then-delete
      // rather than `update ... set id =`, so a carried column can never be missed
      // silently — every column is named here rather than listed by hand.
      if (pod) {
      const cols = (await db.query(
        `select column_name from information_schema.columns
          where table_schema='public' and table_name='listening_pods'
            and column_name not in ('id','slug','title') order by ordinal_position`)).rows.map(r => `"${r.column_name}"`)
      await db.query(
        `insert into listening_pods (id, slug, title, ${cols.join(', ')})
         select $1, $2, $3, ${cols.join(', ')} from listening_pods where id=$4`,
        [toId, TO, retitle(pod.title, FROM, TO), fromId])
      for (const m of newIds) {
        const r = await db.query('update listening_pod_sentences set pod_id=$1, id=$2 where id=$3', [toId, m.to, m.from])
        if (r.rowCount !== 1) throw new Error(`drift: ${m.from} matched ${r.rowCount} rows, expected 1`)
      }
      const left = Number((await db.query('select count(*) c from listening_pod_sentences where pod_id=$1', [fromId])).rows[0].c)
      if (left !== 0) throw new Error(`post-check failed: ${left} sentence(s) still on ${fromId}`)
      await db.query('delete from listening_pods where id=$1', [fromId])
      }

      for (const m of stateMoves) {
        const r = await db.query(
          `update learner_pod_state set sentence_id=$1 where learner_id=$2 and course_code=$3 and sentence_id=$4 and exposures=$5`,
          [m.to, m.learner_id, m.course_code, m.sentence_id, m.exposures])
        if (r.rowCount !== 1) throw new Error(`drift: learner_pod_state ${m.learner_id}/${m.sentence_id} matched ${r.rowCount} rows, expected 1`)
      }
      for (const m of provMoves) {
        const r = await db.query(
          'update recording_provenance set quality_notes=$1 where audio_uuid=$2 and quality_notes=$3',
          [m.to, m.audio_uuid, m.from])
        if (r.rowCount !== 1) throw new Error(`drift: recording_provenance ${m.audio_uuid} matched ${r.rowCount} rows, expected 1`)
      }

      // Post-conditions, inside the transaction: the same number of sentences on
      // the new slug, the same number of linked clips, nothing left behind.
      const after = (await db.query(
        `select count(*) n, count(target_audio_id) t, count(known_audio_id) k
           from listening_pod_sentences where pod_id=$1`, [toId])).rows[0]
      const before = (() => {
        const rows = snapshot.listening_pod_sentences
        return { n: rows.length, t: rows.filter(r => r.target_audio_id).length, k: rows.filter(r => r.known_audio_id).length }
      })()
      // On a resume there is nothing to compare against: the sentences moved on the
      // earlier run, so the snapshot of the OLD slug is legitimately empty. Assert
      // the pod is intact instead of asserting it against zero.
      if (RESUME) {
        if (Number(after.n) === 0) throw new Error(`post-check failed: ${toId} holds no sentences`)
      } else if (Number(after.n) !== before.n || Number(after.t) !== before.t || Number(after.k) !== before.k) {
        throw new Error(`post-check failed: ${JSON.stringify(after)} != ${JSON.stringify(before)}`)
      }
      await db.query('commit')
      log(`\nAPPLIED. ${after.n} sentences, ${after.t} target clips, ${after.k} known clips — all on ${toId}.`)
    } catch (e) {
      await db.query('rollback')
      throw e
    }
  } finally {
    await db.end()
  }
}

module.exports = { reslugId, retitle, rewritePointers, snapshotName }

// Required by its own test as well as run from the shell, so the work only starts
// when this file IS the command.
if (require.main === module) {
  main().catch(e => { console.error(`FAILED: ${e.message}`); process.exit(1) })
}

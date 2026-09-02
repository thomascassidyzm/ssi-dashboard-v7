#!/usr/bin/env node
/**
 * clone-pod.cjs — copy a course's pod row and every one of its sentence rows to a
 * second slug, so a destructive-looking rewrite can happen off the live pod.
 *
 * WHY THIS EXISTS. align-pod0-to-canonical.cjs rewrites a pod's English to Aran's
 * 2026-08-06 canonical, which on a typical course leaves ~128 slots with EMPTY
 * target text and no audio until translation and generation catch up. On a course
 * that is `draft` that is free. On a LIVE course it is hours of real learners
 * meeting a half-empty listening pod — the make-before-break rail
 * (docs/architecture/AUDIO_PIPELINE_ARCHITECTURE.md §6b) pointed at content
 * instead of clips.
 *
 * The Welsh precedent (2026-08-06) is the answer: learner-facing reads query the
 * EXACT pod id `<course>:pod-0` (player-vue `useListeningPods.ts`, `const podId =
 * `${course}:pod-0``), so a pod on any other slug is invisible to them. Clone
 * pod-0 to `pod-0-unrecorded`, align and translate THAT, and swap only when it is
 * complete and approved. `cym_n_for_eng` — a `released` course — has carried both
 * since 2026-08-06.
 *
 * NOTHING IS DELETED AND NOTHING IS MOVED. The source pod is not touched, not even
 * its title. Audio ids are COPIED, not reassigned: the clone points at the same
 * course_audio rows the live pod does, so lines that survive the align keep working
 * clips and are never regenerated. Two pods referencing one clip is already normal
 * (bookends are shared course-wide); no code path deletes a clip because a pointer
 * moved, and this tool has no delete path at all.
 *
 * DRY RUN BY DEFAULT. Pass --apply to write. It refuses outright if the destination
 * pod already holds sentence rows — re-cloning over a half-aligned pod would be the
 * one way this could destroy work.
 *
 * IT ALSO REFUSES A DESTINATION SLUG THE PLAYER SERVES (2026-09-02). `pod-1` and
 * `pod-0` are what the resolver reads; a clone landing on either is in front of
 * learners the moment its header row exists, and the align that follows this tool
 * would then empty a served pod underneath them. The refusal names how many learners
 * are at risk. `--serve-now` is the deliberate escape, and it waives ONLY that check —
 * a destination that already holds sentence rows is refused regardless. See
 * serviceRefusal() below and tools/pods/clone-pod-serving-destination.test.cjs.
 *
 *   node tools/pods/clone-pod.cjs --course=spa_for_eng --to=pod-0-unrecorded
 *   node tools/pods/clone-pod.cjs --course=spa_for_eng --to=pod-0-unrecorded --apply
 *   node tools/pods/clone-pod.cjs --course=spa_for_eng --to=pod-1 --serve-now --apply
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const { Client } = require('pg')
const { checkPodCast, loadClipsForRows } = require('./pod-cast-gate.cjs')
const { carrySplitAudio, SPLIT_AUDIO_FIELDS } = require('./split-audio-inheritance.cjs')

/**
 * The only slugs a learner path ever reads, in preference order. MIRRORED, not
 * imported: the authority is `SERVING_POD_SLUGS` in the learning app's
 * packages/player-vue/src/composables/servedPod.ts, which api/courses/[code]/bundle.ts
 * already duplicates as a literal for the same reason — the two repos share a database,
 * not a module graph. If that list ever widens, widen this one in the same change.
 */
// The rule — which slugs the player serves, and how to name the learners at risk —
// lives ONCE, in ./serving-slug.cjs, shared with the pod generator, its HTTP route and
// pod-sync. This file composes clone-pod's own wording around it and nothing more.
const { SERVING_POD_SLUGS, servingRefusal } = require('./serving-slug.cjs')

/**
 * Would writing to this destination put a clone in front of learners? PURE, so it is
 * testable — every DB read it needs is passed in. Returns the refusal text, or null.
 *
 * WHY THIS EXISTS. This tool's whole job is to make a copy that learners cannot see, so
 * that a destructive align can run off the live pod. It knew how to refuse a destination
 * that already held rows, and nothing else. It did not know which slugs are SERVED.
 *
 * The resolver serves by slug: `pod_type = 'core'` and `slug in ('pod-1','pod-0')`, first
 * match wins, no row count, no text, and — checked against the code on 2026-09-02 — no
 * reading of `visibility` in either consumer. So a `held` destination is no defence, and
 * neither is an absent one: creating the header row IS the moment the pod starts being
 * served. Clone onto a slug that happens to be serving and the align that follows empties
 * a served pod under live learners, with no promotion tool involved at all.
 *
 * THE REFUSAL NAMES THE LEARNERS. A generic guard gets waved through; "9 of this course's
 * 12 learners have progress on this pod" does not. If the count cannot be read the answer
 * is still a refusal that SAYS so — never a write permitted because the risk could not be
 * measured.
 */
function serviceRefusal ({
  dstPodId, toSlug, podType, destExists, destVisibility, destRows = 0,
  learnersOnCourse, learnersOnDestPod, serveNow = false,
}) {
  // Not waivable by --serve-now: this one is about destroying work, not about learners.
  if (destRows > 0) return `${dstPodId} already holds ${destRows} sentence row(s); refusing to clone over it`
  return servingRefusal({
    podId: dstPodId, slug: toSlug, podType, podExists: destExists, podVisibility: destVisibility,
    rows: destRows, learnersOnCourse, learnersOnPod: learnersOnDestPod, serveNow,
    action: 'Cloning here puts a working copy in front of them,',
    harm: 'and the align that follows this tool would empty it underneath them.',
    escape: '--serve-now',
    remedy: 'Clone to a parked slug instead (pod-0-unrecorded is the convention)',
  })
}

const arg = (n) => {
  const a = process.argv.find(x => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : null
}

/**
 * Argument parsing lives in a function, not at module scope, so this file can be
 * REQUIRED by a test without process.exit() firing on the way in. The destination
 * gate is the thing worth testing and it was unreachable while the whole tool ran
 * on import.
 */
function parseArgs () {
  const APPLY = process.argv.includes('--apply')
  const SERVE_NOW = process.argv.includes('--serve-now')
  const COURSE = arg('course')
  const FROM = arg('from') || 'pod-0'
  const TO = arg('to')
  const TITLE_SUFFIX = arg('title-suffix') || ' — UNRECORDED working copy, not learner-facing'
  // listening_pods.visibility DEFAULTS TO 'live', so an insert that omits the column
  // creates a learner-visible pod. This tool's whole purpose is a copy that is NOT
  // learner-facing, so it writes the column explicitly and defaults it to 'held'.
  // (Omitting it is how 40 non-serving pods came to be 'live' and needed the
  // 2026-08-23 sweep: docs/pods/hold-40-non-serving-pods-2026-08-23.md.)
  const VISIBILITY_FLAG = arg('visibility')
  if (!COURSE || !TO) {
    console.error('FAILED: --course=<code> and --to=<slug> are both required')
    process.exit(1)
  }
  if (VISIBILITY_FLAG && !['held', 'live', 'draft'].includes(VISIBILITY_FLAG)) {
    console.error(`FAILED: --visibility=${VISIBILITY_FLAG} is not one of held|live|draft`)
    process.exit(1)
  }
  if (TO === FROM) {
    console.error('FAILED: --to must differ from --from')
    process.exit(1)
  }
  return { APPLY, SERVE_NOW, COURSE, FROM, TO, TITLE_SUFFIX, VISIBILITY_FLAG }
}

async function main () {
  const { APPLY, SERVE_NOW, COURSE, FROM, TO, TITLE_SUFFIX, VISIBILITY_FLAG } = parseArgs()
  const srcPodId = `${COURSE}:${FROM}`
  const dstPodId = `${COURSE}:${TO}`

  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await db.connect()
  try {
    const src = (await db.query(`select * from listening_pods where id=$1`, [srcPodId])).rows[0]
    // The effective visibility of the clone. An explicit --visibility wins; otherwise
    // the source's own visibility is copied, so copying a held pod can never release it
    // and copying a live pod gives a live copy; with neither, 'held'.
    const VISIBILITY = VISIBILITY_FLAG || (src && src.visibility) || 'held'
    if (!src) throw new Error(`${srcPodId}: no such pod`)

    const dstExisting = (await db.query(`select id, visibility, pod_type from listening_pods where id=$1`, [dstPodId])).rows[0]
    const dstRows = Number((await db.query(
      `select count(*) n from listening_pod_sentences where pod_id=$1`, [dstPodId])).rows[0].n)

    // Who is at risk if this destination turns out to be served? Counted the way
    // pod-switchover.cjs scopes it — learner_pod_state by course_code — plus the
    // sharper number: those whose state points at a row of the destination pod
    // itself. Read inside a try so a failure yields "unavailable", which the gate
    // treats as a reason to refuse, never as a reason to allow.
    let learnersOnCourse = null
    let learnersOnDestPod = null
    try {
      const { rows: [l] } = await db.query(
        `select count(distinct learner_id) on_course,
                count(distinct learner_id) filter (where sentence_id like $2) on_pod
           from learner_pod_state where course_code = $1`, [COURSE, `${dstPodId}:%`])
      learnersOnCourse = Number(l.on_course)
      learnersOnDestPod = Number(l.on_pod)
    } catch (e) {
      console.error(`WARNING: learner_pod_state count failed (${e.message}) — the destination gate will treat the count as unavailable`)
    }

    // The destination gate. Refuses in DRY RUN as well as under --apply, so the dry
    // run tells the truth about what the real thing would do.
    const refusal = serviceRefusal({
      // An existing destination is judged on its OWN pod_type; a destination that does
      // not exist yet will be created carrying the source's, because that is what the
      // insert below copies.
      dstPodId, toSlug: TO, podType: dstExisting ? dstExisting.pod_type : src.pod_type,
      destExists: !!dstExisting, destVisibility: dstExisting && dstExisting.visibility,
      destRows, learnersOnCourse, learnersOnDestPod, serveNow: SERVE_NOW,
    })
    if (refusal) throw new Error(refusal)

    const sentences = (await db.query(
      `select * from listening_pod_sentences where pod_id=$1 order by global_order`, [srcPodId])).rows
    if (!sentences.length) throw new Error(`${srcPodId}: no sentence rows to clone`)

    // Row ids embed the pod slug (`<course>:<slug>:SC01-S001`). Rewrite only that
    // segment so scene/sentence numbering — which the align tool matches on — is
    // preserved exactly.
    const reId = (id) => (id.startsWith(`${srcPodId}:`) ? `${dstPodId}:${id.slice(srcPodId.length + 1)}` : null)
    const bad = sentences.filter(s => !reId(s.id))
    if (bad.length) throw new Error(`${bad.length} row id(s) do not start with "${srcPodId}:" (e.g. ${bad[0].id}); refusing to guess new ids`)

    // Copy every column except the ones that identify the row or stamp its age.
    const copyCols = Object.keys(sentences[0]).filter(c => !['id', 'pod_id', 'created_at', 'updated_at'].includes(c))

    // node-postgres hands jsonb back as a parsed JS object and then serialises a JS
    // object parameter as a Postgres composite literal, not JSON — so a jsonb column
    // must be re-stringified on the way in. Array columns (uuid[]/text[]) must NOT
    // be, which is why this is driven off the real column types, not typeof.
    const jsonCols = async (table) => new Set((await db.query(
      `select column_name from information_schema.columns
        where table_name=$1 and data_type in ('json','jsonb')`, [table])).rows.map(r => r.column_name))
    const sentenceJson = await jsonCols('listening_pod_sentences')
    const podJson = await jsonCols('listening_pods')
    const enc = (set, col, v) => (set.has(col) && v !== null && v !== undefined ? JSON.stringify(v) : v)

    const summary = {
      course: COURSE, from: srcPodId, to: dstPodId,
      destination_pod_row: dstExisting ? 'already exists, will be left as-is' : 'will be created',
      destination_visibility: dstExisting ? `${dstExisting.visibility} (existing row, NOT changed)` : VISIBILITY,
      sentences_to_insert: sentences.length,
      with_target_text: sentences.filter(s => String(s.target_text || '').trim()).length,
      with_target_audio: sentences.filter(s => s.target_audio_id).length,
      with_known_audio: sentences.filter(s => s.known_audio_id).length,
      columns_copied: copyCols.length,
      split_audio_slots_carried: sentences.reduce((n, s) => {
        const kept = carrySplitAudio(s, s)
        return n + SPLIT_AUDIO_FIELDS.filter(f => kept[f] != null).length
      }, 0),
      split_audio_slots_present_on_source: sentences.reduce((n, s) =>
        n + SPLIT_AUDIO_FIELDS.filter(f => s[f] != null).length, 0),
    }

    // `speakers` is copied verbatim, so the clone inherits the source's casting —
    // good or bad. REPORTED, NOT REFUSED: cloning a badly-cast pod in order to fix
    // it off the live slug is the whole point of this tool, so a hard gate here
    // would block the repair. The gate that matters is on the way OUT, in
    // pod-switchover.cjs, which will not promote a pod that fails this same check.
    const cast = checkPodCast({
      rows: sentences,
      speakers: src.speakers,
      clips: await loadClipsForRows(db, sentences),
    })
    summary.cast_inherited = cast.ok
      ? `cast-correct (${cast.voicesInUse.length} voices, 0 same-voice exchange pairs)`
      : `NOT cast-correct — ${cast.failures.join(' | ')}; recast the clone with ` +
        `tools/pods/pod1-percall-recast.cjs --pod=${dstPodId} before it can be promoted`

    if (!APPLY) {
      console.log(JSON.stringify({ mode: 'DRY RUN', summary }, null, 2))
      return
    }

    await db.query('BEGIN')
    try {
      if (!dstExisting) {
        await db.query(
          // `visibility` is COPIED from the source unless --visibility says otherwise
          // (Tom, 2026-08-23, both halves): the DB default is 'live', so an insert that
          // omits the column would make a clone of a HELD pod live — an automatic-live
          // path. A clone of a live pod stays live, which is what a clone means; an
          // explicit --visibility still wins, and with neither the answer is 'held'.
          `insert into listening_pods (id, course_code, pod_type, slug, pod_order, title, scene, difficulty, speakers, source_file, metadata, visibility)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [dstPodId, src.course_code, src.pod_type, TO, src.pod_order,
            `${src.title}${TITLE_SUFFIX}`, src.scene, src.difficulty,
            enc(podJson, 'speakers', src.speakers), src.source_file, enc(podJson, 'metadata', src.metadata),
            VISIBILITY])
      }
      const cols = ['id', 'pod_id', ...copyCols]
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(',')
      for (const s of sentences) {
        // Split audio follows the TEXT, never the slot
        // (tools/pods/split-audio-inheritance.cjs). This clone copies both texts
        // verbatim, so every slot is carried and this is a no-op today — which is
        // the point of running it rather than assuming it. The moment anyone
        // makes this tool transform text on the way through, the split arrays
        // drop to NULL instead of following the slot into a new conversation, and
        // the player falls back to the whole-turn clip. That transform, done
        // downstream by align-pod0-to-canonical.cjs on a clone exactly like this
        // one, is what produced the ita pod-1 scene-15 defect.
        const row = { ...s, ...carrySplitAudio(s, s) }
        const vals = [reId(s.id), dstPodId, ...copyCols.map(c => enc(sentenceJson, c, row[c]))]
        const r = await db.query(
          `insert into listening_pod_sentences (${cols.map(c => `"${c}"`).join(',')}) values (${placeholders})`, vals)
        if (r.rowCount !== 1) throw new Error(`insert of ${reId(s.id)} affected ${r.rowCount} rows`)
      }
      await db.query('COMMIT')
    } catch (e) {
      await db.query('ROLLBACK')
      throw e
    }
    const after = Number((await db.query(
      `select count(*) n from listening_pod_sentences where pod_id=$1`, [dstPodId])).rows[0].n)
    if (after !== sentences.length) throw new Error(`post-check: ${dstPodId} holds ${after} rows, expected ${sentences.length}`)
    // Read the visibility back rather than trusting the insert: a clone that is
    // reachable by a learner is the one way this tool can do harm.
    const vis = (await db.query(`select visibility from listening_pods where id=$1`, [dstPodId])).rows[0].visibility
    if (!dstExisting && vis !== VISIBILITY) throw new Error(`post-check: ${dstPodId} is '${vis}', expected '${VISIBILITY}'`)
    console.log(JSON.stringify({ mode: 'APPLIED', summary, verified_rows: after, verified_visibility: vis }, null, 2))
  } finally {
    await db.end()
  }
}

module.exports = { serviceRefusal }

if (require.main === module) {
  main().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
}

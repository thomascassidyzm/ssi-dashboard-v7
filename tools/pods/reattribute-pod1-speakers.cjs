#!/usr/bin/env node
/**
 * reattribute-pod1-speakers.cjs — 2026-08-24
 *
 * THE DEFECT. On 2026-08-06 an agent building the canonical pod script read
 * Aran's note about how many VOICES to render as a ruling about WHO IS
 * SPEAKING, and wrote the literal string `Learner` onto all 73 drill lines of
 * scenes 15-21 — including 11 lines that only a shop, a hotel or a waiter could
 * say. It recorded the reversal in its own commit message (`9cc3fbc33`):
 * "11 lines in scenes 16/17/21 that I had inferred as an alternating 'Friend'
 * are now 'Learner'." Two days later `docs/pods/pod0-speaker-inference-audit-
 * 2026-08-08.md` found the same 11 lines independently and proposed the fix,
 * line by line. It was never applied. The wrong attribution is live in 22
 * languages.
 *
 * THE REPAIR. Set `speaker` on exactly those 11 rows: 4 to `Staff`, 7 to
 * `Interlocutor`, per the audit's own per-line proposal. Nothing else is
 * touched — no text, no audio, no cast map, no clip. Line 172 ("It's not
 * bad.") is deliberately NOT in the set: the audit calls it undecidable and
 * leaves it `Learner` under protest.
 *
 * MATCH BY TEXT, NEVER BY NUMBER. Scene numbers mean different things in
 * different documents (the audit says 16/17/21; other repo docs number the
 * friend conversation differently), and the pod was renumbered pod-0 → pod-1 on
 * 2026-08-23. The known-side text is the only stable identity. If a course does
 * not yield exactly 11 matches, that course is REFUSED and the others carry on;
 * the tool never fuzzy-matches its way to eleven.
 *
 * BEFORE-STATE ASSERTIONS. Every row must currently read `speaker === 'Learner'`
 * and carry the exact expected known text. Any drift aborts the whole course
 * rather than writing through it.
 *
 * PROGRESS SAFETY — verified, not assumed. `learner_pod_state` is keyed by
 * `sentence_id`, which is the row id (`<pod>:SC17-S002`) or `<row.id>:s<k>` for
 * a split unit. `speaker` is not part of that key, and pod-migration-protocol.md
 * matches survivors on the KNOWN TEXT, which this tool does not change. So no
 * slot moves, no text changes, and nothing needs migrating. Measured on a
 * rolled-back transaction against ita_for_eng:pod-1:SC16-S009: the only columns
 * that changed were `speaker` and the trigger-maintained `updated_at`; all seven
 * audio columns (target_audio_id, known_audio_id, sentence_audio_ids,
 * sentence_known_audio_ids, takeg_audio_ids, explainer_audio_id, note_audio_id)
 * were byte-identical after the write. There is no audio-nulling trigger on
 * listening_pod_sentences — the three triggers are audit_content_change (which
 * snapshots the old row, so this is reversible from content_audit_log),
 * touch_course_content_stamp and touch_listening_pods_updated_at.
 *
 * WHAT THIS BREAKS, DELIBERATELY AND VISIBLY. `Staff` and `Interlocutor` are in
 * no course's `listening_pods.speakers` map, so `checkPodCast` will report them
 * as uncast and the pod's gate verdict flips PASS → FAIL on 20 of 22 courses
 * (spa/spa_mx already fail on same-voice pairs). That blocks
 * `tools/pods/unlink-off-cast-pod-clips.cjs`, which is step 1 of
 * `pod1-render-sweep.cjs`. Casting those two names is a CASTING decision and
 * casting is Tom's — this tool does not, and must not, invent a voice. The
 * refusal is the correct behaviour: the pod now says two characters are
 * speaking and only one of them has a voice, which is true.
 *
 * NO TTS. This tool writes one text column. It renders nothing, deletes
 * nothing, relinks nothing, and queues no audio pass.
 *
 * Usage:
 *   node tools/pods/reattribute-pod1-speakers.cjs                    # DRY RUN, all live pod-1 courses
 *   node tools/pods/reattribute-pod1-speakers.cjs --course=ita_for_eng
 *   node tools/pods/reattribute-pod1-speakers.cjs --course=ita_for_eng --apply
 *   node tools/pods/reattribute-pod1-speakers.cjs --apply            # fleet
 *   node tools/pods/reattribute-pod1-speakers.cjs --verify           # read back, write nothing
 */

'use strict'

const fs = require('fs')
const path = require('path')

const REPO = path.resolve(__dirname, '../..')

/**
 * The work order, transcribed from docs/pods/pod0-speaker-inference-audit-2026-08-08.md
 * §"Every INFERRED-UNCERTAIN line". `audit_ref` is the audit's own global number,
 * carried for traceability ONLY — matching is on `known_text`.
 *
 * Watson's one-line commission compressed all 11 as "Learner -> Staff". That
 * compression is not the work order; the audit's per-line proposal is, and it
 * splits 4 / 7.
 */
const WORK_ORDER = [
  { audit_ref: 160, known_text: 'No, we only take cash.', to: 'Staff' },
  { audit_ref: 164, known_text: 'Do you want to pay by cash or card or put it on the room?', to: 'Staff' },
  { audit_ref: 166, known_text: 'Would you like to pay by cash or card or on the room?', to: 'Staff' },
  { audit_ref: 167, known_text: 'Did you want to pay by cash or card?', to: 'Staff' },
  { audit_ref: 171, known_text: "No, it's a little cold today.", to: 'Interlocutor' },
  { audit_ref: 211, known_text: "It's down there on the left.", to: 'Interlocutor' },
  { audit_ref: 212, known_text: "It's down there on the right.", to: 'Interlocutor' },
  { audit_ref: 214, known_text: "Yes, I said it's over there.", to: 'Interlocutor' },
  { audit_ref: 217, known_text: 'Would you like to order some drinks?', to: 'Interlocutor' },
  { audit_ref: 218, known_text: 'Do you want to order some drinks first?', to: 'Interlocutor' },
  { audit_ref: 219, known_text: 'Did you want something to drink first?', to: 'Interlocutor' },
]

const FROM = 'Learner'

/**
 * Exactly pod-migration-protocol.md's "the same sentence": fold the ellipsis
 * character, curly quotes and en/em dashes, collapse whitespace, case-fold.
 * NO punctuation stripping — "Five. Ten." and "5. 10." must not match, and the
 * same reasoning applies here: two drill lines that differ only in punctuation
 * are different lines.
 */
function normText (s) {
  return String(s == null ? '' : s)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Plan the change for one pod, from its rows. Pure — no database, no clock —
 * so the unit test drives the same code the fleet run does.
 *
 * @param {object} o
 * @param {string} o.podId
 * @param {Array<{id:string,scene_number:number,sentence_number:number,global_order:number,speaker:string,known_text:string}>} o.rows
 * @returns {{ok:boolean, podId:string, updates:Array, refusals:string[], matched:number,
 *            learnerInScenes15to21:number}}
 */
function planReattribution ({ podId, rows }) {
  const all = rows || []
  const refusals = []
  const alreadyDone = []
  const updates = []

  // One index per work-order line. A line matching more than one row is a
  // refusal, not a pick — choosing between two identical rows would be a guess.
  for (const item of WORK_ORDER) {
    const want = normText(item.known_text)
    const hits = all.filter(r => normText(r.known_text) === want)
    if (hits.length === 0) {
      refusals.push(`audit #${item.audit_ref}: no row matches known_text ${JSON.stringify(item.known_text)}`)
      continue
    }
    if (hits.length > 1) {
      refusals.push(`audit #${item.audit_ref}: ${hits.length} rows match known_text ` +
        `${JSON.stringify(item.known_text)} (${hits.map(h => h.id).join(', ')}) — refusing to guess which`)
      continue
    }
    const row = hits[0]
    if (row.speaker === item.to) {
      // Already reattributed. Distinguished from drift because a fleet re-run
      // must be a harmless no-op, not an alarm — and, when the whole course is
      // in this state, the CLI must not overwrite the applied log with a
      // refusal record. (Learned the hard way at 12:27Z on 2026-08-24: the
      // fleet apply ran after the Italian pilot and clobbered ita's log.)
      alreadyDone.push(`audit #${item.audit_ref}: ${row.id} already reads ${JSON.stringify(item.to)}`)
      continue
    }
    if (row.speaker !== FROM) {
      refusals.push(`audit #${item.audit_ref}: ${row.id} reads speaker ${JSON.stringify(row.speaker)}, ` +
        `expected ${JSON.stringify(FROM)} — BEFORE state has drifted, refusing to write through it`)
      continue
    }
    updates.push({
      audit_ref: item.audit_ref,
      id: row.id,
      scene_number: row.scene_number,
      sentence_number: row.sentence_number,
      global_order: row.global_order,
      known_text: row.known_text,
      speaker_before: row.speaker,
      speaker_after: item.to,
    })
  }

  // All-or-nothing per course. A partial application would leave a pod half
  // attributed, which is harder to reason about than either end state.
  const ok = refusals.length === 0 && updates.length === WORK_ORDER.length
  const noop = refusals.length === 0 && updates.length === 0 &&
    alreadyDone.length === WORK_ORDER.length

  return {
    ok,
    noop,
    podId,
    updates,
    refusals,
    alreadyDone,
    matched: updates.length,
    expected: WORK_ORDER.length,
    learnerInScenes15to21: all.filter(r =>
      r.scene_number >= 15 && r.scene_number <= 21 && r.speaker === FROM).length,
  }
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

/* c8 ignore start — the CLI half is exercised against the live database, not in unit tests */

function loadDatabaseUrl () {
  const envText = fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
  const url = (envText.match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/) || [])[1]
  if (!url) throw new Error('no DATABASE_URL in .env.psql')
  return url
}

const SELECT_COLS =
  'id, scene_number, sentence_number, global_order, speaker, known_text, target_text'

async function main () {
  const { Client } = require('pg')
  const args = process.argv.slice(2)
  const APPLY = args.includes('--apply')
  const VERIFY = args.includes('--verify')
  const only = (args.find(a => a.startsWith('--course=')) || '').split('=')[1] || null
  const logDir = path.join(REPO, 'docs/pods')

  const db = new Client({ connectionString: loadDatabaseUrl(), ssl: { rejectUnauthorized: false } })
  await db.connect()

  const pods = (await db.query(
    `select id, course_code from listening_pods
      where slug = 'pod-1' and visibility = 'live'
        ${only ? 'and course_code = $1' : ''}
      order by course_code`, only ? [only] : [])).rows

  if (!pods.length) throw new Error(only ? `no live pod-1 for ${only}` : 'no live pod-1 pods')

  console.log(`${VERIFY ? 'VERIFY' : APPLY ? 'APPLY' : 'DRY RUN'} — ${pods.length} course(s)\n`)

  const summary = []
  for (const pod of pods) {
    const rows = (await db.query(
      `select ${SELECT_COLS} from listening_pod_sentences where pod_id = $1 order by global_order`,
      [pod.id])).rows

    if (VERIFY) {
      const want = new Map(WORK_ORDER.map(w => [normText(w.known_text), w]))
      const seen = rows.filter(r => want.has(normText(r.known_text)))
      const wrong = seen.filter(r => r.speaker !== want.get(normText(r.known_text)).to)
      const learner = rows.filter(r =>
        r.scene_number >= 15 && r.scene_number <= 21 && r.speaker === FROM).length
      const staff = seen.filter(r => r.speaker === 'Staff').length
      const interloc = seen.filter(r => r.speaker === 'Interlocutor').length
      summary.push({
        course: pod.course_code, rows: seen.length, staff, interlocutor: interloc,
        learner_15_21: learner, ok: seen.length === WORK_ORDER.length && wrong.length === 0,
      })
      console.log(`${pod.course_code.padEnd(16)} matched=${seen.length}/11 Staff=${staff} ` +
        `Interlocutor=${interloc} Learner(15-21)=${learner} ${wrong.length ? 'MISMATCH: ' + wrong.map(w => w.id).join(',') : 'OK'}`)
      continue
    }

    const plan = planReattribution({ podId: pod.id, rows })
    const logPath = path.join(logDir,
      `${pod.course_code}-pod1-speaker-reattribution-2026-08-24-${APPLY ? 'applied' : 'dryrun'}-log.json`)

    if (plan.noop) {
      // Nothing to do and nothing to record: leave the existing log alone.
      console.log(`${pod.course_code.padEnd(16)} already reattributed — no change, log left untouched`)
      summary.push({ course: pod.course_code, ok: true, updated: 0, noop: true })
      continue
    }

    if (!plan.ok) {
      console.log(`${pod.course_code.padEnd(16)} REFUSED — ${plan.matched}/${plan.expected} matched`)
      for (const r of plan.refusals) console.log(`    ${r}`)
      fs.writeFileSync(logPath, JSON.stringify({ ...plan, applied: false }, null, 2) + '\n')
      summary.push({ course: pod.course_code, ok: false, matched: plan.matched, refusals: plan.refusals })
      continue
    }

    if (APPLY) {
      await db.query('begin')
      try {
        for (const u of plan.updates) {
          // The BEFORE state is asserted IN the write, not merely before it, so a
          // concurrent edit between the read and the write cannot be written through.
          const res = await db.query(
            `update listening_pod_sentences set speaker = $1
              where id = $2 and speaker = $3 and known_text = $4`,
            [u.speaker_after, u.id, u.speaker_before, u.known_text])
          if (res.rowCount !== 1) {
            throw new Error(`${u.id}: expected to update exactly 1 row, updated ${res.rowCount} — ` +
              'the row drifted between plan and write; whole course rolled back')
          }
        }
        await db.query('commit')
      } catch (e) {
        await db.query('rollback')
        console.log(`${pod.course_code.padEnd(16)} ABORTED — ${e.message}`)
        summary.push({ course: pod.course_code, ok: false, error: e.message })
        continue
      }
    }

    fs.writeFileSync(logPath, JSON.stringify({ ...plan, applied: APPLY }, null, 2) + '\n')
    const staff = plan.updates.filter(u => u.speaker_after === 'Staff').length
    console.log(`${pod.course_code.padEnd(16)} ${APPLY ? 'APPLIED' : 'planned'} ` +
      `${plan.updates.length} rows (${staff} Staff, ${plan.updates.length - staff} Interlocutor) ` +
      `· Learner in scenes 15-21 was ${plan.learnerInScenes15to21} → ${plan.learnerInScenes15to21 - plan.updates.length}`)
    summary.push({ course: pod.course_code, ok: true, updated: plan.updates.length })
  }

  await db.end()
  const bad = summary.filter(s => s.ok === false)
  console.log(`\n${summary.length - bad.length}/${summary.length} course(s) clean`)
  if (bad.length) process.exitCode = 1
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1) })
}

/* c8 ignore stop */

module.exports = { planReattribution, normText, WORK_ORDER, FROM }

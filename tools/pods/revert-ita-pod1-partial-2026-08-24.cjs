#!/usr/bin/env node
/**
 * revert-ita-pod1-partial-2026-08-24.cjs — Tom's Option C: partial rollback of the
 * 2026-08-24 Italian two-voice re-render (job b8ea5db0 / #360, commit 93ee62956).
 *
 * WHAT THE RE-RENDER DID. `rerender-off-role-pod-turns.cjs --apply` moved 11 turns of
 * `ita_for_eng:pod-1` (22 clips, both tracks) off the learner voice (`ara` / `bedd6226`)
 * and onto the second voice (`x7avnu1k` Enzo / `gfzdpspr5fdp` Tom), because the two-voice
 * recast had reattributed Staff and Interlocutor to that second voice.
 *
 * WHY ONLY FOUR SURVIVE. The eyes-open read of Extra phrases 15-21 (commit eb6710922,
 * defect D1) found these scenes are VARIANT DRILLS, not dialogue: several consecutive rows
 * are competing rephrasings of the same beat. Voicing those replies as a second character
 * makes the pod contradict itself — scene 21 has voice B answering one question with "down
 * there on the left" and then "down there on the right", and then, asked to repeat, "Yes, I
 * said it's over there", matching neither. Only four of the eleven are a real answer with no
 * competing variant, so only those four keep the second voice:
 *
 *     KEEP  16.9  SC16-S009  Staff         "No, we only take cash."
 *     KEEP  17.2  SC17-S002  Staff         "Do you want to pay by cash or card...?"
 *     KEEP  17.9  SC17-S009  Interlocutor  "No, it's a little cold today."
 *     KEEP  21.8  SC21-S008  Interlocutor  "Yes, I said it's over there."
 *
 * The other seven (17.4, 17.5, 21.5, 21.6, 21.11, 21.12, 21.13) go back to the single
 * learner voice they had before the re-render.
 *
 * THE ROLLBACK IS FREE, AND THAT IS CHECKED RATHER THAN ASSUMED. The re-render was
 * make-before-break and deleted nothing (its §4 step 4: "the superseded clips are the
 * rollback"), so reverting is a PURE LINK UPDATE — two uuid columns on seven rows. No TTS,
 * no S3 write, no spend. Before writing, this tool proves the premise per row:
 *   - the superseded clip still exists in course_audio, with a non-null s3_key;
 *   - it still carries the ORIGINAL voice (a revert onto the new voice would be a no-op
 *     dressed as a fix);
 *   - its S3 object still SERVES, with non-zero content-length. Pointing a live pod at a
 *     dead key would be worse than leaving it alone — the lesson of the fra Azure purge.
 *
 * SCOPE DISCIPLINE. The four keeper rows are never named in an UPDATE. Scenes 18 and 19 were
 * never touched by the re-render and are not touched here. `sentence_audio_ids` /
 * `sentence_known_audio_ids` (the 69 pre-existing split-drift clips) are NOT written — a
 * split segment has to be re-cut, not repointed, and that drift predates all of this.
 * Nothing is deleted: the 14 second-voice clips stay in course_audio and S3, so this is
 * itself reversible by running the same swap in the other direction.
 *
 * MIGRATION PROTOCOL does not apply, for the same reason it did not apply to the re-render:
 * `learner_pod_state` keys on sentence_id (`ita_for_eng:pod-1:SC17-S004`), which carries no
 * audio id. No text, position, slot or split array changes. Same words, different voice.
 *
 * DRY RUN BY DEFAULT. --apply writes, in one transaction, each UPDATE carrying the expected
 * current clip id in its WHERE predicate so any drift rolls the whole thing back.
 *
 *   node tools/pods/revert-ita-pod1-partial-2026-08-24.cjs
 *   node tools/pods/revert-ita-pod1-partial-2026-08-24.cjs --apply
 */
'use strict'

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const REPO = path.resolve(__dirname, '../..')
require('dotenv').config({ path: path.join(REPO, '.env') })
require('dotenv').config({ path: path.join(REPO, '.env.psql'), override: true })
const { Client } = require('pg')

const APPLY = process.argv.includes('--apply')
const POD = 'ita_for_eng:pod-1'
const BUCKET = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET || 'ssi-audio-stage'
const REGION = process.env.AWS_REGION || 'eu-west-1'

// The re-render's own applied log is the authority for every old<->new pair. Never composed
// here: if a pair is not in that log, this tool has no business touching the row.
const APPLIED_LOG = path.join(REPO,
  'docs/pods/ita_for_eng-pod-1-off-role-rerender-2026-08-24-applied-log.json')

// Tom's ruling, 2026-08-24. Exported for the test: getting this set wrong is the only way
// this tool can do damage, so it is asserted rather than trusted.
const KEEP_ON_SECOND_VOICE = ['SC16-S009', 'SC17-S002', 'SC17-S009', 'SC21-S008']

/** Pure: split the re-render scope into what reverts and what stays. */
function planRevert(scope, keep = KEEP_ON_SECOND_VOICE) {
  const keepSet = new Set(keep)
  const key = (s) => String(s.row_id).split(':').pop()
  const revert = scope.filter((s) => s.swapped && !keepSet.has(key(s)))
  const kept = scope.filter((s) => keepSet.has(key(s)))
  return { revert, kept }
}

function servedBytes(s3Key) {
  const out = execFileSync('curl', ['-fsSI', '--max-time', '30',
    `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`], { encoding: 'utf8' })
  const len = /content-length:\s*(\d+)/i.exec(out)
  if (!len || Number(len[1]) === 0) throw new Error('served object is zero bytes')
  return Number(len[1])
}

const bareVoice = (v) => String(v || '').replace(/^xai_/, '')

async function main() {
  const log = JSON.parse(fs.readFileSync(APPLIED_LOG, 'utf8'))
  if (log.pod !== POD) throw new Error(`applied log is for ${log.pod}, not ${POD}`)

  const { revert, kept } = planRevert(log.scope)
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} — ${POD}`)
  console.log(`  keep on second voice: ${kept.length} slots (${KEEP_ON_SECOND_VOICE.join(', ')})`)
  console.log(`  revert to learner voice: ${revert.length} slots\n`)

  const db = new Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()
  const records = []
  let blocked = 0

  for (const s of revert) {
    const r = {
      row_id: s.row_id, scene: s.scene, sentence: s.sentence, speaker: s.speaker,
      track: s.track, link: s.link, text: s.text,
      from_clip_id: s.new_clip_id, from_voice: s.want_voice,
      to_clip_id: s.old_clip_id, to_voice: s.old_voice,
      blocking_failures: [], reverted: false,
    }

    // 1. Before-state: the row must currently hold the clip the re-render put there.
    const cur = await db.query(
      `select ${s.link} as clip from listening_pod_sentences where id = $1 and pod_id = $2`,
      [s.row_id, POD])
    if (!cur.rows.length) r.blocking_failures.push('row not found')
    else if (cur.rows[0].clip !== s.new_clip_id) {
      r.blocking_failures.push(`drift: ${s.link} is ${cur.rows[0].clip}, expected ${s.new_clip_id}`)
    }

    // 2. The superseded clip must still be alive, on the original voice, and serving.
    const old = await db.query(
      'select id, voice_id, s3_key, duration_ms from course_audio where id = $1', [s.old_clip_id])
    if (!old.rows.length) r.blocking_failures.push('superseded clip is gone from course_audio')
    else {
      const c = old.rows[0]
      r.to_voice_actual = c.voice_id
      r.duration_ms = c.duration_ms
      if (!c.s3_key) r.blocking_failures.push('superseded clip has no s3_key')
      else if (bareVoice(c.voice_id) !== bareVoice(s.old_voice)) {
        r.blocking_failures.push(`superseded clip voice ${c.voice_id} is not ${s.old_voice}`)
      } else {
        try { r.served_bytes = servedBytes(c.s3_key) }
        catch (e) { r.blocking_failures.push(`unreachable at ${c.s3_key}: ${String(e.message).split('\n')[0]}`) }
      }
    }

    if (r.blocking_failures.length) blocked++
    records.push(r)
    console.log(`  ${r.blocking_failures.length ? 'BLOCKED' : 'ready  '} ${s.scene}.${s.sentence} ${s.track.padEnd(6)} `
      + `${s.new_clip_id.slice(0, 8)} -> ${s.old_clip_id.slice(0, 8)} (${s.want_voice} -> ${s.old_voice})`
      + (r.blocking_failures.length ? `  ${r.blocking_failures.join('; ')}` : ` ${r.served_bytes}B`))
  }

  // ALL-OR-NOTHING. A partial revert of a partial rollback is exactly the ambiguous
  // half-state Tom asked to be stopped at rather than guessed through.
  let committed = 0
  if (blocked) {
    console.log(`\nSTOP: ${blocked} slot(s) blocked. Nothing written.`)
  } else if (!APPLY) {
    console.log(`\n${records.length} slot(s) ready. Nothing written. Re-run with --apply.`)
  } else {
    try {
      await db.query('begin')
      for (const r of records) {
        const res = await db.query(
          `update listening_pod_sentences set ${r.link} = $1, updated_at = now()
             where id = $2 and pod_id = $3 and ${r.link} = $4`,
          [r.to_clip_id, r.row_id, POD, r.from_clip_id])
        if (res.rowCount !== 1) throw new Error(`${r.row_id}/${r.track}: ${res.rowCount} rows matched, expected 1`)
        r.reverted = true
        committed++
      }
      await db.query('commit')
      console.log(`\ncommitted: ${committed} link(s) moved back. 0 clips deleted, 0 rendered, £0.`)
    } catch (e) {
      await db.query('rollback')
      records.forEach((r) => { r.reverted = false })
      console.error(`\nROLLED BACK: ${e.message}`)
      process.exitCode = 1
    }
  }

  const out = path.join(REPO, `docs/pods/ita_for_eng-pod-1-partial-revert-2026-08-24-${APPLY ? 'applied' : 'dryrun'}-log.json`)
  fs.writeFileSync(out, JSON.stringify({
    pod: POD, at: new Date().toISOString(), apply: APPLY,
    ruling: 'Option C partial rollback — keep 16.9, 17.2, 17.9, 21.8 on the second voice; revert the other seven',
    authority: path.relative(REPO, APPLIED_LOG),
    keep_row_ids: KEEP_ON_SECOND_VOICE,
    summary: { revert_slots: revert.length, keep_slots: kept.length, blocked, committed, rendered: 0, deleted: 0 },
    revert: records,
    kept: kept.map((s) => ({ row_id: s.row_id, scene: s.scene, sentence: s.sentence, track: s.track, clip_id: s.new_clip_id, voice: s.want_voice, text: s.text })),
  }, null, 2) + '\n')
  console.log(`log: ${path.relative(REPO, out)}`)

  await db.end()
}

module.exports = { planRevert, KEEP_ON_SECOND_VOICE }

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1) })

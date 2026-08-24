#!/usr/bin/env node
/**
 * ara-bartender-relink-2026-08-14.cjs — A-108 item 1, Tom's ruling of 2026-08-14.
 *
 * WHY A RELINK AND NOT A RENDER.
 * A-108 resolved `ara_for_eng:pod-0:SC08-S001` (Bartender) from the annotated
 * `مساء الخير. عايز/عايزة إيه؟` to the single feminine `مساء الخير. عايزة إيه؟`
 * — second-person slash, addressee is Customer 1, cast Ara (f). See
 * docs/a108/released-text-resolution.md §B.
 *
 * That resolved string ALREADY EXISTS as a clip on this course: d3af89ab, the
 * Barista (3 pm) line at SC03-S001, same language, same role (target1), same
 * voice (Khalid, 70013edeb8e8). `unique_course_audio_per_voice` is
 * (course_code, text_normalized, language, role, voice_id) — it cannot hold two.
 * So a re-render of SC08-S001 does not merely cost money, it cannot insert at
 * all. Dedup by that key is the intended state of this table; one clip serving
 * both rows is what the index is FOR.
 *
 * MAKE-BEFORE-BREAK (AUDIO_PIPELINE_ARCHITECTURE.md §6b). The replacement is not
 * generated here, it already exists — so the doctrine's first two steps are a
 * verification, run before the swap and asserted again at write time:
 *   1. the target clip is alive on S3 and non-trivial in length;
 *   2. it is the same voice and role as the row's current clip;
 *   3. it speaks the resolved words — whisper decode (ggml-small, ar), 2026-08-14:
 *      d3af89ab -> "مساء الخير عيزة ايه"      (one feminine form)
 *      a2679471 -> "مساء الخير عايز عايزة ايه" (BOTH forms read aloud — the defect)
 * Step 4, deletion, is DELIBERATELY NOT DONE. The old clip is left in place and
 * unreferenced; deleting a generated asset needs its own plan and approval.
 *
 * IDEMPOTENT. The first run of this script relinked the row and then aborted on
 * its own broken result-parsing before bumping audio_stamp (see the SEP note
 * below). Re-running is safe: an already-relinked row is recognised, not
 * re-written, and the stamp bump and verification still complete.
 *
 * Usage:
 *   node tools/pods/ara-bartender-relink-2026-08-14.cjs            # DRY RUN
 *   node tools/pods/ara-bartender-relink-2026-08-14.cjs --apply
 */

const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const ROW_ID = 'ara_for_eng:pod-0:SC08-S001'
const OLD_CLIP = 'a2679471-f037-4e8a-8f6e-14b93c19fbb0'
const NEW_CLIP = 'd3af89ab-73ee-4d2e-8a5b-89fb8b8dbb8f'
const EXPECT_TEXT = 'مساء الخير. عايزة إيه؟'
const COURSE = 'ara_for_eng'

const APPLY = process.argv.includes('--apply')
const LOG = path.join(__dirname, '../../docs/a108/ara-bartender-relink-' + (APPLY ? 'applied' : 'dryrun') + '-log.json')

/**
 * A real field separator, and a split on it.
 *
 * The first cut of this used `-F ''` with `l.split('')`, which splits each row
 * into single CHARACTERS — so every before-state assertion compared a
 * one-character string against a full value and passed vacuously. The dry run
 * announced "all before-state assertions passed" having asserted nothing, and
 * the fault only surfaced when the post-write RETURNING check miscounted its
 * own characters as rows. A gated script whose gate is a no-op is worse than no
 * gate, because it reports safety it never checked. Pipe cannot appear in a
 * uuid, a timestamp, or these Arabic strings.
 */
const SEP = '|'
function psql (sql) {
  const env = { ...process.env }
  for (const line of fs.readFileSync(path.join(__dirname, '../../.env.psql'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  const out = execFileSync(
    path.join(process.env.HOME, '.local/pg17/bin/psql'),
    [env.DATABASE_URL, '-At', '-F', SEP, '-c', sql],
    { env, encoding: 'utf8' }
  )
  return out.trim().split('\n').filter(Boolean).map(l => l.split(SEP))
}

function die (msg) { console.error('ABORT: ' + msg); process.exit(1) }

// ---- before-state assertions, every one a reason to abort ----------------

const rows = psql(`select target_text, target_audio_id, target_text_draft from listening_pod_sentences where id='${ROW_ID}'`)
if (rows.length !== 1) die(`expected exactly 1 row for ${ROW_ID}, found ${rows.length}`)
const [text, curClip, draft] = rows[0]
if (text !== EXPECT_TEXT) die(`row text drifted — expected "${EXPECT_TEXT}", found "${text}"`)
if (draft !== 'f') die(`row is flagged draft=${draft}; this is released text and must stay non-draft`)

const alreadyDone = curClip === NEW_CLIP
if (!alreadyDone && curClip !== OLD_CLIP) die(`row points at ${curClip} — neither the expected ${OLD_CLIP} nor ${NEW_CLIP}`)

const clips = Object.fromEntries(psql(
  `select id, text, role, voice_id, language, s3_key, origin from course_audio where id in ('${OLD_CLIP}','${NEW_CLIP}')`
).map(r => [r[0], { text: r[1], role: r[2], voice: r[3], lang: r[4], s3: r[5], origin: r[6] }]))
const oldC = clips[OLD_CLIP], newC = clips[NEW_CLIP]
if (!oldC) die(`old clip ${OLD_CLIP} not found`)
if (!newC) die(`target clip ${NEW_CLIP} not found`)
if (newC.text !== EXPECT_TEXT) die(`target clip text is "${newC.text}", not the resolved "${EXPECT_TEXT}"`)
if (newC.voice !== oldC.voice) die(`voice would change: ${oldC.voice} -> ${newC.voice}. A relink must not recast.`)
if (newC.role !== oldC.role) die(`role would change: ${oldC.role} -> ${newC.role}`)
if (newC.lang !== oldC.lang) die(`language would change: ${oldC.lang} -> ${newC.lang}`)

// the collision this whole job exists because of — assert it is real
const collide = psql(
  `select count(*) from course_audio where course_code='${COURSE}'` +
  ` and text_normalized=(select text_normalized from course_audio where id='${NEW_CLIP}')` +
  ` and language='${newC.lang}' and role='${newC.role}' and voice_id='${newC.voice}'`)[0][0]
if (Number(collide) !== 1) die(`expected exactly 1 incumbent clip on the unique key, found ${collide}`)

// make-before-break: the asset we are linking TO must be alive, now
let bytes = 0
try {
  const head = execFileSync('curl', ['-sfI', `https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/${newC.s3}`], { encoding: 'utf8' })
  bytes = Number((head.match(/content-length:\s*(\d+)/i) || [])[1] || 0)
} catch { die(`target clip is NOT alive on S3 (${newC.s3}) — make-before-break refuses the swap`) }
if (bytes < 4000) die(`target clip is only ${bytes} bytes — too short to be this line`)

const record = {
  ruling: "Tom 2026-08-14, A-108 item 1: 'This needs a RELINK, not a re-render.'",
  row: ROW_ID,
  speaker: 'Bartender',
  text: EXPECT_TEXT,
  from_clip: { id: OLD_CLIP, text: oldC.text, decode_2026_08_14: 'مساء الخير عايز عايزة ايه', note: 'reads BOTH gendered forms aloud — the defect' },
  to_clip: { id: NEW_CLIP, text: newC.text, decode_2026_08_14: 'مساء الخير عيزة ايه', voice: newC.voice, role: newC.role, origin: newC.origin, s3_key: newC.s3, alive_bytes: bytes },
  collision: `unique_course_audio_per_voice(${COURSE}, <resolved text>, ${newC.lang}, ${newC.role}, ${newC.voice}) already held by ${NEW_CLIP}`,
  old_clip_deleted: false,
  old_clip_note: 'left in place, unreferenced. Deleting a generated asset needs its own plan and approval.',
  rendered: 'nothing — zero TTS, zero cost',
  applied: APPLY
}

if (!APPLY) {
  fs.writeFileSync(LOG, JSON.stringify(record, null, 2) + '\n')
  console.log('DRY RUN — all before-state assertions passed.')
  console.log(alreadyDone
    ? `  ${ROW_ID} is ALREADY linked to ${NEW_CLIP}; only the audio_stamp bump remains.`
    : `  would relink ${ROW_ID}: ${OLD_CLIP} -> ${NEW_CLIP}`)
  console.log(`  and bump courses.audio_stamp for ${COURSE}`)
  console.log(`log: ${LOG}`)
  process.exit(0)
}

// ---- apply, re-asserting the before-state inside the write ---------------

if (alreadyDone) {
  record.relink = 'already applied by an earlier run of this script'
} else {
  const res = psql(
    `update listening_pod_sentences set target_audio_id='${NEW_CLIP}', updated_at=now()` +
    ` where id='${ROW_ID}' and target_audio_id='${OLD_CLIP}' and target_text='${EXPECT_TEXT}' and target_text_draft=false` +
    ` returning id, target_audio_id`)
  if (res.length !== 1 || res[0][1] !== NEW_CLIP) die(`update affected ${res.length} row(s) — expected exactly 1`)
  record.relink = 'applied'
}

psql(`update courses set audio_stamp=now() where course_code='${COURSE}'`)

const after = psql(`select target_audio_id, target_text, target_text_draft from listening_pod_sentences where id='${ROW_ID}'`)[0]
if (after[0] !== NEW_CLIP || after[1] !== EXPECT_TEXT || after[2] !== 'f') die(`post-write re-query disagrees: ${after.join(' | ')}`)
const stamp = psql(`select audio_stamp from courses where course_code='${COURSE}'`)[0][0]
record.verified_after = { target_audio_id: after[0], target_text: after[1], target_text_draft: after[2], audio_stamp: stamp }

// nothing else may still point at the superseded clip
const strays = psql(`select id from listening_pod_sentences where target_audio_id='${OLD_CLIP}' or known_audio_id='${OLD_CLIP}'`)
record.remaining_references_to_old_clip = strays.map(r => r[0])

fs.writeFileSync(LOG, JSON.stringify(record, null, 2) + '\n')
console.log(`APPLIED (${record.relink}). ${ROW_ID} -> ${NEW_CLIP}; audio_stamp bumped to ${stamp}`)
console.log(`references still on the old clip: ${strays.length === 0 ? 'none' : strays.map(r => r[0]).join(', ')}`)
console.log(`log: ${LOG}`)

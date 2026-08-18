/**
 * routes.cjs — the OTHER replacement routes, modelled the same way harness.cjs
 * models /generate: structurally identical to the installed call sites so a
 * reader can diff them line for line.
 *
 * "Installed" means /home/tomcassidy/SSi/ssi-dashboard-v7-clean-prod, on main
 * at a9bd62da — verified as the cwd of the running production-api.cjs,
 * course-builder-api.cjs and phases/phase8-audio-v13.cjs processes. Line
 * numbers below are that checkout's.
 *
 * Nothing here touches the live database, S3, or any TTS provider.
 */
const fs = require('fs')
const path = require('path')
const h = require('./harness.cjs')

const ROUTES_TABLES = fs.readFileSync(path.join(__dirname, 'routes-tables.sql'), 'utf8')

/** createFixture() plus the flag/repair tables the routes below write to. */
async function createRouteFixture () {
  const db = await h.createFixture()
  await db.exec(ROUTES_TABLES)
  return db
}

/**
 * canonicalClipVoiceId, phase8:4438 — the identity spelling of a voice. The
 * real one lives in services/lib/clip-identity.cjs; all this probe needs is
 * that it is a pure function of (voiceId, provider), so a re-voice changes it
 * and a same-voice regen does not.
 */
const canonicalClipVoiceId = (voiceId, provider) =>
  provider === 'azure' ? `azure_${voiceId}` : `${provider}_${voiceId}`
const sameVoice = (a, b) => a === b

// ===========================================================================
// ROUTE A — the FLAG button, on its own.
// ===========================================================================
/**
 * Flagging a clip. The one thing to establish is what it does to the AUDIO,
 * which is nothing: it writes a row in a side table and leaves course_audio
 * and every FK exactly as they were.
 *
 * WHICH flag table, though — there are two, and the distinction matters:
 *   audio_flags       written by /regenerate-single itself (phase8:4600-4625)
 *                     and by the gender-prep detector. NO Vue component writes
 *                     it: src/services/api.js:1805 flagAudioSample() has no
 *                     caller. This is the table modelled here, because it is
 *                     the one the regenerate route reads.
 *   audio_clip_flags  what the HUMAN flag button actually writes —
 *                     CourseQAGate.vue:365 -> POST /api/qa-gate/:c/rounds/:i/
 *                     signoff -> course-qa-gate.cjs:336-356. It has a real FK
 *                     to course_audio, ON DELETE CASCADE (see R7).
 * Neither is read by audio-repair-core.cjs's queue, which runs its own
 * detectors over course_audio — so a human flag does not, on its own, put a
 * clip in front of the repair panel.
 */
async function flagClip (db, { courseCode, audioUuid, reason = 'wrong word' }) {
  await db.query(
    `INSERT INTO audio_flags (audio_uuid, course_code, status, reason, flagged_by, regen_count)
     VALUES ($1,$2,'flagged',$3,'dashboard_user',0)`,
    [audioUuid, courseCode, reason])
  return { flagged: true }
}

// ===========================================================================
// ROUTE A2 — POST /regenerate-single/:courseCode/:audioUuid
// phase8-audio-v13.cjs:4385-4640 (installed copy).
// ===========================================================================
/**
 * Faithful to the installed handler in the order it runs:
 *   :4396  load the course_audio row by id
 *   :4410  PRECIOUS-AUDIO GUARD — origin='human' is refused with 409
 *   :4438  storedVoiceId = canonicalClipVoiceId(voiceId, provider)   <-- the fix
 *   :4452  A-137 reuse, but ONLY when isRevoice
 *   :4472  read regen_count from audio_flags
 *   :4520  render + master, behind the ALWAYS_SAMPLER veracity gate
 *   :4560  s3 PutObject to a BRAND NEW key: mastered/<new uuid>.mp3
 *   :4571  UPDATE course_audio ... WHERE id = audioUuid   (SAME ROW, new key)
 *   :4600  upsert audio_flags.regen_count
 *
 * `siblingReuse` stands in for reuseSiblingIntoCourse(): return an s3Key to
 * model a cache hit in a sibling course, or null for a miss. Default null =
 * reuse never hits, which is the case that renders.
 */
async function regenerateSingle (db, {
  courseCode, audioUuid,
  voiceConfigVoiceId,                 // courses.voice_config.voices[role].voiceId
  voiceProvider = 'azure',
  reuseEnabled = false,
  siblingReuse = () => null,
}) {
  const ttsBefore = h.ttsCallCount()
  const r = await db.query(
    `SELECT id, text, role, language, voice_id, s3_key, origin, audio_revision
       FROM course_audio WHERE id = $1 AND course_code = $2`, [audioUuid, courseCode])
  const rec = r.rows[0]
  if (!rec) return { status: 404, error: `Audio not found: ${audioUuid}` }

  // :4410 — precious-audio guard.
  if (rec.origin === 'human') {
    return {
      status: 409,
      error: 'This clip is a human recording (origin=human, precious). TTS regeneration is blocked for human audio.',
      ttsCalls: h.ttsCallCount() - ttsBefore,
    }
  }

  const voiceId = voiceConfigVoiceId
  if (!voiceId) return { status: 400, error: `No voice configured for role: ${rec.role}` }
  const storedVoiceId = canonicalClipVoiceId(voiceId, voiceProvider)   // :4438

  // :4452 — reuse applies ONLY on a re-voice; a same-voice press must render.
  const isRevoice = !sameVoice(storedVoiceId, rec.voice_id)
  if (reuseEnabled && isRevoice) {
    const reused = siblingReuse({ text: rec.text, role: rec.role, voiceId: storedVoiceId })
    if (reused) {
      await db.query(
        `UPDATE course_audio SET voice_id=$1, s3_key=$2, duration_ms=$3 WHERE id=$4`,
        [storedVoiceId, reused.s3Key, reused.durationMs, audioUuid])
      return {
        status: 200, success: true, audioUuid, newS3Key: reused.s3Key, reused: true,
        ttsCalls: h.ttsCallCount() - ttsBefore,
      }
    }
  }

  const flagQ = await db.query(
    `SELECT regen_count FROM audio_flags WHERE audio_uuid=$1 AND course_code=$2`,
    [String(audioUuid), courseCode])
  const flagRecord = flagQ.rows[0] || null
  const regenCount = flagRecord?.regen_count || 0

  // :4520-4560 — a real render, then a NEW s3 key. Never the old key.
  const { s3Key: newS3Key, durationMs } = h.fakeTts(rec.text, 'regen-single')

  // :4571 — same row id, new bytes. text/text_normalized/language/role are NOT
  // in the patch, so unique_course_audio_per_voice is never contended...
  // ...but voice_id IS, which is what makes a re-voice possible here.
  await db.query(
    `UPDATE course_audio
        SET voice_id=$1, origin='tts', s3_key=$2, duration_ms=$3, word_boundaries=NULL
      WHERE id=$4`,
    [storedVoiceId, newS3Key, durationMs, audioUuid])

  // :4600-4625
  if (flagRecord) {
    await db.query(
      `UPDATE audio_flags SET regen_count=$1 WHERE audio_uuid=$2 AND course_code=$3`,
      [regenCount + 1, String(audioUuid), courseCode])
  } else {
    await db.query(
      `INSERT INTO audio_flags (audio_uuid, course_code, status, regen_count, reason, flagged_by)
       VALUES ($1,$2,'flagged',1,'Inline regeneration','dashboard_user')`,
      [String(audioUuid), courseCode])
  }

  return {
    status: 200, success: true, audioUuid, newS3Key, durationMs,
    regenCount: regenCount + 1, reused: false,
    ttsCalls: h.ttsCallCount() - ttsBefore,
  }
}

// ===========================================================================
// ROUTE D — the in-place repair path.
// services/audio-repair-core.cjs, mounted by services/api/audio-repair-routes.cjs
// from production-api.cjs:5573.
// ===========================================================================
const CANDIDATE_PREFIX = 'repair-candidates'

/**
 * propose — audio-repair-core.cjs :330-380. Renders (or accepts an upload),
 * uploads to a CANDIDATE key, writes an audio_repair_candidates row. Production
 * is not touched: on any failure nothing has moved. Make-before-break.
 */
async function repairPropose (db, {
  courseCode, audioId, source = 'tts', voiceId = null, text = null,
  actor = 'kai@saysomethingin.com', veracityCer = 0,
}) {
  const ttsBefore = h.ttsCallCount()
  const r = await db.query(
    `SELECT id, text, role, language, voice_id, s3_key FROM course_audio WHERE id=$1 AND course_code=$2`,
    [audioId, courseCode])
  const row = r.rows[0]
  if (!row) return { status: 404, error: 'not_found' }

  let durationMs
  if (source === 'upload') {
    durationMs = 1500                       // bytes came from a human, no TTS
  } else {
    ({ durationMs } = h.fakeTts(text || row.text, 'repair-cand'))
  }

  const ins = await db.query(
    `INSERT INTO audio_repair_candidates
       (audio_id, course_code, source, status, s3_key, text, voice_id,
        duration_ms, file_size_bytes, veracity_checked, veracity_pass, veracity_cer, proposed_by)
     VALUES ($1,$2,$3,'pending','placeholder',$4,$5,$6,4096,true,true,$7,$8)
     RETURNING id`,
    [audioId, courseCode, source, text || row.text, voiceId || row.voice_id, durationMs, veracityCer, actor])
  const candidateId = ins.rows[0].id
  // :342 — the key is derived from the candidate id, under a DIFFERENT prefix
  // from mastered/. It is never the clip's current key.
  const s3Key = `${CANDIDATE_PREFIX}/${String(candidateId).toUpperCase()}.mp3`
  await db.query(`UPDATE audio_repair_candidates SET s3_key=$1 WHERE id=$2`, [s3Key, candidateId])

  return {
    status: 200, candidateId, s3Key, durationMs,
    current: { s3Key: row.s3_key },
    ttsCalls: h.ttsCallCount() - ttsBefore,
  }
}

/**
 * accept — audio-repair-core.cjs :509-660. The human pass.
 *   :528  HEAD the candidate object; refuse if it is not really in the bucket
 *   :558  write course_audio_revisions FIRST (an unrecorded swap is worse)
 *   :579  UPDATE course_audio: s3_key, duration, audio_revision+1, word_boundaries=NULL
 *   :603  assert id, s3_key, revision and text all landed as intended
 * text/text_normalized/language/role/voice_id are deliberately NOT patched.
 */
async function repairAccept (db, {
  courseCode, audioId, candidateId, actor = 'kai@saysomethingin.com', reason = null,
  candidateObjectExists = true,
}) {
  const ttsBefore = h.ttsCallCount()
  const rq = await db.query(
    `SELECT * FROM course_audio WHERE id=$1 AND course_code=$2`, [audioId, courseCode])
  const row = rq.rows[0]
  const cq = await db.query(`SELECT * FROM audio_repair_candidates WHERE id=$1`, [candidateId])
  const cand = cq.rows[0]
  if (!cand) return { status: 404, error: 'no candidate' }
  if (cand.audio_id !== audioId) return { status: 400, error: 'candidate_mismatch' }
  if (cand.status !== 'pending') return { status: 400, error: 'candidate_not_pending' }
  // :528 — make-before-break.
  if (!candidateObjectExists) {
    return { status: 400, error: 'candidate_object_missing', ttsCalls: h.ttsCallCount() - ttsBefore }
  }

  const previousRevision = row.audio_revision ?? 1
  const revision = previousRevision + 1

  await db.query(
    `INSERT INTO course_audio_revisions
       (audio_id, course_code, revision, previous_revision, previous_s3_key, new_s3_key,
        previous_duration_ms, new_duration_ms, candidate_id, source, accepted_by, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [audioId, courseCode, revision, previousRevision, row.s3_key, cand.s3_key,
     row.duration_ms, cand.duration_ms, candidateId, cand.source, actor, reason])

  // :579 — the swap. `origin` becomes 'human' for an upload (:592).
  await db.query(
    `UPDATE course_audio
        SET s3_key=$1, duration_ms=$2, audio_revision=$3, word_boundaries=NULL,
            origin = CASE WHEN $4 = 'upload' THEN 'human' ELSE origin END
      WHERE id=$5`,
    [cand.s3_key, cand.duration_ms, revision, cand.source, audioId])
  await db.query(
    `UPDATE audio_repair_candidates SET status='accepted', decided_by=$1, decided_at=now() WHERE id=$2`,
    [actor, candidateId])

  return {
    status: 200, success: true, revision,
    supersededS3Key: row.s3_key, newS3Key: cand.s3_key,
    ttsCalls: h.ttsCallCount() - ttsBefore,
  }
}

/**
 * revert — audio-repair-core.cjs :701-770. Data-only: puts the clip back on the
 * object it served before, as a FORWARD revision (:693 — the number never goes
 * backwards, or a device cached at rev 2 would be told it is fine at rev 1).
 */
async function repairRevert (db, { courseCode, audioId, actor = 'kai@saysomethingin.com', reason = null }) {
  const ttsBefore = h.ttsCallCount()
  const rq = await db.query(`SELECT * FROM course_audio WHERE id=$1 AND course_code=$2`, [audioId, courseCode])
  const row = rq.rows[0]
  const current = row.audio_revision ?? 1
  const hq = await db.query(
    `SELECT * FROM course_audio_revisions WHERE audio_id=$1 ORDER BY revision DESC`, [audioId])
  const entry = hq.rows.find(x => x.revision === current)
  if (!entry) return { status: 404, error: 'no history entry', ttsCalls: 0 }

  const revision = current + 1
  await db.query(
    `INSERT INTO course_audio_revisions
       (audio_id, course_code, revision, previous_revision, previous_s3_key, new_s3_key,
        previous_duration_ms, new_duration_ms, accepted_by, reason)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [audioId, courseCode, revision, current, row.s3_key, entry.previous_s3_key,
     row.duration_ms, entry.previous_duration_ms, actor,
     reason || `revert to revision ${entry.previous_revision}`])
  await db.query(
    `UPDATE course_audio SET s3_key=$1, duration_ms=$2, audio_revision=$3 WHERE id=$4`,
    [entry.previous_s3_key, entry.previous_duration_ms, revision, audioId])

  return {
    status: 200, success: true, revision, restoredS3Key: entry.previous_s3_key,
    ttsCalls: h.ttsCallCount() - ttsBefore,
  }
}

/**
 * harness.audioRows() projects only the columns the linking probe needed. The
 * replacement routes turn on `origin` (the precious-audio guard) and
 * `audio_revision` (the cache-bust), so this reader adds them.
 */
async function clipRows (db, role = 'target1') {
  const q = await db.query(
    `SELECT id, text, role, voice_id, origin, s3_key, duration_ms, audio_revision, created_at
       FROM course_audio WHERE course_code = $1 AND role = $2 ORDER BY created_at, id`,
    [h.COURSE, role])
  return q.rows
}

module.exports = {
  createRouteFixture, canonicalClipVoiceId, sameVoice, clipRows,
  flagClip, regenerateSingle,
  repairPropose, repairAccept, repairRevert,
  CANDIDATE_PREFIX,
}

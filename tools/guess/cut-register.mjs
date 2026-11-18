// MOVED to Popty from ssi-learning-app/tools/guess/cut-register.mjs (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
// BEFORE THIS IS NEXT RUN WITH --write: it writes course_audio rows over pg and uploads to S3 itself. That is no longer allowed
// (course content is written only through Popty routes; the agent login refuses course_audio writes, job #388). Route the
// registration through POST /api/production/:courseCode/edit (clip metadata) and the slot through link-clip first. Not swapped
// in #699 because the swap is not mechanical: a pod_atom clip with no course slot has no route that files it today.
/**
 * Registers one cut as a course_audio row (lane review #81·K). /api/audio/<id> is served with a year-long
 * immutable cache, so a clip's bytes may NEVER change under an id once a learner could have fetched it.
 * The label carries a hash of the cut's own bytes: the same bytes again find their row and reuse it with no
 * upload; different bytes, a recut, are a different label and so a new row, a new UUID and a new S3 key.
 * Nothing ever writes onto an existing key. Dependencies are passed in, so a test can run it offline.
 */
import { createHash, randomUUID } from 'node:crypto'

export const cutLabel = (text, bytes) => `[guess cut] ${text} #${createHash('sha256').update(bytes).digest('hex').slice(0, 12)}`

/**
 * @param {{ query: (sql: string, args: unknown[]) => Promise<{ rows: any[] }> }} pg
 * @param {(key: string, body: Buffer) => Promise<void>} put  uploads a NEW object; only ever called with a fresh key
 * @param take the course_audio row the cut came from: course_code, language, voice_id, origin
 */
export async function registerCut(pg, put, take, text, bytes, ms, newId = randomUUID) {
  const label = cutLabel(text, bytes)
  const { rows: [had] } = await pg.query(`select id from course_audio where course_code = $1 and role = 'pod_atom' and voice_id = $2 and language = $3 and text_normalized = normalize_text($4)`, [take.course_code, take.voice_id, take.language, label])
  if (had) return { id: had.id, ms, reused: true }
  const id = newId()
  const s3Key = `mastered/${id.toUpperCase()}.mp3`
  await put(s3Key, bytes)
  await pg.query('insert into course_audio (id, course_code, text, language, role, voice_id, origin, s3_key, duration_ms, file_size_bytes, audio_revision) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1)',
    [id, take.course_code, label, take.language, 'pod_atom', take.voice_id, take.origin, s3Key, ms, bytes.length])
  return { id, ms, reused: false }
}

/**
 * RELABEL A HUMAN TAKE'S VOICE (2026-11-09, North Pod 1 "Siân"). A take filed under the wrong person's voice id is
 * re-credited to the person who actually recorded it. The bytes, the clip id and every slot pointing at it stay exactly
 * as they are — only course_audio.voice_id changes, and the clip index is re-keyed to match.
 *
 * Why it exists: until #135 the booth filed pod-swap takes under the course's human target1 slot (Catrin on cym_n),
 * whoever read them, so Aran's two "Siân" takes were stored as Catrin. The voice on a take decides the pod character's
 * sex, the English voice gate and the booth queue, so the label is load-bearing. Agents have no database login (Tom,
 * 2026-10-14), so this is the door.
 *
 * Route: POST /api/production/:courseCode/clip-voice-relabel
 *   body { clips: [{ audioId, from, to }], reason, dryRun? }
 * Rules, each a per-clip refusal (nothing written for that clip):
 *   - HUMAN TAKES ONLY (origin 'human'): a TTS clip's voice is what rendered it, never a label to correct. NOT_HUMAN.
 *   - Same course only. FOREIGN_CLIP.
 *   - `from` must be the voice the row holds now (canonical spelling): a race or a wrong id is STALE_FROM.
 *   - `to` must be a HUMAN voice this course casts (voice_config.voices[*] with provider human, or a podCast entry). NOT_CAST.
 *   - `to` may not already own a row of the same identity (course, words, language, role): IDENTITY_TAKEN — that is two
 *     takes, a choice for a person, never a relabel.
 *   - `reason` is required: it rides in the content-edit event, the only record of who said whose voice it is.
 * The write is conditional on voice_id = from, so a concurrent change comes back as RACE.
 */
const { canonicalVoiceId } = require('./clip-identity.cjs')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ROW = 'id, course_code, text, text_normalized, language, role, voice_id, origin, s3_key, veracity_pass'

/** The human voices a course casts: its human slots and every pod-cast entry. */
function castHumanVoices(voiceConfig) {
  const out = new Set()
  const voices = (voiceConfig && voiceConfig.voices) || {}
  for (const v of Object.values(voices)) if (v && v.provider === 'human' && v.voiceId) out.add(canonicalVoiceId(v.voiceId))
  const pod = (voiceConfig && voiceConfig.podCast) || {}
  for (const v of Object.values(pod)) if (v && v.voiceId && /^human_/.test(v.voiceId)) out.add(canonicalVoiceId(v.voiceId))
  return out
}

async function relabelOne(db, courseCode, cast, c, dryRun) {
  const base = { audioId: c && c.audioId, from: c && c.from, to: c && c.to }
  if (!c || !UUID.test(String(c.audioId || ''))) return { ...base, ok: false, code: 'BAD_ID', error: 'audioId must be one course_audio uuid' }
  if (!c.from || !c.to) return { ...base, ok: false, code: 'MISSING', error: 'name from and to' }
  const from = canonicalVoiceId(String(c.from)), to = canonicalVoiceId(String(c.to))
  if (from === to) return { ...base, ok: false, code: 'SAME_VOICE', error: 'from and to are the same voice' }
  const { data: row, error } = await db.from('course_audio').select(ROW).eq('id', c.audioId).maybeSingle()
  if (error) return { ...base, ok: false, code: 'READ_FAILED', error: error.message }
  if (!row) return { ...base, ok: false, code: 'NO_CLIP', error: `no clip ${c.audioId}` }
  if (row.course_code !== courseCode) return { ...base, ok: false, code: 'FOREIGN_CLIP', error: `${c.audioId} belongs to ${row.course_code}` }
  if (row.origin !== 'human') return { ...base, ok: false, code: 'NOT_HUMAN', error: `${c.audioId} is a ${row.origin || 'tts'} clip; only a human take is relabelled` }
  if (canonicalVoiceId(row.voice_id || '') !== from) {
    if (canonicalVoiceId(row.voice_id || '') === to) return { ...base, ok: true, changed: false }
    return { ...base, ok: false, code: 'STALE_FROM', error: `${c.audioId} is filed under ${row.voice_id}, not ${from}` }
  }
  if (!cast.has(to)) return { ...base, ok: false, code: 'NOT_CAST', error: `${to} is not a human voice ${courseCode} casts` }
  const { data: clash, error: clashErr } = await db.from('course_audio').select('id')
    .eq('course_code', courseCode).eq('text_normalized', row.text_normalized).eq('language', row.language).eq('role', row.role).eq('voice_id', to).limit(1)
  if (clashErr) return { ...base, ok: false, code: 'READ_FAILED', error: clashErr.message }
  if (clash && clash.length) return { ...base, ok: false, code: 'IDENTITY_TAKEN', error: `${to} already has a ${row.role} take of "${row.text}" (${clash[0].id}) — two takes, not a relabel` }
  if (dryRun) return { ...base, ok: true, changed: true, dryRun: true, text: row.text }
  return { ...base, ok: true, changed: true, text: row.text, row: { ...row, voice_id: to }, fromCanon: from, toCanon: to }
}

/**
 * clips: [{ audioId, from, to }]; recordEdit({ scope, detail }) is the content-edit gate's record;
 * reindex(rows) writes the clip index entries for the relabelled rows (clip-index writeThrough).
 */
async function relabelClipVoices({ db, courseCode, clips, reason, dryRun = false, recordEdit = null, reindex = null, logger = console }) {
  if (!Array.isArray(clips) || !clips.length) return { ok: false, code: 'NO_CLIPS', error: 'clips must be a non-empty array' }
  if (clips.length > 50) return { ok: false, code: 'TOO_MANY', error: 'at most 50 clips per request' }
  if (!reason || !String(reason).trim()) return { ok: false, code: 'NO_REASON', error: 'say why: reason is the record of whose voice this is' }
  const { data: course, error: cErr } = await db.from('courses').select('voice_config').eq('course_code', courseCode).maybeSingle()
  if (cErr) return { ok: false, code: 'READ_FAILED', error: cErr.message }
  if (!course) return { ok: false, code: 'NO_COURSE', error: `no course ${courseCode}` }
  const cast = castHumanVoices(course.voice_config)
  const results = []
  for (const c of clips) results.push(await relabelOne(db, courseCode, cast, c, dryRun))
  const toWrite = results.filter((r) => r.ok && r.changed && !r.dryRun)
  let eventId = null
  if (toWrite.length && recordEdit) {
    eventId = await recordEdit({ scope: { audio_ids: toWrite.map((r) => r.audioId), rows: toWrite.length }, detail: { op: 'clip-voice-relabel', reason: String(reason).slice(0, 500), clips: toWrite.map((r) => ({ audioId: r.audioId, from: r.fromCanon, to: r.toCanon, text: r.text })) } })
  }
  let relabelled = 0
  for (const r of toWrite) {
    const { data, error } = await db.from('course_audio').update({ voice_id: r.toCanon }).eq('id', r.audioId).eq('voice_id', r.fromCanon).select('id')
    if (error) { r.ok = false; r.code = 'WRITE_FAILED'; r.error = error.message; continue }
    if (!data || !data.length) { r.ok = false; r.code = 'RACE'; r.error = 'the row changed between read and write — nothing written'; continue }
    relabelled++
    // The clip index keyed this take under the old voice: drop that entry, write the new one.
    const { error: delErr } = await db.from('clip_index').delete().eq('audio_id', r.audioId).eq('voice_id', r.fromCanon)
    if (delErr) logger.warn && logger.warn(`[clip-voice-relabel] clip_index drop for ${r.audioId} failed (${delErr.message}) — the fallback still answers`)
    if (reindex) await reindex([r.row])
  }
  for (const r of results) { delete r.row; delete r.fromCanon; delete r.toCanon }
  const failed = results.filter((r) => !r.ok).length
  return { ok: failed === 0, dryRun: !!dryRun, courseCode, relabelled, failed, eventId, results }
}

module.exports = { relabelClipVoices, castHumanVoices }

/**
 * INGEST A MACHINE CUT: a phrase cut out of a longer recording of a DIFFERENT text, stored as a clip of its own and
 * linked into one slot (job #374). Route: POST /api/production/:courseCode/ingest-cut (production-api).
 *
 * Tom, 2026-10-24, on the zho dice-and-splice listen pairs: "Ok the joins are not worth it, but the cuts work great.
 * That will save a decent slug of credits" (ruling r-2026-10-24-dice-and-splice-cuts-a-phrase). So a cut is a door into
 * the library and a join never is. The #374 brief exists because the zho re-record (#366) was rendering phrases fresh that
 * a cast-voice clip of a longer sentence already says: add-recording is for human artists only, and link-clip needs a
 * clip that already exists.
 *
 *   # dry run (the default) — cuts, measures and audits, stores and links NOTHING:
 *   curl -s -X POST http://localhost:3470/api/production/zho_for_eng/ingest-cut -H 'Content-Type: application/json' \
 *        -H 'x-agent-id: <who you are>' -d '{"legoId":"S0662L02","role":"target1","text":"我想","sourceAudioId":"<uuid>",
 *        "startSec":0.12,"endSec":0.61,"charStart":0,"charEnd":2}'
 *   # real: add "dryRun":false, and for a filled slot "replace":true,"expectCurrent":"<the clip it holds now>".
 *   # undo: POST the answer's `undo` body to /api/production/:courseCode/link-clip (it links the old clip back over the cut).
 *
 * Rules, each a refusal (nothing stored, nothing linked) rather than a warning:
 *   - ONE source clip. A list of sources, or any second piece, is a join: NO_JOIN.
 *   - The source is a recording of a DIFFERENT text that contains this one (#359): a source whose words ARE the slot's
 *     words is OWN_TEXT; the clip the slot holds now (its reference) is OWN_CLIP. The source's characters
 *     [charStart, charEnd) must spell the slot's words (punctuation and spaces aside): SPAN_TEXT; a span that is the whole
 *     source is SPAN_IS_WHOLE. Same course only (FOREIGN_SOURCE), and a target slot takes a target clip, a known slot a
 *     known clip (ROLE_MISMATCH).
 *   - The cut is made HERE, with ffmpeg, from the source clip's SERVED bytes — the existing clip stays the source of truth;
 *     no caller-supplied audio is accepted. Its file hash, decoded-audio hash and waveform must not match the whole
 *     (hashVerdict, tools/audio/dice-splice-zho.cjs): IDENTICAL_TO_WHOLE.
 *   - The tail-click audit (tools/audio/clip-tail-audit.py, the check AUDIT=1 runs in revoice-seeds-to-cast) runs on the
 *     cut's bytes BEFORE anything is stored: TAIL_CLICK. "Cannot measure" refuses too.
 *   - FILL-ONLY unless replace:true + expectCurrent, exactly as link-clip; the link itself IS link-clip's linkClips, so its
 *     text check, race guard, edit stamp and content_version bump all apply.
 *   - MAKE-BEFORE-BREAK: the cut is stored, then checked as the learner proxy serves it (alive + tail audit again), and only
 *     then linked. No clip is ever deleted. A cut that fails the served check is left stored and unlinked: SERVED_CHECK.
 *   - LIBRARY FIRST: if this course already holds a clip of these words for this role in the source's voice, that clip is
 *     linked instead and nothing is cut (source: 'library').
 * Provenance (method 'machine-cut', source clip + revision + voice, source text, character span, seconds, hashes, tail
 * numbers) rides in the content-edit event's detail and in the rollback line. course_audio has no provenance column.
 * Every outside-world step is a dep, so the decision is testable without a database, S3 or the network.
 */
const crypto = require('crypto')
const { normalizeForDb, normalizeForAudio } = require('./text-normalize.cjs')
const { linkClips, slotOf } = require('./link-clip.cjs')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ROLES = ['target1', 'target2', 'known']
const TABLE = { seed: 'course_seeds', lego: 'course_legos', phrase: 'course_practice_phrases' }
const MIN_CUT_SEC = 0.2

class CutRefusal extends Error {
  constructor(code, message, extra = {}) { super(message); this.code = code; this.extra = extra }
}

/** The words with punctuation and spaces gone: what a character span of a sentence has to spell. */
const bareText = (s) => normalizeForDb(String(s || '')).replace(/[\s\p{P}\p{S}]/gu, '')
const isTarget = (role) => role === 'target1' || role === 'target2'

/** The slot fields of a link, in link-clip's own shape. */
function slotFields(d) {
  if (d.phraseId) return { phraseId: d.phraseId }
  if (d.legoId) return { legoId: d.legoId }
  return { seedNumber: Number(d.seedNumber) }
}

/**
 * Pure. Why this descriptor may not be cut, or null. `slot` = { text, current }, `source` = the source clip's row.
 * Run before any byte is fetched.
 */
function refuseDescriptor(d, slot, source) {
  if (Array.isArray(d.sources) || Array.isArray(d.sourceAudioId) || d.pieces != null) return ['NO_JOIN', 'a cut has exactly one source clip; several pieces are a join, and joins are never made (r-2026-10-24)']
  if (!UUID.test(String(d.sourceAudioId || ''))) return ['BAD_SOURCE', 'sourceAudioId must be one course_audio uuid']
  if (!ROLES.includes(d.role)) return ['BAD_ROLE', `role must be one of ${ROLES.join(', ')}`]
  const s = Number(d.startSec), e = Number(d.endSec)
  if (!Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e <= s || e - s < MIN_CUT_SEC) return ['BAD_SPAN', `startSec/endSec must be seconds with 0 <= start < end and at least ${MIN_CUT_SEC}s between them`]
  if (!slot) return ['NO_SLOT', 'no such slot']
  if (!source) return ['NO_SOURCE', `no course_audio row ${d.sourceAudioId}`]
  if (normalizeForDb(String(d.text || '')) !== normalizeForDb(String(slot.text || ''))) return ['TEXT_MISMATCH', `the slot says "${slot.text}", the request says "${d.text}"`]
  if (source.course_code !== d.courseCode) return ['FOREIGN_SOURCE', `the source clip belongs to ${source.course_code}, not ${d.courseCode}`]
  if (isTarget(d.role) !== isTarget(source.role)) return ['ROLE_MISMATCH', `a ${d.role} slot takes a cut of a ${isTarget(d.role) ? 'target' : 'known'} clip; the source is ${source.role}`]
  if (String(source.id) === String(slot.current || '') || String(source.id) === String(d.expectCurrent || '')) return ['OWN_CLIP', 'the source is the clip this slot holds: a cut of its own reference is not a cut (#359)']
  if (bareText(source.text) === bareText(slot.text)) return ['OWN_TEXT', `the source clip says the slot's own words ("${source.text}"): a cut comes from a LONGER recording of a different text (#359)`]
  const chars = [...String(source.text || '')]
  const cs = Number(d.charStart), ce = Number(d.charEnd)
  if (!Number.isInteger(cs) || !Number.isInteger(ce) || cs < 0 || ce <= cs || ce > chars.length) return ['BAD_SPAN', `charStart/charEnd must index the source text (${chars.length} characters)`]
  const span = chars.slice(cs, ce).join('')
  if (bareText(span) !== bareText(slot.text)) return ['SPAN_TEXT', `characters ${cs}-${ce} of the source say "${span}", the slot says "${slot.text}"`]
  if (bareText(span) === bareText(source.text)) return ['SPAN_IS_WHOLE', 'the span is the whole source text']
  if (slot.current && !(d.replace === true && String(d.expectCurrent || '') === String(slot.current))) return ['SLOT_FILLED', `slot holds ${slot.current}; send replace:true with expectCurrent:"${slot.current}" to replace it`]
  return null
}

/** One JSONL rollback line, in revoice-seeds-to-cast's shape (old pointer → new) plus the cut's provenance. */
function rollbackLine({ courseCode, d, old, audioId, provenance, at }) {
  return { at, course: courseCode, ...slotFields(d), role: d.role, old: old || null, new: audioId, provenance }
}

/** The link-clip body that puts the old clip back over the cut; null when the slot was empty (link-clip never clears). */
function undoBody(line) {
  if (!line.old) return null
  const { at, course, role, old, new: now, provenance, ...slot } = line
  return { links: [{ ...slot, role, audioId: old, replace: true, expectCurrent: now }] }
}

async function readSlot(db, courseCode, d) {
  const slot = slotOf(d)
  if (slot.error || !TABLE[slot.kind]) throw new CutRefusal('BAD_SLOT', slot.error || 'name the slot with seedNumber, legoId or phraseId')
  const col = `${d.role}_audio_id`
  let q = db.from(TABLE[slot.kind]).select(`id, known_text, target_text, ${col}`).eq('course_code', courseCode)
  if (slot.kind === 'phrase') q = q.eq('id', slot.label)
  else if (slot.kind === 'lego') q = q.eq('seed_number', slot.seedNumber).eq('lego_index', slot.legoIndex)
  else q = q.eq('seed_number', slot.seedNumber)
  const { data, error } = await q.maybeSingle()
  if (error) throw new Error(`slot unreadable: ${error.message}`)
  if (!data) return null
  return { text: d.role === 'known' ? data.known_text : data.target_text, current: data[col] == null ? null : String(data[col]), legoId: slot.kind === 'lego' ? slot.label : null }
}

async function readClip(db, id) {
  const { data, error } = await db.from('course_audio').select('id, course_code, text, language, role, voice_id, origin, audio_revision, s3_key').eq('id', id).maybeSingle()
  if (error) throw new Error(`clip unreadable: ${error.message}`)
  return data || null
}

/** This course's clip of these words for this role in this voice, if the library already holds one (the UNIQUE key). */
async function libraryClip(db, { courseCode, text, language, role, voiceId }) {
  const { data, error } = await db.from('course_audio').select('id').eq('course_code', courseCode).eq('text_normalized', normalizeForAudio(text))
    .eq('language', language).eq('role', role).eq('voice_id', voiceId).not('s3_key', 'like', 'pending/%')
    // A clip a check marked failed (veracity_pass false — the tail-click audit does) is never handed back; null (unchecked) still reuses. Same rule as phase8's reuse pick.
    .or('veracity_pass.is.null,veracity_pass.eq.true').maybeSingle()
  if (error) throw new Error(`library lookup failed: ${error.message}`)
  return data ? { audioId: String(data.id) } : null
}

const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex')

/**
 * @param input  { courseCode, seedNumber | legoId | phraseId, role, text, sourceAudioId, startSec, endSec, charStart, charEnd,
 *                 replace?, expectCurrent?, dryRun? (default TRUE), requestedBy }
 * @param deps   db (supabase-js), recordEdit?, and the I/O:
 *   fetchServed(clip)                  → Buffer   the bytes the learner proxy serves for the clip
 *   cut(bytes, { startSec, endSec })   → { bytes, durationSec, sourceDurationSec }   ffmpeg, one span of one clip, mp3
 *   decode(bytes)                      → Float32Array mono PCM
 *   hashVerdict({ splicedBytes, referenceBytes, splicedPcm, referencePcm }) → { ok, verdict, … }
 *   tailAudit(bytes)                   → { click:boolean, … } | { error }   clip-tail-audit.py on local bytes
 *   store({ courseCode, text, language, role, voiceId, legoId, bytes, durationMs }) → { audioId, s3Key }   S3 + course_audio + clip_index
 *   servedCheck(audioId)               → null | why not   alive at the learner proxy and tail-clean as served
 *   appendRollback(line)               → path written, or null
 *   now()                              → ISO string
 */
async function ingestCut(input, deps) {
  const d = { ...(input || {}) }
  const dryRun = d.dryRun !== false
  const { db } = deps
  try {
    if (!d.requestedBy) throw new CutRefusal('IDENTITY_REQUIRED', 'say who is cutting: send x-agent-id')
    if (!ROLES.includes(d.role)) throw new CutRefusal('BAD_ROLE', `role must be one of ${ROLES.join(', ')}`)
    const slot = await readSlot(db, d.courseCode, d)
    const source = UUID.test(String(d.sourceAudioId || '')) ? await readClip(db, String(d.sourceAudioId)) : null
    const refusal = refuseDescriptor(d, slot, source)
    if (refusal) throw new CutRefusal(refusal[0], refusal[1])

    const base = { slot: slotFields(d), role: d.role, before: slot.current, voiceId: source.voice_id, dryRun }
    const held = await libraryClip(db, { courseCode: d.courseCode, text: slot.text, language: source.language, role: d.role, voiceId: source.voice_id })
    if (held) return finish({ ...base, source: 'library', audioId: held.audioId, provenance: { method: 'library', requestedBy: d.requestedBy } })

    const whole = await deps.fetchServed(source)
    const cut = await deps.cut(whole, { startSec: Number(d.startSec), endSec: Number(d.endSec) })
    if (Number(d.endSec) > cut.sourceDurationSec + 0.05) throw new CutRefusal('BAD_SPAN', `endSec ${d.endSec} is past the source's end (${cut.sourceDurationSec.toFixed(3)}s)`)
    if (cut.durationSec < MIN_CUT_SEC) throw new CutRefusal('BAD_SPAN', `the cut came out ${cut.durationSec.toFixed(3)}s long`)
    const hv = deps.hashVerdict({ splicedBytes: cut.bytes, referenceBytes: whole, splicedPcm: await deps.decode(cut.bytes), referencePcm: await deps.decode(whole) })
    if (!hv.ok) throw new CutRefusal('IDENTICAL_TO_WHOLE', `the cut is ${hv.verdict} (similarity ${hv.similarity})`, { hash: hv })
    const tail = await deps.tailAudit(cut.bytes)
    if (!tail || tail.error) throw new CutRefusal('TAIL_CLICK', `tail audit could not measure the cut (${tail ? tail.error : 'no answer'}) — cannot measure refuses`)
    if (tail.click) throw new CutRefusal('TAIL_CLICK', `the cut clicks at its tail (spike ${Number(tail.tail_spike).toFixed(1)}, end_abs ${Number(tail.end_abs).toFixed(3)})`, { tail })

    const chars = [...String(source.text)]
    const provenance = {
      method: 'machine-cut', sourceAudioId: String(source.id), sourceRevision: source.audio_revision || 1, sourceVoiceId: source.voice_id,
      sourceText: source.text, charStart: Number(d.charStart), charEnd: Number(d.charEnd), spanText: chars.slice(d.charStart, d.charEnd).join(''),
      startSec: Number(d.startSec), endSec: Number(d.endSec), durationSec: Math.round(cut.durationSec * 1000) / 1000,
      fileSha: sha256(cut.bytes), sourceFileSha: hv.referenceFileSha, pcmSha: hv.pcmSha, similarity: hv.similarity,
      tail: { tail_spike: tail.tail_spike, end_abs: tail.end_abs, dur: tail.dur }, requestedBy: d.requestedBy,
    }
    if (dryRun) return finish({ ...base, source: 'cut', audioId: null, provenance })

    // MAKE: store, then check it as a learner would receive it. BREAK (the pointer swap) only after.
    const stored = await deps.store({ courseCode: d.courseCode, text: slot.text, language: source.language, role: d.role, voiceId: source.voice_id, legoId: slot.legoId, bytes: cut.bytes, durationMs: Math.round(cut.durationSec * 1000) })
    const bad = await deps.servedCheck(stored.audioId)
    if (bad) return { ok: false, code: 'SERVED_CHECK', error: `stored as ${stored.audioId} but ${bad}; nothing linked, the slot keeps ${slot.current || 'nothing'}`, ...base, audioId: stored.audioId, s3Key: stored.s3Key, provenance }
    return finish({ ...base, source: 'cut', audioId: stored.audioId, s3Key: stored.s3Key, provenance })
  } catch (e) {
    if (e instanceof CutRefusal) return { ok: false, code: e.code, error: e.message, dryRun, ...e.extra }
    throw e
  }

  async function finish(out) {
    if (out.dryRun) return { ok: true, linked: 0, ...out }
    if (out.audioId === out.before) return { ok: true, linked: 0, changed: false, ...out }
    const link = { ...out.slot, role: d.role, audioId: out.audioId, ...(out.before ? { replace: true, expectCurrent: out.before } : {}) }
    // The rollback line is written BEFORE the pointer moves (revoice-seeds-to-cast's order): a crash between the two leaves
    // a line for a link that never happened, which is harmless; the reverse would leave a link nobody can find.
    const line = rollbackLine({ courseCode: d.courseCode, d, old: out.before, audioId: out.audioId, provenance: out.provenance, at: deps.now ? deps.now() : new Date().toISOString() })
    const rollbackFile = deps.appendRollback ? await deps.appendRollback(line) : null
    const recordEdit = deps.recordEdit ? (e) => deps.recordEdit({ ...e, detail: { ...e.detail, cut: out.provenance } }) : null
    const l = await linkClips({ db, courseCode: d.courseCode, links: [link], dryRun: false, recordEdit, ...(deps.bump ? { bump: deps.bump } : {}), ...(deps.checkVoice ? { checkVoice: deps.checkVoice } : {}) })
    const r = (l.results || [])[0] || {}
    if (!r.ok) return { ok: false, code: r.code || l.code || 'LINK_REFUSED', error: r.error || l.error, ...out, rollback: line, rollbackFile, note: out.source === 'cut' ? `the cut ${out.audioId} is stored; the slot was not moved` : undefined }
    return { ok: true, linked: l.linked, changed: r.changed !== false, eventId: l.eventId, contentVersion: l.contentVersion, ...out, rollback: line, rollbackFile, undo: undoBody(line) }
  }
}

// ── the live I/O, for the route ──────────────────────────────────────────────────────────────────────────────────
const AUDIO_BASE = process.env.LEARNER_AUDIO_BASE || 'https://saysomethingin.app/api/audio'
const TAIL_AUDIT = require('path').join(__dirname, '..', '..', 'tools', 'audio', 'clip-tail-audit.py')
const ref = (id, rev) => (rev && Number(rev) > 1 ? `${id}.v${Number(rev)}` : String(id))

function ffmpeg(args, input) {
  const r = require('child_process').spawnSync('ffmpeg', ['-v', 'error', ...args], { input, maxBuffer: 64 * 1024 * 1024, timeout: 60000 })
  if (r.status !== 0) throw new Error(`ffmpeg failed: ${String(r.stderr || '').slice(0, 200)}`)
  return r.stdout
}
/**
 * WAV bytes → MP3 bytes through the real lame binary (CBR, no replaygain, -q 2: ffmpegFilterToLameMp3's arguments).
 * lame writes to a FILE, not stdout: it seeks back to fill in the Xing/LAME header when it finishes, and on a pipe it
 * cannot, so the "LAME3.x" encoder tag the export check reads would be missing (missing_encoder_tag).
 */
function lameMp3(wav, { bitrate = 96, channels = 1 } = {}) {
  const fs = require('fs'), os = require('os'), path = require('path')
  const { LAME_BIN } = require('../audio-processor.cjs')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-cut-lame-'))
  const out = path.join(dir, 'cut.mp3')
  try {
    const r = require('child_process').spawnSync(LAME_BIN, ['-m', channels === 1 ? 'm' : 'j', '-b', String(bitrate), '--cbr', '--noreplaygain', '-q', '2', '--silent', '-', out],
      { input: wav, maxBuffer: 64 * 1024 * 1024, timeout: 60000 })
    if (r.error || r.status !== 0) throw new Error(`lame failed: ${r.error ? r.error.message : String(r.stderr || '').slice(0, 200)}`)
    return fs.readFileSync(out)
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}
const durationOf = (bytes) => ffmpeg(['-i', 'pipe:0', '-f', 's16le', '-ac', '1', '-ar', '48000', 'pipe:1'], bytes).length / 2 / 48000

/**
 * One span of one clip, as mp3 in the course's own format (48 kHz mono 96 kb/s, what mastered Cartesia clips are).
 * A short fade where the cut is mid-recording (8 ms in, 25 ms out) so the edge is not a step; a natural clip edge is
 * kept as recorded. That is a cut's edge, not a join: there is one piece and nothing is placed beside it.
 *
 * ENCODED BY THE REAL LAME BINARY, NEVER BY FFMPEG'S MP3 MUXER (job #427). ffmpeg's muxer writes an ID3v2 wrapper and an
 * "Lavf…" encoder tag, which is the iOS playback bug; export Step 2 (audio-processor checkMp3Format) refuses such a file
 * as BADLY ENCODED and blocks publishing the whole course. So ffmpeg only filters to WAV here and lame writes the MP3,
 * with the same arguments as audio-processor's ffmpegFilterToLameMp3. ingest-cut.test.cjs asserts the format.
 */
function cutSpan(bytes, { startSec, endSec }) {
  const sourceDurationSec = durationOf(bytes)
  const end = Math.min(endSec, sourceDurationSec), len = end - startSec
  const af = [`atrim=start=${startSec.toFixed(4)}:end=${end.toFixed(4)}`, 'asetpts=PTS-STARTPTS']
  if (startSec > 0.001) af.push('afade=t=in:st=0:d=0.008')
  if (end < sourceDurationSec - 0.01) af.push(`afade=t=out:st=${Math.max(0, len - 0.025).toFixed(4)}:d=0.025`)
  const wav = ffmpeg(['-i', 'pipe:0', '-af', af.join(','), '-ar', '48000', '-ac', '1', '-f', 'wav', 'pipe:1'], bytes)
  const out = lameMp3(wav, { bitrate: 96, channels: 1 })
  return { bytes: out, durationSec: durationOf(out), sourceDurationSec }
}

/** clip-tail-audit.py on bytes on disk (its id column takes a local path since job #374): the parsed JSON line. */
function tailAuditBytes(bytes) {
  const fs = require('fs'), os = require('os'), path = require('path')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-cut-'))
  const f = path.join(dir, 'cut.mp3')
  try {
    fs.writeFileSync(f, bytes)
    const r = require('child_process').spawnSync('python3', [TAIL_AUDIT], { input: `cut,${f},1\n`, encoding: 'utf8', timeout: 60000 })
    const line = (r.stdout || '').split('\n').find((l) => l.startsWith('{'))
    try { return line ? JSON.parse(line) : { error: `tail audit printed nothing (${String(r.stderr || '').slice(0, 120)})` } } catch { return { error: 'tail audit output unreadable' } }
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

async function fetchServedRef(r) {
  const res = await fetch(`${AUDIO_BASE}/${r}`, { headers: { 'User-Agent': 'popty ingest-cut' }, signal: AbortSignal.timeout(30000) })
  if (!res.ok) throw new Error(`learner proxy HTTP ${res.status} for ${r}`)
  return Buffer.from(await res.arrayBuffer())
}

/**
 * The route's deps. `sb` = supabase-js client (owner), `s3` = an S3Client, `bucket` = the audio bucket.
 * Stored exactly as phase8 stores a render (services/phases/phase8-audio-v13.cjs store): mastered/<UUID>.mp3, then a
 * course_audio row (origin 'tts' — the CHECK allows tts|human, and a cut of a TTS clip is machine audio), then the
 * clip_index write-through. INSERT, never upsert: an upsert on the UNIQUE key would repoint a clip someone else links.
 */
function liveDeps({ sb, s3, bucket, logger = console, rollbackPath }) {
  const { PutObjectCommand } = require('@aws-sdk/client-s3')
  const { AUDIO_CACHE_CONTROL } = require('./audio-cache-control.cjs')
  const clipIndex = require('./clip-index.cjs')
  const { decodeMono } = require('./intro-splice.cjs')
  const { hashVerdict } = require('../../tools/audio/dice-splice-zho.cjs')
  return {
    db: sb,
    fetchServed: (clip) => fetchServedRef(ref(clip.id, clip.audio_revision)),
    cut: async (bytes, span) => cutSpan(bytes, span),
    decode: decodeMono,
    hashVerdict,
    tailAudit: async (bytes) => tailAuditBytes(bytes),
    store: async ({ courseCode, text, language, role, voiceId, legoId, bytes, durationMs }) => {
      const s3Key = `mastered/${crypto.randomUUID().toUpperCase()}.mp3`
      await s3.send(new PutObjectCommand({ Bucket: bucket, Key: s3Key, Body: bytes, ContentType: 'audio/mpeg', CacheControl: AUDIO_CACHE_CONTROL }))
      const { data: row, error } = await sb.from('course_audio').insert({
        course_code: courseCode, text, text_normalized: normalizeForAudio(text), language, role, voice_id: voiceId,
        lego_id: legoId || null, origin: 'tts', s3_key: s3Key, duration_ms: durationMs, file_size_bytes: bytes.length,
      }).select('id').single()
      if (error) throw new Error(`course_audio insert failed: ${error.message} (object ${s3Key} is in S3, unlinked)`)
      await clipIndex.writeThrough(sb, [{ id: row.id, course_code: courseCode, text, language, voice_id: voiceId, s3_key: s3Key, origin: 'tts' }], 'ingest-cut', logger)
      return { audioId: String(row.id), s3Key }
    },
    servedCheck: async (audioId) => {
      let bytes
      try { bytes = await fetchServedRef(audioId) } catch (e) { return e.message }
      if (bytes.length < 2000) return `the proxy serves only ${bytes.length} bytes`
      const t = tailAuditBytes(bytes)
      if (t.error) return `served tail audit could not measure (${t.error})`
      return t.click ? `the served clip clicks at its tail (spike ${Number(t.tail_spike).toFixed(1)})` : null
    },
    appendRollback: async (line) => {
      try { require('fs').appendFileSync(rollbackPath, JSON.stringify(line) + '\n'); return rollbackPath } catch (e) { if (logger.warn) logger.warn(`[ingest-cut] rollback file not written (${e.message}); the line rides in the answer`); return null }
    },
    now: () => new Date().toISOString(),
  }
}

module.exports = { liveDeps, cutSpan, tailAuditBytes, ingestCut, refuseDescriptor, rollbackLine, undoBody, bareText, CutRefusal }

/**
 * Point a seed, LEGO or practice-phrase audio slot at a clip that ALREADY EXISTS in course_audio.
 * Job #388 (2026-10-14): courses change only through Popty, so the scripted "link this clip to that
 * slot" step agents used to do over SQL or a borrowed service key (Aran's Welsh v2 sandboxes, #321,
 * #333) needs a Popty door. Route: POST /api/production/:courseCode/link-clip (production-api).
 *
 * Rules, each one a refusal rather than a warning:
 *   - The clip must exist, and its words must be the slot's words: known → known_text,
 *     target1/target2 → target_text (normalizeForDb on both sides). presentation is exempt — an intro
 *     clip carries its own framing words, not the LEGO's.
 *   - FILL-ONLY by default. A filled slot is replaced only with replace:true AND expectCurrent equal to
 *     the clip the slot holds now, so a caller can never overwrite a link it has not looked at.
 *   - The write is conditional on the slot still holding what was read (is null / = current); a
 *     concurrent change comes back as RACE and nothing is written.
 *   - No clip is ever deleted here. The new clip already exists, so make-before-break holds by
 *     construction; retiring the old clip is a separate, approved act.
 *   - One courses.content_version patch bump per request that moved a pointer — a repoint is invisible
 *     to a phone holding the cached bundle otherwise.
 */
const { normalizeForDb } = require('./text-normalize.cjs')
const { bumpCourseVersion } = require('./course-version.cjs')

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LEGO_ID = /^S(\d{4})L(\d{2})$/
const ROLES = ['known', 'target1', 'target2', 'presentation']
// A POD SENTENCE is a slot too (job #391): { podSentenceId, role: 'target'|'known' } names
// listening_pod_sentences.target_audio_id / known_audio_id; the sentence must belong to a pod of
// this course, and a line whose target text is still a DRAFT refuses a target clip unless
// allowDraft:true — pod audio is never attached to text nobody has read (A-109).
const POD_ROLES = ['target', 'known']
const TABLE = { seed: 'course_seeds', lego: 'course_legos', phrase: 'course_practice_phrases', pod_sentence: 'listening_pod_sentences' }
// course_seeds has no presentation slot; a pod sentence has one target and one known slot.
const HAS_ROLE = (kind, role) => kind === 'pod_sentence'
  ? POD_ROLES.includes(role)
  : ROLES.includes(role) && !(kind === 'seed' && role === 'presentation')
const ROLES_FOR = (kind) => (kind === 'pod_sentence' ? POD_ROLES : ROLES.filter((r) => HAS_ROLE(kind, r)))
// Seeds and phrases carry last_edit_event_id (the seed and phrase edit routes stamp it).
const STAMPS_EVENT = { seed: true, lego: false, phrase: true, pod_sentence: false }

function slotOf(link) {
  if (link.podSentenceId) return { kind: 'pod_sentence', label: String(link.podSentenceId) }
  if (link.phraseId) return { kind: 'phrase', label: String(link.phraseId) }
  if (link.legoId) {
    const m = LEGO_ID.exec(String(link.legoId))
    if (!m) return { error: `legoId must look like S0012L03, got ${link.legoId}` }
    return { kind: 'lego', label: link.legoId, seedNumber: Number(m[1]), legoIndex: Number(m[2]) }
  }
  if (link.seedNumber != null && Number.isInteger(Number(link.seedNumber))) return { kind: 'seed', label: `S${String(link.seedNumber).padStart(4, '0')}`, seedNumber: Number(link.seedNumber) }
  return { error: 'name the slot with exactly one of seedNumber, legoId, phraseId or podSentenceId' }
}

async function linkOne(db, courseCode, link, { dryRun }) {
  const slot = slotOf(link)
  const base = { slot: slot.label, role: link.role, audioId: link.audioId }
  if (slot.error) return { ...base, ok: false, code: 'BAD_SLOT', error: slot.error }
  if (!HAS_ROLE(slot.kind, link.role)) return { ...base, ok: false, code: 'BAD_ROLE', error: `role must be one of ${ROLES_FOR(slot.kind).join(', ')} for a ${slot.kind}` }
  if (!UUID.test(String(link.audioId || ''))) return { ...base, ok: false, code: 'BAD_AUDIO_ID', error: 'audioId must be a course_audio uuid' }

  const table = TABLE[slot.kind]
  const col = `${link.role}_audio_id`
  let q = slot.kind === 'pod_sentence'
    ? db.from(table).select(`id, pod_id, known_text, target_text, target_text_draft, ${col}`)
    : db.from(table).select(`id, known_text, target_text, ${col}`).eq('course_code', courseCode)
  if (slot.kind === 'pod_sentence') q = q.eq('id', slot.label)
  else if (slot.kind === 'phrase') q = q.eq('id', slot.label)
  else if (slot.kind === 'lego') q = q.eq('seed_number', slot.seedNumber).eq('lego_index', slot.legoIndex)
  else q = q.eq('seed_number', slot.seedNumber)
  const { data: row, error: rowErr } = await q.maybeSingle()
  if (rowErr) return { ...base, ok: false, code: 'READ_FAILED', error: rowErr.message }
  if (!row) return { ...base, ok: false, code: 'NO_SLOT', error: `${courseCode} has no ${slot.kind} ${slot.label}` }
  if (slot.kind === 'pod_sentence') {
    const { data: pod, error: podErr } = await db.from('listening_pods').select('id, course_code').eq('id', row.pod_id).maybeSingle()
    if (podErr) return { ...base, ok: false, code: 'READ_FAILED', error: podErr.message }
    if (!pod || pod.course_code !== courseCode) return { ...base, ok: false, code: 'NO_SLOT', error: `${courseCode} has no pod sentence ${slot.label}` }
    if (link.role === 'target' && row.target_text_draft && link.allowDraft !== true) {
      return { ...base, ok: false, code: 'DRAFT_TEXT', error: `${slot.label} is still a draft; approve its text first, or send allowDraft:true` }
    }
  }

  const { data: clip, error: clipErr } = await db.from('course_audio').select('id, text, voice_id').eq('id', link.audioId).maybeSingle()
  if (clipErr) return { ...base, ok: false, code: 'READ_FAILED', error: clipErr.message }
  if (!clip) return { ...base, ok: false, code: 'NO_CLIP', error: `no course_audio row ${link.audioId}` }
  if (link.role !== 'presentation') {
    const want = link.role === 'known' ? row.known_text : row.target_text
    if (normalizeForDb(String(clip.text || '')) !== normalizeForDb(String(want || ''))) {
      return { ...base, ok: false, code: 'TEXT_MISMATCH', error: `clip says "${clip.text}", slot says "${want}"` }
    }
  }

  const current = row[col] == null ? null : String(row[col])
  const out = { ...base, before: current, voiceId: clip.voice_id }
  if (current === String(link.audioId)) return { ...out, ok: true, changed: false }
  if (current && !(link.replace === true && link.expectCurrent === current)) {
    return { ...out, ok: false, code: 'SLOT_FILLED', error: `slot holds ${current}; send replace:true with expectCurrent:"${current}" to replace it` }
  }
  if (dryRun) return { ...out, ok: true, changed: true, dryRun: true }
  // The words the clip was checked against (and a pod line's draft state) ride into the write as
  // conditions: an edit between read and write comes back as RACE instead of a clip on changed words
  // (lanes review of fbd3a7e). presentation is exempt from the text check, so carries none.
  const guards = []
  if (link.role !== 'presentation') { const c = link.role === 'known' ? 'known_text' : 'target_text'; guards.push([c, row[c] ?? null]) }
  if (slot.kind === 'pod_sentence' && link.role === 'target') guards.push(['target_text_draft', row.target_text_draft ?? null])
  return { ...out, ok: true, changed: true, rowId: row.id, table, col, kind: slot.kind, guards }
}

/**
 * links: [{ seedNumber | legoId | phraseId, role, audioId, replace?, expectCurrent? }]
 * recordEdit: ({ scope, detail }) => eventId — the content-edit gate's req.contentEdit.record.
 */
async function linkClips({ db, courseCode, links, dryRun = false, recordEdit = null, bump = bumpCourseVersion }) {
  if (!Array.isArray(links) || !links.length) return { ok: false, code: 'NO_LINKS', error: 'links must be a non-empty array' }
  if (links.length > 500) return { ok: false, code: 'TOO_MANY', error: 'at most 500 links per request' }
  const results = []
  for (const link of links) results.push(await linkOne(db, courseCode, link || {}, { dryRun }))
  const toWrite = results.filter((r) => r.ok && r.changed && !r.dryRun)
  if (!toWrite.length) return { ok: results.every((r) => r.ok), dryRun, results: results.map(strip), linked: 0 }

  const eventId = recordEdit ? await recordEdit({
    scope: {
      seed_numbers: [...new Set(toWrite.filter((r) => r.kind === 'seed').map((r) => Number(r.slot.slice(1))))],
      lego_ids: toWrite.filter((r) => r.kind === 'lego').map((r) => r.slot),
      phrase_ids: toWrite.filter((r) => r.kind === 'phrase').map((r) => r.slot),
      pod_sentence_ids: toWrite.filter((r) => r.kind === 'pod_sentence').map((r) => r.slot),
      rows: toWrite.length,
    },
    detail: { links: toWrite.map((r) => ({ slot: r.slot, role: r.role, before: r.before, after: r.audioId })) },
  }) : null

  let linked = 0
  for (const r of toWrite) {
    const set = { [r.col]: r.audioId }
    if (eventId && STAMPS_EVENT[r.kind]) set.last_edit_event_id = eventId
    let u = db.from(r.table).update(set).eq('id', r.rowId)
    u = r.before == null ? u.is(r.col, null) : u.eq(r.col, r.before)
    for (const [c, v] of r.guards || []) u = v == null ? u.is(c, null) : u.eq(c, v)
    const { data, error } = await u.select('id')
    if (error) Object.assign(r, { ok: false, code: 'WRITE_FAILED', error: error.message })
    else if (!data || !data.length) Object.assign(r, { ok: false, code: 'RACE', error: 'the slot or its words changed between read and write; nothing written' })
    else linked++
  }
  const contentVersion = linked ? await bump(db, courseCode, 'patch') : null
  return { ok: results.every((r) => r.ok), dryRun, eventId, contentVersion, linked, results: results.map(strip) }
}

const strip = ({ rowId, table, col, kind, guards, ...r }) => r

module.exports = { linkClips, slotOf }

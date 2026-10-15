/**
 * Set a listening pod's metadata.solo_readers through Popty (job #391, 2026-10-14).
 *
 * Since #388/#391 agents cannot write listening_pods with a key of their own, and Aran's Welsh
 * work needs to switch a pod between "read solo by these voices" and "cast by its speakers"
 * (e.g. cym_s_for_eng:guess-i-love-you → []). Route: PATCH /api/production/:courseCode/pod/:podId/solo-readers.
 *
 * What the list MEANS is pod-solo-readers.cjs; this only writes it, and only it: every other
 * metadata key is kept as read. The write is conditional on the pod's updated_at being what was
 * read (RACE otherwise). `[]` is a legal value and means "no solo readers" — soloReaders() treats an
 * empty list as none, so the pod falls back to its speakers.
 */
const VOICE_ID = /^[A-Za-z0-9_.:-]{1,120}$/

function podIdFor(courseCode, podId) {
  const id = String(podId || '').trim()
  return id.includes(':') ? id : `${courseCode}:${id}`
}

async function setSoloReaders({ db, courseCode, podId, soloReaders, dryRun = false, recordEdit = null }) {
  if (!Array.isArray(soloReaders) || !soloReaders.every((v) => typeof v === 'string' && VOICE_ID.test(v))) {
    return { ok: false, status: 400, code: 'BAD_READERS', error: 'solo_readers must be an array of voice ids (strings); [] clears it' }
  }
  if (new Set(soloReaders).size !== soloReaders.length) {
    return { ok: false, status: 400, code: 'BAD_READERS', error: 'solo_readers names a voice twice' }
  }
  const id = podIdFor(courseCode, podId)
  const { data: pod, error } = await db.from('listening_pods').select('id, course_code, metadata, updated_at').eq('id', id).maybeSingle()
  if (error) return { ok: false, status: 500, code: 'READ_FAILED', error: error.message }
  if (!pod || pod.course_code !== courseCode) return { ok: false, status: 404, code: 'NO_POD', error: `${courseCode} has no pod ${id}` }

  const metadata = pod.metadata && typeof pod.metadata === 'object' ? pod.metadata : {}
  const before = Object.prototype.hasOwnProperty.call(metadata, 'solo_readers') ? metadata.solo_readers : null
  const out = { ok: true, podId: id, before, after: soloReaders }
  if (JSON.stringify(before) === JSON.stringify(soloReaders)) return { ...out, changed: false }
  if (dryRun) return { ...out, changed: true, dryRun: true }

  if (recordEdit) await recordEdit({ scope: { pod_ids: [id], rows: 1 }, detail: { solo_readers: { before, after: soloReaders } } })
  const next = { ...metadata, solo_readers: soloReaders }
  const { data, error: wErr } = await db.from('listening_pods')
    .update({ metadata: next, updated_at: new Date().toISOString() })
    .eq('id', id).eq('updated_at', pod.updated_at).select('id')
  if (wErr) return { ok: false, status: 500, code: 'WRITE_FAILED', error: wErr.message }
  if (!data || !data.length) return { ok: false, status: 409, code: 'RACE', error: 'the pod metadata changed between read and write; nothing written' }
  return { ...out, changed: true }
}

module.exports = { setSoloReaders, podIdFor }

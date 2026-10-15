// THE RE-RECORD CARD (Aran, 2026-10-15, job #788): "give me a 're-record' card on my recording
// page, where all the misses get dumped together."
//
// The server sends two reasons a line is on the card (services/voice-engine/booth-rerecord.cjs):
// 'skipped' (unrecorded, before the furthest line he reached in a batch he started) and
// 'text_changed' (its words were edited after he recorded it). The third reason only this device
// knows: a take the server REFUSED, whose bytes never left the browser. They are merged here.
//
// THE RULE THAT MATTERS MOST: a line with a take STILL UPLOADING from this device is never a miss.
// It is on its way up, and counting it would send him to read it twice. So anything unsent is
// taken off, whatever the server says, and so is anything saved since the list was read.

/** The few words the card shows for why a line is there. */
export function whyWords(why, lastError = '') {
  if (why === 'skipped') return 'skipped'
  if (why === 'text_changed') return 'text changed'
  const e = String(lastError || '')
  // The server's own sentences (services/recording-speech-gate.cjs MESSAGES), most specific first.
  if (/cut off|truncat/i.test(e)) return "didn't save: start cut off"
  if (/longer than the line|exceeds/i.test(e)) return "didn't save: too long"
  if (/speech|silen|quiet|audible|noise|hear your voice/i.test(e)) return "didn't save: no speech"
  return "didn't save"
}

/**
 * @param {object} p
 * @param {object[]} p.serverItems the /rerecord answer's items, in course order
 * @param {string[]} [p.recordedAlso] refused-take line ids the server says now have a good take
 * @param {object[]} [p.refusedTakes] the device's refused takes: {lineId, text, lastError}
 * @param {Set<string>|string[]} [p.unsent] line ids with a take still waiting to upload
 * @param {Set<string>|Map<string,*>|string[]} [p.saved] line ids saved from this device since
 * @returns {object[]} rows: {lineId, why, words, text, oldText, track, batch}
 */
export function mergeRerecord({ serverItems = [], recordedAlso = [], refusedTakes = [], unsent = [], saved = [] } = {}) {
  const has = (s) => (s instanceof Set || s instanceof Map ? (id) => s.has(id) : ((set) => (id) => set.has(id))(new Set(s || [])))
  const isUnsent = has(unsent)
  const isSaved = has(saved)
  const isNowRecorded = has(recordedAlso)
  const refusedById = new Map()
  for (const t of refusedTakes || []) if (t && t.lineId) refusedById.set(t.lineId, t)
  const out = []
  const seen = new Set()
  for (const it of serverItems || []) {
    if (!it || seen.has(it.lineId) || isUnsent(it.lineId) || isSaved(it.lineId)) continue
    seen.add(it.lineId)
    const refused = refusedById.get(it.lineId)
    // A refusal is the newest thing known about a line: it says what happened to his last try.
    const why = refused ? 'refused' : it.why
    out.push({ ...it, why, words: whyWords(why, refused && refused.lastError) })
  }
  for (const t of refusedById.values()) {
    if (seen.has(t.lineId) || isUnsent(t.lineId) || isSaved(t.lineId) || isNowRecorded(t.lineId)) continue
    seen.add(t.lineId)
    out.push({ lineId: t.lineId, why: 'refused', words: whyWords('refused', t.lastError), text: t.text || '', oldText: null, track: null, batch: null })
  }
  return out
}

/** The ids the re-record batch asks the server to add: refused takes it may not have listed. */
export function alsoIds(refusedTakes = []) {
  return [...new Set((refusedTakes || []).map(t => t && t.lineId).filter(Boolean))]
}

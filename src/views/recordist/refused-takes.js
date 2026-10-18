// THE REFUSED TAKES THE BOOTH HOME LISTS (Aran, 2026-10-15, live bug): the banner said "7 takes the
// server would not accept. They are listed below with the reason." and nothing was listed, so there
// was no way to see or re-record them. A refused take on the device knows only its line id, the
// words and the server's reason; where that line sits (section, batch) comes from the queue.
//
// Batches are cut exactly as the server cut them (services/voice-engine/booth-home.cjs): lines are
// grouped by track key in queue order, and seed and LEGO tracks are chunked by 100. Keep them in step.

const BATCH_LINES = 100

export function trackKeyOf(line) {
  const kind = line.kind || 'pod'
  if (kind === 'phrase') return `phrase.${line.phrasePass || 1}`
  if (kind === 'seed') return `seed.${line.courseCode || 'all'}`
  if ((kind === 'pod' || kind === 'takeg') && line.podSlug) return `pod.${line.podSlug}`
  return `${kind}.${line.courseCode || 'all'}`
}

function batchSizeOf(key) {
  return key.startsWith('seed.') || key.startsWith('lego.') ? BATCH_LINES : 0
}

/** lineId → { track, batch } over the whole queue (recorded lines included). */
export function placeLines(lines, tracks = []) {
  const byTrack = new Map()
  for (const l of lines || []) {
    const key = trackKeyOf(l)
    if (!byTrack.has(key)) byTrack.set(key, [])
    byTrack.get(key).push(l)
  }
  const placed = new Map()
  for (const [key, ls] of byTrack) {
    const size = batchSizeOf(key)
    if (key.startsWith('phrase.')) {
      // The queue only carries the batch it serves; the card's `current` batch is that one.
      const t = tracks.find(x => x.key === key)
      const cur = t && (t.batches || []).find(b => b.current)
      for (const l of ls) placed.set(l.id, { track: key, batch: cur ? cur.n : 1 })
      continue
    }
    ls.forEach((l, i) => placed.set(l.id, { track: key, batch: size ? Math.floor(i / size) + 1 : 1 }))
  }
  return placed
}

/**
 * The rows of the list. `takes` are the live refused takes from the device; `lines` is the queue
 * once it has been read (null until then). A take whose line is not in the queue any more is `gone`.
 */
export function refusedRows({ takes, lines, tracks = [] }) {
  const byId = new Map((lines || []).map(l => [l.id, l]))
  const placed = lines ? placeLines(lines, tracks) : new Map()
  return (takes || []).map(t => {
    const line = byId.get(t.lineId)
    const at = placed.get(t.lineId)
    const track = at && tracks.find(x => x.key === at.track)
    const batch = track && (track.batches || []).find(b => b.n === at.batch)
    let batchName = null
    if (at) {
      if (track && track.kind === 'phrase') batchName = batch ? `${batch.courseLabel ? `${batch.courseLabel} ` : ''}batch ${batch.batch}`.trim() : `Batch ${at.batch}`
      else batchName = track && track.batches && track.batches.length > 1 ? `Batch ${at.batch}` : (track ? 'Whole script' : `Batch ${at.batch}`)
    }
    return {
      lineId: t.lineId,
      text: (line && line.text) || t.text || '',
      knownText: (line && line.knownText) || null,
      reason: refusedLineWords(t.lastError),
      reasonFull: t.lastError || '',
      section: track ? (track.title || track.short) : (at ? at.track : null),
      batchName,
      track: at ? at.track : null,
      batch: at ? at.batch : null,
      // locating = the queue has not been read yet; gone = the queue no longer has this line
      state: !lines ? 'locating' : (line ? 'open' : 'gone'),
    }
  })
}

// THE REASON IN A FEW WORDS (Aran, 2026-10-15, live): a refused line comes back up as a normal line
// to read, with one small line under it — "Last take didn't save: no speech heard" — never the
// server's whole paragraph over the words he is meant to be reading. The home list says the same
// words. The server's own sentence is kept (as a tooltip) for anyone who needs the detail.
// Patterns follow the server's wording: services/recording-upload-helpers.cjs (silent floor,
// processing fault) and MESSAGES in services/recording-speech-gate.cjs, plus the booth's own
// client-side silent check in RecordistRoom.vue.
const REASONS = [
  [/no audible speech|didn't capture any speech|came out silent/i, 'no speech heard'],
  [/background noise|steady noise/i, 'only background noise heard'],
  [/caught the room|far longer than the line/i, 'it caught the room, not your voice'],
  [/cut off at both ends/i, 'cut off at both ends'],
  [/starts right on your first word|beginning of it is cut off/i, 'the first word was cut off'],
  [/runs off the end|last word is cut off/i, 'the last word was cut off'],
  [/could not process it|fault our end|processing failed/i, 'a fault on our server, not yours'],
]
export function shortRefusalReason(text) {
  const s = String(text || '').trim()
  if (!s) return 'the server would not take it'
  for (const [re, words] of REASONS) if (re.test(s)) return words
  const first = s.split(/(?<=[.!?])\s/)[0].replace(/[.!?]+$/, '')
  return first.length > 80 ? `${first.slice(0, 77).trimEnd()}…` : first
}
export function refusedLineWords(text) {
  return `Last take didn't save: ${shortRefusalReason(text)}`
}

/**
 * REFUSED TAKES WHOSE LINE IS GONE (F55): the server's own list, plus any take whose line neither
 * the full queue read nor the batch on screen nor a kept place holds. A line the device has
 * placed, or the batch is showing, is not gone — the full queue read can simply not have carried it.
 */
export function goneRefusedLineIds({ serverGone = [], refusedTakes = [], queueLines = null, batchLines = [], placed = {} }) {
  const ids = new Set(serverGone)
  if (!queueLines) return [...ids]
  const have = new Set([...queueLines, ...batchLines].map((l) => l.id))
  for (const t of refusedTakes) if (!have.has(t.lineId) && !(placed && placed[t.lineId])) ids.add(t.lineId)
  return [...ids]
}

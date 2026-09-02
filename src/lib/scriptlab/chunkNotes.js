/**
 * chunkNotes — READ the chunk mapping a pod line carries on `author_notes`.
 *
 * ONE DIRECTION ONLY, AND THAT IS THE WHOLE POINT. This module parses the note
 * for DISPLAY. It has no serialiser and must never grow one: the note is a
 * human's working text — the parser at tools/pods/parse-health-overlay.cjs wrote
 * the first draft of it and Aran and Catrin will write the rest — and a screen
 * that parsed it into a grid, let someone edit the grid, and wrote the grid back
 * out would silently replace their words with our rendering. The editor edits
 * the RAW STRING. This function only reads it.
 *
 * The shape it reads, from chunkNote() in parse-health-overlay.cjs:
 *
 *   Chunk mapping (D deterministic · S split · I inversion · E erasure):
 *   if I say *(core)* → os dw i'n deud 🏔 [D] — Welsh present in the if-clause
 *
 * Everything after the arrow is optional: a line may carry no class and no note.
 * Anything that does not match is NOT discarded and NOT guessed at — it comes
 * back in `unparsed` so the panel can show it as the raw words it is.
 */

/** The letters chunkNote() emits, and what its own header line calls them. */
export const CLASS_LABELS = { D: 'deterministic', S: 'split', I: 'inversion', E: 'erasure' }

/** Deterministic is 142 of the 205 Welsh chunks; these three are the contested ones. */
export const CONTESTED = ['S', 'I', 'E']

/**
 * The north/south divergence glyph, as it stands in the Welsh column of the
 * source document — copied verbatim through the parser onto the row, so this is
 * a count of a mark a human made, never one we infer. Both mountain glyphs are
 * admitted, with or without the emoji variation selector.
 */
const GLYPH_RE = /[\u{1F3D4}\u{26F0}]/u

const ARROW = '→'
const HEADER_RE = /^Chunk mapping\b/
/* The class tag only counts where chunkNote() puts it: at the end of the Welsh,
   followed by the note's em-dash or by nothing. Without that lookahead a "[D]"
   inside somebody's prose would be read as a classification. */
const CLASS_RE = /\s\[([DSIE])\](?=\s—\s|\s*$)/

const empty = raw => ({
  ok: false,
  raw: typeof raw === 'string' ? raw : '',
  header: '',
  chunks: [],
  counts: { D: 0, S: 0, I: 0, E: 0 },
  unclassified: 0,
  total: 0,
  glyphCount: 0,
  unparsed: []
})

/**
 * @param {string} text the stored author_notes
 * @returns {{ok:boolean, raw:string, header:string, chunks:Array, counts:object,
 *            unclassified:number, total:number, glyphCount:number, unparsed:string[]}}
 *          `ok: false` means "there is nothing here I can render as chunks" — the
 *          caller shows `raw`. It never throws and never invents a chunk.
 */
export function parseChunkNote (text) {
  if (typeof text !== 'string' || !text.trim()) return empty(text)

  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const header = HEADER_RE.test(lines[0].trim()) ? lines[0].trim() : ''
  const body = (header ? lines.slice(1) : lines).map(l => l.trim()).filter(Boolean)

  const out = empty(text)
  out.header = header

  for (const line of body) {
    const a = line.indexOf(ARROW)
    if (a < 0) { out.unparsed.push(line); continue }

    const chunk = line.slice(0, a).trim()
    let rest = line.slice(a + ARROW.length).trim()
    if (!chunk && !rest) { out.unparsed.push(line); continue }

    let klass = ''
    let note = ''
    const m = rest.match(CLASS_RE)
    if (m) {
      klass = m[1]
      const tail = rest.slice(m.index + m[0].length).trim()
      rest = rest.slice(0, m.index).trim()
      note = tail.startsWith('—') ? tail.slice(1).trim() : tail
    } else {
      const d = rest.indexOf(' — ')
      if (d >= 0) { note = rest.slice(d + 3).trim(); rest = rest.slice(0, d).trim() }
    }

    const glyph = GLYPH_RE.test(rest)
    out.chunks.push({ chunk, target: rest, klass, label: CLASS_LABELS[klass] || '', note, glyph })
    if (klass) out.counts[klass] += 1
    else out.unclassified += 1
    if (glyph) out.glyphCount += 1
  }

  out.total = out.chunks.length
  out.ok = out.total > 0
  return out
}

/**
 * The closed-state chip, as segments so the panel can weight the contested
 * classes without re-deriving them. A class with a zero count is omitted rather
 * than printed as "0 S" — and so is the glyph segment, because a row with no
 * divergence mark should say nothing about divergence at all.
 */
export function chipSegments (parsed) {
  if (!parsed?.ok) return []
  const segs = [{ key: 'total', text: `${parsed.total} chunk${parsed.total === 1 ? '' : 's'}`, contested: false }]
  for (const k of ['D', 'S', 'I', 'E']) {
    if (!parsed.counts[k]) continue
    segs.push({ key: k, text: `${parsed.counts[k]} ${k}`, contested: CONTESTED.includes(k), label: CLASS_LABELS[k] })
  }
  if (parsed.unclassified) segs.push({ key: 'un', text: `${parsed.unclassified} unclassified`, contested: true, label: 'no class recorded' })
  if (parsed.glyphCount) segs.push({ key: 'glyph', text: `glyph ${parsed.glyphCount}`, contested: false, label: 'north/south divergence marked in the source' })
  return segs
}

// Whole-course search for the proof pages (/proof/phrases, /proof/legos). The pages hold every row of the course in
// memory but only some of it is in the DOM (the phrase list is windowed; the LEGO list hides taught/part rows), so the
// browser's own find cannot see most of the course. This searches the rows themselves. Pure: no DOM, no Vue.

// Case and accents ignored, curly apostrophes read as straight ones: "dwr" finds "dŵr", "Mae'n" finds "mae’n".
function foldChar(c) {
  return c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[‘’ʼ]/g, "'")
}
export function fold(s) {
  let out = ''
  for (const c of s || '') out += foldChar(c)
  return out
}

// Indices into `rows` whose folded text (from `textsOf(row)`, an array of strings) contains the folded query.
export function findHits(rows, q, textsOf) {
  const fq = fold(q.trim())
  if (!fq) return []
  const out = []
  for (let i = 0; i < rows.length; i++) if (textsOf(rows[i]).some((t) => t.includes(fq))) out.push(i)
  return out
}

// `text` cut into [{ t, hit }] pieces, the hits being every place the folded query matches the folded text, mapped
// back onto the original characters so the accents shown are the course's own.
export function markParts(text, q) {
  const fq = fold((q || '').trim())
  if (!text || !fq) return [{ t: text || '', hit: false }]
  let folded = ''
  const from = []                  // from[j] = index in `text` of the char that folded char j came from
  for (let i = 0; i < text.length;) {
    const c = String.fromCodePoint(text.codePointAt(i))
    const f = foldChar(c)
    for (let k = 0; k < f.length; k++) from.push(i)
    folded += f
    i += c.length
  }
  from.push(text.length)
  const parts = []
  let at = 0
  for (let j = folded.indexOf(fq); j >= 0; j = folded.indexOf(fq, j + fq.length)) {
    const a = from[j]
    const b = from[j + fq.length]
    if (a > at) parts.push({ t: text.slice(at, a), hit: false })
    parts.push({ t: text.slice(a, b), hit: true })
    at = b
  }
  if (at < text.length) parts.push({ t: text.slice(at), hit: false })
  return parts.length ? parts : [{ t: text, hit: false }]
}

// The same pieces split at character `cut` (the phrase page keeps the last word and the flag together).
export function splitParts(parts, cut) {
  const head = []
  const tail = []
  let at = 0
  for (const p of parts) {
    const end = at + p.t.length
    if (end <= cut) head.push(p)
    else if (at >= cut) tail.push(p)
    else { head.push({ t: p.t.slice(0, cut - at), hit: p.hit }); tail.push({ t: p.t.slice(cut - at), hit: p.hit }) }
    at = end
  }
  return [head, tail]
}

// The hit to start on when the query changes: the first one at or after the row the reader is on, else the first.
export function firstHitFrom(hits, rowIndex) {
  if (!hits.length) return -1
  const k = hits.findIndex((i) => i >= rowIndex)
  return k < 0 ? 0 : k
}

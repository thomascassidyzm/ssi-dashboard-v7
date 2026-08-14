/**
 * Free placement of a known-language gloss tile — PURE, so the one rule that
 * decides what an editor's tap does can be read and tested without a browser.
 *
 * Tom, 2026-08-14: "I need to be able to position any item in the known
 * language underneath any item in the target language … we need to be able to
 * move any known tile to match any target tile and change the order of the
 * known words as well — but never the target words of course."
 *
 * So: any known word, to any chunk, at any position within it. What this
 * CANNOT do is the other half of that sentence, and the guarantees fall out of
 * that:
 *
 *  - spans are copied through untouched, so the TARGET columns never move,
 *    never merge, never reorder — the target row is not addressable here at all;
 *  - the words out are the words in, as a multiset: none is added, dropped or
 *    retyped. The API's re-pairing gate therefore passes by construction rather
 *    than by luck, and no edit can smuggle in untranslated text;
 *  - nothing touches known_text or target_text, so no clip can go stale, no
 *    audio pass is owed, and no re-translate or TTS render is reachable.
 *
 * Returns null for a move that changes nothing, so an idle tap never writes.
 */
export interface GlossSegment {
  span: number
  known: string
}

export interface TilePosition {
  /** Index of the chunk. */
  seg: number
  /** Index within that chunk's gloss words. */
  at: number
}

export const glossWords = (s: string): string[] =>
  (s || '').trim().split(/\s+/).filter(Boolean)

export function moveGlossWord(
  segments: GlossSegment[],
  from: TilePosition,
  to: TilePosition,
): GlossSegment[] | null {
  if (!Array.isArray(segments) || !segments.length) return null
  const words = segments.map(s => glossWords(s.known))
  const src = words[from.seg]
  if (!src || from.at < 0 || from.at >= src.length) return null
  if (!words[to.seg]) return null

  const [moved] = src.splice(from.at, 1)

  // The landing slots were numbered while the word was still in place, so a
  // slot in the SAME chunk beyond the gap has shifted down by one.
  let at = to.at
  if (to.seg === from.seg) {
    if (at > from.at) at--
    if (at === from.at) { src.splice(from.at, 0, moved); return null }
  }
  at = Math.max(0, Math.min(at, words[to.seg].length))
  words[to.seg].splice(at, 0, moved)

  const next = segments.map((s, i) => ({ span: s.span, known: words[i].join(' ') }))
  if (next.every((s, i) => s.known === segments[i].known)) return null
  return next
}

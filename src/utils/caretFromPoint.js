/**
 * caretFromPoint — where in the string did the thumb actually land?
 *
 * Tom, 2026-09-03, on the booth's edit-in-place: "we DO need to think of making
 * it as smooth as possible." An artist taps the word they want to change. If the
 * field opens with everything selected, or with the caret parked at the end,
 * they have to look at the tool and aim again before they can fix the line —
 * and the whole point is that they never stop looking at the line.
 *
 * So: given the element whose text was tapped and the tap's page coordinates,
 * this returns the character offset into that element's PLAIN TEXT. The caller
 * puts the caret there. Null when the browser cannot say, in which case the
 * caller should leave the caret alone rather than guess.
 *
 * The offset is counted by walking the element's own text nodes in order, so it
 * is correct through the <span> segments a narration line is rendered as — the
 * spans' text concatenated IS the plain text the editor is opened with.
 */
export function caretOffsetFromPoint(el, clientX, clientY) {
  if (!el || typeof document === 'undefined') return null

  let node = null
  let offset = 0
  // Two names for one thing: the standard one, and the one WebKit and older
  // Chromium ship. Neither exists in jsdom, hence the null path.
  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(clientX, clientY)
    if (!pos) return null
    node = pos.offsetNode
    offset = pos.offset
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(clientX, clientY)
    if (!range) return null
    node = range.startContainer
    offset = range.startOffset
  } else {
    return null
  }

  if (!node || !el.contains(node)) return null

  // Sum every text node that comes before the one that was hit.
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let seen = 0
  let n
  while ((n = walker.nextNode())) {
    if (n === node) return seen + offset
    seen += (n.nodeValue || '').length
  }
  return null
}

/**
 * Open a textarea without moving anything. No scroll jump (the page is already
 * where the artist put it), and the caret where they tapped rather than a
 * select-all that turns the next keystroke into a deleted line.
 */
export function openEditorAt(textarea, offset) {
  if (!textarea) return
  try { textarea.focus({ preventScroll: true }) } catch { textarea.focus() }
  if (offset == null) return
  const at = Math.max(0, Math.min(offset, textarea.value.length))
  try { textarea.setSelectionRange(at, at) } catch { /* not a text input */ }
}

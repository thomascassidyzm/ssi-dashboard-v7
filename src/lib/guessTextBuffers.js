/**
 * The /guess text editor's edit boxes. A reload (after a save, or on load) must never wipe what the
 * editor has typed and not yet saved: a buffer is replaced only when it holds NOTHING unsaved.
 *
 *   edits      — reactive map  key → text in the box
 *   oldBase    — key → live content before the reload
 *   newItems   — items from the reload  ({ kind, id, live })
 *   submitted  — { [key]: text } just saved; that box is refreshed ONLY if it still holds exactly that
 *                text (typing done while the save was pending is kept, and stays dirty against the new live text)
 */
export const bufferKey = (it) => `${it.kind}|${it.id}`
export const baselineOf = (it) => (it.live ? it.live.content : '')
export const isDirty = (text, base) => text !== undefined && text.trim() !== (base || '').trim()

export function reconcileBuffers(edits, oldBase, newItems, submitted = {}) {
  for (const it of newItems) {
    const k = bufferKey(it)
    const cur = edits[k]
    const clean = cur === undefined || !isDirty(cur, oldBase[k])
    const justSaved = k in submitted && cur !== undefined && cur.trim() === submitted[k].trim()
    if (clean || justSaved) edits[k] = baselineOf(it)
  }
}

export const anyDirty = (edits, items) => items.some(it => isDirty(edits[bufferKey(it)], baselineOf(it)) && edits[bufferKey(it)].trim() !== '')

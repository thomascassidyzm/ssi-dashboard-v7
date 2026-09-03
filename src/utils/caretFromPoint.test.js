// @vitest-environment jsdom
/**
 * The caret goes where the thumb went. Tom, 2026-09-03: "we DO need to think of
 * making it as smooth as possible."
 *
 * The bit that can be silently wrong is the offset walk. A narration line is
 * rendered as several <span> segments, so the tapped text node is not the whole
 * line — and a caret placed at the offset WITHIN one span lands in the wrong
 * word every time the tap is not in the first one.
 */
import { describe, it, expect, vi } from 'vitest'
import { caretOffsetFromPoint, openEditorAt } from './caretFromPoint'

function lineOf(...segments) {
  const p = document.createElement('p')
  for (const t of segments) {
    const span = document.createElement('span')
    span.textContent = t
    p.appendChild(span)
  }
  document.body.appendChild(p)
  return p
}

/** jsdom has neither caret API, so the browser's answer is stubbed. */
function browserSays(node, offset) {
  document.caretPositionFromPoint = () => (node ? { offsetNode: node, offset } : null)
}

describe('caretOffsetFromPoint', () => {
  it('counts through every earlier segment, not just the one that was tapped', () => {
    const p = lineOf('Dw i mynd ', 'i', "'r dre")
    // Tapped 2 characters into the THIRD span. Naively that is offset 2; the
    // whole line's offset is 13.
    browserSays(p.childNodes[2].firstChild, 2)
    expect(caretOffsetFromPoint(p, 10, 10)).toBe(13)
  })

  it('is the plain offset on an ordinary one-segment line', () => {
    const p = lineOf('Bore da, Sarah')
    browserSays(p.firstChild.firstChild, 5)
    expect(caretOffsetFromPoint(p, 10, 10)).toBe(5)
  })

  it('answers null rather than guessing when the tap is outside the line', () => {
    const p = lineOf('Bore da')
    const elsewhere = document.createElement('div')
    elsewhere.textContent = 'somewhere else'
    document.body.appendChild(elsewhere)
    browserSays(elsewhere.firstChild, 3)
    expect(caretOffsetFromPoint(p, 10, 10)).toBeNull()
  })

  it('answers null when the browser has no caret API at all', () => {
    const p = lineOf('Bore da')
    delete document.caretPositionFromPoint
    delete document.caretRangeFromPoint
    expect(caretOffsetFromPoint(p, 10, 10)).toBeNull()
  })
})

describe('openEditorAt', () => {
  function box(value) {
    const el = document.createElement('textarea')
    el.value = value
    document.body.appendChild(el)
    return el
  }

  it('never scrolls the page to the field — it is already where they put it', () => {
    const el = box('Bore da')
    el.focus = vi.fn()
    openEditorAt(el, 3)
    expect(el.focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('puts the caret at the offset, and selects nothing', () => {
    const el = box('Bore da, Sarah')
    openEditorAt(el, 5)
    expect(el.selectionStart).toBe(5)
    // A select-all turns the next keystroke into a deleted line.
    expect(el.selectionEnd).toBe(5)
  })

  it('clamps rather than throwing when the offset runs past the text', () => {
    const el = box('Bore da')
    openEditorAt(el, 999)
    expect(el.selectionStart).toBe(7)
  })

  it('leaves the caret alone when the browser could not say where the tap was', () => {
    const el = box('Bore da')
    el.setSelectionRange(2, 2)
    openEditorAt(el, null)
    expect(el.selectionStart).toBe(2)
  })
})

// THE WHOLE BATCH ON THE RAIL AT ONCE (Aran, 2026-10-16, job #286): "about 200 lines is the right
// batch size", so on a desktop every square of a batch up to ~250 lines is on screen while he reads,
// with no scrolling. The rail used to be ten 14px columns at any length: 196 squares needed 354px and
// the recording rows took that away, cutting off the current line's row and the legend.
//
// Given n squares and the box they must fit (px, already less the legend), this picks the column
// count and square size that make the squares as big as possible while ALL of them fit. Never
// larger than the old 14px square on a 4px gap, and ten columns whenever ten columns are as good as
// any. Below MIN_SQ the squares would be too small to tap, so they stop shrinking and the rail
// scrolls (scroll: true) — that only happens past several hundred lines on a short window.
export const MAX_SQ = 14
export const MAX_GAP = 4
export const MIN_SQ = 5
export const PREFERRED_COLS = 10

function gapFor(pitch) {
  return pitch >= 14 ? MAX_GAP : pitch >= 9 ? 3 : 2
}

function layout(n, cols, width, height) {
  const rows = Math.ceil(n / cols)
  // pitch = square + gap; the last column and row carry no trailing gap
  const pitch = Math.min((width + MAX_GAP) / cols, (height + MAX_GAP) / rows, MAX_SQ + MAX_GAP)
  const gap = gapFor(pitch)
  let sq = Math.min(MAX_SQ, Math.floor(pitch - gap))
  while (sq > 1 && (cols * (sq + gap) - gap > width || rows * (sq + gap) - gap > height)) sq--
  return { cols, rows, sq, gap }
}

export function fitRail({ n, width, height }) {
  if (!(n > 0) || !(width > 0) || !(height > 0)) return { cols: PREFERRED_COLS, sq: MAX_SQ, gap: MAX_GAP, scroll: false }
  let best = null
  const first = Math.min(PREFERRED_COLS, n)
  // ten first, so ten wins every tie; then more columns (a tall batch in a short window), then fewer
  const order = [first]
  for (let c = first + 1; c <= Math.min(n, 60); c++) order.push(c)
  for (let c = first - 1; c >= 1; c--) order.push(c)
  for (const cols of order) {
    const l = layout(n, cols, width, height)
    if (cols * (l.sq + l.gap) - l.gap > width) continue
    if (!best || l.sq > best.sq) best = l
  }
  if (!best || best.sq < MIN_SQ) {
    // Too many to fit at a size that can be tapped: the smallest usable square, as many columns
    // as the width takes, and the rail scrolls with the current line kept in view.
    const gap = 2
    const cols = Math.max(1, Math.floor((width + gap) / (MIN_SQ + gap)))
    return { cols, rows: Math.ceil(n / cols), sq: MIN_SQ, gap, scroll: true }
  }
  return { ...best, scroll: false }
}

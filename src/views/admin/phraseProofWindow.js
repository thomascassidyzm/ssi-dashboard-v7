// Pure helpers for the phrase proof page (job #562): the belt stripe and the windowed list. No DOM, no Vue, so they test alone.

// The 8 SSi belts in order, hex values as the learning app paints them
// (ssi-learning-app packages/player-vue/src/composables/useBeltProgress.ts, BELTS[].color).
export const BELTS = [
  { name: 'white', color: '#ffffff' },
  { name: 'yellow', color: '#fcd34d' },
  { name: 'orange', color: '#fb923c' },
  { name: 'green', color: '#4ade80' },
  { name: 'blue', color: '#60a5fa' },
  { name: 'purple', color: '#a78bfa' },
  { name: 'brown', color: '#a8856c' },
  { name: 'black', color: '#1a1a1a' },
]

// Aran, 2026-10-13: the course's phrases divided EVENLY into the 8 belts, so the stripe says how far down the course a row is.
// `n` is the row's running number over the whole course (1..total), never its place in a filtered list.
export function beltIndex(n, total) {
  if (!total || n < 1) return 0
  return Math.min(BELTS.length - 1, Math.floor(((n - 1) * BELTS.length) / total))
}

// tops[i] = the y of row i inside the list; tops[N] = the list's full height.
export function prefixTops(heights) {
  const tops = new Float64Array(heights.length + 1)
  for (let i = 0; i < heights.length; i++) tops[i + 1] = tops[i] + heights[i]
  return tops
}

// The row at y: the last i with tops[i] <= y (clamped to 0..N-1).
export function rowAt(tops, y) {
  const n = tops.length - 1
  if (n <= 0) return 0
  let lo = 0, hi = n - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (tops[mid] <= y) lo = mid; else hi = mid - 1
  }
  return lo
}

// The slice [start, end) to render for a viewport [top, bottom] in list coordinates, with `over` px either side.
export function windowRange(tops, top, bottom, over) {
  const n = tops.length - 1
  if (n <= 0) return [0, 0]
  return [rowAt(tops, top - over), Math.min(n, rowAt(tops, bottom + over) + 1)]
}

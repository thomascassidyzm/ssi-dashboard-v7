// src/views/recordist/recorded-sections.js
//
// THE LIST OF WHAT HE HAS ALREADY READ, IN THE SAME SECTIONS AS THE QUEUE.
//
// Tom, 2026-09-04, looking at a flat list of 168 rows with a small POD-1 /
// SENEDD tag repeated down the side of it: "it would be great if Aran could see
// the lines already recorded by expandable section methinks — POD-1 / SENEDD /
// NEW SEEDS". The queue half of that screen was already split into named
// sections; this half was the inconsistent half.
//
// Pure on purpose, and it takes the heading and the order as ARGUMENTS rather
// than knowing any section names of its own. The two halves of the screen must
// agree, and a second copy of the strings "POD-1" and "SENEDD" living here is
// exactly how they would come to disagree — so the caller hands in the heading
// function the queue already uses and the heading order the queue already
// computed, and this file only does the grouping.
//
// THE INVARIANT: the section counts always add back up to the rows this
// function was given (after filtering). A recorded line that vanishes from the
// list is the one failure this panel cannot afford — he would read it again for
// nothing — so nothing is ever dropped: a heading the queue's order does not
// know about is appended at the end rather than discarded.

/**
 * @param {Array} rows            the recorded lines, in list order
 * @param {object} opts
 * @param {(row) => string} opts.headingFor   which section a row belongs to
 * @param {string[]} [opts.order]             headings in the queue's own order
 * @param {string} [opts.filter]              the "Find a line…" text
 * @param {(row, q) => boolean} [opts.matchRow] does this row match the filter
 * @returns {Array<{key:string, heading:string, rows:Array, count:number, forceOpen:boolean}>}
 */
export function recordedSections(rows, { headingFor, order = [], filter = '', matchRow } = {}) {
  const q = String(filter || '').trim().toLowerCase()
  // A SEARCH MUST NEVER HIDE ITS OWN ANSWER. When he is filtering, the sections
  // that hold matches open themselves — a match sitting inside a collapsed
  // section is worse than no filter at all — and sections with nothing in them
  // are not drawn, so what is left on screen is only the hits.
  const kept = q && matchRow ? rows.filter(row => matchRow(row, q)) : rows

  const groups = new Map()
  for (const row of kept) {
    const heading = headingFor(row)
    if (!groups.has(heading)) groups.set(heading, [])
    groups.get(heading).push(row)
  }

  const rank = new Map(order.map((h, i) => [h, i]))
  const out = []
  let seen = 0
  for (const [heading, sectionRows] of groups) {
    out.push({
      key: heading,
      heading,
      rows: sectionRows,
      count: sectionRows.length,
      forceOpen: q.length > 0,
      // An unranked heading keeps its first-appearance order, after everything
      // the queue named. There should be none — both halves group the same
      // lines by the same function — but "should be none" is not "cannot be".
      _rank: rank.has(heading) ? rank.get(heading) : order.length + (seen++),
    })
  }
  out.sort((a, b) => a._rank - b._rank)
  return out.map(({ _rank, ...section }) => section)
}

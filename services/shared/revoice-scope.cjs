'use strict'
/**
 * Seed-ceiling scope for tools/revoice-clips.cjs (Sol review #519, 2026-10-11).
 *
 * The voicing policy hands a re-voice a seed ceiling (default 1-100). A clip is in scope only through a REFERENCE that sits
 * at a seed <= ceiling; a clip used only at seed 101 is never re-voiced, and a clip shared between seed 40 and seed 101 has
 * only its seed-40 pointers moved (the old clip stays for seed 101 — it is deleted only when nothing still points at it).
 * References with no seed (listening pod sentences, whose position is unbound from the course) are never in scope.
 */

/** The seed a link row sits at, or null when it has none. `row` carries seed_number (legos/phrases/seeds) or lego_id (introductions). */
function seedOfLink(table, row) {
  if (row && Number.isFinite(Number(row.seed_number)) && row.seed_number != null) return Number(row.seed_number)
  const m = row && /^S(\d+)L\d+/.exec(String(row.lego_id || ''))
  return m ? Number(m[1]) : null
}

/** In scope = has a seed and it is within the ceiling. No ceiling given = nothing is in scope (fail closed). */
function linkInScope(table, row, maxSeed) {
  const seed = seedOfLink(table, row)
  return seed != null && maxSeed != null && seed <= maxSeed
}

/** Split captured links ({table,col,rowId,seed}) into those the run may move and those it must leave alone. */
function splitLinks(links, maxSeed) {
  const inScope = [], outOfScope = []
  for (const l of links) (linkInScope(l.table, { seed_number: l.seed }, maxSeed) ? inScope : outOfScope).push(l)
  return { inScope, outOfScope }
}

module.exports = { seedOfLink, linkInScope, splitLinks }

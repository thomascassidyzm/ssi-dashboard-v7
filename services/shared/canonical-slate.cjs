'use strict'
/**
 * canonical-slate — which rows of a `canonical_pod_scenarios` slug are THE WALK,
 * and which are continuations attached to it.
 *
 * WHY THIS EXISTS. Tom's ruling, 2026-09-04: "A RECOVERY ATTACHES, IT DOES NOT
 * APPEND." A recovery half thickens a node of CORE — it is a second thing that
 * can happen at scene 2 sentence 1 — and it must not lengthen the walk a learner
 * already has. The table already draws exactly that distinction and has since the
 * sector pods were ingested:
 *
 *   UNIQUE (pod_slug, scene_number, sentence_number, variant_key)
 *
 * A row carrying a variant_key occupies the SAME (scene, sentence) coordinate as
 * the base row beside it, not the next one. That is a sibling, not a successor.
 * What was missing was any reader that honoured it: as of 2026-09-04 `variant_key`
 * was written by three ingest tools and READ BY NOTHING — the generator's
 * loadCanonicalScenes did not even select the column, so a variant row on a live
 * slate was, to every consumer, an ordinary extra line in the scene.
 *
 * THE RULE, and note that it is conservative by construction:
 *
 *   - A slug with NO base rows at all — health, retail, trades, hospitality,
 *     care-work, core-recoveries: every row carries a variant_key — is a FLOW
 *     BOOK. There is no walk to protect, so every row is in the slate and
 *     behaviour is byte-identical to before this file existed.
 *   - A slug that HAS base rows (variant_key IS NULL) has a walk. Its slate is
 *     its base rows; a variant row is a continuation attached to the coordinate
 *     it shares, and is excluded.
 *
 * So this changes NOTHING for any slug as it stood on 2026-09-04 — pod-1 had 231
 * base rows and zero variants, the sector slugs are all-variant — and it is what
 * makes it safe for pod-1 to hold both.
 *
 * WHAT IT IS NOT. It does not make a continuation REACHABLE. The per-course layer
 * (`listening_pod_sentences`) has no variant column and the player groups a pod by
 * scene_number in global_order with no notion of a branch, so a recovery stored
 * here is canon that is attached but not yet served. That gap is deliberate and
 * reported, not papered over.
 */

/** True if this row is part of the slug's linear walk, given the slug's own shape. */
function isBaseRow(row) {
  return row == null || row.variant_key == null
}

/** True if any row of this slug is a base row — i.e. the slug has a walk to protect. */
function hasBaseRows(rows) {
  return (rows || []).some(isBaseRow)
}

/**
 * The walk of a canonical slug: its base rows if it has any, otherwise every row.
 * Order is preserved exactly as given — this filters, it never sorts.
 */
function baseSlate(rows) {
  const all = rows || []
  return hasBaseRows(all) ? all.filter(isBaseRow) : all
}

/** The continuations: rows excluded by baseSlate(). Empty for a flow book. */
function continuations(rows) {
  const all = rows || []
  return hasBaseRows(all) ? all.filter(r => !isBaseRow(r)) : []
}

module.exports = { isBaseRow, hasBaseRows, baseSlate, continuations }

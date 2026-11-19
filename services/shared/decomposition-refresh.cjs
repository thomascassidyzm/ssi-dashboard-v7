// services/shared/decomposition-refresh.cjs
//
// THE CONTENT-KEYED DECOMPOSITION REFRESH, as a pure planner (Tom 2026-10-14,
// r-2026-10-14-kai-is-team-his-agents-get). Ported from
// tools/course-optimization/refresh-stale-phrase-decompositions.cjs so an agent
// can ask Popty for it (POST /api/admin/recompute-decompositions) instead of
// running a script against the database.
//
// Staleness is CONTENT, not the version stamp: a block is stale when its stored
// `known` gloss disagrees with the CURRENT known_text of the lego_id it names
// (the version-keyed backfill cannot see 71% of decompositions). Each stale
// phrase is recomputed with decomposeAnchored, which keeps the salient anchor.
//
// This module reads nothing and writes nothing: it turns rows into
// `phrase.update` ops for the course-edit engine, which runs them in one
// transaction with a dry run, an undo and a before-state assertion (`expect`).
// Only `decomposition` and `decomposition_course_version` are ever set.

const { decomposeAnchored } = require('../phrase-decomposer.cjs');

const norm = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Compare by CONTENT: jsonb normalises key order, so raw JSON.stringify lies. */
const canon = (v) =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === 'object' && !Array.isArray(val)
      ? Object.fromEntries(Object.keys(val).sort().map((k) => [k, val[k]]))
      : val);

const legoIdOf = (seed, index) =>
  `S${String(seed).padStart(4, '0')}L${String(index).padStart(2, '0')}`;

/**
 * A block is STALE when it names a lego_id, carries a non-empty gloss, and that
 * gloss disagrees with the slot's current known_text (or the slot is gone).
 * Only the `known` side is tested: a block's target is legitimately a partial of
 * the LEGO surface on the insert-split path.
 */
function staleBlocks(decomposition, legoById) {
  if (!Array.isArray(decomposition)) return [];
  const out = [];
  for (const b of decomposition) {
    const id = b?.legoId;
    if (!id) continue;
    const lego = legoById.get(id);
    if (!lego) { out.push({ legoId: id, storedKnown: b.known ?? '', currentKnown: null, reason: 'lego_gone' }); continue; }
    const stored = b.known ?? '';
    if (!stored) continue;
    if (norm(stored) !== norm(lego.known_text)) {
      out.push({ legoId: id, storedKnown: stored, currentKnown: lego.known_text, reason: 'gloss_drift' });
    }
  }
  return out;
}

/**
 * @param {Object} a
 * @param {string} a.courseCode
 * @param {Array}  a.legos     course_legos rows: seed_number, lego_index, target_text, known_text
 * @param {Array}  a.phrases   course_practice_phrases rows: id, seed_number, lego_index, target_text, decomposition
 * @param {number|null} a.courseVersion  stamped into decomposition_course_version
 * @param {Set<string>} [a.forceIds]  phrase ids to recompute even when no gloss has drifted: the
 *   LEGO in a slot they name was just edited, deleted or re-inserted, so a tile can carry the right
 *   gloss and the wrong word (a target-only edit). Recomputed, and written unless unchanged.
 * @returns {{ops: Array, rows: Array, summary: Object}}
 */
function planRecompute({ courseCode, legos, phrases, courseVersion = null, forceIds = null }) {
  const vocabulary = legos.map((l) => ({
    lego_id: legoIdOf(l.seed_number, l.lego_index),
    target_text: l.target_text,
    known_text: l.known_text,
    seed_number: l.seed_number,
  }));
  const legoById = new Map(vocabulary.map((l) => [l.lego_id, l]));
  const ops = [];
  const rows = [];
  const summary = { considered: phrases.length, fresh: 0, rewrite: 0, skipped_parent_unlocatable: 0, skipped_no_improvement: 0, skipped_recompute_failed: 0 };

  for (const p of phrases) {
    const stale = staleBlocks(p.decomposition, legoById);
    const forced = !!(forceIds && forceIds.has(p.id));
    if (stale.length === 0 && !forced) { summary.fresh++; continue; }

    const parentId = legoIdOf(p.seed_number, p.lego_index);
    const parentLego = legoById.get(parentId) || null;
    const vocabForPhrase = vocabulary.filter((l) => l.seed_number <= p.seed_number);

    let result;
    try {
      result = decomposeAnchored(p.target_text, vocabForPhrase, parentLego, courseCode);
    } catch (e) {
      summary.skipped_recompute_failed++;
      rows.push({ id: p.id, status: 'SKIP_RECOMPUTE_THREW', target_text: p.target_text, stale, error: e.message });
      continue;
    }
    // kind 'error' = the phrase does not cleanly contain its own LEGO: a content
    // defect for a human. Recomputing would drop the salient anchor, so leave it.
    if (result.kind === 'error') {
      summary.skipped_parent_unlocatable++;
      rows.push({ id: p.id, status: 'SKIP_PARENT_UNLOCATABLE', parent: parentId, target_text: p.target_text, stale });
      continue;
    }
    const residual = staleBlocks(result.blocks, legoById);
    const unchanged = canon(result.blocks) === canon(p.decomposition);
    if ((residual.length > 0 && !forced) || unchanged) {
      summary.skipped_no_improvement++;
      rows.push({ id: p.id, status: 'SKIP_NO_IMPROVEMENT', target_text: p.target_text, stale, residual, unchanged });
      continue;
    }

    summary.rewrite++;
    rows.push({ id: p.id, status: 'REWRITE', parent: parentId, target_text: p.target_text, stale, kind: result.kind, before: p.decomposition, after: result.blocks });
    ops.push({
      op: 'phrase.update',
      phrase_id: p.id,
      set: { decomposition: result.blocks, decomposition_course_version: courseVersion },
      expect: { decomposition: p.decomposition },
    });
  }
  return { ops, rows, summary };
}

/**
 * TILES FOLLOW THE LEGO (cs #937, Kai's Watson finding #930, /d/c4220fd2). A tile names a SLOT
 * (S0519L01), not a word. When the LEGO in a slot is edited in place, deleted, or deleted and
 * re-inserted, every tile anywhere in the course naming that slot shows the new word ("ancora"
 * drawn as "bambino"). lego.reorder already relabels tiles; this covers the other LEGO-changing
 * ops, inside the SAME transaction as the edit, so the dry run previews it and the undo carries it.
 *
 * Reads the phrases whose tiles name any of `slotIds`, recomputes them content-keyed against the
 * course's LEGOs as they stand inside the transaction, and writes decomposition +
 * decomposition_course_version. Phrases in `skipPhraseIds` (deleted in this batch, or whose
 * decomposition the caller set explicitly — e.g. an undo restoring it) are left alone. A phrase
 * that does not cleanly contain its own LEGO is not rewritten (that needs a person) and is reported.
 *
 * @returns {Promise<{rewritten: Array<{id, before, beforeVersion, after}>, unlocatable: string[], considered: number}>}
 */
async function refreshTilesForSlots(client, courseCode, slotIds, { skipPhraseIds = new Set(), eventId = null } = {}) {
  const ids = [...new Set(slotIds)].filter(Boolean);
  const out = { rewritten: [], unlocatable: [], considered: 0 };
  if (!ids.length) return out;
  const { rows: phrases } = await client.query(
    `SELECT id, seed_number, lego_index, target_text, decomposition, decomposition_course_version FROM course_practice_phrases
      WHERE course_code = $1 AND jsonb_typeof(decomposition) = 'array'
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(decomposition) e
                     WHERE jsonb_typeof(e) = 'object' AND e ->> 'legoId' = ANY($2::text[]))`,
    [courseCode, ids]);
  const candidates = phrases.filter((p) => !skipPhraseIds.has(p.id));
  out.considered = candidates.length;
  if (!candidates.length) return out;
  const { rows: legos } = await client.query(
    `SELECT seed_number, lego_index, target_text, known_text FROM course_legos WHERE course_code = $1`, [courseCode]);
  const { rows: ver } = await client.query(`SELECT version FROM courses WHERE course_code = $1`, [courseCode]);
  const plan = planRecompute({ courseCode, legos, phrases: candidates, courseVersion: ver[0]?.version ?? null,
    forceIds: new Set(candidates.map((p) => p.id)) });
  out.unlocatable = plan.rows
    .filter((r) => r.status === 'SKIP_PARENT_UNLOCATABLE' || r.status === 'SKIP_RECOMPUTE_THREW').map((r) => r.id);
  const byId = new Map(candidates.map((p) => [p.id, p]));
  for (const op of plan.ops) {
    const params = [JSON.stringify(op.set.decomposition), op.set.decomposition_course_version, op.phrase_id];
    if (eventId) params.push(eventId);
    await client.query(
      `UPDATE "course_practice_phrases" SET "decomposition" = $1, "decomposition_course_version" = $2${eventId ? ', "last_edit_event_id" = $4' : ''} WHERE "id" = $3`,
      params);
    const was = byId.get(op.phrase_id);
    out.rewritten.push({ id: op.phrase_id, before: was.decomposition, beforeVersion: was.decomposition_course_version ?? null, after: op.set.decomposition });
  }
  return out;
}

module.exports = { planRecompute, refreshTilesForSlots, staleBlocks, canon, legoIdOf };

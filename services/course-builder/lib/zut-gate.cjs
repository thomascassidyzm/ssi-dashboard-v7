/**
 * Shared ZUT-gate wiring for content-write routes and direct-DB scripts.
 *
 * Wraps checkPhraseZUT (validation.cjs) — never reimplements it — so every
 * write path that inserts/edits known->target phrase text rejects with the
 * same shape the golden path (seed-complete.cjs) uses for its LEGO-level
 * ZUT gate (checkLegoConflict).
 */
const { checkPhraseZUT } = require('./validation.cjs');

function zutErrorBody(collisions) {
  const isMembership = collisions.length > 0 && collisions.every(c => c.type === 'target_membership');
  return {
    error: isMembership ? 'ZUT violation: component not part of its sentence' : 'ZUT violation: ambiguous prompt',
    collisions,
    skills: ['ralph-methodology.md'],
    hint: isMembership
      ? 'A component row\'s target_text must be a genuine constituent of its own seed\'s target sentence. '
        + 'Re-tile the decomposition or fix the component\'s target. See ralph-methodology.md.'
      : 'Same known text cannot map to a different target than the course already teaches. '
        + 'Upchunk with context, use a synonym, or consolidate to the existing target. See ralph-methodology.md.',
  };
}

// Pre-insert check for NEW known/target rows — nothing in the DB yet for
// these phrases, so it's safe to check before writing.
// phrases: [{ known, target, role, seedNumber }, ...]
// role: 'component' opts a phrase into the component known-side exemption +
// target-membership check in checkPhraseZUT (see validation.cjs); omit for
// build/use phrases. seedNumber is required alongside role:'component'.
// currentSeedNumber: null checks the whole course (use for routes writing
// into an already-decomposed course, where later seeds may already exist).
async function checkNewPhrases(supabase, courseCode, phrases, currentSeedNumber = null) {
  return checkPhraseZUT(supabase, courseCode, phrases, currentSeedNumber);
}

// Post-write check for an IN-PLACE EDIT of an existing row. Pre-checking an
// edit would self-collide (the row's own pre-edit target is still live in
// the DB when checked), so this checks AFTER the write — which naturally
// clears the self-collision, since the row now matches its own new value —
// and rolls the row back if the edit exposed a genuine collision against a
// DIFFERENT row.
async function checkEditedPhrase(supabase, courseCode, { table, id, known, target, role, seedNumber, revertFields }) {
  const collisions = await checkPhraseZUT(supabase, courseCode, [{ known, target, role, seedNumber }], null);
  if (collisions.length === 0) return { ok: true, collisions: [] };
  await supabase.from(table).update(revertFields).eq('id', id);
  return { ok: false, collisions };
}

module.exports = { checkNewPhrases, checkEditedPhrase, zutErrorBody };

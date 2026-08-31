#!/usr/bin/env node
/**
 * THE UNION WINDOW — what vocabulary a SECTOR basket owns, across two threads.
 *
 * sector-helix §6, verbatim: "The gate itself does not change; only what feeds
 * it. ... For a sector basket at (segment seed N, lego k), the caller feeds it
 * the UNION: every base-course lego and component up to `core_anchor_lego_id`,
 * plus the segment's own rows up to (N, k). One merged input, same functions,
 * same whole-chunk discipline — no re-conjugation, no substring luck, 'tú'
 * inside 'estúpido' is still not ownership."
 *
 * So this file is a QUERY CHANGE, NOT A LOGIC CHANGE. It calls availability.cjs's
 * `availableVocab` twice — once per thread, each with its own position — and
 * concatenates. It contains no matching of its own, deliberately: the moment
 * this file starts deciding what counts as owned, the whole-chunk gate has two
 * implementations and one of them is wrong.
 *
 * The anchor bounds the BASE thread only. It does NOT bound ZUT — that is the
 * whole family, unbounded, and lives in services/course-builder/lib/course-family.cjs.
 *
 * READ-ONLY: pure functions over rows somebody else read, plus one paginated
 * loader that reads them.
 */
const { availableVocab } = require('./availability.cjs');
const { loadCorpus, pageAll } = require('./corpus.cjs');

/**
 * The merged window for a segment basket at (seed, legoIndex).
 *   base    — { legos, components } from the BASE course (any range; bounded here)
 *   segment — { legos, components } from the SEGMENT course
 *   family  — { anchor: { seed_number, lego_index } | null }
 *
 * A null anchor means the base thread contributes NOTHING: an unstated anchor is
 * an unknown position, and spending base material the learner may not have met
 * is exactly the failure this window exists to prevent. Absence, not a guess.
 */
function unionVocab({ base = null, segment = null, family = null, seed, legoIndex = null }) {
  const out = [];
  const anchor = family && family.anchor;
  if (base && anchor) {
    // The base thread's own position: everything through the anchor's seed-1,
    // plus legos 1..anchor.lego_index of the anchor seed. `availableVocab`'s
    // legoIndex is EXCLUSIVE (lego k sees 1..k-1), and the anchor lego itself
    // HAS been played, so the bound is anchor.lego_index + 1.
    // `availableVocab` assumes its rows were already fetched `lte(seed)` (that
    // is `loadCorpus`'s contract), so the bound is applied here before handing
    // off rather than trusted to a function that never promised it.
    const upTo = (rows) => (rows || []).filter(r => +r.seed_number <= anchor.seed_number);
    out.push(...availableVocab({
      legos: upTo(base.legos), components: upTo(base.components),
      seed: anchor.seed_number, legoIndex: anchor.lego_index + 1,
    }));
  }
  if (segment) {
    out.push(...availableVocab({
      legos: segment.legos || [], components: segment.components || [], seed, legoIndex,
    }));
  }
  // de-duplicate on the same key availableVocab uses, keeping first (base) sight
  const seen = new Set(), merged = [];
  for (const v of out) {
    const k = v.kind + '|' + String(v.known_text).toLowerCase() + '|' + String(v.target_text).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    merged.push(v);
  }
  return merged;
}

/**
 * `loadCorpus` for a segment: the segment's own corpus at `seed`, plus the base
 * course's legos and components up to the anchor. Same shape `loadCorpus`
 * returns, with `union` added and `baseLegos`/`baseComponents` kept separate so
 * a caller can still tell which thread minted a chunk.
 *
 * A course with no family falls straight through to `loadCorpus` — the 130
 * courses submitting seeds today take exactly the path they take now.
 */
async function loadUnionCorpus(sb, course, seed, family = null) {
  const own = await loadCorpus(sb, course, seed);
  if (!family || !family.baseCourseCode || family.baseCourseCode === course || !family.anchor) {
    return { ...own, union: availableVocab({ legos: own.legos, components: own.components, seed }),
             baseLegos: [], baseComponents: [], family: family || null };
  }
  const a = family.anchor;
  const [baseLegos, baseComponents] = await Promise.all([
    pageAll(sb, 'course_legos', 'seed_number,lego_id,lego_index,type,known_text,target_text',
      q => q.eq('course_code', family.baseCourseCode).lte('seed_number', a.seed_number)
             .order('seed_number').order('lego_index')),
    pageAll(sb, 'course_practice_phrases', 'seed_number,lego_index,known_text,target_text',
      q => q.eq('course_code', family.baseCourseCode).eq('phrase_role', 'component')
             .lte('seed_number', a.seed_number).order('seed_number').order('lego_index')),
  ]);
  return {
    ...own, baseLegos, baseComponents, family,
    union: unionVocab({ base: { legos: baseLegos, components: baseComponents },
                        segment: { legos: own.legos, components: own.components },
                        family, seed }),
  };
}

module.exports = { unionVocab, loadUnionCorpus };

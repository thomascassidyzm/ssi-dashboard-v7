// services/shared/debut-practice.cjs
//
// EVERY DEBUT LEGO HAS PRACTICE PHRASES (Tom, 2026-09-30 10:35Z): "If a LEGO is
// debuted - ie is_new = true - it NEEDS phrases when it is new, when it is
// introduced. If it is not new it has no introduction and so it does not need any
// practice phrases."
//
// Why the flag decides it: the learning app builds a round ONLY for an is_new LEGO
// and every review pool draws from those rounds (canon P25, verified in
// generateLearningScript.ts). So a debut with no USE phrase is presented and then
// never enters spaced repetition, and a not-new LEGO's basket is never played at all.
//
// What BLOCKS (the release gate, the sweep exit check):
//   - UNPRACTISED  — a debut whose seed-position floor asks for phrases and which has
//                    no BUILD or USE row that practises it;
//   - NO_USE       — a debut whose floor asks for USE and which has none, so it never
//                    reaches spaced repetition (the ita_for_eng S0190L01 case: four
//                    BUILD rows, two of them the bare LEGO, zero USE).
// A row whose target IS the bare LEGO never counts — it is the LEGO, not practice
// of it (phrase-structure.cjs partitionBareLegoPhrases, the same rule the writers use).
//
// What is REPORTED and never blocks: a debut below its full floor but not empty
// (THIN — canon P10/P23, Kai's ruling that coverage counts stay warnings), a not-new
// LEGO carrying phrases nobody hears (DARK — P25), and is_new flags that disagree
// with first appearance. Few phrases at course start is normal; the floor ramp is
// phrase-structure.cjs phraseFloor and nothing here restates it.

const { phraseFloor, isBareLegoPhrase } = require('../course-builder/lib/phrase-structure.cjs');

const normPair = (s) => String(s || '').toLowerCase()
  .replace(/[’`]/g, "'")
  .replace(/[.,!?;:"«»¿¡。？！，、()\-–—]+/g, ' ')
  .replace(/\s+/g, ' ').trim();

const legoIdOf = (l) => l.lego_id || `S${String(l.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`;

/**
 * Pure audit of one course.
 * @param {Array} legos    rows {seed_number, lego_index, is_new, known_text, target_text[, lego_id]}
 * @param {Array} phrases  rows {seed_number, lego_index, phrase_role, target_text} (components are ignored)
 * @returns {{debuts, blocking, thin, dark, isNew:{repeatNew, firstNotNew, neverDebuted}}}
 */
function auditDebutPractice(legos, phrases) {
  const byLego = new Map();
  for (const p of phrases || []) {
    if (p.phrase_role !== 'build' && p.phrase_role !== 'use') continue;
    const k = `${p.seed_number}:${p.lego_index}`;
    if (!byLego.has(k)) byLego.set(k, []);
    byLego.get(k).push(p);
  }

  const ordered = [...(legos || [])].sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  const blocking = [];
  const thin = [];
  const dark = [];
  let debuts = 0;

  for (const l of ordered) {
    const rows = byLego.get(`${l.seed_number}:${l.lego_index}`) || [];
    const practising = rows.filter((p) => !isBareLegoPhrase(p.target_text, l.target_text));
    const build = practising.filter((p) => p.phrase_role === 'build').length;
    const use = practising.filter((p) => p.phrase_role === 'use').length;
    const bare = rows.length - practising.length;
    const entry = {
      lego_id: legoIdOf(l), seed_number: l.seed_number, lego_index: l.lego_index,
      known_text: l.known_text, target_text: l.target_text, build, use, bare,
    };
    if (!l.is_new) {
      if (rows.length) dark.push({ ...entry, rows: rows.length });
      continue;
    }
    debuts += 1;
    const { minBuild, minUse } = phraseFloor(l.seed_number, l.lego_index);
    entry.minBuild = minBuild; entry.minUse = minUse;
    if (minBuild + minUse > 0 && build + use === 0) blocking.push({ ...entry, reason: 'UNPRACTISED' });
    else if (minUse > 0 && use === 0) blocking.push({ ...entry, reason: 'NO_USE' });
    else if (build < minBuild || use < minUse) thin.push(entry);
  }

  // is_new against first appearance: one debut per distinct known/target pair, at its first row.
  const groups = new Map();
  for (const l of ordered) {
    const k = `${normPair(l.known_text)}\u0000${normPair(l.target_text)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(l);
  }
  const repeatNew = [];
  const firstNotNew = [];
  const neverDebuted = [];
  for (const rows of groups.values()) {
    const first = rows[0];
    const anyNew = rows.some((r) => r.is_new);
    // every debut after the pair's FIRST debut is a repeat; a single late debut is firstNotNew below
    const news = rows.filter((r) => r.is_new);
    news.slice(1).forEach((r) => repeatNew.push({
      lego_id: legoIdOf(r), known_text: r.known_text, target_text: r.target_text, first_debut: legoIdOf(news[0]),
    }));
    if (!first.is_new) {
      const later = rows.find((r) => r.is_new);
      (anyNew ? firstNotNew : neverDebuted).push({
        lego_id: legoIdOf(first), known_text: first.known_text, target_text: first.target_text,
        ...(later ? { debuts_at: legoIdOf(later) } : {}),
      });
    }
  }

  return { debuts, blocking, thin, dark, isNew: { repeatNew, firstNotNew, neverDebuted } };
}

async function pageAll(query) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query().range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** Read one course (optionally only some seeds) and audit it. */
async function checkCourseDebutPractice(supabase, courseCode, { seeds = null } = {}) {
  const scoped = (q) => (seeds && seeds.length ? q.in('seed_number', seeds) : q);
  const legos = await pageAll(() => scoped(supabase.from('course_legos')
    .select('lego_id,seed_number,lego_index,is_new,known_text,target_text')
    .eq('course_code', courseCode))
    .order('seed_number').order('lego_index'));
  // Read in seed windows along the (course_code, seed_number, lego_index, position)
  // unique index: one OFFSET walk over a 20k-row course, or a keyset walk on the
  // text primary key, both hit the statement timeout (measured on ita_for_eng,
  // 2026-09-30).
  const phrases = [];
  const seedNums = [...new Set(legos.map((l) => l.seed_number))].sort((a, b) => a - b);
  const WINDOW = 20;
  for (let i = 0; i < seedNums.length; i += WINDOW) {
    const win = seedNums.slice(i, i + WINDOW);
    const rows = await pageAll(() => supabase.from('course_practice_phrases')
      .select('seed_number,lego_index,position,phrase_role,target_text')
      .eq('course_code', courseCode).in('seed_number', win).in('phrase_role', ['build', 'use'])
      .order('seed_number').order('lego_index').order('position'));
    phrases.push(...rows);
  }
  const audit = auditDebutPractice(legos, phrases);
  // A seed-scoped read cannot see first appearances elsewhere in the course.
  if (seeds && seeds.length) audit.isNew = null;
  return { courseCode, seeds: seeds || null, ...audit };
}

/** Statuses a learner can reach — the transition the release gate guards. */
const LEARNER_FACING = new Set(['beta', 'released', 'live']);

/**
 * THE RELEASE GATE. A course cannot be moved to beta or live while any debut LEGO
 * is unpractised or has no USE phrase. Demotion (to draft/testing) is never gated.
 * Returns {allowed, blocking, thinCount, darkCount}.
 */
async function releaseGate(supabase, courseCode, targetStatus) {
  if (!LEARNER_FACING.has(String(targetStatus))) return { allowed: true, gated: false };
  const audit = await checkCourseDebutPractice(supabase, courseCode);
  return {
    allowed: audit.blocking.length === 0,
    gated: true,
    debuts: audit.debuts,
    blocking: audit.blocking,
    thinCount: audit.thin.length,
    darkCount: audit.dark.length,
  };
}

function describeBlocking(b) {
  const why = b.reason === 'UNPRACTISED'
    ? 'no practice phrase at all'
    : `no USE phrase (${b.build} BUILD${b.bare ? `, ${b.bare} bare-LEGO row(s) not counted` : ''}) — never enters spaced repetition`;
  return `${b.lego_id} "${b.known_text}" → "${b.target_text}": ${why}`;
}

module.exports = {
  auditDebutPractice, checkCourseDebutPractice, releaseGate, describeBlocking, normPair, LEARNER_FACING,
};

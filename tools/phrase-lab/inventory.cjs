#!/usr/bin/env node
/**
 * PER-SEED INVENTORY — what does the learner actually own at seed N, and which
 * of it can a prompt reach for WITHOUT UNCERTAINTY?
 *
 * This is the plumbing under both halves of the phrase lab: the generator gets
 * its available vocabulary from here, and the checker adjudicates against the
 * SAME object, which is the only thing that makes a model comparison about the
 * generator rather than about the material.
 *
 * READ-ONLY. Writes nothing to the database, ever.
 *
 * THE TWO QUESTIONS IT ANSWERS
 *
 *   ATTESTED — has this exact thing been delivered by seed N? Every LEGO of
 *     seeds 1..N-1, plus the earlier LEGOs of seed N itself, plus the COMPONENTS
 *     of every M-LEGO among them.
 *
 *     Tom, 2026-08-28, on why components count: "we DO allow components of an
 *     M-LEGO that might NOT have been introduced as their own LEGOs, but they DO
 *     become available as legitimate vocab for the phrase generation." The test
 *     is ATTESTATION, not introduction. The line that matters is SEEN versus
 *     DERIVED: a component was on screen and in their ears; an inflection
 *     produced by a rule was never shown to anyone.
 *
 *     Same ruling on the bounds, and it is what makes this cheap: "if a LEGO is
 *     from SEED 300, i.e. S0300L01, then all content up to SEED N-1 is legit
 *     content." Availability is a QUERY OVER THE COURSE, not a judgement made by
 *     a model. Nothing gets to be generous.
 *
 *     CONFIRMED against the methodology rather than assumed — ralph-methodology
 *     .md:526: "LEGO N may draw on prior seeds plus LEGOs 1..N-1 — never a later
 *     sibling. No forward references." The filter below is written that way. Note
 *     that the live submission route's known-side context is NOT (it hands
 *     `checkKnownSide` every LEGO of the seed at once); that disagreement is
 *     recorded in docs/course-optimization/v3-surface-exact-availability-
 *     2026-08-28.md and is not this file's to resolve.
 *
 *   DETERMINISTIC — can a prompt ask for it with zero uncertainty? This is the
 *     muy/bien rule, and it is Tom's, verbatim (2026-08-27):
 *
 *       "muy bien = very well / muy - can be used later in a phrase where it
 *        also maps to 'very' / but / bien CANNOT be used because both good AND
 *        well could map to it"
 *
 *     The ambiguity that matters lives on the KNOWN side, in the known->target
 *     direction. Target->known reasoning looks fine and is exactly what misleads
 *     builders: "bien" is not ambiguous in Spanish; the PROMPT is ambiguous.
 *
 *     So an item is deterministic when its known gloss reaches exactly one
 *     target AND its target is reached by exactly one known gloss. Both
 *     directions, because a convergent target is precisely the case where a
 *     second English word could have been the one the learner reaches from.
 *
 * WHY THE AMBIGUITY TABLE IS BUILT COURSE-WIDE, NOT AT SEED N
 *
 *   ZUT is a course-wide invariant — same known, same target, ALWAYS, not
 *   "until seed N". A collision that appears at seed 500 makes the seed-100
 *   prompt ambiguous retrospectively, because the learner meets both. So
 *   introduction is a function of N; determinism is a function of the whole
 *   authored course. Reading it any other way would release "bien" at seed 40
 *   and take it away later, which is not a thing a course can do to a learner.
 *
 *   Empirical check that this reproduces Tom's own verdict on spa_for_eng:
 *     muy  <- {very}                          -> 1:1, RELEASED   (he said yes)
 *     bien <- {well, a good time, fine}       -> convergent, BLOCKED (he said no)
 *   The rule was not tuned to that answer; it fell out of it.
 *
 * WHAT IT CANNOT SEE, stated rather than scored as zero: target-language
 * polysemy the course never evidences. If Spanish "X" covers two English senses
 * but this course only ever glosses one of them, no table built from this course
 * can know. That residue is a judgement call, and the checker routes it to a
 * model rather than pretending it is computed.
 *
 * Usage:
 *   node tools/phrase-lab/inventory.cjs spa_for_eng 358
 *   node tools/phrase-lab/inventory.cjs spa_for_eng 206 --lego 2
 *   node tools/phrase-lab/inventory.cjs spa_for_eng 358 --json out.json
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s']/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');

/**
 * SURFACE-FORM key for a KNOWN gloss.
 *
 * TOM'S RULING, 2026-08-28: availability is keyed on the EXACT SURFACE FORM.
 *
 *   "agents think that inflections are basically ok, so they use them. they are
 *    not OK in this methodology. if I say: I drink / he drinks / is drinking /
 *    drinking more — do I have zero uncertainty about the target language I am
 *    being asked to produce? the answer is no, unless each of these has been
 *    introduced separately as their own distinct LEGO."
 *
 * So this key does NO stemming, NO lemmatisation, NO morphological expansion and
 * NO derivation of any kind. It folds ORTHOGRAPHY only — case, punctuation, and
 * English contractions, symmetrically on both sides of every comparison — because
 * "I'm" and "I am" are the same written form of the same ask, not two forms.
 *
 * WHAT IT DELIBERATELY NO LONGER FOLDS, and this is the fix: the infinitive
 * marker. The previous key stripped a leading/trailing "to", so "explain" and
 * "to explain" were one entry. That is a DERIVATION, and it is exactly the hole:
 * it made a form the learner has never been shown look like stock, when the two
 * English forms point at two different target forms. SEEN beats DERIVED.
 */
const CONTRACTIONS = [
  [/\bi'm\b/g, 'i am'], [/\bcan't\b/g, 'can not'], [/\bwon't\b/g, 'will not'],
  [/\bn't\b/g, ' not'], [/\b(\w+)'re\b/g, '$1 are'], [/\b(\w+)'ve\b/g, '$1 have'],
  [/\b(\w+)'ll\b/g, '$1 will'], [/\b(\w+)'d\b/g, '$1 would'],
  [/\bit's\b/g, 'it is'], [/\bthat's\b/g, 'that is'], [/\bhe's\b/g, 'he is'],
  [/\bshe's\b/g, 'she is'], [/\bthere's\b/g, 'there is'], [/\bwhat's\b/g, 'what is']
];

function surfaceKey(known) {
  let s = norm(known);
  for (const [re, to] of CONTRACTIONS) s = s.replace(re, to);
  return s.replace(/\s+/g, ' ').trim();
}

/** Every LEGO of a course, ordered, with its components flattened alongside. */
async function fetchAllLegos(supabase, courseCode) {
  const out = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('course_legos')
      .select('lego_id,seed_number,lego_index,type,known_text,target_text,components')
      .eq('course_code', courseCode)
      .order('seed_number', { ascending: true })
      .order('lego_index', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`course_legos read failed: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

/**
 * known->target and target->known maps over the WHOLE course's LEGOs and
 * components. Values are Maps so we keep the evidence (which LEGO said so)
 * rather than just a count — a block a learner cannot see the reason for is a
 * block nobody can act on.
 */
function buildMappingTable(legos) {
  const k2t = new Map();
  const t2k = new Map();
  const add = (k, t, src) => {
    const kn = surfaceKey(k);
    const tn = norm(t);
    if (!kn || !tn) return;
    if (!k2t.has(kn)) k2t.set(kn, new Map());
    if (!k2t.get(kn).has(tn)) k2t.get(kn).set(tn, []);
    k2t.get(kn).get(tn).push(src);
    if (!t2k.has(tn)) t2k.set(tn, new Map());
    if (!t2k.get(tn).has(kn)) t2k.get(tn).set(kn, []);
    t2k.get(tn).get(kn).push(src);
  };
  for (const l of legos) {
    add(l.known_text, l.target_text, l.lego_id);
    for (const c of l.components || []) add(c.known, c.target, `${l.lego_id}#c`);
  }
  return { k2t, t2k };
}

/** The muy/bien adjudication for one known->target pair. */
function determinism(table, known, target) {
  const kn = surfaceKey(known);
  const tn = norm(target);
  const targets = [...(table.k2t.get(kn)?.keys() || [])];
  const knowns = [...(table.t2k.get(tn)?.keys() || [])];
  if (targets.length > 1) {
    return {
      deterministic: false,
      reason: 'ambiguous-known',
      detail: `"${kn}" reaches ${targets.length} different targets: ${targets.join(' / ')}`,
      unlock: `differentiate the known side so each sense asks for one form (natural context words, never parentheses)`
    };
  }
  if (knowns.length > 1) {
    return {
      deterministic: false,
      reason: 'convergent-target',
      detail: `"${tn}" is reached from ${knowns.length} different knowns: ${knowns.join(' / ')}`,
      unlock: `not yet — unlocks once every one of those knowns has been introduced against its own distinct use, so the learner can tell which is being asked for`
    };
  }
  return { deterministic: true, reason: null, detail: null, unlock: null };
}

/**
 * @param {object} supabase
 * @param {string} courseCode
 * @param {number} seedNumber   the seed being authored
 * @param {number} [legoIndex]  authoring LEGO L of that seed; earlier LEGOs of
 *                              the same seed are already introduced. Omit to
 *                              take the state before the seed opens.
 */
async function buildInventory(supabase, courseCode, seedNumber, legoIndex = 1) {
  const legos = await fetchAllLegos(supabase, courseCode);
  if (!legos.length) throw new Error(`no LEGOs found for ${courseCode}`);
  const table = buildMappingTable(legos);

  const introduced = legos.filter(
    (l) => l.seed_number < seedNumber || (l.seed_number === seedNumber && l.lego_index < legoIndex)
  );

  const items = [];
  for (const l of introduced) {
    const d = determinism(table, l.known_text, l.target_text);
    items.push({
      kind: 'lego',
      legoId: l.lego_id,
      seedNumber: l.seed_number,
      legoIndex: l.lego_index,
      type: l.type,
      known: l.known_text,
      target: l.target_text,
      recency: seedNumber - l.seed_number,
      ...d
    });
    for (const c of l.components || []) {
      const cd = determinism(table, c.known, c.target);
      items.push({
        kind: 'component',
        legoId: l.lego_id,
        parentKnown: l.known_text,
        seedNumber: l.seed_number,
        legoIndex: l.lego_index,
        type: 'C',
        known: c.known,
        target: c.target,
        recency: seedNumber - l.seed_number,
        ...cd
      });
    }
  }

  // The LEGO being authored, and its own seed, for the generator's brief.
  const target = legos.find((l) => l.seed_number === seedNumber && l.lego_index === legoIndex) || null;

  const available = items.filter((i) => i.deterministic);
  const blocked = items.filter((i) => !i.deterministic);

  return {
    courseCode,
    seedNumber,
    legoIndex,
    targetLego: target,
    counts: {
      introducedLegos: introduced.length,
      items: items.length,
      available: available.length,
      blocked: blocked.length
    },
    items,
    available,
    blocked,
    // exposed so the checker can adjudicate tiles without a second DB read
    table,
    allLegos: legos
  };
}

/** Recency window used by the scorer and the prompt: the newest quarter of the course so far. */
function recentWindow(inventory) {
  const seeds = inventory.introducedSeedNumbers || inventory.items.map((i) => i.seedNumber);
  if (!seeds.length) return 0;
  const sorted = [...new Set(seeds)].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.75)];
}

async function main() {
  const [courseCode, seedArg, ...rest] = process.argv.slice(2);
  if (!courseCode || !seedArg) {
    console.error('usage: node tools/phrase-lab/inventory.cjs <course> <seed> [--lego N] [--json out.json]');
    process.exit(1);
  }
  const legoIndex = rest.includes('--lego') ? Number(rest[rest.indexOf('--lego') + 1]) : 1;
  const jsonOut = rest.includes('--json') ? rest[rest.indexOf('--json') + 1] : null;

  const { supabase } = require('../../services/supabase-client.cjs');
  if (!supabase) throw new Error('no Supabase client — SUPABASE_URL / SUPABASE_SERVICE_KEY missing from .env');
  const inv = await buildInventory(supabase, courseCode, Number(seedArg), legoIndex);

  console.log(`${courseCode} @ seed ${seedArg} L${legoIndex}`);
  if (inv.targetLego) console.log(`  authoring: ${inv.targetLego.lego_id} [${inv.targetLego.type}] "${inv.targetLego.known_text}" -> "${inv.targetLego.target_text}"`);
  console.log(`  introduced LEGOs: ${inv.counts.introducedLegos}`);
  console.log(`  vocabulary items (LEGOs + components): ${inv.counts.items}`);
  console.log(`  deterministic / usable now: ${inv.counts.available}`);
  console.log(`  blocked for now: ${inv.counts.blocked}`);
  const byReason = {};
  for (const b of inv.blocked) byReason[b.reason] = (byReason[b.reason] || 0) + 1;
  for (const [r, n] of Object.entries(byReason)) console.log(`    ${r}: ${n}`);
  console.log('\n  sample blocks:');
  for (const b of inv.blocked.slice(0, 8)) console.log(`    "${b.known}" -> "${b.target}"  [${b.reason}] ${b.detail}`);

  if (jsonOut) {
    const { table, allLegos, ...clean } = inv;
    fs.writeFileSync(jsonOut, JSON.stringify(clean, null, 2));
    console.log(`\nwrote ${jsonOut}`);
  }
}

module.exports = { buildInventory, buildMappingTable, fetchAllLegos, determinism, norm, surfaceKey, recentWindow };

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });

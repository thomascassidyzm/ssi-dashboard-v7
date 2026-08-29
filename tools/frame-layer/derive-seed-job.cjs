#!/usr/bin/env node
/**
 * WHAT IS THIS SEED FOR? — derived, never told.
 *
 * The lab used to be handed a seed's teaching job in a lookup table keyed
 * "course:seed". That is hardcoding: it cannot be wrong-proofed, it does not
 * scale past the two seeds somebody typed in, and it was in fact WRONG for
 * seed 600 (it claimed 600 taught the double-'d split; 600 admits one lego,
 * "driven"/"conducido", and its job is lexical — the split is taught at 599).
 *
 * So the job is now COMPUTED from the seed's own ADMISSION DIFF: what this seed
 * admits that no earlier seed admitted. Three things are diffed:
 *   (a) NEW LEGOS   — the vocabulary admission (a seed's own legos, by definition)
 *   (b) NEW FRAMES  — patterns from the inventory that no earlier seed instantiated
 *   (c) NEW SIDES   — an outcome of an already-present split that has never been
 *                     seen before. A frame can be long-established while one side
 *                     of its split has never appeared; admitting that side is a
 *                     real teaching job and is the one most easily missed.
 *
 *   (d) ATOMISATION — a form that was only ever available as GLUE (a component
 *                     row) or BUNDLED inside a larger M-LEGO becomes a LEGO in
 *                     its own right, with its own basket. Per Watson, accepted
 *                     by Tom 2026-08-29: "atomisation is promotion — a form that
 *                     was only available as glue becomes a LEGO with its own
 *                     basket. Not new material, new status."
 *
 * Five honest outcomes, and the last is an answer, not a failure:
 *   NEW FRAME · NEW SIDE · ATOMISATION · LEXICAL ONLY · NOTHING STRUCTURAL
 *
 * COMPONENTS ARE READ, NEVER COUNTED AS TEACHING. A component admission extends
 * the available vocabulary without creating a learning event, so it feeds
 * availability and atomisation and is never itself a thing the seed teaches.
 * Missing this is why seed 599 used to derive as LEXICAL ONLY: "hubiera sabido"
 * had been component-admitted at seed 152 and "habría" had never been admitted
 * at all — it was bundled inside the M-LEGO "lo habría hecho" with no CMP row
 * splitting it out. Both become bare LEGOs at 599. That is a promotion, and the
 * derivation now says so.
 *
 * PER-LEGO ATTRIBUTION. A new side belongs to the LEGO that carries it: at seed
 * 599, S0599L01 "I would have"/"habría" carries the habría side and S0599L04
 * "you'd told"/"hubieras" carries the hubiera side. That is what lets the metric
 * ask each basket to teach its OWN side, instead of asking the "to drive" basket
 * to cross a conditional split it has nothing to do with.
 *
 * READ-ONLY. Usage: node tools/frame-layer/derive-seed-job.cjs spa_for_eng 599
 */
const PATTERNS = require('./patterns.cjs');
const { splitsFor: splitMatchersFor } = require('./split-matchers.cjs');

const framesOf = (known) => PATTERNS.filter(p => p.test(String(known || ''))).map(p => p.id);
const fires = (re, text) => re != null && new RegExp(re, 'i').test(String(text || ''));

const normT = (s) => String(s || '').toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
/** whole-word containment: "habría" is inside "lo habría hecho", not inside "habríamos". */
const containsWords = (hay, needle) => !!needle && ` ${normT(hay)} `.includes(` ${normT(needle)} `);

/**
 * ATOMISATION — promotion, not new material.
 *
 * A LEGO of this seed atomises when its target form has never been a LEGO of its
 * own before, but WAS already available: bundled inside an earlier (bigger) LEGO,
 * or admitted as a component of one. Availability without a basket becoming
 * availability with a basket is a real teaching job, and it is the one the
 * LEGO-only diff could not see.
 */
function findAtomisations({ ownLegos, priorLegos = [], priorComponents = [] }) {
  const out = [];
  for (const l of ownLegos) {
    const t = normT(l.target_text);
    if (!t) continue;
    if (priorLegos.some(p => normT(p.target_text) === t)) continue;   // already a LEGO: nothing new
    const inLego = priorLegos.find(p => normT(p.target_text) !== t && containsWords(p.target_text, l.target_text));
    const asComp = priorComponents.find(c => normT(c.target_text) === t);
    const inComp = priorComponents.find(c => normT(c.target_text) !== t && containsWords(c.target_text, l.target_text));
    const via = asComp ? { how: 'component', row: asComp }
              : inLego ? { how: 'bundled', row: inLego }
              : inComp ? { how: 'inside a component', row: inComp } : null;
    if (!via) continue;
    out.push({ lego_index: +l.lego_index, known_text: l.known_text, target_text: l.target_text,
               how: via.how, from_seed: via.row.seed_number,
               from_known: via.row.known_text, from_target: via.row.target_text });
  }
  return out;
}

/**
 * @param seedRow   {known_text, target_text}
 * @param ownLegos  the seed's own legos [{lego_id, lego_index, known_text, target_text}]
 * @param priorSeeds every seed with seed_number < this one [{known_text, target_text}]
 * @param priorLegos every lego admitted before this seed — for atomisation only
 * @param priorComponents every CMP row admitted before this seed — availability, never teaching
 */
function deriveJob({ seedRow, ownLegos = [], priorSeeds = [], priorLegos = [], priorComponents = [], course = 'spa_for_eng' }) {
  // Split matchers are facts about a TARGET LANGUAGE's morphology, so they are
  // fetched per course. No matchers means the splits are UNREADABLE for this
  // pair — never "no split in play", which is absence dressed as an answer.
  const SPLITS = splitMatchersFor(course) || {};
  const splitsReadable = !!splitMatchersFor(course);
  const here = framesOf(seedRow.known_text);
  const before = new Set();
  const priorFrames = priorSeeds.map(s => { const f = framesOf(s.known_text); f.forEach(x => before.add(x)); return { s, f }; });
  const newFrames = here.filter(id => !before.has(id))
    .map(id => ({ id, name: (PATTERNS.find(p => p.id === id) || {}).name }));

  // (c) new SIDES: split in play here, outcome fires here, and fires at no
  // earlier seed whose known side also instantiated the split's pattern.
  const newSides = [], inPlay = [];
  for (const [sid, sp] of Object.entries(SPLITS)) {
    if (!here.includes(sp.pattern)) continue;
    const carried = sp.outcomes.filter(o => fires(o.target_re, seedRow.target_text));
    if (!carried.length) continue;
    inPlay.push({ id: sid, name: sp.name, pattern: sp.pattern });
    for (const o of carried) {
      const seenBefore = priorFrames.some(({ s, f }) => f.includes(sp.pattern) && fires(o.target_re, s.target_text));
      if (seenBefore) continue;
      // whose lego carries it?
      const owners = ownLegos.filter(l => fires(o.target_re, l.target_text)).map(l => l.lego_index);
      newSides.push({ split_id: sid, split_name: sp.name, pattern: sp.pattern,
                      form: o.form, target_re: o.target_re, lego_indexes: owners });
    }
  }
  const unmatchable = Object.entries(SPLITS)
    .filter(([, sp]) => here.includes(sp.pattern) && sp.outcomes.some(o => o.target_re == null))
    .map(([sid, sp]) => ({ id: sid, name: sp.name,
      outcomes: sp.outcomes.filter(o => o.target_re == null).map(o => o.form) }));

  const atomisations = findAtomisations({ ownLegos, priorLegos, priorComponents });

  const verdict = newFrames.length ? 'NEW FRAME'
                : newSides.length ? 'NEW SIDE'
                : atomisations.length ? 'ATOMISATION'
                : ownLegos.length ? 'LEXICAL ONLY'
                : 'NOTHING STRUCTURAL';

  const legoList = ownLegos.map(l => `"${l.known_text}" → "${l.target_text}"`).join(', ');
  const sentence = ({
    'NEW FRAME': () => `This seed admits ${newFrames.length} frame(s) no earlier seed used — ${newFrames.map(f => `${f.id} ${f.name}`).join('; ')} — carried by ${ownLegos.length} new lego(s): ${legoList}.`,
    'NEW SIDE': () => `Every frame here is already established; what is new is ${newSides.length} side(s) of a split the course has only ever shown from the other side — ${newSides.map(s => `${s.split_id} ${s.form}${s.lego_indexes.length ? ` (lego ${s.lego_indexes.map(i => 'L' + String(i).padStart(2, '0')).join(', ')})` : ''}`).join('; ')} — across ${ownLegos.length} new lego(s): ${legoList}.`,
    'ATOMISATION': () => `Nothing here is new material — what is new is STATUS. ${atomisations.length} form(s) that the course had only ever made available as glue now become LEGOs with baskets of their own: ${atomisations.map(a => `"${a.target_text}" (L${String(a.lego_index).padStart(2, '0')}) was ${a.how === 'component' ? 'a component' : a.how} at seed ${a.from_seed} — "${a.from_target}"`).join('; ')}.`,
    'LEXICAL ONLY': () => `Nothing structural is new here: every frame and every side of every split in play has been seen before. The job is lexical — ${ownLegos.length} new lego(s): ${legoList}.`,
    'NOTHING STRUCTURAL': () => `This seed admits nothing at all — no new lego, no new frame, no new side of a split. It is pure consolidation.`,
  })[verdict]();

  return { verdict, sentence, new_legos: ownLegos, new_frames: newFrames, new_sides: newSides,
           atomisations, course, splits_readable: splitsReadable,
           frames_here: here, splits_in_play: inPlay, not_machine_checkable: unmatchable };
}

/** The SPLIT criterion for one LEGO's basket: the sides THIS lego admits. */
function splitsForBasket(job, legoIndex) {
  const mine = job.new_sides.filter(s => s.lego_indexes.includes(legoIndex));
  if (!mine.length) return [];
  const bySplit = {};
  for (const s of mine) (bySplit[s.split_id] = bySplit[s.split_id] || { id: s.split_id, name: s.split_name, outcomes: [] })
    .outcomes.push({ form: s.form, target_re: s.target_re });
  return Object.values(bySplit);
}

module.exports = { deriveJob, splitsForBasket, framesOf, findAtomisations };

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const [course = 'spa_for_eng', seedArg = '599'] = process.argv.slice(2);
  const seed = +seedArg;
  (async () => {
    const { loadCorpus } = require('./corpus.cjs');
    const { seedRow, ownLegos, priorSeeds, priorLegos, priorComponents } = await loadCorpus(sb, course, seed);
    const job = deriveJob({ seedRow, ownLegos, priorSeeds, priorLegos, priorComponents, course });
    console.log(`${course} seed ${seed}: ${seedRow.known_text}`);
    console.log(`\nVERDICT: ${job.verdict}\n${job.sentence}\n`);
    console.log(JSON.stringify({ ...job, new_legos: undefined }, null, 2));
  })().catch(e => { console.error(e.message); process.exit(1); });
}

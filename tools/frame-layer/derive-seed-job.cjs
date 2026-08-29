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
 * Four honest outcomes, and the fourth is an answer, not a failure:
 *   NEW FRAME · NEW SIDE · LEXICAL ONLY · NOTHING STRUCTURAL
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
const SPLITS = require('./split-matchers.cjs');

const framesOf = (known) => PATTERNS.filter(p => p.test(String(known || ''))).map(p => p.id);
const fires = (re, text) => re != null && new RegExp(re, 'i').test(String(text || ''));

/**
 * @param seedRow   {known_text, target_text}
 * @param ownLegos  the seed's own legos [{lego_id, lego_index, known_text, target_text}]
 * @param priorSeeds every seed with seed_number < this one [{known_text, target_text}]
 */
function deriveJob({ seedRow, ownLegos = [], priorSeeds = [] }) {
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

  const verdict = newFrames.length ? 'NEW FRAME'
                : newSides.length ? 'NEW SIDE'
                : ownLegos.length ? 'LEXICAL ONLY'
                : 'NOTHING STRUCTURAL';

  const legoList = ownLegos.map(l => `"${l.known_text}" → "${l.target_text}"`).join(', ');
  const sentence = ({
    'NEW FRAME': () => `This seed admits ${newFrames.length} frame(s) no earlier seed used — ${newFrames.map(f => `${f.id} ${f.name}`).join('; ')} — carried by ${ownLegos.length} new lego(s): ${legoList}.`,
    'NEW SIDE': () => `Every frame here is already established; what is new is ${newSides.length} side(s) of a split the course has only ever shown from the other side — ${newSides.map(s => `${s.split_id} ${s.form}${s.lego_indexes.length ? ` (lego ${s.lego_indexes.map(i => 'L' + String(i).padStart(2, '0')).join(', ')})` : ''}`).join('; ')} — across ${ownLegos.length} new lego(s): ${legoList}.`,
    'LEXICAL ONLY': () => `Nothing structural is new here: every frame and every side of every split in play has been seen before. The job is lexical — ${ownLegos.length} new lego(s): ${legoList}.`,
    'NOTHING STRUCTURAL': () => `This seed admits nothing at all — no new lego, no new frame, no new side of a split. It is pure consolidation.`,
  })[verdict]();

  return { verdict, sentence, new_legos: ownLegos, new_frames: newFrames, new_sides: newSides,
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

module.exports = { deriveJob, splitsForBasket, framesOf };

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const [course = 'spa_for_eng', seedArg = '599'] = process.argv.slice(2);
  const seed = +seedArg;
  (async () => {
    const { loadCorpus } = require('./corpus.cjs');
    const { seedRow, ownLegos, priorSeeds } = await loadCorpus(sb, course, seed);
    const job = deriveJob({ seedRow, ownLegos, priorSeeds });
    console.log(`${course} seed ${seed}: ${seedRow.known_text}`);
    console.log(`\nVERDICT: ${job.verdict}\n${job.sentence}\n`);
    console.log(JSON.stringify({ ...job, new_legos: undefined }, null, 2));
  })().catch(e => { console.error(e.message); process.exit(1); });
}

#!/usr/bin/env node
'use strict';
// tools/course-optimization/bre-rebuild-374.cjs — cs #374·AL: APPLY the bre_for_fra rebuild of seeds 1-300 planned by
// #345·AL (plan d/6759942d, pairs d/a21589ea, data ops/bre-rebuild-345/). Kai 25 Nov 14:24Z: "2. Yes" to "Apply the
// Breton for French speakers rebuild, seeds 1–300". This tool writes NOTHING to the database: it checks authored
// decompositions offline, emits one changeset PER SEED, and verifies a live read afterwards. The night runner
// (ops/bre-rebuild-374/night-apply.sh) pushes the changesets through tools/changeset/apply-changeset.cjs.
//
// Why one changeset per seed, in ONE transaction (not #247's insert-then-delete pair): this rebuild replaces the seed
// text AND its LEGOs, and a half-applied seed (new seed text, old LEGOs that no longer tile it) is the failure to avoid.
// bre_for_fra has no audio, no learners and no hand edits (copy read 25 Nov: 0 audio links, 0 hand_edited_by), so there
// is no clip to keep alive and make-before-break reduces to atomicity: seed.update + lego.delete(cascade) of every old
// LEGO + lego.insert + phrase.insert, all in one edit-batch request (≤100 ops, --batch 100). If the applier ever lands
// part of a seed (it sets a refused op aside and re-sends the rest), the runner posts that batch's undo back.
//
// HOLDS (Kai has not ruled, 25 Nov): (1) the French feminine marking with "à elle" and the possessor convention it
// belongs to (son/sa/lui → the subject's, else masculine, else "à elle"); (2) counting mutated Breton forms as the same
// taught word. holds.json lists the seeds held on (1). (2) is a checker change, so the checker here is UNCHANGED (komz ≠
// gomz): a phrase that would only pass with mutation-blind matching simply fails and is reported, never applied.
// Cascade: a phrase that is only valid because a HELD seed's new LEGO would be taught is dropped ("needs held seed");
// a seed whose tiling or seed-sentence row needs a held seed is held itself. A held seed's live rows are left exactly.
//
// Checks = the pure functions POST /api/seed/complete calls (as ops/bre-rebuild-345/check-pilot.cjs ran them), plus
// in-memory ZUT over every new LEGO and phrase of 1-300 and the OLD rows of held seeds (which stay live).
// Rows = built the way seed-complete.cjs builds them for the BUILD/USE format (casing/bookend normalisation,
// generateBuildupPhrases for M components, bare-LEGO drop, dedupe, makePhraseId, positions). decomposition is left NULL
// (seed-complete decorates it after insert; the runtime falls back when it is NULL).
//
// Modes:
//   baseline <copyDump.json>               → ops/bre-rebuild-374/baseline-1-300.json (what the plan is applied against)
//   check [--warn]                         → ops/bre-rebuild-374/check.json (+ holds-auto.json, dropped list)
//   cs <from-to>                           → ops/bre-rebuild-374/cs/S####.changeset.jsonl, one per non-held seed
//   precheck <from-to> <liveSeeds.json>    → seed numbers whose live rows still equal the baseline (stdout, one per line);
//                                            drift → ops/bre-rebuild-374/drift.jsonl
//   verify <from-to> <liveSeeds.json>      applied seeds = intended rows; held/drift seeds = baseline; prints a summary
// liveSeeds.json = GET http://localhost:3470/api/production/bre_for_fra/seeds
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PLAN = path.join(ROOT, 'ops', 'bre-rebuild-345');
const DIR = path.join(ROOT, 'ops', 'bre-rebuild-374');
const L = path.join(ROOT, 'services', 'course-builder', 'lib');
const C = 'bre_for_fra';
const JOB = '#374·AL';
const KAI_GO = 'kai:2026-11-25T14:24Z "2. Yes" to "Apply the Breton for French speakers rebuild, seeds 1–300"';
const lid = (s, l) => `S${String(s).padStart(4, '0')}L${String(l).padStart(2, '0')}`;
const sid = (s) => `S${String(s).padStart(4, '0')}`;
const range = (r) => { const [a, b] = String(r).split('-').map(Number); if (!(a >= 1 && b >= a)) throw new Error('range like 1-30'); return [a, b]; };
const norm = (s) => String(s || '').toLowerCase().replace(/[.,?!;:«»"]/g, ' ').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
const readJ = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

function quietly(fn) { const q = console.log; console.log = () => {}; try { return fn(); } finally { console.log = q; } }
const libs = quietly(() => ({ V: require(L + '/validation.cjs'), PS: require(L + '/phrase-structure.cjs'), LC: require(L + '/language-config.cjs'), TN: require(L + '/text-normalization.cjs') }));

// ── authored decompositions: pilot (1-30, #345) + this job's files (31-300). Same line format as the pilot. ──
function parse() {
  const pairs = Object.fromEntries(readJ(path.join(PLAN, 'pairs-1-300.json')).map((r) => [r.seed, r]));
  const files = [
    ...fs.readdirSync(PLAN).filter((x) => /^pilot-\d.*\.txt$/.test(x)).sort().map((x) => path.join(PLAN, x)),
    ...(fs.existsSync(path.join(DIR, 'author')) ? fs.readdirSync(path.join(DIR, 'author')).filter((x) => /\.txt$/.test(x)).sort().map((x) => path.join(DIR, 'author', x)) : []),
  ];
  const seeds = new Map(); let seed = null, lego = null;
  for (const f of files) {
    for (const raw of fs.readFileSync(f, 'utf8').split('\n')) {
      const line = raw.trim(); if (!line || line.startsWith('#')) continue;
      if (line.startsWith('@')) {
        const n = Number(line.slice(1).trim());
        if (seeds.has(n)) throw new Error(`seed ${n} authored twice (${f})`);
        seed = { n, known: pairs[n].proposed_french, target: pairs[n].proposed_breton, legos: [], notes: [], file: path.relative(ROOT, f) };
        seeds.set(n, seed); lego = null; continue;
      }
      if (!seed) throw new Error(`${f}: line before any @ seed: ${line}`);
      if (line.startsWith('N ')) { seed.notes.push(line.slice(2)); continue; }
      const kind = line.split(' ')[0], parts = line.slice(kind.length + 1).split('|').map((x) => x.trim());
      if (kind === 'L' || kind === 'L-') {
        lego = { id: lid(seed.n, seed.legos.length + 1), idx: seed.legos.length + 1, target: parts[0], known: parts[1], type: parts[2] || 'A', is_new: kind === 'L',
          components: (parts[3] || '').split(';').map((c) => c.trim()).filter(Boolean).map((c) => { const [t, k] = c.split('='); return { target: t.trim(), known: (k || '').trim() }; }), build: [], use: [] };
        seed.legos.push(lego);
      } else if (!lego) throw new Error(`${f} S${seed.n}: phrase before any L line: ${line}`);
      else if (kind === 'B') lego.build.push({ target: parts[0], known: parts[1] });
      else if (kind === 'U' || kind === 'U*') lego.use.push({ target: parts[0], known: parts[1], seed_sentence: kind === 'U*' });
      else throw new Error(`${f}: bad line: ${line}`);
    }
  }
  return { pairs, seeds };
}

const holdsFile = () => path.join(DIR, 'holds.json');
function loadHolds() { return fs.existsSync(holdsFile()) ? readJ(holdsFile()) : {}; } // { "<seed>": {call, why} }
function baseline() { return readJ(path.join(DIR, 'baseline-1-300.json')); }

// ── check ──
function check({ warn = false } = {}) {
  const { V, PS, LC } = libs;
  const { pairs, seeds } = parse();
  const manual = loadHolds();
  const base = baseline();
  const held = new Map(Object.entries(manual).map(([k, v]) => [Number(k), v]));
  for (let n = 1; n <= 300; n++) if (!seeds.has(n) && !held.has(n)) held.set(n, { call: 'not authored', why: 'no decomposition authored yet' });
  let out, tot, dropped;
  for (let pass = 0; pass < 20; pass++) {
    const before = held.size;
    ({ out, tot, dropped } = checkOnce(seeds, held, base, { V, PS, LC }));
    if (held.size === before) break;
  }
  const below = out.flatMap((r) => r.legos.filter((l) => l.floor).map((l) => `${l.id} ${l.floor}`));
  const res = { checker: 'services/course-builder/lib pure functions (as POST /api/seed/complete), offline; ZUT in memory over 1-300 new rows + held seeds\' old live rows', totals: tot, held: Object.fromEntries([...held].sort((a, b) => a[0] - b[0])), dropped, below_floor: below, seeds: out };
  fs.writeFileSync(path.join(DIR, 'check.json'), JSON.stringify(res, null, 1));
  console.log(JSON.stringify(tot));
  console.log(`held ${held.size}: ${[...held.keys()].sort((a, b) => a - b).join(' ')}`);
  console.log(`dropped (need a held seed) ${dropped.length}; below floor ${below.length}`);
  for (const r of out) { for (const h of r.hard) console.log(`S${r.seed} HARD ${h}`); for (const l of r.legos) { for (const h of l.hard) console.log(`${l.id} HARD ${h}`); if (warn) for (const w of l.warn) console.log(`${l.id} warn ${w}`); } }
  return res;
}

function checkOnce(seeds, held, base, { V, PS, LC }) {
  const prior = new Set(), heldOwn = new Set();
  const legoZut = new Map(), phraseZut = new Map(); const out = []; const dropped = [];
  const tot = { seeds: 0, legos: 0, new_legos: 0, build: 0, use: 0, hard: 0, warn: 0, zut_vs_held_old: 0 };
  // Held seeds keep their OLD live rows: those enter the ZUT maps (a clash with them is reported, not fixed here).
  for (const n of held.keys()) {
    const b = base.seeds[n]; if (!b) continue;
    for (const l of b.legos) legoZut.set(norm(l.known), { t: norm(l.target), id: `${l.lego_id} (held, old)`, old: true });
    for (const p of b.phrases) if (p.role !== 'component') phraseZut.set(norm(p.known), { t: norm(p.target), id: `${p.id} (held, old)`, old: true });
  }
  for (const n of held.keys()) { const s = seeds.get(n); if (s) for (const l of s.legos) for (const t of [l.target, ...l.components.map((c) => c.target)]) heldOwn.add(t); }
  const ordered = [...seeds.values()].sort((a, b) => a.n - b.n);
  for (const s of ordered) {
    if (held.has(s.n)) continue;
    const res = { seed: s.n, target: s.target, known: s.known, hard: [], warn: [], legos: [] };
    const til = quietly(() => V.checkTiling(s.target, s.legos, C, prior, { seedNumber: s.n }));
    if (!til.valid) {
      const til2 = quietly(() => V.checkTiling(s.target, s.legos, C, new Set([...prior, ...heldOwn]), { seedNumber: s.n }));
      if (til2.valid) { held.set(s.n, { call: 'cascade', why: 'its tiling needs a LEGO of a held seed' }); continue; }
      res.hard.push('TILING: ' + (til.message || JSON.stringify(til.untiled)));
    }
    const seedT = new Set(norm(s.target).split(' ')), seedK = new Set(norm(s.known).replace(/\b([djlmnst]|qu)'/g, '$1e ').split(' '));
    let cascade = null;
    for (const l of s.legos) {
      const lr = { id: l.id, target: l.target, known: l.known, is_new: l.is_new, hard: [], warn: [] };
      const syl = LC.checkLegoSyllables(l.target, C); lr.syllables = syl.syllables;
      if (!syl.ok) lr.hard.push(`SYLLABLES ${syl.syllables} > ${syl.max}`);
      if (l.type === 'M' && !l.components.length) lr.hard.push('M-LEGO with no components');
      const ne = V.checkNonExampleText([l]); if (ne && ne.valid === false) lr.hard.push('NON-EXAMPLE TEXT');
      for (const w of norm(l.target).split(' ')) if (!seedT.has(w)) lr.warn.push(`L26 target word not in seed: ${w}`);
      for (const w of norm(l.known).replace(/\b([djlmnst]|qu)'/g, '$1e ').split(' ')) if (!seedK.has(w)) lr.warn.push(`L26 known word not in seed: ${w}`);
      const own = [l.target, ...l.components.map((c) => c.target)];
      const vocab = new Set([...prior, ...own]);
      // vocabulary; a phrase valid only with a held seed's LEGOs is dropped, not failed
      const keep = (list) => list.filter((p) => {
        const v1 = quietly(() => V.checkVocabViolations([p], vocab, C, { seedNumber: s.n }));
        const bad1 = Array.isArray(v1) ? v1 : (v1.violations || []);
        if (!bad1.length) return true;
        const v2 = quietly(() => V.checkVocabViolations([p], new Set([...vocab, ...heldOwn]), C, { seedNumber: s.n }));
        const bad2 = Array.isArray(v2) ? v2 : (v2.violations || []);
        if (!bad2.length) {
          dropped.push({ lego: l.id, target: p.target, known: p.known, why: 'needs a LEGO of a held seed' });
          if (p.seed_sentence) cascade = 'its seed-sentence row needs a LEGO of a held seed';
          return false;
        }
        for (const v of bad1) lr.hard.push(`VOCAB: "${v.phrase}" untaught: ${JSON.stringify(v.unknown)}`);
        return true;
      });
      l.buildKept = keep(l.build); l.useKept = keep(l.use);
      const rows = [...l.buildKept, ...l.useKept];
      lr.build = l.buildKept.length; lr.use = l.useKept.length;
      if (l.is_new) {
        const bu = PS.checkBuildUsePhrases({ ...l, build: l.buildKept, use: l.useKept }, C, s.n);
        if (!bu.valid) { if (/need \d/.test(bu.error)) lr.floor = bu.error; else lr.hard.push(bu.error); }
        const rc = quietly(() => V.checkBuildRecombination({ ...l, build: l.buildKept, use: l.useKept }, C, s.n, prior));
        if (!rc.valid) lr.hard.push('BUILD RECOMBINATION: ' + JSON.stringify(rc.rejects || rc).slice(0, 200));
        const nL = norm(l.target);
        for (const p of rows) { if (norm(p.target) === nL) lr.hard.push('BARE LEGO as a phrase'); const pt = ' ' + norm(p.target) + ' '; if (!nL.split(' ').every((w) => pt.includes(' ' + w + ' '))) lr.hard.push(`P17: "${p.target}" lacks its LEGO`); }
        const k = norm(l.known), hit = legoZut.get(k);
        if (hit && hit.t !== norm(l.target)) { if (hit.old) { lr.warn.push(`ZUT vs held old LEGO ${hit.id} "${hit.t}"`); tot.zut_vs_held_old++; } else lr.hard.push(`ZUT (LEGO): "${l.known}" is also ${hit.id} "${hit.t}"`); } else if (!hit) legoZut.set(k, { t: norm(l.target), id: l.id });
        for (const p of rows) {
          const pk = norm(p.known), h = phraseZut.get(pk);
          if (h && h.t !== norm(p.target)) { if (h.old) { lr.warn.push(`ZUT vs held old phrase ${h.id}: "${p.known}" → "${p.target}" / "${h.t}"`); tot.zut_vs_held_old++; } else lr.hard.push(`ZUT (phrase): "${p.known}" → "${p.target}" and ${h.id} "${h.t}"`); } else if (!h) phraseZut.set(pk, { t: norm(p.target), id: l.id });
        }
        tot.new_legos++; tot.build += l.buildKept.length; tot.use += l.useKept.length;
      } else if (rows.length) lr.warn.push('P25: phrases under a not-new LEGO are never played');
      for (const t of own) prior.add(t); // earlier siblings count, as in the route (a cascade hold re-runs the pass from scratch)
      res.legos.push(lr);
    }
    if (cascade) { held.set(s.n, { call: 'cascade', why: cascade }); continue; }
    tot.legos += s.legos.length;
    const said = s.legos.some((l) => l.is_new && l.useKept.some((p) => norm(p.target) === norm(s.target) && norm(p.known) === norm(s.known)));
    if (!said) res.hard.push('P26: the seed sentence is not a USE row under a new LEGO of this seed');
    if (!s.legos.some((l) => l.is_new)) res.hard.push('P25: no new LEGO, the seed would never play');
    tot.seeds++; tot.hard += res.hard.length + res.legos.reduce((a, l) => a + l.hard.length, 0); tot.warn += res.legos.reduce((a, l) => a + l.warn.length, 0);
    out.push(res);
  }
  return { out, tot, dropped };
}

// ── rows, the seed-complete way (BUILD/USE path, routes/seed-complete.cjs) ──
function rowsFor(s, dropSet) {
  const { PS, TN } = libs;
  const legos = JSON.parse(JSON.stringify(s.legos)).map((l) => ({ ...l, build: l.build.filter((p) => !dropSet.has(`${l.id}|${p.target}`)), use: l.use.filter((p) => !dropSet.has(`${l.id}|${p.target}`)) }));
  TN.normalizeSubmissionCasing(legos, { skipTarget: false, skipKnown: false, keepCapSet: new Set(['I', 'Français']) });
  const legoRows = [], phraseRows = [];
  for (const l of legos) {
    legoRows.push({ seed_number: s.n, lego_index: l.idx, type: l.type || 'A', is_new: l.is_new, known_text: l.known, target_text: l.target,
      components: l.components.length ? l.components : null, status: 'draft' });
    if (!l.is_new) continue; // seed-complete writes no basket for a duplicate (not-new) LEGO
    let rows = [], start = 1; const rc = { component: 0, build: 0, use: 0 };
    if (l.type === 'M' && l.components.length) {
      const b = PS.generateBuildupPhrases({ seed: s.n, idx: l.idx, known: l.known, target: l.target, components: l.components }, C);
      rows = b.buildupPhrases; start = b.startPosition; Object.assign(rc, b.roleCounts);
    }
    const seen = new Set(rows.map((p) => TN.normalizePhrase(p.target_text)));
    const take = (list) => PS.partitionBareLegoPhrases(list, l.target).kept.filter((p) => { const k = TN.normalizePhrase(p.target); if (seen.has(k)) return false; seen.add(k); return true; });
    const build = take(l.build), use = take(l.use);
    const mk = (p, role, pos) => ({ id: PS.makePhraseId(C, s.n, l.idx, role, ++rc[role]), seed_number: s.n, lego_index: l.idx, position: pos,
      known_text: p.known, target_text: p.target, word_count: p.target.length, lego_count: ((p.known || '').match(/\s+/g) || []).length + 1,
      phrase_role: role, connected_lego_ids: [], lego_position: PS.computeLegoPosition(p.target, l.target),
      metadata: { format: 'build_use', ...(role === 'use' && p.seed_sentence ? { seed_sentence: true } : {}) }, introduce: true, status: 'draft' });
    build.forEach((p, i) => rows.push(mk(p, 'build', start + i)));
    use.forEach((p, i) => rows.push(mk(p, 'use', start + build.length + i)));
    for (const r of rows) { delete r.course_code; delete r.version; if (r.target_text_roman == null) delete r.target_text_roman; }
    phraseRows.push(...rows);
  }
  return { legoRows, phraseRows };
}

function intended() {
  const { pairs, seeds } = parse();
  const chk = readJ(path.join(DIR, 'check.json'));
  if (chk.totals.hard) throw new Error(`check.json has ${chk.totals.hard} hard failure(s); fix before building changesets`);
  const held = new Set(Object.keys(chk.held).map(Number));
  const dropSet = new Set(chk.dropped.map((d) => `${d.lego}|${d.target}`));
  const plan = new Map();
  for (const s of seeds.values()) if (!held.has(s.n)) plan.set(s.n, { s, pair: pairs[s.n], ...rowsFor(s, dropSet) });
  return { plan, held: chk.held, pairs };
}

// ── baseline: the copy rows of seeds 1-300 the changesets expect ──
function mkBaseline(dumpFile) {
  const d = readJ(dumpFile); const seeds = {};
  for (const s of d.seeds) if (s.seed_number <= 300) seeds[s.seed_number] = { known: s.known_text, target: s.target_text, legos: [], phrases: [] };
  for (const l of d.legos) if (seeds[l.seed_number]) seeds[l.seed_number].legos.push({ lego_id: l.lego_id, known: l.known_text, target: l.target_text, hand: l.hand_edited_by || null });
  for (const p of d.phrases) if (seeds[p.seed_number]) seeds[p.seed_number].phrases.push({ id: p.id, role: p.phrase_role, lego_index: p.lego_index, known: p.known_text, target: p.target_text, hand: p.hand_edited_by || null });
  const out = { from: path.basename(dumpFile), course: C, seeds };
  fs.writeFileSync(path.join(DIR, 'baseline-1-300.json'), JSON.stringify(out));
  console.log(`baseline: ${Object.keys(seeds).length} seeds`);
}

function liveSeeds(file) {
  const d = readJ(file); const seeds = {};
  for (const s of d.seeds || []) {
    if (s.seed_number > 300) continue;
    const r = { known: s.known_text, target: s.target_text, legos: [], phrases: [] };
    for (const l of s.legos || []) {
      r.legos.push({ lego_id: l.lego_id, known: l.known_text, target: l.target_text, hand: l.hand_edited_by || null, type: l.type, is_new: l.is_new, components: l.components || null });
      for (const p of l.basket_phrases || []) r.phrases.push({ id: p.id, role: p.phrase_role, lego_index: p.lego_index, known: p.known_text, target: p.target_text, hand: p.hand_edited_by || null, position: p.position });
    }
    seeds[s.seed_number] = r;
  }
  return seeds;
}
const sig = (b) => JSON.stringify({ k: b.known, t: b.target, l: b.legos.map((l) => [l.lego_id, l.known, l.target, l.hand || null]).sort(), p: b.phrases.map((p) => [p.id, p.known, p.target, p.hand || null]).sort() });

// ── changesets ──
function buildCs(r) {
  const [a, b] = range(r); const { plan } = intended(); const base = baseline();
  const cs = require(path.join(ROOT, 'services', 'shared', 'changeset.cjs'));
  fs.mkdirSync(path.join(DIR, 'cs'), { recursive: true });
  let files = 0, ops = 0, max = 0;
  for (let n = a; n <= b; n++) {
    const p = plan.get(n); if (!p) continue;
    const bs = base.seeds[n];
    if (bs.known !== p.pair.current_french || bs.target !== p.pair.current_breton) throw new Error(`seed ${n}: baseline seed text ≠ the plan's current pair; rebuild the plan basis first`);
    const o = [];
    const set = {}, expect = {};
    if (p.pair.proposed_breton !== bs.target) { set.target_text = p.pair.proposed_breton; expect.target_text = bs.target; }
    if (p.pair.proposed_french !== bs.known) { set.known_text = p.pair.proposed_french; expect.known_text = bs.known; }
    if (Object.keys(set).length) o.push(cs.op('seed.update', { seed_number: n, set, expect }));
    for (const l of bs.legos) o.push(cs.op('lego.delete', { lego_id: l.lego_id, cascade_phrases: true, expect: { known_text: l.known, target_text: l.target } }));
    for (const l of p.legoRows) o.push(cs.op('lego.insert', { row: l }));
    for (const ph of p.phraseRows) o.push(cs.op('phrase.insert', { row: ph }));
    if (o.length > 100) throw new Error(`seed ${n}: ${o.length} ops > 100 (one edit-batch request); split this seed`);
    cs.write(path.join(DIR, 'cs', `${sid(n)}.changeset.jsonl`), { id: `bre_for_fra-374-${sid(n)}`, course: C, job: JOB, why: `bre_for_fra rebuild seed ${n} (#345 plan d/6759942d): seed text + LEGOs + baskets in one transaction`, source: `nightly copy ${base.from}`, kai_go: KAI_GO }, o);
    files++; ops += o.length; max = Math.max(max, o.length);
  }
  console.log(`cs ${r}: ${files} seed changesets, ${ops} ops, largest ${max}`);
}

function precheck(r, liveFile) {
  const [a, b] = range(r); const { plan } = intended(); const base = baseline(); const live = liveSeeds(liveFile);
  const ok = [];
  for (let n = a; n <= b; n++) {
    if (!plan.has(n)) continue;
    if (!live[n]) { fs.appendFileSync(path.join(DIR, 'drift.jsonl'), JSON.stringify({ at: new Date().toISOString(), seed: n, why: 'seed missing live' }) + '\n'); continue; }
    if (sig(live[n]) === sig(base.seeds[n])) { ok.push(n); continue; }
    if (isApplied(n, live[n], plan.get(n))) continue; // already landed (a resumed night)
    fs.appendFileSync(path.join(DIR, 'drift.jsonl'), JSON.stringify({ at: new Date().toISOString(), seed: n, why: 'live rows differ from the baseline the plan was built against' }) + '\n');
  }
  console.log(ok.join('\n'));
}

function isApplied(n, lv, p) {
  if (lv.target !== p.pair.proposed_breton || lv.known !== p.pair.proposed_french) return false;
  const wantL = p.legoRows.map((l) => [lid(n, l.lego_index), l.known_text, l.target_text]).sort();
  const haveL = lv.legos.map((l) => [l.lego_id, l.known, l.target]).sort();
  const wantP = p.phraseRows.map((x) => [x.id, x.known_text, x.target_text]).sort();
  const haveP = lv.phrases.map((x) => [x.id, x.known, x.target]).sort();
  return JSON.stringify(wantL) === JSON.stringify(haveL) && JSON.stringify(wantP) === JSON.stringify(haveP);
}

function verify(r, liveFile) {
  const [a, b] = range(r); const { plan } = intended(); const base = baseline(); const live = liveSeeds(liveFile);
  const res = { applied: [], untouched: [], mixed: [] };
  for (let n = a; n <= b; n++) {
    const lv = live[n];
    if (plan.has(n) && lv && isApplied(n, lv, plan.get(n))) res.applied.push(n);
    else if (lv && sig(lv) === sig(base.seeds[n])) res.untouched.push(n);
    else res.mixed.push(n);
  }
  const legos = res.applied.reduce((x, n) => x + plan.get(n).legoRows.length, 0), phrases = res.applied.reduce((x, n) => x + plan.get(n).phraseRows.length, 0);
  const heldUntouched = res.untouched.filter((n) => !plan.has(n)).length;
  console.log(`verify ${r}: applied ${res.applied.length} seeds (${legos} LEGOs, ${phrases} phrases); untouched ${res.untouched.length} (held ${heldUntouched}, planned-not-applied ${res.untouched.length - heldUntouched}); MIXED ${res.mixed.length}${res.mixed.length ? ' ' + res.mixed.join(',') : ''}`);
  fs.writeFileSync(path.join(DIR, `verify-${r}.json`), JSON.stringify({ at: new Date().toISOString(), live: path.basename(liveFile), ...res, legos, phrases }, null, 1));
  return res.mixed.length ? 2 : 0;
}

if (require.main === module) {
  const [mode, ...rest] = process.argv.slice(2);
  try {
    if (mode === 'baseline') mkBaseline(rest[0]);
    else if (mode === 'check') { const r = check({ warn: rest.includes('--warn') }); process.exit(r.totals.hard ? 1 : 0); }
    else if (mode === 'cs') buildCs(rest[0]);
    else if (mode === 'precheck') precheck(rest[0], rest[1]);
    else if (mode === 'verify') process.exit(verify(rest[0], rest[1]));
    else { console.error('modes: baseline <dump> | check [--warn] | cs <from-to> | precheck <from-to> <live> | verify <from-to> <live>'); process.exit(64); }
  } catch (e) { console.error(`bre-rebuild-374: ${e.message}`); process.exit(1); }
}
module.exports = { parse, rowsFor, isApplied };

#!/usr/bin/env node
// Turn per-seed plan files into ONE edit-batch payload + /v2/validate overrides, and
// pre-check the result with the course-builder's own functions.
//
// usage: node build.cjs <course> <batch-name> <fromSeed> <toSeed>
//   reads   <course>/plans/S####.json for seeds in range
//   writes  <course>/batches/<batch>.ops.json        (POST body for edit-batch: {"ops":[…]})
//           <course>/batches/<batch>.overrides.json  (one /v2/validate override per seed)
//           <course>/batches/<batch>.check.json      (per-LEGO before/after, errors, warnings)
//   exits 1 if any ERROR (a batch with errors is never posted).
//
// Plan file:
// { "seed": 506,
//   "legos": { "L01": { "delete": ["B02","U01"],                  // row suffixes
//                       "update": { "U02": ["known", "target"] },  // rewrite in place (keeps id/role/position)
//                       "insert": [["build","known","target"], ["use","known","target"]],
//                       "accept_gap": "why the floor cannot be met (reported, never hidden)" } },
//   "notes": "…" }
//
// Rules enforced here (canon P1/P2 taught words, P17 whole LEGO, ZUT, floor 3 BUILD / 5 USE):
//  - a touched row must be unchanged since the author SAW it (seen/S####.json) and not edited today
//    by anyone (collision rule) and not on the collide list (<course>/collide.json);
//  - new/rewritten rows: contain the LEGO, are not the bare LEGO, use only taught chunks
//    (prior seeds + this seed's LEGOs up to this one), are not a duplicate in the basket, and
//    their known side never maps to a different target anywhere in the course (ZUT);
//  - after the edit every touched NEW LEGO passes checkBuildUsePhrases, unless accept_gap says why.
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const [course, batch, fromS, toS] = process.argv.slice(2);
const lo = Number(fromS), hi = Number(toS);
const cdir = path.join(L.ITEM_DIR, course);
const chinese = L.isChinese(course);
const seeds = L.loadLive(course);
const collide = new Set(fs.existsSync(path.join(cdir, 'collide.json')) ? JSON.parse(fs.readFileSync(path.join(cdir, 'collide.json'), 'utf8')).map(x => String(x).split(':').pop()) : []);
// Every event this job wrote, whichever worker wrote it (events-<owner>.json, one per worker, so branches never conflict).
const ourEvents = new Set(fs.readdirSync(cdir).filter(f => /^events.*\.json$/.test(f)).flatMap(f => JSON.parse(fs.readFileSync(path.join(cdir, f), 'utf8')).map(e => e.event_id)));

const plans = [];
for (const f of fs.readdirSync(path.join(cdir, 'plans')).filter(f => /^S\d{4}\.json$/.test(f)).sort()) {
  const p = JSON.parse(fs.readFileSync(path.join(cdir, 'plans', f), 'utf8'));
  if (p.seed >= lo && p.seed <= hi) plans.push(p);
}
const planBySeed = new Map(plans.map(p => [p.seed, p]));
const errors = [], warnings = [], checks = [], recordedToday = [];
const scan = L.scanRows(course);
const E = (where, msg) => errors.push(`${where}: ${msg}`);
const W = (where, msg) => warnings.push(`${where}: ${msg}`);
const zk = (t) => L.normalizeForZUT(t, chinese);

// Rows that leave or change in THIS batch are not ZUT witnesses.
const leaving = new Set();
for (const p of plans) for (const [li, e] of Object.entries(p.legos || {})) {
  const lid = `S${String(p.seed).padStart(4, '0')}${li}`;
  for (const s of e.delete || []) leaving.add(`${lid}${s}`);
  for (const s of Object.keys(e.update || {})) leaving.add(`${lid}${s}`);
}
// Course-wide known→targets (phrases, LEGOs, seeds).
const zut = new Map();
const addZ = (k, t, who) => { const a = zk(k); if (!a) return; if (!zut.has(a)) zut.set(a, new Map()); zut.get(a).set(zk(t), who); };
for (const s of seeds) {
  addZ(s.known_text, s.target_text, `seed ${s.seed_number}`);
  for (const l of s.legos) {
    addZ(l.known_text, l.target_text, l.lego_id);
    for (const ph of l.basket_phrases) if (!leaving.has(L.short(ph.id)) && ph.phrase_role !== 'component') addZ(ph.known_text, ph.target_text, L.short(ph.id));
  }
}

const ops = { inserts: [], updates: [], deletes: [] };
const overrides = [];
const vocab = new Set();
for (const s of seeds) {
  const plan = planBySeed.get(s.seed_number);
  if (!plan) { L.accumulate(s.legos, vocab, chinese); continue; }
  const seedTag = `S${String(s.seed_number).padStart(4, '0')}`;
  const seenFile = path.join(cdir, 'seen', `${seedTag}.json`);
  const seen = fs.existsSync(seenFile) ? JSON.parse(fs.readFileSync(seenFile, 'utf8')).rows : null;
  if (!seen) E(seedTag, 'no seen/ snapshot: run dump.cjs on this seed before planning it');
  const ov = { seed_number: s.seed_number, phrases: {} };
  const vocabHere = new Set(vocab);
  for (const l of s.legos) {
    L.accumulate([l], vocabHere, chinese); // this seed's LEGOs up to and including this one (P2)
    const li = l.lego_id.slice(5);
    const e = (plan.legos || {})[li] || {};
    const byS = new Map(l.basket_phrases.map(p => [L.short(p.id).slice(8), p]));
    const del = new Set(e.delete || []);
    const upd = e.update || {};
    const ins = e.insert || [];
    const touched = del.size || Object.keys(upd).length || ins.length;
    for (const sfx of [...del, ...Object.keys(upd)]) {
      const p = byS.get(sfx);
      const w = `${l.lego_id}${sfx}`;
      if (!p) { E(w, 'row not in the live basket'); continue; }
      if (collide.has(w) || collide.has(l.lego_id)) E(w, 'on the collide list (another job owns it)');
      const sc = scan.get(w);
      if (sc && (sc.known !== p.known_text || sc.target !== p.target_text) && !ourEvents.has(p.last_edit_event_id)) E(w, 'text differs from the 17 Nov scan: another job changed it, leave it alone');
      else if (p.updated_at >= L.TODAY && !ourEvents.has(p.last_edit_event_id)) {
        // The brief's one allowance: #694 fills EMPTY audio slots in these courses today. A scan row whose
        // words are still the scan's and that now has audio was only recorded, not re-worded: go ahead, count it.
        if (sc && (p.known_audio_id || p.target1_audio_id)) { W(w, `recorded today by another job (event ${p.last_edit_event_id}), words unchanged: proceeding`); recordedToday.push(w); }
        else E(w, `edited today by event ${p.last_edit_event_id} (not ours): collision, leave it alone`);
      }
      const sv = seen && seen[w];
      if (seen && (!sv || sv.known !== p.known_text || sv.target !== p.target_text)) E(w, 'row changed since it was seen: re-dump and re-read');
      if (p.phrase_role === 'component') E(w, 'component rows are not touched by this pass');
    }
    if (!l.is_new && ins.length) W(l.lego_id, 'inserting under a NOT-new LEGO: its basket never plays (P25)');
    // Simulate.
    const after = [];
    for (const p of l.basket_phrases) {
      const sfx = L.short(p.id).slice(8);
      if (del.has(sfx)) continue;
      if (upd[sfx]) after.push({ id: p.id, role: p.phrase_role, known: upd[sfx][0], target: upd[sfx][1], fresh: true, was: p });
      else after.push({ id: p.id, role: p.phrase_role, known: p.known_text, target: p.target_text, fresh: false });
    }
    // New ids: next free number per role, above every id the basket has ever shown.
    const maxN = { build: 0, use: 0 };
    for (const p of l.basket_phrases) { const m = L.short(p.id).slice(8).match(/^([BU])(\d+)$/); if (m) { const r = m[1] === 'B' ? 'build' : 'use'; maxN[r] = Math.max(maxN[r], Number(m[2])); } }
    let pos = Math.max(0, ...l.basket_phrases.map(p => p.position));
    for (const [role, known, target] of ins) {
      if (!['build', 'use'].includes(role)) { E(l.lego_id, `insert role must be build|use, not ${role}`); continue; }
      maxN[role]++; pos++;
      const id = L.makePhraseId(course, s.seed_number, l.lego_index, role, maxN[role]);
      after.push({ id, role, known, target, fresh: true, insert: true, position: pos });
    }
    ov.phrases[`${s.seed_number}:${l.lego_index}`] = after.map(a => ({ known_text: a.known, target_text: a.target, phrase_role: a.role }));
    if (!touched) continue;
    // Checks on fresh rows.
    const seenT = new Map();
    for (const a of after) {
      const w = `${L.short(a.id)}`;
      const key = zk(a.target);
      if (seenT.has(key)) (a.fresh ? E : W)(w, `duplicate of ${seenT.get(key)} in the basket: "${a.target}"`); else seenT.set(key, w);
      if (!a.fresh) continue;
      if (!a.known || !a.target || /\s{2}|^\s|\s$/.test(a.known + '|' + a.target)) E(w, 'empty or badly spaced text');
      if (!L.containsLego(course, s.seed_number, l.target_text, a.target)) E(w, `does not contain the LEGO "${l.target_text}": "${a.target}"`);
      if (L.isBareLegoPhrase(a.target, l.target_text)) E(w, 'is the bare LEGO');
      const v = L.checkVocabViolations([{ target: a.target }], vocabHere, course, { seedNumber: s.seed_number, extraTexts: [s.target_text] });
      if (v.length) E(w, `untaught: ${v.map(x => x.unknown).join(', ')} in "${a.target}"`);
      const z = zut.get(zk(a.known));
      if (z) for (const [t, who] of z) if (t !== key) E(w, `ZUT: "${a.known}" already means "${t}" at ${who}; this row says "${a.target}"`);
      addZ(a.known, a.target, w);
    }
    const legoForCheck = (rows) => ({ idx: l.lego_index, type: l.type, known: l.known_text, target: l.target_text,
      build: rows.filter(r => r.role === 'build').map(r => ({ known: r.known, target: r.target })),
      use: rows.filter(r => r.role === 'use').map(r => ({ known: r.known, target: r.target })) });
    const quiet = console.log; console.log = () => {};
    const before = L.checkBuildUsePhrases(legoForCheck(l.basket_phrases.map(p => ({ role: p.phrase_role, known: p.known_text, target: p.target_text }))), course, s.seed_number);
    const aft = L.checkBuildUsePhrases(legoForCheck(after), course, s.seed_number);
    console.log = quiet;
    const realBuild = after.filter(a => a.role === 'build' && !L.isBareLegoPhrase(a.target, l.target_text) && L.containsLego(course, s.seed_number, l.target_text, a.target)).length;
    checks.push({ lego: l.lego_id, is_new: l.is_new, before: before.valid ? 'ok' : before.error, after: aft.valid ? 'ok' : aft.error, real_builds_after: realBuild,
      deleted: del.size, rewritten: Object.keys(upd).length, inserted: ins.length, accept_gap: e.accept_gap || null });
    if (l.is_new && !aft.valid) (e.accept_gap ? W : E)(l.lego_id, `after the edit: ${aft.error}${e.accept_gap ? ` (accepted: ${e.accept_gap})` : ''}`);
    // Ops.
    for (const a of after.filter(a => a.insert)) {
      ops.inserts.push({ op: 'phrase.insert', row: { id: a.id, seed_number: s.seed_number, lego_index: l.lego_index, position: a.position,
        known_text: a.known, target_text: a.target, phrase_role: a.role, introduce: true, connected_lego_ids: [], status: 'draft',
        metadata: { format: 'build_use', pipeline: 'cs700-item4-backfill' }, word_count: a.target.length,
        lego_count: (a.known.match(/\s+/g) || []).length + 1, lego_position: L.computeLegoPosition(a.target, l.target_text) } });
    }
    for (const a of after.filter(a => a.fresh && !a.insert)) {
      ops.updates.push({ op: 'phrase.update', phrase_id: a.id, expect: { known_text: a.was.known_text, target_text: a.was.target_text },
        set: { known_text: a.known, target_text: a.target, decomposition: null, word_count: a.target.length, lego_position: L.computeLegoPosition(a.target, l.target_text) } });
    }
    for (const sfx of del) { const p = byS.get(sfx); if (p) ops.deletes.push({ op: 'phrase.delete', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text } }); }
  }
  overrides.push(ov);
  L.accumulate(s.legos, vocab, chinese);
}
const out = path.join(cdir, 'batches'); fs.mkdirSync(out, { recursive: true });
// Inserts first, then rewrites, then deletes: a debut basket is never empty mid-transaction.
const all = [...ops.inserts, ...ops.updates, ...ops.deletes];
fs.writeFileSync(path.join(out, `${batch}.ops.json`), JSON.stringify({ ops: all }, null, 1));
fs.writeFileSync(path.join(out, `${batch}.overrides.json`), JSON.stringify(overrides, null, 1));
fs.writeFileSync(path.join(out, `${batch}.check.json`), JSON.stringify({ course, batch, seeds: plans.map(p => p.seed), counts: { insert: ops.inserts.length, update: ops.updates.length, delete: ops.deletes.length }, recorded_today_by_others: recordedToday, errors, warnings, checks }, null, 1));
console.log(`${course} ${batch}: seeds ${plans.length}, insert ${ops.inserts.length}, rewrite ${ops.updates.length}, delete ${ops.deletes.length}; ${errors.length} errors, ${warnings.length} warnings`);
for (const x of errors) console.log('ERROR', x);
for (const x of warnings) console.log('warn ', x);
process.exit(errors.length ? 1 : 0);

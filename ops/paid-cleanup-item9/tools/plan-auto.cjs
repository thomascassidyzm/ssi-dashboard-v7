#!/usr/bin/env node
// cs #738·AI (resume of #713·AI): write the MECHANICAL half of the item 9 plan — K15's downward repair.
// For every recount row with status "other" (a target word no seed has taught by then, so the row is
// off-limits: canon K14/K15), plan a DELETE, per seed, in <course>/plans/S####.json, plus the seen/
// snapshot build.cjs needs. Then build.cjs checks every touched NEW LEGO still meets the basket floor
// (checkBuildUsePhrases); a LEGO whose basket would fall below it is taken OUT of the delete plan and
// listed in <course>/backfill.json — those rows need an authored replacement (reword, K15 "edit"),
// never a new LEGO. Rows another job changed since the 17 Nov scan are listed, never touched.
// usage: node plan-auto.cjs <recount.json> <course…>
// Nothing here writes to the DB; build.cjs only reads the snapshot. Dry-run with post.cjs dry.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./lib.cjs');
const [recountFile, ...courses] = process.argv.slice(2);
const rc = JSON.parse(fs.readFileSync(recountFile, 'utf8'));
// eng_for_sin seeds >= 345 are out of this job (#713 non-goal).
const outOfScope = (course, seed) => course === 'eng_for_sin' && seed >= 345;
const pad = (n) => String(n).padStart(4, '0');

for (const course of courses) {
  const cdir = path.join(L.ITEM_DIR, course);
  const rows = (rc.courses[course].rows || []).filter(r => r.status === 'other' && /^S\d{4}L\d{2}[BU]\d+$/.test(r.row));
  const seeds = L.loadLive(course);
  const seedBy = new Map(seeds.map(s => [s.seed_number, s]));
  const skip = new Set(); // LEGO ids pulled out of the delete plan (floor)
  const held = [];
  for (const r of rows) if (outOfScope(course, Number(r.row.slice(1, 5)))) held.push({ row: r.row, why: 'eng_for_sin seed >= 345: out of scope' });
  let report;
  const writePlans = (gaps) => {
    for (const d of ['plans', 'seen']) {
      fs.mkdirSync(path.join(cdir, d), { recursive: true });
      for (const f of fs.readdirSync(path.join(cdir, d)).filter(f => /^S\d{4}\.json$/.test(f))) fs.unlinkSync(path.join(cdir, d, f));
    }
    const bySeed = new Map();
    for (const r of rows) {
      const sn = Number(r.row.slice(1, 5)), li = r.row.slice(5, 8), sfx = r.row.slice(8);
      if (outOfScope(course, sn)) continue;
      if (!bySeed.has(sn)) bySeed.set(sn, { seed: sn, legos: {}, notes: 'cs #738·AI auto plan: delete rows using a target word no seed has taught by then (K14/K15).' });
      const p = bySeed.get(sn);
      const e = (p.legos[li] = p.legos[li] || { delete: [] });
      e.delete.push(sfx);
      const g = gaps[r.row.slice(0, 8)];
      if (g) e.accept_gap = g;
    }
    for (const [sn, p] of bySeed) {
      fs.writeFileSync(path.join(cdir, 'plans', `S${pad(sn)}.json`), JSON.stringify(p, null, 1));
      const s = seedBy.get(sn); const seen = { seed: sn, at: new Date().toISOString(), from: 'live snapshot', rows: {} };
      for (const l of s.legos) for (const ph of l.basket_phrases) seen.rows[L.short(ph.id)] = { known: ph.known_text, target: ph.target_text, updated_at: ph.updated_at };
      fs.writeFileSync(path.join(cdir, 'seen', `S${pad(sn)}.json`), JSON.stringify(seen, null, 1));
    }
    if (!bySeed.size) return null;
    try { execFileSync('node', [path.join(__dirname, 'build.cjs'), course, 'auto', '1', '9999'], { stdio: 'pipe' }); } catch (e) { /* read below */ }
    return JSON.parse(fs.readFileSync(path.join(cdir, 'batches', 'auto.check.json'), 'utf8'));
  };
  // Pass 1: which touched NEW LEGOs end below the floor? Pass 2: mark them accept_gap, pointing at backfill.json.
  report = writePlans({});
  const gaps = {};
  const short = {};
  const fl = (sn) => sn <= 3 ? { b: 1, u: 1 } : { b: 3, u: 5 };
  if (report) for (const c of report.checks) {
    if (!c.is_new || c.after === 'ok') continue;
    const lid = c.lego; const sn = Number(lid.slice(1, 5));
    const s = seedBy.get(sn); const l = s.legos.find(x => x.lego_id === lid);
    const gone = new Set(rows.filter(r => r.row.startsWith(lid)).map(r => r.row));
    const counted = (ps) => { const k = ps.filter(p => !L.isBareLegoPhrase(p.target_text, l.target_text) && L.containsLego(course, sn, l.target_text, p.target_text));
      return { b: k.filter(p => p.phrase_role === 'build').length, u: k.filter(p => p.phrase_role === 'use').length }; };
    const bef = counted(l.basket_phrases), aft = counted(l.basket_phrases.filter(p => !gone.has(L.short(p.id))));
    const f = fl(sn);
    // Never leave a basket worse than item 9 found it: author back to min(floor, what it had).
    const ab = Math.max(0, Math.min(f.b, bef.b) - aft.b), au = Math.max(0, Math.min(f.u, bef.u) - aft.u);
    const tAvg = Math.round(l.basket_phrases.reduce((t, p) => t + p.target_text.length, 0) / Math.max(1, l.basket_phrases.length));
    const kAvg = Math.round(l.basket_phrases.reduce((t, p) => t + p.known_text.length, 0) / Math.max(1, l.basket_phrases.length));
    short[lid] = { lego: `${l.known_text} | ${l.target_text}`, before: c.before === 'ok' ? 'ok' : 'already under floor', delete: gone.size,
      counted_before: bef, counted_after: aft, author_build: ab, author_use: au, avg_target_chars: tAvg, avg_known_chars: kAvg,
      rows: rows.filter(r => r.row.startsWith(lid)).map(r => ({ row: r.row, role: r.role, known: r.known, target: r.target, untaught: r.untaught })) };
    gaps[lid] = ab + au
      ? `back-fill ${ab} BUILD + ${au} USE authored from taught chunks before these deletes apply (backfill.json)`
      : `basket was already under the floor before item 9 (${c.before}); deletes do not lower its counted rows`;
  }
  if (Object.keys(gaps).length) report = writePlans(gaps);
  const floor = Object.values(short).filter(x => x.author_build + x.author_use);
  fs.writeFileSync(path.join(cdir, 'backfill.json'), JSON.stringify({ course, at: new Date().toISOString(),
    note: 'Rows NOT in the delete plan. why=floor: deleting them drops a NEW LEGO below the BUILD/USE floor, so each needs an authored reword from taught chunks (K15 "edit"); other reasons: held as stated.',
    shortfall: short, held, errors: report ? report.errors : [] }, null, 1));
  const c = report ? report.counts : { delete: 0 };
  const nAuthor = floor.reduce((t, x) => t + x.author_build + x.author_use, 0);
  console.log(`${course.padEnd(16)} rows ${rows.length}  delete ${c.delete}  backfill ${nAuthor} rows on ${floor.length} LEGOs  held ${held.length}  build-errors ${report ? report.errors.length : 0}`);
}

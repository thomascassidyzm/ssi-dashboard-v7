#!/usr/bin/env node
// cs #79·AJ (Kai approved item 20 on 19 Nov ~17:05Z: "Happy with item 20"): turn the #740·AI item-20 plan (sheet.json
// per course) into ONE ssi-changeset/1 file per course for Popty's governed applier (tools/changeset/apply-changeset.cjs),
// re-based on the NIGHTLY COPY. Reads files only; no SQL, no network:
//   1. item 9's copy-live.cjs snapshot of the course must already be in ITEM20_LIVE_DIR (the #931 copy reader);
//   2. reserved.json: what the OTHER queued changesets on main will do to these courses first — item 9 (any op: that
//      LEGO is owned, a re-cut owns its whole seed) and item 12 (seed-sentence USE inserts: their ids, positions and
//      texts are reserved so ours never collide on UNIQUE(seed, lego, position), an id, ZUT or Kai's duplicate rule);
//   3. sheet2plans → work-plans/, then build.cjs (the course-builder's own checks) on the copy, re-run until 0 errors:
//      a row that moved since #740 saw it on 18 Nov (not in the basket / words changed / on the collide list) is DRIFT
//      and dropped; a rewrite that now fails a check is dropped alone; any other error holds its whole LEGO (a badly
//      hit basket is rebuilt later, never patched here); a seed-level error holds the seed;
//   4. writes <course>/changesets/item20.changeset.jsonl (inserts, then rewrites; each op's `expect` = the copy's
//      words) + item20.guards.json (each op's seed + LEGO text from the copy, for precheck-guards.cjs — Kai's live
//      pre-check of LEGO and seed) + summary.json (counts, every held/drift row with its reason).
// usage: ITEM20_LIVE_DIR=<dir> node to-changesets.cjs <course> [...]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const cs = require('../../../services/shared/changeset.cjs');
const ITEM = path.resolve(__dirname, '..');
const OPS = path.resolve(ITEM, '..');
const LIVE = process.env.ITEM20_LIVE_DIR;
if (!LIVE) { console.error('set ITEM20_LIVE_DIR to the copy-live snapshot dir'); process.exit(1); }
const JOB = '#79·AJ';
const KAI_GO = 'Kai approved paid-cleanup item 20 (thin Indic baskets) with its audio on Saturday 21 Nov: "Happy with item 20", 19 Nov ~17:05Z';
const DRIFT_RE = /row not in the live basket|row changed since it was seen|edited today by event|on the collide list/;
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const lidOf = (id) => String(id).split(':').pop().slice(0, 8);

function reserved(course) {
  const owned = {}, inserts = [];
  const files = [];
  const d9 = path.join(OPS, 'paid-cleanup-item9', course, 'changesets');
  if (fs.existsSync(d9)) for (const f of fs.readdirSync(d9).filter((f) => f.endsWith('.changeset.jsonl'))) files.push(['item 9 ' + f.replace('.changeset.jsonl', ''), path.join(d9, f)]);
  const f12 = path.join(OPS, 'paid-cleanup-717', 'item12', course, 'item12.changeset.jsonl');
  if (fs.existsSync(f12)) files.push(['item 12', f12]);
  for (const [by, f] of files) {
    const { ops } = cs.read(f);
    const recutSeeds = new Set(ops.filter((o) => o.op === 'lego.update').map((o) => lidOf(o.lego_id).slice(0, 5)));
    for (const o of ops) {
      if (o.op === 'phrase.insert') inserts.push({ by, id: o.row.id, position: o.row.position, known_text: o.row.known_text, target_text: o.row.target_text });
      if (by === 'item 12') continue; // item 12 only adds one USE row: reserved, not owned
      const id = o.op === 'phrase.insert' ? o.row.id : (o.phrase_id || o.lego_id);
      if (id) owned[lidOf(id)] = by;
    }
    if (recutSeeds.size) {
      const snap = rd(path.join(LIVE, `${course}.json`));
      for (const s of snap.seeds) for (const l of s.legos) if (recutSeeds.has(l.lego_id.slice(0, 5))) owned[l.lego_id] = `${by} (seed re-cut)`;
    }
  }
  return { owned, inserts };
}

function run(course) {
  const cdir = path.join(ITEM, course);
  const copy = rd(path.join(LIVE, `${course}.json`));
  const res = reserved(course);
  const resFile = path.join(cdir, 'reserved.json');
  fs.writeFileSync(resFile, JSON.stringify(res, null, 1));
  // plans/ = sheet2plans output + any hand plan (#718 urd probe). Work on a copy so plans/ stays the approved plan.
  execFileSync('node', [path.join(__dirname, 'sheet2plans.cjs'), course], { stdio: ['ignore', 'ignore', 'inherit'] });
  const wdir = path.join(cdir, 'work-plans');
  fs.rmSync(wdir, { recursive: true, force: true }); fs.mkdirSync(wdir);
  const plans = new Map(fs.readdirSync(path.join(cdir, 'plans')).filter((f) => /^S\d{4}\.json$/.test(f)).map((f) => [f, rd(path.join(cdir, 'plans', f))]));
  const planned = [...plans.values()].reduce((n, p) => n + Object.values(p.legos || {}).reduce((m, e) => m + Object.keys(e.update || {}).length + (e.insert || []).length, 0), 0);
  const held = { drift: [], row: [], lego: [], seed: [] };
  const env = { ...process.env, ITEM20_LIVE_DIR: LIVE, ITEM20_PLANS: 'work-plans', ITEM20_RESERVED: resFile };
  const save = () => { for (const f of fs.readdirSync(wdir)) fs.unlinkSync(path.join(wdir, f)); for (const [f, p] of plans) if (Object.keys(p.legos || {}).length) fs.writeFileSync(path.join(wdir, f), JSON.stringify(p)); };
  const rowsOf = (e) => Object.keys(e.update || {}).length + (e.insert || []).length;
  let check;
  for (let round = 0; round < 15; round++) {
    save();
    try { execFileSync('node', [path.join(__dirname, 'build.cjs'), course, 'cs79', '1', '9999'], { env, stdio: ['ignore', 'ignore', 'ignore'] }); } catch { /* errors read from check.json */ }
    check = rd(path.join(cdir, 'batches', 'cs79.check.json'));
    if (!check.errors.length) break;
    for (const e of check.errors) {
      const raw = e.split(':')[0], msg = e.slice(raw.length + 2);
      const m = raw.match(/^S(\d{4})(L\d\d)?(\w*)$/);
      if (!m) throw new Error(`${course}: unparsed build error ${e}`);
      const tag = `S${m[1]}`, li = m[2] || '', sfx = m[3] || '', f = `${tag}.json`, p = plans.get(f);
      if (!p) continue;
      const ent = li && p.legos && p.legos[li];
      if (sfx && ent && ent.update && ent.update[sfx]) {
        (DRIFT_RE.test(msg) ? held.drift : held.row).push({ row: `${tag}${li}${sfx}`, why: msg.slice(0, 200), en: ent.update[sfx][1] });
        delete ent.update[sfx];
        if (!rowsOf(ent)) delete p.legos[li];
      } else if (ent) {
        held.lego.push({ lego: `${tag}${li}`, rows: rowsOf(ent), why: `${raw}: ${msg}`.slice(0, 220) }); delete p.legos[li];
      } else if (!li) {
        held.seed.push({ seed: tag, rows: Object.values(p.legos || {}).reduce((n, x) => n + rowsOf(x), 0), why: msg.slice(0, 200) }); plans.delete(f);
      }
    }
  }
  if (check.errors.length) throw new Error(`${course}: still ${check.errors.length} errors: ${check.errors.slice(0, 3).join(' | ')}`);
  const ops = rd(path.join(cdir, 'batches', 'cs79.ops.json')).ops;
  if (ops.some((o) => o.op === 'phrase.delete')) throw new Error(`${course}: item 20 never deletes`);
  const odir = path.join(cdir, 'changesets'); fs.mkdirSync(odir, { recursive: true });
  const file = path.join(odir, 'item20.changeset.jsonl');
  cs.write(file, { id: `item20-${course}`, course, job: JOB, kai_go: KAI_GO,
    why: 'paid cleanup item 20: thin build baskets get real build rows (bare-LEGO build rows rewritten in place, plus inserts), plan #740·AI, checked by the course-builder functions on the copy with 0 errors',
    source: `nightly copy ${copy.copy_db} built ${copy.copy_built}` }, ops.map((o) => cs.op(o.op, Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'op')))));
  const seedBy = new Map(copy.seeds.map((s) => [s.seed_number, s]));
  const guards = ops.map((o) => {
    const lid = lidOf(o.op === 'phrase.insert' ? o.row.id : o.phrase_id), sn = Number(lid.slice(1, 5));
    const s = seedBy.get(sn), l = s && s.legos.find((x) => x.lego_id === lid);
    if (!l) throw new Error(`${course}: no copy LEGO ${lid}`);
    return { seed_number: sn, seed: { known_text: s.known_text, target_text: s.target_text }, lego_id: lid, lego: [{ known_text: l.known_text, target_text: l.target_text }] };
  });
  fs.writeFileSync(path.join(odir, 'item20.guards.json'), JSON.stringify({ changeset: `item20-${course}`, copy_db: copy.copy_db, guards }));
  const ins = ops.filter((o) => o.op === 'phrase.insert').length, upd = ops.filter((o) => o.op === 'phrase.update').length;
  const summary = { course, copy_db: copy.copy_db, copy_built: copy.copy_built, planned_rows: planned, ops: ops.length, insert: ins, rewrite: upd,
    held_rows: held.drift.length + held.row.length + held.lego.reduce((n, x) => n + x.rows, 0) + held.seed.reduce((n, x) => n + x.rows, 0),
    reserved: { owned_legos: Object.keys(res.owned).length, inserts: res.inserts.length }, warnings: check.warnings.length, held };
  fs.writeFileSync(path.join(odir, 'summary.json'), JSON.stringify(summary, null, 1));
  fs.writeFileSync(path.join(odir, 'check.json'), JSON.stringify({ errors: check.errors, warnings: check.warnings, checks: check.checks }, null, 1));
  for (const f of fs.readdirSync(path.join(cdir, 'batches')).filter((f) => f.startsWith('cs79.'))) fs.unlinkSync(path.join(cdir, 'batches', f));
  fs.rmSync(wdir, { recursive: true, force: true });
  return summary;
}

for (const course of process.argv.slice(2)) {
  try {
    const s = run(course);
    console.log(`${course}: planned ${s.planned_rows} -> ops ${s.ops} (insert ${s.insert}, rewrite ${s.rewrite}); held ${s.held_rows} [drift ${s.held.drift.length}, row ${s.held.row.length}, lego ${s.held.lego.length}, seed ${s.held.seed.length}]; reserved owned ${s.reserved.owned_legos} inserts ${s.reserved.inserts}; warnings ${s.warnings}`);
  } catch (e) { console.log(`${course}: FAILED ${e.message}`); process.exitCode = 1; }
}

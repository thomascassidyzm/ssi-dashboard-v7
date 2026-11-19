#!/usr/bin/env node
// cs #972·AI — item 9 DELETE-ONLY mode. Kai, 19 Nov 12:25Z: "I'd prefer to get the bad phrases out and have the baskets
// temporarily thin over having bad phrases in the course." #960's to-changesets.cjs set aside every delete whose LEGO
// needed back-fill that was never authored (summary.json set_aside.unauthored, 559 deletes on 308 LEGOs in 17 courses).
// This tool queues exactly those deletes, WITHOUT back-fill, as <course>/changesets/5-thin.changeset.jsonl (+ its
// 5-thin.guards.json sidecar for precheck-guards.cjs). It never touches #960's files (their ledgers key ops by line).
// Computed on the NIGHTLY COPY only (copy-live.cjs → the #931 reader, which refuses anything but the local copy).
//
//   1. the LEGOs come from summary.json set_aside.unauthored; their deletes from the mechanical plan (plans/S####.json);
//   2. a planned row no longer in the copy's basket is DRIFT: dropped and counted, never chased;
//   3. P30 (HARD, canon): a debut LEGO (is_new) must keep at least ONE real practice phrase (BUILD or USE, never the
//      bare LEGO — the same test as services/shared/debut-practice.cjs). If its deletes would leave zero, ALL of that
//      LEGO's deletes are HELD (not queued) and listed. Thin above zero is fine (Kai's ruling above; P30 SOFT part);
//   4. build.cjs (ITEM9_PLANS=thin) re-checks every row on the copy exactly as for #960's files (collision / seen /
//      scan / collide list). A drift-shaped error drops that row; any other error sets its LEGO aside. Rebuilt until clean;
//   5. each op's `expect` = the copy's row text (the applier sets aside a live mismatch), and the guards sidecar
//      carries the seed + LEGO text for the live pre-check right before apply (Kai 19 Nov: mismatch held, never forced);
//   6. <course>/changesets/thin-summary.json: drift, P30 holds, errors, and the floor state (phraseFloor) after the
//      deletes of every LEGO touched — the worklist a later back-fill job authors from (THIN-BASKETS.md / .json).
// usage: node to-thin.cjs <course> [<course> …]
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const cs = require('../../../services/shared/changeset.cjs');
const L = require('./lib.cjs');
const { phraseFloor } = require('../../../services/course-builder/lib/phrase-structure.cjs');
const ITEM = path.resolve(__dirname, '..');
const LIVE = process.env.ITEM9_LIVE_DIR || path.join(process.env.CS_SCRATCH || require('os').tmpdir(), 'item9-copylive');
const JOB = '#972·AI';
const KAI_GO = 'Kai approved paid-cleanup item 9 (untaught words) 18 Nov 15:41Z; 19 Nov 12:25Z: delete the bad rows now, baskets temporarily thin, back-fill later';
const GAP = 'Kai 19 Nov 12:25Z: thin baskets over bad phrases; back-fill later (THIN-BASKETS.md). P30: never empty.';
const DRIFT_RE = /row not in the live basket|text differs from the 17 Nov scan|edited today by event|row changed since it was seen|on the collide list/;
const NAME = '5-thin';
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const env = { ...process.env, ITEM9_LIVE_DIR: LIVE, ITEM9_PLANS: 'thin' };

function run(course) {
  const cdir = path.join(ITEM, course);
  if (fs.existsSync(path.join(cdir, 'authored'))) throw new Error('has authored/ back-fill: not a delete-only course');
  const sum960 = rd(path.join(cdir, 'changesets', 'summary.json'));
  const want = new Set((sum960.set_aside.unauthored || []).map((u) => u.lego));
  const plannedN = (sum960.set_aside.unauthored || []).reduce((a, u) => a + u.deletes, 0);
  execFileSync('node', [path.join(__dirname, 'copy-live.cjs'), course, LIVE], { stdio: ['ignore', 'ignore', 'inherit'] });
  const copy = rd(path.join(LIVE, `${course}.json`));
  const seedBy = new Map(copy.seeds.map((s) => [s.seed_number, s]));
  const plans = new Map();
  const drift = [], heldP30 = [], errors = [];
  for (const f of fs.readdirSync(path.join(cdir, 'plans')).filter((f) => /^S\d{4}\.json$/.test(f)).sort()) {
    const p = rd(path.join(cdir, 'plans', f));
    const legos = {};
    for (const [li, e] of Object.entries(p.legos || {})) {
      const lid = `${f.slice(0, 5)}${li}`;
      if (!want.has(lid) || !(e.delete || []).length) continue;
      const s = seedBy.get(p.seed), l = s && s.legos.find((x) => x.lego_id === lid);
      if (!l) { for (const sfx of e.delete) drift.push({ row: `${lid}${sfx}`, why: 'LEGO not in the copy' }); continue; }
      const bySfx = new Map(l.basket_phrases.map((ph) => [L.short(ph.id).slice(8), ph]));
      const del = e.delete.filter((sfx) => { if (bySfx.has(sfx)) return true; drift.push({ row: `${lid}${sfx}`, why: 'row not in the copy basket' }); return false; });
      if (!del.length) continue;
      // P30 (HARD): what real practice is left once these go? Bare LEGO rows and components never count.
      const left = l.basket_phrases.filter((ph) => (ph.phrase_role === 'build' || ph.phrase_role === 'use')
        && !del.includes(L.short(ph.id).slice(8)) && !L.isBareLegoPhrase(ph.target_text, l.target_text));
      if (l.is_new && !left.length) {
        heldP30.push({ lego: lid, known: l.known_text, target: l.target_text, deletes: del.map((sfx) => ({ row: `${lid}${sfx}`,
          role: bySfx.get(sfx).phrase_role, known: bySfx.get(sfx).known_text, target: bySfx.get(sfx).target_text })) });
        continue;
      }
      legos[li] = { delete: del, accept_gap: GAP };
    }
    if (Object.keys(legos).length) plans.set(f, { seed: p.seed, legos, notes: `cs #972 delete-only (thin); from #738/#778 plan` });
  }
  const tdir = path.join(cdir, 'thin');
  const save = () => { fs.rmSync(tdir, { recursive: true, force: true }); fs.mkdirSync(tdir, { recursive: true });
    for (const [f, p] of plans) if (Object.keys(p.legos).length) fs.writeFileSync(path.join(tdir, f), JSON.stringify(p, null, 1)); };
  let check;
  for (let round = 0; round < 12; round++) {
    save();
    try { execFileSync('node', [path.join(__dirname, 'build.cjs'), course, 'cs972', '1', '9999'], { env, stdio: ['ignore', 'ignore', 'ignore'] }); } catch { /* read check.json */ }
    check = rd(path.join(cdir, 'batches', 'cs972.check.json'));
    if (!check.errors.length) break;
    for (const e of check.errors) {
      const raw = e.split(':')[0], msg = e.slice(raw.length + 2);
      const m = raw.match(/^S0*(\d+)(L\d\d)?(\w*)$/);
      if (!m) throw new Error(`unparsed build error ${e}`);
      const tag = `S${m[1].padStart(4, '0')}`, li = m[2] || '', sfx = m[3] || '', p = plans.get(`${tag}.json`);
      if (!p) continue;
      if (sfx && DRIFT_RE.test(msg) && p.legos[li]) {
        p.legos[li].delete = p.legos[li].delete.filter((x) => x !== sfx);
        if (!drift.some((d) => d.row === raw)) drift.push({ row: raw, why: msg.slice(0, 160) });
        if (!p.legos[li].delete.length) delete p.legos[li];
      } else if (li && p.legos[li]) { errors.push({ lego: `${tag}${li}`, why: msg.slice(0, 200) }); delete p.legos[li]; }
      else { errors.push({ seed: tag, why: `${raw}: ${msg}`.slice(0, 200) }); plans.delete(`${tag}.json`); }
    }
  }
  if (check.errors.length) throw new Error(`still ${check.errors.length} errors after 12 rounds: ${check.errors.slice(0, 3).join(' | ')}`);
  const ops = rd(path.join(cdir, 'batches', 'cs972.ops.json')).ops;
  if (ops.some((o) => o.op !== 'phrase.delete')) throw new Error('delete-only mode produced a non-delete op');
  // Floor after the deletes, per LEGO touched (dropping a drift row can only make a basket fuller, so P30 still holds).
  const floor = [];
  for (const [f, p] of plans) for (const [li, e] of Object.entries(p.legos)) {
    const lid = `${f.slice(0, 5)}${li}`, s = seedBy.get(p.seed), l = s.legos.find((x) => x.lego_id === lid);
    const left = l.basket_phrases.filter((ph) => !e.delete.includes(L.short(ph.id).slice(8)) && !L.isBareLegoPhrase(ph.target_text, l.target_text));
    const b = left.filter((ph) => ph.phrase_role === 'build').length, u = left.filter((ph) => ph.phrase_role === 'use').length;
    const { minBuild, minUse } = phraseFloor(p.seed, l.lego_index);
    if (l.is_new && b + u === 0) throw new Error(`P30: ${lid} would be empty (guard failed)`);
    floor.push({ lego: lid, is_new: l.is_new, known: l.known_text, target: l.target_text, deletes: e.delete.length,
      build: b, use: u, min_build: minBuild, min_use: minUse, below_floor: !!l.is_new && (b < minBuild || u < minUse) });
  }
  const odir = path.join(cdir, 'changesets');
  const file = path.join(odir, `${NAME}.changeset.jsonl`);
  for (const f of [file, file.replace(/\.changeset\.jsonl$/, '.guards.json')]) if (fs.existsSync(f) && fs.existsSync(`${file}.applied.jsonl`)) throw new Error(`${f} already has a ledger: never rewrite a scheduled file`);
  if (ops.length) {
    cs.write(file, { id: `item9-${course}-${NAME}`, course, job: JOB, kai_go: KAI_GO,
      why: 'paid cleanup item 9 (untaught words): delete-only, back-fill never authored; basket left thin, never empty (P30); runs after #960\'s files',
      source: `nightly copy ${copy.copy_db} built ${copy.copy_built}` }, ops.map((o) => cs.op(o.op, Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'op')))));
    const guards = ops.map((o) => {
      const id = String(o.phrase_id).replace(/^.*:/, ''), sn = Number(id.slice(1, 5)), lid = id.slice(0, 8);
      const s = seedBy.get(sn), l = s && s.legos.find((x) => x.lego_id === lid);
      if (!l) throw new Error(`no copy seed/LEGO for ${lid}`);
      return { seed_number: sn, seed: { known_text: s.known_text, target_text: s.target_text }, lego_id: lid, lego: [{ known_text: l.known_text, target_text: l.target_text }] };
    });
    fs.writeFileSync(file.replace(/\.changeset\.jsonl$/, '.guards.json'), JSON.stringify({ changeset: `item9-${course}-${NAME}`, copy_db: copy.copy_db, guards }));
  }
  const summary = { course, job: JOB, copy_db: copy.copy_db, copy_built: copy.copy_built, planned_deletes: plannedN, planned_legos: want.size,
    queued: { deletes: ops.length, legos: floor.length }, drift, held_p30: heldP30, error: errors, floor };
  fs.writeFileSync(path.join(odir, 'thin-summary.json'), JSON.stringify(summary, null, 1));
  for (const f of fs.readdirSync(path.join(cdir, 'batches')).filter((f) => f.startsWith('cs972.'))) fs.unlinkSync(path.join(cdir, 'batches', f));
  fs.rmSync(tdir, { recursive: true, force: true });
  return summary;
}

for (const course of process.argv.slice(2)) {
  try {
    const s = run(course);
    console.log(`${course}: planned ${s.planned_deletes} on ${s.planned_legos} LEGOs; queued ${s.queued.deletes} on ${s.queued.legos}; drift ${s.drift.length}; P30 held ${s.held_p30.reduce((a, h) => a + h.deletes.length, 0)} on ${s.held_p30.length}; error ${s.error.length}; below floor ${s.floor.filter((x) => x.below_floor).length}`);
  } catch (e) { console.log(`${course}: FAILED ${e.message}`); process.exitCode = 1; }
}

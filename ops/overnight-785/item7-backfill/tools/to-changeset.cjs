#!/usr/bin/env node
// cs #791·AK (overnight #785 item 7): authored back-fill (<course>/authored/S####.json, item-9 schema, INSERTS ONLY)
// → build.cjs check on the copy snapshot → ONE ssi-changeset/1 file per course + guards sidecar (seed + LEGO text from
// the copy, for precheck-guards.cjs / Kai's live pre-check). Reads JSON only; writes nothing to any database.
// A LEGO whose rows fail the build is dropped whole and listed in summary.json (never forced); rebuilt until 0 errors.
// usage: ITEM9_LIVE_DIR=<snapshot dir> node to-changeset.cjs <course> [...]
//        … to-changeset.cjs --dry <course>   prints every build error/warning of the authored rows and writes NOTHING
//        (the authoring loop: fix the rows it names, re-run, until 0 errors; only then run without --dry)
//   check: node tools/changeset/apply-changeset.cjs <course>/changesets/backfill.changeset.jsonl --check
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const HERE = path.resolve(__dirname, '..');
const ROOT = path.resolve(HERE, '../../..');
const cs = require(path.join(ROOT, 'services/shared/changeset.cjs'));
const BUILD = path.join(ROOT, 'ops/paid-cleanup-item9/tools/build.cjs');
const LIVE = process.env.ITEM9_LIVE_DIR;
if (!LIVE) { console.error('set ITEM9_LIVE_DIR to the copy snapshot dir'); process.exit(1); }
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const env = { ...process.env, ITEM9_ITEM_DIR: HERE, ITEM9_PLANS: 'staged', ITEM9_COURSE_DUP: '1' };
const KAI_GO = 'Kai Y 23 Nov 11:02Z on the overnight #785 run (#779·AK menu: item 9 back-fill for 17 courses, authored as night changesets, NOT applied tonight; apply needs Kai\'s own Y)';

const DRY = process.argv.includes('--dry');
function run(course) {
  const cdir = path.join(HERE, course), adir = path.join(cdir, 'authored'), sdir = path.join(cdir, 'staged');
  const copy = rd(path.join(LIVE, `${course}.json`));
  const plans = new Map();
  for (const f of fs.readdirSync(adir).filter((f) => /^S\d{4}\.json$/.test(f))) {
    const a = rd(path.join(adir, f));
    for (const [li, e] of Object.entries(a.legos || {})) {
      if (e.update || e.delete || e.keep) throw new Error(`${f} ${li}: item 7 is inserts only`);
    }
    if (a.lego_ops) throw new Error(`${f}: item 7 makes no LEGO ops`);
    plans.set(f, { seed: a.seed, legos: Object.fromEntries(Object.entries(a.legos || {}).map(([li, e]) => [li, { insert: e.insert || [], accept_gap: e.accept_gap || 'thin basket accepted (Kai 19 Nov: thin baskets over bad phrases)' }])) });
  }
  const dropped = [];
  let check;
  for (let round = 0; round < 20; round++) {
    fs.rmSync(sdir, { recursive: true, force: true }); fs.mkdirSync(sdir, { recursive: true });
    for (const [f, p] of plans) if (Object.keys(p.legos).length) fs.writeFileSync(path.join(sdir, f), JSON.stringify(p, null, 1));
    try { execFileSync('node', [BUILD, course, 'i785', '1', '9999'], { env, stdio: ['ignore', 'ignore', 'ignore'] }); } catch { /* read check.json */ }
    check = rd(path.join(cdir, 'batches', 'i785.check.json'));
    if (DRY) { for (const x of check.errors) console.log('ERROR', x); for (const x of check.warnings) console.log('warn ', x);
      for (const f of fs.readdirSync(path.join(cdir, 'batches')).filter((f) => f.startsWith('i785.'))) fs.unlinkSync(path.join(cdir, 'batches', f));
      fs.rmSync(sdir, { recursive: true, force: true });
      return { dry: true, errors: check.errors.length, warnings: check.warnings.length, counts: check.counts }; }
    if (!check.errors.length) break;
    for (const e of check.errors) {
      const raw = e.split(':')[0];
      const m = raw.match(/^(S\d{4})(L\d\d)?/);
      const p = m && plans.get(`${m[1]}.json`);
      if (!p) { if (m) continue; throw new Error(`unparsed ${e}`); }
      if (m[2] && p.legos[m[2]]) { dropped.push({ lego: `${m[1]}${m[2]}`, why: e.slice(0, 240) }); delete p.legos[m[2]]; }
      else if (!m[2]) { dropped.push({ seed: m[1], why: e.slice(0, 240) }); plans.delete(`${m[1]}.json`); }
    }
  }
  if (check.errors.length) throw new Error(`still errors: ${check.errors.slice(0, 3).join(' | ')}`);
  const ops = rd(path.join(cdir, 'batches', 'i785.ops.json')).ops;
  if (ops.some((o) => o.op !== 'phrase.insert')) throw new Error('non-insert op produced');
  const odir = path.join(cdir, 'changesets'); fs.mkdirSync(odir, { recursive: true });
  const file = path.join(odir, 'backfill.changeset.jsonl');
  if (fs.existsSync(`${file}.applied.jsonl`)) throw new Error('this file already has a ledger: never rewrite an applied file');
  for (const o of ops) o.row.metadata = { ...o.row.metadata, pipeline: 'cs785-item7-backfill' };
  cs.write(file, { id: `item7-backfill-${course}`, course, job: '#791·AK (overnight #785·AK item 7)', kai_go: KAI_GO,
    why: 'paid cleanup item 9 back-fill: BUILD/USE rows authored from taught chunks for debut LEGOs left thin by the 5-thin deletes (#972·AI); inserts only, no audio rendered (an audio pass is queued after apply)',
    source: `nightly copy ${copy.copy_db} built ${copy.copy_built}` }, ops.map((o) => cs.op(o.op, { row: o.row })));
  const bySeed = new Map(copy.seeds.map((s) => [s.seed_number, s]));
  const guards = ops.map((o) => {
    const s = bySeed.get(o.row.seed_number), lid = `S${String(o.row.seed_number).padStart(4, '0')}L${String(o.row.lego_index).padStart(2, '0')}`;
    const l = s.legos.find((x) => x.lego_id === lid);
    return { seed_number: s.seed_number, seed: { known_text: s.known_text, target_text: s.target_text }, lego_id: lid, lego: [{ known_text: l.known_text, target_text: l.target_text }] };
  });
  fs.writeFileSync(file.replace(/\.changeset\.jsonl$/, '.guards.json'), JSON.stringify({ changeset: `item7-backfill-${course}`, copy_db: copy.copy_db, guards }));
  const wl = rd(path.join(cdir, 'worklist.json'));
  const byLego = new Map(); for (const o of ops) { const k = `S${String(o.row.seed_number).padStart(4, '0')}L${String(o.row.lego_index).padStart(2, '0')}`; byLego.set(k, (byLego.get(k) || { build: 0, use: 0 })); byLego.get(k)[o.row.phrase_role]++; }
  const floor = wl.legos.filter((r) => r.state === 'short').map((r) => { const a = byLego.get(r.lego) || { build: 0, use: 0 };
    return { lego: r.lego, build_before: r.build, use_before: r.use, add_build: a.build, add_use: a.use,
      still_short_build: Math.max(0, r.need_build - a.build), still_short_use: Math.max(0, r.need_use - a.use) }; });
  const audioChars = ops.reduce((a, o) => a + [...o.row.known_text].length + 2 * [...o.row.target_text].length, 0);
  const summary = { course, copy_db: copy.copy_db, inserts: ops.length, build: ops.filter((o) => o.row.phrase_role === 'build').length,
    use: ops.filter((o) => o.row.phrase_role === 'use').length, legos_filled_to_floor: floor.filter((x) => !x.still_short_build && !x.still_short_use).length,
    legos_still_thin: floor.filter((x) => x.still_short_build || x.still_short_use).length, gross_audio_chars_if_rendered: audioChars,
    warnings: check.warnings.length, dropped, floor };
  fs.writeFileSync(path.join(odir, 'summary.json'), JSON.stringify(summary, null, 1));
  for (const f of fs.readdirSync(path.join(cdir, 'batches')).filter((f) => f.startsWith('i785.'))) fs.unlinkSync(path.join(cdir, 'batches', f));
  fs.rmSync(sdir, { recursive: true, force: true });
  return summary;
}
for (const c of process.argv.slice(2).filter((a) => a !== '--dry')) {
  try { const s = run(c); if (s.dry) { console.log(`${c} DRY: ${s.errors} errors, ${s.warnings} warnings, ${JSON.stringify(s.counts)}`); continue; } console.log(`${c}: ${s.inserts} inserts (${s.build}B/${s.use}U), ${s.legos_filled_to_floor} LEGOs to floor, ${s.legos_still_thin} still thin, ${s.dropped.length} dropped, ~${s.gross_audio_chars_if_rendered} audio chars gross`); }
  catch (e) { console.log(`${c}: FAILED ${e.message}`); process.exitCode = 1; }
}

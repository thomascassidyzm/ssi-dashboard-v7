#!/usr/bin/env node
// cs #960 (Kai approved item 9, 18 Nov 15:41Z): turn the approved item-9 plans into ssi-changeset/1 files for the one
// governed night applier (tools/changeset/apply-changeset.cjs). Computed on the NIGHTLY COPY only:
//   1. copy-live.cjs rebuilds the course snapshot from the copy (the #931 reader, no SQL here);
//   2. merge-authored.cjs folds the mechanical delete plan with the #811/#812/#813 authored back-fill and re-cuts;
//   3. a LEGO that needs back-fill (backfill.json author_build+author_use > 0) but has NO authored rows is dropped
//      whole (its deletes would break the floor), reported as "unauthored";
//   4. build.cjs (ITEM9_PLANS=merged) checks every row on the copy. A row another job changed since #778's live
//      re-plan (not in the basket / text differs / edited by another event / changed since seen / collide list) drops
//      out as DRIFT; any other error sets its whole LEGO (or seed) aside. Rebuilt until 0 errors;
//   5. the ops are split into files that the night runner applies in order, each op's `expect` = the copy's value:
//        1-backfill   phrase inserts + in-place rewrites (seeds without a re-cut)
//        2-free       deletes on LEGOs that need no back-fill (no dependency)
//        3-filled     deletes on LEGOs whose floor depends on 1-backfill (the runner refuses it until 1-backfill's
//                     ledger is complete with every op applied/already)
//        4-recut-S#### one file per re-cut seed (lego.update + that seed's row inserts/rewrites/deletes, in that
//                     order), applied with --batch 8 (Tom's Watson 19 Nov: LEGO text edits ~5-10 s each; chunks of 8)
//   No phrase ids are invented here: insert ids are the builder's own makePhraseId (build.cjs), as the door expects.
// usage: node to-changesets.cjs <course> [<course> …]   (writes <course>/changesets/*.changeset.jsonl + <course>/changesets/summary.json)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const cs = require('../../../services/shared/changeset.cjs');
const ITEM = path.resolve(__dirname, '..');
const LIVE = process.env.ITEM9_LIVE_DIR || path.join(process.env.CS_SCRATCH || require('os').tmpdir(), 'item9-copylive');
const JOB = '#960·AI';
const KAI_GO = 'Kai approved paid-cleanup item 9 (untaught words) in full except the 19 make-new LEGOs, 18 Nov 15:41Z';
const DRIFT_RE = /row not in the live basket|text differs from the 17 Nov scan|edited today by event|row changed since it was seen|on the collide list/;
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const env = { ...process.env, ITEM9_LIVE_DIR: LIVE, ITEM9_PLANS: 'merged' };

function run(course) {
  const cdir = path.join(ITEM, course);
  execFileSync('node', [path.join(__dirname, 'copy-live.cjs'), course, LIVE], { stdio: ['ignore', 'ignore', 'inherit'] });
  const copy = rd(path.join(LIVE, `${course}.json`));
  execFileSync('node', [path.join(__dirname, 'merge-authored.cjs'), course], { env, stdio: ['ignore', 'ignore', 'inherit'] });
  const mdir = path.join(cdir, 'merged');
  const bf = fs.existsSync(path.join(cdir, 'backfill.json')) ? rd(path.join(cdir, 'backfill.json')) : { shortfall: {} };
  const needsFill = new Set(Object.entries(bf.shortfall || {}).filter(([, x]) => x.author_build + x.author_use > 0).map(([k]) => k));
  const adir = path.join(cdir, 'authored');
  const authored = new Set();
  if (fs.existsSync(adir)) for (const f of fs.readdirSync(adir).filter((f) => /^S\d{4}\.json$/.test(f))) {
    const a = rd(path.join(adir, f));
    for (const li of Object.keys(a.legos || {})) authored.add(`${f.slice(0, 5)}${li}`);
  }
  const plans = new Map(fs.readdirSync(mdir).filter((f) => /^S\d{4}\.json$/.test(f)).map((f) => [f, rd(path.join(mdir, f))]));
  const setAside = { unauthored: [], drift: [], error: [] };
  for (const [f, p] of plans) for (const li of Object.keys(p.legos || {})) {
    const lid = `${f.slice(0, 5)}${li}`;
    if (needsFill.has(lid) && !authored.has(lid)) { setAside.unauthored.push({ lego: lid, deletes: (p.legos[li].delete || []).length }); delete p.legos[li]; }
  }
  const save = () => { for (const f of fs.readdirSync(mdir)) fs.unlinkSync(path.join(mdir, f));
    for (const [f, p] of plans) if (Object.keys(p.legos || {}).length || p.lego_ops) fs.writeFileSync(path.join(mdir, f), JSON.stringify(p, null, 1)); };
  let check;
  for (let round = 0; round < 12; round++) {
    save();
    try { execFileSync('node', [path.join(__dirname, 'build.cjs'), course, 'cs960', '1', '9999'], { env, stdio: ['ignore', 'ignore', 'ignore'] }); } catch { /* errors read from check.json */ }
    check = rd(path.join(cdir, 'batches', 'cs960.check.json'));
    if (!check.errors.length) break;
    for (const e of check.errors) {
      const raw = e.split(':')[0], msg = e.slice(raw.length + 2);
      const m = raw.match(/^S0*(\d+)(L\d\d)?(\w*)$/);
      if (!m) throw new Error(`${course}: unparsed build error ${e}`);
      const tag = `S${m[1].padStart(4, '0')}`, li = m[2] || '', sfx = m[3] || '';
      const where = `${tag}${li}${sfx}`, f = `${tag}.json`, p = plans.get(f);
      if (!p) continue;
      if (where.length > 8 && DRIFT_RE.test(msg) && p.legos && p.legos[li]) {
        const e2 = p.legos[li];
        if (e2.delete) e2.delete = e2.delete.filter((s) => s !== sfx);
        if (e2.update) delete e2.update[sfx];
        if (!setAside.drift.some((d) => d.row === where)) setAside.drift.push({ row: where, why: msg.slice(0, 160) });
        if (!(e2.delete || []).length && !Object.keys(e2.update || {}).length && !(e2.insert || []).length) delete p.legos[li];
      } else if (where.length >= 8 && p.legos && p.legos[li] && !(p.lego_ops || {})[li]) {
        setAside.error.push({ lego: `${tag}${li}`, why: msg.slice(0, 200) }); delete p.legos[li];
      } else { // a seed-level or re-cut error: the whole seed's plan is set aside
        setAside.error.push({ seed: tag, why: `${where}: ${msg}`.slice(0, 200) }); plans.delete(f);
      }
    }
  }
  if (check.errors.length) throw new Error(`${course}: still ${check.errors.length} errors after 12 rounds: ${check.errors.slice(0, 3).join(' | ')}`);
  const ops = rd(path.join(cdir, 'batches', 'cs960.ops.json')).ops;
  const recutSeeds = new Set([...plans.values()].filter((p) => p.lego_ops && Object.keys(p.lego_ops).length).map((p) => p.seed));
  const seedOf = (o) => o.row ? o.row.seed_number : Number(String(o.phrase_id || o.lego_id).replace(/^.*:/, '').slice(1, 5));
  const lidOf = (o) => o.row ? `S${String(o.row.seed_number).padStart(4, '0')}L${String(o.row.lego_index).padStart(2, '0')}` : String(o.phrase_id || o.lego_id).replace(/^.*:/, '').slice(0, 8);
  const files = { '1-backfill': [], '2-free': [], '3-filled': [] };
  const recut = new Map();
  for (const o of ops) {
    const s = seedOf(o);
    if (recutSeeds.has(s)) { if (!recut.has(s)) recut.set(s, []); recut.get(s).push(o); continue; }
    if (o.op === 'phrase.insert' || o.op === 'phrase.update') files['1-backfill'].push(o);
    else if (o.op === 'phrase.delete') files[needsFill.has(lidOf(o)) ? '3-filled' : '2-free'].push(o);
    else throw new Error(`${course}: unexpected ${o.op} outside a re-cut seed`);
  }
  const order = { 'lego.update': 0, 'phrase.insert': 1, 'phrase.update': 2, 'phrase.delete': 3 };
  for (const [s, list] of recut) files[`4-recut-S${String(s).padStart(4, '0')}`] = list.sort((a, b) => order[a.op] - order[b.op]);
  const odir = path.join(cdir, 'changesets');
  fs.mkdirSync(odir, { recursive: true });
  for (const f of fs.readdirSync(odir)) if (/\.(changeset\.jsonl|guards\.json)$/.test(f)) fs.unlinkSync(path.join(odir, f));
  const why = { '1-backfill': 'back-fill rows authored from taught chunks (#811/#812/#813), applied BEFORE 3-filled',
    '2-free': 'deletes of rows using an untaught target word, LEGO keeps its floor without back-fill',
    '3-filled': 'deletes of rows using an untaught target word whose LEGO floor depends on 1-backfill (runner gates it)' };
  const written = {};
  for (const [name, list] of Object.entries(files)) {
    if (!list.length) continue;
    const file = path.join(odir, `${name}.changeset.jsonl`);
    cs.write(file, { id: `item9-${course}-${name}`, course, job: JOB, kai_go: KAI_GO,
      why: `paid cleanup item 9 (untaught words): ${why[name] || `seed re-cut ${name.slice(8)} (LEGO grown to carry the word, its basket re-said); apply with --batch 8`}`,
      source: `nightly copy ${copy.copy_db} built ${copy.copy_built}` }, list.map((o) => cs.op(o.op, Object.fromEntries(Object.entries(o).filter(([k]) => k !== 'op')))));
    written[name] = list.length;
    // Kai's rule (19 Nov): an apply is a live pre-check of row + LEGO + seed; a mismatch is held, never forced. The door's
    // `expect` only asserts the op's own row and it has no assert-only op (a no-op lego.update would still write the LEGO
    // and refresh tiles), so each op's seed and LEGO text go in a sidecar that precheck-guards.cjs compares with live
    // through Popty's read route before the applier runs. A re-cut's phrase ops also accept the LEGO text its own
    // lego.update sets, so a file stopped mid-way resumes.
    const legoAfter = new Map(list.filter((o) => o.op === 'lego.update').map((o) => [o.lego_id, { known_text: o.set.known_text ?? o.expect.known_text, target_text: o.set.target_text ?? o.expect.target_text }]));
    const guards = list.map((o) => {
      const sn = seedOf(o), lid = lidOf(o);
      const seed = copy.seeds.find((x) => x.seed_number === sn);
      const lego = seed && seed.legos.find((l) => l.lego_id === lid);
      if (!seed || !lego) throw new Error(`${course}: no copy seed/LEGO for ${lid}`);
      const now = { known_text: lego.known_text, target_text: lego.target_text };
      return { seed_number: sn, seed: { known_text: seed.known_text, target_text: seed.target_text }, lego_id: lid,
        lego: [now, ...(legoAfter.has(lid) ? [legoAfter.get(lid)] : [])] };
    });
    fs.writeFileSync(file.replace(/\.changeset\.jsonl$/, '.guards.json'), JSON.stringify({ changeset: `item9-${course}-${name}`, copy_db: copy.copy_db, guards }));
  }
  const count = (list, op) => list.filter((o) => o.op === op).length;
  const allRe = [...recut.values()].flat();
  const summary = { course, copy_db: copy.copy_db, copy_built: copy.copy_built, files: written,
    backfill: { insert: count(files['1-backfill'], 'phrase.insert'), rewrite: count(files['1-backfill'], 'phrase.update') },
    deletes: { free: files['2-free'].length, filled: files['3-filled'].length },
    recut: { seeds: recut.size, lego_update: count(allRe, 'lego.update'), insert: count(allRe, 'phrase.insert'), rewrite: count(allRe, 'phrase.update'), delete: count(allRe, 'phrase.delete') },
    set_aside: setAside, warnings: check.warnings.length };
  fs.writeFileSync(path.join(odir, 'summary.json'), JSON.stringify(summary, null, 1));
  // merged/ and batches/cs960.* are this tool's working files; the changesets are the product.
  for (const f of fs.readdirSync(path.join(cdir, 'batches')).filter((f) => f.startsWith('cs960.'))) fs.unlinkSync(path.join(cdir, 'batches', f));
  fs.rmSync(mdir, { recursive: true, force: true });
  return summary;
}

for (const course of process.argv.slice(2)) {
  try {
    const s = run(course);
    console.log(`${course}: files ${JSON.stringify(s.files)} backfill ${JSON.stringify(s.backfill)} deletes ${JSON.stringify(s.deletes)} recut ${JSON.stringify(s.recut)} set aside: unauthored ${s.set_aside.unauthored.length} LEGOs, drift ${s.set_aside.drift.length} rows, error ${s.set_aside.error.length}`);
  } catch (e) { console.log(`${course}: FAILED ${e.message}`); process.exitCode = 1; }
}

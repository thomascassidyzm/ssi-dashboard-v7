#!/usr/bin/env node
// cs #79·AJ: the course-builder's own /v2/validate sweep, run on the NIGHTLY COPY (ops/paid-cleanup-scan-447/copy-read.cjs
// validate: in process, refuses any URL that is not the local copy; nothing is written to any database), once as the course
// stands (= <course>/validate-before.json, the "before" that post.cjs after diffs live against) and once per touched seed
// WITH item 20's override for that seed. A validator issue on a touched LEGO that the course did not already have is
// BLOCKING (the changeset is not applied while any exists) — except a USE shortfall: the sweep reports one check per LEGO,
// so fixing BUILD unmasks the basket's USE count, which item 20 does not touch (build.cjs's same 'not this item' rule).  usage: node validate-copy.cjs <course> [...]
const fs = require('fs'); const path = require('path'); const { execFileSync } = require('child_process');
const ITEM = path.resolve(__dirname, '..');
const READER = path.resolve(ITEM, '../paid-cleanup-scan-447/copy-read.cjs');
let bad = 0;
for (const course of process.argv.slice(2).filter((a) => !a.startsWith('--'))) {
  const cdir = path.join(ITEM, course), odir = path.join(cdir, 'changesets');
  const ovs = JSON.parse(fs.readFileSync(path.join(odir, 'overrides.json'), 'utf8'));
  const tmp = process.env.CS_SCRATCH || require('os').tmpdir();
  const rq = path.join(tmp, `${course}.vreq.json`), out = path.join(tmp, `${course}.vout.json`);
  fs.writeFileSync(rq, JSON.stringify([{ fromSeed: 0 }, ...ovs.map((o) => ({ fromSeed: o.seed_number, override: o }))]));
  // --reuse: classify the copy sweep's saved answer again (no new sweep) when its request list is unchanged.
  if (!(process.argv.includes('--reuse') && fs.existsSync(out))) execFileSync('node', [READER, 'validate', course, rq, out], { stdio: ['ignore', 'ignore', 'inherit'] });
  const ans = JSON.parse(fs.readFileSync(out, 'utf8'));
  const before = new Map(ans[0].failures.map((f) => [f.seed, f.issues]));
  const touched = new Map(); // seed -> Set("L<idx>:")
  for (const o of ovs) touched.set(o.seed_number, new Set(Object.keys(o.phrases).map((k) => `L${Number(k.split(':')[1])}:`)));
  const rows = ovs.map((o, i) => {
    const after = (ans[i + 1].failures.find((f) => f.seed === o.seed_number) || {}).issues || [];
    const was = before.get(o.seed_number) || [];
    // An issue is the same issue whatever row the sweep quotes for it: a duplicate pair is quoted by whichever row comes first,
    // and that order moves with the override (e.g. mar S0312L03 U06 "She's going to be there tomorrow night." vs U08).
    const key = (x) => x.replace(/"[^"]*"/g, '"…"');
    const wasK = new Set(was.map(key));
    const fresh = after.filter((x) => !wasK.has(key(x)));
    const onTouched = fresh.filter((x) => [...touched.get(o.seed_number)].some((t) => x.startsWith(t)));
    const blocking = onTouched.filter((x) => !/^L\d+: USE:/.test(x));
    const useUnmasked = onTouched.filter((x) => /^L\d+: USE:/.test(x));
    return { seed: o.seed_number, before: was, after, new: fresh, blocking, use_unmasked: useUnmasked };
  });
  const block = rows.filter((r) => r.blocking.length);
  bad += block.length;
  fs.writeFileSync(path.join(cdir, 'validate-before.json'), JSON.stringify({ at: new Date().toISOString(), source: 'nightly copy (copy-read.cjs validate)', failures: ans[0].failures }));
  fs.writeFileSync(path.join(odir, 'validate-copy.json'), JSON.stringify({ at: new Date().toISOString(), seeds: rows.length, blocking: block, use_unmasked: rows.filter((r) => r.use_unmasked.length).length, new_not_blocking: rows.filter((r) => r.new.length && !r.blocking.length) }, null, 1));
  console.log(`${course}: ${rows.length} touched seeds validated on the copy; course failing seeds before ${ans[0].failures.length}; BLOCKING ${block.length}; USE shortfall unmasked (not this item) ${rows.filter((r) => r.use_unmasked.length).length}; new non-touched issues on ${rows.filter((r) => r.new.length && !r.blocking.length).length}`);
  for (const r of block.slice(0, 10)) console.log('BLOCK', r.seed, JSON.stringify(r.blocking));
}
process.exit(bad ? 1 : 0);

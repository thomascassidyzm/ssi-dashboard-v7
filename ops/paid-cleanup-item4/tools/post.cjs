#!/usr/bin/env node
// Talk to Popty for one built batch. Every call is a Popty route; nothing touches the DB directly.
//   node post.cjs baseline <course>          POST :3471/api/v2/validate (no override) -> <course>/validate-before.json
//   node post.cjs validate <course> <batch>  one /v2/validate per seed WITH the batch's override (nothing written)
//                                            -> batches/<batch>.validate.json; exit 1 if a touched LEGO fails
//   node post.cjs dry      <course> <batch>  edit-batch dry run (real transaction, rolled back) -> batches/<batch>.dry.json
//   node post.cjs apply    <course> <batch>  needs validate + dry to have passed; applies; saves event id,
//                                            undo file name and undo ops -> batches/<batch>.apply.json, events.json
//   (set ITEM4_OWNER=<your job label digits> so each worker keeps its own events-<owner>.json)
//   node post.cjs after    <course>          full /v2/validate after the edits -> validate-after.json + diff vs before
// cs #968·AI: every Popty call here needs --live-ok '<why>' AND 22:00-07:00 UK (ops/paid-cleanup-livegate.cjs, exit 77).
const LIVEGATE = require('../../paid-cleanup-livegate.cjs'); LIVEGATE.install();
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
// The shared DB is contended: an edit-batch can take minutes to answer. Node's fetch gives up after 300 s while the
// server goes on and COMMITS (cs #700·AI, eng_for_tam 18 Nov); wait as long as the server works, never guess.
{ const { Agent, setGlobalDispatcher } = require(require('path').join(L.ROOT, 'node_modules/undici'));
  setGlobalDispatcher(new Agent({ headersTimeout: 0, bodyTimeout: 0 })); }
const [mode, course, batch] = process.argv.slice(2);
if (['baseline', 'after', 'validate', 'dry', 'apply'].includes(mode)) LIVEGATE.requireLive(`item4 post.cjs ${mode} ${course}`);
const cdir = path.join(L.ITEM_DIR, course);
const bdir = path.join(cdir, 'batches');
const H = { 'Content-Type': 'application/json', 'x-agent-id': 'cs-item4-filler', 'x-agent-role': 'paid-cleanup-item4' };
const post = async (url, body) => {
  const r = await fetch(url, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 2000) }; }
  return { status: r.status, body: j };
};
const rd = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const wr = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1));
const issuesBySeed = (v) => new Map((v.failures || []).map(f => [f.seed, f.issues]));

(async () => {
  if (mode === 'baseline' || mode === 'after') {
    const r = await post(`http://localhost:3471/api/v2/validate/${course}`, {});
    if (r.status !== 200) { console.error(r.status, JSON.stringify(r.body).slice(0, 500)); process.exit(2); }
    const f = path.join(cdir, mode === 'baseline' ? 'validate-before.json' : 'validate-after.json');
    wr(f, { at: new Date().toISOString(), ...r.body });
    console.log(`${course} ${mode}: ${r.body.seeds_passed}/${r.body.seeds_checked} seeds pass`);
    if (mode === 'after' && fs.existsSync(path.join(cdir, 'validate-before.json'))) {
      const b = issuesBySeed(rd(path.join(cdir, 'validate-before.json'))), a = issuesBySeed(r.body);
      const touched = new Set();
      for (const f of fs.existsSync(bdir) ? fs.readdirSync(bdir).filter(f => f.endsWith('.apply.json')) : []) for (const s of rd(path.join(bdir, f)).seeds || []) touched.add(s);
      const rows = [...touched].sort((x, y) => x - y).map(s => ({ seed: s, before: b.get(s) || [], after: a.get(s) || [] }));
      const worse = rows.filter(x => x.after.some(i => !x.before.includes(i)));
      wr(path.join(cdir, 'validate-diff.json'), { touched: rows.length, pass_after: rows.filter(x => !x.after.length).length,
        fixed: rows.filter(x => x.before.length && !x.after.length).length, new_issues: worse, still_failing: rows.filter(x => x.after.length) });
      console.log(`touched seeds ${rows.length}: pass after ${rows.filter(x => !x.after.length).length}, new issues on ${worse.length}`);
    }
    return;
  }
  const ops = rd(path.join(bdir, `${batch}.ops.json`));
  const chk = rd(path.join(bdir, `${batch}.check.json`));
  if (chk.errors.length) { console.error('build check has errors; refusing'); process.exit(1); }
  if (mode === 'validate') {
    const ovs = rd(path.join(bdir, `${batch}.overrides.json`));
    const touchedLegos = new Set(chk.checks.map(c => `L${Number(c.lego.slice(6))}:`));
    const res = []; let bad = 0;
    for (const ov of ovs) {
      const r = await post(`http://localhost:3471/api/v2/validate/${course}`, { override: ov, fromSeed: ov.seed_number });
      if (r.status !== 200) { res.push({ seed: ov.seed_number, error: r.status }); bad++; continue; }
      const issues = issuesBySeed(r.body).get(ov.seed_number) || [];
      const mine = chk.checks.filter(c => Number(c.lego.slice(1, 5)) === ov.seed_number).map(c => `L${Number(c.lego.slice(6))}:`);
      const blocking = issues.filter(i => mine.some(m => i.startsWith(m)) && !chk.checks.find(c => i.startsWith(`L${Number(c.lego.slice(6))}:`) && Number(c.lego.slice(1, 5)) === ov.seed_number && c.accept_gap));
      if (blocking.length) bad++;
      res.push({ seed: ov.seed_number, issues, blocking });
    }
    wr(path.join(bdir, `${batch}.validate.json`), { at: new Date().toISOString(), pass: bad === 0, seeds: res });
    console.log(`${course} ${batch} validate: ${res.length} seeds, ${bad} blocking`);
    for (const r of res) if ((r.blocking && r.blocking.length) || r.error) console.log('FAIL', r.seed, JSON.stringify(r.blocking || r.error));
    for (const r of res) if (r.issues && r.issues.length && !(r.blocking || []).length) console.log('pre-existing/other', r.seed, JSON.stringify(r.issues));
    process.exit(bad ? 1 : 0);
  }
  if (mode === 'dry' || mode === 'apply') {
    if (mode === 'apply') {
      const v = rd(path.join(bdir, `${batch}.validate.json`));
      const d = rd(path.join(bdir, `${batch}.dry.json`));
      if (!v.pass || !d.ok) { console.error('validate or dry run did not pass; refusing to apply'); process.exit(1); }
    }
    const t0 = Date.now();
    let r, b;
    if (mode === 'dry' && (ops.ops || []).length > LIVEGATE.MAX_CHUNK) {
      // cs #968·AI: a dry run goes in chunks of <= 10 ops; the first failing chunk stops it (its op index is re-based).
      const results = [];
      for (let i = 0; i < ops.ops.length; i += LIVEGATE.MAX_CHUNK) {
        r = await post(`http://localhost:3470/api/production/${course}/edit-batch`, { ...ops, ops: ops.ops.slice(i, i + LIVEGATE.MAX_CHUNK), apply: false });
        b = r.body;
        if (b.index != null) b.index += i;
        results.push(...(b.results || []));
        if (r.status !== 200 || b.ok !== true) break;
      }
      b = { ...b, results };
    } else {
      r = await post(`http://localhost:3470/api/production/${course}/edit-batch`, { ...ops, apply: mode === 'apply' });
      b = r.body;
    }
    const ms = Date.now() - t0;
    const slim = { at: new Date().toISOString(), status: r.status, ms, ok: r.status === 200 && b.ok === true, applied: !!b.applied,
      event_id: b.event_id || null, undo_file: b.undo_file || null, error: b.error || null, code: b.code || null, index: b.index,
      seeds: chk.seeds, counts: chk.counts,
      audio_after: (b.results || []).filter(x => x.after && typeof x.after === 'object').map(x => ({ key: x.key, k: x.after.known_audio_id || null, t1: x.after.target1_audio_id || null, t2: x.after.target2_audio_id || null })) };
    wr(path.join(bdir, `${batch}.${mode}.json`), slim);
    if (mode === 'apply' && b.applied) {
      wr(path.join(bdir, `${batch}.undo.json`), { event_id: b.event_id, undo_file: b.undo_file, undo_ops: b.undo_ops });
      const ef = path.join(cdir, `events-${process.env.ITEM4_OWNER || 'main'}.json`);
      const ev = fs.existsSync(ef) ? rd(ef) : [];
      ev.push({ batch, event_id: b.event_id, undo_file: b.undo_file, at: slim.at, seeds: chk.seeds, counts: chk.counts });
      wr(ef, ev);
    }
    console.log(`${course} ${batch} ${mode}: HTTP ${r.status} ${slim.ok ? 'ok' : 'FAILED'} ${ms}ms ${b.event_id || ''} ${b.error || ''} ${b.index != null ? 'op#' + b.index : ''}`);
    process.exit(slim.ok ? 0 : 1);
  }
  console.error('mode?'); process.exit(2);
})();

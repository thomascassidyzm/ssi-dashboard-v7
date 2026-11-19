#!/usr/bin/env node
// Item 20 resume (cs #740·AI): EXACT price of the plan through the ONE audio route, dryRun only (nothing is rendered,
// nothing is linked). For every course's batches/plan.ops.json: one dry run per unique known line (course voice), and one
// per unique English line per slot (target1, target2) across all five courses (the English cast is the same in all five
// and the library is shared, so a line paid for once is a library hit for the other four; it is charged to the first
// course in COURSES order). Batches of 50 calls with a 1.5 s pause; before each batch the db-watchdog sample is read and
// the run waits while more than 6 backends are active. Resumable: answers are cached in ../audio/price-cache.json.
// usage: node price.cjs   -> ../audio/price.json (+ summary on stdout)
const fs = require('fs'); const path = require('path'); const os = require('os');
const L = require('./lib.cjs');
const COURSES = ['eng_for_urd', 'eng_for_pan', 'eng_for_ben', 'eng_for_mar', 'eng_for_guj'];
const ADIR = path.join(L.ITEM_DIR, 'audio'); fs.mkdirSync(ADIR, { recursive: true });
const CACHE = path.join(ADIR, 'price-cache.json');
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
function activeBackends() {
  const dir = path.join(os.homedir(), '.local/state/db-watchdog/freezes');
  const f = fs.readdirSync(dir).filter(f => /^samples-.*\.jsonl$/.test(f)).sort().pop();
  const last = fs.readFileSync(path.join(dir, f), 'utf8').trim().split('\n').pop();
  const d = JSON.parse(last); return (d.activity || []).filter(a => a.state === 'active').reduce((s, a) => s + (a.count || 0), 0);
}
async function dry(courseCode, role, text, gender) {
  const key = `${courseCode}|${role}|${gender || ''}|${text}`;
  if (cache[key]) return cache[key];
  const body = { courseCode, role, text, purpose: 'paid cleanup item 20 plan price (dry run, cs #740·AI)', dryRun: true };
  const r = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'cs-740-item20-plan' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  const out = { status: r.status, source: j.source || null, code: j.code || null, would: j.wouldSpendChars || 0, len: [...text].length };
  cache[key] = out; return out;
}
(async () => {
  const jobs = []; const seenEn = new Set();
  for (const c of COURSES) {
    const files = ['plan', 'probe'].map(b => path.join(L.ITEM_DIR, c, 'batches', `${b}.ops.json`)).filter(f => fs.existsSync(f));
    if (!files.length) { console.log(c, 'no plan.ops.json'); continue; }
    const ops = files.flatMap(f => JSON.parse(fs.readFileSync(f, 'utf8')).ops);
    const seenK = new Set();
    for (const o of ops) {
      const row = o.op === 'phrase.insert' ? o.row : o.op === 'phrase.update' ? o.set : null; if (!row) continue;
      const g = (o.row && o.row.metadata && o.row.metadata.known_gender) || null;
      if (!seenK.has(row.known_text + g)) { seenK.add(row.known_text + g); jobs.push([c, 'known', row.known_text, g]); }
      for (const role of ['target1', 'target2']) { const k = role + '|' + row.target_text; if (!seenEn.has(k)) { seenEn.add(k); jobs.push([c, role, row.target_text, null]); } }
    }
  }
  console.log('dry runs to make', jobs.length, 'cached', jobs.filter(([c, r, t, g]) => cache[`${c}|${r}|${g || ''}|${t}`]).length);
  for (let i = 0; i < jobs.length; i += 50) {
    let n; while ((n = activeBackends()) > 6) { console.log(new Date().toISOString(), 'DB busy:', n, 'active, waiting 60 s'); await sleep(60000); }
    for (const [c, r, t, g] of jobs.slice(i, i + 50)) {
      try { await dry(c, r, t, g); } catch (e) { console.log('error', c, r, e.message); await sleep(5000); }
    }
    fs.writeFileSync(CACHE, JSON.stringify(cache));
    console.log(new Date().toISOString(), Math.min(i + 50, jobs.length), '/', jobs.length);
    await sleep(1500);
  }
  // Summary.
  const PROV = { known: { eng_for_ben: 'cartesia' } };
  const sum = {};
  for (const [c, r, t, g] of jobs) {
    const a = cache[`${c}|${r}|${g || ''}|${t}`]; if (!a) continue;
    const prov = r === 'known' ? (PROV.known[c] || 'azure') : 'cartesia';
    const s = sum[c] ||= { lines: 0, library: 0, would_render: 0, refused: {}, chars: { cartesia: 0, azure: 0 }, refused_chars: { cartesia: 0, azure: 0 } };
    s.lines++;
    if (a.source === 'library') s.library++;
    else if (a.source === 'would-render') { s.would_render++; s.chars[prov] += a.would || a.len; }
    else { s.refused[a.code || a.status] = (s.refused[a.code || a.status] || 0) + 1; s.refused_chars[prov] += a.len; }
  }
  const tot = { cartesia: 0, azure: 0, refused_cartesia: 0, refused_azure: 0 };
  for (const s of Object.values(sum)) { tot.cartesia += s.chars.cartesia; tot.azure += s.chars.azure; tot.refused_cartesia += s.refused_chars.cartesia; tot.refused_azure += s.refused_chars.azure; }
  fs.writeFileSync(path.join(ADIR, 'price.json'), JSON.stringify({ at: new Date().toISOString(), per_course: sum, total: tot }, null, 1));
  console.log(JSON.stringify({ per_course: sum, total: tot }, null, 1));
})();

#!/usr/bin/env node
/**
 * Job #704 analysis: gates, judge flags (LEGO-clustered bootstrap CIs), stem reuse by band, real tokens.
 *   node analyse.cjs --run <dir> --judge <dir> --out <dir>
 * Stem reuse re-tiles BOTH arms with tools/phrase-lab/stem-reuse.cjs's own tiler over the live course_legos inventory.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs'), path = require('path'), os = require('os');
const { createClient } = require('@supabase/supabase-js');
const { basketStem, toks, EARLY_MAX_SEED } = require('../stem-reuse.cjs');
const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };
const run = arg('--run'), jdir = arg('--judge'), out = arg('--out'); fs.mkdirSync(out, { recursive: true });
const sample = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample.json'), 'utf8')).sample;
const bandOf = (s) => (s <= 100 ? '11-100' : s <= 250 ? '101-250' : '251+');
const phr = (r) => [...(r.build || []), ...(r.use || [])];
const load = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
// seeded rng for bootstrap
let st = 704; const rnd = () => { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
function wilson(k, n) { if (!n) return [null, null]; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - h) / d, (c + h) / d]; }
const pct = (x) => (x == null ? 'n/a' : (100 * x).toFixed(1) + '%');
/** LEGO-clustered bootstrap of ratio sum(a)/sum(b) (and paired diff). rows: [{a0,b0,a1,b1}] one per LEGO, arm0=Opus arm1=Sonnet. */
function boot(rows, B = 5000) {
  const est = (rs, i) => { const a = rs.reduce((s, r) => s + r['a' + i], 0), b = rs.reduce((s, r) => s + r['b' + i], 0); return b ? a / b : null; };
  const r0 = [], r1 = [], d = [];
  for (let k = 0; k < B; k++) { const rs = Array.from({ length: rows.length }, () => rows[Math.floor(rnd() * rows.length)]); const x = est(rs, 0), y = est(rs, 1); if (x != null && y != null) { r0.push(x); r1.push(y); d.push(y - x); } }
  const q = (v, p) => { v = v.slice().sort((a, b) => a - b); return v[Math.floor(p * (v.length - 1))]; };
  const ci = (v) => [q(v, 0.025), q(v, 0.975)];
  return { n: rows.length, opus: est(rows, 0), sonnet: est(rows, 1), opusCI: ci(r0), sonnetCI: ci(r1), diff: est(rows, 1) - est(rows, 0), diffCI: ci(d) };
}
const fmt = (b) => `${pct(b.opus)} [${pct(b.opusCI[0])}–${pct(b.opusCI[1])}] | ${pct(b.sonnet)} [${pct(b.sonnetCI[0])}–${pct(b.sonnetCI[1])}] | ${b.diff >= 0 ? '+' : ''}${(100 * b.diff).toFixed(1)}pp [${(100 * b.diffCI[0]).toFixed(1)}, ${(100 * b.diffCI[1]).toFixed(1)}]`;

(async () => {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const map = load(path.join(jdir, 'keymap.json')) || {};
  const byLego = {}; for (const [id, m] of Object.entries(map)) (byLego[`${m.course}/${m.lego}`] ||= {})[m.arm] = id;
  const verdicts = {}; if (fs.existsSync(path.join(jdir, 'verdicts.jsonl'))) for (const l of fs.readFileSync(path.join(jdir, 'verdicts.jsonl'), 'utf8').trim().split('\n').filter(Boolean)) { const v = JSON.parse(l); verdicts[v.key] = v; }
  // inventories for stem reuse
  const inv = {};
  for (const c of [...new Set(sample.map((x) => x.course))]) {
    const all = [];
    for (let from = 0; ; from += 1000) { const { data } = await sb.from('course_legos').select('lego_id,seed_number,target_text').eq('course_code', c).order('seed_number').order('lego_index').range(from, from + 999); all.push(...data); if (data.length < 1000) break; }
    inv[c] = all.map((l) => ({ legoId: l.lego_id, seed: l.seed_number, toks: toks(l.target_text) })).filter((l) => l.toks.length);
  }
  const rows = [];
  for (const x of sample) {
    const o = load(x.opusFile), s = load(path.join(run, 'sonnet', x.course, `${x.key}.json`));
    if (!o || !s) { rows.push({ ...x, missing: !s ? 'sonnet' : 'opus' }); continue; }
    const row = { ...x, band: bandOf(x.seed), lang: x.course.slice(0, 3), arms: {} };
    for (const [arm, r] of [['opus', o], ['sonnet', s]]) {
      const id = byLego[`${x.course}/${x.key}`]?.[arm]; const v = id ? verdicts[id] : null;
      const avail = inv[x.course].filter((l) => l.seed <= x.seed);
      const ph = phr(r).map((p) => ({ known: p.known, target: p.target }));
      const stem = ph.length ? basketStem(ph, avail, x.key) : null;
      row.arms[arm] = {
        blocked: !!r.blocked, attempts: (r.attempts || []).length, failing: r.gate?.failingGates || [], firstPass: !!r.attempts?.[0]?.overallPass,
        phrases: ph.length, judged: !!v, flagged: v ? v.flagged : null, overused: v ? (v.overused || []).length : null,
        early: stem ? stem.earlyMass : 0, stemMass: stem ? stem.stemMass : 0, unmatched: stem ? stem.unmatchedShare : null, elapsedMs: r.elapsedMs, id,
      };
    }
    rows.push(row);
  }
  fs.writeFileSync(path.join(out, 'rows.json'), JSON.stringify(rows, null, 1));
  const both = rows.filter((r) => r.arms);
  const md = [];
  const groups = (key) => [...new Set(both.map(key))].sort();
  const sections = [['All', () => 'all'], ['By language', (r) => r.lang], ['By seed band', (r) => r.band]];
  // gates
  md.push('## Gates (LEGOs; blocked = failed after 2 gate retries)', '| group | n | Opus pass | Sonnet pass | Opus first-try | Sonnet first-try | Opus calls/LEGO | Sonnet calls/LEGO |', '|---|---|---|---|---|---|---|---|');
  for (const [, kf] of sections) for (const g of groups(kf)) {
    const rs = both.filter((r) => kf(r) === g); const n = rs.length;
    const c = (arm, f) => rs.filter((r) => f(r.arms[arm])).length;
    const mean = (arm) => (rs.reduce((s, r) => s + r.arms[arm].attempts, 0) / n).toFixed(2);
    const w = (k) => { const [a, b] = wilson(k, n); return `${pct(k / n)} (${k}/${n}) [${pct(a)}–${pct(b)}]`; };
    md.push(`| ${g} | ${n} | ${w(c('opus', (a) => !a.blocked))} | ${w(c('sonnet', (a) => !a.blocked))} | ${pct(c('opus', (a) => a.firstPass) / n)} | ${pct(c('sonnet', (a) => a.firstPass) / n)} | ${mean('opus')} | ${mean('sonnet')} |`);
  }
  // judge
  md.push('', '## Judge-flagged phrases (Codex gpt-5.6-terra, blind). Opus [95% CI] | Sonnet [95% CI] | Sonnet − Opus (paired, LEGO-clustered bootstrap)', '| group | LEGOs judged in both arms | phrases O/S | Opus flagged | Sonnet flagged | diff |', '|---|---|---|---|---|---|');
  const jrows = both.filter((r) => r.arms.opus.judged && r.arms.sonnet.judged);
  const jsec = {};
  for (const [, kf] of sections) for (const g of [...new Set(jrows.map(kf))].sort()) {
    const rs = jrows.filter((r) => kf(r) === g);
    const b = boot(rs.map((r) => ({ a0: r.arms.opus.flagged, b0: r.arms.opus.phrases, a1: r.arms.sonnet.flagged, b1: r.arms.sonnet.phrases })));
    jsec[g] = b;
    md.push(`| ${g} | ${rs.length} | ${rs.reduce((s, r) => s + r.arms.opus.phrases, 0)}/${rs.reduce((s, r) => s + r.arms.sonnet.phrases, 0)} | ${pct(b.opus)} [${pct(b.opusCI[0])}–${pct(b.opusCI[1])}] | ${pct(b.sonnet)} [${pct(b.sonnetCI[0])}–${pct(b.sonnetCI[1])}] | ${b.diff >= 0 ? '+' : ''}${(100 * b.diff).toFixed(1)}pp [${(100 * b.diffCI[0]).toFixed(1)}, ${(100 * b.diffCI[1]).toFixed(1)}] |`);
  }
  // language x band
  md.push('', '### Language × band', '| language | band | LEGOs | Opus flagged | Sonnet flagged | diff |', '|---|---|---|---|---|---|');
  for (const l of groups((r) => r.lang)) for (const bd of ['11-100', '101-250', '251+']) {
    const rs = jrows.filter((r) => r.lang === l && r.band === bd); if (!rs.length) continue;
    const b = boot(rs.map((r) => ({ a0: r.arms.opus.flagged, b0: r.arms.opus.phrases, a1: r.arms.sonnet.flagged, b1: r.arms.sonnet.phrases })), 2000);
    md.push(`| ${l} | ${bd} | ${rs.length} | ${pct(b.opus)} | ${pct(b.sonnet)} | ${b.diff >= 0 ? '+' : ''}${(100 * b.diff).toFixed(1)}pp [${(100 * b.diffCI[0]).toFixed(1)}, ${(100 * b.diffCI[1]).toFixed(1)}] |`);
  }
  // overuse + LEGO-level
  const bad = (arm) => jrows.filter((r) => r.arms[arm].flagged > 0).length;
  md.push('', `LEGOs with at least one flagged phrase: Opus ${bad('opus')}/${jrows.length}, Sonnet ${bad('sonnet')}/${jrows.length}. Baskets the judge marked with an over-used collocation: Opus ${jrows.filter((r) => r.arms.opus.overused > 0).length}, Sonnet ${jrows.filter((r) => r.arms.sonnet.overused > 0).length}.`);
  // stem
  md.push('', '## Early-stem share (stem material from seeds 1-10 ÷ all stem material; #398 tiler, same for both arms). Opus | Sonnet | diff', '| group | LEGOs | Opus | Sonnet | diff |', '|---|---|---|---|---|');
  for (const [, kf] of sections) for (const g of groups(kf)) {
    const rs = both.filter((r) => kf(r) === g && r.arms.opus.stemMass && r.arms.sonnet.stemMass);
    const b = boot(rs.map((r) => ({ a0: r.arms.opus.early, b0: r.arms.opus.stemMass, a1: r.arms.sonnet.early, b1: r.arms.sonnet.stemMass })), 3000);
    md.push(`| ${g} | ${rs.length} | ${pct(b.opus)} [${pct(b.opusCI[0])}–${pct(b.opusCI[1])}] | ${pct(b.sonnet)} [${pct(b.sonnetCI[0])}–${pct(b.sonnetCI[1])}] | ${b.diff >= 0 ? '+' : ''}${(100 * b.diff).toFixed(1)}pp [${(100 * b.diffCI[0]).toFixed(1)}, ${(100 * b.diffCI[1]).toFixed(1)}] |`);
  }
  const um = (arm) => { const v = both.map((r) => r.arms[arm].unmatched).filter((x) => x != null); return pct(v.reduce((a, b) => a + b, 0) / v.length); };
  md.push('', `Tiler unmatched share (symmetry check): Opus ${um('opus')}, Sonnet ${um('sonnet')}.`);
  fs.writeFileSync(path.join(out, 'tables.md'), md.join('\n'));
  console.log(md.join('\n'));
  console.log('\nmissing:', rows.filter((r) => r.missing).map((r) => `${r.key}:${r.missing}`).join(' ') || 'none');
})().catch((e) => { console.error(e); process.exit(1); });

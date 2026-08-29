#!/usr/bin/env node
/**
 * THE SEED LAB — one seed at a time, the live phrases beside newly generated
 * candidates, with the machine-checkable criteria computed for both, and a box
 * for a verbatim verdict.
 *
 * READ-ONLY against all production content. It never writes to course_seeds,
 * course_legos, course_practice_phrases or anything else in Supabase. The only
 * thing it persists is verdicts, in labs/seed-lab/verdicts.ndjson.
 *
 * SEEDS ARE IMMUTABLE. "Seed replacement" means replacing the LEGOs and phrases
 * UNDER a seed; the seed's own text is rendered read-only and labelled as such.
 *
 * Run: node labs/seed-lab/server.cjs   (PORT=8461 HOST=127.0.0.1)
 */
require('dotenv').config({ quiet: true });
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { scoreBaskets } = require('../../tools/frame-layer/pattern-diversity.cjs');
const { deriveJob } = require('../../tools/frame-layer/derive-seed-job.cjs');
const { loadCorpus } = require('../../tools/frame-layer/corpus.cjs');

const PORT = +(process.env.PORT || 8461);
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = path.join(__dirname, '..', '..');
const VERDICTS = path.join(__dirname, 'verdicts.ndjson');
const CANDIDATES = path.join(__dirname, 'candidates');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

const BUILD_SHA = (() => {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
})();

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function loadSeed(course, seed) {
  return loadCorpus(sb, course, seed);
}

function candidatesFor(course, seed) {
  const at = path.join(CANDIDATES, `${course}-${seed}.json`);
  return fs.existsSync(at) ? JSON.parse(fs.readFileSync(at, 'utf8')) : null;
}

const ROLE_ORDER = { build: 0, use: 1, component: 2 };
const sortPhrases = (a, b) => (ROLE_ORDER[a.phrase_role] ?? 9) - (ROLE_ORDER[b.phrase_role] ?? 9);

function criteriaTable(s, splits) {
  if (!s) return '<p class="none">no practice phrases in this basket</p>';
  const row = (k, label) => {
    const v = s.axes[k], f = s.floors[k], ok = !s.floor_failures.includes(k);
    return `<tr class="${ok ? 'ok' : 'bad'}"><td>${label}</td><td class="n">${v.toFixed(3)}</td><td class="n">${f}</td><td>${ok ? 'pass' : 'FAIL'}</td></tr>`;
  };
  const extra = (s.components_excluded || s.lego_absent)
    ? `<p class="meta">${s.phrase_count} practice phrase(s) scored${s.components_excluded ? `; ${s.components_excluded} component row(s) excluded — tiling glosses, never practised` : ''}${s.lego_absent ? `; ${s.lego_absent} phrase(s) do not contain this LEGO` : ''}</p>` : '';
  const sp = (s.splits || []).map(x => `<div class="split ${x.crossed ? 'ok' : 'bad'}">
      <b>${esc(x.id)} ${esc(x.name)}</b> — crosses the split: <b>${x.crossed ? 'YES' : 'NO'}</b>${x.crossed_weak && !x.crossed ? ' <span class="none">(both forms occur, but one of them in a single shape only)</span>' : ''}
      <ul>${x.outcomes.map(o => `<li>${esc(o.form)} — ${o.phrases} phrase(s), ${o.distinct_skeletons} distinct shape(s)</li>`).join('')}</ul></div>`).join('');
  return `${extra}${sp}
    <table class="crit"><tr><th>axis</th><th class="n">value</th><th class="n">floor</th><th></th></tr>
    ${row('frame', 'FRAME — distinct matrix frames')}
    ${row('pos', 'POS — LEGO positions')}
    ${row('neigh', 'NEIGH — distinct neighbours')}
    ${row('junct', 'JUNCT — distinct junctions')}
    ${splits.length ? row('split', 'SPLIT — crosses the side this LEGO admits')
      : '<tr><td class="none">SPLIT — this LEGO admits no side of any split</td><td class="n none">n/a</td><td class="n"></td><td class="none">—</td></tr>'}
    <tr class="${s.pass ? 'ok' : 'bad'}"><td><b>pattern diversity (composite)</b></td><td class="n"><b>${s.composite}</b></td><td class="n"></td><td><b>${s.pass ? 'PASS' : 'FAIL'}</b></td></tr>
    </table>`;
}

function phraseList(phrases) {
  if (!phrases.length) return '<p class="none">none</p>';
  return '<ul class="phrases">' + phrases.map(p =>
    `<li><code class="pid">${esc(p.lab_id)}</code>
       <span class="role ${esc(p.phrase_role)}">${esc(p.phrase_role)}</span>
       <span class="k">${esc(p.known_text)}</span>
       <span class="t">${esc(p.target_text)}</span>
       ${p.why ? `<span class="why">${esc(p.why)}</span>` : ''}</li>`).join('') + '</ul>';
}

const CSS = `
:root{--fg:#111;--dim:#666;--line:#ddd;--bad:#b00020;--ok:#0a6a2f;--bg:#fff}
@media (prefers-color-scheme:dark){:root{--fg:#eee;--dim:#999;--line:#333;--bad:#ff6b6b;--ok:#4ade80;--bg:#111}}
*{box-sizing:border-box}
body{font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;margin:0;color:var(--fg);background:var(--bg)}
main{max-width:1200px;margin:0 auto;padding:12px}
h1{font-size:18px;margin:0 0 4px}
h2{font-size:15px;margin:16px 0 6px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim)}
form.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:8px 0;border-bottom:1px solid var(--line)}
input,button,textarea,select{font:inherit;color:var(--fg);background:transparent;border:1px solid var(--line);border-radius:4px;padding:6px 8px}
button{cursor:pointer}
.seed{border:1px solid var(--line);border-left:4px solid var(--dim);padding:10px;margin:12px 0;border-radius:4px}
.seed .k{font-weight:600}
.seed .t{color:var(--dim)}
.immutable{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--bad)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:820px){.cols{grid-template-columns:1fr}}
.col{border:1px solid var(--line);border-radius:4px;padding:10px;min-width:0}
ol.phrases{margin:0;padding-left:20px}
ol.phrases li{margin:0 0 8px}
.role{font-size:11px;text-transform:uppercase;letter-spacing:.06em;border:1px solid var(--line);border-radius:3px;padding:0 4px;margin-right:6px;color:var(--dim)}
.k{display:inline}
.t{display:block;color:var(--dim)}
.why{display:block;font-size:12px;color:var(--dim);font-style:italic}
table.crit{border-collapse:collapse;width:100%;margin:8px 0;font-size:14px}
table.crit td,table.crit th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
tr.bad td{color:var(--bad)}
tr.ok td{color:inherit}
.split{border:1px solid var(--line);border-radius:4px;padding:6px 8px;margin:6px 0;font-size:14px}
.split.bad{border-color:var(--bad)}
.split ul{margin:4px 0 0;padding-left:18px;color:var(--dim)}
.none{color:var(--dim)}
.verdict{margin-top:16px;border-top:1px solid var(--line);padding-top:12px}
textarea{width:100%;min-height:90px}
.meta{font-size:12px;color:var(--dim);margin-top:6px}
a{color:inherit}
.v{border-bottom:1px solid var(--line);padding:10px 0;white-space:pre-wrap}
.v .meta{white-space:normal}
h3{font-size:14px;margin:0 0 6px;color:var(--dim);font-weight:600}
ul.phrases{margin:0;padding:0;list-style:none}
ul.phrases li{margin:0 0 8px;padding-left:62px;text-indent:-62px}
code.pid{font-size:11px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dim);border:1px solid var(--line);border-radius:3px;padding:0 3px;margin-right:6px;display:inline-block;width:52px;text-align:center;text-indent:0}
ul.phrases li .t,ul.phrases li .why{padding-left:0;text-indent:0}
.job{border:1px solid var(--line);border-left:4px solid var(--ok);border-radius:4px;padding:10px;margin:12px 0}
.joblabel{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim)}
.jobverdict{font-size:20px;font-weight:700;margin:2px 0 4px}
.job p{margin:4px 0}
.rule{border:1px solid var(--line);border-radius:4px;padding:10px;margin:12px 0;font-size:14px}
.seedverdict{margin-top:6px;font-weight:700}
.seedverdict.ok{color:var(--ok)}
.seedverdict.bad{color:var(--bad)}
.basket{margin:22px 0 0;border-top:2px solid var(--line);padding-top:10px}
.basket h2{font-size:16px;text-transform:none;letter-spacing:0;color:var(--fg);font-weight:700;margin:6px 0 8px}
.verdictpill{font-size:11px;letter-spacing:.06em;border-radius:3px;padding:1px 5px;border:1px solid currentColor}
.verdictpill.ok{color:var(--ok)}
.verdictpill.bad{color:var(--bad)}
`;

function page(title, body) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style><main>${body}</main>`;
}

async function labPage(course, seed) {
  const { seedRow, ownLegos, priorSeeds, phrases } = await loadSeed(course, seed);
  if (!seedRow) return page('seed lab', `<h1>seed lab</h1><p class="none">no seed ${esc(seed)} in ${esc(course)}.</p>${controls(course, seed)}`);

  // What is this seed FOR? Derived from its own admission diff, never looked up.
  const job = deriveJob({ seedRow, ownLegos, priorSeeds });
  const live = scoreBaskets(phrases, { legos: ownLegos, job });
  const cand = candidatesFor(course, seed);
  const gen = cand ? scoreBaskets(cand.phrases, { legos: ownLegos, job }) : null;

  const genBy = new Map((gen ? gen.baskets : []).map(b => [b.lego_index, b]));

  const basket = (b, g) => `
<section class="basket">
  <h2>${esc(legoLabel(b.lego))}</h2>
  <div class="cols">
    <div class="col">
      <h3>live — in the course today <span class="verdictpill ${b.score && b.score.pass ? 'ok' : 'bad'}">${b.score ? (b.score.pass ? 'PASS' : 'FAIL') : 'no phrases'}</span></h3>
      ${criteriaTable(b.score, b.splits)}
      ${phraseList(b.phrases)}
    </div>
    <div class="col">
      <h3>generated — frame-guided ${g && g.score ? `<span class="verdictpill ${g.score.pass ? 'ok' : 'bad'}">${g.score.pass ? 'PASS' : 'FAIL'}</span>` : ''}</h3>
      ${g ? `${criteriaTable(g.score, g.splits)}${phraseList(g.phrases)}`
          : '<p class="none">no candidate basket for this LEGO</p>'}
    </div>
  </div>
</section>`;

  const unattr = live.unattributed ? `
<section class="basket">
  <h2>unattributed <span class="none">— ${live.unattributed.phrases.length} phrase(s) whose lego_index matches no LEGO of this seed</span></h2>
  <p class="meta">Scored for information only. <b>This group does not gate the seed</b> — a row nobody can attribute is a data question, not a quality failure.</p>
  <div class="col">${criteriaTable(live.unattributed.score, [])}${phraseList(live.unattributed.phrases)}</div>
</section>` : '';

  return page(`seed lab — ${course} ${seed}`, `
<h1>the seed lab <span class="none">— ${esc(course)}, seed ${seed}</span></h1>
${controls(course, seed)}
<div class="seed">
  <div class="immutable">the seed is immutable — nothing here writes to it, or to anything else in the database</div>
  <div class="k">${esc(seedRow.known_text)}</div>
  <div class="t">${esc(seedRow.target_text)}</div>
</div>

<div class="job">
  <div class="joblabel">what this seed is for — <b>derived from its own admission diff</b>, not looked up in a table</div>
  <div class="jobverdict">${esc(job.verdict)}</div>
  <p>${esc(job.sentence)}</p>
  ${job.splits_in_play.length ? `<p class="meta">splits in play on this seed's frames: ${job.splits_in_play.map(s => esc(`${s.id} ${s.name}`)).join('; ')}${job.new_sides.length ? '' : ' — every side of them already admitted by an earlier seed'}</p>` : ''}
  ${job.not_machine_checkable.length ? `<p class="meta">not machine-checkable here: ${job.not_machine_checkable.map(s => esc(s.id + ' ' + s.outcomes.join(', '))).join('; ')} — reported as unseen, never scored as absent</p>` : ''}
</div>

<div class="rule">
  <b>The unit is the LEGO, not the seed.</b> One LEGO, one basket, one set of floors — <b>this seed passes only if EVERY basket below passes</b>.
  <div class="seedverdict ${live.seed_pass ? 'ok' : 'bad'}">LIVE, this seed: ${live.seed_pass ? 'PASS' : `FAIL — ${esc(live.failing_baskets.map(f => `L${String(f.lego_index).padStart(2, '0')} (${f.floors.join(', ')})`).join(', '))}`}</div>
  ${gen ? `<div class="seedverdict ${gen.seed_pass ? 'ok' : 'bad'}">GENERATED, this seed: ${gen.seed_pass ? 'PASS' : `FAIL — ${esc(gen.failing_baskets.map(f => `L${String(f.lego_index).padStart(2, '0')} (${f.floors.join(', ')})`).join(', '))}`}</div>` : ''}
  <p class="meta">Seed-level composite is context and never decides: live ${live.seed_composite}${gen ? `, generated ${gen.seed_composite}`: ''}. Averaging baskets is exactly how three healthy ones hide a thin fourth.</p>
  <p class="meta">Phrase ids like <code class="pid">L01-3</code> — third phrase in the first LEGO's basket — are <b>per-instance labels for pointing at one phrase in a verdict, not permalinks</b>. Regenerate a basket and the same id points at a different phrase. Nothing is written to the database.</p>
</div>

${cand ? `<p class="meta">candidates generated ${esc(cand.generated)} · model ${esc(cand.model)} · build ${esc(cand.build_sha)} · ${cand.attempts.length} pass(es)</p>`
       : `<p class="none">no candidate set yet: <code>node tools/frame-layer/generate-candidates.cjs ${esc(course)} ${seed} --passes 3</code></p>`}

${live.baskets.map(b => basket(b, genBy.get(b.lego_index))).join('')}
${unattr}

<form class="verdict" method="post" action="/lab/verdict">
  <input type="hidden" name="course" value="${esc(course)}">
  <input type="hidden" name="seed" value="${seed}">
  <input type="hidden" name="candidate_stamp" value="${esc(cand ? cand.generated : 'none')}">
  <h2>verdict</h2>
  <p class="meta">Against one phrase, or the whole seed. Leave the box empty for the seed as a whole.</p>
  <label>about <input name="about" list="pids" size="12" placeholder="L01-3, or L01, or blank"></label>
  <datalist id="pids">${live.baskets.flatMap(b => [`<option value="L${String(b.lego_index).padStart(2, '0')}">`, ...b.phrases.map(p => `<option value="${esc(p.lab_id)}">`)]).join('')}</datalist>
  <textarea name="text" id="v" placeholder="Type or dictate a sentence against what is on screen. Stored verbatim." autofocus></textarea>
  <p><button type="submit">save verdict</button> <a href="/lab/verdicts">read them back &rarr;</a></p>
  <p class="meta">stored verbatim with the timestamp, the course and seed, what it is about, which candidate set was on screen, and build ${esc(BUILD_SHA)}</p>
</form>
<script>document.addEventListener('keydown',e=>{if(e.key==='v'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();document.getElementById('v').focus()}
if((e.metaKey||e.ctrlKey)&&e.key==='Enter'&&e.target.id==='v'){e.target.form.submit()}});</script>`);
}

const legoLabel = (l) => `L${String(l.lego_index).padStart(2, '0')} · ${l.known_text} → ${l.target_text}  [${l.type || '?'}]`;

function controls(course, seed) {
  return `<form class="row" method="get" action="/lab">
    <label>course <input name="course" value="${esc(course)}" size="12"></label>
    <label>seed <input name="seed" value="${esc(seed)}" size="5" inputmode="numeric"></label>
    <button type="submit">show</button>
    <a href="/lab?course=${esc(course)}&seed=${+seed - 1}">&larr; prev</a>
    <a href="/lab?course=${esc(course)}&seed=${+seed + 1}">next &rarr;</a>
    <a href="/lab/verdicts">verdicts</a>
  </form>`;
}

function verdictsPage() {
  const rows = fs.existsSync(VERDICTS)
    ? fs.readFileSync(VERDICTS, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    : [];
  rows.reverse();
  return page('verdicts', `<h1>verdicts <span class="none">— newest first, ${rows.length}</span></h1>
  <p><a href="/lab">&larr; back to the lab</a> · <button onclick="navigator.clipboard.writeText(document.getElementById('all').textContent)">copy all</button></p>
  <div id="all">${rows.map(r => `<div class="v">${r.about ? `<code class="pid">${esc(r.about)}</code> ` : ''}${esc(r.text)}<div class="meta">${esc(r.ts)} · ${esc(r.course)} seed ${esc(r.seed)}${r.about ? ` · about ${esc(r.about)}` : ' · about the whole seed'} · candidate set ${esc(r.candidate_stamp)} · build ${esc(r.build_sha)}</div></div>`).join('') || '<p class="none">none yet</p>'}</div>`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'POST' && url.pathname === '/lab/verdict') {
      let body = '';
      req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
      await new Promise(r => req.on('end', r));
      const f = new URLSearchParams(body);
      const rec = { ts: new Date().toISOString(), text: f.get('text') || '', course: f.get('course'),
        seed: +f.get('seed'),
        // which phrase (or basket) the verdict is about — blank means the whole seed
        about: (f.get('about') || '').trim() || null,
        candidate_stamp: f.get('candidate_stamp'), build_sha: BUILD_SHA };
      if (rec.text.trim()) fs.appendFileSync(VERDICTS, JSON.stringify(rec) + '\n');
      res.writeHead(303, { Location: '/lab/verdicts' }); return res.end();
    }
    if (url.pathname === '/lab/verdicts') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(verdictsPage());
    }
    if (url.pathname === '/lab' || url.pathname === '/') {
      const course = url.searchParams.get('course') || 'spa_for_eng';
      const seed = +(url.searchParams.get('seed') || 599);  // the current payload
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(await labPage(course, seed));
    }
    if (url.pathname === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok ' + BUILD_SHA + '\n'); }
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found\n');
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' }); res.end('error: ' + e.message + '\n');
  }
});
server.listen(PORT, HOST, () => console.log(`seed lab on http://${HOST}:${PORT}/lab (build ${BUILD_SHA})`));

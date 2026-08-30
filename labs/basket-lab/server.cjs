#!/usr/bin/env node
/**
 * THE BASKET LAB — the unit being judged is the BASKET: one LEGO's phrases,
 * live in the course today beside a newly generated candidate set, both scored
 * against the same machine floors, with a box for a verbatim verdict.
 *
 * WHY IT IS NOT "THE SEED LAB" (Tom, 2026-08-29: "it's more of a BASKET_LAB").
 * The seed is how you NAVIGATE to a basket; the basket is what you JUDGE.
 * Calling it a seed lab quietly invites someone to score a seed again — the
 * exact defect the per-LEGO scoping removed. So: navigate by language x seed,
 * judge by basket, and a multi-LEGO seed simply shows up as several baskets
 * rather than one thing with an average.
 *
 * READ-ONLY against all production content. It never writes to course_seeds,
 * course_legos, course_practice_phrases or anything else in Supabase. The only
 * thing it persists is verdicts, in labs/basket-lab/verdicts.ndjson.
 *
 * SEEDS ARE IMMUTABLE. "Seed replacement" means replacing the LEGOs and phrases
 * UNDER a seed; the seed's own text is rendered read-only and labelled as such.
 *
 * Run: node labs/basket-lab/server.cjs   (PORT=8461 HOST=127.0.0.1)
 */
require('dotenv').config({ quiet: true });
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { scoreBaskets } = require('../../tools/frame-layer/pattern-diversity.cjs');
const { deriveJob } = require('../../tools/frame-layer/derive-seed-job.cjs');
const { loadCorpus, pairOf, knownSideIsEnglish } = require('../../tools/frame-layer/corpus.cjs');
const { attestedFrames, expensiveClassFor } = require('../../tools/frame-layer/availability.cjs');
const JOBS = require('./jobs.cjs');

const PORT = +(process.env.PORT || 8461);
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = path.join(__dirname, '..', '..');
const VERDICTS = path.join(__dirname, 'verdicts.ndjson');
const CANDIDATES = JOBS.CANDIDATES;
const TASTE_FILE = path.join(__dirname, 'taste-languages.json');
const MAPPING_DOC = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/frame-layer/pair-mapping-classes.json'), 'utf8'));

/**
 * WHICH COLUMNS ARE TASTE AND WHICH ARE MEASUREMENT.
 *
 * Tom can taste the ENGLISH KNOWN SIDE in every column — that is the canonical
 * set and his judgement of it is authoritative whatever the target language. He
 * can taste the TARGET side only in the languages he has. For the rest the
 * honest read is INSTRUMENT-ONLY: does it cross the split, is diversity above
 * the floors, does the target still perform the seed's derived job.
 *
 * [DEFAULT AWAITING TOM'S RULING] The list below is a guess — the Romance and
 * Germanic pairs he has been working in. It lives in one file, is editable from
 * the grid page, and one sentence from him fixes it.
 */
function tasteList() {
  try { return JSON.parse(fs.readFileSync(TASTE_FILE, 'utf8')).taste_target_side || []; }
  catch { return ['spa_for_eng']; }
}
function saveTasteList(list) {
  const doc = JSON.parse(fs.readFileSync(TASTE_FILE, 'utf8'));
  doc.taste_target_side = list;
  fs.writeFileSync(TASTE_FILE, JSON.stringify(doc, null, 2) + '\n');
}
const canTasteTarget = (course) => tasteList().includes(course);
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

const BUILD_SHA = (() => {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); }
  catch { return 'unknown'; }
})();

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const candidatesFor = (course, seed) => JOBS.readCandidates(course, seed);

/**
 * One cell's whole analysis. EVERY cache in here is keyed by COURSE as well as
 * seed, and every per-course tally is computed inside this function from that
 * course's own rows: frame attestation from its own prior seeds, the expensive
 * mapping class from its own entry in pair-mapping-classes.json. Nothing a
 * course computes may leak into the cell beside it — "same seed, different
 * pressure per pair" is a thing worth seeing, and a shared tally would hide it.
 */
const CELL_CACHE = new Map();          // `${course}:${seed}` -> { at, value }
const CELL_TTL_MS = 60_000;

async function analyse(course, seed) {
  const key = `${course}:${seed}`;     // course in the key, always
  const hit = CELL_CACHE.get(key);
  if (hit && Date.now() - hit.at < CELL_TTL_MS) return hit.value;

  const c = await loadCorpus(sb, course, seed);
  let value;
  if (!c.seedRow) {
    value = { course, seed, missing: true };
  } else {
    const job = deriveJob({ course, seedRow: c.seedRow, ownLegos: c.ownLegos, priorSeeds: c.priorSeeds,
                            priorLegos: c.priorLegos, priorComponents: c.priorComponents });
    const attested = attestedFrames(c.priorSeeds, c.seedRow);
    const ec = expensiveClassFor(course, MAPPING_DOC);
    const opts = { legos: c.ownLegos, job, instantiableFrames: attested.size,
                   ...(ec ? { expensiveClass: ec.class } : {}) };
    const cand = candidatesFor(course, seed);
    value = { course, seed, corpus: c, job, attested, expensive: ec,
              known_is_english: knownSideIsEnglish(course), pair: pairOf(course),
              live: scoreBaskets(c.phrases, opts),
              cand,
              gen: cand && !cand.broken ? scoreBaskets(cand.phrases, opts) : null };
  }
  CELL_CACHE.set(key, { at: Date.now(), value });
  return value;
}
const dropCell = (course, seed) => CELL_CACHE.delete(`${course}:${seed}`);

/** Distinct course codes that actually have seeds — never a hardcoded list. */
let COURSES = { at: 0, list: [] };
async function courseList() {
  if (Date.now() - COURSES.at < 10 * 60_000 && COURSES.list.length) return COURSES.list;
  const { pageAll } = require('../../tools/frame-layer/corpus.cjs');
  const rows = await pageAll(sb, 'course_seeds', 'course_code', q => q.eq('seed_number', 1));
  COURSES = { at: Date.now(), list: [...new Set(rows.map(r => r.course_code))].sort() };
  return COURSES.list;
}

const ROLE_ORDER = { build: 0, use: 1, component: 2 };
const sortPhrases = (a, b) => (ROLE_ORDER[a.phrase_role] ?? 9) - (ROLE_ORDER[b.phrase_role] ?? 9);

function criteriaTable(s, splits, splitsReadable) {
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
      : `<tr><td class="none">SPLIT — ${splitsReadable === false
            ? 'no split matchers exist for this pair, so splits are UNREADABLE here — not absent'
            : 'this LEGO admits no side of any split'}</td><td class="n none">n/a</td><td class="n"></td><td class="none">—</td></tr>`}
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
.taste{border:1px solid var(--line);border-left:4px solid var(--ok);border-radius:4px;padding:8px 10px;margin:10px 0;font-size:14px}
.taste.instrument{border-left-color:var(--bad);background:color-mix(in srgb,var(--bad) 7%,transparent)}
.tablewrap{overflow-x:auto}
table.grid{border-collapse:collapse;width:100%;font-size:13px}
table.grid th,table.grid td{border:1px solid var(--line);padding:8px;vertical-align:top;min-width:230px}
table.grid th.seedh,table.grid td.seedh{min-width:0;width:48px;text-align:right;color:var(--dim)}
table.grid th.instrument,table.grid td.instrument{background:color-mix(in srgb,var(--bad) 7%,transparent)}
.colname{font-weight:700}
.colmode{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--dim)}
th.instrument .colmode{color:var(--bad)}
.colmeta{font-size:11px;color:var(--dim);font-weight:400}
.cellhead{display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-bottom:4px}
.cellgen{margin:4px 0}
.cellgen button{font-size:12px;padding:2px 6px}
.cellseed{font-size:13px;margin:4px 0}
.celljob{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--dim);margin:4px 0}
ul.cellbaskets{margin:4px 0 0;padding-left:16px}
ul.cellbaskets li{margin:0 0 6px}
.genstate{font-size:12px;color:var(--dim)}
.bad{color:var(--bad)}
`;

function page(title, body) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style><main>${body}</main>`;
}

async function labPage(course, seed) {
  const a = await analyse(course, seed);
  if (a.missing) return page('basket lab', `<h1>basket lab</h1><p class="none">no seed ${esc(seed)} in ${esc(course)} — this course does not have that seed.</p>${controls(course, seed)}`);
  const { corpus: { seedRow, ownLegos }, job, live, gen, cand } = a;
  const genBy = new Map((gen ? gen.baskets : []).map(b => [b.lego_index, b]));

  const basket = (b, g) => `
<section class="basket">
  <h2>${esc(legoLabel(b.lego))}</h2>
  <div class="cols">
    <div class="col">
      <h3>live — in the course today <span class="verdictpill ${b.score && b.score.pass ? 'ok' : 'bad'}">${b.score ? (b.score.pass ? 'PASS' : 'FAIL') : 'no phrases'}</span></h3>
      ${criteriaTable(b.score, b.splits, job.splits_readable)}
      ${phraseList(b.phrases)}
    </div>
    <div class="col">
      <h3>generated — frame-guided ${g && g.score ? `<span class="verdictpill ${g.score.pass ? 'ok' : 'bad'}">${g.score.pass ? 'PASS' : 'FAIL'}</span>` : ''}</h3>
      ${genAction(course, seed, b.lego_index)}
      ${g ? `${criteriaTable(g.score, g.splits, job.splits_readable)}${phraseList(g.phrases)}`
          : '<p class="none">nothing generated for this basket yet</p>'}
    </div>
  </div>
</section>`;

  const unattr = live.unattributed ? `
<section class="basket">
  <h2>unattributed <span class="none">— ${live.unattributed.phrases.length} phrase(s) whose lego_index matches no LEGO of this seed</span></h2>
  <p class="meta">Scored for information only. <b>This group does not gate the seed</b> — a row nobody can attribute is a data question, not a quality failure.</p>
  <div class="col">${criteriaTable(live.unattributed.score, [], job.splits_readable)}${phraseList(live.unattributed.phrases)}</div>
</section>` : '';

  return page(`basket lab — ${course} ${seed}`, `
<h1>the basket lab <span class="none">— ${esc(course)}, seed ${seed}</span></h1>
${controls(course, seed)}
${tasteBanner(course)}
${generationPanel(course, seed, cand)}
<div class="seed">
  <div class="immutable">the seed is immutable — nothing here writes to it, or to anything else in the database</div>
  <div class="k">${esc(seedRow.known_text)}</div>
  <div class="t">${esc(seedRow.target_text)}</div>
</div>

<div class="job">
  <div class="joblabel">what this seed is for — <b>derived from its own admission diff</b>, not looked up in a table</div>
  <div class="jobverdict">${esc(job.verdict)}</div>
  <p>${esc(job.sentence)}</p>
  ${job.splits_readable ? '' : `<p class="meta"><b>splits are unreadable for this pair.</b> The split matchers are facts about a target language's morphology and only Spanish has them; this column's SPLIT readings are missing, not zero.</p>`}
  ${job.splits_in_play.length ? `<p class="meta">splits in play on this seed's frames: ${job.splits_in_play.map(s => esc(`${s.id} ${s.name}`)).join('; ')}${job.new_sides.length ? '' : ' — every side of them already admitted by an earlier seed'}</p>` : ''}
  ${job.atomisations.length ? `<p class="meta"><b>promotion, with its evidence:</b> ${job.atomisations.map(x => esc(`"${x.target_text}" (L${String(x.lego_index).padStart(2, '0')}, "${x.known_text}") was ${x.how} at seed ${x.from_seed} — "${x.from_target}" / "${x.from_known}"`)).join('; ')}. A component admission extends the available vocabulary without creating a learning event; becoming a LEGO with a basket is the learning event.</p>` : ''}
  ${job.not_machine_checkable.length ? `<p class="meta">not machine-checkable here: ${job.not_machine_checkable.map(s => esc(s.id + ' ' + s.outcomes.join(', '))).join('; ')} — reported as unseen, never scored as absent</p>` : ''}
</div>

<div class="rule">
  <b>The unit is the LEGO, not the seed.</b> One LEGO, one basket, one set of floors — <b>this seed passes only if EVERY basket below passes</b>.
  <div class="seedverdict ${live.seed_pass ? 'ok' : 'bad'}">LIVE, this seed: ${live.seed_pass ? 'PASS' : `FAIL — ${esc(live.failing_baskets.map(f => `L${String(f.lego_index).padStart(2, '0')} (${f.floors.join(', ')})`).join(', '))}`}</div>
  ${gen ? `<div class="seedverdict ${gen.seed_pass ? 'ok' : 'bad'}">GENERATED, this seed: ${gen.seed_pass ? 'PASS' : `FAIL — ${esc(gen.failing_baskets.map(f => `L${String(f.lego_index).padStart(2, '0')} (${f.floors.join(', ')})`).join(', '))}`}</div>` : ''}
  <p class="meta">Seed-level composite is context and never decides: live ${live.seed_composite}${gen ? `, generated ${gen.seed_composite}`: ''}. Averaging baskets is exactly how three healthy ones hide a thin fourth.</p>
  <p class="meta">Phrase ids like <code class="pid">L01-3</code> — third phrase in the first LEGO's basket — are <b>per-instance labels for pointing at one phrase in a verdict, not permalinks</b>. Regenerate a basket and the same id points at a different phrase. Nothing is written to the database.</p>
</div>

${cand && !cand.broken ? `<p class="meta">candidates generated ${esc(cand.generated)} · model ${esc(cand.model)} · build ${esc(cand.build_sha)} · ${cand.attempts.length} pass(es)${a.expensive ? ` · weights leaned to ${esc(a.expensive.class)}, this pair's own expensive mapping class` : ' · neutral weights: no mapping classes recorded for this pair'}${a.attested ? ` · ${a.attested.size} frame(s) attested in THIS course by this seed` : ''}</p>` : ''}

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
if((e.metaKey||e.ctrlKey)&&e.key==='Enter'&&e.target.id==='v'){e.target.form.submit()}});
async function gen(course,seed,regen){
  const el=document.querySelector('.gen .genstate'); if(el)el.textContent='asking…';
  await fetch('/lab/generate',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({course,seed,regenerate:regen})});
  poll();
}
const drawnStamp=${JSON.stringify(cand && !cand.broken ? cand.generated : null)};
async function poll(){
  const r=await fetch('/lab/status?cells='+encodeURIComponent(${JSON.stringify(`${course}|${seed}`)}));
  const j=await r.json(); const s=j.cells[0]; if(!s)return;
  const el=document.querySelector('.gen .genstate'); if(el)el.textContent=s.words;
  if(s.generated!==drawnStamp){location.reload();return}
  const live=(s.state==='queued'||s.state==='running');
  // a pass can run fifteen minutes; five seconds is polite, and the poll is a
  // status read, not the run — nothing here has to outlive a generation
  setTimeout(poll, live?5000:20000);
}
poll();</script>`);
}


/* ------------------------------------------------------------------ *
 * GENERATE ON DEMAND — the in-page action.
 *
 * Generation is per basket per language, so a 3x3 picker is nine passes.
 * Every action here posts and returns immediately; the page polls /lab/status
 * and fills in. Nothing blocks. Concurrency is capped in jobs.cjs.
 * ------------------------------------------------------------------ */
function generationPanel(course, seed, cand) {
  const st = JOBS.statusOf(course, seed);
  return `<div class="rule gen" data-cell="${esc(course)}|${seed}">
    <b>candidate baskets</b> — <span class="genstate">${esc(stateWords(st))}</span>
    <p class="meta">One pass writes candidates for EVERY basket of this seed: the generator's unit is the seed's
    prompt, so a per-basket button and a per-seed button trigger the same run. It takes minutes, it never blocks
    this page, and at most ${JOBS.MAX_RUNNING} run at once across the whole lab.</p>
    <button onclick="gen('${esc(course)}',${seed},false)">${cand ? 'generate (cached — no-op)' : 'generate'}</button>
    <button onclick="if(confirm('Regenerate? The current set is archived beside it, so verdicts already typed against its stamp stay readable.'))gen('${esc(course)}',${seed},true)">regenerate</button>
    ${st.archives ? `<span class="meta">${st.archives} archived set(s) kept beside this one</span>` : ''}
  </div>`;
}

/** The per-basket action. Same run, honestly labelled. */
const genAction = (course, seed, legoIndex) =>
  `<p class="meta"><button onclick="gen('${esc(course)}',${seed},true)">regenerate this basket</button>
   <span class="none">— one pass rewrites every basket in seed ${seed}; the prompt's unit is the seed</span></p>`;

function stateWords(st) {
  switch (st.state) {
    case 'none': return 'not generated yet';
    case 'queued': return `QUEUED — position ${st.queue_position}, waiting for one of ${JOBS.MAX_RUNNING} slots`;
    case 'running': return `GENERATING — ${Math.round((st.elapsed_ms || 0) / 1000)}s elapsed (a pass can take fifteen minutes)`;
    case 'failed': return `FAILED — ${st.error || 'no cause recorded'}`;
    case 'done': return `generated ${st.generated || ''} · build ${st.build_sha || '?'}`;
    default: return st.state;
  }
}

/* ------------------------------------------------------------------ *
 * TASTE versus MEASUREMENT — say which is which, never blur them.
 * ------------------------------------------------------------------ */
function tasteBanner(course) {
  const taste = canTasteTarget(course);
  const p = pairOf(course);
  const knownEng = knownSideIsEnglish(course);
  return `<div class="taste ${taste ? 'canTaste' : 'instrument'}">
    <b>${taste ? 'TASTE' : 'INSTRUMENT ONLY on the target side'}</b> —
    ${knownEng
      ? 'you can taste the English known side here, as in every column: it is the canonical set and your ear on it is authoritative.'
      : `the known side of this pair is <b>${esc(p.known || '?')}</b>, not English. The frame layer's patterns are English regexes, so every frame reading in this column is <b>not applicable</b> rather than "no frames found".`}
    ${taste
      ? ` The target side is <b>${esc(p.target || '?')}</b> and you read it, so judge the target phrases too.`
      : ` The target side is <b>${esc(p.target || '?')}</b>. Read the instrument, not the phrases: does it cross the split, is diversity above the floors, does the target still perform the seed's derived job. A verdict on target phrasing here would be a guess entering the record as evidence.`}
    <span class="meta"> [default awaiting a ruling — <a href="/lab/grid">edit the list</a>]</span>
  </div>`;
}

/* ------------------------------------------------------------------ *
 * THE GRID — several languages against several seeds.
 *
 * The known side is one canonical set PER COURSE, so a row of languages
 * against one seed is the same job realised four different ways: the mapping
 * table made visible rather than tabulated. One column per language, one row
 * per seed. Cells generate independently and fill as they land.
 *
 * A multi-LEGO seed shows SEVERAL BASKETS in its cell. They are never averaged:
 * the seed composite is context and never decides, so it is not shown here at all.
 * ------------------------------------------------------------------ */
async function gridPage(courses, seeds) {
  const all = await courseList();
  const cells = [];
  for (const seed of seeds) for (const course of courses) cells.push({ course, seed });
  const results = await Promise.all(cells.map(async c => {
    try { return { ...c, a: await analyse(c.course, c.seed) }; }
    catch (e) { return { ...c, err: e.message }; }
  }));
  const at = new Map(results.map(r => [`${r.course}|${r.seed}`, r]));

  const head = `<tr><th class="seedh">seed</th>${courses.map(c => {
    const taste = canTasteTarget(c), p = pairOf(c);
    return `<th class="${taste ? 'canTaste' : 'instrument'}"><div class="colname">${esc(c)}</div>
      <div class="colmode">${taste ? 'TASTE — known side and target side' : 'known side: taste · target side: INSTRUMENT ONLY'}</div>
      <div class="colmeta">${knownSideIsEnglish(c) ? '' : `known side is ${esc(p.known || '?')}, not English — frame readings not applicable · `}${(() => { const e = expensiveClassFor(c, MAPPING_DOC); return e ? `expensive class ${esc(e.class)}` : 'no mapping classes recorded'; })()}</div></th>`;
  }).join('')}</tr>`;

  const body = seeds.map(seed => `<tr><th class="seedh">${seed}</th>${courses.map(course => {
    const r = at.get(`${course}|${seed}`);
    return `<td class="${canTasteTarget(course) ? 'canTaste' : 'instrument'}">${cell(course, seed, r)}</td>`;
  }).join('')}</tr>`).join('');

  return page('basket lab — grid', `
<h1>the basket lab <span class="none">— the grid</span></h1>
<p><a href="/lab">&larr; the deep view, where you judge phrases and type verdicts</a> · <a href="/lab/verdicts">verdicts</a></p>
<form class="row" method="get" action="/lab/grid">
  <label>courses <input name="courses" value="${esc(courses.join(','))}" size="34" list="allcourses"></label>
  <label>seeds <input name="seeds" value="${esc(seeds.join(','))}" size="14" inputmode="numeric"></label>
  <button type="submit">show</button>
  <span class="meta">${all.length} courses have content</span>
</form>
<datalist id="allcourses">${all.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
<p class="meta">One column per language, one row per seed — down a row it is <b>the same seed realised in different pairs</b>,
which is the mapping table made visible rather than tabulated. Each cell lists its own baskets; a multi-LEGO seed shows
several. <b>They are never averaged</b> — three healthy baskets hiding a thin fourth is exactly what an average buys you.</p>
<div class="tablewrap"><table class="grid">${head}${body}</table></div>
<form class="row" method="post" action="/lab/taste">
  <label>pairs whose TARGET side you can taste <input name="list" value="${esc(tasteList().join(','))}" size="52"></label>
  <button type="submit">save</button>
  <span class="meta">[default awaiting your ruling] everything else is instrument-only on the target side</span>
</form>
<script>
const drawn=${JSON.stringify(Object.fromEntries(cells.map(c => [`${c.course}|${c.seed}`,
  (JOBS.readCandidates(c.course, c.seed) || {}).generated || null])))};
async function gen(course,seed,regen){
  const el=document.querySelector('[data-cell="'+course+'|'+seed+'"] .genstate');
  if(el)el.textContent='asking…';
  await fetch('/lab/generate',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({course,seed,regenerate:regen})});
  poll();
}
async function poll(){
  const keys=[...document.querySelectorAll('[data-cell]')].map(e=>e.dataset.cell);
  if(!keys.length)return;
  const r=await fetch('/lab/status?cells='+encodeURIComponent(keys.join(',')));
  const j=await r.json();
  let anyLive=false;
  for(const s of j.cells){
    const el=document.querySelector('[data-cell="'+s.course+'|'+s.seed+'"] .genstate');
    if(el)el.textContent=s.words;
    if(s.state==='queued'||s.state==='running')anyLive=true;
    if(drawn[s.course+'|'+s.seed]!==(s.generated||null)){location.reload();return}
  }
  // a pass can run for fifteen minutes; five seconds is polite and comfortably
  // outlives nothing at all, because the poll is a status read, not the run
  setTimeout(poll, anyLive?5000:20000);
}
poll();
</script>`);
}

function cell(course, seed, r) {
  const st = JOBS.statusOf(course, seed);
  const head = `<div class="cellhead"><a href="/lab?course=${esc(course)}&seed=${seed}">open &rarr;</a>
     <span class="genstate">${esc(stateWords(st))}</span></div>
   <div data-cell="${esc(course)}|${seed}" class="cellgen">
     <button onclick="gen('${esc(course)}',${seed},false)">generate</button>
     <button onclick="gen('${esc(course)}',${seed},true)">regenerate</button>
     <span class="genstate"></span></div>`;
  if (!r) return head + '<p class="none">not loaded</p>';
  if (r.err) return head + `<p class="bad">failed to load: ${esc(r.err)}</p>`;
  if (r.a.missing) return `<div class="cellhead"><span class="none">no such seed in this course</span></div>
    <p class="none">${esc(course)} has no seed ${seed} — nothing to generate and nothing to judge.</p>`;
  const { a } = r;
  const genBy = new Map((a.gen ? a.gen.baskets : []).map(b => [b.lego_index, b]));
  const baskets = a.live.baskets.map(b => {
    const g = genBy.get(b.lego_index);
    const pill = (s) => s ? `<span class="verdictpill ${s.pass ? 'ok' : 'bad'}">${s.pass ? 'PASS' : 'FAIL ' + s.floor_failures.join(' ')}</span>`
                          : '<span class="none">—</span>';
    return `<li><b>L${String(b.lego_index).padStart(2, '0')}</b> ${esc(b.lego.known_text)} → ${esc(b.lego.target_text)}
      <br><span class="none">live</span> ${pill(b.score)} <span class="none">generated</span> ${g ? pill(g.score) : '<span class="none">—</span>'}</li>`;
  }).join('');
  return `${head}
    <div class="cellseed">${esc(a.corpus.seedRow.known_text)}<br><span class="none">${esc(a.corpus.seedRow.target_text)}</span></div>
    <div class="celljob">${esc(a.job.verdict)}</div>
    <ul class="cellbaskets">${baskets || '<li class="none">no legos on this seed</li>'}</ul>`;
}

const legoLabel = (l) => `L${String(l.lego_index).padStart(2, '0')} · ${l.known_text} → ${l.target_text}  [${l.type || '?'}]`;

function controls(course, seed) {
  return `<form class="row" method="get" action="/lab">
    <label>course <input name="course" value="${esc(course)}" size="12"></label>
    <label>seed <input name="seed" value="${esc(seed)}" size="5" inputmode="numeric"></label>
    <button type="submit">show</button>
    <a href="/lab?course=${esc(course)}&seed=${+seed - 1}">&larr; prev</a>
    <a href="/lab?course=${esc(course)}&seed=${+seed + 1}">next &rarr;</a>
    <a href="/lab/grid?courses=${esc(course)}&seeds=${seed}">grid</a>
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
    if (req.method === 'POST' && url.pathname === '/lab/generate') {
      let body = '';
      req.on('data', c => { body += c; if (body.length > 1e5) req.destroy(); });
      await new Promise(r => req.on('end', r));
      const f = JSON.parse(body || '{}');
      const course = String(f.course || ''), seed = +f.seed;
      if (!/^[a-z]{2,3}_for_[a-z]{2,3}$/.test(course) || !Number.isFinite(seed)) {
        res.writeHead(400, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: 'course and seed required' }));
      }
      const job = JOBS.enqueue({ course, seed, regenerate: !!f.regenerate });
      dropCell(course, seed);
      res.writeHead(202, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ job: { key: job.key, state: job.state } }));
    }
    if (url.pathname === '/lab/status') {
      const cells = (url.searchParams.get('cells') || '').split(',').filter(Boolean).map(x => {
        const [course, seed] = x.split('|');
        const st = JOBS.statusOf(course, +seed);
        // The candidate file's own stamp is the identity of a set. If it differs
        // from what the page drew, the page redraws — which is also why the cached
        // analysis for that cell has to go: it is holding the previous set.
        const cached = CELL_CACHE.get(`${course}:${+seed}`);
        if (cached && (cached.value.cand ? cached.value.cand.generated : null) !== st.generated) dropCell(course, +seed);
        return { ...st, words: stateWords(st) };
      });
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ cells, runner: JOBS.snapshot() }));
    }
    if (req.method === 'POST' && url.pathname === '/lab/taste') {
      let body = '';
      req.on('data', c => { body += c; if (body.length > 1e5) req.destroy(); });
      await new Promise(r => req.on('end', r));
      const list = (new URLSearchParams(body).get('list') || '').split(',').map(x => x.trim()).filter(Boolean);
      saveTasteList(list);
      res.writeHead(303, { Location: '/lab/grid' }); return res.end();
    }
    if (url.pathname === '/lab/grid') {
      // taste-safe default: a SMALL grid. Nine cells on a first click is nine
      // generation passes and a spinner, which is the failure this replaces.
      const courses = (url.searchParams.get('courses') || 'spa_for_eng,fra_for_eng')
        .split(',').map(x => x.trim()).filter(x => /^[a-z]{2,3}_for_[a-z]{2,3}$/.test(x)).slice(0, 6);
      const seeds = (url.searchParams.get('seeds') || '599,600')
        .split(',').map(x => +x.trim()).filter(Number.isFinite).slice(0, 6);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(await gridPage(courses.length ? courses : ['spa_for_eng'], seeds.length ? seeds : [599]));
    }
    if (url.pathname === '/lab/courses') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(await courseList()));
    }
    if (url.pathname === '/lab/verdicts') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(verdictsPage());
    }
    if (url.pathname === '/basket-lab') { res.writeHead(302, { Location: '/lab' + url.search }); return res.end(); }
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
server.listen(PORT, HOST, () => console.log(`basket lab on http://${HOST}:${PORT}/lab · grid at /lab/grid (build ${BUILD_SHA}, ${JOBS.MAX_RUNNING} generations at a time)`));

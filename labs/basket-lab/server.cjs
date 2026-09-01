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

/**
 * WHERE THIS LAB IS ROOTED.
 *
 * Standalone (node labs/basket-lab/server.cjs) it is rooted at '/', which is
 * what the port-8461 process has always been. Mounted into the production API
 * — which is how it reaches Tom through admin > configs — it is rooted at
 * whatever mount() is given, and every link, form action and fetch in the
 * emitted HTML carries that prefix. There is one copy of the lab either way:
 * the surface Tom judges baskets on is the same code, not a re-implementation
 * of it in Vue that would drift from this one within a week.
 */
let BASE = '';

/**
 * CAN THIS COPY SPEND MONEY?
 *
 * Generation shells out to the Claude CLI: one pass is real spend and can run
 * for fifteen minutes. The standalone process on 8461 runs on Tom's own box
 * behind loopback and may do it. The copy mounted into the production API is
 * reachable through a tunnel from a phone, so it is READ-AND-JUDGE ONLY: it
 * shows the live basket beside whatever candidates are already on disk, takes
 * verdicts, and tells you the exact command to generate more. A button that
 * quietly bills a stranger's click is not a feature.
 */
let READ_ONLY = false;
const ROOT = path.join(__dirname, '..', '..');
const VERDICTS = path.join(__dirname, 'verdicts.ndjson');
const CANDIDATES = JOBS.CANDIDATES;
const TASTE_FILE = path.join(__dirname, 'taste-languages.json');
/**
 * The frame layer's mapping table, read once at require time. It is TRACKED source
 * (docs/frame-layer/*.md is rendered from these .json companions), and the .gitignore
 * exception at the bottom of that file is what keeps it in every checkout.
 *
 * The read is guarded because production-api.cjs mounts this lab at require time: on
 * 2026-09-01 the repo-size sweep gitignored this file as if it were a log, and the next
 * -prod restart crash-looped the whole API on ENOENT — a read-and-judge lab page taking
 * the production API down with it. A missing table now costs exactly what it should: the
 * grid says "no mapping classes recorded" per column, and nothing else changes.
 */
const MAPPING_DOC = (() => {
  const f = path.join(ROOT, 'docs/frame-layer/pair-mapping-classes.json');
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { console.error(`[basket-lab] mapping classes unavailable (${e.code || e.message}) at ${f} — columns will report no mapping classes. This file is tracked; a checkout missing it is broken.`); return null; }
})();

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
/* ── HOUSE TOKENS — A LITERAL MIRROR OF src/style.css ────────────────────────
   An iframe inherits neither the shell's CSS custom properties nor its
   data-theme attribute, so this lab has to carry the palette itself. These
   values are COPIED FROM src/style.css, not re-tuned: change them there and
   change them here IN THE SAME COMMIT, or this page silently drifts off brand
   — which is the exact defect this block was written to fix (Tom, 2026-08-31:
   the lab "has a different coloured iframe as its background").

   Which block applies is decided by ?theme=light on the URL, which
   src/views/admin/BasketLab.vue sets from the shell's own data-theme. It is
   deliberately NOT prefers-color-scheme: the shell's toggle decides, not the
   OS. Standalone on port 8461 that means dark by default, ?theme=light for
   light — and the page still looks right with no shell around it. */
:root{
  --canvas:#0f172a; --surface:#1e293b; --surface-2:#334155; --surface-3:#475569;
  --line:#334155; --ink:#f1f5f9; --muted:#94a3b8; --faint:#64748b;
  --accent:#ffa630; --accent-2:#34d399; --success:#34d399; --danger:#f87171;
  color-scheme:dark;
}
:root[data-theme="light"]{
  --canvas:#eef2f6; --surface:#ffffff; --surface-2:#f1f5f9; --surface-3:#e2e8f0;
  --line:#cbd5e1; --ink:#0f172a; --muted:#475569; --faint:#586573;
  --accent:#a85508; --accent-2:#047857; --success:#047857; --danger:#cf1f1f;
  color-scheme:light;
}
*{box-sizing:border-box}
html,body{background:var(--canvas)}
body{font:15px/1.5 Inter,system-ui,Avenir,Helvetica,Arial,sans-serif;margin:0;color:var(--ink)}
main{max-width:1200px;margin:0 auto;padding:16px}

/* Type scale — sentence case throughout; the only tracked caps are the small
   labels below, which are the house's .ui-filter-label / .section-label. */
h1{font-size:1.25rem;font-weight:700;letter-spacing:-0.01em;margin:0 0 6px;color:var(--ink)}
h2{font-size:1rem;font-weight:700;letter-spacing:-0.01em;margin:20px 0 8px;color:var(--ink)}
h3{font-size:0.875rem;font-weight:600;margin:0 0 8px;color:var(--muted)}

a{color:var(--accent-2);text-decoration:none}
a:hover{text-decoration:underline}

/* Forms — the shared field look from src/assets/ui-tokens.css (.ui-field). */
form.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:10px 0 14px;border-bottom:1px solid var(--line);margin-bottom:4px}
form.row label{display:flex;gap:6px;align-items:center;font-size:0.8rem;color:var(--muted)}
input,textarea,select{font:inherit;font-size:0.85rem;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:0.3rem 0.55rem}
input::placeholder,textarea::placeholder{color:var(--faint)}
input:focus,textarea:focus,select:focus{outline:none;border-color:var(--accent-2)}
button{font:inherit;font-size:0.8rem;cursor:pointer;color:var(--ink);background:var(--surface);border:1px solid var(--line);border-radius:9999px;padding:0.28rem 0.8rem;transition:border-color .15s,color .15s}
button:hover{border-color:var(--accent-2);color:var(--accent-2)}

/* Cards, not boxes: one surface, one quiet 1px line, one radius. */
.seed,.job,.rule,.taste,.col,.split{background:var(--surface);border:1px solid var(--line);border-radius:10px}
.seed{border-left:3px solid var(--faint);padding:12px 14px;margin:14px 0}
.seed .k{font-weight:600}
.seed .t{color:var(--muted)}
.immutable{font-size:0.6875rem;text-transform:uppercase;letter-spacing:.06em;color:var(--danger);margin-bottom:4px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:820px){.cols{grid-template-columns:1fr}}
.col{padding:12px 14px;min-width:0}

/* Phrase lists. Monospace stays where it belongs: on phrase ids and commands. */
ol.phrases{margin:0;padding-left:20px}
ol.phrases li{margin:0 0 8px}
ul.phrases{margin:0;padding:0;list-style:none}
ul.phrases li{margin:0 0 10px;padding-left:62px;text-indent:-62px}
ul.phrases li .t,ul.phrases li .why{padding-left:0;text-indent:0}
code,code.pid{font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,Menlo,monospace}
code.pid{font-size:0.6875rem;color:var(--muted);background:var(--surface-2);border:1px solid var(--line);border-radius:5px;padding:1px 3px;margin-right:6px;display:inline-block;width:52px;text-align:center;text-indent:0}

/* Badges are pills from a fixed palette. */
.role{font-size:0.625rem;text-transform:uppercase;letter-spacing:.06em;border:1px solid var(--line);border-radius:9999px;padding:1px 7px;margin-right:6px;color:var(--muted);background:var(--surface-2)}
.role.use{color:var(--accent-2);border-color:color-mix(in srgb,var(--accent-2) 55%,transparent);background:color-mix(in srgb,var(--accent-2) 14%,transparent)}
.role.build{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 55%,transparent);background:color-mix(in srgb,var(--accent) 14%,transparent)}
.verdictpill{display:inline-block;font-size:0.6875rem;font-weight:600;letter-spacing:.04em;border-radius:9999px;padding:1px 8px;border:1px solid currentColor;background:color-mix(in srgb,currentColor 12%,transparent)}
.verdictpill.ok{color:var(--success)}
.verdictpill.bad{color:var(--danger)}

.k{display:inline}
.t{display:block;color:var(--muted)}
.why{display:block;font-size:0.8125rem;color:var(--faint);font-style:italic}
.none{color:var(--faint)}
.meta{font-size:0.75rem;color:var(--muted);margin-top:6px}
.bad{color:var(--danger)}

/* Criteria table — the house's dense scannable table (.ui-table). */
table.crit{border-collapse:collapse;width:100%;margin:10px 0;font-size:0.8125rem}
table.crit th{text-align:left;font-weight:600;color:var(--faint);font-size:0.6875rem;text-transform:uppercase;letter-spacing:.05em}
table.crit td,table.crit th{border-bottom:1px solid var(--line);padding:5px 6px;text-align:left}
td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}
tr.bad td{color:var(--danger)}
tr.ok td{color:inherit}

.split{padding:8px 10px;margin:8px 0;font-size:0.8125rem;background:var(--surface-2)}
.split.bad{border-color:color-mix(in srgb,var(--danger) 55%,var(--line))}
.split ul{margin:4px 0 0;padding-left:18px;color:var(--muted)}

.verdict{margin-top:20px;border-top:1px solid var(--line);padding-top:14px}
.verdict label{display:flex;gap:6px;align-items:center;font-size:0.8rem;color:var(--muted);margin:6px 0}
textarea{width:100%;min-height:90px}

.v{border-bottom:1px solid var(--line);padding:12px 0;white-space:pre-wrap}
.v .meta{white-space:normal}

.job{border-left:3px solid var(--accent-2);padding:12px 14px;margin:14px 0}
.joblabel{font-size:0.6875rem;text-transform:uppercase;letter-spacing:.06em;color:var(--faint)}
.jobverdict{font-size:1.125rem;font-weight:700;letter-spacing:-0.01em;margin:3px 0 5px}
.job p{margin:5px 0}
.rule{padding:12px 14px;margin:14px 0;font-size:0.8125rem}
.seedverdict{margin-top:6px;font-weight:700}
.seedverdict.ok{color:var(--success)}
.seedverdict.bad{color:var(--danger)}

.basket{margin:26px 0 0;border-top:1px solid var(--line);padding-top:14px}
.basket h2{font-size:1rem;text-transform:none;letter-spacing:-0.01em;color:var(--ink);font-weight:700;margin:6px 0 10px}

.taste{border-left:3px solid var(--accent-2);padding:10px 12px;margin:12px 0;font-size:0.8125rem}
.taste.instrument{border-left-color:var(--danger);background:color-mix(in srgb,var(--danger) 8%,var(--surface))}

/* The grid. */
.tablewrap{background:var(--surface);border:1px solid var(--line);border-radius:10px;overflow-x:auto}
table.grid{border-collapse:collapse;width:100%;font-size:0.8125rem}
table.grid th,table.grid td{border-bottom:1px solid var(--line);border-right:1px solid var(--line);padding:10px;vertical-align:top;min-width:230px}
table.grid tr:last-child td{border-bottom:none}
table.grid th:last-child,table.grid td:last-child{border-right:none}
table.grid thead th,table.grid tr:first-child th{background:var(--surface-2)}
table.grid th.seedh,table.grid td.seedh{min-width:0;width:48px;text-align:right;color:var(--faint);font-variant-numeric:tabular-nums}
table.grid th.instrument,table.grid td.instrument{background:color-mix(in srgb,var(--danger) 7%,var(--surface))}
table.grid th.instrument{background:color-mix(in srgb,var(--danger) 10%,var(--surface-2))}
.colname{font-weight:700;color:var(--ink)}
.colmode{font-size:0.6875rem;text-transform:uppercase;letter-spacing:.05em;color:var(--faint)}
th.instrument .colmode{color:var(--danger)}
.colmeta{font-size:0.6875rem;color:var(--faint);font-weight:400}
.cellhead{display:flex;justify-content:space-between;gap:8px;font-size:0.75rem;margin-bottom:6px}
.cellgen{margin:6px 0;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.cellgen button{font-size:0.6875rem;padding:2px 8px}
.cellseed{font-size:0.8125rem;margin:6px 0}
.celljob{font-size:0.6875rem;text-transform:uppercase;letter-spacing:.06em;color:var(--faint);margin:6px 0}
ul.cellbaskets{margin:6px 0 0;padding-left:16px}
ul.cellbaskets li{margin:0 0 8px}
.genstate{font-size:0.75rem;color:var(--muted)}
`;
/* ── THEME ACROSS THE IFRAME BOUNDARY ────────────────────────────────────────
 * An iframe inherits neither the parent's CSS variables nor its data-theme, so
 * the shell's choice has to travel as data — on the query string. BasketLab.vue
 * reads document.documentElement.dataset.theme and appends ?theme=light; here
 * it lands on <html data-theme="light"> and the light token block in CSS wins.
 * Anything else, including no parameter at all, is DARK — which is the shell's
 * default and the standalone lab's default too.
 *
 * The theme has to survive a click as well as a load: prev/next/grid/verdicts
 * and every form inside the frame navigate the frame itself, and the wrapper
 * cannot re-append the parameter for them. So it is threaded onto every
 * internal link (tq/tq1) and carried as a hidden field on every GET form.
 */
const themeOf = (url) => url.searchParams.get('theme') === 'light' ? 'light' : 'dark';
/** Suffix for a link that already has a query string; '' in dark. */
const tq = (theme) => theme === 'light' ? '&theme=light' : '';
/** Suffix for a link that has no query string yet; '' in dark. */
const tq1 = (theme) => theme === 'light' ? '?theme=light' : '';
/** The same state, carried through a GET form — state, not a control. */
const tqField = (theme) => theme === 'light' ? '<input type="hidden" name="theme" value="light">' : '';

function page(title, body, theme) {
  return `<!doctype html><html${theme === 'light' ? ' data-theme="light"' : ''}><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style><main>${body}</main></html>`;
}

async function labPage(course, seed, theme) {
  const a = await analyse(course, seed);
  if (a.missing) return page('basket lab', `<h1>basket lab</h1><p class="none">no seed ${esc(seed)} in ${esc(course)} — this course does not have that seed.</p>${controls(course, seed, theme)}`, theme);
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
${controls(course, seed, theme)}
${tasteBanner(course, theme)}
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

<form class="verdict" method="post" action="${BASE}/lab/verdict${tq1(theme)}">
  <input type="hidden" name="course" value="${esc(course)}">
  <input type="hidden" name="seed" value="${seed}">
  <input type="hidden" name="candidate_stamp" value="${esc(cand ? cand.generated : 'none')}">
  <h2>verdict</h2>
  <p class="meta">Against one phrase, or the whole seed. Leave the box empty for the seed as a whole.</p>
  <label>about <input name="about" list="pids" size="12" placeholder="L01-3, or L01, or blank"></label>
  <datalist id="pids">${live.baskets.flatMap(b => [`<option value="L${String(b.lego_index).padStart(2, '0')}">`, ...b.phrases.map(p => `<option value="${esc(p.lab_id)}">`)]).join('')}</datalist>
  <textarea name="text" id="v" placeholder="Type or dictate a sentence against what is on screen. Stored verbatim." autofocus></textarea>
  <p><button type="submit">save verdict</button> <a href="${BASE}/lab/verdicts${tq1(theme)}">read them back &rarr;</a></p>
  <p class="meta">stored verbatim with the timestamp, the course and seed, what it is about, which candidate set was on screen, and build ${esc(BUILD_SHA)}</p>
</form>
<script>document.addEventListener('keydown',e=>{if(e.key==='v'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();document.getElementById('v').focus()}
if((e.metaKey||e.ctrlKey)&&e.key==='Enter'&&e.target.id==='v'){e.target.form.submit()}});
async function gen(course,seed,regen){
  const el=document.querySelector('.gen .genstate'); if(el)el.textContent='asking…';
  await fetch('${BASE}/lab/generate',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({course,seed,regenerate:regen})});
  poll();
}
const drawnStamp=${JSON.stringify(cand && !cand.broken ? cand.generated : null)};
async function poll(){
  const r=await fetch('${BASE}/lab/status?cells='+encodeURIComponent(${JSON.stringify(`${course}|${seed}`)}));
  const j=await r.json(); const s=j.cells[0]; if(!s)return;
  const el=document.querySelector('.gen .genstate'); if(el)el.textContent=s.words;
  if(s.generated!==drawnStamp){location.reload();return}
  const live=(s.state==='queued'||s.state==='running');
  // a pass can run fifteen minutes; five seconds is polite, and the poll is a
  // status read, not the run — nothing here has to outlive a generation
  setTimeout(poll, live?5000:20000);
}
poll();</script>`, theme);
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
  if (READ_ONLY) return `<div class="rule gen">
    <b>candidate baskets</b> — <span class="genstate">${esc(stateWords(st))}</span>
    <p class="meta">Generation is not offered here: a pass shells out to the Claude CLI, costs real money and can
    run fifteen minutes, so it stays a deliberate local act rather than a button on a page reachable from a phone.
    To generate: <code>node tools/frame-layer/generate-candidates.cjs ${esc(course)} ${seed} --passes 3</code>,
    or open the lab's own process on port 8461 on the box that has the repo. Whatever it writes shows up here.</p>
  </div>`;
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
  READ_ONLY ? '' : `<p class="meta"><button onclick="gen('${esc(course)}',${seed},true)">regenerate this basket</button>
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
function tasteBanner(course, theme) {
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
    <span class="meta"> [default awaiting a ruling — <a href="${BASE}/lab/grid${tq1(theme)}">edit the list</a>]</span>
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
async function gridPage(courses, seeds, theme) {
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
    return `<td class="${canTasteTarget(course) ? 'canTaste' : 'instrument'}">${cell(course, seed, r, theme)}</td>`;
  }).join('')}</tr>`).join('');

  return page('basket lab — grid', `
<h1>the basket lab <span class="none">— the grid</span></h1>
<p><a href="${BASE}/lab${tq1(theme)}">&larr; the deep view, where you judge phrases and type verdicts</a> · <a href="${BASE}/lab/verdicts${tq1(theme)}">verdicts</a></p>
<form class="row" method="get" action="${BASE}/lab/grid">
  <label>courses <input name="courses" value="${esc(courses.join(','))}" size="34" list="allcourses"></label>
  <label>seeds <input name="seeds" value="${esc(seeds.join(','))}" size="14" inputmode="numeric"></label>
  ${tqField(theme)}<button type="submit">show</button>
  <span class="meta">${all.length} courses have content</span>
</form>
<datalist id="allcourses">${all.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
<p class="meta">One column per language, one row per seed — down a row it is <b>the same seed realised in different pairs</b>,
which is the mapping table made visible rather than tabulated. Each cell lists its own baskets; a multi-LEGO seed shows
several. <b>They are never averaged</b> — three healthy baskets hiding a thin fourth is exactly what an average buys you.</p>
<div class="tablewrap"><table class="grid">${head}${body}</table></div>
<form class="row" method="post" action="${BASE}/lab/taste${tq1(theme)}">
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
  await fetch('${BASE}/lab/generate',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({course,seed,regenerate:regen})});
  poll();
}
async function poll(){
  const keys=[...document.querySelectorAll('[data-cell]')].map(e=>e.dataset.cell);
  if(!keys.length)return;
  const r=await fetch('${BASE}/lab/status?cells='+encodeURIComponent(keys.join(',')));
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
</script>`, theme);
}

function cell(course, seed, r, theme) {
  const st = JOBS.statusOf(course, seed);
  const head = `<div class="cellhead"><a href="${BASE}/lab?course=${esc(course)}&seed=${seed}${tq(theme)}">open &rarr;</a>
     <span class="genstate">${esc(stateWords(st))}</span></div>
   ${READ_ONLY ? '' : `<div data-cell="${esc(course)}|${seed}" class="cellgen">
     <button onclick="gen('${esc(course)}',${seed},false)">generate</button>
     <button onclick="gen('${esc(course)}',${seed},true)">regenerate</button>
     <span class="genstate"></span></div>`}`;
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

function controls(course, seed, theme) {
  return `<form class="row" method="get" action="${BASE}/lab">
    <label>course <input name="course" value="${esc(course)}" size="12"></label>
    <label>seed <input name="seed" value="${esc(seed)}" size="5" inputmode="numeric"></label>
    ${tqField(theme)}<button type="submit">show</button>
    <a href="${BASE}/lab?course=${esc(course)}&seed=${+seed - 1}${tq(theme)}">&larr; prev</a>
    <a href="${BASE}/lab?course=${esc(course)}&seed=${+seed + 1}${tq(theme)}">next &rarr;</a>
    <a href="${BASE}/lab/grid?courses=${esc(course)}&seeds=${seed}${tq(theme)}">grid</a>
    <a href="${BASE}/lab/verdicts${tq1(theme)}">verdicts</a>
  </form>`;
}

function verdictsPage(theme) {
  const rows = fs.existsSync(VERDICTS)
    ? fs.readFileSync(VERDICTS, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    : [];
  rows.reverse();
  return page('verdicts', `<h1>verdicts <span class="none">— newest first, ${rows.length}</span></h1>
  <p><a href="${BASE}/lab${tq1(theme)}">&larr; back to the lab</a> · <button onclick="navigator.clipboard.writeText(document.getElementById('all').textContent)">copy all</button></p>
  <div id="all">${rows.map(r => `<div class="v">${r.about ? `<code class="pid">${esc(r.about)}</code> ` : ''}${esc(r.text)}<div class="meta">${esc(r.ts)} · ${esc(r.course)} seed ${esc(r.seed)}${r.about ? ` · about ${esc(r.about)}` : ' · about the whole seed'} · candidate set ${esc(r.candidate_stamp)} · build ${esc(r.build_sha)}</div></div>`).join('') || '<p class="none">none yet</p>'}</div>`, theme);
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const theme = themeOf(url);
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
      // A verdict Tom typed and lost is the worst failure this lab has, worse
      // than not shipping the page. So a write that fails is SHOWN, never swallowed.
      if (rec.text.trim()) {
        try { fs.appendFileSync(VERDICTS, JSON.stringify(rec) + '\n'); }
        catch (e) {
          res.writeHead(500, { 'content-type': 'text/html; charset=utf-8' });
          return res.end(page('verdict NOT saved', `<h1 class="bad">your verdict was NOT saved</h1>
            <p>Writing to <code>${esc(VERDICTS)}</code> failed: <b>${esc(e.message)}</b>. Nothing was stored.
            Copy the text below before you leave this page.</p>
            <div class="v">${esc(rec.text)}</div>
            <p><a href="${BASE}/lab?course=${esc(rec.course)}&seed=${rec.seed}${tq(theme)}">&larr; back</a></p>`, theme));
        }
      }
      res.writeHead(303, { Location: BASE + '/lab/verdicts' + tq1(theme) }); return res.end();
    }
    if (req.method === 'POST' && url.pathname === '/lab/generate') {
      let body = '';
      req.on('data', c => { body += c; if (body.length > 1e5) req.destroy(); });
      await new Promise(r => req.on('end', r));
      if (READ_ONLY) {
        res.writeHead(403, { 'content-type': 'application/json' });
        return res.end(JSON.stringify({ error: 'generation is local-only on this mount — run tools/frame-layer/generate-candidates.cjs' }));
      }
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
      res.writeHead(303, { Location: BASE + '/lab/grid' + tq1(theme) }); return res.end();
    }
    if (url.pathname === '/lab/grid') {
      // taste-safe default: a SMALL grid. Nine cells on a first click is nine
      // generation passes and a spinner, which is the failure this replaces.
      const courses = (url.searchParams.get('courses') || 'spa_for_eng,fra_for_eng')
        .split(',').map(x => x.trim()).filter(x => /^[a-z]{2,3}_for_[a-z]{2,3}$/.test(x)).slice(0, 6);
      const seeds = (url.searchParams.get('seeds') || '599,600')
        .split(',').map(x => +x.trim()).filter(Number.isFinite).slice(0, 6);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(await gridPage(courses.length ? courses : ['spa_for_eng'], seeds.length ? seeds : [599], theme));
    }
    if (url.pathname === '/lab/courses') {
      res.writeHead(200, { 'content-type': 'application/json' });
      return res.end(JSON.stringify(await courseList()));
    }
    if (url.pathname === '/lab/verdicts') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(verdictsPage(theme));
    }
    if (url.pathname === '/basket-lab') { res.writeHead(302, { Location: BASE + '/lab' + url.search }); return res.end(); }
    if (url.pathname === '/lab' || url.pathname === '/') {
      const course = url.searchParams.get('course') || 'spa_for_eng';
      const seed = +(url.searchParams.get('seed') || 599);  // the current payload
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(await labPage(course, seed, theme));
    }
    if (url.pathname === '/healthz') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('ok ' + BUILD_SHA + '\n'); }
    res.writeHead(404, { 'content-type': 'text/plain' }); res.end('not found\n');
  } catch (e) {
    res.writeHead(500, { 'content-type': 'text/plain' }); res.end('error: ' + e.message + '\n');
  }
}

/**
 * Mount the lab under a host server at `base`. Returns a plain (req,res)
 * middleware: it strips the prefix off req.url so the routing table above is
 * unchanged, and sets BASE so the emitted HTML points back at the mount.
 * Express calls it with a third `next` argument, which is ignored — this lab
 * answers every path under its own mount or 404s inside it.
 */
function mount(base, opts = {}) {
  BASE = String(base || '').replace(/\/$/, '');
  READ_ONLY = !!opts.readOnly;
  return (req, res) => {
    // app.use('/x', fn) already strips the mount path; if something calls this
    // without stripping, strip it here. Either way the router sees '/lab...'.
    // MOUNT THIS BEFORE ANY BODY PARSER. The lab reads its own POST bodies off
    // the stream, so a parser that has already drained them leaves it waiting
    // for an 'end' that will never come — a hang, not an error.
    if (req.url.startsWith(BASE)) req.url = req.url.slice(BASE.length) || '/';
    handle(req, res);
  };
}

module.exports = { handle, mount };

if (require.main === module) {
  http.createServer(handle).listen(PORT, HOST, () =>
    console.log(`basket lab on http://${HOST}:${PORT}/lab · grid at /lab/grid (build ${BUILD_SHA}, ${JOBS.MAX_RUNNING} generations at a time)`));
}

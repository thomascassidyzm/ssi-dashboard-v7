#!/usr/bin/env node
'use strict';
// tools/qa/quality-census/snapshot.cjs — one READ-ONLY snapshot of a course, taken through Popty's own read route.
//
// WHY THROUGH POPTY AND NOT THE DATABASE. Tom's hard rule (2026-10-14, job #384): no agent touches the shared
// database with hand-written code. GET /api/production/:courseCode/seeds?status=all is the route the dashboard
// itself reads (course-data-service getSeedsByCourse: seeds → course_legos → course_practice_phrases, every column),
// so a census built on it reads what Popty reads and holds no SQL of its own. It is also why the seed-sentence
// placement check is fast on zho/jpn/kor: the old sweep joined every phrase to its LEGO inside the database and hit
// the agent login's 5 s statement cap; here the course arrives in one request (~2.5 s, ~20 MB for ita_for_eng) and
// every join happens in memory.
//
// Cross-checked 2026-10-19 on ita_for_eng against ops/lanes/phrase-quality/export-window.cjs (a direct
// course_practice_phrases read): 13,946 phrase rows both ways — the nested read drops no phrase.
//
//   node tools/qa/quality-census/snapshot.cjs <course> <out.json> [--api http://localhost:3470]

const fs = require('fs');

// target_for_known is the estate's course-code convention (ita_for_eng, por_br_for_eng, deu_at_for_zho)
function langsOf(course) {
  const m = /^([a-z]{3})(?:_[a-z]{2})?_for_([a-z]{3})/.exec(course);
  if (!m) throw new Error(`cannot read the languages of course code "${course}"`);
  return { target_lang: m[1], known_lang: m[2] };
}

// Flatten the nested route answer into the three tables the checks read.
function flatten(course, body) {
  const seeds = [], legos = [], phrases = [];
  for (const s of body.seeds || []) {
    const { legos: ls, ...seed } = s;
    seeds.push(seed);
    for (const l of ls || []) {
      const { basket_phrases: ps, ...lego } = l;
      legos.push(lego);
      for (const p of ps || []) phrases.push(p);
    }
  }
  const by = (a, b) => a.seed_number - b.seed_number || (a.lego_index || 0) - (b.lego_index || 0) || (a.position || 0) - (b.position || 0);
  legos.sort(by); phrases.sort(by); seeds.sort((a, b) => a.seed_number - b.seed_number);
  return { course, ...langsOf(course), taken: new Date().toISOString(), seeds, legos, phrases };
}

// The nested read is ONE statement on Popty's side and can hit its statement timeout when the box is loaded or the
// service has just restarted (seen 2026-10-19 15:20Z: HTTP 500 "canceling statement due to statement timeout", then
// 200 in 5.6 s and 2.3 s). One retry after a pause; a second failure is reported, never papered over. A course much
// bigger than ita_for_eng may time out every time — that is a gap to report, not a reason to read the DB directly.
async function take(course, { api = 'http://localhost:3470', retries = 1 } = {}) {
  const url = `${api}/api/production/${encodeURIComponent(course)}/seeds?status=all`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { 'x-agent-id': 'quality-census' } });
    if (res.ok) return flatten(course, await res.json());
    const body = (await res.text()).slice(0, 200);
    if (attempt >= retries) throw new Error(`${url} → HTTP ${res.status} ${body}`);
    await new Promise((r) => setTimeout(r, 15000));
  }
}

module.exports = { take, flatten, langsOf };

if (require.main === module) {
  const [course, out] = process.argv.slice(2);
  const i = process.argv.indexOf('--api');
  if (!course || !out) { console.error('usage: snapshot.cjs <course> <out.json> [--api URL]'); process.exit(64); }
  take(course, i > 0 ? { api: process.argv[i + 1] } : {}).then((snap) => {
    fs.writeFileSync(out, JSON.stringify(snap));
    console.error(`${course}: ${snap.seeds.length} seeds, ${snap.legos.length} LEGOs, ${snap.phrases.length} phrases → ${out}`);
  }).catch((e) => { console.error(e.message); process.exit(1); });
}

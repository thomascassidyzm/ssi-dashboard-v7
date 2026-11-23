'use strict';
// ITEM 2 of Kai's overnight run #785·AK (Kai's Y 23 Nov 11:02Z): eng_for_jpn known prompts D2, seeds 74-300, continuing
// #699·AI/#726·AI (paid cleanup item 3). Rows come from the sibling planner's TSVs (plans/, listed in plans/READY.txt) and
// are taken only where kit/item2.cjs's gate passed them (out/<plan>.gate.json: seed sweep on the nightly copy + the live
// per-row phrase-v4 gate). A FAIL is HELD and counted, never forced. ITEM2_DAY=1 also takes PENDING rows (pricing by day).
// Known side is Japanese: the new prompt is rendered (library first) and linked in the same transaction as the text edit.
const fs = require('fs');
const path = require('path');
const D = { course: 'eng_for_jpn', job: 'cs #789·AK item 2', seeds: {}, legos: {}, legoInsert: [], legoDelete: [], rep: {}, repEn: {}, phrases: {}, phraseInsert: [], items: [] };
D.intro = (known) => `${known}`; // no LEGO is touched by this item
D.approval = 'kai:2026-11-23:eng_for_jpn known prompts D2 seeds 74-300 (item 2 of the overnight run, Kai Y 23 Nov 11:02Z)';
D.purpose = 'eng_for_jpn known prompt rewritten to say what the English says, D2 seeds 74-300, Kai overnight run #785·AK item 2, cs #789·AK';
const ok = new Set(process.env.ITEM2_DAY === '1' ? ['PASS', 'PENDING'] : ['PASS']);
const only = process.env.ITEM2_FILES ? new Set(process.env.ITEM2_FILES.split(',')) : null;
const ready = fs.readFileSync(path.join(__dirname, 'plans', 'READY.txt'), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
D.held = [];
for (const f of ready) {
  if (only && !only.has(f)) continue;
  const g = path.join(__dirname, 'out', f.replace(/\.tsv$/, '.gate.json'));
  if (!fs.existsSync(g)) continue;
  for (const r of JSON.parse(fs.readFileSync(g, 'utf8')).rows) {
    if (ok.has(r.verdict)) D.phrases[r.id] = r.del ? null : [r.new, r.target];
    else if (r.verdict === 'FAIL' || r.verdict === 'SKIP') D.held.push({ file: f, id: r.id, verdict: r.verdict, why: r.why });
  }
  D.items.push({ n: f, label: 'D2 plan file' });
}
module.exports = D;

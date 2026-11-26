#!/usr/bin/env node
// cs #236·AL item 14 follow-up: the edit door refuses a target_text change on a row that carries target_text_roman written
// for the old text (26 Nov night: 92 rows in ara/ara_eg/ara_lb/kor). Adding a question mark changes no word, so the
// romanisation gains the same mark ("?" — a Latin-script line) and nothing else. Reads the item-14 ledgers (files only)
// and the copy snapshot (P717_SNAP) for each refused op's current romanisation, and writes item14r/<course>/
// item14.changeset.jsonl (+ guards, + clip-users.json copied) holding only those ops, same expect on target_text plus
// expect on target_text_roman. audio14.cjs runs on it with ITEM14_EXTRA_DIRS naming item14, so its shared-clip rule
// sees every applied fix row. No DB code.
//   P717_SNAP=<snap dir> node roman14.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const cs = require('../../../services/shared/changeset.cjs');
const { loadLedger } = require('../../../tools/changeset/apply-changeset.cjs');
const L = require('../../paid-cleanup-717/tools/lib.cjs');
const IN = path.resolve(__dirname, '../item14'), OUT = path.resolve(__dirname, '../item14r');
let tot = 0;
for (const c of fs.readdirSync(IN)) {
  const f = path.join(IN, c, 'item14.changeset.jsonl');
  if (!fs.existsSync(f)) continue;
  const { header, ops } = cs.read(f);
  const led = new Map(); for (const l of fs.existsSync(`${f}.applied.jsonl`) ? fs.readFileSync(`${f}.applied.jsonl`, 'utf8').split('\n').filter(Boolean) : []) { const e = JSON.parse(l); for (const i of e.ops) led.set(i, e); }
  const g = JSON.parse(fs.readFileSync(f.replace(/\.changeset\.jsonl$/, '.guards.json'), 'utf8')).guards;
  const pick = ops.map((o, i) => [o, i]).filter(([, i]) => { const e = led.get(i); return e && e.status === 'refused' && /target_text_roman/.test(e.detail || ''); });
  if (!pick.length) continue;
  const C = L.load(c);
  const byId = new Map(C.legos.flatMap((l) => l.rows).map((p) => [p.id, p]));
  const out = [], guards = [];
  for (const [o, i] of pick) {
    const p = byId.get(o.phrase_id);
    if (!p || !p.target_text_roman || p.target_text !== o.expect.target_text) continue;
    const roman = String(p.target_text_roman).replace(/[\s.!?]+$/u, '') + '?';
    out.push({ ...o, set: { ...o.set, target_text_roman: roman }, expect: { ...o.expect, target_text_roman: p.target_text_roman } });
    guards.push(g[i]);
  }
  if (!out.length) continue;
  const dir = path.join(OUT, c);
  cs.write(path.join(dir, 'item14.changeset.jsonl'), { course: c, job: header.job, source: `nightly copy ${C.db}`, kai_go: header.kai_go, id: `${c}-item14r-cs236`,
    why: `${header.why} Follow-up: rows the door refused because their romanisation must change with the text; the romanisation gains the same mark.` }, out);
  fs.writeFileSync(path.join(dir, 'item14.guards.json'), JSON.stringify({ changeset: `${c}-item14r-cs236`, copy_db: C.db, guards }));
  fs.copyFileSync(path.join(IN, c, 'clip-users.json'), path.join(dir, 'clip-users.json'));
  tot += out.length; console.log(c.padEnd(16), out.length);
}
console.log('TOTAL', tot);

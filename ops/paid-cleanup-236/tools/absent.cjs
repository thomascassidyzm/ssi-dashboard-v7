#!/usr/bin/env node
// cs #236·AL: a phrase.delete whose row is ALREADY GONE on live (another job deleted it since the copy) is answered by
// the edit door with HTTP 404 for the whole batch, and apply-changeset.cjs stops there (25 Nov night, por_for_eng
// S0040L01B02, gone by a sibling night run). The goal of that op (row absent) already holds, so before the applier runs,
// this reads the pending deletes' seeds through Popty's own read route (GET …/script-view) and writes each delete whose
// row is not served into the ledger as "already" (detail: row absent on live), exactly the fate the applier gives an op
// whose target live already holds. Reads only; writes only the ledger file. No DB code.
//   node absent.cjs <file.changeset.jsonl>   exit 0 = checked · 1 = could not read live (runner skips the file)
'use strict';
const fs = require('fs');
const cs = require('../../../services/shared/changeset.cjs');
const { loadLedger } = require('../../../tools/changeset/apply-changeset.cjs');
const file = process.argv[2];
const { header, ops } = cs.read(file);
const ledgerFile = `${file}.applied.jsonl`;
const led = loadLedger(ledgerFile);
const pend = ops.map((o, i) => [o, i]).filter(([o, i]) => o.op === 'phrase.delete' && !led.has(i));
const seedOf = (id) => Number(/S(\d{4})/.exec(String(id))[1]);
(async () => {
  if (!pend.length) return;
  const nums = [...new Set(pend.map(([o]) => seedOf(o.phrase_id)))].sort((a, b) => a - b);
  const served = new Set(); const seeds = new Set();
  try {
    for (let i = 0; i < nums.length;) {
      let j = i; while (j + 1 < nums.length && nums[j + 1] - nums[i] < 50) j++;
      const url = `http://localhost:3470/api/production/${header.course}/script-view?seedStart=S${String(nums[i]).padStart(4, '0')}&seedEnd=S${String(nums[j]).padStart(4, '0')}`;
      const r = await fetch(url, { headers: { 'x-agent-id': 'kai-236-absent' }, signal: AbortSignal.timeout(60000) });
      if (!r.ok) throw new Error(`${url} -> ${r.status}`);
      for (const s of (await r.json()).seeds || []) { seeds.add(s.seed_number); for (const l of s.legos || []) for (const p of l.phrases || []) { served.add(p.id); served.add(String(p.id).split(':').slice(1).join(':')); } }
      i = j + 1;
    }
  } catch (e) { console.error(`absent ${header.id}: could not read live (${e.message})`); process.exit(1); }
  const gone = pend.filter(([o]) => seeds.has(seedOf(o.phrase_id)) && !served.has(o.phrase_id) && !served.has(String(o.phrase_id).split(':').slice(1).join(':'))).map(([, i]) => i);
  if (gone.length) fs.appendFileSync(ledgerFile, JSON.stringify({ at: new Date().toISOString(), status: 'already', ops: gone, detail: 'row absent on live before apply (deleted by another job since the copy): absent.cjs' }) + '\n');
  console.log(`absent ${header.id}: ${pend.length} pending delete(s), ${gone.length} already gone on live`);
})();

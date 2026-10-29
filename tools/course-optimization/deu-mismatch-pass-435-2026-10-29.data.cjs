'use strict';
// deu_for_eng — job #435 (Kai 2026-10-29): the English↔German mismatch fixes the parent KEPT after re-reading every
// verdict of the ten readers (ops/deu-435/shard-*.data.cjs; each reader read every seed, LEGO and phrase of its range).
// Rows: [id, class, [known now, target now], [known fix | null, target fix | null] | null (= delete), why].
// REJECT lists the reader proposals the parent re-read and did not keep (moved to the held questions or dropped), by id.
const fs = require('fs');
const path = require('path');

const SHARD_DIR = path.join(__dirname, '../../ops/deu-435');
const shards = fs.existsSync(SHARD_DIR) ? fs.readdirSync(SHARD_DIR).filter((f) => /^shard-\d+-\d+\.data\.cjs$/.test(f)).map((f) => require(path.join(SHARD_DIR, f))) : [];

const REJECT = new Set([
  // shard 1-39 / 40-120: proposals the reader marked NOT CLEAR / optional / record-only, and LEGO rows with no text fix
  'seed 59', 'seed 73', 'seed 75', 'seed 117', 'S0040L02C01', 'S0082L01C01', 'S0108L01', 'S0115L02', 'S0117L02', 'S0117L03',
  // depends on the held "have hoped | haben gehofft" gloss (S0108L01); "we have hoped to see you in the pub" is not English
  'S0118L03U12',
  // "go home | nach Hause gehen" is itself a LEGO (S0401L04) beside "to go home | nach Hause fahren" (S0095L02): switching
  // these to fahren would not make the course more consistent, so they keep gehen
  'S0097L02U06', 'S0098L01B04',
  // after the fix it would duplicate S0087L01B05 exactly; deleted instead (EXTRA below)
  'S0087L01U12',
  // shard 121-200: LEGO proposals the reader left for the parent/Kai (cut, re-gloss, component split, missing LEGO)
  'S0126L02', 'S0131L05', 'S0141L02', 'S0143L01', 'S0151L03', 'S0155L01', 'S0190L01', 'S0190L02', 'seed 191',
]);
// Parent's own edits to a reader's fix text (id → [known, target]), when the reader's diagnosis is right but the wording is not.
const AMEND = {
  // reader also moved "gehen" to "fahren" (see REJECT note); keep gehen, keep the want/möchte English fix
  S0110L02B03: ["I'd like to go home after this is done", null],
  // the LEGO is "driven"; keep it in the English
  S0600L01U02: ['she has driven before', null],
  // "durften" is not taught by 424 as a LEGO: match the English to the German "nicht … müssen" (did not have to) instead
  S0424L03U03: ['I thought we did not have to waste the time of everyone', null],
  S0424L03U06: ["I knew we did not have to waste everyone's time", null],
};
// Parent-added rows (not in any shard).
const EXTRA = [
  // (kept for the record; the basket floor refuses it, so it is reported as skipped)
  ['S0087L01U12', 'delete', ['I said they are people I do not know', 'Ich sagte es sind Leute, die ich nicht kenne'], null, '"I said | Ich sagte" (sagte untaught at 87) beside "I said | Ich habe gesagt" in B05 of the same basket; the corrected row would be B05 itself'],
];

const keep = (rows) => rows.filter((f) => !REJECT.has(String(f[0]))).map((f) => (AMEND[f[0]] ? [f[0], f[1], f[2], AMEND[f[0]], f[4]] : f));
const all = (k) => shards.flatMap((s) => s[k] || []);
const FIXES = [...keep(all('FIXES')), ...EXTRA];
const LS = keep(all('LEGO_SEED'));
const SEED_FIXES = LS.filter((f) => /^seed \d+$/.test(f[0])).map((f) => [Number(f[0].slice(5)), ...f.slice(1)]);
const LEGO_FIXES = LS.filter((f) => /^S\d{4}L\d{2}$/.test(f[0]));
const HOLDS = all('HOLDS');

const REJECTED_LEGO_SEED = all('LEGO_SEED').filter((f) => REJECT.has(String(f[0])));
module.exports = { COURSE: 'deu_for_eng', FIXES, SEED_FIXES, LEGO_FIXES, HOLDS, REJECT, REJECTED_LEGO_SEED, shards };

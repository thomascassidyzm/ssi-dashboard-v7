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
]);
// Parent's own edits to a reader's fix text (id → [known, target]), when the reader's diagnosis is right but the wording is not.
const AMEND = {
};

const keep = (rows) => rows.filter((f) => !REJECT.has(String(f[0]))).map((f) => (AMEND[f[0]] ? [f[0], f[1], f[2], AMEND[f[0]], f[4]] : f));
const all = (k) => shards.flatMap((s) => s[k] || []);
const FIXES = keep(all('FIXES'));
const LS = keep(all('LEGO_SEED'));
const SEED_FIXES = LS.filter((f) => /^seed \d+$/.test(f[0])).map((f) => [Number(f[0].slice(5)), ...f.slice(1)]);
const LEGO_FIXES = LS.filter((f) => /^S\d{4}L\d{2}$/.test(f[0]));
const HOLDS = all('HOLDS');

module.exports = { COURSE: 'deu_for_eng', FIXES, SEED_FIXES, LEGO_FIXES, HOLDS, REJECT, shards };

#!/usr/bin/env node
// cs #960: what the item-9 night runner needs to know about a changeset, from files only (no DB, no network).
//   node ledger-state.cjs <file>                    prints "<ops not yet in the ledger> <ops set aside as drift/refused>"
//   node ledger-state.cjs --audio-pending <file…>   exit 0 if any applied row still has an audio slot with no answer
// slotsFor(file): the audio slots of the ops the ledger marks "applied" (shared with night-audio.cjs):
//   phrase.insert -> known, target1, target2; phrase.update / lego.update -> the side(s) whose words changed.
const fs = require('fs');
const cs = require('../../../services/shared/changeset.cjs');
const { loadLedger } = require('../../../tools/changeset/apply-changeset.cjs');

function slotsFor(file) {
  const { header, ops } = cs.read(file);
  const ledger = loadLedger(`${file}.applied.jsonl`);
  const slots = [];
  ops.forEach((o, i) => {
    if (ledger.get(i) !== 'applied') return;
    const sides = [];
    if (o.op === 'phrase.insert') sides.push(['known', o.row.known_text], ['target1', o.row.target_text], ['target2', o.row.target_text]);
    else if (o.op === 'phrase.update' || o.op === 'lego.update') {
      const s = o.set || {}, e = o.expect || {};
      if (s.known_text !== undefined && s.known_text !== e.known_text) sides.push(['known', s.known_text]);
      if (s.target_text !== undefined && s.target_text !== e.target_text) sides.push(['target1', s.target_text], ['target2', s.target_text]);
    } else return;
    const ref = o.op === 'lego.update' ? { legoId: o.lego_id } : { phraseId: o.op === 'phrase.insert' ? o.row.id : o.phrase_id };
    const id = ref.legoId || ref.phraseId;
    for (const [role, text] of sides) if (text) slots.push({ ...ref, id, role, text, key: `${id}|${role}` });
  });
  return { header, ops, ledger, slots };
}
const answered = (file) => new Set((fs.existsSync(`${file}.audio.jsonl`) ? fs.readFileSync(`${file}.audio.jsonl`, 'utf8').split('\n').filter(Boolean) : []).map((l) => JSON.parse(l).key));

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] === '--audio-pending') {
    const pending = a.slice(1).some((f) => { const done = answered(f); return slotsFor(f).slots.some((s) => !done.has(s.key)); });
    process.exit(pending ? 0 : 1);
  }
  const { ops, ledger } = slotsFor(a[0]);
  const left = ops.filter((_, i) => !ledger.has(i)).length;
  const aside = [...ledger.values()].filter((v) => v === 'drift' || v === 'refused').length;
  console.log(`${left} ${aside}`);
}
module.exports = { slotsFor, answered };

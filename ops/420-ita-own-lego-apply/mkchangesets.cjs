#!/usr/bin/env node
// cs #420·AK: rebuild.py's surviving rows -> one ssi-changeset/1 file per course (services/shared/changeset.cjs) plus the
// <name>.guards.json sidecar that ops/paid-cleanup-item9/tools/precheck-guards.cjs reads (Kai 19 Nov: live pre-check of
// row + LEGO + seed; a mismatch is HELD, never forced). No database: reads the copy dumps copy-read.cjs wrote.
//   RE-WORD -> phrase.update set {known_text?, target_text, decomposition, decomposition_course_version:null}
//              expect {known_text, target_text, decomposition} = what the copy held. Tiles are recomputed for the new
//              words with the door's own planner (decomposition-refresh.cjs planRecompute, forced), LEGOs as in the copy.
//   DELETE  -> phrase.delete expect {known_text, target_text}.
// usage: node mkchangesets.cjs <rebuilt.json> <dir with eng.json jpn.json eng-baskets.json jpn-baskets.json>
const fs = require('fs'), path = require('path');
const cs = require('../../services/shared/changeset.cjs');
const { planRecompute } = require('../../services/shared/decomposition-refresh.cjs');
const [rebuilt, dir] = process.argv.slice(2);
const R = JSON.parse(fs.readFileSync(rebuilt, 'utf8'));
const KAI_GO = "Kai's assistant commissioned APPLY 22 Nov (cs #420·AK) under Kai's 17 Nov learner-POV gate, answering Tom's Watson (ww-03084ac1 msg 684); plan #942·AI d/785f163d";
for (const course of ['ita_for_jpn', 'ita_for_eng']) {
  const s = course.split('_')[2];
  const dump = JSON.parse(fs.readFileSync(path.join(dir, `${s}.json`), 'utf8'));
  const baskets = JSON.parse(fs.readFileSync(path.join(dir, `${s}-baskets.json`), 'utf8'));
  const full = new Map(Object.values(baskets).flat().map((r) => [r.id, r]));
  const legos = dump.seeds.flatMap((sd) => sd.legos.map((l) => ({ seed_number: sd.n, lego_index: l.idx, target_text: l.target, known_text: l.known })));
  const rows = R.rows.filter((r) => r.course === course && !r.held.length);
  const ops = [], guards = [], problems = [];
  // deletes first, then re-words, in phrase order (a re-word never depends on a delete; order is for the reader)
  for (const r of [...rows.filter((r) => r.act === 'DELETE'), ...rows.filter((r) => r.act === 'RE-WORD')]) {
    const f = full.get(r.id);
    if (!f) { problems.push(`${r.id}: no full row in the baskets read`); continue; }
    if (f.known_text !== r.known || f.target_text !== r.target) { problems.push(`${r.id}: baskets read differs from dump`); continue; }
    if (r.act === 'DELETE') ops.push(cs.op('phrase.delete', { phrase_id: r.id, expect: { known_text: f.known_text, target_text: f.target_text } }));
    else {
      const plan = planRecompute({ courseCode: course, legos, phrases: [{ ...f, target_text: r.new_target }], courseVersion: null, forceIds: new Set([r.id]) });
      const pr = plan.rows[0] || {};
      if (!plan.ops.length) { problems.push(`${r.id}: tiles not recomputed (${pr.status})`); continue; }
      const set = {}, expect = {};
      if (r.new_known !== f.known_text) { set.known_text = r.new_known; expect.known_text = f.known_text; }
      set.target_text = r.new_target; expect.target_text = f.target_text;
      set.decomposition = plan.ops[0].set.decomposition; set.decomposition_course_version = null; expect.decomposition = f.decomposition;
      ops.push(cs.op('phrase.update', { phrase_id: r.id, set, expect }));
    }
    guards.push({ seed_number: r.seed, seed: { known_text: r.seed_known, target_text: r.seed_target }, lego_id: r.lego_id, lego: [{ known_text: r.lego_known, target_text: r.lego_target }] });
  }
  if (problems.length) { console.error(`${course}: REFUSED to write:\n  ${problems.join('\n  ')}`); process.exitCode = 1; continue; }
  const file = path.join(__dirname, course, 'changesets', 'own-lego-420.changeset.jsonl');
  const id = `own-lego-420-${course}`;
  cs.write(file, { id, course, job: '#420·AK', kai_go: KAI_GO, source: `nightly copy ${R.copy_db} built ${R.copy_built}`,
    why: "phrases filed under a LEGO they do not contain (#942·AI plan, re-checked on the copy): re-word to carry the whole LEGO, or delete (Kai 19 Nov thin baskets over bad phrases)" }, ops);
  fs.writeFileSync(file.replace(/\.changeset\.jsonl$/, '.guards.json'), JSON.stringify({ changeset: id, copy_db: R.copy_db, guards }, null, 1) + '\n');
  console.log(`${course}: ${ops.length} ops (${ops.filter((o) => o.op === 'phrase.delete').length} delete, ${ops.filter((o) => o.op === 'phrase.update').length} re-word) -> ${file}`);
}

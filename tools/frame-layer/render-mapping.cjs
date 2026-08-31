#!/usr/bin/env node
/** Render docs/frame-layer/pair-mapping-classes.md from its JSON companion. */
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', '..', 'docs', 'frame-layer');
const esc = (t) => String(t == null ? '' : t).replace(/\|/g, '\\|');
const d = JSON.parse(fs.readFileSync(path.join(dir, 'pair-mapping-classes.json'), 'utf8'));
/**
 * The overlay now carries two provenances. `P*` rows are the SEED corpus's
 * frames; `D*`/`X*` rows are the POD corpus's, and they default to
 * NOT ATTESTED. They are rendered in their own section rather than mixed into
 * the seed table, because a class distribution computed over eighteen
 * placeholders would say something false about the pair.
 */
const PLACEHOLDER = /^NOT /;
const isPod = (p) => p.provenance === 'pod';
const seedRows = d.patterns.filter(p => !isPod(p));
const podRows = d.patterns.filter(isPod);
const L = [];
L.push('# Per-pair mapping classes');
L.push('');
L.push('Every canonical English frame (see `english-pattern-inventory.md`) against what the target does with it. Four classes, Tom\'s ruling from the 2026-08-29 sitting:');
L.push('');
for (const [k, v] of Object.entries(d.classes)) L.push(`- **${k}** — ${v}`);
L.push('');
L.push('`spa_for_eng` is populated in full, every row carrying the seed numbers that attest it. `deu/zho/jpn` are populated only where an attesting example was cheap to pull live; every other cell says **NOT YET EXTRACTED** and means exactly that — it is a gap, not a claim of DETERMINISTIC.');
L.push('');
L.push('The finding this table exists to carry: **the curriculum relocates per pair.** spa = splits, deu = inversions, zho = erasure-cheap but with new admissions of its own, jpn = inversion + erasure + register. That is why no universal difficulty ordering ever worked.');
L.push('');
L.push('## spa_for_eng — full');
L.push('');
L.push('| id | pattern | known seeds | class | mapping | attesting seeds | note |');
L.push('|---|---|---:|---|---|---|---|');
for (const p of seedRows) {
  const s = p.pairs.spa_for_eng;
  L.push(`| ${p.id} | ${p.name} | ${p.known_seed_count} | **${s.class}** | ${esc(s.mapping)} | ${s.evidence_seeds.join(' ') || '—'} | ${esc(s.note)} |`);
}
const counts = {};
for (const p of seedRows) counts[p.pairs.spa_for_eng.class] = (counts[p.pairs.spa_for_eng.class] || 0) + 1;
L.push('');
L.push('Class distribution for spa_for_eng: ' + Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${v}`).join(', ') + '. **SPLIT is the pair\'s expensive class** — the metric in `frame-zut.md` weights toward it.');
L.push('');
for (const course of ['deu_for_eng', 'zho_for_eng', 'jpn_for_eng']) {
  const rows = seedRows.filter(p => !PLACEHOLDER.test(p.pairs[course].class));
  L.push(`## ${course} — ${rows.length} of ${seedRows.length} patterns extracted`);
  L.push('');
  L.push('| id | pattern | class | mapping | attesting seed | note |');
  L.push('|---|---|---|---|---:|---|');
  for (const p of rows) {
    const c = p.pairs[course];
    L.push(`| ${p.id} | ${p.name} | **${c.class}** | ${esc(c.mapping)} | ${c.evidence_seeds.join(' ')} | ${esc(c.note)} |`);
  }
  const missing = seedRows.filter(p => PLACEHOLDER.test(p.pairs[course].class)).map(p => p.id);
  L.push('');
  L.push(`NOT YET EXTRACTED (${missing.length}): ${missing.join(' ')}`);
  L.push('');
}
L.push(`## Pod frames (\`D*\` sentence grain, \`X*\` exchange grain) — ${podRows.length} rows, all NOT ATTESTED`);
L.push('');
L.push('These come from `dialogue-frame-inventory.md`, not from the seeds. **NOT ATTESTED means exactly that** — no pair has target-side evidence for a pod frame yet, and `expensiveClassFor` skips any class matching `/^NOT /`, so these rows cannot skew a pair\'s expensive-class tally. The Method Pod\'s Italian rendering (585 rows with `target_text`) is the first place a pod-frame mapping class can actually be read for any pair — and reading one is a separate job, because **pods do not cut**: having target text is a different act from minting an agreement between a known chunk and a target chunk.');
L.push('');
L.push('| id | grain | frame | pod rows | class, every pair |');
L.push('|---|---|---|---:|---|');
for (const p of podRows) L.push(`| ${p.id} | ${p.grain} | ${p.name} | ${p.pod_row_count} | ${p.pairs.spa_for_eng.class} |`);
L.push('');
L.push('## The seed-15 flag, re-confirmed live');
L.push('');
L.push('Seed 15\'s canonical teaching job is the want-YOU-to split. Pulled fresh 2026-08-29:');
L.push('');
L.push('| course | seed 15 target | carries the embedded subject? |');
L.push('|---|---|---|');
L.push('| known (eng) | and I want you to speak Spanish with me tomorrow | — |');
L.push('| spa_for_eng | y quiero que hables español conmigo mañana | yes (subjunctive `hables`) |');
L.push('| zho_for_eng | 我也想你明天和我说中文 | yes (bare embedded clause) |');
L.push('| deu_for_eng | und ich will morgen mit dir Deutsch sprechen | **no** — reads "I want to speak WITH you" |');
L.push('| jpn_for_eng | 明日も一緒に日本語を話したい | **no** — 〜たい is subject-bound |');
L.push('');
L.push('Possibly a deliberate deferral of expensive machinery (`dass` + V-final, 〜てほしい), but the learner drills a mapping that does not perform the seed\'s teaching job. Fidelity vs naturalisation is a native-eye call, and it is Tom\'s. The general check is now definable and mechanical: **per pair, does each seed\'s target still perform its seed\'s canonical teaching job?**');
fs.writeFileSync(path.join(dir, 'pair-mapping-classes.md'), L.join('\n') + '\n');
console.log('written');

#!/usr/bin/env node
/**
 * GOLD REVIEW SHEET: every gold row as Opus adjudicated it, beside Haiku's
 * tags, for Tom or Kai to overrule. Rows where the two disagree come first.
 * An overrule is an edit to frame-gold.json (frames / opener / note), after
 * which measure-gold.cjs re-scores Haiku against the corrected gold.
 *
 * Usage: node review-sheet.cjs [frame-gold.json] > sheet.md   (publish it; never commit the output)
 */
const fs = require('fs');
const path = require('path');
const T = require('../frame-tagger.cjs');

const gold = JSON.parse(fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'frame-gold.json'), 'utf8'));
const name = Object.fromEntries(T.CODEX.frames.map(f => [f.id, f.name]));
const fmt = (ids, opener) => [opener ? 'opener' : null, ...ids.map(id => `${id} ${name[id]}`)].filter(Boolean).join(', ') || '—';
const rows = gold.map(r => {
  const h = T.defaultCache().get(r.known_text);
  const agree = h && h.opener === !!r.gold.opener && h.frames.join() === r.gold.frames.join();
  return { r, h, agree };
});
rows.sort((a, b) => (a.agree - b.agree) || a.r.gid.localeCompare(b.r.gid));
const L = [`# Frame gold set — review sheet (codex ${T.CODEX.version})`, '',
  `${gold.length} known-side texts from ${new Set(gold.map(r => r.course)).size} courses, ${gold.filter(r => T.knownLanguageOf(r.course) !== 'eng').length} of them with a known side other than English. Opus decided each row from the codex; Haiku tagged the same rows blind. **Overrule any Opus call by replying with the row id and the frames you want** — the gold is then corrected and Haiku re-scored.`, '',
  `Disagreements first (${rows.filter(x => !x.agree).length}), then agreements.`, ''];
let lastAgree = null;
for (const { r, h, agree } of rows) {
  if (agree !== lastAgree) { L.push(`## ${agree ? 'Haiku agrees with Opus' : 'Haiku and Opus disagree'}`, ''); lastAgree = agree; }
  L.push(`**${r.gid}** · ${r.course} · ${T.knownLanguageName(r.course)} known · ${r.kind}${r.role && r.role !== r.kind ? ' ' + r.role : ''}`);
  L.push(`> ${r.known_text}`);
  if (r.target_text) L.push(`> *target:* ${r.target_text}`);
  L.push('', `- Opus (gold): ${fmt(r.gold.frames, r.gold.opener)}`);
  if (!agree) L.push(`- Haiku: ${h ? fmt(h.frames, h.opener) : 'not tagged'}`);
  if (r.gold.note) L.push(`- Note: ${r.gold.note}`);
  L.push('');
}
process.stdout.write(L.join('\n'));

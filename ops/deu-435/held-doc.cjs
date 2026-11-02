#!/usr/bin/env node
'use strict';
// node ops/deu-435/held-doc.cjs [check-log.json] > held.md
// Job #435: the held items as one document, in two parts — questions for a native German speaker (Deborah), grouped by
// pattern, and LEGO/structure calls for Kai (including fixes the tool's checks refused and LEGO/seed proposals the parent did not apply).
const fs = require('fs');
const D = require('../../tools/course-optimization/deu-mismatch-pass-435-2026-10-29.data.cjs');
const check = process.argv[2] ? JSON.parse(fs.readFileSync(process.argv[2], 'utf8')) : null;
const KAI = new Set(['lego-gloss', 'lego-structure', 'template', 'register', 'consistency', 'k45', 'en-calque-lego', 'demonstrative', 'his-der', 'asked-wollte-wissen', 'zut-should', 'just-yesterday']);
const TITLE = {
  naturalness: 'Is this natural German?', 'word-order': 'Word order', 'de-grammar': 'German grammar', mismatch: 'English and German say different things — which German?',
  'which-side': 'Which side should change?', 'verb-final-main-clause': 'Verb at the end of a main clause', 'untaught-form': 'The right German needs a form not yet taught',
  'adverb-last': 'Adverb at the end', tense: 'Tense', 'de-dropped': 'German missing a word', vorhin: '"vorhin" for "before"',
  'lego-gloss': 'LEGO English (gloss) that makes the phrases unnatural', 'lego-structure': 'LEGO cut / basket does not drill its LEGO', template: 'Template-generated baskets',
  register: 'Formal register (Sie) without sir/madam', consistency: 'Two Germans for one English across the course', k45: 'K45 (konnte without a past marker)',
  'en-calque-lego': 'Calqued English forced by the LEGO', demonstrative: '"that" = der/das vs dies-', 'his-der': '"his" = der/dem (sein- untaught)',
  'asked-wollte-wissen': '"asked me if" = "wollte wissen, ob"', 'zut-should': 'should = sollte / soll', 'just-yesterday': '"just" + "yesterday"',
};
const byPat = new Map();
for (const h of D.HOLDS) { if (!byPat.has(h.pattern)) byPat.set(h.pattern, []); byPat.get(h.pattern).push(h); }
const item = (h) => `- **Seed ${h.seed}** · \`${h.id}\`\n  - EN: ${h.english}\n  - DE now: ${h.german}\n  - Suggestion: ${h.suggestion}\n  - Q: ${h.question}`;
const out = [];
const deb = [...byPat].filter(([p]) => !KAI.has(p)).sort((a, b) => b[1].length - a[1].length);
const kai = [...byPat].filter(([p]) => KAI.has(p)).sort((a, b) => b[1].length - a[1].length);
const nDeb = deb.reduce((s, [, v]) => s + v.length, 0), nKai = kai.reduce((s, [, v]) => s + v.length, 0);
out.push(`# deu_for_eng — held items from the full English↔German read (job #435, 29 Oct)\n`);
out.push(`Every seed, LEGO and phrase of deu_for_eng (668 seeds) was read. Clear-cut mismatches were fixed in the course. These are the items that were NOT changed, because they need a native speaker's judgement (Part A, ${nDeb} items) or a LEGO/methodology call (Part B, ${nKai} items${check ? ` + ${check.skipped.length} fixes the checks refused` : ''}${D.REJECTED_LEGO_SEED.length ? ` + ${D.REJECTED_LEGO_SEED.length} LEGO/seed proposals not applied` : ''}). Within each group, items are in seed order. "Suggestion" gives the candidate wording; the question says what is being asked.\n`);
out.push(`## Part A — for a native German speaker (${nDeb})\n`);
for (const [p, v] of deb) { out.push(`### ${TITLE[p] || p} (${v.length})\n`); for (const h of v.sort((a, b) => a.seed - b.seed)) out.push(item(h)); out.push(''); }
out.push(`## Part B — LEGO and methodology calls for Kai (${nKai})\n`);
for (const [p, v] of kai) { out.push(`### ${TITLE[p] || p} (${v.length})\n`); for (const h of v.sort((a, b) => a.seed - b.seed)) out.push(item(h)); out.push(''); }
if (D.REJECTED_LEGO_SEED.length) {
  out.push(`### LEGO / seed proposals from the readers that were not applied (${D.REJECTED_LEGO_SEED.length})\n`);
  for (const [id, cls, now, fix, why] of D.REJECTED_LEGO_SEED) out.push(`- \`${id}\` · ${now[0]} | ${now[1]}${fix && (fix[0] || fix[1]) ? `\n  - proposed: ${fix[0] ?? '='} | ${fix[1] ?? '='}` : ''}\n  - ${why}`);
  out.push('');
}
if (check && check.skipped.length) {
  out.push(`### Fixes the checks refused (${check.skipped.length}) — the LEGO's own English forces the wording\n`);
  for (const s of check.skipped) out.push(`- \`${s.id}\`${s.from ? ` · ${s.from[0]} | ${s.from[1]}${s.to ? `\n  - wanted: ${s.to[0]} | ${s.to[1]}` : ''}` : ''}\n  - refused: ${s.why}`);
}
process.stdout.write(out.join('\n') + '\n');

#!/usr/bin/env node
/**
 * Renders docs/frame-layer/frame-codex.md from frame-codex.json, so the human
 * page and the definitions the model reads can never drift apart.
 * Usage: node tools/frame-layer/render-codex-md.cjs
 */
const fs = require('fs');
const path = require('path');
const C = require('./frame-codex.json');

const L = [`# Frame codex (${C.version})`, '',
  `> Generated from \`tools/frame-layer/frame-codex.json\` by \`render-codex-md.cjs\`. Edit the JSON, never this page. The tagger (\`frame-tagger.cjs\`) gives the JSON to a Haiku-family model; nothing classifies frames with a regex (r-2026-10-07-never-use-regex-to-classify-language).`, '',
  C.purpose, '', '## General rules', '', ...C.general_rules.map(r => `- ${r}`), '',
  '## Known side in a language other than English', '', ...C.non_english_known_side.map(r => `- ${r}`), '',
  '## Output the model gives', '', C.output, ''];
for (const f of C.frames) {
  L.push(`## ${f.id} ${f.name}`, '', `Shape: \`${f.shape}\``, '', f.definition, '', '**Fires:**', '', ...f.positives.map(p => `- ${p}`), '',
    '**Does not fire:**', '', ...f.near_misses.map(n => `- ${n.text} — ${n.why}`), '');
  if (f.boundary?.length) L.push('**Boundary:**', '', ...f.boundary.map(b => `- ${b}`), '');
  if (f.other_languages) L.push(`**Other known languages:** ${f.other_languages}`, '');
}
const out = path.join(__dirname, '..', '..', 'docs', 'frame-layer', 'frame-codex.md');
fs.writeFileSync(out, L.join('\n'));
console.log(out);

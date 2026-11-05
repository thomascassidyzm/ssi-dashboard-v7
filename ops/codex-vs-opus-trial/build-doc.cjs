#!/usr/bin/env node
/** Side-by-side doc for the #438·AD trial: reads claude/ and codex/ run files, writes trial.md. */
const fs = require('fs'), path = require('path');
const here = __dirname;
const legos = fs.readFileSync(path.join(here, 'legos.txt'), 'utf8').trim().split('\n').map(l => l.split(/\s+/));
const load = (prov, c, l, s) => { try { return JSON.parse(fs.readFileSync(path.join(here, prov, `v4-${c}-${s}-${s}-${l}.json`), 'utf8')); } catch { return null; } };
const gateKey = (r) => r.replace(/"[^"]*"/g, '…').replace(/:.*$/, '').replace(/\(.*$/, '').trim().slice(0, 60);
const esc = (s) => String(s || '').replace(/\|/g, '\\|');
const roleOf = (k) => k.phrase_role || k.role;
function metrics(o) {
  if (!o) return null;
  const calls = o.calls || [];
  const sum = (k) => calls.reduce((a, c) => a + (c[k] || 0), 0);
  const reasons = {};
  for (const r of o.rejected || []) for (const x of r.reasons || []) reasons[gateKey(x)] = (reasons[gateKey(x)] || 0) + 1;
  const kept = o.kept || [];
  return { fp: o.first_pass, retries: Math.max(0, calls.length - 1),
    b: kept.filter(k => roleOf(k) === 'build').length, u: kept.filter(k => roleOf(k) === 'use').length,
    floorOk: (o.floors || []).every(f => f.ok), frames: o.score ? `${o.score.used}/${o.score.available}` : '–',
    tokens: sum('total'), cost: sum('cost_usd'), s: Math.round(sum('ms') / 1000), model: (calls[0] || {}).model, reasons };
}
const NAME = { claude: 'Opus', codex: 'Codex' };
const rows = [], body = [];
const tot = { claude: { t: 0, c: 0, s: 0, fpk: 0, fpc: 0, r: 0 }, codex: { t: 0, c: 0, s: 0, fpk: 0, fpc: 0, r: 0 } };
const allReasons = { claude: {}, codex: {} };
for (const [c, l, s] of legos) {
  const o = { claude: load('claude', c, l, s), codex: load('codex', c, l, s) };
  const lego = ((o.claude || o.codex || {}).floors || [])[0]?.lego || {};
  for (const p of ['claude', 'codex']) {
    const m = metrics(o[p]);
    if (!m) { rows.push(`| ${c.slice(0, 3)} ${l} | ${NAME[p]} | not run | | | | | | |`); continue; }
    const T = tot[p]; T.t += m.tokens; T.c += m.cost; T.s += m.s; T.fpk += m.fp?.kept || 0; T.fpc += m.fp?.candidates || 0; T.r += m.retries;
    for (const [k, v] of Object.entries(m.reasons)) allReasons[p][k] = (allReasons[p][k] || 0) + v;
    rows.push(`| ${c.slice(0, 3)} ${l} | ${NAME[p]} | ${m.fp ? `${m.fp.kept}/${m.fp.candidates}` : '–'} | ${m.retries} | ${m.b}+${m.u}${m.floorOk ? '' : ' ⚠ below floor'} | ${m.frames} | ${m.tokens.toLocaleString()} | ${p === 'claude' ? '$' + m.cost.toFixed(2) : 'credits'} | ${m.s}s |`);
  }
  body.push(`\n## ${c} ${l} — "${lego.known_text}" = ${lego.target_text}\n`);
  for (const p of ['claude', 'codex']) {
    const x = o[p];
    body.push(`\n**${p === 'claude' ? 'Opus' : `Codex (${metrics(x)?.model || '?'})`}**\n`);
    if (!x) { body.push('_not run_\n'); continue; }
    body.push('| role | English | target |\n|---|---|---|');
    for (const k of x.kept || []) body.push(`| ${roleOf(k) === 'build' ? 'B' : 'U'} | ${esc(k.known_text)} | ${esc(k.target_text)} |`);
    if ((x.rejected || []).length) {
      body.push(`\n<details><summary>${x.rejected.length} rejected by the gates</summary>\n`);
      for (const r of x.rejected) body.push(`- pass ${r.pass || 1} · ${esc(r.known || r.known_text)} = ${esc(r.target || r.target_text)} — ${esc((r.reasons || []).join('; '))}`);
      body.push('\n</details>');
    }
  }
}
const fmtR = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ×${v}`).join('; ') || 'none';
const md = `# Popty v4 phrase baskets — Opus vs Codex, 10 LEGOs

Both models got the same prompt, the same admitted list, the same gates (#435's strict admitted-list gates plus the course builder's own v2/v3 gates) and the same one-retry rule, through \`generate-v4 --provider\`. LEGOs were picked with fixed seed 438: 5 from jpn_for_eng and 5 from kor_for_eng, all new LEGOs at seed 21 or later. Nothing was written to the database.

**Read the baskets, not the table.** The numbers say which baskets cleared the gates. They do not say which sounds right.

| LEGO | model | 1st-pass kept/candidates | retries | kept B+U | frames used/available | tokens | cost | wall |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

**Totals.** Opus: ${tot.claude.fpk}/${tot.claude.fpc} kept first pass, ${tot.claude.r} retries, ${tot.claude.t.toLocaleString()} tokens, $${tot.claude.c.toFixed(2)}, ${tot.claude.s}s. Codex: ${tot.codex.fpk}/${tot.codex.fpc} kept first pass, ${tot.codex.r} retries, ${tot.codex.t.toLocaleString()} tokens, cost in credits (the CLI reports no price), ${tot.codex.s}s.

**Rejections by gate.** Opus: ${fmtR(allReasons.claude)}. Codex: ${fmtR(allReasons.codex)}.

How the runs were set up:
- Opus ran at effort low through \`claude --print\`. Codex ran its account default (gpt-6.1-sol) at effort low through \`codex exec\`, read-only, from an empty folder.
- Codex's token count includes about 12k tokens of its own built-in preamble, which can't be removed.
- Course data came from Popty's read-only script-view route, because the phrase-v4 key is refused at the admin door.
- "Frames used/available" is the frame tagger's count of distinct frames in the kept basket.
${body.join('\n')}
`;
fs.writeFileSync(path.join(here, 'trial.md'), md);
console.log('wrote', path.join(here, 'trial.md'), md.length, 'chars');

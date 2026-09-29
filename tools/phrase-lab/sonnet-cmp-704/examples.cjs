// Job #704: render the ten side-by-side examples (Opus vs Sonnet-medium) with the blind judge's flags.
const fs = require('fs'); const E = process.argv[2];
const rows = JSON.parse(fs.readFileSync(`${E}/analysis/rows.json`)); const V = {};
for (const l of fs.readFileSync(`${E}/judge/verdicts.jsonl`, 'utf8').trim().split('\n')) { const v = JSON.parse(l); V[v.key] = v; }
const PICK = [['ita', 'S0142L03', 'Sonnet worse'], ['ita', 'S0501L02', 'Sonnet worse'], ['ita', 'S0198L01', 'both flagged, Sonnet much more'], ['fra', 'S0322L02', 'Sonnet worse'], ['deu', 'S0063L02', 'Sonnet worse'], ['deu', 'S0511L06', 'Opus worse'], ['spa', 'S0121L03', 'Opus worse'], ['fra', 'S0607L02', 'Opus worse'], ['spa', 'S0193L01', 'both clean'], ['deu', 'S0350L03', 'both clean']];
const out = [];
PICK.forEach(([lang, key, why], i) => {
  const r = rows.find((x) => x.lang === lang && x.key === key);
  const o = JSON.parse(fs.readFileSync(r.opusFile, 'utf8'));
  const s = JSON.parse(fs.readFileSync(`${E}/run/sonnet/${r.course}/${key}.json`, 'utf8'));
  out.push(`### ${i + 1}. ${r.course} ${key} (seed ${r.seed}, band ${r.band}): "${o.legoKnown}" = "${o.legoTarget}" — ${why}`);
  for (const [arm, d] of [['Opus 5.5', o], ['Sonnet 5.5 medium', s]]) {
    const id = r.arms[arm.startsWith('Opus') ? 'opus' : 'sonnet'].id; const v = V[id];
    const ph = [...(d.build || []).map((p) => ({ ...p, role: 'B' })), ...(d.use || []).map((p) => ({ ...p, role: 'U' }))];
    const fl = new Map((v?.flags || []).map((f) => [f.i, f]));
    const idx = ph.map((_, k) => k); const show = [...idx.filter((k) => fl.has(k)).slice(0, 3), ...idx.filter((k) => !fl.has(k)).slice(0, 3 - Math.min(3, fl.size) + 1)];
    out.push(`**${arm}** — judge flagged ${v ? v.flagged : 'n/a'} of ${ph.length}` + (v?.overused?.length ? `; over-used: ${v.overused.join(', ')}` : ''));
    for (const k of show.sort((a, b) => a - b)) { const p = ph[k], f = fl.get(k); out.push(`- ${p.role}: ${p.known} → ${p.target}` + (f ? `  ⚑ _${f.en_ok === false ? 'English' : ''}${f.en_ok === false && f.tl_ok === false ? '+' : ''}${f.tl_ok === false ? r.lang.toUpperCase() : ''}: ${f.why}_` : '')); }
    out.push('');
  }
});
console.log(out.join('\n'));

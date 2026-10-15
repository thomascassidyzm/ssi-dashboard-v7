// Merge the 12 readers' verdicts with the inputs and the wiring census. Reads files only; no database.
const fs = require('fs'), path = require('path');
const D = __dirname;
const { all } = JSON.parse(fs.readFileSync(path.join(D, 'state/all.json'), 'utf8'));
const wiring = JSON.parse(fs.readFileSync(path.join(D, 'state/wiring.json'), 'utf8'));
const exp = JSON.parse(fs.readFileSync(path.join(D, 'state/exp.json'), 'utf8'));
const byN = new Map(all.map(e => [e.n, e]));
const V = new Map(); const bad = [];
for (const f of fs.readdirSync(path.join(D, 'out')).filter(f => f.endsWith('.jsonl')).sort()) {
  fs.readFileSync(path.join(D, 'out', f), 'utf8').split('\n').filter(Boolean).forEach((l, i) => {
    try { const v = JSON.parse(l); if (V.has(v.n)) bad.push(`dup n ${v.n}`); V.set(v.n, v); } catch (e) { bad.push(`${f}:${i + 1} ${e.message}`); }
  });
}
const missing = all.filter(e => !V.has(e.n)).map(e => e.n);
console.log('verdicts', V.size, 'inputs', all.length, 'missing', missing.length, 'bad', bad.length, bad.slice(0, 5));
const rows = all.map(e => ({ ...e, v: V.get(e.n) || { v: 'MISSING' } }));
const tally = {}; rows.forEach(r => tally[r.v.v] = (tally[r.v.v] || 0) + 1); console.log(tally);
const played = r => r.occ.some(o => o.kind !== 'component' && o.sn <= 300);
const problems = rows.filter(r => !['none', 'ok'].includes(r.v.v));
console.log('problems', problems.length, 'played', problems.filter(played).length);
const byV = {}; problems.forEach(r => { const k = r.v.v + (played(r) ? '' : ' (unplayed only)'); byV[k] = (byV[k] || 0) + 1; }); console.log(byV);
// consistency: stored rows the reader marked ok though they contain थोड़ा next to a feminine form
const thoda = rows.filter(r => r.stored && r.stored.f && /थोड़ा थकी/.test(r.stored.f));
console.log('stored f with थोड़ा थकी:', thoda.map(r => `${r.n}:${r.v.v}`).join(' '));
// expansions vs reading: every stored row must have been judged ok/wrong/not-needed
const storedJudged = rows.filter(r => r.stored); const sv = {}; storedJudged.forEach(r => sv[r.v.v] = (sv[r.v.v] || 0) + 1); console.log('stored rows judged:', storedJudged.length, sv);
const notes = rows.filter(r => r.v.note); console.log('notes', notes.length, 'notes on played', notes.filter(played).length);
fs.writeFileSync(path.join(D, 'state/merged.json'), JSON.stringify({ rows: rows.map(r => ({ n: r.n, t: r.t, occ: r.occ.map(o => [o.kind, o.id.replace('hin_for_eng:', ''), o.sn, o.en, o.a1 ? 1 : 0]), stored: r.stored, v: r.v })), wiring }, null, 0));

// AXIS 3 + 4 — family census of the strips and of the 519 "keep, no edit needed" rows.
const fs = require('fs');
const plan = require('./adj-plan.json');
const parenOf = s => { const m = /[（(]([^）)]*)[）)]/.exec(s || ''); return m ? m[1] : null; };

function census(rows, label) {
  const fam = new Map();
  for (const r of rows) {
    const k = parenOf(r.old_known_text) || '∅';
    if (!fam.has(k)) fam.set(k, []);
    fam.get(k).push(r);
  }
  console.log(`\n########## ${label} — ${rows.length} rows, ${fam.size} distinct parentheticals`);
  const out = [...fam.entries()].sort((a, b) => b[1].length - a[1].length);
  for (const [k, rs] of out) {
    const clips = rs.filter(r => r.has_clip).length;
    const kt = rs.filter(r => r.surface === 'known_text').length;
    const courses = [...new Set(rs.map(r => r.course_code))].join(',');
    const ex = rs[0];
    console.log(`${String(rs.length).padStart(4)}  「${k}」  [known_text ${kt}, clips ${clips}] (${courses})   e.g. 「${ex.old_known_text}」 -> ${ex.target_text}`);
  }
  return out;
}

const strips = plan.filter(p => p.action === 'strip');
const keeps = plan.filter(p => p.hold_kind === 'keep_content_no_edit_needed');

const stripFam = census(strips, 'AXIS 3: THE 465 STRIPS');
const keepFam = census(keeps, 'AXIS 4: THE 519 KEEPS');

// the specific families the lead named
const WATCH = ['希望', '状態', '強調', '理由', '条件', '期待', '比較', '本当', '一般的に', '時間表現', '疑問', '否定', '肯定', '丁寧', '口語', '改まった'];
console.log('\n\n########## WATCHLIST — every plan row whose parenthetical contains one of the named families');
for (const w of WATCH) {
  const hits = plan.filter(p => (parenOf(p.old_known_text) || '').includes(w));
  if (!hits.length) { console.log(`\n--- ${w}: none`); continue; }
  const byAction = {}; for (const h of hits) byAction[h.action] = (byAction[h.action] || 0) + 1;
  console.log(`\n--- ${w}: ${hits.length} rows ${JSON.stringify(byAction)}`);
  const seen = new Set();
  for (const h of hits) {
    const key = h.course_code + h.old_known_text + h.target_text;
    if (seen.has(key)) continue; seen.add(key);
    console.log(`    [${h.action}] ${h.course_code} s${h.seed_number} ${h.surface} 「${h.old_known_text}」 -> 「${h.new_known_text}」  target=${h.target_text}  clip=${h.has_clip}`);
  }
}

fs.writeFileSync(__dirname + '/jrefute-a34-derived.json', JSON.stringify({
  stripFamilies: stripFam.map(([k, v]) => ({ paren: k, n: v.length, rows: v.map(r => ({ u: r.row_uuid, s: r.surface, c: r.course_code, seed: r.seed_number, old: r.old_known_text, t: r.target_text, clip: r.has_clip })) })),
  keepFamilies: keepFam.map(([k, v]) => ({ paren: k, n: v.length, rows: v.map(r => ({ u: r.row_uuid, s: r.surface, c: r.course_code, seed: r.seed_number, old: r.old_known_text, t: r.target_text, clip: r.has_clip })) })),
}, null, 1));

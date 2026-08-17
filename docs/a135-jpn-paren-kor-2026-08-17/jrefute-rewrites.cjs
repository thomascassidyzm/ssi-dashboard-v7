// AXIS 1 — the 213 rewrites. Census, not a sample.
// (a) what Japanese does each rewrite newly introduce,
// (b) is that Japanese already given to the learner at or before this row's seed,
// (c) does the rewrite change which target form the prompt elicits.
const fs = require('fs');
const plan = require('./adj-plan.json');
const corpus = require('./jrefute-corpus.json');

const SERVED = new Set(['build', 'use', 'practice', 'eternal_eligible']);
const served = corpus.filter(r => r.tbl === 'course_legos' || SERVED.has(r.phrase_role));

const rewrites = plan.filter(p => p.action === 'rewrite');
console.log('rewrite rows in plan:', rewrites.length, '(census — every one checked)');
const bySurface = {}; for (const r of rewrites) bySurface[r.surface] = (bySurface[r.surface] || 0) + 1;
console.log('by surface:', bySurface);

const parenOf = s => { const m = /[（(]([^）)]*)[）)]/.exec(s || ''); return m ? m[1] : null; };

// families
const fam = new Map();
for (const r of rewrites) {
  const k = (parenOf(r.old_known_text) || '∅') + '  ->  ' + (parenOf(r.new_known_text) || '∅');
  if (!fam.has(k)) fam.set(k, []);
  fam.get(k).push(r);
}
console.log('\n--- rewrite families (old paren -> new paren) ---');
for (const [k, rows] of [...fam.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const courses = [...new Set(rows.map(r => r.course_code))].join(',');
  console.log(String(rows.length).padStart(4) + '  ' + k + '   [' + courses + ']');
}

// DEBUT INDEX: earliest served seed per course at which a literal string appears in known_text
const debutCache = new Map();
function debutSeed(course, needle) {
  const k = course + '|' + needle;
  if (debutCache.has(k)) return debutCache.get(k);
  let best = null, where = null;
  for (const r of served) {
    if (r.course_code !== course) continue;
    if (!r.known_text || !r.known_text.includes(needle)) continue;
    if (best === null || r.seed_number < best) { best = r.seed_number; where = r; }
  }
  const v = best === null ? null : { seed: best, example: where.known_text, tbl: where.tbl, role: where.phrase_role };
  debutCache.set(k, v);
  return v;
}

// what the rewrite newly introduces: the new paren content, and any non-paren text added
const findings = [];
for (const r of rewrites) {
  const np = parenOf(r.new_known_text);
  const op = parenOf(r.old_known_text);
  const stem = s => (s || '').replace(/[（(][^）)]*[）)]/g, '');
  const stemChanged = stem(r.old_known_text) !== stem(r.new_known_text);
  const checks = [];
  if (np) {
    // check the marker as a whole, and each ・-separated alternative
    const parts = [np, ...np.split(/[・,、]/).map(s => s.trim()).filter(s => s && s !== np)];
    for (const part of parts) {
      const d = debutSeed(r.course_code, part);
      checks.push({ needle: part, debut: d ? d.seed : null, example: d ? d.example : null });
    }
  }
  const late = checks.filter(c => c.debut === null || c.debut > r.seed_number);
  findings.push({
    row_uuid: r.row_uuid, surface: r.surface, course: r.course_code, seed: r.seed_number,
    row_key: r.row_key, old: r.old_known_text, new: r.new_known_text, target: r.target_text,
    old_paren: op, new_paren: np, stem_changed: stemChanged, checks, late,
    has_clip: r.has_clip,
  });
}

const lateOnes = findings.filter(f => f.late.length);
console.log('\n=== (b) CONTROLLED-LANGUAGE DEBUT ===');
console.log('rewrites whose new Japanese marker does NOT appear in any served known_text at or before this row\'s seed:', lateOnes.length, '/', rewrites.length);
for (const f of lateOnes) {
  console.log(`  ${f.course} seed ${f.seed} ${f.row_key} 「${f.old}」 -> 「${f.new}」 (${f.target})`);
  for (const c of f.late) console.log(`      marker 「${c.needle}」 debuts at seed ${c.debut === null ? 'NEVER (appears nowhere in this course)' : c.debut}`);
}

// marker debut table per course
console.log('\n--- debut seed of each new marker, per course ---');
const markers = [...new Set(findings.map(f => f.new_paren).filter(Boolean))];
const courses = [...new Set(findings.map(f => f.course))].sort();
for (const c of courses) {
  const used = [...new Set(findings.filter(f => f.course === c && f.new_paren).map(f => f.new_paren))];
  for (const m of used) {
    const d = debutSeed(c, m);
    const rows = findings.filter(f => f.course === c && f.new_paren === m);
    const earliestUse = Math.min(...rows.map(r => r.seed));
    const flag = (d === null || d.seed > earliestUse) ? '   <-- USED BEFORE IT IS TAUGHT' : '';
    console.log(`  ${c}  「${m}」  debut ${d === null ? 'NEVER' : 'seed ' + d.seed}   first used by a rewrite at seed ${earliestUse}   (${rows.length} rows)${flag}`);
  }
}

console.log('\n=== (c) STEM CHANGED (the rewrite altered the Japanese outside the parenthesis) ===');
const stemChanged = findings.filter(f => f.stem_changed);
console.log('count:', stemChanged.length);
for (const f of stemChanged.slice(0, 60)) console.log(`  ${f.course} s${f.seed} ${f.row_key} 「${f.old}」 -> 「${f.new}」  (${f.target})`);
if (stemChanged.length > 60) console.log('  ... +' + (stemChanged.length - 60));

fs.writeFileSync('./jrefute-a1-derived.json', JSON.stringify({ findings, lateOnes, families: [...fam.entries()].map(([k, v]) => ({ family: k, n: v.length })) }, null, 1));

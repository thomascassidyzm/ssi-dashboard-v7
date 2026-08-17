// AXIS 7b — the fourth surface: course_practice_phrases.decomposition[].known
// is a COPY of the lego's known_text at generation time, and the learner reads it
// under the target words on the card. The plan never touches it.
const fs = require('fs');
const { execFileSync } = require('child_process');
const plan = require('./adj-plan.json');
const Q = __dirname + '/jrefute-q.cjs';
const q = sql => JSON.parse(execFileSync('node', [Q, sql], { env: { ...process.env, JSON: '1' }, maxBuffer: 1 << 28 }).toString());

// lego_id -> planned edit, for every lego row whose known_text this plan changes
const legoEdits = plan.filter(p => p.surface === 'known_text' && p.table === 'course_legos' && ['strip', 'rewrite', 'partial'].includes(p.action));
const editByKey = new Map(legoEdits.map(p => [p.course_code + '|' + p.row_key, p]));
console.log('lego known_text edits in plan:', legoEdits.length);

const rows = q(`select course_code, id, seed_number, decomposition::text as d
  from course_practice_phrases
 where course_code like '%_for_jpn' and decomposition is not null`);
console.log('phrase rows with a decomposition:', rows.length);

let entriesTotal = 0, entriesWithParen = 0;
let driftRows = 0, driftEntries = 0;
const orphanAnnotated = new Map(); // annotated gloss whose lego is NOT edited by the plan
const driftSample = [];
const seenDriftRow = new Set();

for (const r of rows) {
  let d; try { d = JSON.parse(r.d); } catch { continue; }
  if (!Array.isArray(d)) continue;
  for (const seg of d) {
    const known = seg && seg.known;
    if (!known) continue;
    entriesTotal++;
    const hasParen = /[（(][^）)]*[）)]/.test(known);
    if (hasParen) entriesWithParen++;
    const e = seg.legoId ? editByKey.get(r.course_code + '|' + seg.legoId) : null;
    if (e && known === e.old_known_text && e.old_known_text !== e.new_known_text) {
      driftEntries++;
      if (!seenDriftRow.has(r.id)) { seenDriftRow.add(r.id); driftRows++; }
      if (driftSample.length < 25) driftSample.push({
        phrase: r.id, seed: r.seed_number, legoId: seg.legoId,
        card_will_show_gloss: known, but_lego_will_say: e.new_known_text, target: seg.target,
      });
    } else if (hasParen) {
      const k = r.course_code + ' ' + known;
      orphanAnnotated.set(k, (orphanAnnotated.get(k) || 0) + 1);
    }
  }
}

console.log('\ndecomposition segments total:', entriesTotal, '| carrying a parenthetical:', entriesWithParen);
console.log('DRIFT the plan would INTRODUCE — gloss segments still showing the old annotated text after the lego is edited:');
console.log('   ', driftEntries, 'segments across', driftRows, 'phrase rows');
console.log('\nANNOTATED gloss segments the plan leaves alone entirely (lego not edited or text differs):');
console.log('   ', [...orphanAnnotated.values()].reduce((a, b) => a + b, 0), 'segments,', orphanAnnotated.size, 'distinct strings');
const top = [...orphanAnnotated.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [k, n] of top) console.log('    ' + String(n).padStart(5) + '  ' + k);

console.log('\n--- sample of the drift (what the learner would see vs what the prompt now says) ---');
for (const s of driftSample) console.log('   ', JSON.stringify(s));

fs.writeFileSync('./jrefute-a7-decomp.json', JSON.stringify({
  entriesTotal, entriesWithParen, driftEntries, driftRows,
  orphanAnnotatedTotal: [...orphanAnnotated.values()].reduce((a, b) => a + b, 0),
  orphanTop: top, driftSample,
}, null, 1));

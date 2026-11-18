#!/usr/bin/env node
'use strict';
// node ops/deborah-lens/print-sheet.cjs <dump.json> <fromSeed> <toSeed>            → the READING SHEET for one reader's slice
// node ops/deborah-lens/print-sheet.cjs <dump.json> --vocab <toSeed>               → every LEGO up to a seed, one per line (grep it)
//
// The 'read like Deborah' pass (cs #785·AI, Kai 18 Nov 2026). A reader reads a course IN ORDER, as the learner meets it:
// seed → each LEGO (its intro line, then its basket). This prints exactly that, plus two MECHANICAL HINTS per phrase so
// the learner hat does not depend on the reader remembering 400 seeds of vocabulary:
//   UNSEEN: <word>          the target word (exact form) is in no LEGO or component at or before this LEGO in running order
//   LATER-LEGO: <id> "<x>"  the phrase contains the whole target of a NEW LEGO taught LATER (same seed or the next 3 seeds)
// A hint is a prompt to look, never a verdict: canon P2/K29 let a phrase use any word taught earlier, even inside a chunk.
// Dump = tools/course-optimization/course-dump-readonly-2026-10-14.cjs <course> <out.json> (read-only, by course_code).
const fs = require('fs');
const args = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(args[0], 'utf8'));
const words = (t) => String(t || '').toLowerCase().replace(/[.,!?;:"„“”»«()…]/g, ' ').replace(/[‘’]/g, "'").split(/\s+/).filter(Boolean);
const sid = (id) => String(id).split(':').pop();
const legos = d.legos.slice().sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
const introBy = new Map((d.intros || []).map((i) => [i.lego_id, String(i.text || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()]));
const comps = (l) => (Array.isArray(l.components) ? l.components : []);

if (args[1] === '--vocab') {
  const to = +args[2];
  for (const l of legos.filter((x) => x.seed_number <= to)) {
    const c = comps(l).length ? `  {${comps(l).map((x) => `${x.known}=${x.target}`).join('; ')}}` : '';
    console.log(`${l.lego_id} r${l.round_index ?? '-'} ${l.is_new ? 'NEW' : 'not-new'} | ${l.known_text} | ${l.target_text}${c}`);
  }
  process.exit(0);
}

const from = +args[1], to = +args[2];
if (!from || !to) throw new Error('usage: <dump.json> <fromSeed> <toSeed>  |  <dump.json> --vocab <toSeed>');
const seen = new Set();
const n = { seeds: 0, legos: 0, newLegos: 0, phrases: 0 };
const bySeed = new Map();
for (const l of legos) { if (!bySeed.has(l.seed_number)) bySeed.set(l.seed_number, []); bySeed.get(l.seed_number).push(l); }
const containsSeq = (hay, needle) => { for (let i = 0; i + needle.length <= hay.length; i++) { let ok = true; for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) { ok = false; break; } if (ok) return true; } return false; };

for (const s of d.seeds.slice().sort((a, b) => a.seed_number - b.seed_number)) {
  const ls = bySeed.get(s.seed_number) || [];
  const inRange = s.seed_number >= from && s.seed_number <= to;
  if (inRange) { n.seeds++; console.log(`\n=== SEED ${s.seed_number} | ${s.known_text} | ${s.target_text}`); }
  for (const l of ls) {
    for (const w of words(l.target_text)) seen.add(w);
    for (const c of comps(l)) for (const w of words(c.target)) seen.add(w);
    if (!inRange) continue;
    n.legos++; if (l.is_new) n.newLegos++;
    const later = legos.filter((x) => x.is_new && ((x.seed_number === l.seed_number && x.lego_index > l.lego_index) || (x.seed_number > l.seed_number && x.seed_number <= l.seed_number + 3)));
    const c = comps(l).length ? `  {${comps(l).map((x) => `${x.known}=${x.target}`).join('; ')}}` : '';
    console.log(`\n  -- ${l.lego_id} [${l.is_new ? `NEW, round ${l.round_index ?? '?'}` : 'not-new: no intro, basket NOT played'}] ${l.known_text} | ${l.target_text}${c}`);
    if (l.is_new) console.log(`     INTRO: ${introBy.get(l.lego_id) || '(no intro text on record)'}`);
    for (const p of d.phrases.filter((x) => x.seed_number === l.seed_number && x.lego_index === l.lego_index).sort((a, b) => a.position - b.position)) {
      if (p.phrase_role === 'component') continue; // tiles, shown in {} above, never played as phrases
      n.phrases++;
      const pw = words(p.target_text);
      const hints = [];
      const unseen = [...new Set(pw.filter((w) => !seen.has(w) && !/^\d+$/.test(w)))];
      if (unseen.length) hints.push(`UNSEEN: ${unseen.join(', ')}`);
      const lw = words(l.target_text);
      for (const x of later) { const xw = words(x.target_text); if (xw.length && containsSeq(pw, xw) && !containsSeq(lw, xw) && xw.some((w) => !seenBefore(w, x))) hints.push(`LATER-LEGO: ${x.lego_id} "${x.target_text}"`); }
      console.log(`     ${sid(p.id)} ${p.phrase_role}: ${p.known_text} | ${p.target_text}${hints.length ? `   ⚠ ${hints.join(' · ')}` : ''}`);
    }
  }
}
// a later LEGO only counts as a forward reference if it brings at least one word not already seen at this point
function seenBefore(w) { return seen.has(w); }
console.log(`\nREAD COUNT seeds ${from}-${to}: ${n.seeds} seeds, ${n.legos} LEGOs (${n.newLegos} new), ${n.phrases} phrases`);

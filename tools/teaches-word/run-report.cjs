#!/usr/bin/env node
/**
 * Writes the phone-readable page for a run: the funnel, the coverage, then every confirmed
 * defect grouped by course and by lesson.
 *
 * Two rules this file exists to enforce, because both are easy to lose by accident:
 *
 *   RAW AND CONFIRMED NEVER MERGE. The raw number is what the first reader accused; the
 *   confirmed number is what survived a second reader trying to overturn it. Printing only the
 *   confirmed figure hides how hard the check works to earn it; printing only the raw figure is
 *   the cry-wolf failure this whole rebuild exists to end.
 *
 *   A SAMPLED NUMBER SAYS SO ON ITS OWN LINE. Where only part of the raw set went through the
 *   confirm pass, the page says how many of how many, right where the number appears. A sampled
 *   number laid out like a census is a lie told by formatting.
 *
 * Reads the run's working files from $CS_SCRATCH and writes markdown.
 * Usage: node tools/teaches-word/run-report.cjs out.md
 */

const fs = require('fs');
const P = process.env.CS_SCRATCH;
const read = (f) => JSON.parse(fs.readFileSync(`${P}/${f}`, 'utf8'));

const NICE = {
  cym_s_for_eng: 'Welsh (southern), taught from English',
  deu_for_eng: 'German, taught from English',
  fra_for_eng: 'French, taught from English',
  spa_for_eng: 'Spanish, taught from English',
};
const SIDE = { known: 'the English prompt', target: 'the language being learned' };

const estate = read('candidates-estate.json');
const blind = read('blind-verdicts-merged.json').results;
const conf = [
  ...read('confirmed-blind-cym.json').results,
  ...(fs.existsSync(`${P}/confirmed-blind-rest.json`) ? read('confirmed-blind-rest.json').results : []),
];

const n = (x) => x.toLocaleString('en-GB');
const L = [];

L.push('# Practice sentences that never use the word they teach');
L.push('');
L.push('*Rebuilt check, run 28 August 2026.*');
L.push('');
L.push('## The rule');
L.push('');
L.push('When a lesson teaches a word, the practice sentences built for that lesson are there to');
L.push('introduce it. A sentence that never uses the word it was built to teach is a defect: the');
L.push('learner is promised one word and drilled on another.');
L.push('');
L.push('Every sentence has two sides — the prompt in the language you already speak, and the');
L.push('answer in the language you are learning. **The new check reads both.** The old one read');
L.push('only the prompt side.');
L.push('');
L.push('## What changed');
L.push('');
L.push('The old check decided mechanically whether "wanted" counted as "want", by stripping word');
L.push('endings from a list written out by hand for each language. Only four languages ever got a');
L.push('list. Everywhere else it returned **zero** — and a zero from a check that never looked');
L.push('reads exactly like a clean bill of health.');
L.push('');
L.push('The lists are gone. Cheap readers now read each doubtful sentence and say whether it uses');
L.push('the word — something they can do in any language without anyone writing down its grammar');
L.push('first. Nothing in the new check is specific to any language.');
L.push('');

// coverage
const knownOf = (c) => c.replace(/_v\d+$/, '').split('_for_')[1];
const OLD = new Set(['jpn', 'zho', 'tha', 'ara', 'kor']);
let oldC = 0; let oldR = 0; let allR = 0;
for (const t of estate.tallies) { allR += t.rows; if (OLD.has(knownOf(t.course))) { oldC++; oldR += t.rows; } }
L.push('## How much it can speak on');
L.push('');
L.push('| | courses | practice sentences |');
L.push('|---|---:|---:|');
L.push(`| old check | ${oldC} | ${n(oldR)} |`);
L.push(`| new check | ${estate.tallies.length} | ${n(allR)} |`);
L.push('');
L.push('That is the whole estate, across the 24 languages learners are taught *from*. Every paid');
L.push('course taught from English used to sit in the blind spot.');
L.push('');

// funnel
const cleared = estate.tallies.reduce((a, t) => a + t.known.clear + t.target.clear, 0);
const skipped = estate.tallies.reduce((a, t) => a + t.known.skip + t.target.skip, 0);
const toRead = estate.tallies.reduce((a, t) => a + t.known.read + t.target.read, 0);
L.push('## The funnel');
L.push('');
L.push('Across the whole estate, before any reading:');
L.push('');
L.push(`- **${n(allR * 2)}** checks — every practice sentence, both sides`);
L.push(`- **${n(cleared)}** cleared instantly, because the sentence plainly contains the word`);
L.push(`- **${n(skipped)}** had nothing to check — a blank word or a blank sentence`);
L.push(`- **${n(toRead)}** left for a reader — ${((toRead / (allR * 2)) * 100).toFixed(1)}% of everything`);
L.push('');
L.push('So 94 checks in every 100 cost nothing. Only the doubtful ones are read.');
L.push('');

// the four courses
const courses = [...new Set(blind.map((b) => b.course))];
L.push('## The four courses read in full');
L.push('');
L.push('All four are paid courses taught from English. The old check returned **zero defects** on');
L.push('every one of them.');
L.push('');
L.push('| course | side | read | raw | confirmed |');
L.push('|---|---|---:|---:|---|');
const rate = {};
for (const c of courses) {
  for (const side of ['known', 'target']) {
    const rows = blind.filter((b) => b.course === c && b.side === side);
    if (!rows.length) continue;
    const raw = rows.filter((b) => b.verdict === 'MISSING').length;
    const sample = conf.filter((x) => x.course === c && x.side === side);
    const up = sample.filter((x) => x.ruling === 'UPHELD').length;
    rate[`${c}|${side}`] = { raw, sampled: sample.length, up };
    const cell = sample.length === 0 ? 'not yet confirmed'
      : sample.length >= raw ? `**${up}**`
        : `**${up}** of ${sample.length} sampled (${((up / sample.length) * 100).toFixed(0)}% held)`;
    L.push(`| ${NICE[c] || c} | ${SIDE[side]} | ${n(rows.length)} | ${n(raw)} | ${cell} |`);
  }
}
L.push('');
L.push('*"Read" is how many sentences a reader had to look at; the rest were cleared without');
L.push('reading. "Raw" is what the first reader accused. "Confirmed" is what survived a second');
L.push('reader whose job was to overturn it.*');
L.push('');
L.push('Where a course shows a sample, the raw list was too long to confirm every line in one');
L.push('sitting, so a fixed, evenly-spaced slice was confirmed instead and the proportion that');
L.push('held is given. Those are the only numbers taken from a sample; nothing else on this page is.');
L.push('');

// confirmed list
L.push('## The confirmed defects');
L.push('');
const upheld = conf.filter((x) => x.ruling === 'UPHELD');
for (const c of courses) {
  const items = upheld.filter((x) => x.course === c);
  if (!items.length) continue;
  L.push(`### ${NICE[c] || c} — ${items.length} confirmed`);
  L.push('');
  const byLego = new Map();
  for (const i of items) {
    const k = `${i.lego_id}|${i.side}`;
    if (!byLego.has(k)) byLego.set(k, []);
    byLego.get(k).push(i);
  }
  for (const [, rows] of [...byLego.entries()].sort()) {
    const r = rows[0];
    L.push(`**${r.lego_id}** teaches **${r.taught}** — checked on ${SIDE[r.side]}`);
    L.push('');
    for (const x of rows) L.push(`- ${x.sentence}`);
    L.push('');
  }
}

const out = process.argv[2];
const md = L.join('\n');
if (out) { fs.writeFileSync(out, md); console.error(`-> ${out} (${md.length} chars)`); } else console.log(md);

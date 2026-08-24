// AXIS 7 — presentation clips: what the plan does to them, and what it misses.
const fs = require('fs');
const { execFileSync } = require('child_process');
const plan = require('./adj-plan.json');
const Q = __dirname + '/jrefute-q.cjs';
const q = sql => JSON.parse(execFileSync('node', [Q, sql], { env: { ...process.env, JSON: '1' }, maxBuffer: 1 << 28 }).toString());

const legoEdits = plan.filter(p => p.surface === 'known_text' && p.table === 'course_legos' && ['strip', 'rewrite', 'partial'].includes(p.action));
const phraseEdits = plan.filter(p => p.surface === 'known_text' && p.table === 'course_practice_phrases' && ['strip', 'rewrite', 'partial'].includes(p.action));
console.log('known_text edits: legos', legoEdits.length, '| phrases', phraseEdits.length);

const ids = legoEdits.map(p => `'${p.row_uuid}'`).join(',');
const r1 = q(`select l.course_code, count(*) as edited_legos,
  count(l.presentation_audio_id) as with_presentation_pointer
 from course_legos l where l.id::text in (${ids}) group by 1 order by 1`);
console.log('\n--- presentation pointers the plan DESTROYS (trigger nulls them, and the relink can never match) ---');
console.table(r1);
console.log('TOTAL edited legos carrying a presentation pointer:', r1.reduce((a, b) => a + Number(b.with_presentation_pointer), 0));

// how many presentation clips embed an annotated parenthetical?
const r2 = q(`select course_code,
   count(*) as presentation_clips,
   count(*) filter (where text ~ '[（(][^）)]*[）)]') as with_any_paren
 from course_audio where course_code like '%_for_jpn' and role='presentation' group by 1 order by 1`);
console.log('\n--- presentation clips carrying a parenthetical in their SPOKEN text ---');
console.table(r2);
console.log('TOTAL presentation clips:', r2.reduce((a, b) => a + Number(b.presentation_clips), 0),
  '| carrying a paren:', r2.reduce((a, b) => a + Number(b.with_any_paren), 0));

// of those, how many are pointed at by a row this plan edits (-> stale AND unlinked)
const r3 = q(`select count(*) as annotated_pres_clips_on_an_edited_row
 from course_legos l join course_audio a on a.id::text = l.presentation_audio_id
 where l.id::text in (${ids}) and a.text ~ '[（(][^）)]*[）)]'`);
console.log('\nannotated presentation clips sitting on a row this plan EDITS:', r3[0]);

// phrase-side presentation pointers (trigger leaves these alone -> stale, not silent)
const pids = phraseEdits.map(p => `'${p.row_uuid}'`).join(',');
const r4 = q(`select count(*) as edited_phrases, count(presentation_audio_id) as with_presentation_pointer
 from course_practice_phrases where id in (${pids})`);
console.log('phrase-side edits carrying a presentation pointer (trigger leaves these = STALE):', r4[0]);

// the fourth surface: annotated parens living in decomposition / display_tiling / known_gloss_segments
const r5 = q(`select 'phrase.decomposition' as col, course_code, count(*) as rows_with_paren from course_practice_phrases
   where course_code like '%_for_jpn' and decomposition::text ~ '[（(][^）)]*[）)]' group by 1,2
 union all select 'phrase.display_tiling', course_code, count(*) from course_practice_phrases
   where course_code like '%_for_jpn' and display_tiling::text ~ '[（(][^）)]*[）)]' group by 1,2
 union all select 'phrase.known_gloss_segments', course_code, count(*) from course_practice_phrases
   where course_code like '%_for_jpn' and known_gloss_segments::text ~ '[（(][^）)]*[）)]' group by 1,2
 union all select 'lego.known_gloss_segments', course_code, count(*) from course_legos
   where course_code like '%_for_jpn' and known_gloss_segments::text ~ '[（(][^）)]*[）)]' group by 1,2
 order by 1,2`);
console.log('\n--- the FOURTH surface: annotated parentheticals in gloss/tiling columns the plan never mentions ---');
console.table(r5);

fs.writeFileSync('./jrefute-a7-derived.json', JSON.stringify({ r1, r2, r3, r4, r5 }, null, 1));

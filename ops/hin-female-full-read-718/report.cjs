// Builds the published report from state/merged.json. Reads files only.
const fs = require('fs'), path = require('path');
const D = __dirname;
const m = JSON.parse(fs.readFileSync(path.join(D, 'state/merged.json'), 'utf8'));
const census = JSON.parse(fs.readFileSync(path.join(D, 'state/census.json'), 'utf8'));
const planned = new Set(census.plan.map(p => p.original_text));
// Consistency: n 1012 carries the same half-converted थोड़ा as the five seed-39 rows shard 02 marked wrong; its reader
// marked it ok "though थोड़ी is more natural". Judged the same way as its siblings here.
const r1012 = m.rows.find(r => r.n === 1012);
r1012.v = { n: 1012, v: 'wrong-female', f: 'मैं थोड़ी थकी हुई महसूस करने लगी थी।', why: 'stored keeps masculine थोड़ा before थकी हुई (same as the seed-39 rows); harmonised at merge — shard reader had it ok-but-less-natural' };
const isPlayed = r => r.occ.some(o => o[0] !== 'component' && o[2] <= 300);
const esc = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const seeds = r => [...new Set(r.occ.map(o => o[2]))].sort((a, b) => a - b).join(', ');
const ids = r => r.occ.map(o => `${o[1]}`).join(', ');
const ens = r => [...new Set(r.occ.map(o => o[3]))].join(' / ');
const table = (rows, withStored) => {
  const h = withStored ? '| n | seed | rows | Hindi | English | stored f | fix | why |\n|---|---|---|---|---|---|---|---|' : '| n | seed | rows | Hindi | English | fix | why |\n|---|---|---|---|---|---|---|';
  return h + '\n' + rows.map(r => `| ${r.n} | ${seeds(r)} | ${esc(ids(r))} | ${esc(r.t)} | ${esc(ens(r))} | ${withStored ? esc(r.stored && r.stored.f) + ' | ' : ''}${esc(r.v.f || r.v.m)} | ${esc(r.v.why)} |`).join('\n');
};
const V = v => m.rows.filter(r => r.v.v === v);
const wrong = V('wrong-female'), amb = V('ambiguous'), nf = V('needs-female');
const s127 = r => r.occ.some(o => o[2] === 127);
const nfPlayed = nf.filter(isPlayed), nfComp = nf.filter(r => !isPlayed(r));
const nfStale = nfPlayed.filter(r => planned.has(r.t) && !s127(r));
const nfMiss = nfPlayed.filter(r => !planned.has(r.t) && !s127(r));
const nf127 = nfPlayed.filter(s127);
const stored = m.rows.filter(r => r.stored);
const okStored = stored.filter(r => r.v.v === 'ok').length;
const w = m.wiring;
const playedSlots = w.reduce((a, x) => a + x.played, 0);
const linkable = w.filter(x => x.fClip || x.mClip);
const notes = m.rows.filter(r => r.v.note);
const tally = {}; m.rows.forEach(r => tally[r.v.v] = (tally[r.v.v] || 0) + 1);

const out = `# hin_for_eng speaker-gender forms — full read (job #718)

Kai asked (15 Oct): read every Hindi target row in full, not by rule, and say (A) which rows that agree with the speaker's gender have no female form, (B) whether the 767 stored female forms and 8 male forms are right, and (C) whether any of it reaches the learner.

**How it was read.** Every distinct Hindi target text in the course — ${m.rows.length} texts carrying 7,087 rows (668 seeds, 772 LEGOs, 5,647 practice phrases incl. 369 never-played components) — was read as a sentence, with its English and its seed sentence, by one of twelve Opus readers (#721·Q–#732·Q), one verdict per text. No row was skipped or decided by pattern. A model read it, not a native speaker: see the gaps at the end.

## Totals

| | |
|---|---|
| Texts read | ${m.rows.length} (verdicts: ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(', ')} — after one merge harmonisation, n 1012) |
| **A. Speaker-gendered texts with NO female form** | **${nf.length}** — ${nfPlayed.length} on played rows, ${nfComp.length} on never-played components only |
| … of which the rule tool would add on a re-run (text changed after it wrote) | ${nfStale.length} |
| … of which the rule tool misses even after today's two fixes | ${nfMiss.length} played + ${nfComp.length} components |
| … seed 127, deliberately held back for #349·Q's want/try fix | ${nf127.length} |
| Texts that need a male form and have none | 0 |
| Ambiguous — one text, two subjects (Kai's call) | ${amb.length} |
| **B. Stored female forms read** | ${stored.filter(r => r.stored.f).length} on live texts: **${stored.filter(r => r.stored.f && r.v.v === 'ok').length} right, ${wrong.length} wrong** (all the same defect: थोड़ा left masculine before थकी हुई); plus 4 orphans (below), read by hand at merge: all four correct, just unused |
| Stored male forms read | 8, all right (seed 177 ×7, seed 645 ×1) |
| **C. Played slots carrying a stored reading** | ${playedSlots} slots, all linked, **0 speak the stored reading** |
| Defects in the displayed Hindi noticed on the way (not gender) | ${notes.length} notes (appendix) |

## C. Wiring verdict — stored, not wired

- **The learner never reads course_gender_expansions.** The player plays whatever clip each slot's \`target1_audio_id\` / \`target2_audio_id\` points at (ssi-learning-app \`CourseDataProvider.ts\`). The expansion is used at exactly one moment: when phase 8 or \`/api/audio/render\` RENDERS a clip for that text, target1 (Aarti) is fed \`expanded_f\`, target2 (Kunal) \`expanded_m\` (\`services/gender-haiku-service.cjs\` loadGenderMap, \`phase8-audio-v13.cjs\` ~l.3385).
- **Every Aarti clip on these slots says the male Hindi.** The course had no expansion rows until 14 Oct (#356·Q), so every existing target1 clip was rendered from the written (male) text. Of the ${playedSlots} played slots carrying a stored text, all are linked and none points at a clip of the stored reading.
- **Nothing will re-render them by itself.** Phase 8's needs (\`/needs/hin_for_eng\`, read today) reports target1 missing 0, target2 missing 0: a linked slot is never seen as stale because its stored reading changed.
- **Rendering is refused today.** A dry run of \`POST /api/audio/render\` for a female reading answered \`VOICE_POLICY: hin (f) has only the 2026-09-04 draft casting — Tom has not chosen a voice\`. The finishing step remains Tom casting Hindi, then \`RENDER=1\` of the #356·Q tool (make-before-break) — after the fixes below are in the table, or it will render the 6 wrong forms and leave the ${nf.length} gaps male.
- **${linkable.length} readings need no render.** Seeds 176 (male-written) and 177 (female-written) are mirror texts, so a clip of each reading already exists: ${linkable.map(x => `"${x.f || x.m}" (for "${x.text}", seed ${x.seeds.join('/')})`).join('; ')}. Their slots could be pointed at those clips via link-clip, once someone confirms each clip's voice (the read route returns ids, not voices).
- **Orphans:** ${w.filter(x => !x.rows).map(x => `"${x.text}"`).join('; ')} — stored, but no row carries that text any more (edited since).
- **${w.filter(x => x.rows && !x.played).length} stored rows sit only on unplayed rows** (seeds 301–668 have no LEGOs; components are never played). Harmless; they will matter when those seeds are built.
- Not traced: the pod-1 audio (231 slots) runs on its own path and was outside this audit.

## B. Wrong stored female forms (${wrong.length})

${table(wrong, true)}

## A. Ambiguous — one text, two subjects (${amb.length}) — Kai's call

The expansion is keyed on the exact text, so one reading serves every row with that text. Options per row: re-cut/extend the fragment so the subject is explicit, or accept one reading.

${table(amb, true)}

## A. Missing female forms on played rows — the rule tool still misses these (${nfMiss.length})

${table(nfMiss, false)}

## A. Missing female forms on played rows — text changed after the tool wrote (${nfStale.length})

Mostly "या … चाहता हूँ" practice phrases rewritten by the want/try work after the 14 Oct write. The tool would plan these on a re-run, but per Kai's rule a re-run must be read in full, not trusted.

${table(nfStale, false)}

## A. Seed 127 — held for #349·Q (${nf127.length})

The seed's Hindi also says the opposite of its English ("that's why I didn't want to meet you" vs "That isn't why I wanted to see you") — fix the text first, then the female forms.

${table(nf127, false)}

## A. Missing female forms on never-played components only (${nfComp.length})

${table(nfComp, false)}

## Appendix — defects in the displayed Hindi, noticed on the way (${notes.length})

Not a proofread; each was noticed while judging gender. Not checked by a native speaker.

| n | seed | Hindi | English | note |
|---|---|---|---|---|
${notes.map(r => `| ${r.n} | ${seeds(r)} | ${esc(r.t)} | ${esc(ens(r))} | ${esc(r.v.note)} |`).join('\n')}

## Gaps

- **Model judgement, not a native speaker's.** Each text was read once by one Opus reader; no second reader cross-checked the verdicts. The "right" verdicts mean "a careful model found nothing wrong", which is weaker than a native ear. Memory notes say no native speaker has read the female forms.
- The थोड़ा → थोड़ी judgement (6 rows) is natural-usage, not strict grammar; one reader called the masculine merely less natural. Worth a native's one-line ruling.
- Wiring was checked per text through Popty's read routes (by-text clip lookup, phase-8 needs, render dry run), not per clip in the database: clip voices were not read.
- Nothing was written. Proposed fixes are proposals.

Inputs, verdicts and the merge are on branch \`cs/718-hin-female-forms-full-read\` under \`ops/hin-female-full-read-718/\` (state as read 2026-10-15 13:26Z).
`;
fs.writeFileSync(path.join(D, 'report.md'), out);
console.log('written', out.length, 'chars; nf', nf.length, 'miss', nfMiss.length, 'stale', nfStale.length, '127', nf127.length, 'comp', nfComp.length, 'wrong', wrong.length, 'amb', amb.length);

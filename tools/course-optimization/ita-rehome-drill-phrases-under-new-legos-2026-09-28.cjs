#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-rehome-drill-phrases-under-new-legos-2026-09-28.cjs
//
// ita_for_eng — phrases we want DRILLED move under a NEW LEGO (Kai, 2026-09-28 22:23Z, job #621·I).
//
// THE FACT (verified in the learning app, packages/player-vue/src/providers/generateLearningScript.ts): the player
// builds a round only for LEGOs with is_new = true (line ~1316 `.filter(l => l.is_new)`), and `legoState` — the pool
// that spaced rep, CONSOLIDATE and INF-play random USE all draw from — is populated only inside that loop (~1494).
// So the basket of a NOT-NEW LEGO is never played by any path, and a seed whose every LEGO is not new (348) is never
// played at all, seed sentence included (seed-phase review keys off the same states). Not-new LEGOs STAY not new —
// they are not new for a reason (L17). Phrases worth drilling therefore move under a new LEGO, edited where needed so
// each contains that LEGO (canon P25; L30 amended).
//
// What moves (a move = INSERT the row under its new LEGO with the same text and the same clips, DELETE the old row;
// nothing is re-rendered unless a side's text changes):
//   348 (only LEGO not new; nothing plays): the six "…didn't want to know what was going to happen" rows added
//       tonight (S0348L01U06–U10, U12) → S0201L03 "what was going to happen | che cosa sarebbe successo" (NEW,
//       the same pair, after 71, "in earlier seeds … which Kai already asked for"); the 348 SEED SENTENCE is added
//       there too as a use row (it is otherwise never heard). S0348L01U11 "I'm sure she didn't…" cannot go to 201
//       ("I'm sure" is first taught at 340) → S0340L01 "I'm sure that | sono sicuro che" (NEW, nearby), English
//       edited to "I'm sure that she didn't want to know what was going to happen" so it contains that LEGO
//       (Italian unchanged, clips kept; English re-voiced). 348's original rows (B01–U05) stay in their seed.
//   201 L02 (not new): tonight's S0201L02U10/U11 ("she didn't want to know why", "we didn't want to know what to
//       do") have no new LEGO in the course they could contain → DELETED (they never played). 201 L01/L02's older
//       rows carry nothing L03's own basket does not already drill ("we/I/she wanted to know what was going to
//       happen" are there) → left where they are, listed.
//   609 L02 "the sensible thing to do" (not new): the four "…would have been to ask …" use rows U02–U05 → L01
//       "to ask | chiedere" (NEW). B01 (the LEGO itself), B02/U01 (the seed sentence, already L01U08) and B03
//       ("…to wait | aspettare", no chiedere) stay, listed.
//   519 L04 "yet | ancora" (not new): B01–B03, U01–U04 → L03 "I haven't seen | non ho visto" (NEW), as use rows;
//       U05 "I haven't seen it yet | non l'ho ancora visto" stays — the bound *l'ho* does not contain "ho" under
//       the live gate's word rule (L28 exception territory, listed for Kai).
//   246 L02 "I wanted her to help you" (not new since #618·I): U05 = the seed sentence "…but she was too busy" →
//       L01 "too busy | troppo occupata" (NEW); one new companion row "I wanted her to help you today but she was too
//       busy | volevo che lei ti aiutasse oggi ma era troppo occupata" (taught words only) so the subjunctive is
//       drilled twice under a played LEGO. The other L02 rows contain no "too busy" and stay, listed.
//
// Rails: every landed row contains its NEW LEGO on both sides (word multiset, the live gate's rule); no word untaught
// at the target seed (moves go EARLIER, so this is re-checked at the new seed); ZUT: same pairs move, the one edited
// English is checked against the course; no LEGO changes (intro-mirror --strict still run); edited seeds unapproved;
// audio: moved rows keep their clips, new/edited sides linked or rendered (Italian Elsa/Benigno through the door,
// English on temporary Sonia via ita-sonia-temporary-fill SCOPE=ids); ZUT strict must stay at 56.
// Out of scope (sibling jobs): 347, 367, 390, 391, 485 (#622·I); 608, 618 (#618·I).
//
//   node tools/course-optimization/ita-rehome-drill-phrases-under-new-legos-2026-09-28.cjs            # dry run
//   APPLY=1 node tools/course-optimization/ita-rehome-drill-phrases-under-new-legos-2026-09-28.cjs    # apply + Italian audio

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-rehome-drill-phrases-under-new-legos-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#621·I';
const RULING = 'Kai, 2026-09-28 22:23Z (job #621·I): not-new LEGOs stay not new; the player builds rounds only for is_new LEGOs (generateLearningScript.ts ~1316) and every review pool draws from those rounds, so a not-new basket is never played — phrases we want drilled move under a NEW LEGO, edited where needed so each contains it (canon P25; L30 amended). Applied to 348 (→ 201 L03 / 340 L01), 201 L02 (two unplayable rows deleted), 609 L02 (→ L01 to ask), 519 L04 (→ L03 I haven\'t seen), 246 L02 (→ L01 too busy); edited seeds unapproved';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
function containsWords(hay, needle) {
  const have = {}; for (const w of words(hay)) have[w] = (have[w] || 0) + 1;
  for (const w of words(needle)) { if (!have[w]) return false; have[w]--; }
  return true;
}
const rowContainsLego = (row, lego) => containsWords(row.known, lego.known) && containsWords(row.target, lego.target);
function legoPosition(known, legoKnown) {
  const k = norm(known), l = norm(legoKnown);
  if (k === l || k.startsWith(l + ' ')) return 'start';
  if (k.endsWith(' ' + l)) return 'end';
  return 'middle';
}
/**
 * THE RULE (canon P25), as the player applies it: a phrase reaches the learner only if the LEGO it sits under is new.
 * Mirrors generateLearningScript.ts — `.filter(l => l.is_new)` builds the rounds and legoState is filled only there.
 */
const phraseIsPlayed = (row, legosById) => Boolean(legosById[row.lego]?.is_new);
const playedCount = (rows, legosById) => rows.filter(r => r.role !== 'component' && phraseIsPlayed(r, legosById)).length;

// ── The LEGOs (live-asserted, is_new included — this pass changes NO LEGO) ──────────────
const LEGOS = {
  S0348L01: { seed: 348, lego_index: 1, is_new: false, known: 'what was going to happen', target: 'che cosa sarebbe successo' },
  S0201L02: { seed: 201, lego_index: 2, is_new: false, known: 'to know', target: 'sapere' },
  S0201L03: { seed: 201, lego_index: 3, is_new: true, known: 'what was going to happen', target: 'che cosa sarebbe successo' },
  S0340L01: { seed: 340, lego_index: 1, is_new: true, known: "I'm sure that", target: 'sono sicuro che' },
  S0609L01: { seed: 609, lego_index: 1, is_new: true, known: 'to ask', target: 'chiedere' },
  S0609L02: { seed: 609, lego_index: 2, is_new: false, known: 'the sensible thing to do', target: 'la cosa sensata da fare' },
  S0519L03: { seed: 519, lego_index: 3, is_new: true, known: "I haven't seen", target: 'non ho visto' },
  S0519L04: { seed: 519, lego_index: 4, is_new: false, known: 'yet', target: 'ancora' },
  S0246L01: { seed: 246, lego_index: 1, is_new: true, known: 'too busy', target: 'troppo occupata' },
  S0246L02: { seed: 246, lego_index: 2, is_new: false, known: 'I wanted her to help you', target: 'volevo che lei ti aiutasse' },
};
// MOVES: from (id + expected text, under a not-new LEGO) → to (new id under a NEW LEGO). Text identical unless `edit`.
const MOVES = [
  // 348 → 201 L03
  { from: 'S0348L01U06', to: 'S0201L03U11', lego: 'S0201L03', known: "he didn't want to know what was going to happen", target: 'non voleva sapere che cosa sarebbe successo' },
  { from: 'S0348L01U07', to: 'S0201L03U12', lego: 'S0201L03', known: "she didn't want to know what was going to happen next", target: 'non voleva sapere che cosa sarebbe successo dopo' },
  { from: 'S0348L01U08', to: 'S0201L03U13', lego: 'S0201L03', known: "I didn't want to know what was going to happen", target: 'non volevo sapere che cosa sarebbe successo' },
  { from: 'S0348L01U09', to: 'S0201L03U14', lego: 'S0201L03', known: "we didn't want to know what was going to happen", target: 'non volevamo sapere che cosa sarebbe successo' },
  { from: 'S0348L01U10', to: 'S0201L03U15', lego: 'S0201L03', known: "she said she didn't want to know what was going to happen", target: 'ha detto che non voleva sapere che cosa sarebbe successo' },
  { from: 'S0348L01U12', to: 'S0201L03U16', lego: 'S0201L03', known: "he told me he didn't want to know what was going to happen", target: 'mi ha detto che non voleva sapere che cosa sarebbe successo' },
  // 348 → 340 L01, English edited to contain "I'm sure that"; Italian and its clips unchanged
  { from: 'S0348L01U11', to: 'S0340L01U07', lego: 'S0340L01', known: "I'm sure she didn't want to know what was going to happen", target: 'sono sicuro che non voleva sapere che cosa sarebbe successo', edit: { known: "I'm sure that she didn't want to know what was going to happen" } },
  // 609 L02 → L01
  { from: 'S0609L02U02', to: 'S0609L01U10', lego: 'S0609L01', known: 'I think the sensible thing to do would have been to ask', target: 'penso che la cosa sensata da fare sarebbe stata chiedere' },
  { from: 'S0609L02U03', to: 'S0609L01U11', lego: 'S0609L01', known: 'the sensible thing to do would have been to ask my mother', target: 'la cosa sensata da fare sarebbe stata chiedere a mia madre' },
  { from: 'S0609L02U04', to: 'S0609L01U12', lego: 'S0609L01', known: 'the sensible thing to do would have been to ask his friend', target: 'la cosa sensata da fare sarebbe stata chiedere al suo amico' },
  { from: 'S0609L02U05', to: 'S0609L01U13', lego: 'S0609L01', known: 'at the time the sensible thing to do would have been to ask', target: 'in quel periodo la cosa sensata da fare sarebbe stata chiedere' },
  // 519 L04 → L03 (build rows become use rows: they assume the word is known — Kai's build/use rule)
  { from: 'S0519L04B01', to: 'S0519L03U06', lego: 'S0519L03', known: "I haven't seen anything yet", target: 'non ho ancora visto niente' },
  { from: 'S0519L04B02', to: 'S0519L03U07', lego: 'S0519L03', known: "I haven't seen their baby yet", target: 'non ho ancora visto il loro bambino' },
  { from: 'S0519L04B03', to: 'S0519L03U08', lego: 'S0519L03', known: "I haven't seen their new baby yet", target: 'non ho ancora visto il loro nuovo bambino' },
  { from: 'S0519L04U01', to: 'S0519L03U09', lego: 'S0519L03', known: "I haven't seen the perfect house yet", target: 'non ho ancora visto la casa perfetta' },
  { from: 'S0519L04U02', to: 'S0519L03U10', lego: 'S0519L03', known: "I haven't seen the new problem yet", target: 'non ho ancora visto il nuovo problema' },
  { from: 'S0519L04U03', to: 'S0519L03U11', lego: 'S0519L03', known: "I haven't seen what happened yet", target: 'non ho ancora visto quello che è successo' },
  { from: 'S0519L04U04', to: 'S0519L03U12', lego: 'S0519L03', known: "I haven't seen the film yet", target: 'non ho ancora visto il film' },
  // 246 L02 → L01
  { from: 'S0246L02U05', to: 'S0246L01U08', lego: 'S0246L01', known: 'I wanted her to help you but she was too busy', target: 'volevo che lei ti aiutasse ma era troppo occupata' },
];
// NEW rows under new LEGOs (audio linked where a clip exists, else rendered)
const ADDS = [
  { id: 'S0201L03U17', lego: 'S0201L03', known: "she didn't want to know what was going to happen", target: 'non voleva sapere che cosa sarebbe successo', copyAudioFrom: 'S0348L01B03' },
  { id: 'S0246L01U09', lego: 'S0246L01', known: 'I wanted her to help you today but she was too busy', target: 'volevo che lei ti aiutasse oggi ma era troppo occupata' },
];
// DELETES: tonight's rows under a not-new LEGO with no new LEGO in the course they could contain
const DELETES = [
  { id: 'S0201L02U10', known: "she didn't want to know why", target: 'non voleva sapere perché', why: 'no new LEGO in the course contains "why | perché" or "to know | sapere" after seed 71 (S0421L01 is "because")' },
  { id: 'S0201L02U11', known: "we didn't want to know what to do", target: 'non volevamo sapere che cosa fare', why: 'no new LEGO in the course contains "what to do | che cosa fare"' },
];
// Rows under the not-new LEGOs that STAY, and why (listed for Kai, never silently passed over)
const STAYS = [
  { id: 'S0609L02B01', why: 'the LEGO itself' }, { id: 'S0609L02B02', why: 'the seed sentence — already drilled as S0609L01U08' }, { id: 'S0609L02U01', why: 'the seed sentence — already drilled as S0609L01U08' },
  { id: 'S0609L02B03', why: '"…would have been to wait | aspettare" contains no chiedere; no other new LEGO in 609' },
  { id: 'S0519L04U05', why: '"non l\'ho ancora visto": bound l\'ho does not contain "ho" under the live gate\'s word rule — L28 territory, for Kai' },
  { id: 'S0246L02B01–U06 (except U05)', why: 'no "too busy" in them; the subjunctive is drilled under L01 by U08/U09' },
  { id: 'S0201L01/L02 older rows', why: 'nothing L03\'s own basket does not already drill (we/I/she wanted to know what was going to happen)' },
  { id: 'S0348L01 B01–U05', why: 'seed 348 has no new LEGO and never plays; its sentence is now S0201L03U17' },
];
for (const m of MOVES) { const l = LEGOS[m.lego]; m.seed = l.seed; m.lego_index = l.lego_index; m.after = { known: m.edit?.known ?? m.known, target: m.edit?.target ?? m.target }; m.knownChanged = Boolean(m.edit?.known); m.targetChanged = Boolean(m.edit?.target); m.lego_position = legoPosition(m.after.known, l.known); }
for (const a of ADDS) { const l = LEGOS[a.lego]; a.seed = l.seed; a.lego_index = l.lego_index; a.after = { known: a.known, target: a.target }; a.lego_position = legoPosition(a.known, l.known); }
const LANDING = [...MOVES.map(m => ({ id: m.to, lego: m.lego, seed: m.seed, lego_index: m.lego_index, role: 'use', ...m.after })), ...ADDS.map(a => ({ id: a.id, lego: a.lego, seed: a.seed, lego_index: a.lego_index, role: 'use', ...a.after }))];
const SEEDS = [...new Set([...LANDING.map(r => r.seed), 348, 609, 519, 246, 201])].sort((a, b) => a - b);
const OUT_OF_SCOPE_SEEDS = [347, 367, 390, 391, 485, 608, 618];

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function newVocabulary(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  const out = [];
  for (const w of new Set(words(text))) {
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w]);
    if (!rows.length) out.push(w);
  }
  return out;
}
async function guardLive(pg, problems, log) {
  const { rows: legos } = await pg.query('SELECT lego_id, seed_number, lego_index, is_new, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, Object.keys(LEGOS)]);
  for (const [id, l] of Object.entries(LEGOS)) {
    const r = legos.find(x => x.lego_id === id);
    if (!r || r.known_text !== l.known || r.target_text !== l.target || r.is_new !== l.is_new || r.seed_number !== l.seed || r.lego_index !== l.lego_index) problems.push(`${id} reads "${r?.known_text}" → "${r?.target_text}" is_new=${r?.is_new} (${r?.seed_number}/${r?.lego_index}) — expected "${l.known}" → "${l.target}" is_new=${l.is_new}`);
  }
  // Source rows read exactly as expected (text + not already moved); target ids free.
  const srcIds = [...MOVES.map(m => m.from), ...DELETES.map(d => d.id), ...ADDS.filter(a => a.copyAudioFrom).map(a => a.copyAudioFrom)];
  const { rows: src } = await pg.query(`SELECT split_part(id,':',2) id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, phrase_role FROM course_practice_phrases WHERE course_code=$1 AND split_part(id,':',2) = ANY($2)`, [COURSE, srcIds]);
  log.src = Object.fromEntries(src.map(r => [r.id, r]));
  for (const m of [...MOVES, ...DELETES]) { const r = log.src[m.from || m.id]; if (!r || r.known_text !== m.known || r.target_text !== m.target) problems.push(`${m.from || m.id} reads "${r?.known_text}" → "${r?.target_text}" — expected "${m.known}" → "${m.target}"`); }
  for (const a of ADDS) if (a.copyAudioFrom && !log.src[a.copyAudioFrom]) problems.push(`${a.copyAudioFrom} (audio source for ${a.id}) not found`);
  const { rows: clash } = await pg.query('SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)', [COURSE, LANDING.map(r => `${COURSE}:${r.id}`)]);
  for (const c of clash) problems.push(`${c.id} already exists`);
  log.positions = {};
  for (const key of new Set(LANDING.map(r => r.lego))) {
    const l = LEGOS[key];
    const { rows: [m] } = await pg.query('SELECT max(position) p FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [COURSE, l.seed, l.lego_index]);
    let p = (m?.p ?? 0);
    for (const r of LANDING.filter(x => x.lego === key)) r.position = ++p;
    log.positions[key] = LANDING.filter(x => x.lego === key).map(r => `${r.id}@${r.position}`);
  }
  const { rows: seeds } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) ORDER BY 1', [COURSE, SEEDS]);
  log.seedsApprovedBefore = Object.fromEntries(seeds.map(s => [s.seed_number, s.approved_at]));
  // Concurrency: any surface other than this job's own two tools writing these seeds in the last 90 minutes.
  const { rows: ev } = await pg.query(`SELECT id, surface, operation, scope->'seed_numbers' AS seeds FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '90 minutes' AND surface NOT LIKE '%' || $2 || '%' AND surface NOT LIKE '%ita-seed-348-non-voleva-sapere-phrases-2026-09-28%' AND surface NOT LIKE '%ita-608p8-618p8-ten-calls-2026-09-28%' AND surface NOT LIKE '%ita-sonia-temporary-fill%' AND EXISTS (SELECT 1 FROM jsonb_array_elements(scope->'seed_numbers') e WHERE (e#>>'{}')::int = ANY($3))`,
    [COURSE, SWEEP, SEEDS]);
  for (const e of ev) problems.push(`another surface touched ${JSON.stringify(e.seeds)} in the last 90 min: ${e.surface} ${e.operation} (${e.id}) — re-read before writing`);
}
async function guards(pg, problems, log) {
  const legosById = LEGOS;
  // On paper: every source row was UNPLAYED (under a not-new LEGO) and every landing row is PLAYED (under a new LEGO) and contains it.
  for (const m of MOVES) {
    const fromLego = m.from.slice(0, 8);
    if (phraseIsPlayed({ lego: fromLego }, legosById)) problems.push(`${m.from} was already under a NEW LEGO (${fromLego}) — why move it?`);
  }
  for (const r of LANDING) {
    if (!phraseIsPlayed(r, legosById)) problems.push(`${r.id} lands under a not-new LEGO ${r.lego} — pointless`);
    if (!rowContainsLego(r, LEGOS[r.lego])) problems.push(`${r.id} "${r.known}" → "${r.target}" does not contain ${r.lego}`);
    if (OUT_OF_SCOPE_SEEDS.includes(r.seed)) problems.push(`${r.id} is in an out-of-scope seed`);
    const nk = await newVocabulary(pg, r.seed, r.known, 'known'), nt = await newVocabulary(pg, r.seed, r.target, 'target');
    if (nk.length || nt.length) problems.push(`${r.id} introduces vocabulary not taught by seed ${r.seed}: ${[...nk, ...nt].join(', ')}`);
  }
  // ZUT vs the course for every landing pair (moved pairs are their own source; the edited/new English is what matters).
  const ours = new Set([...LANDING.map(r => r.id), ...MOVES.map(m => m.from), ...DELETES.map(d => d.id)]);
  log.zut = []; log.targetSide = [];
  for (const r of LANDING) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND (lower(trim(known_text))=lower(trim($2)) OR lower(trim(target_text))=lower(trim($3)))`, [COURSE, r.known, r.target]);
    for (const x of rows) {
      const rid = x.id.replace(`${COURSE}:`, ''); if (ours.has(rid)) continue;
      const sameK = norm(x.known_text) === norm(r.known), sameT = norm(x.target_text) === norm(r.target);
      if (sameK && !sameT) log.zut.push(`${r.id} "${r.known}" → "${r.target}" vs ${rid} "${x.known_text}" → "${x.target_text}"`);
      else if (sameT && !sameK) log.targetSide.push(`${r.id} "${r.known}" shares its Italian with ${rid} "${x.known_text}"`);
    }
  }
  problems.push(...new Set(log.zut));
  // The course-wide picture this pass changes: rows under not-new LEGOs in the five seeds, before → after (on paper).
  const { rows: baskets } = await pg.query(`SELECT split_part(p.id,':',2) id, l.lego_id AS lego, l.is_new, p.phrase_role AS role FROM course_practice_phrases p JOIN course_legos l ON l.course_code=p.course_code AND l.seed_number=p.seed_number AND l.lego_index=p.lego_index WHERE p.course_code=$1 AND p.seed_number = ANY($2)`, [COURSE, [201, 246, 348, 519, 609]]);
  const byId = Object.fromEntries(Object.entries(LEGOS).map(([k, v]) => [k, v]));
  for (const b of baskets) if (!byId[b.lego]) byId[b.lego] = { is_new: b.is_new };
  const before = baskets.map(b => ({ ...b }));
  const gone = new Set([...MOVES.map(m => m.from), ...DELETES.map(d => d.id)]);
  const after = [...before.filter(b => !gone.has(b.id)), ...LANDING.map(r => ({ id: r.id, lego: r.lego, role: 'use' }))];
  log.played = { before: playedCount(before, byId), after: playedCount(after, byId), unplayedBefore: before.filter(b => b.role !== 'component' && !phraseIsPlayed(b, byId)).length, unplayedAfter: after.filter(b => b.role !== 'component' && !phraseIsPlayed(b, byId)).length };
  // Standing later-phrase check: no LEGO changes here; listed for the record.
  log.laterPhraseCheck = 'no LEGO text or is_new changed — nothing downstream to re-gloss';
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const moveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-move', scope: { seed_numbers: SEEDS, phrase_ids: MOVES.map(m => `${COURSE}:${m.to}`), rows: MOVES.length },
    detail: { ruling: RULING, job: JOB, moves: MOVES.map(m => ({ from: `${COURSE}:${m.from}`, to: `${COURSE}:${m.to}`, lego: m.lego, position: LANDING.find(r => r.id === m.to)?.position, known_from: m.known, target_from: m.target, known_to: m.after.known, target_to: m.after.target, clips_kept: !m.knownChanged && !m.targetChanged })) } });
  const addEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-add', scope: { seed_numbers: [...new Set(ADDS.map(a => a.seed))], phrase_ids: ADDS.map(a => `${COURSE}:${a.id}`), rows: ADDS.length }, detail: { ruling: RULING, job: JOB, rows: ADDS.map(a => ({ id: `${COURSE}:${a.id}`, lego: a.lego, known: a.known, target: a.target, copyAudioFrom: a.copyAudioFrom || null })) } });
  const delEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-delete', scope: { seed_numbers: [201], phrase_ids: DELETES.map(d => `${COURSE}:${d.id}`), rows: DELETES.length }, detail: { ruling: RULING, job: JOB, rows: DELETES.map(d => ({ id: `${COURSE}:${d.id}`, known: d.known, target: d.target, why: d.why })) } });
  const toUnapprove = SEEDS.filter(s => log.seedsApprovedBefore[s]);
  const unapproveEvent = toUnapprove.length ? await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: toUnapprove, rows: toUnapprove.length }, detail: { why: 'phrases rehomed under a new LEGO (Kai 22:23Z); needs his read', job: JOB, approved_at_before: log.seedsApprovedBefore } }) : null;
  log.events = { moveEvent, addEvent, delEvent, unapproveEvent, unapproved: toUnapprove };
  const insertRow = async (r, audio, event) => {
    const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, known_audio_id, target1_audio_id, target2_audio_id, last_edit_event_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}',$11,$12,true,$13,$14,$15,$16)`,
      [`${COURSE}:${r.id}`, COURSE, r.seed, r.lego_index, r.position, r.known, r.target, r.target.length, r.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB, ...(r.movedFrom ? { moved_from: r.movedFrom } : {}) }), r.lego_position, r.lego, audio.known, audio.t1, audio.t2, event]);
    if (ins.rowCount !== 1) throw new Error(`${r.id}: insert ${ins.rowCount}`);
  };
  await pg.query('BEGIN');
  try {
    for (const m of MOVES) {
      const s = log.src[m.from];
      const landing = LANDING.find(r => r.id === m.to);
      await insertRow({ ...landing, movedFrom: `${COURSE}:${m.from}` }, { known: m.knownChanged ? null : s.known_audio_id, t1: m.targetChanged ? null : s.target1_audio_id, t2: m.targetChanged ? null : s.target2_audio_id }, moveEvent);
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${m.from}`, m.known, m.target]);
      if (del.rowCount !== 1) throw new Error(`${m.from}: delete ${del.rowCount}`);
    }
    for (const a of ADDS) {
      const s = a.copyAudioFrom ? log.src[a.copyAudioFrom] : {};
      const landing = LANDING.find(r => r.id === a.id);
      await insertRow(landing, { known: s.known_audio_id || null, t1: s.target1_audio_id || null, t2: s.target2_audio_id || null }, addEvent);
    }
    for (const d of DELETES) {
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${d.id}`, d.known, d.target]);
      if (del.rowCount !== 1) throw new Error(`${d.id}: delete ${del.rowCount}`);
    }
    if (toUnapprove.length) {
      const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, toUnapprove]);
      if (un.rowCount !== toUnapprove.length) throw new Error('seed unapprove');
    }
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: drill phrases rehomed under new LEGOs (348→201/340, 609 L02→L01, 519 L04→L03, 246 L02→L01); moved rows keep their clips, new/edited sides filled by the tool + temporary Sonia`, metadata: { job: JOB, seeds: SEEDS, moved: MOVES.length, added: ADDS.length, deleted: DELETES.length } });
}

// ── Audio (the #579·I/#580·I/#590·I route, unchanged) ─────────────────────────────────────
function ttsDeps() {
  process.env.PHASE8_NO_LISTEN = '1';
  return {
    phase8: require('../../services/phases/phase8-audio-v13.cjs'), ttsService: require('../../services/tts-service.cjs'), veracity: require('../../services/audio-veracity.cjs'),
    voiceConfigService: require('../../services/voice-config-service.cjs'), writeOrSwapClip: require('../../services/shared/audio-revision-swap.cjs').writeOrSwapClip,
    normalizeForAudio: require('../../services/shared/text-normalize.cjs').normalizeForAudio, S3: require('@aws-sdk/client-s3'), uuidv4: require('uuid').v4,
  };
}
async function renderClip(supabase, { text, role, voice, voiceIds }) {
  const d = ttsDeps();
  const s3 = new d.S3.S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const renderAndMaster = async () => {
    const out = await d.ttsService.generateWithRetry(text, 'azure', { door: { courseCode: COURSE, intro: false, language: 'ita', voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 });
    if (out.existingClip && !voiceIds.includes(out.existingClip.voice_id)) throw new Error(`door offered ${out.existingClip.voice_id}; ${voice.voiceName} only`);
    const { buffer, durationMs } = await d.phase8.masterAudio(out.audioBuffer, text, await d.voiceConfigService.masteringOptsFor(voice.voiceName, 'azure'));
    return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
  };
  const gated = await d.veracity.renderChecked({ render: renderAndMaster, expectedText: text, language: 'ita', sampler: d.veracity.ALWAYS_SAMPLER, logger: console, meta: { courseCode: COURSE, role, voiceId: voice.voiceName, originalText: text } });
  if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
  const newAudioId = d.uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
  await s3.send(new d.S3.PutObjectCommand({ Bucket: d.phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
  const verdictColumns = d.veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
  const textNormalized = d.normalizeForAudio(text);
  const base = { course_code: COURSE, text, text_normalized: textNormalized, language: 'ita', role, voice_id: voice.voiceId, origin: 'tts' };
  const out = await d.writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: textNormalized, language: 'ita', role, voice_id: voice.voiceId }, insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns }, swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text, ...verdictColumns }, newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${role}, ${voice.voiceName})`, reason: RULING, logger: console });
  return { audioId: out.audioId, durationMs: gated.durationMs };
}
async function fillItalian(pg, supabase, log) {
  const ids = LANDING.map(r => `${COURSE}:${r.id}`);
  const { rows } = await pg.query(`SELECT id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND (target1_audio_id IS NULL OR target2_audio_id IS NULL) ORDER BY seed_number, position`, [COURSE, ids]);
  for (const r of rows) for (const role of ['target1', 'target2']) {
    if (r[`${role}_audio_id`]) continue;
    const entry = { id: r.id, role, text: r.target_text }; log.audio.push(entry);
    const voice = role === 'target1' ? ELSA : BENIGNO;
    try {
      const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [r.target_text, AZURE_VOICE_IDS[role], COURSE, role]);
      let audioId = have[0]?.id;
      if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
      else { const out = await renderClip(supabase, { text: r.target_text, role, voice, voiceIds: AZURE_VOICE_IDS[role] }); audioId = out.audioId; entry.result = `rendered ${voice.voiceName} clip ${audioId} (${out.durationMs} ms)`; }
      const u = await pg.query(`UPDATE course_practice_phrases SET ${role}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND target_text=$4 AND ${role}_audio_id IS NULL`, [audioId, COURSE, r.id, r.target_text]);
      const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id FROM course_practice_phrases x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.id=$2`, [COURSE, r.id]);
      if (u.rowCount !== 1 && now?.id === audioId) entry.result += ' — linked by the audio_autolink trigger on insert';
      entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null;
      if (!now?.id || !AZURE_VOICE_IDS[role].includes(now.voice_id)) entry.result += ` — SLOT NOT ON CAST VOICE (${now?.voice_id})`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}
async function silentEnglish(pg) {
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND known_audio_id IS NULL ORDER BY seed_number, position`, [COURSE, LANDING.map(r => `${COURSE}:${r.id}`)]);
  return rows.map(r => r.id);
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, job: JOB, apply: APPLY, started: new Date().toISOString(), problems: [], audio: [] };
  console.log(`\n══ ${COURSE} — drill phrases rehomed under NEW LEGOs — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  await guardLive(pg, log.problems, log);
  if (!log.problems.length) await guards(pg, log.problems, log);
  console.log('\nPLAN — moves (clips kept unless a side is edited):');
  for (const m of MOVES) console.log(`  ${m.from} → ${m.to.padEnd(12)} pos ${String(LANDING.find(r => r.id === m.to)?.position ?? '?').padStart(2)} [${m.lego}] "${m.after.known}" → "${m.after.target}"${m.knownChanged ? '  [English edited — re-voice]' : ''}`);
  console.log('adds:'); for (const a of ADDS) console.log(`  ${a.id.padEnd(12)} pos ${String(LANDING.find(r => r.id === a.id)?.position ?? '?').padStart(2)} [${a.lego}] "${a.known}" → "${a.target}"${a.copyAudioFrom ? `  (clips from ${a.copyAudioFrom})` : ''}`);
  console.log('deletes:'); for (const d of DELETES) console.log(`  ${d.id} "${d.known}" → "${d.target}" — ${d.why}`);
  console.log('stays (listed for Kai):'); for (const s of STAYS) console.log(`  ${s.id}: ${s.why}`);
  console.log(`  played rows in seeds 201/246/348/519/609: before ${log.played?.before} (unplayed ${log.played?.unplayedBefore}) → after ${log.played?.after} (unplayed ${log.played?.unplayedAfter})`);
  console.log(`  seeds ${SEEDS.join(',')} — approved_at before: ${JSON.stringify(log.seedsApprovedBefore)}; to unapprove: ${SEEDS.filter(s => log.seedsApprovedBefore?.[s]).join(',') || 'none (all already unapproved)'}`);
  if (log.targetSide?.length) { console.log('same Italian under a different English elsewhere (listed, not a defect):'); for (const t of new Set(log.targetSide)) console.log('  ' + t); }
  console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nguards hold');
  if (APPLY && !log.problems.length) {
    await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)}`);
    await fillItalian(pg, supabase, log);
    console.log('ITALIAN AUDIO:'); for (const a of log.audio) console.log(`  ${a.id} ${a.role} "${a.text}": ${a.result}`);
    log.silentEnglish = await silentEnglish(pg);
    console.log(`ENGLISH prompts to fill on temporary Sonia (${log.silentEnglish.length}):\n  SCOPE=ids IDS=${log.silentEnglish.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result))) log.problems.push('some Italian slots were not filled — see audio');
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { norm, containsWords, rowContainsLego, legoPosition, phraseIsPlayed, playedCount, LEGOS, MOVES, ADDS, DELETES, LANDING, STAYS, OUT_OF_SCOPE_SEEDS };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });

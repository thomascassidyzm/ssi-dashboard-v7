#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-seed-376-recut-2026-09-28.cjs
//
// ita_for_eng seed 376 — "I didn't go anywhere last month" → "non sono andato da nessuna parte il
// mese scorso". KAI APPROVED (2026-09-28, P3 of https://watson-1.tail4968cb.ts.net/d/197f2605,
// applied by job #644·I): S0376L01 "I didn't go anywhere | non sono andato da nessuna parte" is
// re-cut into "I didn't go | non sono andato" + "anywhere | da nessuna parte", keeping the phrases.
//
// THE DEFECT: the one LEGO was (all but "last month" of) the whole seed, so no phrase could vary
// and still contain it (P17): five rows carried only "… da nessuna parte", and U05 "she was trying
// to go somewhere but ended up going nowhere → stava provando a uscire ma non da nessuna parte"
// was a mistranslation.
//
// THE CUT (never delete a LEGO — L01 is re-textured IN PLACE; L02 is a NEW slot):
//   L01  I didn't go → non sono andato       NEW. "I went → sono andato" is S0371L01 (five seeds
//                                            earlier) and the learner has said "non ho <participle>"
//                                            since seed 55, but "non sono andato" — the first negated
//                                            essere-perfect in the course — occurs NOWHERE before 376
//                                            (0 phrases, 0 LEGOs, checked live, see NEWNESS below),
//                                            so it is not a restatement and not yet familiar (L17):
//                                            a new pair on both sides (Kai's 2026-09-23 rule).
//                                            Component = the LEGO itself, carrying its pronoun (K26),
//                                            the S0371L01 shape. Its intro is the course template,
//                                            re-authored by ita-intro-mirror-fix --only-seeds 376.
//   L02  anywhere → da nessuna parte         NEW. The negative-frame "anywhere" (S0182L02 teaches the
//                                            positive "anywhere → da qualche parte"); components
//                                            from→da / no→nessuna / part→parte (the three component
//                                            rows the old L01 already carried, moved across). Its
//                                            intro is KAI'S OWN LINE, byte for byte, marked
//                                            human-authored before the clip is written:
//                                              The Italian for "anywhere" in a negative phrase like 'I didn't go anywhere', is:
//   "last month → il mese scorso" gets no LEGO: taught at seed 37 (L30).
//
// PHRASES: every row lands under the LEGO it contains on BOTH sides (P17), and both LEGOs are new
// so both baskets play (P25). Rows that contain only L02 move to L02 with new ids (the phrases→legos
// key is the id, so a move is insert-with-clips + delete, the ita-rehome-drill-phrases shape); rows
// under L01 keep their ids. U05 is rewritten into a correct, natural pair from words taught by 376.
// The seed sentence (U06, added by #635·I under P26) moves to L02, the seed's LAST new LEGO.
//
// AUDIO. Italian on the course cast, Azure Elsa (target1) / Benigno (target2), through the one TTS
// door (spend ledger + cast gate); an existing clip in the right voice is linked, never re-rendered;
// a moved row keeps its clips. L02's intro renders on the temporary Azure Sonia presentation route
// (#557·I / #559·I), cast restored byte-identical in a finally block. English prompts are NOT
// rendered here: the silent known slots are printed for ita-sonia-temporary-fill SCOPE=ids.
// Make-before-break: nothing is deleted except the moved phrase rows' OLD ids, after the copy exists.
//
//   node tools/course-optimization/ita-seed-376-recut-2026-09-28.cjs            # dry run: guards + plan
//   APPLY=1 node tools/course-optimization/ita-seed-376-recut-2026-09-28.cjs    # write content, Italian audio, L02 intro
//   AUDIO_ONLY=1 APPLY=1 node …                                                 # re-run the audio + intro fill only
//   then: APPLY=1 node tools/course-optimization/ita-intro-mirror-fix-2026-09-28.cjs --only-seeds 376   # L01's template intro
//   then: SCOPE=ids IDS=<printed> APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs
//   then: node tools/course-optimization/audit-phrase-zut.cjs ita_for_eng ; node tools/check-intro-mirror.cjs ita_for_eng --strict

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SEED = 376;
const SWEEP = 'ita-seed-376-recut-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#644·I';
const RULING = `Kai, 2026-09-28 (P3 of d/197f2605, job #644·I): seed 376 re-cut — "I didn't go → non sono andato" (new; first negated essere-perfect in the course) + "anywhere → da nessuna parte" (new; negative-frame anywhere, S0182L02 is the positive), phrases kept and rehomed under the LEGO each contains, U05 mistranslation rewritten`;
const AUTHOR = 'Kai, 2026-09-28 (his own line, applied by job #644·I)';

const SEED_TEXT = { known: "I didn't go anywhere last month", target: 'non sono andato da nessuna parte il mese scorso' };
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', castVoiceId: 'en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural' };
const SONIA_IDS = ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'];
const TEMP_PRES_ROW = { slot: 'presentation', language: 'eng', gender: 'f', rank: 1, voice_id: SONIA.castVoiceId };

// ── The picture this tool was written against (live 2026-09-28 23:30Z) ─────────────────
const OLD = {
  legos: [
    { idx: 1, type: 'M', is_new: true, known: "I didn't go anywhere", target: 'non sono andato da nessuna parte', components: [{ known: "I didn't go anywhere", target: 'non sono andato da nessuna parte' }], intro: '5fcb413b-eaf3-4dfa-a58a-605ce96528b8' },
  ],
  phrases: [
    { id: 'S0376L01C01', known: 'from', target: 'da' },
    { id: 'S0376L01C02', known: 'no', target: 'nessuna' },
    { id: 'S0376L01C03', known: 'part', target: 'parte' },
    { id: 'S0376L01B01', known: "I didn't go anywhere", target: 'non sono andato da nessuna parte' },
    { id: 'S0376L01B02', known: 'go anywhere', target: 'andare da nessuna parte' },
    { id: 'S0376L01B03', known: "I didn't go anywhere now", target: 'non sono andato da nessuna parte adesso' },
    { id: 'S0376L01U01', known: "I didn't go anywhere", target: 'non sono andato da nessuna parte' },
    { id: 'S0376L01U02', known: 'she just wanted to stay and not go anywhere', target: 'voleva solo stare e non andare da nessuna parte' },
    { id: 'S0376L01U03', known: "she said she couldn't go anywhere", target: 'ha detto che non poteva andare da nessuna parte' },
    { id: 'S0376L01U04', known: 'I went somewhere but not anywhere that I wanted', target: 'sono andato da qualche parte ma non da nessuna parte che volevo' },
    { id: 'S0376L01U05', known: 'she was trying to go somewhere but ended up going nowhere', target: 'stava provando a uscire ma non da nessuna parte' },
    { id: 'S0376L01U06', known: "I didn't go anywhere last month", target: 'non sono andato da nessuna parte il mese scorso' },
  ],
};

// ── The new cut ─────────────────────────────────────────────────────────────────────────
const NEW_LEGOS = [
  { idx: 1, id: 'S0376L01', type: 'M', is_new: true, known: "I didn't go", target: 'non sono andato', components: [{ known: "I didn't go", target: 'non sono andato' }], newRow: false },
  { idx: 2, id: 'S0376L02', type: 'M', is_new: true, known: 'anywhere', target: 'da nessuna parte', components: [{ known: 'from', target: 'da' }, { known: 'no', target: 'nessuna' }, { known: 'part', target: 'parte' }], newRow: true },
];
/** Kai's line for L02, byte for byte. Double quotes around the chunk are HIS; the mirror check
 *  learned to read them (services/shared/intro-mirror.cjs quotes(), job #644·I). */
const L02_INTRO = `The Italian for "anywhere" in a negative phrase like 'I didn't go anywhere', is:`;
const L02_EXAMPLE = "I didn't go anywhere";

/** Every phrase row after the cut. `from` names the OLD row whose clips it inherits (same id = re-textured
 *  in place; different id = moved: inserted with the old row's clips, old id deleted). No `from` = new row. */
const PHRASES = [
  // L01 I didn't go → non sono andato (ids kept)
  { id: 'S0376L01B01', from: 'S0376L01B01', role: 'build', position: 1, known: "I didn't go", target: 'non sono andato' },
  { id: 'S0376L01B02', from: 'S0376L01B02', role: 'build', position: 2, known: "I didn't go anywhere", target: 'non sono andato da nessuna parte' },
  { id: 'S0376L01B03', from: 'S0376L01B03', role: 'build', position: 3, known: "I didn't go anywhere yesterday", target: 'non sono andato da nessuna parte ieri' },
  { id: 'S0376L01U01', from: 'S0376L01U01', role: 'use', position: 4, known: "I didn't go to see the film", target: 'non sono andato a vedere il film' },
  { id: 'S0376L01U04', from: 'S0376L01U04', role: 'use', position: 5, known: "I didn't go anywhere with her", target: 'non sono andato da nessuna parte con lei' },
  { id: 'S0376L01U05', from: 'S0376L01U05', role: 'use', position: 6, known: "I wanted to go somewhere but I didn't go anywhere", target: 'volevo andare da qualche parte ma non sono andato da nessuna parte' },
  // L02 anywhere → da nessuna parte (new ids; moved rows keep their clips)
  { id: 'S0376L02C01', from: 'S0376L01C01', role: 'component', position: 1, known: 'from', target: 'da', component_index: 0 },
  { id: 'S0376L02C02', from: 'S0376L01C02', role: 'component', position: 2, known: 'no', target: 'nessuna', component_index: 1 },
  { id: 'S0376L02C03', from: 'S0376L01C03', role: 'component', position: 3, known: 'part', target: 'parte', component_index: 2 },
  { id: 'S0376L02B01', from: 'S0376L01B02', role: 'build', position: 4, known: 'go anywhere', target: 'andare da nessuna parte' },
  { id: 'S0376L02B02', role: 'build', position: 5, known: "she couldn't go anywhere", target: 'non poteva andare da nessuna parte' },
  { id: 'S0376L02U01', from: 'S0376L01U02', role: 'use', position: 6, known: 'she just wanted to stay and not go anywhere', target: 'voleva solo stare e non andare da nessuna parte' },
  { id: 'S0376L02U02', from: 'S0376L01U03', role: 'use', position: 7, known: "she said she couldn't go anywhere", target: 'ha detto che non poteva andare da nessuna parte' },
  { id: 'S0376L02U03', role: 'use', position: 8, known: "I didn't want to go anywhere", target: 'non volevo andare da nessuna parte' },
  { id: 'S0376L02U04', from: 'S0376L01U06', role: 'use', position: 9, known: "I didn't go anywhere last month", target: 'non sono andato da nessuna parte il mese scorso' },
];

// ── The rules, as code ──────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const squash = (s) => norm(s).replace(/\s+/g, '');
const idParts = (id) => ({ seed: Number(id.slice(1, 5)), idx: Number(id.slice(6, 8)), role: { B: 'build', U: 'use', C: 'component' }[id[8]], n: Number(id.slice(9)) });

/** Resolve every phrase row: its source row (if any), whether it is a move, and whether each side's words changed. */
function resolvedPhrases() {
  const old = Object.fromEntries(OLD.phrases.map(p => [p.id, p]));
  return PHRASES.map(p => {
    const src = p.from ? old[p.from] : null;
    if (p.from && !src) throw new Error(`${p.id}: source ${p.from} not in the OLD picture`);
    const parts = idParts(p.id);
    if (parts.role !== p.role) throw new Error(`${p.id}: id says ${parts.role}, row says ${p.role}`);
    const known = p.known, target = p.target;
    const kind = !p.from ? 'add' : p.from === p.id ? 'retexture' : 'move';
    return { ...p, ...parts, before: src, kind, knownChanged: !src || norm(src.known) !== norm(known), targetChanged: !src || norm(src.target) !== norm(target),
      legoId: `S0376L0${parts.idx}`, lego_position: p.role === 'use' ? 'end' : 'middle' };
  });
}
/** Both sides of a phrase carry both sides of its LEGO, as a contiguous span. */
function phraseContainsLego(lego, phrase) {
  return ` ${norm(phrase.target)} `.includes(` ${norm(lego.target)} `) && ` ${norm(phrase.known)} `.includes(` ${norm(lego.known)} `);
}
/** The LEGOs, in order, tile the seed minus its taught tail "last month → il mese scorso" (L30). */
const legosTileSeed = (legos, seed) => squash(seed.target).startsWith(squash(legos.map(l => l.target).join(' '))) && squash(seed.known).startsWith(squash(legos.map(l => l.known).join(' ')))
  && squash(seed.target).slice(squash(legos.map(l => l.target).join(' ')).length) === squash('il mese scorso') && squash(seed.known).slice(squash(legos.map(l => l.known).join(' ')).length) === squash('last month');
/** A LEGO's components tile its TARGET exactly (S3, the live gate's rule). On the known side they either tile it
 *  exactly (L01: the self-component) or are the LITERAL glosses of the target pieces (L11): "anywhere" in the
 *  negative frame is the idiom "da nessuna parte" = from / no / part, and no English tiling of "anywhere" exists —
 *  the learner's tiles show what each Italian word is (K29), which is what the three C rows already said. */
const LITERAL_GLOSSES = { da: 'from', nessuna: 'no', parte: 'part' };
const componentsTile = (l) => l.components.length > 0 && squash(l.components.map(c => c.target).join(' ')) === squash(l.target)
  && (squash(l.components.map(c => c.known).join(' ')) === squash(l.known) || l.components.every(c => LITERAL_GLOSSES[norm(c.target)] === norm(c.known)));
/** K26: a component whose target is a finite person-marked verb carries the person on the known side. Here
 *  the one such component is L01's "non sono andato" and it must say "I". */
const componentsCarryPerson = (legos) => legos.flatMap(l => l.components).filter(c => /\bsono andato\b/.test(norm(c.target)) && !/^i\b/.test(norm(c.known))).map(c => `component "${c.known}" → "${c.target}" drops its person`);
/** Component rows in the table mirror the LEGO's components JSON, in order. */
const componentRowsMirror = (legos, phrases) => legos.flatMap(l => {
  const rows = phrases.filter(p => p.idx === l.idx && p.role === 'component').sort((a, b) => a.position - b.position);
  if (l.components.length === 1 && norm(l.components[0].known) === norm(l.known)) return rows.length ? [`L0${l.idx}: a single self-component needs no C rows (S0371L01 shape) but has ${rows.length}`] : [];
  if (rows.length !== l.components.length) return [`L0${l.idx}: ${rows.length} C rows for ${l.components.length} components`];
  return rows.flatMap((r, i) => norm(r.known) === norm(l.components[i].known) && norm(r.target) === norm(l.components[i].target) ? [] : [`${r.id} "${r.known}" → "${r.target}" is not component ${i} "${l.components[i].known}" → "${l.components[i].target}"`]);
});
/** No phrase text is duplicated within the seed (a duplicate drills nothing twice and collides under ZUT). */
const noDuplicateTexts = (phrases) => { const seen = new Map(); const out = []; for (const p of phrases.filter(p => p.role !== 'component')) { const k = `${norm(p.known)}|${norm(p.target)}`; if (seen.has(k)) out.push(`${p.id} duplicates ${seen.get(k)}: "${p.known}"`); else seen.set(k, p.id); } return out; };
/** The old mistranslation is gone, and its replacement says "I didn't go anywhere" in Italian that carries both LEGOs. */
const u05Rewritten = (phrases) => { const p = phrases.find(p => p.id === 'S0376L01U05'); return p && !/uscire/.test(norm(p.target)) && phraseContainsLego(NEW_LEGOS[0], p) && phraseContainsLego(NEW_LEGOS[1], p); };
/** P26: the seed sentence sits, verbatim, under a NEW LEGO. */
const seedSentencePlayed = (phrases) => phrases.some(p => p.role === 'use' && norm(p.known) === norm(SEED_TEXT.known) && norm(p.target) === norm(SEED_TEXT.target) && NEW_LEGOS.find(l => l.idx === p.idx)?.is_new);
/** Every old row is accounted for: re-textured, moved, or (never) dropped. */
const oldRowsCarried = (phrases) => OLD.phrases.filter(o => !phrases.some(p => p.from === o.id)).map(o => `${o.id} "${o.known}" is dropped`);
/** P10: each new LEGO has ≥1 build and ≥2 use rows. */
const basketsFed = (phrases) => NEW_LEGOS.filter(l => l.is_new).flatMap(l => { const b = phrases.filter(p => p.idx === l.idx && p.role === 'build').length, u = phrases.filter(p => p.idx === l.idx && p.role === 'use').length; return b >= 1 && u >= 2 ? [] : [`L0${l.idx}: ${b} build / ${u} use`]; });
/** Kai's line: quotes the LEGO (double quotes are his), example contains the LEGO, no brackets, no grammar terms. */
function introRules(lego, example, text) {
  const p = [];
  if (!` ${norm(example)} `.includes(` ${norm(lego.known)} `)) p.push('example does not contain the LEGO English');
  if (!text.includes(`"${lego.known}"`) && !text.includes(`'${lego.known}'`)) p.push('line does not quote the LEGO English (mirror)');
  if (!text.includes(`'${example}'`)) p.push('line does not carry the example');
  if (/[()\[\]]/.test(text)) p.push('brackets');
  if (/\b(conditional|perfect|tense|subjunctive|clause|verb|negation|adverb)\b/i.test(text)) p.push('grammar term');
  return p;
}

function checkOffline() {
  const phrases = resolvedPhrases();
  const problems = [];
  if (!legosTileSeed(NEW_LEGOS, SEED_TEXT)) problems.push('LEGOs + "last month" do not tile the seed');
  for (const l of NEW_LEGOS) if (!componentsTile(l)) problems.push(`L0${l.idx} components do not tile the LEGO`);
  problems.push(...componentsCarryPerson(NEW_LEGOS));
  for (const p of phrases) {
    const lego = NEW_LEGOS.find(l => l.idx === p.idx);
    if (!lego) { problems.push(`${p.id}: no LEGO ${p.idx}`); continue; }
    if (p.role !== 'component' && !phraseContainsLego(lego, p)) problems.push(`${p.id} "${p.known}" → "${p.target}" does not contain LEGO ${lego.idx} "${lego.known}" → "${lego.target}" on both sides`);
  }
  problems.push(...componentRowsMirror(NEW_LEGOS, phrases), ...noDuplicateTexts(phrases), ...oldRowsCarried(phrases), ...basketsFed(phrases));
  if (!u05Rewritten(phrases)) problems.push('U05 is not rewritten into a pair carrying both LEGOs');
  if (!seedSentencePlayed(phrases)) problems.push('seed sentence is not a USE row under a new LEGO (P26)');
  const ids = phrases.map(p => p.id);
  if (new Set(ids).size !== ids.length) problems.push('duplicate phrase ids');
  const froms = phrases.filter(p => p.kind === 'move').map(p => p.from);
  // a row may be BOTH the source of a move and kept in its slot only if its slot took NEW words (S0376L01B02's
  // "go anywhere" moves to L02 B01 while the L01 B02 slot becomes "I didn't go anywhere")
  for (const f of froms) { const kept = phrases.find(p => p.id === f); if (kept && !(kept.knownChanged || kept.targetChanged)) problems.push(`${f} is both kept unchanged and moved`); }
  for (const l of NEW_LEGOS) { const pos = phrases.filter(p => p.idx === l.idx).map(p => p.position).sort((a, b) => a - b); if (pos.some((v, i) => v !== i + 1)) problems.push(`L0${l.idx} positions are not 1..n: ${pos}`); }
  problems.push(...introRules(NEW_LEGOS[1], L02_EXAMPLE, L02_INTRO).map(x => `L02 intro: ${x}`));
  return { problems, phrases };
}

// ── Live ────────────────────────────────────────────────────────────────────────────────
/** Words of `text` that occur nowhere in the course at or before `seed`, EXCLUDING the rows of seed 376
 *  itself (the old mistranslation must not vouch for its own replacement). */
async function newVocabulary(pg, seed, text, side) {
  const col = side === 'known' ? 'known_text' : 'target_text';
  // the seed's OWN new LEGOs are the vocabulary it adds ("nessuna" / "anywhere" in the negative frame)
  const taughtHere = new Set(NEW_LEGOS.flatMap(l => norm(side === 'known' ? l.known : l.target).split(' ')));
  const out = [];
  for (const w of new Set(norm(text).split(' ').filter(Boolean))) {
    if (taughtHere.has(w)) continue;
    const { rows } = await pg.query(
      `SELECT 1 FROM (SELECT seed_number, ${col} AS t FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_legos WHERE course_code=$1 UNION ALL SELECT seed_number, ${col} FROM course_seeds WHERE course_code=$1) x
       WHERE seed_number <= $2 AND seed_number <> $4 AND ' '||regexp_replace(lower(replace(t,'’','''')), '[.,!?;:"]', ' ', 'g')||' ' LIKE '% '||$3||' %' LIMIT 1`, [COURSE, seed, w, SEED]);
    if (!rows.length) out.push(w);
  }
  return out;
}
/** NEWNESS of L01: "non sono andato" (and any negated essere-perfect) must occur nowhere before 376 — that is
 *  the ground on which L01 is new rather than a taught combination (L17/L30). Printed and asserted. */
async function newnessEvidence(pg) {
  const q = async (re) => (await pg.query(`SELECT count(*)::int n, min(seed_number) first FROM (SELECT seed_number, target_text FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, target_text FROM course_legos WHERE course_code=$1) x WHERE seed_number < $2 AND target_text ~* $3`, [COURSE, SEED, re])).rows[0];
  const exact = await q('\\mnon sono andato\\M'), anyEssere = await q('\\mnon (sono|sei|è|siamo|siete) (andat|stat|uscit|venut|arrivat|tornat|partit)'), avere = await q('\\mnon ho [a-z]+[ti]o\\M');
  const { rows: [went] } = await pg.query('SELECT lego_id, known_text, target_text, is_new FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0371L01']);
  const { rows: [pos] } = await pg.query('SELECT lego_id, known_text, target_text, is_new FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0182L02']);
  return { 'non sono andato before 376': exact, 'any negated essere-perfect before 376': anyEssere, 'non ho + participle before 376': avere, S0371L01: went, S0182L02: pos };
}
async function guardLive(pg) {
  const problems = [];
  const { rows: [seed] } = await pg.query('SELECT known_text, target_text, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, SEED]);
  if (!seed || seed.known_text !== SEED_TEXT.known || seed.target_text !== SEED_TEXT.target) problems.push(`seed reads "${seed?.known_text}" → "${seed?.target_text}"`);
  const { rows: legos } = await pg.query('SELECT * FROM course_legos WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_index', [COURSE, SEED]);
  const live = legos.map(l => `${l.lego_index}|${l.type}|${l.is_new}|${l.known_text}|${l.target_text}|${JSON.stringify(l.components)}|${l.presentation_audio_id}`).join('\n');
  const want = OLD.legos.map(l => `${l.idx}|${l.type}|${l.is_new}|${l.known}|${l.target}|${JSON.stringify(l.components)}|${l.intro}`).join('\n');
  if (live !== want) problems.push(`LEGOs are not the picture this tool was written against:\n${live}`);
  const { rows: phrases } = await pg.query('SELECT * FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 ORDER BY lego_index, position', [COURSE, SEED]);
  const liveP = phrases.map(p => `${p.id.split(':')[1]}|${p.known_text}|${p.target_text}`).sort().join('\n');
  const wantP = OLD.phrases.map(p => `${p.id}|${p.known}|${p.target}`).sort().join('\n');
  if (liveP !== wantP) problems.push(`phrases are not the picture this tool was written against:\n${liveP}`);
  for (const p of PHRASES.filter(p => !p.from || p.from !== p.id)) if (phrases.some(x => x.id === `${COURSE}:${p.id}`)) problems.push(`${p.id} already exists`);
  const { rows: marks } = await pg.query('SELECT * FROM human_authored_presentations WHERE course_code=$1 AND lego_id LIKE $2', [COURSE, 'S0376%']);
  if (marks.length) problems.push(`unexpected human-authored marks on seed 376: ${marks.map(m => m.lego_id).join(',')}`);
  const ev = await newnessEvidence(pg);
  if (ev['non sono andato before 376'].n !== 0 || ev['any negated essere-perfect before 376'].n !== 0) problems.push(`L01 newness ground fails: ${JSON.stringify(ev)}`);
  if (!ev.S0371L01 || norm(ev.S0371L01.target_text) !== 'sono andato') problems.push('S0371L01 is no longer "sono andato"');
  if (!ev.S0182L02 || norm(ev.S0182L02.target_text) !== 'da qualche parte') problems.push('S0182L02 is no longer "da qualche parte"');
  // concurrency: another surface on these rows in the last 12 hours. #639·I's K26 component-pronoun fix
  // (ita-632-clear-fixes, 23:09Z) IS the state this tool was written against, so it is expected.
  const { rows: evs } = await pg.query(`SELECT id, surface, operation FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '12 hours' AND surface NOT LIKE '%' || $2 || '%' AND (scope->'seed_numbers' ? $3 OR scope->'lego_ids' ?| $4::text[])`,
    [COURSE, SWEEP, String(SEED), ['S0376L01', 'S0376L02']]);
  for (const e of evs) {
    // ita-zut-groupa-fixes (13:36Z) and ita-632-clear-fixes (23:09Z) are IN the picture above; the live-picture guard is what protects against anything later.
    if (/ita-632-clear-fixes|ita-zut-groupa-fixes|ita-intro-mirror-fix|ita-sonia-temporary-fill/.test(e.surface)) continue;
    problems.push(`another surface touched seed ${SEED} today: ${e.surface} ${e.operation} (${e.id})`);
  }
  return { problems, legos, phrases, seedApproved: seed?.approved_at || null, newness: ev };
}

/** Every new pair vs the course: known → one target (component rows exempt). Same target under a different
 *  English is NOT a defect (Kai) — listed only. The ONE expected clash is the L02 LEGO itself against S0182L02
 *  "anywhere → da qualche parte": Kai's cut, disambiguated by his own intro line (K23). */
async function zutAgainstCourse(pg, phrases) {
  const pairs = [...NEW_LEGOS.map(l => ({ id: l.id, known: l.known, target: l.target })), ...phrases.filter(p => p.role !== 'component').map(p => ({ id: p.id, known: p.known, target: p.target }))];
  const clashes = [], targetSide = [], expected = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number<>$2 AND phrase_role<>'component' AND (lower(trim(known_text))=lower($3) OR lower(trim(target_text))=lower($4))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND seed_number<>$2 AND (lower(trim(known_text))=lower($3) OR lower(trim(target_text))=lower($4))`,
      [COURSE, SEED, p.known, p.target]);
    for (const r of rows) {
      const sameK = norm(r.known_text) === norm(p.known), sameT = norm(r.target_text) === norm(p.target);
      const line = `${p.id} "${p.known}" → "${p.target}" vs ${r.id} "${r.known_text}" → "${r.target_text}"`;
      if (sameK && !sameT) (p.id === 'S0376L02' && norm(r.target_text) === 'da qualche parte' ? expected : clashes).push(line);
      else if (sameT && !sameK) targetSide.push(`${p.id} "${p.known}" → "${p.target}" shares its Italian with ${r.id} "${r.known_text}"`);
    }
  }
  return { clashes, expected: [...new Set(expected)], targetSide: [...new Set(targetSide)] };
}
/** Rows outside 376 that lean on "da nessuna parte" / "I didn't go anywhere": their Italian stays taught (L02, L01+L02). A census, not a gate. */
async function downstream(pg) {
  const { rows } = await pg.query(
    `SELECT split_part(id,':',2) id, seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND seed_number<>$2 AND (target_text ILIKE '%nessuna parte%' OR target_text ILIKE '%non sono andato%' OR known_text ~* '\\mdidn''t go\\M')
     UNION ALL SELECT lego_id, seed_number, known_text, target_text FROM course_legos WHERE course_code=$1 AND seed_number<>$2 AND (target_text ILIKE '%nessuna parte%' OR target_text ILIKE '%non sono andato%')
     ORDER BY 2, 1`, [COURSE, SEED]);
  return rows;
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, liveLegos, livePhrases, phrases, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const oldL = liveLegos[0];
  const oldP = Object.fromEntries(livePhrases.map(p => [p.id.split(':')[1], p]));
  const retextured = phrases.filter(p => p.kind === 'retexture' && (p.knownChanged || p.targetChanged));
  const moves = phrases.filter(p => p.kind === 'move'), adds = phrases.filter(p => p.kind === 'add');

  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-recut',
    scope: { seed_numbers: [SEED], lego_ids: NEW_LEGOS.map(l => l.id), rows: 2 },
    detail: { ruling: RULING, job: JOB, from: OLD.legos, to: NEW_LEGOS, newness: log.newness,
      intros: { S0376L01: { from: OLD.legos[0].intro, to: null, why: 'LEGO re-textured; old clip detached and kept; template intro re-authored by ita-intro-mirror-fix --only-seeds 376 (O13)' }, S0376L02: { from: null, to: L02_INTRO, why: "Kai's own line, marked human-authored" } } } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
    scope: { seed_numbers: [SEED], phrase_ids: retextured.map(p => `${COURSE}:${p.id}`), rows: retextured.length },
    detail: { ruling: RULING, job: JOB, changes: retextured.map(p => ({ id: `${COURSE}:${p.id}`, known_from: p.before.known, target_from: p.before.target, known_to: p.known, target_to: p.target })) } });
  const moveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-move',
    scope: { seed_numbers: [SEED], phrase_ids: moves.map(p => `${COURSE}:${p.id}`), rows: moves.length },
    detail: { ruling: RULING, job: JOB, moves: moves.map(p => ({ from: `${COURSE}:${p.from}`, to: `${COURSE}:${p.id}`, lego: p.legoId, position: p.position, known: p.known, target: p.target, clips_kept: !p.knownChanged && !p.targetChanged })) } });
  const addEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-add',
    scope: { seed_numbers: [SEED], phrase_ids: adds.map(p => `${COURSE}:${p.id}`), rows: adds.length },
    detail: { ruling: RULING, job: JOB, rows: adds.map(p => ({ id: `${COURSE}:${p.id}`, lego: p.legoId, known: p.known, target: p.target })) } });
  const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove',
    scope: { seed_numbers: [SEED], rows: 1 }, detail: { why: "seed 376 re-cut under Kai's approval; needs his read", job: JOB, approved_at_before: log.seedApproved } });
  log.events = { legoEvent, phraseEvent, moveEvent, addEvent, seedEvent };

  const insertPhrase = async (p, audio, event) => {
    const metadata = p.role === 'component' ? { buildup: 'component', component_index: p.component_index, source: SWEEP, job: JOB } : { format: 'build_use', source: SWEEP, job: JOB };
    if (p.from && p.from !== p.id) metadata.moved_from = `${COURSE}:${p.from}`;
    const ins = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, known_audio_id, target1_audio_id, target2_audio_id, last_edit_event_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft',$11,'{}',$12,$13,true,$14,$15,$16,$17)`,
      [`${COURSE}:${p.id}`, COURSE, SEED, p.idx, p.position, p.known, p.target, p.target.length, p.target.split(/\s+/).length, JSON.stringify(metadata), p.role, p.lego_position, p.legoId, audio.known, audio.t1, audio.t2, event]);
    if (ins.rowCount !== 1) throw new Error(`${p.id}: insert ${ins.rowCount}`);
  };

  await pg.query('BEGIN');
  try {
    // 1. L02 is a NEW slot (never delete; L01 keeps its slot). No intro yet — the mark comes first, then the clip.
    const l2 = NEW_LEGOS[1];
    // lego_id is a GENERATED column (seed_number + lego_index) — never written.
    const r2 = await pg.query(`INSERT INTO course_legos (course_code, seed_number, lego_index, type, is_new, known_text, target_text, components, status, last_edit_event_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'draft',$9) RETURNING lego_id`,
      [COURSE, SEED, l2.idx, l2.type, l2.is_new, l2.known, l2.target, JSON.stringify(l2.components), legoEvent]);
    if (r2.rowCount !== 1 || r2.rows[0].lego_id !== l2.id) throw new Error(`L02 insert: ${r2.rows[0]?.lego_id}`);
    // 2. Moves: the copy is inserted WITH the old row's clips (its words did not change) before the old id goes.
    for (const p of moves) {
      const src = oldP[p.from];
      await insertPhrase(p, { known: p.knownChanged ? null : src.known_audio_id, t1: p.targetChanged ? null : src.target1_audio_id, t2: p.targetChanged ? null : src.target2_audio_id }, moveEvent);
      // S0376L01B02's old text moves to S0376L02B01 but the L01 row itself is re-textured below, not deleted.
      if (retextured.some(r => r.id === p.from)) continue;
      const del = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${p.from}`, src.known_text, src.target_text]);
      if (del.rowCount !== 1) throw new Error(`${p.from}: delete ${del.rowCount}`);
    }
    // 3. New rows.
    for (const p of adds) await insertPhrase(p, { known: null, t1: null, t2: null }, addEvent);
    // 4. L01 phrase rows re-textured in place (a side whose words did not move keeps its clip), positions renumbered.
    for (const p of phrases.filter(p => p.kind === 'retexture')) {
      const src = oldP[p.id];
      const r = await pg.query(
        `UPDATE course_practice_phrases SET known_text=$1, target_text=$2, known_audio_id=$3, target1_audio_id=$4, target2_audio_id=$5, word_count=$6, lego_count=$7, position=$8, lego_position=$9,
           qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$10, updated_at=now()
         WHERE course_code=$11 AND id=$12 AND known_text=$13 AND target_text=$14`,
        [p.known, p.target, p.knownChanged ? null : src.known_audio_id, p.targetChanged ? null : src.target1_audio_id, p.targetChanged ? null : src.target2_audio_id,
          p.target.length, p.target.split(/\s+/).length, p.position, p.lego_position, phraseEvent, COURSE, `${COURSE}:${p.id}`, src.known_text, src.target_text]);
      if (r.rowCount !== 1) throw new Error(`${p.id}: ${r.rowCount} rows`);
    }
    // 5. L01 re-textured in place. Links set EXPLICITLY (both sides change → all three null); old intro detached, kept, logged.
    const l1 = NEW_LEGOS[0];
    const r1 = await pg.query(
      `UPDATE course_legos SET type=$1, is_new=$2, known_text=$3, target_text=$4, components=$5, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, presentation_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$6, updated_at=now()
        WHERE course_code=$7 AND seed_number=$8 AND lego_index=1 AND known_text=$9`, [l1.type, l1.is_new, l1.known, l1.target, JSON.stringify(l1.components), legoEvent, COURSE, SEED, oldL.known_text]);
    if (r1.rowCount !== 1) throw new Error(`L01: ${r1.rowCount} rows`);
    await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id::text=$1 AND lego_id=$2', [oldL.presentation_audio_id, l1.id]);
    await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, l1.id]);
    const { rows: [oldClip] } = await pg.query('SELECT text, voice_id FROM course_audio WHERE id::text=$1', [oldL.presentation_audio_id]);
    await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason) VALUES ('course_legos',$1,$2,$3,'presentation_audio_id','presentation',$4,$5,$6,$7,$8)`,
      [l1.id, COURSE, SEED, oldL.presentation_audio_id, oldClip?.text || null, oldClip?.voice_id || null, null, `${SWEEP}: LEGO re-cut (job ${JOB}, event ${legoEvent}); template intro re-authored by ita-intro-mirror-fix; clip detached, asset kept`]);
    // 6. The seed loses (or keeps losing) its approval.
    const s = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [seedEvent, COURSE, SEED]);
    if (s.rowCount !== 1) throw new Error('seed unapprove');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: seed 376 re-cut; Italian rendered on Elsa/Benigno by the tool, English prompts on temporary Sonia (ita-sonia-temporary-fill SCOPE=ids), L02 intro (Kai's line) on Sonia, L01 intro by ita-intro-mirror-fix`, metadata: { job: JOB, seeds: [SEED], rows: retextured.length + moves.length + adds.length } });
}

// ── Audio (the 201 re-cut's door, unchanged) ────────────────────────────────────────────
function ttsDeps() {
  process.env.PHASE8_NO_LISTEN = '1';
  return {
    phase8: require('../../services/phases/phase8-audio-v13.cjs'), ttsService: require('../../services/tts-service.cjs'), veracity: require('../../services/audio-veracity.cjs'),
    voiceConfigService: require('../../services/voice-config-service.cjs'), writeOrSwapClip: require('../../services/shared/audio-revision-swap.cjs').writeOrSwapClip,
    normalizeForAudio: require('../../services/shared/text-normalize.cjs').normalizeForAudio, S3: require('@aws-sdk/client-s3'), uuidv4: require('uuid').v4,
  };
}
async function renderClip(supabase, { text, language, role, voice, voiceIds, intro }) {
  const d = ttsDeps();
  const s3 = new d.S3.S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const renderAndMaster = async () => {
    const out = await d.ttsService.generateWithRetry(text, 'azure', { door: { courseCode: COURSE, intro: !!intro, language, voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 });
    if (out.existingClip && !voiceIds.includes(out.existingClip.voice_id)) throw new Error(`door offered ${out.existingClip.voice_id}; ${voice.voiceName} only`);
    const { buffer, durationMs } = await d.phase8.masterAudio(out.audioBuffer, text, await d.voiceConfigService.masteringOptsFor(voice.voiceName, 'azure'));
    return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
  };
  const gated = await d.veracity.renderChecked({ render: renderAndMaster, expectedText: text, language, sampler: d.veracity.ALWAYS_SAMPLER, logger: console, meta: { courseCode: COURSE, role, voiceId: voice.voiceName, originalText: text } });
  if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
  const newAudioId = d.uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
  await s3.send(new d.S3.PutObjectCommand({ Bucket: d.phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
  const verdictColumns = d.veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
  const textNormalized = d.normalizeForAudio(text);
  const base = { course_code: COURSE, text, text_normalized: textNormalized, language, role, voice_id: voice.voiceId, origin: 'tts' };
  const out = await d.writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: textNormalized, language, role, voice_id: voice.voiceId }, insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns }, swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text, ...verdictColumns }, newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${role}, ${voice.voiceName})`, reason: RULING, logger: console });
  return { audioId: out.audioId, durationMs: gated.durationMs };
}
/** Every NULL Italian slot on seed 376: link an existing Elsa/Benigno clip, else render. */
async function fillItalian(pg, supabase, log) {
  const { rows } = await pg.query(
    `SELECT 'course_legos' AS tbl, lego_id AS id, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2
     UNION ALL SELECT 'course_practice_phrases', id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 ORDER BY 2`, [COURSE, SEED]);
  const idCol = (tbl) => tbl === 'course_legos' ? 'lego_id' : 'id';
  for (const r of rows) for (const role of ['target1', 'target2']) {
    if (r[`${role}_audio_id`]) continue;
    const entry = { tbl: r.tbl, id: r.id, role, text: r.target_text }; log.audio.push(entry);
    const voice = role === 'target1' ? ELSA : BENIGNO;
    try {
      const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [r.target_text, AZURE_VOICE_IDS[role], COURSE, role]);
      let audioId = have[0]?.id;
      if (audioId) entry.result = `linked existing ${have[0].voice_id} clip ${audioId}`;
      else { const out = await renderClip(supabase, { text: r.target_text, language: 'ita', role, voice, voiceIds: AZURE_VOICE_IDS[role] }); audioId = out.audioId; entry.result = `rendered ${voice.voiceName} clip ${audioId} (${out.durationMs} ms)`; }
      await pg.query(`UPDATE ${r.tbl} SET ${role}_audio_id=$1 WHERE course_code=$2 AND ${idCol(r.tbl)}=$3 AND target_text=$4 AND ${role}_audio_id IS NULL`, [audioId, COURSE, r.id, r.target_text]);
      const { rows: [now] } = await pg.query(`SELECT a.id, a.voice_id FROM ${r.tbl} x LEFT JOIN course_audio a ON a.id=x.${role}_audio_id WHERE x.course_code=$1 AND x.${idCol(r.tbl)}=$2`, [COURSE, r.id]);
      entry.linked = now?.id || null; entry.linkedVoice = now?.voice_id || null;
      if (!now?.id || !AZURE_VOICE_IDS[role].includes(now.voice_id)) entry.result += ` — SLOT NOT ON CAST VOICE (${now?.voice_id})`;
    } catch (e) { entry.result = `REFUSED/FAILED: ${e.message}`; }
  }
}
/** L02's intro: Kai's line. Mark first (the trigger enforces it), render on Sonia under a temporary presentation cast row, link at all three places the learner path reads. */
async function fillIntro(pg, supabase, log) {
  const humanAuthored = require('../../services/shared/human-authored-presentations.cjs');
  const l2 = NEW_LEGOS[1];
  const { rows: [l] } = await pg.query('SELECT * FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, l2.id]);
  if (!l || norm(l.known_text) !== norm(l2.known)) throw new Error(`${l2.id} is not the new LEGO`);
  if (l.presentation_audio_id) { log.intro = { skipped: `already linked ${l.presentation_audio_id}` }; return; }
  const mark = await humanAuthored.markHumanAuthored(supabase, { courseCode: COURSE, legoId: l2.id, text: L02_INTRO, author: AUTHOR, authoredOn: '2026-09-28', source: `job ${JOB} — Kai's line, P3 of d/197f2605`, lego: l, by: SWEEP, why: RULING });
  log.intro = { mark: mark.id, text: L02_INTRO };
  const castKey = (r) => `${r.slot}|${r.language}|${r.gender}|${r.rank}|${r.voice_id}|${r.notes ?? ''}|${r.assigned_by ?? ''}|${r.created_at?.toISOString?.() ?? r.created_at}|${r.updated_at?.toISOString?.() ?? r.updated_at}`;
  const engCast = async () => (await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='eng' ORDER BY slot, gender, rank, voice_id`)).rows;
  const before = await engCast();
  let audioId = null, durationMs = null;
  const { rows: have } = await pg.query(`SELECT id, duration_ms FROM course_audio WHERE course_code=$1 AND language='eng' AND role='presentation' AND text_normalized=normalize_text($2) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($3) ORDER BY created_at DESC LIMIT 1`, [COURSE, L02_INTRO, SONIA_IDS]);
  if (have[0]) { audioId = have[0].id; durationMs = have[0].duration_ms; log.intro.result = `linked existing Sonia intro clip ${audioId}`; }
  else {
    const { rows: theirs } = await pg.query(`SELECT assigned_by FROM voice_language_roles WHERE slot='presentation' AND language='eng' AND voice_id=$1`, [SONIA.castVoiceId]);
    const ownRow = !theirs.length;
    try {
      if (ownRow) await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [TEMP_PRES_ROW.slot, TEMP_PRES_ROW.language, TEMP_PRES_ROW.gender, TEMP_PRES_ROW.rank, TEMP_PRES_ROW.voice_id, `TEMPORARY — ${RULING}. Removed by the same run.`, SWEEP]);
      const out = await renderClip(supabase, { text: L02_INTRO, language: 'eng', role: 'presentation', voice: SONIA, voiceIds: SONIA_IDS, intro: true });
      audioId = out.audioId; durationMs = out.durationMs; log.intro.result = `rendered Sonia intro clip ${audioId} (${durationMs} ms)`; log.intro.castRow = ownRow ? 'own temporary row' : `rode ${theirs[0].assigned_by}'s temporary row`;
    } finally {
      if (ownRow) await pg.query(`DELETE FROM voice_language_roles WHERE slot=$1 AND language=$2 AND gender=$3 AND rank=$4 AND voice_id=$5 AND assigned_by=$6`, [TEMP_PRES_ROW.slot, TEMP_PRES_ROW.language, TEMP_PRES_ROW.gender, TEMP_PRES_ROW.rank, TEMP_PRES_ROW.voice_id, SWEEP]);
      const after = await engCast();
      log.castRestored = before.length === after.length && before.every((r, i) => castKey(r) === castKey(after[i]));
      if (ownRow && !log.castRestored) throw new Error('eng cast NOT byte-identical after the temporary Sonia presentation row was removed');
    }
  }
  await pg.query('UPDATE course_legos SET presentation_audio_id=$1, last_edit_event_id=COALESCE($2, last_edit_event_id) WHERE course_code=$3 AND lego_id=$4 AND presentation_audio_id IS NULL', [audioId, log.events?.legoEvent || null, COURSE, l2.id]);
  await pg.query(`INSERT INTO lego_introductions (course_code, lego_id, presentation_audio_id, audio_uuid, duration_ms, updated_at) VALUES ($1,$2,$3,$3,$4,now()) ON CONFLICT (course_code, lego_id) DO UPDATE SET presentation_audio_id=EXCLUDED.presentation_audio_id, audio_uuid=EXCLUDED.audio_uuid, duration_ms=COALESCE(EXCLUDED.duration_ms, lego_introductions.duration_ms), updated_at=now()`, [COURSE, l2.id, audioId, durationMs]);
  await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2 AND (lego_id IS NULL OR lego_id<>$1)', [l2.id, audioId]);
  log.intro.audioId = audioId;
}
async function voiceCensus(pg) {
  const { rows } = await pg.query(
    `SELECT x.id, r.role, a.voice_id FROM (
       SELECT lego_id AS id, known_audio_id, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2
       UNION ALL SELECT id, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2) x
     CROSS JOIN LATERAL (VALUES ('known', x.known_audio_id), ('target1', x.target1_audio_id), ('target2', x.target2_audio_id)) r(role, audio_id)
     LEFT JOIN course_audio a ON a.id = r.audio_id ORDER BY 1, 2`, [COURSE, SEED]);
  const off = rows.filter(r => r.role !== 'known' && r.voice_id && !AZURE_VOICE_IDS[r.role].includes(r.voice_id));
  const silent = rows.filter(r => !r.voice_id);
  return { rows, offCast: off.map(r => `${r.id} ${r.role} holds ${r.voice_id}`), silent: silent.map(r => `${r.id} ${r.role}`) };
}
async function silentEnglish(pg) {
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND known_audio_id IS NULL UNION ALL SELECT lego_id FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND known_audio_id IS NULL ORDER BY 1`, [COURSE, SEED]);
  return rows.map(r => r.id);
}

async function main() {
  const APPLY = process.env.APPLY === '1', AUDIO_ONLY = process.env.AUDIO_ONLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, job: JOB, apply: APPLY, started: new Date().toISOString(), problems: [], audio: [] };
  console.log(`\n══ ${COURSE} seed ${SEED} re-cut — ${AUDIO_ONLY ? 'AUDIO ONLY' : APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  const { problems: offline, phrases } = checkOffline();
  log.problems.push(...offline);
  console.log(`offline rules: ${offline.length ? '\n  ' + offline.join('\n  ') : 'LEGOs + "last month" tile the seed, components tile both LEGOs and carry their person, every phrase contains its LEGO both sides, C rows mirror components, no duplicate texts, every old row carried, both baskets fed, U05 rewritten, seed sentence played, Kai\'s intro line quotes the LEGO — all hold'}`);
  if (!AUDIO_ONLY) {
    const live = await guardLive(pg);
    log.problems.push(...live.problems); log.newness = live.newness; log.seedApproved = live.seedApproved;
    console.log(`newness evidence for L01: ${JSON.stringify(live.newness)}`);
    if (!live.problems.length) {
      log.vocab = {};
      for (const p of phrases.filter(p => p.role !== 'component' && (p.knownChanged || p.targetChanged))) {
        const nk = await newVocabulary(pg, SEED, p.known, 'known'), nt = await newVocabulary(pg, SEED, p.target, 'target');
        if (nk.length || nt.length) { log.vocab[p.id] = { known: nk, target: nt }; log.problems.push(`${p.id} introduces vocabulary not taught before seed ${SEED}: ${[...nk, ...nt].join(', ')}`); }
      }
      log.zut = await zutAgainstCourse(pg, phrases);
      log.problems.push(...log.zut.clashes);
      log.downstream = await downstream(pg);
    }
    console.log('\nPLAN:');
    console.log(`  L01  "${OLD.legos[0].known}" → "${OLD.legos[0].target}" [new]  ⇒  "${NEW_LEGOS[0].known}" → "${NEW_LEGOS[0].target}" [NEW]  components ${NEW_LEGOS[0].components.map(c => `${c.known}→${c.target}`).join(' | ')}`);
    console.log(`  L02  (new slot)  ⇒  "${NEW_LEGOS[1].known}" → "${NEW_LEGOS[1].target}" [NEW]  components ${NEW_LEGOS[1].components.map(c => `${c.known}→${c.target}`).join(' | ')}`);
    for (const p of phrases) console.log(`  ${p.id.padEnd(12)} ${p.kind === 'add' ? `NEW "${p.known}" → "${p.target}"` : p.kind === 'move' ? `MOVED from ${p.from}${p.knownChanged || p.targetChanged ? ' (re-texted)' : ' (clips kept)'} "${p.known}" → "${p.target}"` : p.knownChanged || p.targetChanged ? `"${p.before.known}" → "${p.before.target}"  ⇒  "${p.known}" → "${p.target}"` : `(kept) "${p.known}" → "${p.target}"`}`);
    console.log(`  intro L01: detached (template line re-authored by ita-intro-mirror-fix --only-seeds 376)  |  intro L02: ${L02_INTRO}  (human-authored mark, Kai's line)`);
    console.log(`  unapprove seed ${SEED} (approved_at before: ${log.seedApproved || 'already NULL'})`);
    if (log.zut?.expected?.length) { console.log('\nEXPECTED ZUT strict rise (Kai\'s cut; his intro line is the K23 disambiguation):'); for (const t of log.zut.expected) console.log('  ' + t); }
    if (log.zut?.targetSide?.length) { console.log('\nsame Italian under a different English elsewhere (not a defect — listed):'); for (const t of log.zut.targetSide) console.log('  ' + t); }
    if (log.downstream) { console.log(`\ndownstream rows outside seed ${SEED} carrying "da nessuna parte" / "non sono andato" / "didn't go" (${log.downstream.length}; their Italian is still taught by the new L01/L02):`); for (const d of log.downstream) console.log(`  ${String(d.id).padEnd(12)} "${d.known_text}" → "${d.target_text}"`); }
    console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nguards hold: live picture matches, L01 newness grounded, no untaught vocabulary, no unexpected known→target ZUT clash');
    if (APPLY && !log.problems.length) { await applyContent(pg, supabase, live.legos, live.phrases, phrases, log); console.log(`APPLIED. events=${JSON.stringify(log.events)} audioPass=${JSON.stringify(log.audioPass)}`); }
  }
  if (APPLY && !log.problems.length) {
    await fillItalian(pg, supabase, log);
    console.log('ITALIAN AUDIO:'); for (const a of log.audio) console.log(`  ${a.tbl}.${a.id} ${a.role} "${a.text}": ${a.result}`);
    try { await fillIntro(pg, supabase, log); console.log(`INTRO L02: ${JSON.stringify(log.intro)} castRestored=${log.castRestored}`); } catch (e) { log.problems.push(`intro: ${e.message}`); console.log(`INTRO FAILED: ${e.message}`); }
    log.silentEnglish = await silentEnglish(pg);
    console.log(`ENGLISH prompts to fill on temporary Sonia (${log.silentEnglish.length}):\n  SCOPE=ids IDS=${log.silentEnglish.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result))) log.problems.push('some Italian slots were not filled — see audio');
    log.voices = await voiceCensus(pg);
    console.log(`VOICE CENSUS: ${log.voices.rows.length} slots; off-cast Italian: ${log.voices.offCast.length}; silent: ${log.voices.silent.length}${log.voices.silent.length ? ' (' + log.voices.silent.join(', ') + ')' : ''}`);
    for (const o of log.voices.offCast) { console.log('  OFF-CAST ' + o); log.problems.push('off-cast Italian slot: ' + o); }
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${AUDIO_ONLY ? 'audio' : APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { OLD, NEW_LEGOS, PHRASES, SEED_TEXT, L02_INTRO, L02_EXAMPLE, resolvedPhrases, phraseContainsLego, legosTileSeed, componentsTile, componentsCarryPerson, componentRowsMirror, noDuplicateTexts, u05Rewritten, seedSentencePlayed, oldRowsCarried, basketsFed, introRules, checkOffline };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });

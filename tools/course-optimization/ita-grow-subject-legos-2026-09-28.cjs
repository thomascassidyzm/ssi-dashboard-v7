#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-grow-subject-legos-2026-09-28.cjs
//
// ita_for_eng — KAI'S APPROVAL (2026-09-28 22:20Z, job #622·I): the five LEGOs job #577·I listed
// for him because their seed's subject is a SUBJECT WORD the LEGO left out (what / nobody / who /
// nothing) GROW to include that word. K28 gives a noun-subject LEGO its pronoun; a LEGO whose
// subject is itself a word cannot take an invented pronoun, so the LEGO grows instead — re-textured
// in place, never deleted (Kai, 2026-09-23), is_new kept TRUE (the learning app only plays baskets
// of new LEGOs: ssi-learning-app packages/player-vue/src/providers/generateLearningScript.ts).
//
//   S0347L01  was happening           → what was happening            | che cosa stava succedendo
//   S0367L01  told me                 → nobody told me                | nessuno me l'ha detto
//   S0390L02  is standing             → who is standing               | che sta in piedi
//   S0391L01  is walking              → who is walking                | che sta camminando
//   S0485L01  would make me happier   → nothing would make me happier | niente mi renderebbe più felice
//
// COMPONENTS tile the grown LEGO on the Italian side (contiguous), and the new word becomes a
// component row (C03, component_index 0, position 1 — the 599 precedent inserts a row and shifts
// positions). On S0367L01 the English components stay the literal glosses they always were
// ("to me + said it" never tiled "told me": L23) and gain "nobody" — listed for Kai, not hidden.
//
// PHRASES: every build/use row under a grown LEGO must contain the grown LEGO on BOTH sides
// (Kai's total rule). A row that lost containment is re-written from vocabulary the course has
// already taught at that seed (no new words: ieri 30, sapere 45, andare 25, chiedere/laggiù earlier
// in the same seeds); a row that duplicated the grown LEGO's own B01 gets a new build. KNOCK-ON in
// the same seeds: S0347L02B03's Italian said more than its English (trimmed); S0367L01B03 lacked
// the seed's "no," (added); S0390L03B02/B03 and S0391L02U02/U03 glossed "the one standing /
// walking" where "who is standing | che sta in piedi" is now the taught chunk (aligned). Every
// phrase elsewhere in the course was checked for the same chunks (`knockOn`): the "what was
// happening → quello che stava succedendo" rows (relative, not interrogative) are correct Italian
// and are LISTED, never changed.
//
// AFTER THE EDIT: seeds unapproved; changed Italian slots linked to an existing Elsa/Benigno clip
// or rendered on Azure Elsa/Benigno through the guarded door (never Cartesia); changed English
// slots detached for ita-sonia-temporary-fill (SCOPE=ids; Charlotte re-voice list); intros
// re-mirrored by ita-intro-mirror-fix --only-seeds (Sonia, temporary cast row restored byte for
// byte; a human-authored line is listed, never rewritten); audio-pass request queued; round index
// refreshed. Seeds 201/246/348/608/618/112/126/520/396 belong to sibling jobs and are never touched.
//
//   node tools/course-optimization/ita-grow-subject-legos-2026-09-28.cjs            # plan (dry run, no writes)
//   APPLY=1 node tools/course-optimization/ita-grow-subject-legos-2026-09-28.cjs    # write + Italian audio + intros
//   AUDIO_ONLY=1 node tools/course-optimization/ita-grow-subject-legos-2026-09-28.cjs  # after apply: fill still-silent Italian slots (incl. C03 rows), list English for Sonia
//   node … --report-from <applied.json> --out <file.md> [--zut-before a.json --zut-after b.json] [--sonia fill.json]

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const JOB = '#622·I';
const SWEEP = 'ita-grow-subject-legos-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-28 22:20Z (job #622·I): grow the five subject-word LEGOs (what / nobody / who / nothing) to include their subject word; re-texture in place, is_new stays true; phrases must contain the grown LEGO';
const HELD_SEEDS = [201, 246, 348, 608, 618, 112, 126, 520, 396];
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };

// ── Rules ─────────────────────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const squash = (s) => norm(s).replace(/\s+/g, '');
/** Live gate's phrase-contains-LEGO rule: word multiset. */
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}
const sameWords = (a, b) => containsWords(a, b) && words(a).length === words(b).length;
/** A phrase contains its LEGO on both sides (Kai's total rule: build AND use). */
const phraseContainsLego = (p, l) => containsWords(p.known, l.known) && containsWords(p.target, l.target);
/** Components tile the LEGO: Italian contiguous (a component is a literal slice), English as a word multiset. */
const componentsTileTarget = (l) => squash(l.components.map((c) => c.target).join(' ')) === squash(l.target);
const componentsTileKnown = (l) => sameWords(l.components.map((c) => c.known).join(' '), l.known);

// ── The five LEGOs — Kai's approved forms, quoted so the decision is checkable by eye ───────
const LEGOS = [
  { id: 'S0347L01', seed: 347, sentence: 'he wanted to know what was happening a week ago', subjectWord: 'what',
    from: { known: 'was happening', target: 'stava succedendo', components: [{ known: 'was', target: 'stava' }, { known: 'happening', target: 'succedendo' }] },
    to: { known: 'what was happening', target: 'che cosa stava succedendo', components: [{ known: 'what', target: 'che cosa' }, { known: 'was', target: 'stava' }, { known: 'happening', target: 'succedendo' }] } },
  { id: 'S0367L01', seed: 367, sentence: 'no nobody told me', subjectWord: 'nobody', literalKnownComponents: true,
    from: { known: 'told me', target: "me l'ha detto", components: [{ known: 'to me', target: 'me' }, { known: 'said it', target: "l'ha detto" }] },
    to: { known: 'nobody told me', target: "nessuno me l'ha detto", components: [{ known: 'nobody', target: 'nessuno' }, { known: 'to me', target: 'me' }, { known: 'said it', target: "l'ha detto" }] } },
  { id: 'S0390L02', seed: 390, sentence: 'the one who is standing near the entrance', subjectWord: 'who',
    from: { known: 'is standing', target: 'sta in piedi', components: [{ known: 'is', target: 'sta' }, { known: 'standing', target: 'in piedi' }] },
    to: { known: 'who is standing', target: 'che sta in piedi', components: [{ known: 'who', target: 'che' }, { known: 'is', target: 'sta' }, { known: 'standing', target: 'in piedi' }] } },
  { id: 'S0391L01', seed: 391, sentence: 'the one who is walking towards the bus', subjectWord: 'who',
    from: { known: 'is walking', target: 'sta camminando', components: [{ known: 'is', target: 'sta' }, { known: 'walking', target: 'camminando' }] },
    to: { known: 'who is walking', target: 'che sta camminando', components: [{ known: 'who', target: 'che' }, { known: 'is', target: 'sta' }, { known: 'walking', target: 'camminando' }] } },
  { id: 'S0485L01', seed: 485, sentence: 'nothing would make me happier than to get away', subjectWord: 'nothing',
    from: { known: 'would make me happier', target: 'mi renderebbe più felice', components: [{ known: 'would make', target: 'mi renderebbe' }, { known: 'me happier', target: 'più felice' }] },
    to: { known: 'nothing would make me happier', target: 'niente mi renderebbe più felice', components: [{ known: 'nothing', target: 'niente' }, { known: 'would make', target: 'mi renderebbe' }, { known: 'me happier', target: 'più felice' }] } },
];
/** The new component row per LEGO: C03, component_index 0, position 1 (the existing C01/C02 rows shift to indices 1/2). */
const newComponentRow = (L) => ({ id: `${L.id}C03`, seed: L.seed, lego_index: Number(L.id.slice(-2)), known: L.to.components[0].known, target: L.to.components[0].target });

// ── Phrase changes: before → after, with the reason. `why` starts with the bucket the report groups by. ─
const P = (id, seed, bk, bt, ak, at, why) => ({ id, seed, before: { known: bk, target: bt }, after: { known: ak, target: at }, why });
const PHRASES = [
  // seed 347 — L01 grew to "what was happening | che cosa stava succedendo"
  P('S0347L01B01', 347, 'was happening', 'stava succedendo', 'what was happening', 'che cosa stava succedendo', 'lego: B01 is the LEGO itself'),
  P('S0347L01B02', 347, 'what was happening', 'che cosa stava succedendo', 'know what was happening', 'sapere che cosa stava succedendo', 'dup: B02 duplicated the grown B01 — a new build from taught vocabulary (sapere, seed 45)'),
  P('S0347L01U05', 347, "I'm sure she was worried about what was happening", 'sono sicuro che era preoccupata per quello che stava succedendo', "I'm sure she wanted to know what was happening", 'sono sicuro che voleva sapere che cosa stava succedendo', 'contain: the Italian said "quello che" (relative), which does not contain the grown LEGO — replaced from taught vocabulary'),
  P('S0347L01U01', 347, 'he wanted to know what was happening', 'voleva sapere che cosa stava succedendo', 'I wanted to know what was happening', 'volevo sapere che cosa stava succedendo', 'dup: U01 duplicated B03 word for word (pre-existing) — first person instead (volevo, seed 30)'),
  P('S0347L02B03', 347, 'he wanted to know a week ago', 'voleva sapere che cosa stava succedendo una settimana fa', 'he wanted to know a week ago', 'voleva sapere una settimana fa', 'knock-on: the Italian said "che cosa stava succedendo" where the English did not — trimmed to what the English says'),
  // seed 367 — L01 grew to "nobody told me | nessuno me l'ha detto"
  P('S0367L01B01', 367, 'told me', "me l'ha detto", 'nobody told me', "nessuno me l'ha detto", 'lego: B01 is the LEGO itself'),
  P('S0367L01B02', 367, 'nobody told me', "nessuno me l'ha detto", 'nobody told me yesterday', "nessuno me l'ha detto ieri", 'dup: B02 duplicated the grown B01 — a new build from taught vocabulary (ieri, seed 30)'),
  P('S0367L01B03', 367, 'no nobody told me', "nessuno me l'ha detto", 'no nobody told me', "no, nessuno me l'ha detto", 'knock-on: the seed says "no, nessuno me l\'ha detto"; the phrase\'s Italian had dropped the "no,"'),
  P('S0367L01U04', 367, 'he told me that she felt like going out', "me l'ha detto che lei aveva voglia di uscire", 'nobody told me that she felt like going out', "nessuno me l'ha detto che lei aveva voglia di uscire", 'contain: "he told me" does not contain "nobody told me" — subject changed, rest kept'),
  P('S0367L01U06', 367, 'she told me what was happening', "me l'ha detto di quello che stava succedendo", 'nobody told me what was happening', "nessuno me l'ha detto di quello che stava succedendo", 'contain: "she told me" does not contain "nobody told me" — subject changed, rest kept'),
  // seed 390 — L02 grew to "who is standing | che sta in piedi"
  P('S0390L02B01', 390, 'is standing', 'sta in piedi', 'who is standing', 'che sta in piedi', 'lego: B01 is the LEGO itself'),
  P('S0390L02B03', 390, 'she is standing over there', 'lei sta in piedi laggiù', 'the one who is standing over there', 'quella che sta in piedi laggiù', 'contain: "she is standing" has no "who" — the seed\'s own frame instead'),
  P('S0390L02U01', 390, 'the one who is standing over there', 'quella che sta in piedi laggiù', 'I asked the one who is standing', 'ho chiesto a quella che sta in piedi', 'dup: the old U01 moved to B03 — a new use from this seed\'s vocabulary (ho chiesto a, L03U01)'),
  P('S0390L02U05', 390, 'is she still standing over there?', 'sta ancora in piedi laggiù?', 'the one who is standing over there asked me', 'quella che sta in piedi laggiù mi ha chiesto', 'contain: "is she still standing" has no "who" and splits "sta … in piedi" — replaced from this seed\'s vocabulary'),
  P('S0390L03B02', 390, 'standing near the entrance', 'sta in piedi vicino all\'ingresso', 'who is standing near the entrance', 'che sta in piedi vicino all\'ingresso', 'knock-on: "standing" glossed "sta in piedi"; now that "who is standing | che sta in piedi" is the taught chunk the build says it'),
  P('S0390L03B03', 390, 'the one standing near the entrance', 'quella che sta vicino all\'ingresso', 'the one who is standing near the entrance', 'quella che sta in piedi vicino all\'ingresso', 'knock-on: "the one standing" glossed "quella che sta" (no "in piedi") against the taught chunk — aligned to the seed'),
  P('S0390L03U05', 390, 'the one who is standing near the entrance', 'quella che sta in piedi vicino all\'ingresso', 'I asked the one who is standing near the entrance', 'ho chiesto a quella che sta in piedi vicino all\'ingresso', 'dup: the seed sentence moved to B03 — a new use from this seed\'s vocabulary'),
  // seed 391 — L01 grew to "who is walking | che sta camminando"
  P('S0391L01B01', 391, 'is walking', 'sta camminando', 'who is walking', 'che sta camminando', 'lego: B01 is the LEGO itself'),
  P('S0391L01B03', 391, 'she is walking over there', 'lei sta camminando laggiù', 'the one who is walking over there', 'quello che sta camminando laggiù', 'contain: "she is walking" has no "who" — the seed\'s own frame instead'),
  P('S0391L01U02', 391, 'the one who is walking over there', 'quello che sta camminando laggiù', 'I asked the one who is walking', 'ho chiesto a quello che sta camminando', 'dup: the old U02 moved to B03 — a new use from this seed\'s vocabulary (ho chiesto a, L02U02)'),
  P('S0391L01U04', 391, 'is she still walking?', 'sta ancora camminando?', 'the one who is walking didn\'t ask', 'quello che sta camminando non ha chiesto', 'contain: "is she still walking" has no "who" and splits "sta … camminando" — replaced from this seed\'s vocabulary (non ha chiesto, S0390L01U04)'),
  P('S0391L02U02', 391, 'I asked the one walking towards the bus', 'ho chiesto a quello che sta camminando verso l\'autobus', 'I asked the one who is walking towards the bus', 'ho chiesto a quello che sta camminando verso l\'autobus', 'knock-on: "the one walking" glossed "quello che sta camminando"; the English now says the taught chunk'),
  P('S0391L02U03', 391, 'did you see the one walking towards the bus?', 'hai visto quello che sta camminando verso l\'autobus?', 'did you see the one who is walking towards the bus?', 'hai visto quello che sta camminando verso l\'autobus?', 'knock-on: as U02'),
  // seed 485 — L01 grew to "nothing would make me happier | niente mi renderebbe più felice"
  P('S0485L01B01', 485, 'would make me happier', 'mi renderebbe più felice', 'nothing would make me happier', 'niente mi renderebbe più felice', 'lego: B01 is the LEGO itself'),
  P('S0485L01B02', 485, 'nothing would make me happier', 'niente mi renderebbe più felice', 'nothing would make me happier than to know', 'niente mi renderebbe più felice che sapere', 'dup: B02 duplicated the grown B01 — a new build (than + infinitive, the pattern of U01/U04; sapere, seed 45)'),
  P('S0485L01B03', 485, 'it would make me happier to wait', 'mi renderebbe più felice aspettare', 'nothing would make me happier than to go', 'niente mi renderebbe più felice che andare', 'contain: "it would make me happier" has no "nothing" — replaced (than + infinitive; andare, seed 25)'),
];
/** Rows elsewhere in the course that carry the same English chunk under a different Italian — checked, LISTED, never changed. */
const KNOCK_ON_CHUNKS = [
  { known: 'what was happening', target: 'che cosa stava succedendo', note: '"quello che stava succedendo" is the relative ("that which was happening"), correct after mi piaceva / preoccupata per / me l\'ha detto di; "che cosa" is the indirect question after sapere. Both are right Italian; listed so you see them' },
  { known: 'nobody told me', target: "nessuno me l'ha detto" },
  { known: 'who is standing', target: 'che sta in piedi' },
  { known: 'who is walking', target: 'che sta camminando' },
  { known: 'nothing would make me happier', target: 'niente mi renderebbe più felice' },
];

// ── The plan (pure: rows in, decisions out) ────────────────────────────────────────────────
const short = (id) => String(id).replace(/^ita_for_eng:/, '');
function plan(rows) {
  const byId = {}; for (const r of rows) byId[r.id] = r;
  const problems = [], notes = [];
  for (const L of LEGOS) {
    const live = byId[L.id];
    if (!live) { problems.push(`${L.id}: not live`); continue; }
    if (live.known !== L.from.known || live.target !== L.from.target) problems.push(`${L.id}: live reads "${live.known}" | "${live.target}", expected "${L.from.known}" | "${L.from.target}"`);
    if (JSON.stringify(live.components) !== JSON.stringify(L.from.components)) problems.push(`${L.id}: live components are ${JSON.stringify(live.components)}`);
    if (live.is_new !== true) problems.push(`${L.id}: is_new is ${live.is_new} — this job keeps it true and expects it true`);
    if (!containsWords(L.to.known, L.from.known) || !containsWords(L.to.target, L.from.target)) problems.push(`${L.id}: the grown LEGO does not contain the old one`);
    if (!new RegExp(`\\b${L.subjectWord}\\b`).test(L.to.known)) problems.push(`${L.id}: grown English lacks the subject word "${L.subjectWord}"`);
    if (!componentsTileTarget(L.to)) problems.push(`${L.id}: components do not tile the Italian "${L.to.target}"`);
    if (!componentsTileKnown(L.to)) { if (L.literalKnownComponents) notes.push(`${L.id}: English components are literal glosses (${L.to.components.map((c) => c.known).join(' + ')}) and do not tile "${L.to.known}" — they never did (L23); Italian tiles`); else problems.push(`${L.id}: components do not tile the English "${L.to.known}"`); }
    if (byId[`${L.id}C03`]) problems.push(`${L.id}C03 already exists`);
    if (HELD_SEEDS.includes(L.seed)) problems.push(`${L.id}: seed ${L.seed} is held by a sibling job`);
  }
  for (const c of PHRASES) {
    const live = byId[c.id];
    if (!live) { problems.push(`${c.id}: not live`); continue; }
    if (live.known !== c.before.known || live.target !== c.before.target) problems.push(`${c.id}: live reads "${live.known}" | "${live.target}", expected "${c.before.known}" | "${c.before.target}"`);
    if (live.kind === 'component') problems.push(`${c.id}: is a component row`);
    if (HELD_SEEDS.includes(c.seed)) problems.push(`${c.id}: seed ${c.seed} is held`);
  }
  // the AFTER state of every phrase under each grown LEGO: total containment, no duplicate text inside one LEGO
  const after = rows.map((r) => { const c = PHRASES.find((x) => x.id === r.id); return c ? { ...r, known: c.after.known, target: c.after.target } : r; });
  const kept = [];
  for (const L of LEGOS) {
    const under = after.filter((r) => r.id.startsWith(L.id) && r.id !== L.id && (r.kind === 'build' || r.kind === 'use'));
    for (const p of under) {
      if (!phraseContainsLego(p, L.to)) problems.push(`${p.id}: "${p.known}" | "${p.target}" does not contain the grown LEGO "${L.to.known}" | "${L.to.target}"`);
      if (!PHRASES.some((x) => x.id === p.id)) kept.push({ id: p.id, lego: L.to.known, known: p.known, target: p.target });
    }
    const seen = new Map();
    for (const p of under) { const k = norm(p.known) + '|' + norm(p.target); if (seen.has(k)) problems.push(`${p.id} duplicates ${seen.get(k)}: "${p.known}"`); seen.set(k, p.id); }
  }
  // knock-on phrases under the seeds' OTHER LEGOs still contain their own LEGO on both sides after the edit
  for (const c of PHRASES) {
    const lid = c.id.slice(0, 8); const l = byId[lid]; if (!l || LEGOS.some((L) => L.id === lid)) continue;
    if (!phraseContainsLego(c.after, l)) problems.push(`${c.id}: after "${c.after.known}" | "${c.after.target}" no longer contains its own LEGO "${l.known}" | "${l.target}"`);
  }
  // knock-on elsewhere in the course: the grown English chunk under a different Italian, or vice versa — listed
  const knockOn = [];
  for (const K of KNOCK_ON_CHUNKS) for (const r of after) {
    if (r.kind === 'component' || LEGOS.some((L) => L.id === r.id)) continue;
    const hasK = containsWords(r.known, K.known), hasT = containsWords(r.target, K.target);
    if (hasK !== hasT) knockOn.push({ id: r.id, seed: r.sn, chunk: K.known, known: r.known, target: r.target, side: hasK ? 'English has the chunk, Italian differs' : 'Italian has the chunk, English differs', note: K.note || '' });
  }
  return { problems, notes, kept, knockOn, legos: LEGOS.map((L) => ({ id: L.id, seed: L.seed, from: L.from, to: L.to, sentence: L.sentence, newRow: newComponentRow(L) })), phrases: PHRASES };
}

// ── Live ─────────────────────────────────────────────────────────────────────────────────
async function loadRows(pg) {
  const { rows } = await pg.query(
    `SELECT 'lego' AS kind, seed_number AS sn, lego_id AS id, known_text AS known, target_text AS target, components, is_new FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, seed_number, id, known_text, target_text, NULL, NULL FROM course_practice_phrases WHERE course_code=$1 ORDER BY 2, 3`, [COURSE]);
  return rows.map((r) => ({ ...r, sn: Number(r.sn), id: short(r.id) }));
}
async function zutAgainstCourse(pg, D) {
  const ours = new Set([...D.phrases.map((c) => c.id), ...D.legos.map((l) => l.id)]);
  const pairs = [...D.legos.map((l) => ({ id: l.id, known: l.to.known, target: l.to.target })), ...D.phrases.map((c) => ({ id: c.id, ...c.after }))];
  const clashes = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND id<>$4 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$5 AND ((lower(trim(known_text))=lower($2) AND lower(trim(target_text))<>lower($3)) OR (lower(trim(target_text))=lower($3) AND lower(trim(known_text))<>lower($2)))`,
      [COURSE, p.known, p.target, `${COURSE}:${p.id}`, p.id]);
    for (const r of rows.filter((r) => !ours.has(short(r.id)))) clashes.push({ change: p.id, pair: `"${p.known}" → "${p.target}"`, vs: `${short(r.id)} "${r.known_text}" → "${r.target_text}"`, k2: r.known_text.trim().toLowerCase() === p.known.toLowerCase() });
  }
  return clashes;
}

async function applyContent(pg, supabase, D, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const seeds = [...new Set([...D.legos.map((l) => l.seed), ...D.phrases.map((c) => c.seed)])].sort((a, b) => a - b);
  const ev = (op, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: op, scope, detail });
  const legoEvent = await ev('lego-edit', { seed_numbers: D.legos.map((l) => l.seed), lego_ids: D.legos.map((l) => l.id), rows: D.legos.length }, { ruling: RULING, job: JOB, changes: D.legos.map((l) => ({ id: l.id, from: l.from, to: l.to, newComponentRow: l.newRow, is_new: 'kept true' })) });
  const phraseEvent = await ev('phrase-edit', { seed_numbers: seeds, phrase_ids: D.phrases.map((c) => `${COURSE}:${c.id}`), rows: D.phrases.length }, { ruling: RULING, job: JOB, changes: D.phrases.map((c) => ({ id: `${COURSE}:${c.id}`, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target, why: c.why })) });
  const unapproveEvent = await ev('unapprove', { seed_numbers: seeds, rows: seeds.length }, { why: 'five subject-word LEGOs grown under Kai\'s approval of 2026-09-28; need his read', job: JOB });
  log.events = { legoEvent, phraseEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    for (const l of D.legos) {
      // both sides move; is_new is NOT touched (must stay true); known + Italian clips cleared explicitly
      const u = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8 AND is_new=true`,
        [l.to.known, l.to.target, JSON.stringify(l.to.components), legoEvent, COURSE, l.id, l.from.known, l.from.target]);
      if (u.rowCount !== 1) throw new Error(`${l.id}: ${u.rowCount} rows`);
      // new component row at position 1: shift every row of this lego up by one (descending; unique (seed, lego, position)), existing C rows' component_index +1
      const { rows: [{ max }] } = await pg.query('SELECT max(position) AS max FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [COURSE, l.seed, l.newRow.lego_index]);
      for (let p = Number(max); p >= 1; p--) await pg.query('UPDATE course_practice_phrases SET position=$1 WHERE course_code=$2 AND seed_number=$3 AND lego_index=$4 AND position=$5', [p + 1, COURSE, l.seed, l.newRow.lego_index, p]);
      await pg.query(`UPDATE course_practice_phrases SET metadata = jsonb_set(metadata, '{component_index}', to_jsonb((metadata->>'component_index')::int + 1)) WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3 AND phrase_role='component' AND metadata ? 'component_index'`, [COURSE, l.seed, l.newRow.lego_index]);
      await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, introduce, last_edit_event_id)
        VALUES ($1,$2,$3,$4,1,$5,$6,$7,$8,$9,'draft','component','{}','middle',true,$10)`,
        [`${COURSE}:${l.newRow.id}`, COURSE, l.seed, l.newRow.lego_index, l.newRow.known, l.newRow.target, l.newRow.target.length, l.newRow.target.split(/\s+/).length, JSON.stringify({ buildup: 'component', component_index: 0 }), legoEvent]);
    }
    for (const c of D.phrases) {
      const knownMoved = c.before.known !== c.after.known, targetMoved = c.before.target !== c.after.target;
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL,
          known_audio_id = CASE WHEN $10 THEN NULL ELSE known_audio_id END, target1_audio_id = CASE WHEN $11 THEN NULL ELSE target1_audio_id END, target2_audio_id = CASE WHEN $11 THEN NULL ELSE target2_audio_id END,
          last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target, knownMoved, targetMoved]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, seeds]);
    log.unapproved = { seeds, rows: un.rowCount };
    const { rows: still } = await pg.query('SELECT lego_id FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2) AND is_new=true', [COURSE, D.legos.map((l) => l.id)]);
    if (still.length !== D.legos.length) throw new Error('is_new is no longer true on every grown LEGO');
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: five subject-word LEGOs grown (Kai's approval) and ${D.phrases.length} phrases; Italian on Elsa/Benigno by the tool, English prompts on temporary Sonia (ita-sonia-temporary-fill SCOPE=ids), intros re-mirrored`, metadata: { job: JOB, seeds, rows: D.phrases.length + D.legos.length } });
}

// ── Italian audio: link an existing Elsa/Benigno clip, else render on Azure through the guarded door ──
async function fillItalian(pg, supabase, D, log) {
  const { rows } = await pg.query(
    `SELECT 'course_legos' AS tbl, lego_id AS id, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)
     UNION ALL SELECT 'course_practice_phrases', id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($3)`,
    [COURSE, D.legos.map((l) => l.id), [...D.phrases.map((c) => `${COURSE}:${c.id}`), ...D.legos.map((l) => `${COURSE}:${l.newRow.id}`)]]);
  const slots = [];
  for (const r of rows) for (const role of ['target1', 'target2']) if (!r[`${role}_audio_id`]) slots.push({ tbl: r.tbl, id: r.id, role, text: r.target_text });
  const idCol = (tbl) => (tbl === 'course_legos' ? 'lego_id' : 'id');
  const link = async (slot, audioId) => (await pg.query(`UPDATE ${slot.tbl} SET ${slot.role}_audio_id=$1 WHERE course_code=$2 AND ${idCol(slot.tbl)}=$3 AND target_text=$4 AND ${slot.role}_audio_id IS NULL`, [audioId, COURSE, slot.id, slot.text])).rowCount === 1;
  const current = async (slot) => (await pg.query(`SELECT ${slot.role}_audio_id AS id FROM ${slot.tbl} WHERE course_code=$1 AND ${idCol(slot.tbl)}=$2`, [COURSE, slot.id])).rows[0]?.id || null;
  log.italian = [];
  for (const slot of slots) {
    const entry = { ...slot }; log.italian.push(entry);
    const { rows: have } = await pg.query(`SELECT id, voice_id FROM course_audio WHERE language='ita' AND text_normalized=normalize_text($1) AND s3_key IS NOT NULL AND voice_id = ANY($2) ORDER BY (course_code=$3) DESC, (role=$4) DESC, created_at DESC LIMIT 1`, [slot.text, AZURE_VOICE_IDS[slot.role], COURSE, slot.role]);
    if (have[0]) {
      const already = await current(slot);
      entry.result = `linked existing ${have[0].voice_id} clip ${have[0].id}`;
      entry.linked = already ? (already === have[0].id || `slot already holds ${already}`) : await link(slot, have[0].id);
      continue;
    }
    entry.result = await renderItalian(supabase, slot, link, current);
    entry.linked = (await current(slot)) !== null;
  }
}
async function renderItalian(supabase, slot, link, current) {
  process.env.PHASE8_NO_LISTEN = '1';
  const phase8 = require('../../services/phases/phase8-audio-v13.cjs');
  const ttsService = require('../../services/tts-service.cjs');
  const veracity = require('../../services/audio-veracity.cjs');
  const voiceConfigService = require('../../services/voice-config-service.cjs');
  const { writeOrSwapClip } = require('../../services/shared/audio-revision-swap.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const { v4: uuidv4 } = require('uuid');
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const logger = console;
  const voice = slot.role === 'target1' ? ELSA : BENIGNO;
  try {
    const renderAndMaster = async () => {
      const out = await ttsService.generateWithRetry(slot.text, 'azure', { door: { courseCode: COURSE, intro: false, language: 'ita', voiceBound: true }, subscriptionKey: process.env.AZURE_SPEECH_KEY, region: process.env.AZURE_SPEECH_REGION || 'westeurope', voiceName: voice.voiceName, speed: 1 });
      if (out.existingClip && !AZURE_VOICE_IDS[slot.role].includes(out.existingClip.voice_id)) throw new Error(`door offered ${out.existingClip.voice_id}; Azure only`);
      const { buffer, durationMs } = await phase8.masterAudio(out.audioBuffer, slot.text, await voiceConfigService.masteringOptsFor(voice.voiceName, 'azure'));
      return { buffer, durationMs, wordBoundaries: out.wordBoundaries };
    };
    const gated = await veracity.renderChecked({ render: renderAndMaster, expectedText: slot.text, language: 'ita', sampler: veracity.ALWAYS_SAMPLER, logger, meta: { courseCode: COURSE, role: slot.role, voiceId: voice.voiceName, phrase_id: slot.id, originalText: slot.text } });
    if (!gated.published) throw new Error(`veracity gate: quarantined after ${gated.attempts} attempts (${gated.verdict?.reason})`);
    const newAudioId = uuidv4().toUpperCase(), newS3Key = `mastered/${newAudioId}.mp3`;
    await s3.send(new PutObjectCommand({ Bucket: phase8.S3_BUCKET, Key: newS3Key, Body: gated.buffer, ContentType: 'audio/mpeg', CacheControl: 'public, max-age=31536000, immutable' }));
    const verdictColumns = veracity.verdictColumns(gated.verdict, { checker: SWEEP, attempts: gated.attempts });
    const textNormalized = normalizeForAudio(slot.text);
    const base = { course_code: COURSE, text: slot.text, text_normalized: textNormalized, language: 'ita', role: slot.role, voice_id: voice.voiceId, origin: 'tts' };
    const out = await writeOrSwapClip({ supabase, identity: { course_code: COURSE, text_normalized: textNormalized, language: 'ita', role: slot.role, voice_id: voice.voiceId }, insertRow: { ...base, s3_key: newS3Key, duration_ms: gated.durationMs, word_boundaries: gated.wordBoundaries || null, ...verdictColumns }, swapPatch: { voice_id: voice.voiceId, origin: 'tts', word_boundaries: gated.wordBoundaries || null, text: slot.text, ...verdictColumns }, newS3Key, durationMs: gated.durationMs, source: SWEEP, acceptedBy: `${SWEEP} (${slot.role}, ${voice.voiceName})`, reason: RULING, logger });
    if (!(await current(slot))) await link(slot, out.audioId);
    return `rendered ${voice.voiceName} clip ${out.audioId} (${gated.durationMs} ms)`;
  } catch (e) { return `REFUSED/FAILED: ${e.message}`; }
}
function reMirrorIntros(log, seeds) {
  const { spawnSync } = require('child_process');
  const script = path.join(__dirname, 'ita-intro-mirror-fix-2026-09-28.cjs');
  const r = spawnSync(process.execPath, [script, '--only-seeds', seeds.join(',')], { encoding: 'utf8', env: { ...process.env, APPLY: '1', INTRO_MIRROR_AT_EXIT: '0' }, timeout: 20 * 60 * 1000 });
  log.introFix = { status: r.status, tail: String(r.stdout || '').split('\n').slice(-40).join('\n'), stderr: String(r.stderr || '').slice(-4000) };
  return r.status;
}

// ── Report (phone-readable before → after) ────────────────────────────────────────────────
function report(D, extra) {
  const L = [];
  L.push(`# ita_for_eng — five subject-word LEGOs grown: before → after (job ${JOB}, 2026-09-28)`, '');
  L.push(`**Your approval (22:20Z):** grow the five LEGOs #577·I listed to include their subject word, re-textured in place, never deleted. All five stay **is_new = true** (the learning app only plays baskets of new LEGOs). Components tile the grown Italian; every phrase under each LEGO now contains it on both sides; seeds unapproved; Italian on Elsa/Benigno, English prompts and intros on temporary Sonia (Charlotte re-voice list).`, '');
  if (extra.zut) L.push(`**ZUT (strict bidirectional, audit-phrase-zut):** ${extra.zut.before} → ${extra.zut.after}. ${extra.zut.newly.length ? 'New: ' + extra.zut.newly.join('; ') : 'None new.'} ${extra.zut.resolved.length ? 'Resolved: ' + extra.zut.resolved.join('; ') : ''}`, '');
  if (extra.unapproved) L.push(`**Seeds unapproved:** ${extra.unapproved.join(', ')}.`, '');
  L.push('## The five LEGOs', '', '| Seed | LEGO | Before | After | Components now | The sentence |', '|---|---|---|---|---|---|');
  for (const l of D.legos) L.push(`| ${l.seed} | ${l.id} | ${l.from.known} → ${l.from.target} | **${l.to.known} → ${l.to.target}** | ${l.to.components.map((c) => `${c.known} → ${c.target}`).join(' / ')} | ${l.sentence} |`);
  if (D.notes.length) { L.push('', '**Note:**'); for (const n of D.notes) L.push(`- ${n}`); }
  L.push('', '## Phrases changed', '', '| Seed | Row | Before | After | Why |', '|---|---|---|---|---|');
  for (const c of D.phrases) L.push(`| ${c.seed} | ${c.id} | ${c.before.known} → ${c.before.target} | **${c.after.known} → ${c.after.target}** | ${c.why} |`);
  L.push('', '## Phrases kept under a grown LEGO (already contain it)', '', '| Row | LEGO now | Phrase | Italian |', '|---|---|---|---|');
  for (const k of D.kept) L.push(`| ${k.id} | ${k.lego} | ${k.known} | ${k.target} |`);
  if (D.knockOn.length) {
    L.push('', '## Elsewhere in the course — same English chunk, different Italian (listed, not changed)', '', '| Seed | Row | English | Italian | Which side |', '|---|---|---|---|---|');
    for (const k of D.knockOn) L.push(`| ${k.seed} | ${k.id} | ${k.known} | ${k.target} | ${k.side} |`);
    const noted = [...new Set(D.knockOn.map((k) => k.note).filter(Boolean))]; for (const n of noted) L.push('', `*${n}*`);
  }
  if (extra.forKai && extra.forKai.length) { L.push('', '## For you', ''); for (const f of extra.forKai) L.push(`- ${f}`); }
  if (extra.italian) L.push('', '## Italian audio', '', extra.italian);
  if (extra.sonia) L.push('', '## English re-voiced on temporary Sonia — Charlotte re-voice list', '', extra.sonia);
  if (extra.intros) L.push('', '## Intros re-mirrored (temporary Sonia)', '', extra.intros);
  return L.join('\n');
}
const FOR_KAI = [
  'Seed 390: L01 is still "the one who | quella che" and L02 is now "who is standing | che sta in piedi", so the two share "who | che" — the seed no longer tiles cleanly (the one who + who is standing + near the entrance). Left as you approved; if you would rather, L01 can be re-cut to "the one | quella" (che is taught as "who/that" long before 390).',
  'Seed 367: the use phrases keep their pre-existing pattern "nessuno me l\'ha detto di / che …" (U01 "nessuno me l\'ha detto di cosa voleva coltivare" etc.). Natural Italian would be "nessuno mi ha detto che cosa …", which does not contain the LEGO. Not changed — your call whether that set is worth re-cutting.',
  'Seed 367: the English components stay literal glosses (nobody + to me + said it) under the grown LEGO, as they were (L23); the Italian tiles.',
];

async function main() {
  const APPLY = process.env.APPLY === '1';
  const argv = process.argv.slice(2);
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : null; };
  if (arg('--report-from')) {
    const applied = JSON.parse(fs.readFileSync(arg('--report-from'), 'utf8'));
    const extra = { unapproved: applied.unapproved?.seeds, forKai: FOR_KAI };
    if (arg('--zut-before') && arg('--zut-after')) {
      const b = JSON.parse(fs.readFileSync(arg('--zut-before'), 'utf8')), a = JSON.parse(fs.readFileSync(arg('--zut-after'), 'utf8'));
      const key = (g) => g.known_norm; const bk = new Set(b.bidirectionalStrict.map(key)), ak = new Set(a.bidirectionalStrict.map(key));
      const show = (g) => `"${g.known_norm}" → ${g.distinct_targets.map((t) => `"${t.example.target}" (${t.example.seed} ${t.example.phrase_role || 'lego'})`).join(' / ')}`;
      extra.zut = { before: b.counts.bidirectional.strict, after: a.counts.bidirectional.strict, newly: a.bidirectionalStrict.filter((g) => !bk.has(key(g))).map(show), resolved: b.bidirectionalStrict.filter((g) => !ak.has(key(g))).map(show) };
    }
    if (applied.italian) extra.italian = ['| Row | Slot | Italian | Result |', '|---|---|---|---|', ...applied.italian.map((x) => `| ${short(x.id)} | ${x.role} | ${x.text} | ${x.result}${x.linked === true ? ' → linked' : x.linked ? ` (${x.linked})` : ''} |`)].join('\n');
    if (arg('--sonia')) { const f = JSON.parse(fs.readFileSync(arg('--sonia'), 'utf8')); extra.sonia = ['| Row | English | Clip |', '|---|---|---|', ...(f.filled || []).map((x) => `| ${short(x.id)} | ${x.text} | ${x.result || x.audioId || ''} |`)].join('\n'); }
    if (arg('--intros')) extra.intros = fs.readFileSync(arg('--intros'), 'utf8');
    const md = report(applied.plan, extra); fs.writeFileSync(arg('--out'), md); console.log(`report → ${arg('--out')} (${md.length} chars)`); return;
  }
  const { Client } = require('pg');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, apply: APPLY, started: new Date().toISOString() };
  try {
    if (process.env.AUDIO_ONLY === '1') {
      // After apply: fill any slot of the job's rows (LEGOs, phrases, the new C03 component rows) still silent on the
      // Italian side — link-or-render, idempotent (only NULL slots) — and print the English ids for the Sonia fill.
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
      const D = { legos: LEGOS.map((L) => ({ id: L.id, newRow: newComponentRow(L) })), phrases: PHRASES };
      await fillItalian(pg, supabase, D, log);
      console.log('ITALIAN AUDIO (audio-only pass):'); for (const a of log.italian) console.log(`  ${a.tbl}.${short(a.id)} ${a.role} "${a.text}": ${a.result}${a.linked === true ? ' → linked' : a.linked ? ` (${a.linked})` : ''}`);
      const { rows: silent } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND known_audio_id IS NULL AND id = ANY($2) UNION ALL SELECT lego_id FROM course_legos WHERE course_code=$1 AND known_audio_id IS NULL AND lego_id = ANY($3)`, [COURSE, [...PHRASES.map((c) => `${COURSE}:${c.id}`), ...D.legos.map((l) => `${COURSE}:${l.newRow.id}`)], LEGOS.map((L) => L.id)]);
      console.log(`ENGLISH still silent (${silent.length}): ${silent.length ? 'SCOPE=ids IDS=' + silent.map((r) => r.id).join(',') + ' APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs' : 'none'}`);
      const f = evidencePath(`tools/course-optimization/${SWEEP}/audio-only-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
      return;
    }
    const rows = await loadRows(pg);
    const D = plan(rows);
    console.log(`\n══ ${COURSE} — grow the five subject-word LEGOs — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
    for (const l of D.legos) console.log(`  LEGO ${l.id}  "${l.from.known}" | "${l.from.target}"  →  "${l.to.known}" | "${l.to.target}"   components ${l.to.components.map((c) => `${c.known}→${c.target}`).join(' | ')}`);
    for (const c of D.phrases) console.log(`  ${c.id}  "${c.before.known}" | "${c.before.target}"  →  "${c.after.known}" | "${c.after.target}"   (${c.why.split(':')[0]})`);
    console.log(`kept under the grown LEGOs (already contain them): ${D.kept.length}; knock-on rows elsewhere listed: ${D.knockOn.length}`);
    for (const k of D.knockOn) console.log(`  listed ${k.id} "${k.known}" | "${k.target}" — ${k.side}`);
    for (const n of D.notes) console.log(`  note: ${n}`);
    const clashes = await zutAgainstCourse(pg, D);
    console.log(`ZUT against the course: ${clashes.length ? '\n  ' + clashes.map((z) => `${z.k2 ? 'K2 HOLD' : 'two Englishes, one Italian (not a defect)'}: ${z.change} ${z.pair} vs ${z.vs}`).join('\n  ') : 'no clash'}`);
    for (const z of clashes.filter((z) => z.k2)) D.problems.push(`ZUT K2: ${z.change} ${z.pair} vs ${z.vs}`);
    log.plan = D; log.zutInTool = clashes;
    if (D.problems.length) console.log('\nPROBLEMS:\n  ' + D.problems.join('\n  ')); else console.log('\nguards hold: live text matches, is_new true, components tile the Italian, every phrase under each grown LEGO contains it on both sides, no duplicate, no held seed, no K2 clash');
    if (APPLY && !D.problems.length) {
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
      await applyContent(pg, supabase, D, log);
      console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)} audioPass=${JSON.stringify(log.audioPass)}`);
      await fillItalian(pg, supabase, D, log);
      console.log('ITALIAN AUDIO:'); for (const a of log.italian) console.log(`  ${a.tbl}.${short(a.id)} ${a.role} "${a.text}": ${a.result}${a.linked === true ? ' → linked' : a.linked ? ` (${a.linked})` : ''}`);
      const seeds = log.unapproved.seeds;
      const st = reMirrorIntros(log, seeds);
      console.log(`intro re-mirror: exit ${st}\n${log.introFix.tail}`);
      const ids = [...D.legos.map((l) => l.id), ...D.phrases.filter((c) => c.before.known !== c.after.known).map((c) => `${COURSE}:${c.id}`)];
      log.soniaIds = ids;
      console.log(`\nENGLISH prompts to fill on temporary Sonia (${ids.length}):\n  SCOPE=ids IDS=${ids.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    }
    const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
    if (D.problems.length) process.exitCode = 2;
  } finally { await pg.end(); }
}

module.exports = { plan, LEGOS, PHRASES, containsWords, sameWords, phraseContainsLego, componentsTileTarget, componentsTileKnown, newComponentRow };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });

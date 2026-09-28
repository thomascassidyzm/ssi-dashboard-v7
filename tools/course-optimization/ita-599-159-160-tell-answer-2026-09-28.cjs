#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-599-159-160-tell-answer-2026-09-28.cjs
//
// ita_for_eng — four of Kai's rulings of 2026-09-28 (job #559·I), applied in one pass:
//
//  1. SEED 599. LEGO S0599L01 grows to cover "to drive": "I would have been happy to drive" →
//     "sarei stato felice di guidare", so L01 + L02 ("if you'd told me → se me l'avessi detto")
//     tile the seed. Components tile the LEGO on both sides (a third component "to drive → di
//     guidare" is added). Every build/use phrase under L01 must CONTAIN the grown LEGO: the
//     "happy to help / wait / stay / explain / share / go" rows become natural phrases containing
//     "happy to drive", using only vocabulary the course has taught by seed 599 (checked live).
//     The intro mirrors the grown LEGO ("The Italian for: 'I would have been happy to drive', is:").
//  2. SEED 159. S0159L02U02/U03/U06 say "it" in English; the Italian gets its pronoun: "sto
//     provando a dirlo …". dirlo is introduced at seed 61 (LEGO S0061L02 "say it → dirlo"), well
//     before 159. The LEGO S0159L02 is "sto provando a dire": the phrase-contains-LEGO check is a
//     word-multiset check, and "dirlo" is not the word "dire" — so THIS TOOL RECORDS THE EXCEPTION
//     (STEM_CLITIC below: a LEGO word "dire" is contained by "dir + clitic") rather than bending
//     the rule anywhere else. Kai, 2026-09-28: "if the check is strict, record the exception in the
//     tool rather than bending the rule elsewhere."
//  3. TELL / ANSWER take the say-it/that/this pronoun pairing (job #543) where it is smooth:
//     tell it ↔ -lo, tell that ↔ dire quello, tell this ↔ dire questo; answer it/that/this ↔
//     rispondere / rispondere a quello / rispondere a questo. "that" as a conjunction ("told me
//     that he …") is NOT this rule. English is fixed first; Italian only if unnatural. Rows where
//     English carries no object for an Italian lo ("if you'd told me → se me l'avessi detto") are
//     natural on both sides and are LISTED, not written.
//  4. "come si dice questa" → "questo" wherever no feminine noun follows; "questa parola" stays.
//
// Every seed touched is unapproved. Presentations mirror any changed LEGO in the same pass.
// Changed Italian is re-voiced on the course's Italian cast (Azure Elsa / Benigno) through the
// guarded TTS door; changed English on the temporary Azure Sonia route (Kai ruled Azure OK, intros
// included) — prompts by tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs with
// SCOPE=ids (run after this tool; the ids are printed), the S0599L01 intro by this tool under a
// temporary presentation cast row that is deleted in a finally block and verified byte-identical.
// Every Sonia clip is on the Charlotte re-voice list by construction.
//
//   node tools/course-optimization/ita-599-159-160-tell-answer-2026-09-28.cjs           # dry run: census, plan, guards
//   APPLY=1 node tools/course-optimization/ita-599-159-160-tell-answer-2026-09-28.cjs   # write + Italian renders + intro
//   AUDIO_ONLY=1 APPLY=1 node …                                                         # re-run the audio fill only

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-599-159-160-tell-answer-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#559·I';
const RULING = 'Kai, 2026-09-28 (job #559·I): seed 599 L01 grows to "happy to drive"; seed 159 U02/U03/U06 take dirlo; tell/answer + it/that/this pair like say; come si dice questa → questo without a feminine noun';
const ELSA = { voiceId: 'azure_it-IT-ElsaNeural', voiceName: 'it-IT-ElsaNeural' };
const BENIGNO = { voiceId: 'azure_it-IT-BenignoNeural', voiceName: 'it-IT-BenignoNeural' };
const AZURE_VOICE_IDS = { target1: ['azure_it-IT-ElsaNeural', 'it-IT-ElsaNeural'], target2: ['azure_it-IT-BenignoNeural', 'it-IT-BenignoNeural'] };
const SONIA = { voiceId: 'azure_en-GB-SoniaNeural', castVoiceId: 'en-GB-SoniaNeural', voiceName: 'en-GB-SoniaNeural' };
const SONIA_IDS = ['azure_en-GB-SoniaNeural', 'en-GB-SoniaNeural'];
const TEMP_PRES_ROW = { slot: 'presentation', language: 'eng', gender: 'f', rank: 1, voice_id: SONIA.castVoiceId };

// ── Rules (pure; the test exercises these) ─────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => norm(s).split(' ').filter(Boolean);
const squash = (s) => norm(s).replace(/\s+/g, '');

/**
 * THE RECORDED EXCEPTION (ruling 2, Kai 2026-09-28): a LEGO word "dire" is contained by the same
 * verb carrying an enclitic pronoun — "dirlo" (say it), "dirla", "dirli", "dirle", "dirmi", "dirti",
 * "dirci", "dirvi", "dirgli", "dirglielo", "dirmelo", "dirtelo", "dircelo", "dirvelo". Nothing else
 * is relaxed: the check is still the live gate's word-multiset rule, one word per LEGO word.
 */
const STEM_CLITIC = { dire: /^dir(?:lo|la|li|le|mi|ti|ci|vi|gli|glielo|gliela|melo|mela|telo|tela|celo|cela|velo|vela)$/ };
/** Live gate's phrase-contains-LEGO rule: word MULTISET (reordering tolerated), plus STEM_CLITIC. */
function containsWords(hay, needle, { clitic = true } = {}) {
  const h = words(hay);
  for (const w of words(needle)) {
    let i = h.indexOf(w);
    if (i < 0 && clitic && STEM_CLITIC[w]) i = h.findIndex(x => STEM_CLITIC[w].test(x));
    if (i < 0) return false;
    h.splice(i, 1);
  }
  return true;
}
const componentsTile = (l) => squash(l.components.map(c => c.target).join(' ')) === squash(l.target) && squash(l.components.map(c => c.known).join(' ')) === squash(l.known);
const expandId = (s) => norm(s).replace(/\bi'd\b/g, 'i would');
/** Ruling 1: L01 + L02 tile seed 599 on both sides (the seed's "I'd" is the LEGO's "I would"). */
const legosTileSeed = (seed, l1, l2) => squash(l1.target + l2.target) === squash(seed.target) && squash(expandId(l1.known) + expandId(l2.known)) === squash(expandId(seed.known));

/** Ruling 4: "come si dice questa" needs a feminine noun after it; "questo" otherwise. */
const FEM_NOUNS_AFTER_QUESTA = ['parola'];
function questaDefect(target) {
  const m = norm(target).match(/\bsi dice questa\b(?:\s+(\S+))?/);
  if (!m) return false;
  return !FEM_NOUNS_AFTER_QUESTA.includes(m[1] || '');
}
const questaFix = (target) => target.replace(/\b(si dice) questa\b(?!\s+(?:parola)\b)/gi, '$1 questo');

/**
 * Ruling 3: tell/answer + it/that/this as the OBJECT — the pronoun must end the clause (end of
 * string or punctuation); a following word makes "that" a conjunction or a determiner ("told me
 * that he…", "told me that story") and is not this rule.
 */
const RE_TELL_OBJ = /\b(tell|tells|told|telling)(?:\s+(?:me|you|him|her|us|them))?\s+(it|that|this)(?=\s*$|\s*[,.!?;:])/i;
const RE_ANSWER_OBJ = /\b(answer|answers|answered|answering)\s+(it|that|this)(?=\s*$|\s*[,.!?;:])/i;
const RE_IT_LO = /(?<![a-zà-ù'])(?:(?:me|te|ce|ve|glie)\s*(?:lo|l')|(?:lo|l')\s+(?:ho|hai|ha|abbiamo|avete|hanno|avevo|avevi|aveva|avrei|avresti|avrebbe|avremmo|avrebbero)\s+detto|dir(?:lo|glielo|melo|telo|celo|velo)|dirl')/i;
const RE_QUELLO = /\b(?:dett[oa]|dire|dir[a-z]*|raccont[a-z]*|rispondere a|risposto a)\s+quello\b(?!\s+che\b)/i;
const RE_QUESTO = /\b(?:dett[oa]|dire|dir[a-z]*|raccont[a-z]*|rispondere a|risposto a)\s+questo\b(?!\s+che\b)/i;
function tellAnswerClassify(known, target) {
  const m = String(known || '').match(RE_TELL_OBJ) || String(known || '').match(RE_ANSWER_OBJ);
  const t = String(target || '');
  const has = { it: RE_IT_LO.test(t), that: RE_QUELLO.test(t), this: RE_QUESTO.test(t) };
  if (!m) {
    // English drops the object where Italian carries lo (te lo dicessi, se me l'avessi detto): natural both sides — list only
    if (/\b(tell|tells|told|telling)\b/i.test(known) && has.it) return { scope: 'tell-no-object', ok: true, want: null };
    return { scope: null, ok: true, want: null };
  }
  const pron = m[2].toLowerCase();
  const italian = has.it ? 'it' : has.that ? 'that' : has.this ? 'this' : null;
  if (!italian) return { scope: 'tell-answer', ok: true, want: null, note: 'no pronoun object on the Italian side (conjunction / other verb)' };
  return { scope: 'tell-answer', ok: italian === pron, want: italian, verb: m[1] };
}
function tellAnswerRewrite(known, cls) {
  if (cls.ok || !cls.want) return null;
  return known.replace(RE_TELL_OBJ, (m0, v, p) => m0.replace(new RegExp(`\\b${p}\\b$`), cls.want)).replace(RE_ANSWER_OBJ, (m0, v, p) => m0.replace(new RegExp(`\\b${p}\\b$`), cls.want));
}

// ── The changes ────────────────────────────────────────────────────────────────────────
const SEED_599 = { known: "I'd have been happy to drive if you'd told me", target: "sarei stato felice di guidare se me l'avessi detto" };
const OLD_L01 = { known: 'I would have been happy', target: 'sarei stato felice', components: [{ known: 'I would have been', target: 'sarei stato' }, { known: 'happy', target: 'felice' }] };
const NEW_L01 = { known: 'I would have been happy to drive', target: 'sarei stato felice di guidare', components: [{ known: 'I would have been', target: 'sarei stato' }, { known: 'happy', target: 'felice' }, { known: 'to drive', target: 'di guidare' }] };
const L02 = { known: "if you'd told me", target: "se me l'avessi detto" };
const OLD_INTRO_599 = { audioId: '3a5840ce-7c07-433d-83eb-d2b9b2c07840', text: "The Italian for: 'I would have been happy', is:" };
const NEW_INTRO_599 = "The Italian for: 'I would have been happy to drive', is:";
const NEW_COMPONENT = { id: 'S0599L01C03', position: 3, known: 'to drive', target: 'di guidare', component_index: 2 };

/** Phrase rows: before → after. `side` says which text moves (the other is asserted unchanged). */
const CHANGES = [
  // ── 1. seed 599, every non-component row under L01 contains the grown LEGO ──
  { rule: 1, seed: 599, lego: 'S0599L01', id: 'S0599L01B01', side: 'both', before: { known: 'I would have been happy', target: 'sarei stato felice' }, after: { known: 'I would have been happy to drive', target: 'sarei stato felice di guidare' } },
  { rule: 1, seed: 599, lego: 'S0599L01', id: 'S0599L01B02', side: 'both', before: { known: 'I would have been happy to drive', target: 'sarei stato felice di guidare' }, after: { known: 'I would have been happy to drive today', target: 'sarei stato felice di guidare oggi' } },
  { rule: 1, seed: 599, lego: 'S0599L01', id: 'S0599L01B03', side: 'both', before: { known: 'I would have been happy to go', target: 'sarei stato felice di andare' }, after: { known: 'I would have been happy to drive again', target: 'sarei stato felice di guidare di nuovo' } },
  { rule: 1, seed: 599, lego: 'S0599L01', id: 'S0599L01U01', side: 'both', before: { known: 'I would have been happy to help', target: 'sarei stato felice di aiutare' }, after: { known: 'I would have been happy to drive with you', target: 'sarei stato felice di guidare con te' } },
  { rule: 1, seed: 599, lego: 'S0599L01', id: 'S0599L01U02', side: 'both', before: { known: 'I would have been happy to wait', target: 'sarei stato felice di aspettare' }, after: { known: 'I think I would have been happy to drive', target: 'penso che sarei stato felice di guidare' } },
  { rule: 1, seed: 599, lego: 'S0599L01', id: 'S0599L01U03', side: 'both', before: { known: 'I would have been happy to stay', target: 'sarei stato felice di restare' }, after: { known: 'I would have been happy to drive on Saturday', target: 'sarei stato felice di guidare sabato' } },
  { rule: 1, seed: 599, lego: 'S0599L01', id: 'S0599L01U04', side: 'both', before: { known: 'I would have been happy to explain', target: 'sarei stato felice di spiegare' }, after: { known: 'I would have been happy to drive home', target: 'sarei stato felice di guidare fino a casa' } },
  { rule: 1, seed: 599, lego: 'S0599L01', id: 'S0599L01U05', side: 'both', before: { known: 'I would have been happy to share', target: 'sarei stato felice di condividere' }, after: { known: 'of course I would have been happy to drive', target: 'certo che sarei stato felice di guidare' } },
  // ── 2. seed 159: the Italian takes its pronoun (dirlo, seed 61) ──
  { rule: 2, seed: 159, lego: 'S0159L02', id: 'S0159L02U02', side: 'target', before: { known: "I'm trying to say it differently", target: 'sto provando a dire diversamente' }, after: { known: "I'm trying to say it differently", target: 'sto provando a dirlo diversamente' } },
  { rule: 2, seed: 159, lego: 'S0159L02', id: 'S0159L02U03', side: 'target', before: { known: "I'm trying to say it, but I can't", target: 'sto provando a dire, ma non posso' }, after: { known: "I'm trying to say it, but I can't", target: 'sto provando a dirlo, ma non posso' } },
  { rule: 2, seed: 159, lego: 'S0159L02', id: 'S0159L02U06', side: 'target', before: { known: "I'm trying to say it in the same way", target: 'sto provando a dire nello stesso modo' }, after: { known: "I'm trying to say it in the same way", target: 'sto provando a dirlo nello stesso modo' } },
  // ── 3. tell / answer: English first ──
  { rule: 3, seed: 148, lego: 'S0148L02', id: 'S0148L02U01', side: 'known', before: { known: "I couldn't answer that", target: 'non riuscivo a rispondere a questo' }, after: { known: "I couldn't answer this", target: 'non riuscivo a rispondere a questo' } },
  { rule: 3, seed: 148, lego: 'S0148L02', id: 'S0148L02U07', side: 'known', before: { known: "she said I couldn't answer that", target: 'ha detto che non riuscivo a rispondere a questo' }, after: { known: "she said I couldn't answer this", target: 'ha detto che non riuscivo a rispondere a questo' } },
  { rule: 3, seed: 149, lego: 'S0149L01', id: 'S0149L01U09', side: 'known', before: { known: 'I told you that, so I hope you think about it', target: 'ti ho detto questo, quindi spero che ci pensi' }, after: { known: 'I told you this, so I hope you think about it', target: 'ti ho detto questo, quindi spero che ci pensi' } },
  // "te l'ho già detto" is the natural Italian and "told you it" is not English: the English drops the object, as
  // the course already does for te lo dicessi / se me l'avessi detto. Flagged for Kai in the report as a judgement.
  { rule: 3, seed: 244, lego: 'S0244L01', id: 'S0244L01U02', side: 'known', judgement: true, before: { known: "I've already told you this", target: "te l'ho già detto" }, after: { known: "I've already told you", target: "te l'ho già detto" } },
  // ── 4. come si dice questa → questo (no feminine noun follows) ──
  { rule: 4, seed: 160, lego: 'S0160L01', id: 'S0160L01B03', side: 'target', before: { known: 'how do you say this?', target: 'come si dice questa?' }, after: { known: 'how do you say this?', target: 'come si dice questo?' } },
  { rule: 4, seed: 160, lego: 'S0160L01', id: 'S0160L01B04', side: 'target', before: { known: 'how do you say this?', target: 'come si dice questa?' }, after: { known: 'how do you say this?', target: 'come si dice questo?' } },
  { rule: 4, seed: 160, lego: 'S0160L01', id: 'S0160L01U04', side: 'target', before: { known: 'can you tell me how you say this?', target: 'puoi dirmi come si dice questa?' }, after: { known: 'can you tell me how you say this?', target: 'puoi dirmi come si dice questo?' } },
  { rule: 4, seed: 160, lego: 'S0160L01', id: 'S0160L01U07', side: 'target', before: { known: 'how do you say this in the same way?', target: 'come si dice questa nello stesso modo?' }, after: { known: 'how do you say this in the same way?', target: 'come si dice questo nello stesso modo?' } },
];
const SEEDS = [...new Set(CHANGES.map(c => c.seed))].sort((a, b) => a - b);
const LEGO_IDS = [...new Set(CHANGES.map(c => c.lego))];

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
async function firstSeedOf(pg, target) {
  const { rows } = await pg.query(`SELECT min(seed_number) AS first FROM (SELECT seed_number, target_text FROM course_practice_phrases WHERE course_code=$1 UNION ALL SELECT seed_number, target_text FROM course_legos WHERE course_code=$1) x WHERE ' '||lower(target_text)||' ' LIKE '% '||$2||' %'`, [COURSE, target]);
  return rows[0]?.first;
}
async function guardLive(pg, problems) {
  const { rows: [s] } = await pg.query('SELECT known_text, target_text FROM course_seeds WHERE course_code=$1 AND seed_number=599', [COURSE]);
  if (!s || s.known_text !== SEED_599.known || s.target_text !== SEED_599.target) problems.push(`seed 599 reads "${s?.known_text}" → "${s?.target_text}"`);
  const { rows: [l] } = await pg.query('SELECT known_text, target_text, components, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0599L01']);
  if (!l || l.known_text !== OLD_L01.known || l.target_text !== OLD_L01.target || JSON.stringify(l.components) !== JSON.stringify(OLD_L01.components)) problems.push(`S0599L01 reads "${l?.known_text}" → "${l?.target_text}" ${JSON.stringify(l?.components)}`);
  if (l && l.presentation_audio_id !== OLD_INTRO_599.audioId) problems.push(`S0599L01 presentation link is ${l.presentation_audio_id}`);
  const { rows: [l2] } = await pg.query('SELECT known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0599L02']);
  if (!l2 || l2.known_text !== L02.known || l2.target_text !== L02.target) problems.push(`S0599L02 reads "${l2?.known_text}" → "${l2?.target_text}"`);
  const { rows: pos } = await pg.query('SELECT id, position FROM course_practice_phrases WHERE course_code=$1 AND seed_number=599 AND lego_index=1 ORDER BY position', [COURSE]);
  if (pos.map(r => r.position).join(',') !== '1,2,3,4,5,6,7,8,9,10') problems.push(`S0599L01 positions are ${pos.map(r => r.position).join(',')}`);
  const { rows: [c3] } = await pg.query('SELECT 1 FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${NEW_COMPONENT.id}`]);
  if (c3) problems.push(`${NEW_COMPONENT.id} already exists`);
  for (const c of CHANGES) {
    const { rows: [r] } = await pg.query('SELECT known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${c.id}`]);
    if (!r || r.known_text !== c.before.known || r.target_text !== c.before.target) problems.push(`${c.id} reads "${r?.known_text}" → "${r?.target_text}" (expected "${c.before.known}" → "${c.before.target}")`);
  }
  // Concurrency: another surface editing these seeds or LEGOs in the last 12 hours (job #557·I re-links intros course-wide; refuse if it named one of ours).
  const { rows: ev } = await pg.query(`SELECT id, surface, operation FROM content_edit_events WHERE course_code=$1 AND occurred_at > now() - interval '12 hours' AND surface NOT LIKE '%' || $2 || '%' AND (scope->'seed_numbers' ?| $3::text[] OR scope->'lego_ids' ?| $4::text[] OR scope->'phrase_ids' ?| $5::text[])`,
    [COURSE, SWEEP, SEEDS.map(String), LEGO_IDS, CHANGES.map(c => `${COURSE}:${c.id}`)]);
  // job #544 (ita-seed-599-sarei) moved seed 599 to "sarei" this afternoon: that is the state this pass builds on, not a clash
  for (const e of ev) {
    if (e.surface.includes('ita-seed-599-sarei')) { console.log(`  note: ${e.surface} (${e.operation}) touched seed 599 earlier today — expected (job #544)`); continue; }
    problems.push(`another surface touched our rows today: ${e.surface} ${e.operation} (${e.id})`);
  }
}
async function guards(pg, problems, log) {
  // rule 1: tiling
  if (!componentsTile(NEW_L01)) problems.push('S0599L01 components do not tile the grown LEGO');
  if (!legosTileSeed(SEED_599, NEW_L01, L02)) problems.push('S0599L01 + S0599L02 do not tile seed 599');
  // containment: every non-component phrase under a changed LEGO, after the change, contains its LEGO on both sides
  const legoAfter = { S0599L01: NEW_L01 };
  const { rows: legos } = await pg.query('SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)', [COURSE, LEGO_IDS]);
  for (const l of legos) if (!legoAfter[l.lego_id]) legoAfter[l.lego_id] = { known: l.known_text, target: l.target_text };
  const { rows: under } = await pg.query(`SELECT split_part(id,':',2) id, phrase_role, known_text, target_text, 'S'||lpad(seed_number::text,4,'0')||'L'||lpad(lego_index::text,2,'0') lego_ref FROM course_practice_phrases WHERE course_code=$1 AND 'S'||lpad(seed_number::text,4,'0')||'L'||lpad(lego_index::text,2,'0') = ANY($2)`, [COURSE, LEGO_IDS]);
  const after = new Map(CHANGES.map(c => [c.id, c.after]));
  log.containment = { checked: 0, cliticExceptionUsed: [], preexisting: [] };
  for (const r of under) {
    if (r.phrase_role === 'component') continue;
    const A = after.get(r.id) || { known: r.known_text, target: r.target_text };
    const L = legoAfter[r.lego_ref];
    log.containment.checked++;
    const strict = containsWords(A.target, L.target, { clitic: false }) && containsWords(A.known, L.known, { clitic: false });
    const held = containsWords(A.target, L.target) && containsWords(A.known, L.known);
    // Only a REGRESSION is this pass's problem: a row that never contained its LEGO (S0160L01U04's
    // "can you tell me how you say this?" for "how do you say") is reported and left as it was.
    const B = { known: r.known_text, target: r.target_text }, LB = r.lego_ref === 'S0599L01' ? OLD_L01 : L;
    const heldBefore = containsWords(B.target, LB.target) && containsWords(B.known, LB.known);
    if (!held) {
      if (heldBefore) problems.push(`${r.id} "${A.known}" → "${A.target}" no longer contains its LEGO ${r.lego_ref} "${L.known}" → "${L.target}"`);
      else log.containment.preexisting.push(`${r.id} "${r.known_text}" → "${r.target_text}" never contained ${r.lego_ref} "${LB.known}" → "${LB.target}" (pre-existing, untouched)`);
    } else if (!strict) log.containment.cliticExceptionUsed.push(`${r.id} "${A.target}" contains "${L.target}" only through the recorded dire→dir+clitic exception`);
  }
  // rule 2: dirlo introduced before 159
  log.dirloFirstSeed = await firstSeedOf(pg, 'dirlo');
  if (!(log.dirloFirstSeed && log.dirloFirstSeed < 159)) problems.push(`dirlo first appears at seed ${log.dirloFirstSeed}, not before 159`);
  // rule 1: no new vocabulary in the rewritten 599 rows
  log.vocab = {};
  for (const c of CHANGES.filter(c => c.rule === 1)) {
    const nk = await newVocabulary(pg, 599, c.after.known, 'known'), nt = await newVocabulary(pg, 599, c.after.target, 'target');
    if (nk.length || nt.length) { log.vocab[c.id] = { known: nk, target: nt }; problems.push(`${c.id} introduces new vocabulary: ${[...nk, ...nt].join(', ')}`); }
  }
  // rule 3/4: each change classifies as correct after, and defective before
  for (const c of CHANGES.filter(c => c.rule === 3)) { const b = tellAnswerClassify(c.before.known, c.before.target), a = tellAnswerClassify(c.after.known, c.after.target); if (b.ok && !c.judgement) problems.push(`${c.id} was not a defect before`); if (!a.ok) problems.push(`${c.id} still fails the tell/answer rule after`); }
  for (const c of CHANGES.filter(c => c.rule === 4)) { if (!questaDefect(c.before.target)) problems.push(`${c.id} was not a questa defect before`); if (questaDefect(c.after.target) || questaFix(c.before.target) !== c.after.target) problems.push(`${c.id} questa fix disagrees with the rule`); }
  // ZUT: no new clash — the new known must not already map to a different target, nor the new target to a different known (non-component rows + legos)
  const pairs = [{ id: 'S0599L01', ...NEW_L01 }, ...CHANGES.map(c => ({ id: c.id, ...c.after }))];
  const ours = new Set(pairs.map(p => p.id));
  log.zut = [];
  for (const p of pairs) {
    const { rows } = await pg.query(
      `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND id<>$4 AND ((lower(trim(known_text))=lower(trim($2)) AND lower(trim(target_text))<>lower(trim($3))) OR (lower(trim(target_text))=lower(trim($3)) AND lower(trim(known_text))<>lower(trim($2))))
       UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$5 AND ((lower(trim(known_text))=lower(trim($2)) AND lower(trim(target_text))<>lower(trim($3))) OR (lower(trim(target_text))=lower(trim($3)) AND lower(trim(known_text))<>lower(trim($2))))`,
      [COURSE, p.known, p.target, `${COURSE}:${p.id}`, p.id]);
    for (const r of rows) if (!ours.has(r.id.replace(`${COURSE}:`, ''))) { log.zut.push(`${p.id} "${p.known}" → "${p.target}" vs ${r.id} "${r.known_text}" → "${r.target_text}"`); }
  }
  problems.push(...log.zut);
  // intros: no presentation line quotes a sentence we change (other than S0599L01's own, re-authored here)
  const { rows: intros } = await pg.query(`SELECT a.id, a.lego_id, a.text FROM course_audio a WHERE a.course_code=$1 AND a.role='presentation' AND (a.id::text IN (SELECT presentation_audio_id FROM course_legos WHERE course_code=$1 AND presentation_audio_id IS NOT NULL) OR a.lego_id = ANY($2))`, [COURSE, LEGO_IDS]);
  log.introsQuoting = [];
  // an intro quotes ENGLISH; it goes stale only when the English it quotes changes (S0599L01's own line is re-authored by this pass)
  for (const i of intros) {
    if (i.id === OLD_INTRO_599.audioId) continue;
    for (const c of CHANGES) if (c.side !== 'target' && c.before.known !== c.after.known && i.text.includes(`'${c.before.known}'`)) log.introsQuoting.push({ audio: i.id, lego: i.lego_id, text: i.text, row: c.id });
    if (i.text.includes(`'${OLD_L01.known}'`)) log.introsQuoting.push({ audio: i.id, lego: i.lego_id, text: i.text, row: 'S0599L01' });
  }
  for (const q of log.introsQuoting) problems.push(`intro ${q.audio} (${q.lego}) quotes a sentence this pass changes (${q.row}): "${q.text}" — re-author needed`);
}

/** Ruling 3 census: every tell/answer + it/that/this row in the course, classified. */
async function tellAnswerCensus(pg) {
  const { rows } = await pg.query(
    `SELECT 'seed' AS kind, seed_number::text AS id, seed_number, known_text, target_text FROM course_seeds WHERE course_code=$1
     UNION ALL SELECT 'lego', lego_id, seed_number, known_text, target_text FROM course_legos WHERE course_code=$1
     UNION ALL SELECT phrase_role, split_part(id,':',2), seed_number, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' ORDER BY 3, 1, 2`, [COURSE]);
  const out = { consistent: [], fix: [], noObject: [], other: [] };
  for (const r of rows) {
    const cls = tellAnswerClassify(r.known_text, r.target_text);
    if (!cls.scope) continue;
    const item = { kind: r.kind, id: r.id, seed: r.seed_number, known: r.known_text, target: r.target_text };
    if (cls.scope === 'tell-no-object') out.noObject.push(item);
    else if (cls.note) out.other.push({ ...item, note: cls.note });
    else if (cls.ok) out.consistent.push(item);
    else { const hand = CHANGES.find(c => c.id === r.id); out.fix.push({ ...item, to: hand ? hand.after.known : tellAnswerRewrite(r.known_text, cls), judgement: !!hand?.judgement }); }
  }
  return out;
}
async function questaCensus(pg) {
  const { rows } = await pg.query(`SELECT split_part(id,':',2) id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND target_text ILIKE '%si dice questa%' UNION ALL SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND target_text ILIKE '%si dice questa%' UNION ALL SELECT seed_number::text, known_text, target_text FROM course_seeds WHERE course_code=$1 AND target_text ILIKE '%si dice questa%' ORDER BY 1`, [COURSE]);
  return rows.map(r => ({ id: r.id, known: r.known_text, target: r.target_text, defect: questaDefect(r.target_text) }));
}

// ── Apply ───────────────────────────────────────────────────────────────────────────────
async function applyContent(pg, supabase, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit', scope: { seed_numbers: [599], lego_ids: ['S0599L01'], rows: 1 }, detail: { ruling: RULING, job: JOB, from: OLD_L01, to: NEW_L01, newComponentRow: NEW_COMPONENT, intro: { from: OLD_INTRO_599, to: NEW_INTRO_599 } } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit', scope: { seed_numbers: SEEDS, phrase_ids: CHANGES.map(c => `${COURSE}:${c.id}`), rows: CHANGES.length },
    detail: { ruling: RULING, job: JOB, changes: CHANGES.map(c => ({ id: `${COURSE}:${c.id}`, rule: c.rule, known_from: c.before.known, target_from: c.before.target, known_to: c.after.known, target_to: c.after.target })) } });
  const unapproveEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: SEEDS, rows: SEEDS.length }, detail: { why: 'rows edited under Kai\'s rulings of 2026-09-28; need his read', job: JOB } });
  log.events = { legoEvent, phraseEvent, unapproveEvent };
  await pg.query('BEGIN');
  try {
    // LEGO: both sides move; target + known clips cleared explicitly; the presentation link is re-pointed by the intro step
    const l = await pg.query('UPDATE course_legos SET known_text=$1, target_text=$2, components=$3, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND lego_id=$6 AND known_text=$7 AND target_text=$8',
      [NEW_L01.known, NEW_L01.target, JSON.stringify(NEW_L01.components), legoEvent, COURSE, 'S0599L01', OLD_L01.known, OLD_L01.target]);
    if (l.rowCount !== 1) throw new Error(`S0599L01: ${l.rowCount} rows`);
    // third component row at position 3: shift 3..10 → 4..11 (descending, unique (seed,lego,position))
    for (let p = 10; p >= 3; p--) await pg.query('UPDATE course_practice_phrases SET position=$1 WHERE course_code=$2 AND seed_number=599 AND lego_index=1 AND position=$3', [p + 1, COURSE, p]);
    await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, introduce, last_edit_event_id)
      VALUES ($1,$2,599,1,$3,$4,$5,$6,$7,$8,'draft','component','{}','middle',true,$9)`,
      [`${COURSE}:${NEW_COMPONENT.id}`, COURSE, NEW_COMPONENT.position, NEW_COMPONENT.known, NEW_COMPONENT.target, NEW_COMPONENT.target.length, NEW_COMPONENT.target.split(/\s+/).length, JSON.stringify({ buildup: 'component', component_index: NEW_COMPONENT.component_index }), phraseEvent]);
    for (const c of CHANGES) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, lego_count=$4, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND id=$7 AND known_text=$8 AND target_text=$9`,
        [c.after.known, c.after.target, c.after.target.length, c.after.target.split(/\s+/).length, phraseEvent, COURSE, `${COURSE}:${c.id}`, c.before.known, c.before.target]);
      if (u.rowCount !== 1) throw new Error(`${c.id}: ${u.rowCount} rows`);
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [unapproveEvent, COURSE, SEEDS]);
    log.unapproved = { seeds: SEEDS, rows: un.rowCount };
    // intro: the old clip no longer mirrors — detach from the LEGO (asset kept), link cleared until the Sonia clip lands
    await pg.query('UPDATE course_legos SET presentation_audio_id=NULL WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0599L01']);
    await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2', [OLD_INTRO_599.audioId, 'S0599L01']);
    await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason) VALUES ('course_legos','S0599L01',$1,599,'presentation_audio_id','presentation',$2,$3,$4,$5,$6)`,
      [COURSE, OLD_INTRO_599.audioId, OLD_INTRO_599.text, SONIA.voiceId, NEW_INTRO_599, `${SWEEP}: intro quotes the old LEGO (job ${JOB}, event ${legoEvent}); clip detached from S0599L01, asset kept`]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `job ${JOB}: seed 599 L01 grown, 159 dirlo, 160 questo, tell/answer pronouns; Italian rendered on Elsa/Benigno by the tool, English prompts on temporary Sonia (ita-sonia-temporary-fill SCOPE=ids), intro S0599L01 on Sonia`, metadata: { job: JOB, seeds: SEEDS, rows: CHANGES.length + 2 } });
}

// ── Audio ───────────────────────────────────────────────────────────────────────────────
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
/** Italian target1/target2 on every changed row: link an existing Elsa/Benigno clip, else render. English prompts are NOT rendered here. */
async function fillItalian(pg, supabase, log) {
  const ids = [...CHANGES.filter(c => c.side !== 'known').map(c => `${COURSE}:${c.id}`), `${COURSE}:${NEW_COMPONENT.id}`];
  const { rows } = await pg.query(
    `SELECT 'course_legos' AS tbl, lego_id AS id, target_text, target1_audio_id, target2_audio_id FROM course_legos WHERE course_code=$1 AND lego_id='S0599L01'
     UNION ALL SELECT 'course_practice_phrases', id, target_text, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY 2`, [COURSE, ids]);
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
/** The S0599L01 intro on Sonia under a temporary presentation cast row (the #557·I route), linked at all three places the learner path reads. */
async function fillIntro(pg, supabase, log) {
  const { rows: [l] } = await pg.query('SELECT known_text, presentation_audio_id FROM course_legos WHERE course_code=$1 AND lego_id=$2', [COURSE, 'S0599L01']);
  if (l.known_text !== NEW_L01.known) throw new Error('S0599L01 is not the grown LEGO');
  if (l.presentation_audio_id) { log.intro = { skipped: `already linked ${l.presentation_audio_id}` }; return; }
  const castKey = (r) => `${r.slot}|${r.language}|${r.gender}|${r.rank}|${r.voice_id}|${r.notes ?? ''}|${r.assigned_by ?? ''}|${r.created_at?.toISOString?.() ?? r.created_at}|${r.updated_at?.toISOString?.() ?? r.updated_at}`;
  const engCast = async () => (await pg.query(`SELECT slot, language, gender, rank, voice_id, notes, assigned_by, created_at, updated_at FROM voice_language_roles WHERE language='eng' ORDER BY slot, gender, rank, voice_id`)).rows;
  const before = await engCast();
  let audioId = null, durationMs = null;
  const { rows: have } = await pg.query(`SELECT id, duration_ms FROM course_audio WHERE course_code=$1 AND language='eng' AND role='presentation' AND text_normalized=normalize_text($2) AND s3_key IS NOT NULL AND s3_key NOT LIKE 'pending/%' AND voice_id = ANY($3) ORDER BY created_at DESC LIMIT 1`, [COURSE, NEW_INTRO_599, SONIA_IDS]);
  if (have[0]) { audioId = have[0].id; durationMs = have[0].duration_ms; log.intro = { result: `linked existing Sonia intro clip ${audioId}` }; }
  else {
    // Another pass (job #557·I's intro-mirror fix) may be holding its own temporary Sonia presentation row this
    // minute: the door already admits Sonia then, so no second row is inserted and theirs is never deleted.
    const { rows: theirs } = await pg.query(`SELECT assigned_by FROM voice_language_roles WHERE slot='presentation' AND language='eng' AND voice_id=$1`, [SONIA.castVoiceId]);
    const ownRow = !theirs.length;
    try {
      if (ownRow) await pg.query(`INSERT INTO voice_language_roles (slot, language, gender, rank, voice_id, notes, assigned_by) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [TEMP_PRES_ROW.slot, TEMP_PRES_ROW.language, TEMP_PRES_ROW.gender, TEMP_PRES_ROW.rank, TEMP_PRES_ROW.voice_id, `TEMPORARY — ${RULING}. Removed by the same run.`, SWEEP]);
      const out = await renderClip(supabase, { text: NEW_INTRO_599, language: 'eng', role: 'presentation', voice: SONIA, voiceIds: SONIA_IDS, intro: true });
      audioId = out.audioId; durationMs = out.durationMs; log.intro = { result: `rendered Sonia intro clip ${audioId} (${durationMs} ms)`, castRow: ownRow ? 'own temporary row' : `rode ${theirs[0].assigned_by}'s temporary row` };
    } finally {
      if (ownRow) await pg.query(`DELETE FROM voice_language_roles WHERE slot=$1 AND language=$2 AND gender=$3 AND rank=$4 AND voice_id=$5 AND assigned_by=$6`, [TEMP_PRES_ROW.slot, TEMP_PRES_ROW.language, TEMP_PRES_ROW.gender, TEMP_PRES_ROW.rank, TEMP_PRES_ROW.voice_id, SWEEP]);
      const after = await engCast();
      const same = before.length === after.length && before.every((r, i) => castKey(r) === castKey(after[i]));
      log.castRestored = same;
      if (ownRow && !same) throw new Error('eng cast NOT byte-identical after the temporary Sonia presentation row was removed');
    }
  }
  await pg.query('UPDATE course_legos SET presentation_audio_id=$1, last_edit_event_id=$2 WHERE course_code=$3 AND lego_id=$4 AND presentation_audio_id IS NULL', [audioId, log.events?.legoEvent || null, COURSE, 'S0599L01']);
  await pg.query(`INSERT INTO lego_introductions (course_code, lego_id, presentation_audio_id, audio_uuid, duration_ms, updated_at) VALUES ($1,$2,$3,$3,$4,now()) ON CONFLICT (course_code, lego_id) DO UPDATE SET presentation_audio_id=EXCLUDED.presentation_audio_id, audio_uuid=EXCLUDED.audio_uuid, duration_ms=COALESCE(EXCLUDED.duration_ms, lego_introductions.duration_ms), updated_at=now()`, [COURSE, 'S0599L01', audioId, durationMs]);
  await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2 AND (lego_id IS NULL OR lego_id<>$1)', ['S0599L01', audioId]);
  log.intro.audioId = audioId;
}

/** English prompt slots this pass leaves silent — to be filled by ita-sonia-temporary-fill SCOPE=ids. */
async function silentEnglish(pg) {
  const ids = [...CHANGES.filter(c => c.side !== 'target').map(c => `${COURSE}:${c.id}`), `${COURSE}:${NEW_COMPONENT.id}`];
  const { rows } = await pg.query(`SELECT id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) AND known_audio_id IS NULL UNION ALL SELECT lego_id FROM course_legos WHERE course_code=$1 AND lego_id='S0599L01' AND known_audio_id IS NULL`, [COURSE, ids]);
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
  console.log(`\n══ ${COURSE} — 599 / 159 / 160 / tell-answer — ${AUDIO_ONLY ? 'AUDIO ONLY' : APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  log.tellAnswer = await tellAnswerCensus(pg); log.questa = await questaCensus(pg);
  const ta = log.tellAnswer;
  console.log(`tell/answer census: ${ta.consistent.length} consistent, ${ta.fix.length} fix English, ${ta.noObject.length} English-drops-object (listed), ${ta.other.length} no Italian pronoun (conjunction/other)`);
  for (const f of ta.fix) console.log(`  FIX   ${f.id.padEnd(12)} "${f.known}" → "${f.to}"   (${f.target})${f.judgement ? '  [judgement: English drops the object, as the course does for te lo dicessi — flagged for Kai]' : ''}`);
  for (const f of ta.consistent) console.log(`  ok    ${f.id.padEnd(12)} "${f.known}"   (${f.target})`);
  for (const f of ta.noObject) console.log(`  list  ${f.id.padEnd(12)} "${f.known}"   (${f.target})`);
  for (const f of ta.other) console.log(`  other ${f.id.padEnd(12)} "${f.known}"   (${f.target}) — ${f.note}`);
  console.log(`questa census: ${log.questa.length} rows, ${log.questa.filter(q => q.defect).length} defects`); for (const q of log.questa) console.log(`  ${q.defect ? 'FIX' : 'ok '} ${q.id.padEnd(12)} "${q.target}"`);
  if (!AUDIO_ONLY) {
    await guardLive(pg, log.problems);
    if (!log.problems.length) await guards(pg, log.problems, log);
    // the census must agree with the hand list for rule 3 (nothing missed, nothing extra)
    const censusFix = new Set(ta.fix.map(f => f.id)), handFix = new Set(CHANGES.filter(c => c.rule === 3 && !c.judgement).map(c => c.id));
    for (const id of censusFix) if (!handFix.has(id) && !CHANGES.some(c => c.id === id)) log.problems.push(`census finds ${id} fixable but it is not in CHANGES`);
    for (const id of handFix) if (!censusFix.has(id)) log.problems.push(`${id} is in CHANGES but the census does not flag it`);
    const questaFixIds = new Set(log.questa.filter(q => q.defect).map(q => q.id)), handQ = new Set(CHANGES.filter(c => c.rule === 4).map(c => c.id));
    for (const id of questaFixIds) if (!handQ.has(id)) log.problems.push(`questa defect ${id} not in CHANGES`);
    for (const id of handQ) if (!questaFixIds.has(id)) log.problems.push(`${id} in CHANGES but not a questa defect`);
    console.log(`\ndirlo first appears at seed ${log.dirloFirstSeed}; clitic exception used by: ${(log.containment?.cliticExceptionUsed || []).length} rows`);
    for (const x of log.containment?.cliticExceptionUsed || []) console.log('  ' + x);
    if (log.containment?.preexisting?.length) { console.log('PRE-EXISTING containment gaps (untouched):'); for (const x of log.containment.preexisting) console.log('  ' + x); }
    console.log('\nPLAN:'); console.log(`  S0599L01  "${OLD_L01.known}" → "${OLD_L01.target}"  ⇒  "${NEW_L01.known}" → "${NEW_L01.target}"  components ${NEW_L01.components.map(c => `${c.known}→${c.target}`).join(' | ')}`);
    console.log(`  +${NEW_COMPONENT.id}  "${NEW_COMPONENT.known}" → "${NEW_COMPONENT.target}" (position ${NEW_COMPONENT.position}; rows 3..10 shift to 4..11)`);
    for (const c of CHANGES) console.log(`  [${c.rule}] ${c.id.padEnd(12)} "${c.before.known}" → "${c.before.target}"  ⇒  "${c.after.known}" → "${c.after.target}"${c.judgement ? '  [judgement — flagged for Kai]' : ''}`);
    console.log(`  intro S0599L01  "${OLD_INTRO_599.text}"  ⇒  "${NEW_INTRO_599}"`);
    console.log(`  unapprove seeds ${SEEDS.join(', ')}`);
    console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nguards hold: L01+L02 tile seed 599, components tile L01, every phrase contains its LEGO both sides (dire→dirlo recorded), no new vocabulary, no new ZUT clash, no intro quotes a changed sentence');
    if (APPLY && !log.problems.length) { await applyContent(pg, supabase, log); console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)} audioPass=${JSON.stringify(log.audioPass)}`); }
  }
  if (APPLY && !log.problems.length) {
    await fillItalian(pg, supabase, log);
    console.log('ITALIAN AUDIO:'); for (const a of log.audio) console.log(`  ${a.tbl}.${a.id} ${a.role} "${a.text}": ${a.result}`);
    try { await fillIntro(pg, supabase, log); console.log(`INTRO: ${JSON.stringify(log.intro)} castRestored=${log.castRestored}`); } catch (e) { log.problems.push(`intro: ${e.message}`); console.log(`INTRO FAILED: ${e.message}`); }
    log.silentEnglish = await silentEnglish(pg);
    console.log(`ENGLISH prompts to fill on temporary Sonia (${log.silentEnglish.length}):\n  SCOPE=ids IDS=${log.silentEnglish.join(',')} APPLY=1 node tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs`);
    if (log.audio.some(a => /REFUSED|FAILED|NOT ON CAST/.test(a.result))) log.problems.push('some Italian slots were not filled — see audio');
  }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${AUDIO_ONLY ? 'audio' : APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { containsWords, STEM_CLITIC, componentsTile, legosTileSeed, questaDefect, questaFix, tellAnswerClassify, tellAnswerRewrite, SEED_599, OLD_L01, NEW_L01, L02, CHANGES, NEW_COMPONENT, NEW_INTRO_599 };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });

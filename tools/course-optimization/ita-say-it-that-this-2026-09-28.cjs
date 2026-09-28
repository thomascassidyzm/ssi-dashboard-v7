#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-say-it-that-this-2026-09-28.cjs
//
// ita_for_eng — KAI'S RULING (2026-09-28, job #543): English and Italian map one-to-one by pronoun,
// course-wide:
//     say it    <-> dirlo   (and every form where the pronoun is lo/l': lo dico, l'ho detto, l'avrei detto …)
//     say that  <-> dire quello
//     say this  <-> dire questo
// Fix the ENGLISH side to match the Italian wherever the Italian is right (cheap: Italian audio stays).
// Conjunction "that" ("say that he …" → "dire che …") and relative "quello che" are NOT this rule and
// are left alone. "come si dice" is its own idiom (Kai) — never touched, only reported.
//
// This REVERSES the direction job #519 took this morning (bare dirlo glossed "say that"); the two
// #519 tools are not re-run.
//
// WHAT IT WRITES (APPLY=1):
//   course_practice_phrases  known_text on every row the rule catches (target_text never changes),
//                            qa_checked=NULL; the DB trigger nulls known_audio_id (English clip) itself
//   course_legos             known_text (+ components JSON) on S0061L02, S0153L01, S0367L01(components
//                            only), S0615L03, S0644L01, S0644L02, S0659L01; presentation_audio_id=NULL
//                            where the intro line no longer mirrors the LEGO or quotes a changed sentence
//   course_seeds             known_text on 61, 615, 644, 659; approved_at=NULL on every touched seed
//   course_audio             stale intro clips DETACHED (lego_id=NULL, asset kept — never deleted) and a
//                            fresh pending/ text row per LEGO intro for phase8 /generate to voice
//   content_audio_link_drops one row per intro link dropped;  content_edit_events 3 rows;
//   audio_pass_requests      one pending request naming the intros
// ENGLISH RE-VOICE is a separate step: tools/course-optimization/ita-sonia-temporary-fill-2026-09-28.cjs
// with SCOPE=course (temporary Sonia cast, Charlotte restored byte-identical) — never run from here.
// Nothing Italian is rendered: no Italian text changes.
//
//   node tools/course-optimization/ita-say-it-that-this-2026-09-28.cjs           # dry run: census + plan
//   APPLY=1 node tools/course-optimization/ita-say-it-that-this-2026-09-28.cjs   # write

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-say-it-that-this-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#543';
const RULING = 'Kai, 2026-09-28 (job #543): say it ↔ dirlo (pronoun lo), say that ↔ dire quello, say this ↔ dire questo, course-wide; fix the English side where the Italian is right';

// ── The rule ────────────────────────────────────────────────────────────────────────────
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»]+/g, ' ').replace(/\s+/g, ' ').trim();
/** The live gate's phrase-contains-LEGO rule is a word MULTISET check (reordering tolerated); mirrored here. */
const containsWords = (hay, needle) => { const h = norm(hay).split(' '); for (const w of norm(needle).split(' ')) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); } return true; };

const DIRE_FORMS = "dico|dici|dice|diciamo|dite|dicono|detto|dicevo|dicevi|diceva|dicevamo|dicevate|dicevano|dirò|dirai|dirà|diremo|direte|diranno|direi|diresti|direbbe|diremmo|direste|direbbero|dica|dicano|dicessi|dicesse|dicessimo|dicessero|dicendo|dire";
const AUX = "(?:ho|hai|ha|abbiamo|avete|hanno|avevo|avevi|aveva|avessi|avesse|avrei|avresti|avrebbe|avremmo|avreste|avrebbero)";
/** Italian says it with the pronoun LO: dirlo, lo dico, l'ho detto, l'avrei detto … (NOT te lo dicessi / me l'ha detto — those are "tell", left for Kai). */
const RE_LO = new RegExp(`(\\bdirlo\\b|(?<![a-zà-ù'])(?:lo|l')\\s*(?:${AUX}\\s+)?(?:${DIRE_FORMS})\\b)`, 'i');
const RE_TELL = /\b(?:te|me|ce|ve|glie)\s*(?:lo|l')\b/i;
const RE_COME_SI_DICE = /\bcome si dice\b/i;
const RE_QUELLO = new RegExp(`\\b(?:${DIRE_FORMS})\\s+quello\\b(?!\\s+che\\b)`, 'i');
const RE_QUESTO = new RegExp(`\\b(?:${DIRE_FORMS})\\s+questo\\b(?!\\s+che\\b)`, 'i');
const RE_SAY_IT = /\b(say|says|said|saying)\s+it\b/i;
const RE_SAY_THAT = /\b(say|says|said|saying)\s+that\b/i;
const RE_SAY_THIS = /\b(say|says|said|saying)\s+this\b/i;

/**
 * What the rule wants of one row. Returns { scope, ok, want } where scope is 'lo' | 'quello' | 'questo' |
 * 'come-si-dice' | 'tell' | null (not this rule).
 */
function classify(known, target) {
  const t = String(target || ''), k = String(known || '');
  if (RE_COME_SI_DICE.test(t)) return { scope: 'come-si-dice', ok: true, want: 'report only (Kai: come si dice is its own idiom)' };
  if (RE_TELL.test(t)) return { scope: 'tell', ok: true, want: 'tell + pronoun — outside the ruling, listed for Kai' };
  if (RE_LO.test(t)) return { scope: 'lo', ok: RE_SAY_IT.test(k) && !RE_SAY_THAT.test(k) && !RE_SAY_THIS.test(k), want: 'say it' };
  if (RE_QUELLO.test(t)) return { scope: 'quello', ok: RE_SAY_THAT.test(k) && !RE_SAY_IT.test(k) && !RE_SAY_THIS.test(k), want: 'say that' };
  if (RE_QUESTO.test(t)) return { scope: 'questo', ok: RE_SAY_THIS.test(k) && !RE_SAY_IT.test(k) && !RE_SAY_THAT.test(k), want: 'say this' };
  return { scope: null, ok: true, want: null };
}

/** The English rewrite for a row that fails — pronoun swap only; null when the row needs a hand. */
function rewriteKnown(known, cls) {
  if (cls.ok || !cls.scope) return null;
  const swap = (re, to) => known.replace(re, (m, verb) => `${verb} ${to}`);
  if (cls.scope === 'lo') {
    if (RE_SAY_THAT.test(known)) return swap(new RegExp(RE_SAY_THAT.source, 'gi'), 'it');
    if (RE_SAY_THIS.test(known)) return swap(new RegExp(RE_SAY_THIS.source, 'gi'), 'it');
  }
  if (cls.scope === 'quello') {
    if (RE_SAY_IT.test(known)) return swap(new RegExp(RE_SAY_IT.source, 'gi'), 'that');
    if (RE_SAY_THIS.test(known)) return swap(new RegExp(RE_SAY_THIS.source, 'gi'), 'that');
  }
  if (cls.scope === 'questo') {
    if (RE_SAY_IT.test(known)) return swap(new RegExp(RE_SAY_IT.source, 'gi'), 'this');
    if (RE_SAY_THAT.test(known)) return swap(new RegExp(RE_SAY_THAT.source, 'gi'), 'this');
  }
  return null;
}

// ── Hand-listed rows the generic swap cannot write (English carries NO pronoun for the Italian lo) ──
const HAND = {
  // seed 153: LEGO "wouldn't have said → non l'avrei detto" gains its "it"; every L01 row keeps the LEGO
  'S0153L01B01': { known: "wouldn't have said it" },
  'S0153L01B02': { known: "wouldn't have said it" },
  'S0153L01B03': { known: "I wouldn't have said it" },
  // seed 367: component gloss "it said → l'ha detto" is not English
  'S0367L01C02': { known: 'said it' },
  // seed 615: component "that → lo"
  'S0615L03C02': { known: 'it' },
};
const LEGO_HAND = {
  'S0153L01': { known: "wouldn't have said it", components: [{ known: "wouldn't have said it", target: "non l'avrei detto" }] },
  'S0367L01': { components: [{ known: 'to me', target: 'me' }, { known: 'said it', target: "l'ha detto" }] },
  'S0615L03': { known: 'to say it', components: [{ known: 'to say', target: 'a dire' }, { known: 'it', target: 'lo' }] },
};
/** Rows the rule catches but that are Kai's call, with why. Never written. */
const LEAVE = {
  'S0159L02U02': 'Italian drops the pronoun ("sto provando a dire diversamente"); "dirlo" would break containment of the LEGO S0159L02 "sto provando a dire" — Kai to choose',
  'S0159L02U03': 'same as S0159L02U02 ("sto provando a dire, ma non posso")',
  'S0159L02U06': 'same as S0159L02U02 ("sto provando a dire nello stesso modo")',
  'S0149L01U09': '"I told you that → ti ho detto questo": tell, not say — outside the ruling',
  'S0148L02U07': '"answer that → rispondere a questo": not dire',
};

/** Intro rows to re-author: the same text with the pronoun swapped. */
/**
 * fixes: only the fixes from the intro's OWN seed (an identical sentence in another seed is another row — S0208L02's
 * "I wanted to know how to say it" stays "it" while S0056L02U05's becomes "this"). ownRowIds: the rows this intro is
 * linked from, so a component gloss fix ('that' → 'it') rewords only its own line, never every 'that' component.
 */
function rewriteIntro(text, fixes, ownLegoFix = null, ownRowIds = []) {
  let out = text;
  // the template quotes each slot as '…', — anchor on the closing quote-comma so 'that' never matches inside 'that's …'
  for (const f of fixes) if (f.role !== 'component' && out.includes(`'${f.known}',`)) out = out.split(`'${f.known}',`).join(`'${f.to}',`);
  for (const f of fixes) if (f.role === 'component' && ownRowIds.includes(f.id) && out.startsWith(`The Italian for: '${f.known}',`)) out = out.replace(`The Italian for: '${f.known}',`, `The Italian for: '${f.to}',`);
  // the LEGO's own line may quote a context that is not a row verbatim (S0061L02: "I'm trying to say that"); inside a
  // changed lo-LEGO's line the swap is the LEGO's own pronoun
  if (ownLegoFix && ownLegoFix.scope === 'lo') out = out.replace(/\bsay that\b/g, 'say it');
  return out;
}

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function census(pg) {
  const { rows } = await pg.query(
    `SELECT 'seed' AS kind, seed_id AS id, seed_number, NULL::text AS role, known_text, target_text, NULL::text AS lego_ref FROM course_seeds WHERE course_code=$1
     UNION ALL SELECT 'lego', lego_id, seed_number, type::text, known_text, target_text, NULL FROM course_legos WHERE course_code=$1
     UNION ALL SELECT 'phrase', split_part(id,':',2), seed_number, phrase_role, known_text, target_text, 'S'||lpad(seed_number::text,4,'0')||'L'||lpad(lego_index::text,2,'0') FROM course_practice_phrases WHERE course_code=$1
     ORDER BY 3, 1, 2`, [COURSE]);
  const { rows: [cov] } = await pg.query(`SELECT (SELECT count(*) FROM course_seeds WHERE course_code=$1) seeds, (SELECT count(*) FROM course_legos WHERE course_code=$1) legos, (SELECT count(*) FROM course_practice_phrases WHERE course_code=$1) phrases,
    (SELECT count(*) FROM course_audio WHERE course_code=$1 AND role='presentation' AND s3_key NOT LIKE 'pending/%') intros`, [COURSE]);
  return { rows, coverage: cov };
}

function plan(rows, legos) {
  const out = { consistent: [], fixEnglish: [], leave: [], report: [], legoEdits: [] };
  const legoById = new Map(legos.map(l => [l.lego_id, l]));
  for (const r of rows) {
    const cls = classify(r.known_text, r.target_text);
    const item = { kind: r.kind, id: r.id, seed: r.seed_number, role: r.role, lego_ref: r.lego_ref, scope: cls.scope, known: r.known_text, target: r.target_text };
    if (LEAVE[r.id]) { out.leave.push({ ...item, why: LEAVE[r.id] }); continue; }
    const hand = r.kind === 'lego' ? LEGO_HAND[r.id]?.known : HAND[r.id]?.known;
    if (hand) { if (hand !== r.known_text) out.fixEnglish.push({ ...item, scope: item.scope || 'lo', to: hand }); else out.consistent.push(item); continue; }
    if (!cls.scope) continue;
    if (cls.scope === 'come-si-dice' || cls.scope === 'tell') { out.report.push(item); continue; }
    if (cls.ok) { out.consistent.push(item); continue; }
    const to = rewriteKnown(r.known_text, cls);
    if (!to) { out.leave.push({ ...item, why: 'rule fails but no mechanical English rewrite (English carries no pronoun) — Kai' }); continue; }
    out.fixEnglish.push({ ...item, to });
  }
  // Component-only LEGO edits (components JSON) — S0367L01 changes no lego text
  for (const [id, h] of Object.entries(LEGO_HAND)) {
    const l = legoById.get(id); if (!l || h.known) continue;
    out.fixEnglish.push({ kind: 'lego', id, seed: l.seed_number, role: l.type, scope: 'lo', known: l.known_text, target: l.target_text, to: l.known_text, componentsOnly: true });
  }
  return out;
}

async function guards(pg, fixes, legos) {
  const problems = [], preexisting = [];
  const legoAfter = new Map(legos.map(l => [l.lego_id, { known: l.known_text, target: l.target_text }]));
  for (const f of fixes.filter(f => f.kind === 'lego')) legoAfter.set(f.id, { known: f.to, target: f.target });
  // (a) every changed phrase still contains its LEGO on the known side (target untouched); every phrase under a changed LEGO too
  const changedLegoIds = fixes.filter(f => f.kind === 'lego' && !f.componentsOnly).map(f => f.id);
  const { rows: underChanged } = changedLegoIds.length ? await pg.query(`SELECT split_part(id,':',2) id, phrase_role, known_text, target_text, 'S'||lpad(seed_number::text,4,'0')||'L'||lpad(lego_index::text,2,'0') lego_ref FROM course_practice_phrases WHERE course_code=$1 AND 'S'||lpad(seed_number::text,4,'0')||'L'||lpad(lego_index::text,2,'0') = ANY($2)`, [COURSE, changedLegoIds]) : { rows: [] };
  const fixById = new Map(fixes.filter(f => f.kind === 'phrase').map(f => [f.id, f]));
  const legoBefore = new Map(legos.map(l => [l.lego_id, { known: l.known_text, target: l.target_text }]));
  const check = (id, role, knownBefore, knownAfter, target, legoRef) => {
    if (role === 'component') return;
    const A = legoAfter.get(legoRef), B = legoBefore.get(legoRef); if (!A) return;
    const heldBefore = containsWords(knownBefore, B.known) && containsWords(target, B.target);
    const holdsAfter = containsWords(knownAfter, A.known) && containsWords(target, A.target);
    if (heldBefore && !holdsAfter) problems.push(`${id} "${knownAfter}" → "${target}" no longer contains its LEGO ${legoRef} "${A.known}" → "${A.target}"`);
    if (!heldBefore) preexisting.push(`${id} "${knownBefore}" never contained ${legoRef} "${B.known}" → "${B.target}" (pre-existing, untouched)`);
  };
  for (const f of fixes.filter(f => f.kind === 'phrase')) check(f.id, f.role, f.known, f.to, f.target, f.lego_ref);
  for (const r of underChanged) if (!fixById.has(r.id)) check(r.id, r.phrase_role, r.known_text, r.known_text, r.target_text, r.lego_ref);
  // (b) components: only the known-side GLOSS changes; the target pieces stay byte-identical to what is live
  const legoRows = new Map(legos.map(l => [l.lego_id, l]));
  for (const [id, h] of Object.entries(LEGO_HAND)) {
    const live = legoRows.get(id); if (!live || !h.components) continue;
    const before = (live.components || []).map(c => c.target).join('|'), after = h.components.map(c => c.target).join('|');
    if (before !== after) problems.push(`${id} components change the Italian pieces (${before} → ${after})`);
  }
  // (c) no new ZUT clash: the new known must not already map to a different target (non-component rows + legos), nor the seed's LEGOs
  const ids = fixes.map(f => `${COURSE}:${f.id}`);
  for (const f of fixes.filter(f => f.kind !== 'seed' && f.role !== 'component' && !f.componentsOnly)) {
    const { rows } = await pg.query(
      `SELECT id, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND id<>$4 AND lower(trim(known_text))=lower(trim($2)) AND lower(trim(target_text))<>lower(trim($3))
       UNION ALL SELECT lego_id, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$5 AND lower(trim(known_text))=lower(trim($2)) AND lower(trim(target_text))<>lower(trim($3))`,
      [COURSE, f.to, f.target, `${COURSE}:${f.id}`, f.id]);
    const real = rows.filter(r => !ids.includes(r.id) && !fixes.some(x => x.id === r.id));
    for (const r of real) problems.push(`ZUT: ${f.id} "${f.to}" → "${f.target}" but ${r.id} maps the same English to "${r.target_text}"`);
  }
  return { problems, preexisting };
}

async function intros(pg, fixes, template, targetLangName) {
  const presentationAuthor = require('../../services/phases/presentation-author.cjs');
  const changedLegos = new Map(fixes.filter(f => f.kind === 'lego' && !f.componentsOnly).map(f => [f.id, f]));
  const { rows } = await pg.query(`SELECT a.id, a.lego_id, a.text, a.voice_id, a.s3_key,
      (SELECT array_agg(lego_id) FROM course_legos l WHERE l.course_code=$1 AND l.presentation_audio_id=a.id::text) AS from_legos,
      (SELECT array_agg(id) FROM course_practice_phrases p WHERE p.course_code=$1 AND p.presentation_audio_id=a.id) AS from_phrases
     FROM course_audio a WHERE a.course_code=$1 AND a.role='presentation' AND a.s3_key NOT LIKE 'pending/%' ORDER BY a.lego_id, a.created_at`, [COURSE]);
  const stale = [];
  const authored = new Set();
  for (const r of rows) {
    const legoFix = r.lego_id ? changedLegos.get(r.lego_id) : null;
    const ownRowIds = [...(r.from_legos || []), ...(r.from_phrases || []).map(x => x.split(':')[1])];
    const introSeed = Number(String(r.lego_id || ownRowIds[0] || '').slice(1, 5)) || null;
    const reworded = rewriteIntro(r.text, fixes.filter(f => f.seed === introSeed), legoFix, ownRowIds);
    if (reworded === r.text && !legoFix) continue;
    if ((r.from_legos?.length || 0) > 1) throw new Error(`intro ${r.id} linked from ${r.from_legos.length} legos`);
    r.from_lego = r.from_legos?.[0] || null; r.from_phrase = r.from_phrases?.[0] || null;
    const isComponent = !!r.from_phrase || (!r.lego_id && !r.from_lego);
    let newText = null;
    if (!isComponent && r.lego_id) {
      // reword when the line quotes the old gloss; else (S0644L01's 'could you (formal)') author the bare template line for the new LEGO
      newText = reworded !== r.text ? reworded : presentationAuthor.renderIntro({ frame: 'A', template, targetLangName, chunk: legoFix.to, seed: '' });
      if (authored.has(r.lego_id)) newText = null; else authored.add(r.lego_id);
    }
    stale.push({ audio_id: r.id, lego_id: r.lego_id, from_lego: r.from_lego, from_phrase: r.from_phrase, from_phrases: r.from_phrases || [], seed_number: r.lego_id ? Number(r.lego_id.slice(1, 5)) : null, text: r.text, voice_id: r.voice_id, newText, component: isComponent, linked: !!(r.from_lego || r.from_phrase) });
  }
  return stale;
}

async function apply(pg, supabase, P, staleIntros, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs');
  const presentationAuthor = require('../../services/phases/presentation-author.cjs');
  const { randomUUID } = require('crypto');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const fixes = P.fixEnglish;
  const seeds = [...new Set(fixes.map(f => f.seed))].sort((a, b) => a - b);
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
    scope: { seed_numbers: seeds, phrase_ids: fixes.filter(f => f.kind === 'phrase').map(f => `${COURSE}:${f.id}`), rows: fixes.filter(f => f.kind === 'phrase').length },
    detail: { ruling: RULING, job: JOB, changes: fixes.filter(f => f.kind === 'phrase').map(f => ({ id: `${COURSE}:${f.id}`, known_from: f.known, known_to: f.to, target: f.target, scope: f.scope })) } });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit',
    scope: { seed_numbers: [...new Set(fixes.filter(f => f.kind !== 'phrase').map(f => f.seed))], lego_ids: fixes.filter(f => f.kind === 'lego').map(f => f.id), rows: fixes.filter(f => f.kind !== 'phrase').length },
    detail: { ruling: RULING, job: JOB, legos: fixes.filter(f => f.kind === 'lego').map(f => ({ id: f.id, known_from: f.known, known_to: f.to, components: LEGO_HAND[f.id]?.components || null })), seeds: fixes.filter(f => f.kind === 'seed').map(f => ({ seed: f.seed, known_from: f.known, known_to: f.to })),
      intros: staleIntros.map(s => ({ audio_id: s.audio_id, lego_id: s.lego_id, from: s.text, to: s.newText, component: s.component })) } });
  const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'unapprove', scope: { seed_numbers: seeds, rows: seeds.length }, detail: { why: 'English pronoun glosses changed under these seeds; need Kai\'s read', job: JOB } });
  log.events = { phraseEvent, legoEvent, seedEvent };

  const { rows: [course] } = await pg.query('SELECT * FROM courses WHERE course_code=$1', [COURSE]);
  const presVoice = presentationAuthor.resolvePresentationVoiceId(course);
  log.presVoice = presVoice;

  await pg.query('BEGIN');
  try {
    for (const f of fixes.filter(f => f.kind === 'phrase')) {
      const u = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, qa_checked=NULL, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND id=$4 AND known_text=$5 AND target_text=$6`, [f.to, phraseEvent, COURSE, `${COURSE}:${f.id}`, f.known, f.target]);
      if (u.rowCount !== 1) throw new Error(`${f.id}: ${u.rowCount} rows (drift?)`);
    }
    for (const f of fixes.filter(f => f.kind === 'lego')) {
      const comps = LEGO_HAND[f.id]?.components;
      const dropPres = !f.componentsOnly;
      const u = await pg.query(`UPDATE course_legos SET known_text=$1, components=COALESCE($2::jsonb, components), presentation_audio_id = CASE WHEN $6 THEN NULL ELSE presentation_audio_id END, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND lego_id=$5 AND known_text=$7`, [f.to, comps ? JSON.stringify(comps) : null, legoEvent, COURSE, f.id, dropPres, f.known]);
      if (u.rowCount !== 1) throw new Error(`lego ${f.id}: ${u.rowCount} rows (drift?)`);
    }
    for (const f of fixes.filter(f => f.kind === 'seed')) {
      const u = await pg.query(`UPDATE course_seeds SET known_text=$1, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND seed_number=$4 AND known_text=$5`, [f.to, seedEvent, COURSE, f.seed, f.known]);
      if (u.rowCount !== 1) throw new Error(`seed ${f.seed}: ${u.rowCount} rows (drift?)`);
    }
    // Intros: unlink FK (lego or component phrase), detach the stale clip from its LEGO (asset kept), pending row with the new words
    for (const s of staleIntros) {
      if (s.from_lego) await pg.query(`UPDATE course_legos SET presentation_audio_id=NULL, last_edit_event_id=$1 WHERE course_code=$2 AND lego_id=$3 AND presentation_audio_id=$4`, [legoEvent, COURSE, s.from_lego, s.audio_id]);
      for (const pid of s.from_phrases) await pg.query(`UPDATE course_practice_phrases SET presentation_audio_id=NULL, last_edit_event_id=$1 WHERE course_code=$2 AND id=$3 AND presentation_audio_id=$4`, [legoEvent, COURSE, pid, s.audio_id]);
      if (s.lego_id) await pg.query(`UPDATE course_audio SET lego_id=NULL WHERE id=$1 AND lego_id=$2`, [s.audio_id, s.lego_id]);
      if (s.linked) await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason) VALUES ($1,$2,$3,$4,$5,'presentation',$6,$7,$8,$9,$10)`,
        [s.from_lego ? 'course_legos' : 'course_practice_phrases', s.from_lego || s.from_phrase, COURSE, s.seed_number, 'presentation_audio_id', s.audio_id, s.text, s.voice_id, s.newText, `${SWEEP}: intro quotes the old pronoun gloss (job ${JOB}, event ${legoEvent}); clip detached from ${s.lego_id || 'no lego'}, asset kept${s.component ? '; component — never re-introduced' : ''}`]);
      if (s.newText && s.lego_id) {
        await pg.query(`INSERT INTO course_audio (course_code, text, text_normalized, language, role, voice_id, origin, s3_key, lego_id) VALUES ($1,$2,$3,'eng','presentation',$4,'tts',$5,$6) ON CONFLICT (course_code, text_normalized, language, role, voice_id) DO NOTHING`,
          [COURSE, s.newText, normalizeForAudio(s.newText), presVoice, `pending/${randomUUID().toUpperCase()}.mp3`, s.lego_id]);
      }
    }
    const un = await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number = ANY($3)', [seedEvent, COURSE, seeds]);
    log.unapproved = { seeds, rows: un.rowCount };
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
  const { queueAudioPass } = require('../../services/shared/audio-pass-queue.cjs');
  log.audioPass = await queueAudioPass(supabase, { courseCode: COURSE, requestedBy: `@${SWEEP}`, reason: `say it/that/this pronoun pass (job ${JOB}): ${staleIntros.filter(s => s.newText).length} LEGO intros re-authored as pending rows for the intro voice; English prompts re-voiced on temporary Sonia and listed for Charlotte`, metadata: { job: JOB, intros: staleIntros.filter(s => s.newText).map(s => s.lego_id), englishRowsChanged: fixes.length } });
}

async function main() {
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const { createClient } = require('@supabase/supabase-js');
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, ruling: RULING, apply: APPLY, started: new Date().toISOString() };
  const { rows, coverage } = await census(pg);
  const { rows: legos } = await pg.query('SELECT lego_id, seed_number, type, known_text, target_text, components FROM course_legos WHERE course_code=$1', [COURSE]);
  log.coverage = coverage;
  const P = plan(rows, legos); log.plan = P;
  console.log(`\n══ ${COURSE} say it / that / this — ${APPLY ? 'APPLY' : 'DRY RUN'} ══`);
  console.log(`coverage: ${coverage.seeds} seeds, ${coverage.legos} legos, ${coverage.phrases} phrases, ${coverage.intros} intro clips scanned`);
  console.log(`in scope: ${P.consistent.length} consistent, ${P.fixEnglish.length} fix English, ${P.leave.length} left for Kai, ${P.report.length} report-only (come si dice / tell)`);
  console.log('\nFIX ENGLISH:'); for (const f of P.fixEnglish) console.log(`  ${f.kind.padEnd(6)} ${f.id.padEnd(12)} [${f.scope}] "${f.known}" → "${f.to}"   (${f.target})${f.componentsOnly ? ' [components only]' : ''}`);
  console.log('\nLEFT FOR KAI:'); for (const f of P.leave) console.log(`  ${f.id.padEnd(12)} "${f.known}" / "${f.target}" — ${f.why}`);
  const g = await guards(pg, P.fixEnglish, legos); log.problems = g.problems; log.preexisting = g.preexisting;
  if (g.preexisting.length) { console.log('\nPRE-EXISTING (not this job\'s):'); for (const x of g.preexisting) console.log('  ' + x); }
  const presentationAuthor = require('../../services/phases/presentation-author.cjs');
  const { rows: [tpl] } = await pg.query(`SELECT template FROM presentation_templates WHERE known_lang='eng' AND is_active ORDER BY priority DESC LIMIT 1`);
  const stale = await intros(pg, P.fixEnglish, tpl.template, presentationAuthor.localisedLangName('ita', 'eng')); log.intros = stale;
  console.log('\nINTROS to re-author (unlink + detach + pending row):'); for (const s of stale) console.log(`  ${String(s.from_lego || (s.from_phrases.length ? s.from_phrases.map(x => x.split(':')[1]).join('+') : `(unlinked, keyed ${s.lego_id})`)).padEnd(28)} "${s.text}" → ${s.newText ? `"${s.newText}"` : (s.component ? 'component: unlinked only' : 'detached only (another row carries the new line)')}`);
  console.log(log.problems.length ? '\nPROBLEMS:\n  ' + log.problems.join('\n  ') : '\nguards hold: LEGO-in-phrase on both sides, components tile, no new ZUT clash');
  if (APPLY && !log.problems.length) { await apply(pg, supabase, P, stale, log); console.log(`APPLIED. events=${JSON.stringify(log.events)} unapproved=${JSON.stringify(log.unapproved)} audioPass=${JSON.stringify(log.audioPass)}`); }
  const f = evidencePath(`tools/course-optimization/${SWEEP}/${APPLY ? 'applied' : 'dryrun'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  await pg.end(); process.exit(log.problems.length ? 2 : 0);
}
module.exports = { classify, rewriteKnown, rewriteIntro, HAND, LEGO_HAND, LEAVE };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });

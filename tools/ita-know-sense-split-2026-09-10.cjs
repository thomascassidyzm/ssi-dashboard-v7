#!/usr/bin/env node
// tools/ita-know-sense-split-2026-09-10.cjs
//
// ita_for_eng: the FIRST application of Kai's 2026-09-10 standard for a known
// word whose target side splits into two senses. Here the known word is "know"
// and the Italian splits into SAPERE and CONOSCERE.
//
// THE STANDARD (Kai, 2026-09-10), as applied here:
//   1. Keep the ZUT clash. Do not merge a LEGO to defeat it.
//   2. Explain the marked sense in the PRESENTATION, hand-authored.
//   3. The explanation never names the sister word and never contrasts.
//   4. The marked sense may NEVER be prompted without its context.
//   5. Context must exist before the marked sense is introduced; the escape
//      hatch is BUILD-only, contextless, immediately after the presentation.
//   6. Only the MARKED sense needs context; the default sense is the default.
//   9. A LEGO may contain only words its own seed sentence says — so widening
//      the gloss is not available, which is why the presentation does the work.
//
// WHAT "MARKED" MEANS IN ITALIAN, and this is the one language judgement the
// whole pass rests on (flagged for Kai to overturn):
//   The split is NOT people-vs-facts. It is SYNTACTIC.
//     sapere    + a subordinate clause (che / se / come / chi / quello che),
//                 + an infinitive ("know how to"), + bare "I don't know".
//     conoscere + a direct-object NOUN PHRASE you are acquainted with:
//                 a person, a place, words, a story, a path, the facts.
//   So conoscere is the marked sense and its context is A NOUN OBJECT, of which
//   a person is the clearest case. Kai's own template says "when you're talking
//   about people"; this course teaches conoscere with persone, la risposta,
//   parole, il nome, i fatti and il sentiero, so a people-only explanation would
//   be wrong for THIS course. The explanations below say "a person or a thing
//   you're familiar with" instead. If Kai wants the literal people wording, the
//   PRESENTATIONS array is the only thing that changes.
//
// THREE DEFECT CLASSES were found and are fixed here:
//   A. conoscere taking a CLAUSE  → flat wrong Italian (4 rows).
//   B. conoscere taking a bare demonstrative (questo / quello) → unnatural (5 rows).
//   C. a phrase under a conoscere LEGO answering with sapere → P17 + ZUT (7 rows).
//   plus 4 known-side-only repairs where the English named the wrong thing.
//
// NOT touched, deliberately: bare "I don't know" -> "non so" elsewhere in the
// course (that is the DEFAULT sense, rule 6); S0087/S0128/S0233/S0355, whose
// chunks already carry the person; conoscere with il modo / le cose / i fatti,
// which is correct Italian.
//
//   node tools/ita-know-sense-split-2026-09-10.cjs --dry-run
//   node tools/ita-know-sense-split-2026-09-10.cjs --apply
//   node tools/ita-know-sense-split-2026-09-10.cjs --audio      (after --apply)

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../services/shared/content-edit-log.cjs');

const COURSE = 'ita_for_eng';
const SURFACE = 'tools:ita-know-sense-split-2026-09-10';
const PHASE8 = process.env.PHASE8_URL || 'http://localhost:3465';

// ─── PRESENTATIONS: hand-authored, one per bare-chunk conoscere LEGO ─────────
// Minimal, never names sapere, describes only the sense being introduced.
// The four conoscere LEGOs whose chunk already carries the person
// (S0087L01, S0128L01, S0233L02, S0355L01) get NO explanation: there is no
// uncertainty to remove, and rule 3 says keep them minimal.
const PRESENTATIONS = [
  ['S0085L01', "The Italian for: 'I don't know', when it's a person or a thing you're not familiar with, is:"],
  ['S0105L02', "The Italian for: 'he didn't know', when it's a person or a thing he wasn't familiar with, is:"],
  ['S0133L01', "The Italian for: 'you get to know', when you're talking about people, is:"],
  ['S0290L01', "The Italian for: 'he knows', when it's a person or a thing he's familiar with, is:"],
  ['S0370L01', "The Italian for: 'I used to know', when it's a person you were familiar with, is:"],
  ['S0472L01', "The Italian for: 'we don't know', when it's a person or a thing we're not familiar with, is:"],
];

// ─── PHRASE REWRITES: id → [known, target, why] ──────────────────────────────
// `null` on a side means that side is unchanged.
// Every proposed Italian was checked, live, for (a) word-level availability from
// LEGOs introduced at or before its own seed and (b) exact duplication anywhere
// in the course. Both checks are re-run by guard() below.
const REWRITES = [
  // ── S0085L01  "I don't know" → "non conosco"  (the conoscere debut) ──
  ['ita_for_eng:S0085L01B03', "I don't know this word", 'non conosco questa parola',
   'Class B: "non conosco quello" is conoscere on a bare demonstrative. A word is a proper object of conoscere, and "parola" is already in this basket.'],
  ['ita_for_eng:S0085L01B04', "I don't know enough words", 'non conosco abbastanza parole',
   'Class C: "non so se" does not contain the LEGO (P17) and answers a conoscere card with sapere, twenty rows after the card taught the opposite.'],

  // ── S0105L02  "he didn't know" → "non conosceva" ──
  ['ita_for_eng:S0105L02B03', "he didn't know his name", 'non conosceva il suo nome',
   'Class B: "non conosceva questo". "il suo nome" is taught at seed 85 and gives the chunk a real object.'],
  ['ita_for_eng:S0105L02B04', "he didn't know those people well", 'non conosceva bene quelle persone',
   'Class B: "non conosceva quello". "quelle persone" (85) + "bene" (87) make the acquaintance sense unmistakable.'],

  // ── S0289L03  "I wonder if" → "mi chiedo se" ──
  ['ita_for_eng:S0289L03U02', 'I wonder if you know that man', "mi chiedo se conosci quell'uomo",
   'Class B: "mi chiedo se conosci questo" is conoscere on a bare demonstrative and reads as sapere in English. "quell\'uomo" is taught at seed 227.'],

  // ── S0290L01  "he knows" → "conosce" ──
  ['ita_for_eng:S0290L01B02', 'he knows that woman', 'conosce quella donna',
   'The BUILD was the bare LEGO alone ("knows" / "conosce"), which P3 rejects, and it is the exact prompt that collides with sapere. "quella donna" is taught at seed 229.'],
  ['ita_for_eng:S0290L01B03', 'he knows those people', 'conosce quelle persone',
   'Class B: "conosce questo".'],
  ['ita_for_eng:S0290L01U01', 'he knows the woman who works here', 'conosce la donna che lavora qui',
   'Class B, and this one is a USE phrase so it replays cold forever. "che lavora qui" is taught at seed 231.'],

  // ── S0355L01  known side only ──
  ['ita_for_eng:S0355L01U06', 'she had to run to see that woman you know', null,
   'Not a sense defect: the English said "she ran to meet" while the Italian says "doveva correre per vedere" — she HAD TO RUN TO SEE. The Italian is good, so the English is the defect.'],

  // ── S0370L01  "I used to know" → "conoscevo"  (known side only) ──
  // Every BUILD prompted a bare "I knew", and five seeds later S0375L01 teaches
  // "I knew" → "sapevo". Aligning the BUILD glosses to the LEGO's own gloss
  // removes the collision without touching a single clip of Italian.
  ['ita_for_eng:S0370L01B01', 'I used to know', null,
   'Bare "I knew" → conoscevo, five seeds before "I knew" → sapevo is taught at S0375L01. The LEGO\'s own gloss is "I used to know"; the BUILD should say it too.'],
  ['ita_for_eng:S0370L01B02', 'that I used to know', null, 'Same collision as B01.'],
  ['ita_for_eng:S0370L01B03', 'nobody I used to know', null,
   'Two defects: the same "I knew" collision, and "anyone I knew" is simply not what "nessuno che conoscevo" says — nessuno is "nobody".'],

  // ── S0472L01  "we don't know" → "non conosciamo"  (the worst basket) ──
  // Five of the eight phrases answered "non sappiamo" — under a card that had
  // just taught "we don't know" = "non conosciamo" — and two more used
  // conoscere on a clause. Seed 213 already teaches "we don't know" =
  // "non sappiamo", so this basket was drilling both answers to one prompt.
  ['ita_for_eng:S0472L01B03', "we don't know those people", 'non conosciamo quelle persone',
   'Class C: "non sappiamo quanto in alto" contains no part of the LEGO.'],
  ['ita_for_eng:S0472L01B04', "we don't know that woman", 'non conosciamo quella donna',
   'Class C: "non sappiamo cosa fare" — and it is a word-for-word duplicate of S0213L01 use 6, which is the sapere card.'],
  ['ita_for_eng:S0472L01U01', "we don't know many people in this group", 'non conosciamo molte persone in questo gruppo',
   'Class C. "molte persone in questo gruppo" is taught at seed 297.'],
  ['ita_for_eng:S0472L01U02', "we don't know the woman who works here", 'non conosciamo la donna che lavora qui',
   'Class C.'],
  ['ita_for_eng:S0472L01U03', "we don't know the man you were talking to", "non conosciamo l'uomo con cui parlavi",
   'Class C. "con cui parlavi" is taught at seed 262.'],
  ['ita_for_eng:S0472L01U04', "we don't know your friends", 'non conosciamo i tuoi amici',
   'Class A: "non conosciamo quello che vuole fare" is conoscere on a clause — wrong Italian. It was also the "as in" line in this LEGO\'s presentation.'],
  ['ita_for_eng:S0472L01U05', "we don't know that young man", 'non conosciamo quel giovane uomo',
   'Class A: "non conosciamo quello che c\'è nel mondo". "quel giovane uomo" is taught at seed 307.'],

  // ── Whole-course audit: conoscere on a clause, outside the know LEGOs ──
  ['ita_for_eng:S0474L01U05', null, 'non sappiamo nemmeno come si chiama',
   'Class A: "non conosciamo nemmeno come si chiama" — conoscere cannot take "come si chiama". The LEGO here is "nemmeno", which survives.'],
  ['ita_for_eng:S0481L01U03', null, "l'unica vera cosa che sappiamo",
   'Class A: a "cosa che" relative standing for a proposition takes sapere. The LEGO "l\'unica vera" survives.'],
  ['ita_for_eng:S0482L02U04', null, "l'unica cosa che sappiamo è che non siano seri",
   'Class A: "l\'unica cosa che conosciamo è che…" — conoscere cannot head a "è che" clause. Only the verb changes; the LEGO "che non siano seri" survives untouched. (The subjunctive in that LEGO is a separate, pre-existing question for Kai.)'],
];

const SEEDS_TOUCHED = [85, 105, 289, 290, 355, 370, 472, 474, 481, 482];

function supa() {
  const envPath = path.join(__dirname, '..', '.env');
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const words = (s) => s.toLowerCase().replace(/[.,?!;:]/g, ' ').replace(/'/g, "' ").split(/\s+/).filter(Boolean);

async function loadRows(sb, ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 80) {
    const { data, error } = await sb
      .from('course_practice_phrases')
      .select('id, phrase_role, seed_number, lego_index, position, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id')
      .eq('course_code', COURSE)
      .in('id', ids.slice(i, i + 80));
    if (error) throw new Error(error.message);
    for (const r of data) out.set(r.id, r);
  }
  return out;
}

/** Refuse to act on a course that has moved under us, and re-prove both
 *  content claims live rather than trusting the comments above. */
async function guard(sb) {
  const rows = await loadRows(sb, REWRITES.map((r) => r[0]));
  const missing = REWRITES.map((r) => r[0]).filter((id) => !rows.has(id));
  if (missing.length) throw new Error(`rows no longer present: ${missing.join(', ')}`);

  // (a) every new Italian must be buildable from LEGO vocabulary introduced at
  //     or before its own seed.
  const { data: legos, error: le } = await sb
    .from('course_legos').select('seed_number, target_text').eq('course_code', COURSE);
  if (le) throw new Error(le.message);
  for (const [id, , target] of REWRITES) {
    if (!target) continue;
    const seed = rows.get(id).seed_number;
    const vocab = new Set();
    for (const l of legos) if (l.seed_number <= seed) words(l.target_text).forEach((w) => vocab.add(w));
    const unseen = words(target).filter((w) => !vocab.has(w));
    if (unseen.length) throw new Error(`${id}: untaught at seed ${seed}: ${unseen.join(', ')}`);
  }

  // (b) no new Italian may duplicate an existing phrase.
  for (const [id, , target] of REWRITES) {
    if (!target) continue;
    const { count, error } = await sb
      .from('course_practice_phrases')
      .select('id', { count: 'exact', head: true })
      .eq('course_code', COURSE).neq('id', id).ilike('target_text', target);
    if (error) throw new Error(error.message);
    if (count) throw new Error(`proposed Italian for ${id} duplicates ${count} existing row(s)`);
  }

  // (c) the LEGOs whose presentation we are rewriting must still exist.
  const { data: pl, error: pe } = await sb
    .from('course_legos').select('lego_id, known_text, target_text')
    .eq('course_code', COURSE).in('lego_id', PRESENTATIONS.map((p) => p[0]));
  if (pe) throw new Error(pe.message);
  const found = new Set(pl.map((r) => r.lego_id));
  const gone = PRESENTATIONS.map((p) => p[0]).filter((l) => !found.has(l));
  if (gone.length) throw new Error(`LEGOs no longer present: ${gone.join(', ')}`);

  return { rows, legos: new Map(pl.map((r) => [r.lego_id, r])) };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const audio = process.argv.includes('--audio');
  const sb = supa();
  const { rows: before, legos } = await guard(sb);

  console.log(`presentations ${PRESENTATIONS.length}   phrase rewrites ${REWRITES.length}\n`);
  for (const [legoId, text] of PRESENTATIONS) {
    const l = legos.get(legoId);
    console.log(`PRESENTATION ${legoId}  [${l.known_text} => ${l.target_text}]`);
    console.log(`   new: ${text}\n`);
  }
  for (const [id, known, target, why] of REWRITES) {
    const r = before.get(id);
    console.log(`REWRITE ${id} [${r.phrase_role} @ seed ${r.seed_number}]`);
    if (known)  console.log(`   known:  ${r.known_text}\n        -> ${known}`);
    if (target) console.log(`   target: ${r.target_text}\n        -> ${target}`);
    console.log(`     why: ${why}\n`);
  }

  if (!apply && !audio) { console.log('(dry run — nothing written)'); return; }

  const identity = serviceIdentity('ita-know-sense-split-2026-09-10', { role: 'content-fix' });

  if (apply) {
    const editEvent = await recordContentEdit(sb, {
      identity,
      courseCode: COURSE,
      surface: SURFACE,
      operation: 'phrase-edit',
      scope: { seed_numbers: SEEDS_TOUCHED, phrase_ids: REWRITES.map((r) => r[0]), rows: REWRITES.length },
      detail: {
        ruling: "Kai, 2026-09-10: keep the ZUT clash, explain the marked sense in a hand-authored presentation, never prompt the marked sense without its context.",
        changes: REWRITES.map(([id, known, target, why]) => ({
          id,
          known_from: known ? before.get(id).known_text : null, known_to: known,
          target_from: target ? before.get(id).target_text : null, target_to: target,
          why,
        })),
      },
    });
    for (const [id, known, target] of REWRITES) {
      const payload = { last_edit_event_id: editEvent };
      if (known) payload.known_text = known;
      if (target) payload.target_text = target;
      const { error } = await sb.from('course_practice_phrases')
        .update(payload).eq('course_code', COURSE).eq('id', id);
      if (error) throw new Error(`${id}: ${error.message}`);
      console.log(`updated ${id}`);
    }

    // O5: the edit unapproves the seeds it touched.
    const unapproveEvent = await recordContentEdit(sb, {
      identity, courseCode: COURSE, surface: SURFACE, operation: 'seed-update',
      scope: { seed_numbers: SEEDS_TOUCHED },
      detail: { reason: 'O5 — an edit unapproves the seeds it touched (Kai, 2026-08-11).' },
    });
    const { error: ue } = await sb.from('course_seeds')
      .update({ approved_at: null, last_edit_event_id: unapproveEvent })
      .eq('course_code', COURSE).in('seed_number', SEEDS_TOUCHED);
    if (ue) throw new Error(`unapprove: ${ue.message}`);
    console.log(`unapproved seeds ${SEEDS_TOUCHED.join(', ')}`);
  }

  if (audio) {
    // Presentations first: /regenerate-presentation persists the supplied text
    // as the authoritative presentation text AND renders it, in one call.
    for (const [legoId, text] of PRESENTATIONS) {
      const res = await fetch(`${PHASE8}/regenerate-presentation/${COURSE}/${encodeURIComponent(legoId)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      console.log(`presentation ${legoId}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }

    // Then any phrase clip the text UPDATE left NULL. The trigger either
    // relinks to an existing same-voice clip of the new text or nulls the slot;
    // only the nulls need paying for.
    const after = await loadRows(sb, REWRITES.map((r) => r[0]));
    for (const [id] of REWRITES) {
      const r = after.get(id);
      const roles = [];
      if (!r.known_audio_id) roles.push('known');
      if (!r.target1_audio_id) roles.push('target1');
      if (!r.target2_audio_id) roles.push('target2');
      if (!roles.length) { console.log(`all clips linked, skip ${id}`); continue; }
      const res = await fetch(`${PHASE8}/regenerate-phrase/${COURSE}/${encodeURIComponent(id)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles }),
      });
      console.log(`phrase ${id} [${roles.join(',')}]: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });

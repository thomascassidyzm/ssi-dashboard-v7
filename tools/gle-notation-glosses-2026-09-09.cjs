#!/usr/bin/env node
// tools/gle-notation-glosses-2026-09-09.cjs
//
// gle_for_eng — the 34 LEGO glosses carrying a slash or a bracket.
//
// WHY THIS EXISTS. Azure drops "/" and "(" silently (its stored phoneme
// boundaries for these clips count the bare words end to end), so the learner is
// never told the notation is there. They hear one run-on prompt: "for from",
// "someone a person", "when question", "time genitive". An editor's note read
// out as if it were the thing to translate. K11 bans parenthetical tags outright
// and says the answer is "a narrower plain gloss that survives being spoken".
//
// KAI'S RULING, 2026-09-09, on the nine rows where the notation was covering a
// REAL ZUT clash: "I don't have a preference for using one method throughout -
// happy to go all in." That is the go for the all-"as in" variant (L24) across
// that class, in place of the mixed merge / distinct-known-word / as-in proposal.
// The other four classes follow the design unchanged.
//
// FIVE CLASSES, one mechanism each:
//   A  merge to the governing chunk in its own seed          — L22, L6, L19
//   B1 grammar label with nothing competing → plain gloss    — K11, L11
//   B2 real clash → plain gloss + "as in" context            — L24 (Kai, above)
//   C1 duplicate debut dressed up with a slash → is_new=false— L17
//   C2 synonym pair, no clash → pick the seed's own word     — L11, L25
//
// TWO ROWS OF THE 34 ARE DELIBERATELY NOT TOUCHED: S0288L03 and S0297L01 are the
// aithne / a fhios class (K17), which is course-wide and is Kai's to rule on. A
// THIRD, S0148L04 (freagra a thabhairt vs a fhreagairt), needs a native Irish
// reader. All three are reported, not edited.
//
// AUDIO. Every text edit fires trg_null_lego_audio_on_text_change, which relinks
// to an existing same-voice clip of the new text where one exists and nulls the
// link where it does not. Presentations are never relinked (by design), so every
// gloss that changes owes its presentation clip in the same pass — except where
// the row becomes is_new=false, which retires the round and the presentation with
// it, and except S0141L04, whose presentation already speaks the new gloss and is
// therefore re-pointed at its own existing clip inside the same UPDATE.
//
//   node tools/gle-notation-glosses-2026-09-09.cjs --dry-run
//   node tools/gle-notation-glosses-2026-09-09.cjs --apply
//   node tools/gle-notation-glosses-2026-09-09.cjs --audio    (after --apply)

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../services/shared/content-edit-log.cjs');

const COURSE = 'gle_for_eng';
const SURFACE = 'tools:gle-notation-glosses-2026-09-09';
const PHASE8 = process.env.PHASE8_URL || 'http://localhost:3465';

const frameA = (gloss) => `The Irish for: '${gloss}', is:`;
const frameB = (gloss, seed) => `The Irish for: '${gloss}', as in — '${seed}', is:`;

// ─── GLOSS EDITS — known_text only ────────────────────────────────────────────
// { id, gloss, pres, isNew?, keepPresentation?, canon, why }
// `pres` is the presentation line to render; null means the row owes none
// (is_new=false retires the round) and `keepPresentation` means the existing clip
// already speaks the new gloss and is re-pointed rather than re-rendered.
const GLOSS = [
  // ── B1 · grammar label, nothing competing (verified live: no other LEGO owns
  //       any of these bare glosses) ─────────────────────────────────────────
  { id: 'S0079L01', gloss: 'when', pres: frameA('when'), canon: 'K11 + L11',
    why: 'cathain a. "(question)" is a note to the author; no LEGO glosses a bare "when".' },
  { id: 'S0296L03', gloss: 'time', pres: frameA('time'), canon: 'K11 + L11',
    why: 'ama. "(genitive)" is Irish morphology; ama is the only am/ama LEGO in the course.' },
  { id: 'S0141L02', gloss: 'is', pres: frameA('is'), canon: 'K11 + L11 + K3',
    why: 'Tá. "(there is)" competes with nothing; Tá also glossed "yes" at S0131L01, which is K3 and harmless.' },
  { id: 'S0232L05', gloss: 'she can remember', pres: frameA('she can remember'), canon: 'L11',
    why: 'ar cuimhin léi. L11: whole intention for a LEGO, literal only for a component — and the literal ("on memory with her") is already this LEGO\'s own components.' },
  { id: 'S0233L04', gloss: 'she knows', pres: frameA('she knows'), canon: 'L11',
    why: 'aithne aici. Same shape inverted: the bracket held the intention and the bare word the literal.' },

  // ── B2 · real clash, handled by "as in" (Kai, 2026-09-09) ─────────────────
  { id: 'S0074L02', gloss: 'for', pres: frameB('for', 'thank you very much for helping me to understand'), canon: 'L24 (Kai 2026-09-09)',
    why: 'as. "for" is also le (S0038L03) and ar feadh (S0155L03); the "/from" half was simply wrong — seed 74 never uses as to mean "from" (L10). Deliberate handled ZUT; the colliders already carry contrasting "as in" lines.' },
  { id: 'S0078L02', gloss: 'what', pres: frameB('what', 'I don\'t understand what you said'), canon: 'L24 (Kai 2026-09-09)',
    why: 'cad a. Bare "what" is S0068L01 cad, which already carries its own contrasting "as in" line.' },
  { id: 'S0155L03', gloss: 'for', pres: frameB('for', 'I don\'t mind waiting for a few minutes tomorrow morning'), canon: 'L24 (Kai 2026-09-09)',
    why: 'ar feadh. Third Irish word for "for". FLAGGED: le and ar feadh are both DURATIONAL "for" — one sense, two targets — which is a K17 class the "as in" route only half handles. Kai\'s to rule on.' },
  { id: 'S0232L03', gloss: 'who', pres: frameB('who', 'I know an old woman who can remember the answer'), canon: 'L24 (Kai 2026-09-09)',
    why: 'a bhfuil. Bare "who" is S0263L02 cé, which debuts LATER (R697) and already carries the contrasting line "I don\'t know who you mean" — L24\'s exact shape.' },
  { id: 'S0233L03', gloss: 'who', pres: null, canon: 'L24 + L17',
    why: 'The silent is_new=false repeat of S0232L03. Owns no round and no presentation; its known clip still plays in its seed.' },
  { id: 'S0141L04', gloss: 'okay', pres: null, keepPresentation: true, canon: 'L24 (Kai 2026-09-09)',
    why: 'ceart go leor. "okay" is also go maith (S0041L01), which already carries a contrasting "as in" line. The presentation ALREADY says \'okay\' — no re-render; the link is re-pointed at its own clip inside the UPDATE. 20 basket phrases keep "okay" and are untouched.' },
  { id: 'S0103L05', gloss: 'other', pres: frameA('other'), canon: 'K11 + L11 — CORRECTED AGAINST THE LIVE DB',
    why: 'eile. #744 read the basket as saying "else" 20/20 and prescribed "else" to dodge a clash with níos mó "more". The live basket says "other" in its own build phrase and "something else / other people" elsewhere, and NOTHING says "more". Strip the "/more" half honestly and no LEGO owns "other" — so there is no clash to handle and "as in" would manufacture one, which L24 does not license.' },

  // ── C1 · duplicate debut dressed up with a slash ──────────────────────────
  { id: 'S0104L03', gloss: 'to do', pres: null, isNew: false, canon: 'L17',
    why: 'a dhéanamh, already "to do" at S0007L02 (seed 7) and at seven repeat rows. "to make" gets its own legitimate debut at S0116L05, so the /make half pre-empted a real LEGO.' },
  { id: 'S0195L05', gloss: 'to find', pres: null, isNew: false, canon: 'L17',
    why: 'a fháil, already "to find" at S0066L04 (seed 66).' },
  { id: 'S0145L03', gloss: 'happy', pres: null, isNew: false, canon: 'L17',
    why: 'sásta, already "happy" at S0106L03 (seed 106) and repeated at S0187L02.' },
  { id: 'S0093L02', gloss: 'to leave', pres: frameB('to leave', 'it is time to leave now and she is not trying to go yet'), canon: 'L17 + L20§2',
    why: 'imeacht. This is the debut and S0274L02 is the duplicate. "to go" collides with dul ("to go home / to go to / to go by bus"), and the basket says "to leave" 21 of 21. Existing "as in" context kept; only the gloss inside it moves.' },
  { id: 'S0128L02', gloss: 'someone', pres: frameA('someone'), canon: 'L17 + L11',
    why: 'duine. The debut; S0234L01 and S0235L02 are the duplicates. Nothing owns "a person".' },
  { id: 'S0196L01', gloss: 'have you heard', pres: frameA('have you heard'), canon: 'L17 + L11',
    why: 'an gcuala tú. The debut; S0267L01 is the duplicate. The two halves were one sense in two tenses, not two senses.' },

  // ── C2 · synonym pair, no clash anywhere ─────────────────────────────────
  { id: 'S0071L03', gloss: 'to let', pres: frameA('to let'), canon: 'L11',
    why: 'ligean. Nothing in the course glosses "to let" or "allow"; the seed says "to let anyone hear the truth".' },
  { id: 'S0145L04', gloss: 'any more', pres: frameA('any more'), canon: 'L11',
    why: 'a thuilleadh. A spelling variant, not a second sense. The seed says "any more".' },
  { id: 'S0196L03', gloss: 'the latest', pres: frameA('the latest'), canon: 'L11',
    why: 'is déanaí. Synonym pair; the seed says "the latest idea".' },
  { id: 'S0206L02', gloss: 'the chance', pres: frameA('the chance'), canon: 'L11',
    why: 'an deis. Synonym pair; the seed says "the chance to practise".' },
  { id: 'S0210L02', gloss: 'that we must', pres: frameA('that we must'), canon: 'L11',
    why: 'go gcaithfidh muid. S0104L01 already teaches "we must" = caithfidh muid, so "that we must" keeps the family consistent.' },
  { id: 'S0142L02', gloss: 'very kind', pres: frameA('very kind'), canon: 'L11 + L25',
    why: 'an-deas. The seed means "that\'s very kind of you"; deas = "nice" gets its own debut at S0219L02, so the /nice half pre-empted it.' },
  { id: 'S0076L03', gloss: 'with how much', pres: frameA('with how much'), canon: 'L11 + L25 — CORRECTED AGAINST THE LIVE DB',
    why: 'leis an méid. #744 read the basket as "with the amount" 19/20 and prescribed that. Live it is MIXED (six builds/uses say "with how much", ten say "with the amount"), so the basket cannot decide it — and seed 76\'s own English is "I\'m very happy with how much I\'ve learnt already". L25 gives it to the seed: "with how much". That also makes S0245L02 (same known, same target) a clean L17 repeat.' },
];

// ─── MERGES — class A, L22 ────────────────────────────────────────────────────
// The survivor takes the whole chunk on BOTH sides (Kai, 2026-09-03: a merge
// expands both sides); the absorbed rows are deleted. Every one of these six
// baskets is empty today, so no practice phrase moves.
const MERGES = [
  { id: 'S0237L01', known: 'he wanted me to', target: 'bhí sé ag iarraidh orm', absorb: ['S0237L02'],
    pres: frameA('he wanted me to'), canon: 'L22 + L6 + L19',
    why: 'orm is glossed three different ways in this course ("me (on me)" here, "of me" at S0169L02, "by me / on me" at S0296L05) and bare "me" sits inside 19 other LEGOs. The precedent is one seed later: S0238L01 "wanting you to tell me" = ag iarraidh ort insint dom.' },
  { id: 'S0249L01', known: 'I want you to', target: 'tá mé ag iarraidh ort', absorb: ['S0249L02'],
    pres: null, canon: 'L22 + L6',
    why: 'Same for ort ("on you" at S0190L03, "you (on)" at S0294L05). The row is already is_new=false and ag iarraidh ort is taught inside S0238L01 at seed 238, so the merge costs no round and no presentation. FLAGGED: is_new=false on a chunk that is not a pure restatement is a stretch of L17; leaving the existing flag alone is the reversible choice.' },
  { id: 'S0294L04', known: 'to call you', target: 'glaoch ort', absorb: ['S0294L05'],
    pres: frameB('to call you', 'I don\'t have enough time to call you tonight'), canon: 'L22',
    why: 'Third gloss for ort. The bracket named the preposition glaoch governs. Existing "as in" context kept.' },
  { id: 'S0296L04', known: 'needed by me', target: 'de dhíth orm', absorb: ['S0296L05'], isNew: false,
    pres: null, canon: 'L22 + L17',
    why: 'S0296L04 "needed" (de dhíth) + S0296L05 "by me / on me" (orm) re-split a chunk that is ALREADY taught whole 200 seeds earlier as S0096L04 "needed by me" = de dhíth orm. Merging back restores it and makes it a pure same-meaning restatement: is_new=false, and all three clips relink free to S0096L04\'s.' },
  { id: 'S0214L01', known: 'did you have a good time', target: 'an raibh am maith agat', absorb: ['S0214L02', 'S0214L03'],
    pres: frameB('did you have a good time', 'Did you have a good time at the weekend?'), canon: 'L22 + L6',
    why: 'agat appears everywhere else only inside a chunk (go raibh maith agat, cad atá le déanamh agat). Split out bare, "you (with)" means nothing an English prompt can ask for. The three rows are contiguous in both languages.' },
  { id: 'S0142L05', known: 'I am grateful to you', target: 'tá mé buíoch díot', absorb: ['S0142L06'],
    pres: frameA('I am grateful to you'), canon: 'L22 + L19',
    why: 'Three notations on one gloss ("to/of you (for)") and every sense named is already owned: "to" = chuig (S0052L04), "for" = le (S0038L03), and díot itself is "from you" at S0030L03. Both ZUT directions failed at once. Seed 142 says "I\'m grateful to you".' },
];

// ─── IS_NEW FLIPS — no text change, the duplicate stands down ─────────────────
const REPEATS = [
  { id: 'S0274L02', canon: 'L17', why: 'imeacht "to leave" — the duplicate of the S0093L02 debut.' },
  { id: 'S0234L01', canon: 'L17', why: 'duine "someone" — the duplicate of the S0128L02 debut. Its 15 phrases stay.' },
  { id: 'S0267L01', canon: 'L17', why: 'an gcuala tú "have you heard" — the duplicate of the S0196L01 debut.' },
  { id: 'S0245L02', canon: 'L17', why: 'leis an méid "with how much" — same known and same target as S0076L03 once that row is corrected.' },
];

// ─── BUILD PHRASES THAT QUOTE THE NOTATION ───────────────────────────────────
// P10/P17: a build phrase contains its LEGO's text, so these mirror the gloss.
const PHRASES = [
  ['gle_for_eng:S0076L03B01', 'with how much'],
  ['gle_for_eng:S0079L01B01', 'when'],
  ['gle_for_eng:S0141L04B01', 'okay'],
  ['gle_for_eng:S0155L03B01', 'for'],
  ['gle_for_eng:S0232L03B01', 'who'],
  ['gle_for_eng:S0232L05B01', 'she can remember'],
  ['gle_for_eng:S0233L04B01', 'she knows'],
  ['gle_for_eng:S0296L03B01', 'time'],
];

// ─── NOT TOUCHED, ON PURPOSE ─────────────────────────────────────────────────
const REFUSED = [
  ['S0288L03', '"I know (them)" / a bhfuil aithne agam orthu — the aithne vs a fhios class (K17). Course-wide and Kai\'s to rule on.'],
  ['S0297L01', '"I don\'t know (anyone)" / níl aithne agam — the same class, in the negative.'],
  ['S0148L04', '"to answer / give an answer" / freagra a thabhairt — whether Irish wants both this and a fhreagairt (S0202L02) taught is a language judgement that needs a native Irish reader.'],
];

function supa() {
  const envPath = path.join(__dirname, '..', '.env');
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

const parse = (legoId) => {
  const m = /^S(\d+)L(\d+)$/.exec(legoId);
  if (!m) throw new Error(`bad lego id ${legoId}`);
  return { seed_number: +m[1], lego_index: +m[2] };
};

async function loadLegos(sb, ids) {
  const { data, error } = await sb.from('course_legos')
    .select('lego_id, seed_number, lego_index, is_new, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id')
    .eq('course_code', COURSE).in('lego_id', ids);
  if (error) throw new Error(error.message);
  return new Map(data.map((r) => [r.lego_id, r]));
}

/** Refuse to act on a course that has moved under us. The reorder of 9 September
 *  renumbered lego_id inside 14 seeds, so identity is checked on the TEXT too. */
async function guard(sb, { expectAbsorbed }) {
  const wanted = [
    ...GLOSS.map((g) => g.id),
    ...MERGES.map((m) => m.id),
    ...REPEATS.map((r) => r.id),
    ...(expectAbsorbed ? MERGES.flatMap((m) => m.absorb) : []),
  ];
  const rows = await loadLegos(sb, wanted);
  const missing = wanted.filter((id) => !rows.has(id));
  if (missing.length) throw new Error(`rows no longer present: ${missing.join(', ')}`);
  if (expectAbsorbed) {
    for (const g of GLOSS) {
      const cur = rows.get(g.id).known_text;
      if (!/[/(]/.test(cur)) throw new Error(`${g.id} no longer carries notation ("${cur}") — someone else moved it`);
    }
  }
  return rows;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const audio = process.argv.includes('--audio');
  const sb = supa();
  const before = await guard(sb, { expectAbsorbed: !audio });

  console.log(`gloss edits ${GLOSS.length}  merges ${MERGES.length} (absorbing ${MERGES.flatMap((m) => m.absorb).length})  repeats ${REPEATS.length}  build phrases ${PHRASES.length}`);
  for (const g of GLOSS) {
    console.log(`\nGLOSS ${g.id}  [${g.canon}]`);
    console.log(`   old: "${before.get(g.id).known_text}"   → new: "${g.gloss}"`);
    if (g.isNew === false) console.log('   is_new → false (round retired)');
    if (g.keepPresentation) console.log('   presentation kept (already speaks the new gloss)');
    else if (g.pres) console.log(`   pres: ${g.pres}`);
    console.log(`   why: ${g.why}`);
  }
  for (const m of MERGES) {
    const b = before.get(m.id);
    console.log(`\nMERGE ${m.id} ← ${m.absorb.join(' + ')}  [${m.canon}]`);
    console.log(`   old: "${b.known_text}" / "${b.target_text}"`);
    console.log(`   new: "${m.known}" / "${m.target}"`);
    if (m.isNew === false) console.log('   is_new → false');
    if (m.pres) console.log(`   pres: ${m.pres}`);
    console.log(`   why: ${m.why}`);
  }
  for (const r of REPEATS) console.log(`\nREPEAT ${r.id} is_new → false  [${r.canon}]  ${r.why}`);
  for (const [id, gloss] of PHRASES) console.log(`\nPHRASE ${id} → "${gloss}"`);
  for (const [id, why] of REFUSED) console.log(`\nNOT TOUCHED ${id}: ${why}`);

  if (!apply && !audio) { console.log('\n(dry run — nothing written)'); return; }

  const identity = serviceIdentity('gle-notation-glosses-2026-09-09', { role: 'content-fix' });

  if (apply) {
    const seeds = [...new Set([...GLOSS, ...MERGES, ...REPEATS].map((r) => parse(r.id).seed_number))].sort((a, b) => a - b);
    const editEvent = await recordContentEdit(sb, {
      identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-edit',
      scope: { seed_numbers: seeds, lego_ids: [...GLOSS, ...MERGES, ...REPEATS].map((r) => r.id) },
      detail: {
        ruling: "Kai, 2026-09-09: the 34 slash-and-bracket glosses are fixed per class; for the real-clash class, \"I don't have a preference for using one method throughout - happy to go all in\" = the all-'as in' variant (L24).",
        design: 'job #744, re-derived live 2026-09-09',
        refused: REFUSED.map(([id, why]) => ({ id, why })),
        changes: [
          ...GLOSS.map((g) => ({ id: g.id, kind: 'gloss', from: before.get(g.id).known_text, to: g.gloss, is_new: g.isNew, canon: g.canon, why: g.why })),
          ...MERGES.map((m) => ({ id: m.id, kind: 'merge', absorbed: m.absorb, from_known: before.get(m.id).known_text, from_target: before.get(m.id).target_text, to_known: m.known, to_target: m.target, canon: m.canon, why: m.why })),
          ...REPEATS.map((r) => ({ id: r.id, kind: 'is_new=false', canon: r.canon, why: r.why })),
        ],
      },
    });
    console.log(`\nedit event ${editEvent}`);

    for (const g of GLOSS) {
      const patch = { known_text: g.gloss, last_edit_event_id: editEvent };
      if (g.isNew === false) patch.is_new = false;
      const { error } = await sb.from('course_legos').update(patch)
        .eq('course_code', COURSE).eq('lego_id', g.id);
      if (error) throw new Error(`${g.id}: ${error.message}`);
      // Re-point AFTERWARDS, never in the same UPDATE. null_lego_audio_on_text_change
      // only respects a writer-set presentation link when the value is DISTINCT from
      // OLD's ("CONTINUE WHEN NEW.presentation_audio_id IS DISTINCT FROM OLD"), so
      // writing the SAME id alongside the text buys nothing and the trigger nulls it.
      // A second UPDATE that touches no text column does not fire the trigger at all
      // (its WHEN clause needs known_text or target_text to move), so this is free.
      if (g.keepPresentation) {
        const keep = before.get(g.id).presentation_audio_id;
        const { error: relinkErr } = await sb.from('course_legos')
          .update({ presentation_audio_id: keep })
          .eq('course_code', COURSE).eq('lego_id', g.id);
        if (relinkErr) throw new Error(`${g.id} presentation relink: ${relinkErr.message}`);
        await sb.from('lego_introductions').upsert(
          { course_code: COURSE, lego_id: g.id, presentation_audio_id: keep, audio_uuid: keep },
          { onConflict: 'course_code,lego_id' });
      }
      console.log(`gloss ${g.id} → "${g.gloss}"`);
    }

    for (const m of MERGES) {
      const patch = { known_text: m.known, target_text: m.target, last_edit_event_id: editEvent };
      if (m.isNew === false) patch.is_new = false;
      const { error } = await sb.from('course_legos').update(patch)
        .eq('course_code', COURSE).eq('lego_id', m.id);
      if (error) throw new Error(`${m.id}: ${error.message}`);

      for (const dead of m.absorb) {
        const { seed_number, lego_index } = parse(dead);
        const { count } = await sb.from('course_practice_phrases')
          .select('id', { count: 'exact', head: true })
          .eq('course_code', COURSE).eq('seed_number', seed_number).eq('lego_index', lego_index);
        if (count) throw new Error(`${dead} still has ${count} practice phrase(s) — refusing to delete`);
        await sb.from('lego_introductions').delete().eq('course_code', COURSE).eq('lego_id', dead);
        const { error: delErr } = await sb.from('course_legos').delete()
          .eq('course_code', COURSE).eq('seed_number', seed_number).eq('lego_index', lego_index);
        if (delErr) throw new Error(`${dead}: ${delErr.message}`);
      }
      console.log(`merge ${m.id} ← ${m.absorb.join(' + ')}`);
    }

    for (const r of REPEATS) {
      const { error } = await sb.from('course_legos')
        .update({ is_new: false, last_edit_event_id: editEvent })
        .eq('course_code', COURSE).eq('lego_id', r.id);
      if (error) throw new Error(`${r.id}: ${error.message}`);
      console.log(`repeat ${r.id} is_new=false`);
    }

    const phraseEvent = await recordContentEdit(sb, {
      identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
      scope: { phrase_ids: PHRASES.map((p) => p[0]), rows: PHRASES.length },
      detail: { ruling: 'P10/P17 — a build phrase contains its LEGO, so the notation build mirrors the corrected gloss.',
                changes: PHRASES.map(([id, t]) => ({ id, to: t })) },
    });
    for (const [id, gloss] of PHRASES) {
      const { error } = await sb.from('course_practice_phrases')
        .update({ known_text: gloss, last_edit_event_id: phraseEvent })
        .eq('course_code', COURSE).eq('id', id);
      if (error) throw new Error(`${id}: ${error.message}`);
      console.log(`phrase ${id} → "${gloss}"`);
    }
    console.log('\nAPPLIED. Next: REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index, then --audio.');
  }

  if (audio) {
    const ids = [...GLOSS.map((g) => g.id), ...MERGES.map((m) => m.id)];
    const after = await loadLegos(sb, ids);
    let rendered = 0; let free = 0;

    // 1. LEGO clips the trigger could not relink.
    for (const id of ids) {
      const row = after.get(id);
      const roles = [];
      if (!row.known_audio_id) roles.push('known');
      if (!row.target1_audio_id) roles.push('target1');
      if (!row.target2_audio_id) roles.push('target2');
      if (!roles.length) { free++; console.log(`lego ${id}: all clips relinked free`); continue; }
      const res = await fetch(`${PHASE8}/regenerate-lego/${COURSE}/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles }),
      });
      const body = await res.text();
      console.log(`lego ${id} [${roles.join(',')}]: ${res.status} ${body.slice(0, 200)}`);
      if (res.ok) rendered += roles.length;
    }

    // 2. Build phrases.
    const { data: ph } = await sb.from('course_practice_phrases')
      .select('id, known_audio_id').eq('course_code', COURSE).in('id', PHRASES.map((p) => p[0]));
    for (const row of ph || []) {
      if (row.known_audio_id) { free++; console.log(`phrase ${row.id}: known clip relinked free`); continue; }
      const res = await fetch(`${PHASE8}/regenerate-phrase/${COURSE}/${encodeURIComponent(row.id)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: ['known'] }),
      });
      console.log(`phrase ${row.id}: ${res.status} ${(await res.text()).slice(0, 200)}`);
      if (res.ok) rendered++;
    }

    // 3. Presentations — every gloss that moved owes one, in the same pass.
    for (const item of [...GLOSS, ...MERGES]) {
      if (!item.pres) continue;
      const res = await fetch(`${PHASE8}/regenerate-presentation/${COURSE}/${item.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: item.pres }),
      });
      console.log(`pres ${item.id}: ${res.status} ${(await res.text()).slice(0, 200)}`);
      if (res.ok) rendered++;
    }
    console.log(`\nclips rendered: ${rendered}   slots that relinked free: ${free}`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });

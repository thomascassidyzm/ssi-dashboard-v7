#!/usr/bin/env node
// tools/gle-wrong-person-english-2026-09-09.cjs
//
// gle_for_eng: 38 practice phrases whose ENGLISH prompt names a different person
// from the Irish it is paired with. Kai's ruling, 2026-09-09: the ENGLISH is the
// defect, because the Irish forms that would make the English right (mé féin /
// í féin / é féin; aici / aige / acu / againn) are not taught anywhere in this
// course, and an untaught form is simply unavailable — you may not write one in.
//
//   "good, the phrases are unavailable if the form is not taught in the seeds.
//    You can try to rewrite, but don't make duplicates, and don't make
//    nonsensical phrases. Some of them will have to be deleted and that's fine."
//
// Two groups, both re-derived live before this list was written:
//
//   GROUP 1 — seed 65 (+ one row in seed 88): the Irish says `tú féin a thástáil`
//     ("to test YOURSELF"). Where the Irish matrix clause is impersonal
//     ("tá sé tábhachtach…", "ceapaim go bhfuil sé…") a generic English "you"
//     works and the row is REWRITTEN. Where the Irish matrix subject is 1st or
//     3rd person ("tá mé ag iarraidh… chun tú féin a thástáil") NO grammatical
//     English exists — English reflexives must agree with their subject — so the
//     row is DELETED. That is the whole shape of group 1: 3 rewrites, 18 deletes.
//
//   GROUP 2 — seed 76: the Irish says `atá foghlamtha agam` ("that I have
//     learned"). `agam` is perfectly good taught Irish; only the English names
//     the wrong person, and the outer subject (she/he/they/we) can stay. Nearly
//     all of these rewrite cleanly. The four deletions are rows where the rest of
//     the Irish cannot be reconciled with a 1st-person possessor at all.
//
// The Irish is NOT touched, by anything here. No LEGO is touched. Only
// known_text changes, plus whole-row deletes.
//
// Audio: trg_null_phrase_audio_on_text_change fires on the known_text UPDATE and
// either relinks the known clip to an existing same-voice clip of the new text or
// nulls it. This tool then refills the nulled known slots via phase8
// /regenerate-phrase with roles:['known'] — one clip per row, known side only.
// Target clips are never regenerated because target_text never changes.
//
//   node tools/gle-wrong-person-english-2026-09-09.cjs --dry-run
//   node tools/gle-wrong-person-english-2026-09-09.cjs --apply
//   node tools/gle-wrong-person-english-2026-09-09.cjs --audio    (after --apply)

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../services/shared/content-edit-log.cjs');

const COURSE = 'gle_for_eng';
const SURFACE = 'tools:gle-wrong-person-english-2026-09-09';
const PHASE8 = process.env.PHASE8_URL || 'http://localhost:3465';

// ─── REWRITES: id → [new English, why] ────────────────────────────────────────
// Every one of these was checked for an exact and a near duplicate (token
// Jaccard) against all 5,975 known_texts in the course before it was written
// here; the closest survivor sits at 0.63.
const REWRITES = [
  // GROUP 1 — impersonal Irish matrix, so generic "you" is available.
  ['gle_for_eng:S0065L05U12',
   'I think it is fun to test yourself every week when learning Irish',
   'Irish is "ceapaim Tá sé spraíúil tú féin a thástáil…" — I think + impersonal, so "test yourself" is right and only the "she thinks / herself" framing was wrong.'],
  ['gle_for_eng:S0065L06U12',
   'I think it is important to test yourself before you try to say something in Irish',
   'Irish "ceapaim" is I think, not she thinks; the reflexive was already correct.'],
  ['gle_for_eng:S0088L05U15',
   "I'm not sure when I will be ready to finish yet, but I know it is important to take time to test yourself",
   'The Irish second clause is impersonal ("tá a fhios agam go bhfuil sé tábhachtach am a thógáil chun tú féin a thástáil"), so "tested myself" becomes "important to take time to test yourself".'],

  // GROUP 2 — `agam` is taught and correct; the English names the wrong learner.
  ['gle_for_eng:S0076L02U06',
   'she told me she was very happy with how much Irish I have already learned',
   'Irish: "dúirt sí liom go raibh sí an-sásta leis an méid Gaeilge atá foghlamtha agam cheana féin" — she is happy about what I have learned.'],
  ['gle_for_eng:S0076L03U02',
   'she is very happy with how much Irish I have learned and she does not want to stop talking',
   'Irish "tá sí an-sásta leis an méid Gaeilge atá foghlamtha agam agus níl sí ag iarraidh stopadh ag caint"; only the relative clause was the wrong person.'],
  ['gle_for_eng:S0076L03U10',
   'he is very happy with how much Irish I have learned since he started learning Irish',
   'Irish "tá sé an-sásta … atá foghlamtha agam ó thosaigh sé ag foghlaim Gaeilge" — present tense, his happiness about my learning. Grammatical and sayable, so not a deletion.'],
  ['gle_for_eng:S0076L03U12',
   'they were very happy with how much Irish I have learned with everyone else who is learning',
   'Irish "bhí siad an-sásta … atá foghlamtha agam le gach duine eile ag foghlaim" — the trailing "ag foghlaim" is carried by "who is learning".'],
  ['gle_for_eng:S0076L03U15',
   'I think it is a good thing to be happy as often as possible with how much Irish I have learned',
   'Irish "ceapaim gur rud maith é a bheith sásta leis an méid Gaeilge atá foghlamtha agam chomh minic agus is féidir" — the old English invented "everyone / they make".'],
  ['gle_for_eng:S0076L04B06',
   'she is happy with how much I have learned',
   'The one BUILD in group 2. Irish "tá sí sásta leis an méid atá foghlamtha agam". Short, which is what a BUILD wants.'],
  ['gle_for_eng:S0076L04U03',
   'he is happy with all the Irish I have learned in about a week',
   'Irish "tá sé sásta leis an méid Gaeilge ar fad atá foghlamtha agam le timpeall seachtaine" — present tense and "about a week", both wrong in the old English too.'],
  ['gle_for_eng:S0076L04U04',
   'I think it is important to speak the Irish I have learned as soon as possible',
   'Irish "…an Gaeilge atá foghlamtha agam a labhairt chomh luath agus is féidir": the embedded subject was "you have learned".'],
  ['gle_for_eng:S0076L04U09',
   'he said the best thing about all the Irish I have learned is talking to people',
   'Irish "dúirt sé gur an rud is fearr faoin méid Gaeilge ar fad atá foghlamtha agam ná ag caint le daoine".'],
  ['gle_for_eng:S0076L04U11',
   'she is very happy with all the Irish I have learned and she wants other people learning Irish too',
   'Irish "tá sí an-sásta … atá foghlamtha agam agus tá sí ag iarraidh daoine eile ag foghlaim". The second clause is loose Irish; that is a pre-existing defect, not this one.'],
  ['gle_for_eng:S0076L04U13',
   'they were very happy with all the words I have learned in about a week of learning Irish',
   'Irish "bhí siad an-sásta leis an méid focal ar fad atá foghlamtha agam le timpeall seachtaine ag foghlaim Gaeilge"; the old English had an agentless passive with no Irish behind it.'],
  ['gle_for_eng:S0076L05U03',
   'he is already able to speak a lot of words and he is very happy with how much I have learned',
   'Irish "tá sé ábalta go leor focail a labhairt cheana féin agus tá sé an-sásta leis an méid atá foghlamtha agam".'],
  ['gle_for_eng:S0076L05U15',
   'she is very happy with how much I have already learned and she wants to learn more',
   'Irish "tá sí an-sásta leis an méid atá foghlamtha agam cheana féin agus tá sí ag iarraidh níos mó a fhoghlaim".'],
];

// ─── DELETIONS: id → why ──────────────────────────────────────────────────────
const G1_REFLEXIVE = 'Irish matrix subject is 1st/3rd person but the reflexive is "tú féin" (yourself). '
  + 'English reflexives must agree with their subject, so no grammatical English prompt exists; '
  + 'the correct Irish (mé féin / í féin / é féin) is untaught in this course, so it cannot be written in.';

const DELETIONS = [
  // GROUP 1 — 18 rows.
  ['gle_for_eng:S0065L04U12', G1_REFLEXIVE],
  ['gle_for_eng:S0065L05U02', G1_REFLEXIVE + ' Also a word-for-word duplicate of S0065L04U12 on the Irish side.'],
  ['gle_for_eng:S0065L05U04', G1_REFLEXIVE],
  ['gle_for_eng:S0065L05U05', G1_REFLEXIVE],
  ['gle_for_eng:S0065L05U07', G1_REFLEXIVE],
  ['gle_for_eng:S0065L05U08', G1_REFLEXIVE],
  ['gle_for_eng:S0065L05U11', G1_REFLEXIVE],
  ['gle_for_eng:S0065L05U13', G1_REFLEXIVE],
  ['gle_for_eng:S0065L05U15', G1_REFLEXIVE],
  ['gle_for_eng:S0065L06U02', G1_REFLEXIVE],
  ['gle_for_eng:S0065L06U04', G1_REFLEXIVE],
  ['gle_for_eng:S0065L06U05', G1_REFLEXIVE],
  ['gle_for_eng:S0065L06U06', G1_REFLEXIVE],
  ['gle_for_eng:S0065L06U09', G1_REFLEXIVE],
  ['gle_for_eng:S0065L06U10', G1_REFLEXIVE],
  ['gle_for_eng:S0065L06U11', G1_REFLEXIVE],
  ['gle_for_eng:S0065L06U13', G1_REFLEXIVE],
  ['gle_for_eng:S0065L06U15', G1_REFLEXIVE],

  // GROUP 2 — 4 rows.
  ['gle_for_eng:S0076L03U03',
   'The Irish is not a grammatical sentence: "…atá foghlamtha agam tuiscint tar éis labhairt a chleachtadh" leaves "tuiscint" dangling with no syntax. No honest English can prompt it, and repairing the Irish is out of scope. (The old English also carried an untranslated Irish word, "labhairt".)'],
  ['gle_for_eng:S0076L03U05',
   '"atá foghlamtha agam le chéile" — "that I have learned TOGETHER" — needs a plural learner, so the 1st-person-singular possessor and "le chéile" cannot both be honoured in a natural English sentence.'],
  ['gle_for_eng:S0076L04U05',
   'Same clash as S0076L03U05: "atá foghlamtha agam le chéile" under a "tá muid" frame. "We are happy with all the words I have learned together this week" is not something a person says.'],
  ['gle_for_eng:S0076L04U07',
   'Irish is "an bhfuil tú sásta leis an méid Gaeilge atá foghlamtha agam nó tá tú ag iarraidh níos mó ama triail" — "are YOU happy with how much Irish I have learned, or do YOU want more time to practise". The two halves do not cohere as one question, and a USE phrase is met cold (P6).'],
];

function supa() {
  const envPath = path.join(__dirname, '..', '.env');
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function loadRows(sb, ids) {
  const out = new Map();
  for (let i = 0; i < ids.length; i += 80) {
    const { data, error } = await sb
      .from('course_practice_phrases')
      .select('id, phrase_role, seed_number, lego_index, position, known_text, target_text, known_audio_id')
      .eq('course_code', COURSE)
      .in('id', ids.slice(i, i + 80));
    if (error) throw new Error(error.message);
    for (const r of data) out.set(r.id, r);
  }
  return out;
}

/** Refuse to act on a course that has moved under us.
 *  --audio runs AFTER --apply, so the deletion rows are legitimately gone by
 *  then: only --apply requires them to still be present. */
async function guard(sb, { expectDeletions }) {
  const all = [...REWRITES.map((r) => r[0]), ...(expectDeletions ? DELETIONS.map((d) => d[0]) : [])];
  const rows = await loadRows(sb, all);
  const missing = all.filter((id) => !rows.has(id));
  if (missing.length) throw new Error(`rows no longer present: ${missing.join(', ')}`);
  for (const [id, text] of REWRITES) {
    const { count, error } = await sb
      .from('course_practice_phrases')
      .select('id', { count: 'exact', head: true })
      .eq('course_code', COURSE)
      .neq('id', id)
      .ilike('known_text', text);
    if (error) throw new Error(error.message);
    if (count) throw new Error(`proposed English for ${id} duplicates ${count} existing row(s)`);
  }
  return rows;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const audio = process.argv.includes('--audio');
  const sb = supa();
  const before = await guard(sb, { expectDeletions: !audio || apply });

  console.log(`rewrites ${REWRITES.length}  deletions ${DELETIONS.length}  (${before.size} rows located)`);
  for (const [id, text, why] of REWRITES) {
    console.log(`\nREWRITE ${id} [${before.get(id).phrase_role}]`);
    console.log(`   old: ${before.get(id).known_text}`);
    console.log(`   new: ${text}`);
    console.log(`  irish: ${before.get(id).target_text}`);
    console.log(`    why: ${why}`);
  }
  for (const [id, why] of DELETIONS) {
    const row = before.get(id);
    console.log(`\nDELETE ${id}${row ? ` [${row.phrase_role}]` : ' (already gone)'}`);
    if (row) {
      console.log(`   old: ${row.known_text}`);
      console.log(`  irish: ${row.target_text}`);
    }
    console.log(`    why: ${why}`);
  }

  if (!apply && !audio) { console.log('\n(dry run — nothing written)'); return; }

  const identity = serviceIdentity('gle-wrong-person-english-2026-09-09', { role: 'content-fix' });

  if (apply) {
    const editEvent = await recordContentEdit(sb, {
      identity,
      courseCode: COURSE,
      surface: SURFACE,
      operation: 'phrase-edit',
      scope: { seed_numbers: [65, 76, 88], phrase_ids: REWRITES.map((r) => r[0]), rows: REWRITES.length },
      detail: {
        ruling: "Kai, 2026-09-09: the English prompt is the defect; the untaught Irish form is unavailable.",
        changes: REWRITES.map(([id, text]) => ({ id, from: before.get(id).known_text, to: text })),
      },
    });
    for (const [id, text] of REWRITES) {
      const { error } = await sb
        .from('course_practice_phrases')
        .update({ known_text: text, last_edit_event_id: editEvent })
        .eq('course_code', COURSE).eq('id', id);
      if (error) throw new Error(`${id}: ${error.message}`);
      console.log(`updated ${id}`);
    }

    const delEvent = await recordContentEdit(sb, {
      identity,
      courseCode: COURSE,
      surface: SURFACE,
      operation: 'phrase-delete',
      scope: { seed_numbers: [65, 76], phrase_ids: DELETIONS.map((d) => d[0]), rows: DELETIONS.length },
      detail: {
        ruling: "Kai, 2026-09-09: 'Some of them will have to be deleted and that's fine.'",
        deleted: DELETIONS.map(([id, why]) => ({
          id, known_text: before.get(id).known_text, target_text: before.get(id).target_text, why,
        })),
      },
    });
    const { error: delErr } = await sb
      .from('course_practice_phrases')
      .delete()
      .eq('course_code', COURSE)
      .in('id', DELETIONS.map((d) => d[0]));
    if (delErr) throw new Error(delErr.message);
    console.log(`deleted ${DELETIONS.length} rows (event ${delEvent})`);
  }

  if (audio) {
    const after = await loadRows(sb, REWRITES.map((r) => r[0]));
    let done = 0; let skipped = 0;
    for (const [id] of REWRITES) {
      if (after.get(id).known_audio_id) { skipped++; console.log(`known clip already linked, skip ${id}`); continue; }
      const res = await fetch(`${PHASE8}/regenerate-phrase/${COURSE}/${encodeURIComponent(id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles: ['known'] }),
      });
      const body = await res.text();
      console.log(`known audio ${id}: ${res.status} ${body.slice(0, 300)}`);
      if (res.ok) done++;
    }
    console.log(`known clips regenerated: ${done}, already linked: ${skipped}`);
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });

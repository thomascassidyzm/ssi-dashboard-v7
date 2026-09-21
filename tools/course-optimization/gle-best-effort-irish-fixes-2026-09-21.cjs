#!/usr/bin/env node
// tools/course-optimization/gle-best-effort-irish-fixes-2026-09-21.cjs
//
// gle_for_eng: the BEST-EFFORT pass that follows the clear-cut pass
// (gle-clearcut-irish-fixes-2026-09-21.cjs). Kai's standing instruction,
// 2026-09-21: "fix as much as well as we can, make Eoghan a clean list that is
// our real best effort that he can just read through" — so the rows the
// proposal (d/899c8b4f) parked as borderline are decided here, plus the
// grammar errors it listed under "Also noticed".
//
// DECIDED AND APPLIED
//   551/552/553  cuma ghránna ar … (Eoghan's own shape; his sample, his idiom point)
//   493          cad é an chéad rud eile?      (calque removed)
//   573          a fhágann … an-speisialta     (calque removed)
//   45           gach rud a bheith ar eolas agam (grammar: VN "to know" of a thing) — LEGO S0045L03
//                and every phrase carrying the same wrong shape course-wide (seeds 14, 45, 65-68, 70, 93, 160)
//   286/287      ar maith leo                  (grammar: copula relative) — LEGOs S0286L02, S0287L03 + phrases
//   459          an chomhartha ghoirm          (comhartha is masculine)
//   486          do shúile áille               (plural adjective)
//   506          sular bhog muid               (moved, not went)
//   608          b'é sin an rud ciallmhar      (copula)
//
// DELIBERATELY KEPT (decisions, not omissions — see the published list)
//   39/41/147/354/455/542/548/555 tuirseach/neirbhíseach/feargach/brónach used as adjectives:
//                Caitríona, who built the course, approved tá mé tuirseach; two natives differing
//                is not a defect (grammatical AND natural). 75 phrases stay.
//   575/576      corraitheach — a one-word swap to suaiteach if Eoghan prefers it.
//   550          the end of the village = ceann an tsráidbhaile — correct Irish (ceann na sráide).
//   272          Tá, sin smaoineamh iontach — everyday Irish; "sounds like" has no Irish counterpart here.
//   146/236/407/541/579 every one needs a "try" form — rows of the try plan Kai is settling with Eoghan.
//
// PROVENANCE: machine-proposed Irish, not native-confirmed. Eoghan reads the list.
//
// WRITES: course_seeds (target_text, approved_at=NULL), course_legos (target/type/components),
// course_practice_phrases (target_text, known_text on a few, qa_checked=NULL), content_edit_events,
// audio_pass_requests (APPENDED to the pending gle_for_eng row, never overwritten). No TTS, no deletes.
// The trg_null_*_audio_on_text_change triggers unlink stale clips; this script lists them first.
//
//   node tools/course-optimization/gle-best-effort-irish-fixes-2026-09-21.cjs           (dry run)
//   APPLY=1 node tools/course-optimization/gle-best-effort-irish-fixes-2026-09-21.cjs

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql') });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs');
const { evidencePath } = require('../../tools/lib/evidence-path.cjs');

const COURSE = 'gle_for_eng';
const APPLY = process.env.APPLY === '1';
const SWEEP = 'gle-best-effort-irish-fixes-2026-09-21';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;

// ─── SEEDS ───────────────────────────────────────────────────────────────────
const SEEDS = [
  { n: 45, before: 'Ní chaithfidh mé gach rud a fhios agam', after: 'Ní chaithfidh mé gach rud a bheith ar eolas agam',
    gloss: 'I need not everything to be known to me' },
  { n: 286, before: 'daoine a bhfuil sé maith leo Gaeilge a labhairt', after: 'daoine ar maith leo Gaeilge a labhairt',
    gloss: 'people who is good with them Irish to speak' },
  { n: 287, before: 'cé mhéad duine a bhfuil aithne agat orthu a bhfuil sé maith leo féachaint ar theilifís?',
    after: 'cé mhéad duine a bhfuil aithne agat orthu ar maith leo féachaint ar theilifís?',
    gloss: 'how many people that you know who is good with them watching television?' },
  { n: 459, before: 'Ní raibh sé os comhair na comhartha goirme', after: 'Ní raibh sé os comhair an chomhartha ghoirm',
    gloss: 'it was not in front of the blue sign (masculine genitive)' },
  { n: 486, before: 'ceapaim go bhfuil do shúile álainn', after: 'ceapaim go bhfuil do shúile áille',
    gloss: 'I think that your eyes are beautiful (plural adjective)' },
  { n: 493, before: 'cad atá chun teacht ar aghaidh?', after: 'cad é an chéad rud eile?', gloss: 'what is the next thing?' },
  { n: 506, before: 'bhínn i mo chónaí thart anseo blianta ó shin sula ndeachaigh muid',
    after: 'bhínn i mo chónaí thart anseo blianta ó shin sular bhog muid', gloss: 'I used to live around here years ago before we moved' },
  { n: 551, before: 'Tá an séipéal gránna', after: 'Tá cuma ghránna ar an séipéal', gloss: 'there is an ugly look on the church' },
  { n: 552, before: 'Tá an séipéal ar an taobh eile den tsráidbhaile gránna',
    after: 'Tá cuma ghránna ar an séipéal atá ar an taobh eile den tsráidbhaile',
    gloss: 'there is an ugly look on the church that is on the other side of the village' },
  { n: 553, before: 'ceapaim go bhfuil an séipéal beag an-ghránna', after: 'ceapaim go bhfuil cuma an-ghránna ar an séipéal beag',
    gloss: 'I think that there is a very ugly look on the small church' },
  { n: 573, before: 'is é an cineál ruda é a dhéanann na laethanta saoire an-speisialta',
    after: 'is é an cineál ruda é a fhágann na laethanta saoire an-speisialta', gloss: 'it is the kind of thing that leaves the holidays very special' },
  { n: 608, before: 'bheadh sé sin an rud ciallmhar le déanamh', after: "b'é sin an rud ciallmhar le déanamh",
    gloss: 'that was the sensible thing to do' },
];

// ─── LEGOS ───────────────────────────────────────────────────────────────────
const LEGOS = [
  { id: 'S0045L03', before: { known: 'to know', target: 'a fhios agam' },
    after: { known: 'to know', target: 'a bheith ar eolas agam', type: 'M',
      components: [{ known: 'to be', target: 'a bheith' }, { known: 'known to me', target: 'ar eolas agam' }] } },
  { id: 'S0286L02', before: { known: 'who like', target: 'a bhfuil sé maith leo' },
    after: { known: 'who like', target: 'ar maith leo', type: 'M',
      components: [{ known: 'who is', target: 'ar' }, { known: 'good', target: 'maith' }, { known: 'with them', target: 'leo' }] } },
  { id: 'S0287L03', before: { known: 'who like to', target: 'a bhfuil sé maith leo' },
    after: { known: 'who like to', target: 'ar maith leo', type: 'M',
      components: [{ known: 'who like to', target: 'ar maith leo' }] } },
];

// ─── PHRASES: explicit before/after per row (nothing pattern-matched blind) ──
const P = `${COURSE}:`;
const PHRASES = [
  // seed 45, under S0045L03 — the LEGO now needs its object, so "everything" joins the English where it was missing
  { id: P + 'S0045L03B01', kb: 'if I need to know', ka: 'if I need to know everything',
    tb: 'má chaithfidh mé a fhios agam', ta: 'má chaithfidh mé gach rud a bheith ar eolas agam' },
  { id: P + 'S0045L03B02', kb: "I don't need to know", ka: 'I need to know everything',
    tb: 'ní chaithfidh mé a fhios agam', ta: 'caithfidh mé gach rud a bheith ar eolas agam' },
  { id: P + 'S0045L03B03', kb: 'or if I need to know', ka: 'or if I need to know everything',
    tb: 'nó má chaithfidh mé a fhios agam', ta: 'nó má chaithfidh mé gach rud a bheith ar eolas agam' },
  { id: P + 'S0045L03U01', tb: 'ní chaithfidh mé gach rud a fhios agam', ta: 'ní chaithfidh mé gach rud a bheith ar eolas agam' },
  { id: P + 'S0045L03U02', kb: "or if I need to know, I'm thinking about how", ka: "or if I need to know everything, I'm thinking about how",
    tb: 'nó má chaithfidh mé a fhios agam, tá mé ag smaoineamh ar conas', ta: 'nó má chaithfidh mé gach rud a bheith ar eolas agam, tá mé ag smaoineamh ar conas' },
  { id: P + 'S0045L03U03', kb: 'if I need to know, I want to try my best', ka: 'if I need to know everything, I want to try my best',
    tb: 'má chaithfidh mé a fhios agam, tá mé ag iarraidh mo dhícheall a dhéanamh', ta: 'má chaithfidh mé gach rud a bheith ar eolas agam, tá mé ag iarraidh mo dhícheall a dhéanamh' },
  { id: P + 'S0045L03U04', tb: 'ní chaithfidh mé gach rud a fhios agam inniu', ta: 'ní chaithfidh mé gach rud a bheith ar eolas agam inniu' },
  { id: P + 'S0045L03U05', tb: 'nó má chaithfidh mé gach rud a fhios agam, tá mé ag iarraidh tosú', ta: 'nó má chaithfidh mé gach rud a bheith ar eolas agam, tá mé ag iarraidh tosú' },
  { id: P + 'S0045L03U06', tb: 'mothaím go maith ach ní chaithfidh mé gach rud a fhios agam anois', ta: 'mothaím go maith ach ní chaithfidh mé gach rud a bheith ar eolas agam anois' },
  { id: P + 'S0045L03U07', tb: 'ní chaithfidh mé gach rud a fhios agam ach tá mé ag iarraidh triail foghlaim', ta: 'ní chaithfidh mé gach rud a bheith ar eolas agam ach tá mé ag iarraidh triail foghlaim' },
  { id: P + 'S0045L03U08', tb: 'ní raibh mé ag smaoineamh ar rud éigin ach ní chaithfidh mé gach rud a fhios agam', ta: 'ní raibh mé ag smaoineamh ar rud éigin ach ní chaithfidh mé gach rud a bheith ar eolas agam' },
  // the same wrong shape elsewhere: "to know" + a clause → a fhios a bheith agam (the form S0201L02 teaches)
  { id: P + 'S0014L02U06', tb: 'ba mhaith liom a fhios agam an labhraíonn tú Gaeilge an lá ar fad', ta: 'ba mhaith liom a fhios a bheith agam an labhraíonn tú Gaeilge an lá ar fad' },
  { id: P + 'S0066L02U05', tb: 'tá sé deacair a fhios agam conas gach rud a rá i nGaeilge anois', ta: 'tá sé deacair a fhios a bheith agam conas gach rud a rá i nGaeilge anois' },
  { id: P + 'S0066L02U10', tb: 'ba mhaith liom a fhios agam conas labhairt Gaeilge ach tá sé deacair cuimhneamh', ta: 'ba mhaith liom a fhios a bheith agam conas labhairt Gaeilge ach tá sé deacair cuimhneamh' },
  { id: P + 'S0067L02B04', tb: 'is maith liom a fhios agam cad a bhfuil tú ag caint faoi', ta: 'is maith liom a fhios a bheith agam cad a bhfuil tú ag caint faoi' },
  { id: P + 'S0067L02U01', tb: 'tá mé ag iarraidh a fhios agam cad a bhfuil tú ag iarraidh a rá liom anois', ta: 'tá mé ag iarraidh a fhios a bheith agam cad a bhfuil tú ag iarraidh a rá liom anois' },
  { id: P + 'S0067L02B05', tb: 'tá mé ag iarraidh a fhios agam cad a bhfuil tú ag caint faoi an lá ar fad', ta: 'tá mé ag iarraidh a fhios a bheith agam cad a bhfuil tú ag caint faoi an lá ar fad' },
  { id: P + 'S0067L02U03', tb: 'is maith liom a fhios agam cad a bhfuil tú ag caint faoi agus ba mhaith liom cabhrú leat anois', ta: 'is maith liom a fhios a bheith agam cad a bhfuil tú ag caint faoi agus ba mhaith liom cabhrú leat anois' },
  { id: P + 'S0067L02U04', tb: 'tá mé ag iarraidh a fhios agam cad a bhfuil tú ag caint faoi an lá ar fad', ta: 'tá mé ag iarraidh a fhios a bheith agam cad a bhfuil tú ag caint faoi an lá ar fad' },
  { id: P + 'S0067L02B02', tb: 'tá mé ag iarraidh a fhios agam cad a bhfuil tú ag iarraidh a rá liom', ta: 'tá mé ag iarraidh a fhios a bheith agam cad a bhfuil tú ag iarraidh a rá liom' },
  { id: P + 'S0068L03U03', tb: 'ba mhaith liom a fhios agam cad atá tú ag lorg nuair atá tú ag smaoineamh mar sin', ta: 'ba mhaith liom a fhios a bheith agam cad atá tú ag lorg nuair atá tú ag smaoineamh mar sin' },
  { id: P + 'S0068L03B05', tb: 'ba mhaith liom a fhios agam cad atá tú ag lorg', ta: 'ba mhaith liom a fhios a bheith agam cad atá tú ag lorg' },
  { id: P + 'S0068L02U08', tb: 'tá sé tábhachtach am a thógáil chun a fhios agam cad atá tú ag caint faoi inniu', ta: 'tá sé tábhachtach am a thógáil chun a fhios a bheith agam cad atá tú ag caint faoi inniu' },
  { id: P + 'S0070L02U05', tb: 'mar tá mé ag iarraidh a fhios agam cá raibh sé', ta: 'mar tá mé ag iarraidh a fhios a bheith agam cá raibh sé' },
  { id: P + 'S0070L02U02', tb: 'tá mé ag iarraidh a fhios agam cá raibh sé', ta: 'tá mé ag iarraidh a fhios a bheith agam cá raibh sé' },
  { id: P + 'S0093L02U09', tb: 'Tá sé tábhachtach a fhios agam cathain a bhfuil sé in am imeacht agus gan an iomarca ama a thógáil', ta: 'Tá sé tábhachtach a fhios a bheith agam cathain a bhfuil sé in am imeacht agus gan an iomarca ama a thógáil' },
  // "to know" + a thing → X a bheith ar eolas agam (as the seed-45 LEGO now teaches)
  { id: P + 'S0065L02U03', tb: 'níl sé tábhachtach gach rud a fhios agam ach Tá sé tábhachtach ag triail', ta: 'níl sé tábhachtach gach focal a bheith ar eolas agam ach Tá sé tábhachtach ag triail' },
  { id: P + 'S0065L02U15', tb: 'níl sé tábhachtach gach freagra a fhios agam anois ag foghlaim Gaeilge', ta: 'níl sé tábhachtach gach freagra a bheith ar eolas agam anois ag foghlaim Gaeilge' },
  { id: P + 'S0066L01U02', tb: 'Níl sé tábhachtach gach rud a fhios agam ach Tá sé tábhachtach mo dhícheall a dhéanamh', ta: 'Níl sé tábhachtach gach focal a bheith ar eolas agam ach Tá sé tábhachtach mo dhícheall a dhéanamh' },
  { id: P + 'S0065L06U08', kb: 'it is useful to test yourself to find out how many words you know', ka: 'it is useful to test yourself to find out which words you know',
    tb: 'Tá sé úsáideach tú féin a thástáil chun fáil amach go leor focail a fhios agam', ta: 'Tá sé úsáideach tú féin a thástáil chun fáil amach na focail atá ar eolas agat' },
  { id: P + 'S0160L02U12', tb: 'dúirt sí liom go bhfuil an focal seo tábhachtach a fhios agat agus ba cheart duit é a úsáid chomh minic agus is féidir', ta: 'dúirt sí liom go bhfuil sé an-tábhachtach an focal seo a bheith ar eolas agat agus ba cheart duit é a úsáid chomh minic agus is féidir' },
];
// seeds 286/287/288: every row carrying the copula-relative error, plus "ar daoine" → "ar dhaoine" (lenition after ar) where it sits in the same row
const MAITH_RULE = (t) => t.replace(/a bhfuil sé maith leo/g, 'ar maith leo').replace(/\bar daoine\b/g, 'ar dhaoine');
const MAITH_SELECT = `SELECT id, known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND target_text LIKE '%a bhfuil sé maith leo%' ORDER BY id`;

const PHRASE_COLS = `id, seed_number, lego_id, phrase_role, known_text, target_text, qa_checked, known_audio_id, target1_audio_id, target2_audio_id`;

async function main() {
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = `tools/course-optimization/gle-best-effort-2026-09-21`;
  const log = { apply: APPLY, started: new Date().toISOString(), seeds: [], legos: [], phrases: [], staleAudio: [], aborted: [], zut: [] };

  // seeds
  const { rows: seedRows } = await pg.query(`SELECT seed_number, known_text, target_text, approved_at, known_audio_id, target1_audio_id, target2_audio_id
    FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) ORDER BY seed_number`, [COURSE, SEEDS.map(s => s.n)]);
  for (const s of SEEDS) {
    const live = seedRows.find(r => r.seed_number === s.n);
    if (!live) { log.aborted.push(`seed ${s.n} not found`); continue; }
    if (live.target_text !== s.before) { log.aborted.push(`seed ${s.n} drift: live="${live.target_text}"`); continue; }
    log.seeds.push({ n: s.n, known: live.known_text, before: s.before, after: s.after, gloss: s.gloss, wasApproved: !!live.approved_at,
      audio: { t1: live.target1_audio_id, t2: live.target2_audio_id } });
  }
  // legos
  const { rows: legoRows } = await pg.query(`SELECT lego_id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id
    FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2)`, [COURSE, LEGOS.map(l => l.id)]);
  for (const l of LEGOS) {
    const live = legoRows.find(r => r.lego_id === l.id);
    if (!live) { log.aborted.push(`lego ${l.id} not found`); continue; }
    if (live.known_text !== l.before.known || live.target_text !== l.before.target) { log.aborted.push(`lego ${l.id} drift: ${live.known_text}/${live.target_text}`); continue; }
    log.legos.push({ id: l.id, before: l.before, after: l.after, audio: { known: live.known_audio_id, t1: live.target1_audio_id, t2: live.target2_audio_id, presentation: live.presentation_audio_id } });
  }
  // phrases: explicit list
  const { rows: phraseRows } = await pg.query(`SELECT ${PHRASE_COLS} FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2)`, [COURSE, PHRASES.map(p => p.id)]);
  for (const p of PHRASES) {
    const live = phraseRows.find(r => r.id === p.id);
    if (!live) { log.aborted.push(`phrase ${p.id} not found`); continue; }
    if (live.target_text !== p.tb) { log.aborted.push(`phrase ${p.id} target drift: "${live.target_text}"`); continue; }
    if (p.kb !== undefined && live.known_text !== p.kb) { log.aborted.push(`phrase ${p.id} known drift: "${live.known_text}"`); continue; }
    if (/a fhios agam\b/.test(p.ta) && !/a fhios a bheith agam/.test(p.ta)) { log.aborted.push(`phrase ${p.id} still carries the bare shape`); continue; }
    log.phrases.push({ id: p.id, lego_id: live.lego_id, role: live.phrase_role, knownBefore: live.known_text, knownAfter: p.ka ?? live.known_text,
      before: live.target_text, after: p.ta, knownChanged: p.ka !== undefined && p.ka !== live.known_text, wasChecked: !!live.qa_checked,
      audio: { known: live.known_audio_id, t1: live.target1_audio_id, t2: live.target2_audio_id }, rule: 'fios' });
  }
  // phrases: the copula-relative rule over every live row that carries it
  const { rows: maithRows } = await pg.query(`SELECT ${PHRASE_COLS} FROM course_practice_phrases WHERE course_code=$1 AND target_text LIKE '%a bhfuil sé maith leo%' ORDER BY id`, [COURSE]);
  for (const live of maithRows) {
    const after = MAITH_RULE(live.target_text);
    if (after === live.target_text || /bhfuil sé maith leo/.test(after)) { log.aborted.push(`phrase ${live.id} rule failed: "${after}"`); continue; }
    log.phrases.push({ id: live.id, lego_id: live.lego_id, role: live.phrase_role, knownBefore: live.known_text, knownAfter: live.known_text,
      before: live.target_text, after, knownChanged: false, wasChecked: !!live.qa_checked,
      audio: { known: live.known_audio_id, t1: live.target1_audio_id, t2: live.target2_audio_id }, rule: 'ar maith leo' });
  }
  // sanity: nothing in the try zone is touched
  for (const p of log.phrases) {
    const tryBefore = (p.before.match(/ag triail|ag iarraidh/g) || []).join(',');
    const tryAfter = (p.after.match(/ag triail|ag iarraidh/g) || []).join(',');
    if (tryBefore !== tryAfter) log.aborted.push(`phrase ${p.id} changed a try form`);
  }

  // ZUT: lego level — same known elsewhere with a different target (pre-existing collisions reported, new ones abort)
  for (const l of log.legos) {
    const { rows } = await pg.query(`SELECT lego_id, known_text, target_text FROM course_legos WHERE course_code=$1 AND lego_id<>$2 AND lower(known_text)=lower($3)`, [COURSE, l.id, l.after.known]);
    for (const r of rows) {
      if (r.target_text.toLowerCase() === l.after.target.toLowerCase()) continue;
      const preExisting = r.target_text.toLowerCase() !== l.before.target.toLowerCase() && !log.legos.some(o => o.id === r.lego_id);
      const note = `${l.id} "${l.after.known}" -> "${l.after.target}" vs ${r.lego_id} "${r.target_text}" (${preExisting ? 'pre-existing' : 'NEW'})`;
      if (preExisting) log.zut.push(note); else log.aborted.push('ZUT ' + note);
    }
  }
  // ZUT: phrase level — same English elsewhere mapping to a different Irish, outside this change set
  for (const p of log.phrases) {
    const { rows } = await pg.query(`SELECT id, target_text FROM course_practice_phrases WHERE course_code=$1 AND id<>$2 AND lower(trim(known_text))=lower(trim($3)) AND lower(trim(target_text))<>lower(trim($4))`, [COURSE, p.id, p.knownAfter, p.after]);
    const others = rows.filter(r => !log.phrases.some(q => q.id === r.id));
    if (others.length) { p.zutNote = others.map(r => `${r.id}: ${r.target_text}`); log.zut.push(`phrase ${p.id} "${p.knownAfter}" -> "${p.after}" | ${p.zutNote.join(' ; ')}`); }
  }
  // seed ZUT: same English seed elsewhere
  for (const s of log.seeds) {
    const { rows } = await pg.query(`SELECT seed_number, target_text FROM course_seeds WHERE course_code=$1 AND seed_number<>$2 AND lower(trim(known_text))=lower(trim($3))`, [COURSE, s.n, s.known]);
    if (rows.length) log.zut.push(`seed ${s.n} English also at ${rows.map(r => r.seed_number + ':' + r.target_text).join(' ; ')}`);
  }

  // stale audio census (pre-edit ids; the triggers unlink them on write)
  const clipIds = new Set();
  for (const s of log.seeds) [s.audio.t1, s.audio.t2].forEach(a => a && clipIds.add(a));
  for (const l of log.legos) [l.audio.t1, l.audio.t2, l.audio.presentation].forEach(a => a && clipIds.add(a));
  for (const p of log.phrases) { [p.audio.t1, p.audio.t2].forEach(a => a && clipIds.add(a)); if (p.knownChanged && p.audio.known) clipIds.add(p.audio.known); }
  const ids = [...clipIds];
  const { rows: clips } = await pg.query(`SELECT id, role, voice_id, text, lego_id FROM course_audio WHERE id = ANY($1::uuid[])`, [ids]);
  const { rows: otherUsers } = await pg.query(`
    SELECT a.id,
      (SELECT count(*) FROM course_practice_phrases p WHERE p.course_code=$1 AND a.id IN (p.known_audio_id,p.target1_audio_id,p.target2_audio_id) AND NOT (p.id = ANY($3))) AS other_phrases,
      (SELECT count(*) FROM course_legos l WHERE l.course_code=$1 AND (a.id IN (l.known_audio_id,l.target1_audio_id,l.target2_audio_id) OR l.presentation_audio_id=a.id::text) AND NOT (l.lego_id = ANY($4))) AS other_legos,
      (SELECT count(*) FROM course_seeds s WHERE s.course_code=$1 AND a.id IN (s.known_audio_id,s.target1_audio_id,s.target2_audio_id) AND NOT (s.seed_number = ANY($5))) AS other_seeds
    FROM course_audio a WHERE a.id = ANY($2::uuid[])`, [COURSE, ids, log.phrases.map(p => p.id), log.legos.map(l => l.id), log.seeds.map(s => s.n)]);
  for (const c of clips) {
    const o = otherUsers.find(u => u.id === c.id) || {};
    log.staleAudio.push({ id: c.id, role: c.role, voice: c.voice_id, lego_id: c.lego_id, text: c.text,
      stillUsedByUntouchedRows: Number(o.other_phrases || 0) + Number(o.other_legos || 0) + Number(o.other_seeds || 0) });
  }

  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — ${COURSE}`);
  console.log(`seeds ${log.seeds.length}/${SEEDS.length}  legos ${log.legos.length}/${LEGOS.length}  phrases ${log.phrases.length} (${PHRASES.length} listed + ${maithRows.length} by rule; known changed on ${log.phrases.filter(p => p.knownChanged).length})  stale clips ${log.staleAudio.length} (${log.staleAudio.filter(c => c.stillUsedByUntouchedRows > 0).length} also used elsewhere)`);
  if (log.aborted.length) { console.log('\nABORT CONDITIONS:'); log.aborted.forEach(a => console.log('  ' + a)); }
  if (log.zut.length) { console.log('\nZUT notes:'); log.zut.forEach(z => console.log('  ' + z)); }

  if (!APPLY || log.aborted.length) {
    const f = evidencePath(`${outDir}/dryrun-${stamp}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 2));
    console.log(`\nWrote ${f}${log.aborted.length ? ' — NOT applying' : ''}`);
    await pg.end();
    process.exit(log.aborted.length ? 2 : 0);
  }

  const seedEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'seed-update',
    scope: { seed_numbers: log.seeds.map(s => s.n), rows: log.seeds.length },
    detail: { source: 'd/899c8b4f borderline table + "also noticed" grammar, decided under Kai\'s best-effort instruction 2026-09-21', edits: log.seeds.map(s => ({ n: s.n, before: s.before, after: s.after })) } });
  const legoEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'lego-update',
    scope: { lego_ids: log.legos.map(l => l.id), rows: log.legos.length },
    detail: { edits: log.legos.map(l => ({ id: l.id, before: l.before, after: { known: l.after.known, target: l.after.target } })) } });
  const phraseEvent = await recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation: 'phrase-edit',
    scope: { phrase_ids: log.phrases.map(p => p.id), rows: log.phrases.length },
    detail: { rules: ['X a fhios agam -> X a bheith ar eolas agam | a fhios a bheith agam', 'a bhfuil sé maith leo -> ar maith leo', 'ar daoine -> ar dhaoine'], knownChanged: log.phrases.filter(p => p.knownChanged).length } });
  log.events = { seedEvent, legoEvent, phraseEvent };

  await pg.query('BEGIN');
  try {
    for (const s of log.seeds) {
      const r = await pg.query(`UPDATE course_seeds SET target_text=$1, approved_at=NULL, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND seed_number=$4 AND target_text=$5`, [s.after, seedEvent, COURSE, s.n, s.before]);
      if (r.rowCount !== 1) throw new Error(`seed ${s.n} write race`);
    }
    for (const l of log.legos) {
      const r = await pg.query(`UPDATE course_legos SET known_text=$1, target_text=$2, type=$3, components=$4, last_edit_event_id=$5, updated_at=now() WHERE course_code=$6 AND lego_id=$7 AND target_text=$8`,
        [l.after.known, l.after.target, l.after.type, JSON.stringify(l.after.components), legoEvent, COURSE, l.id, l.before.target]);
      if (r.rowCount !== 1) throw new Error(`lego ${l.id} write race`);
    }
    for (const p of log.phrases) {
      const r = await pg.query(`UPDATE course_practice_phrases SET target_text=$1, known_text=$2, word_count=length($1), qa_checked=NULL, last_edit_event_id=$3, updated_at=now() WHERE course_code=$4 AND id=$5 AND target_text=$6`,
        [p.after, p.knownAfter, phraseEvent, COURSE, p.id, p.before]);
      if (r.rowCount !== 1) throw new Error(`phrase ${p.id} write race`);
    }
    const note = `${SWEEP}: ${log.seeds.length} seeds, ${log.legos.length} legos, ${log.phrases.length} phrases re-worded (Eoghan borderline + grammar set, Kai's best-effort instruction 2026-09-21); ${log.staleAudio.length} clips stale, listed in the job's published doc. No TTS run.`;
    const q = await pg.query(`UPDATE audio_pass_requests SET reason = reason || ' || ' || $2, metadata = coalesce(metadata,'{}'::jsonb) || $3::jsonb, updated_at=now() WHERE course_code=$1 AND status='pending' RETURNING id`,
      [COURSE, note, JSON.stringify({ [SWEEP]: { staleClips: log.staleAudio.length, rowsTouched: log.seeds.length + log.legos.length + log.phrases.length } })]);
    if (q.rowCount === 0) {
      await pg.query(`INSERT INTO audio_pass_requests (course_code, reason, requested_by, metadata) VALUES ($1,$2,$3,$4)`, [COURSE, note, `@${SWEEP}`, JSON.stringify({ staleClips: log.staleAudio.length })]);
      log.audioPass = 'inserted new pending request';
    } else log.audioPass = `appended to pending request ${q.rows[0].id}`;
    await pg.query('COMMIT');
  } catch (e) {
    await pg.query('ROLLBACK');
    console.error('ROLLED BACK:', e.message);
    await pg.end();
    process.exit(1);
  }

  const decoRows = log.phrases.map(p => ({ id: p.id, course_code: COURSE, seed_number: Number(p.id.match(/S(\d{4})/)[1]), target_text: p.after }));
  try { log.decomposition = await decoratePhrasesWithDecomposition(supabase, decoRows); } catch (e) { log.decomposition = { error: e.message }; }

  const f = evidencePath(`${outDir}/applied-${stamp}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2));
  console.log(`\nAPPLIED. events=${JSON.stringify(log.events)} audioPass=${log.audioPass} decomposition=${JSON.stringify(log.decomposition)}`);
  console.log(`Wrote ${f}`);
  await pg.end();
}

module.exports = { SEEDS, LEGOS, PHRASES, MAITH_RULE };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });

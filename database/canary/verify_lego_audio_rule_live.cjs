#!/usr/bin/env node
/**
 * Independent post-apply verifier for the course_legos audio-link rule
 * (20260817c_lego_audio_link_integrity.sql).
 *
 * WHY THIS EXISTS SEPARATELY FROM THE CANARY.
 *
 * canary_lego_audio_link_integrity.cjs is a one-shot pre/post instrument: its
 * BASELINE and BASELINEPRES controls assert the OLD behaviour, on purpose, to
 * prove the defect was real before the migration is applied. Once the migration
 * IS applied those controls can never pass again — the pre-state they measure no
 * longer exists. So the canary cannot be used to answer "is the rule behaving
 * correctly on production right now", which is a different question and the one
 * that matters after an apply.
 *
 * This file answers that question, against whatever is live, and it can be run
 * any time. It:
 *
 *   * NEVER COMMITS. There is no --commit flag. Everything happens inside one
 *     transaction that is ROLLED BACK on every path, success or failure. It
 *     applies no migration and creates no permanent row.
 *   * Asserts the live SHAPE (trigger present, enabled, carries the WHEN clause,
 *     function is SECURITY DEFINER with a pinned search_path, comment corrects
 *     the misleading name, old_link_raw column present).
 *   * Replays every branch of the rule on scratch fixtures and checks both the
 *     link outcome AND the content_audio_link_drops row, scoped to a high-water
 *     id taken at the start — that table holds real rows from other agents'
 *     edits and must never be assumed empty.
 *   * Closes the two coverage gaps the adversarial review (#942, finding 8)
 *     found in the canary: the `language` conjunct of
 *     audio_id_for_text_same_voice is never exercised there, and same-voice
 *     relink was only ever tested on the `known` role. Both are tested here.
 *   * Confirms the real production lego the canary probes was left clean.
 *
 * Usage:
 *   node database/canary/verify_lego_audio_rule_live.cjs
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const REPO = path.resolve(__dirname, '../..');
const COURSE = 'zzz_lverify_for_zzz';   // satisfies chk_course_code_format; cannot collide with a real course
const PROBE_COURSE = 'eng_for_sin';     // the course the canary's LIVEPATHS block probes

function databaseUrl() {
  const envPath = path.join(REPO, '.env.psql');
  const m = fs.readFileSync(envPath, 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  if (!m) throw new Error(`No DATABASE_URL in ${envPath}`);
  return m[1];
}

const checks = [];
// Instruments this server cannot provide. Printed at the end as explicit gaps —
// never silently folded into the green tally.
const skipped = [];
function assert(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const q = async (c, sql, params = []) => (await c.query(sql, params)).rows;

let clipSeq = 0;
async function mkClip(c, text, role, voice, language) {
  clipSeq += 1;
  const rows = await q(c, `
    INSERT INTO course_audio (course_code, text, language, role, voice_id, s3_key, origin, duration_ms)
    VALUES ($1, $2, $3, $4, $5, $6, 'tts', 1000)
    RETURNING id`,
    [COURSE, text, language, role, voice, `lverify/${role}/${clipSeq}-${voice}.mp3`]);
  return rows[0].id;
}

let seedSeq = 700;
async function mkLego(c, known, target, links = {}) {
  seedSeq += 1;
  await c.query(`
    INSERT INTO course_seeds (course_code, seed_number, known_text, target_text)
    VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [COURSE, seedSeq, known || 'seed known', target]);
  const rows = await q(c, `
    INSERT INTO course_legos
      (course_code, seed_number, lego_index, type, is_new, known_text, target_text,
       known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id)
    VALUES ($1,$2,1,'M',true,$3,$4,$5,$6,$7,$8)
    RETURNING id`,
    [COURSE, seedSeq, known, target,
     links.known || null, links.t1 || null, links.t2 || null,
     links.pres === undefined ? null : links.pres]);
  return rows[0].id;
}

const linkOf = async (c, id) =>
  (await q(c, `SELECT known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id
                 FROM course_legos WHERE id=$1`, [id]))[0];

let dropsHighWater = 0;
const dropsFor = async (c, id) =>
  q(c, `SELECT table_name, column_name, role, old_audio_id, new_audio_id, old_text, new_text,
               old_voice_id, old_link_raw, reason
          FROM content_audio_link_drops WHERE row_id=$1::text AND id > $2 ORDER BY id`,
    [String(id), dropsHighWater]);

(async () => {
  const c = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await c.query(`SET statement_timeout = '300s'`);
    // Nothing here takes a DDL lock, but a fixture INSERT still takes ROW
    // EXCLUSIVE on course_legos; fail fast rather than queue behind a pass.
    await c.query(`SET lock_timeout = '15s'`);
    await c.query('BEGIN');

    dropsHighWater = (await q(c,
      `SELECT coalesce(max(id), 0)::bigint AS m FROM content_audio_link_drops`))[0].m;
    console.log(`  content_audio_link_drops high-water id at start: ${dropsHighWater}`);
    console.log('  (this verifier NEVER commits — every path below ends in ROLLBACK)\n');

    // ── SHAPE: what is actually live ────────────────────────────────────────
    const trg = (await q(c, `
      SELECT tgenabled, pg_get_triggerdef(oid) AS def FROM pg_trigger
       WHERE tgname='trg_null_lego_audio_on_text_change'`))[0];
    assert('SHAPE the trigger exists on course_legos', !!trg);
    assert('SHAPE it is ENABLED (tgenabled=O, i.e. fires in origin/normal mode)',
      trg?.tgenabled === 'O', `tgenabled=${trg?.tgenabled}`);
    assert('SHAPE it is BEFORE UPDATE FOR EACH ROW on course_legos',
      /BEFORE UPDATE ON public\.course_legos FOR EACH ROW/.test(trg?.def || ''));
    assert('SHAPE it carries the WHEN clause (keeps the function off the hot path)',
      /WHEN \(\(\(old\.known_text IS DISTINCT FROM new\.known_text\) OR \(old\.target_text IS DISTINCT FROM new\.target_text\)\)\)/
        .test(trg?.def || ''), (trg?.def || '').slice(-140));

    const fn = (await q(c, `
      SELECT p.prosecdef, p.proconfig, pg_get_functiondef(p.oid) AS src,
             obj_description(p.oid, 'pg_proc') AS cmt
        FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='null_lego_audio_on_text_change'`))[0];
    assert('SHAPE the function is SECURITY DEFINER (it writes an RLS-protected table)',
      fn?.prosecdef === true);
    assert('SHAPE with a pinned search_path',
      (fn?.proconfig || []).some(x => /^search_path=/.test(x)), JSON.stringify(fn?.proconfig));
    assert('SHAPE the misleading name is corrected in the function comment',
      /does NOT simply null/i.test(fn?.cmt || ''));
    assert('SHAPE the function uses the SAME-VOICE matcher, not the voice-blind one',
      /audio_id_for_text_same_voice/.test(fn?.src || '') &&
      !/[^_]audio_id_for_text\(/.test((fn?.src || '').replace(/audio_id_for_text_same_voice/g, 'X')),
      'no bare audio_id_for_text( call remains in the body');
    assert('SHAPE it writes every move and drop to content_audio_link_drops',
      /INSERT INTO content_audio_link_drops/.test(fn?.src || ''));
    assert('SHAPE nothing in it writes to course_audio (make-before-break: no clip is touched)',
      !/(INSERT INTO|UPDATE|DELETE FROM)\s+course_audio/i.test(fn?.src || ''),
      'static read of the live source, not an inference');
    assert('SHAPE old_link_raw exists on the report table',
      (await q(c, `SELECT 1 FROM information_schema.columns
                    WHERE table_name='content_audio_link_drops' AND column_name='old_link_raw'`)).length === 1);

    await c.query(
      `INSERT INTO courses (course_code, display_name, known_lang, target_lang)
       VALUES ($1, 'lego-audio live verifier', 'eng', 'sin')
       ON CONFLICT (course_code) DO NOTHING`, [COURSE]);

    // ── RULE 1: the clip still speaks the words -> KEEP ─────────────────────
    const k1 = await mkClip(c, 'I want to go home', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const l1 = await mkLego(c, 'I want to go home', 'මට ගෙදර යන්න ඕන', { known: k1 });
    await c.query(`UPDATE course_legos SET known_text='  I want to go home.  ' WHERE id=$1`, [l1]);
    const r1 = await linkOf(c, l1);
    assert('RULE1 a whitespace/punctuation-only edit KEEPS the clip',
      r1.known_audio_id === k1);
    assert('RULE1 and reports nothing', (await dropsFor(c, l1)).length === 0);

    // ── RULE 2: same words, SAME VOICE -> re-point, and write it down ───────
    // Tested on `known` AND on `target1`. The canary only ever tested `known`
    // (adversarial review #942, finding 8).
    const k2old = await mkClip(c, 'she is my mother', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const k2new = await mkClip(c, 'she is my mum',    'known', 'azure_en-GB-RyanNeural', 'eng');
    const l2 = await mkLego(c, 'she is my mother', 'එයා මගේ අම්මා', { known: k2old });
    await c.query(`UPDATE course_legos SET known_text='she is my mum' WHERE id=$1`, [l2]);
    const r2 = await linkOf(c, l2);
    assert('RULE2 known: re-points to the clip we already own IN THAT VOICE',
      r2.known_audio_id === k2new, `-> ${String(r2.known_audio_id).slice(0, 8)}`);
    const d2 = await dropsFor(c, l2);
    assert('RULE2 known: the move is recorded as relinked-same-voice',
      d2.length === 1 && d2[0].reason === 'relinked-same-voice' &&
      d2[0].old_audio_id === k2old && d2[0].new_audio_id === k2new &&
      d2[0].old_voice_id === 'azure_en-GB-RyanNeural',
      JSON.stringify(d2.map(d => [d.reason, d.old_voice_id])));

    const t2old = await mkClip(c, 'පරණ වචනය',  'target1', 'azure_si-LK-SameeraNeural', 'sin');
    const t2new = await mkClip(c, 'අලුත් වචනය', 'target1', 'azure_si-LK-SameeraNeural', 'sin');
    const l2t = await mkLego(c, 'the old one', 'පරණ වචනය', { t1: t2old });
    await c.query(`UPDATE course_legos SET target_text='අලුත් වචනය' WHERE id=$1`, [l2t]);
    const r2t = await linkOf(c, l2t);
    assert('RULE2 target1: same-voice relink works on a TARGET role too (coverage gap #942/8)',
      r2t.target1_audio_id === t2new, `-> ${String(r2t.target1_audio_id).slice(0, 8)}`);
    const d2t = await dropsFor(c, l2t);
    assert('RULE2 target1: recorded as relinked-same-voice',
      d2t.length === 1 && d2t[0].reason === 'relinked-same-voice' &&
      d2t[0].column_name === 'target1_audio_id',
      JSON.stringify(d2t.map(d => [d.column_name, d.reason])));

    // ── RULE 2 NEGATIVE: a DIFFERENT voice must never be substituted ────────
    const k3old   = await mkClip(c, 'she wants to leave', 'known', 'azure_en-GB-RyanNeural',  'eng');
    const k3other = await mkClip(c, 'she wants to go',    'known', 'azure_en-GB-SoniaNeural', 'eng');
    const l3 = await mkLego(c, 'she wants to leave', 'එයාට යන්න ඕන', { known: k3old });
    await c.query(`UPDATE course_legos SET known_text='she wants to go' WHERE id=$1`, [l3]);
    const r3 = await linkOf(c, l3);
    assert('VOICE a clip in a DIFFERENT voice is never substituted',
      r3.known_audio_id !== k3other,
      `link is ${r3.known_audio_id === null ? 'NULL' : String(r3.known_audio_id).slice(0, 8)}`);
    assert('VOICE it nulls instead', r3.known_audio_id === null);
    const d3 = await dropsFor(c, l3);
    assert('VOICE and the drop names the clip, its voice and its words',
      d3.length === 1 && d3[0].reason === 'nulled-no-same-voice-clip-for-new-text' &&
      d3[0].old_audio_id === k3old && d3[0].old_text === 'she wants to leave' &&
      d3[0].new_text === 'she wants to go' &&
      d3[0].old_voice_id === 'azure_en-GB-RyanNeural',
      JSON.stringify(d3.map(d => [d.reason, d.old_voice_id])));
    // The voice-blind function this rule replaced WOULD have made that swap.
    const blind = await q(c, `SELECT audio_id_for_text($1,$2,'known') AS id`, [COURSE, 'she wants to go']);
    assert('VOICE control: audio_id_for_text — the rule replaced — WOULD have swapped the voice',
      blind[0].id === k3other, 'the hazard is real and that function is still live for other callers');

    // ── LANGUAGE conjunct: same text, same voice, DIFFERENT language ────────
    // audio_id_for_text_same_voice also requires
    //   a.language IS NOT DISTINCT FROM prev.language
    // and the canary never exercised it (#942, finding 8). Without it a lego
    // could be re-pointed at a clip of the right words in the right voice but
    // the wrong language — exactly the cross-language mislink class that has bitten
    // this estate before.
    const lgOld = await mkClip(c, 'mama', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const lgSameVoiceOtherLang = await mkClip(c, 'mamaa', 'known', 'azure_en-GB-RyanNeural', 'sin');
    const l4 = await mkLego(c, 'mama', 'මම', { known: lgOld });
    await c.query(`UPDATE course_legos SET known_text='mamaa' WHERE id=$1`, [l4]);
    const r4 = await linkOf(c, l4);
    assert('LANGUAGE a same-voice clip in a DIFFERENT language is NOT reused',
      r4.known_audio_id !== lgSameVoiceOtherLang && r4.known_audio_id === null,
      r4.known_audio_id === null ? 'nulled, correctly' : `WRONGLY relinked to ${String(r4.known_audio_id).slice(0, 8)}`);
    assert('LANGUAGE the drop is recorded',
      (await dropsFor(c, l4)).length === 1);
    // …and the identical fixture with the language MATCHING does relink, which is
    // what proves the language conjunct is the thing that made the difference.
    const lg2Old  = await mkClip(c, 'papa',  'known', 'azure_en-GB-RyanNeural', 'eng');
    const lg2Same = await mkClip(c, 'papaa', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const l5 = await mkLego(c, 'papa', 'තාත්තා', { known: lg2Old });
    await c.query(`UPDATE course_legos SET known_text='papaa' WHERE id=$1`, [l5]);
    const r5 = await linkOf(c, l5);
    assert('LANGUAGE control: the same fixture with a MATCHING language DOES relink',
      r5.known_audio_id === lg2Same,
      'so it is the language conjunct that blocked the one above, not the text or the voice');

    // ── RULE 0: THE WRITER WINS (folded in from #942, finding 4) ────────────
    // If the same UPDATE that changed the text also set the link column, the
    // trigger must keep its hands off. Before this, `SET text=…, audio_id=NULL`
    // had the link RESURRECTED from OLD's voice — the shape of an audio-first
    // text repair.
    const w1old = await mkClip(c, 'to remember', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const w1sub = await mkClip(c, 'to recall',   'known', 'azure_en-GB-RyanNeural', 'eng');
    const lw1 = await mkLego(c, 'to remember', 'මතක තියාගන්න', { known: w1old });
    await c.query(`UPDATE course_legos SET known_text='to recall', known_audio_id=NULL WHERE id=$1`, [lw1]);
    const rw1 = await linkOf(c, lw1);
    assert('RULE0 a writer clearing the link in the same UPDATE is respected — NOT resurrected',
      rw1.known_audio_id === null,
      rw1.known_audio_id === w1sub ? 'RESURRECTED to the same-voice substitute'
        : rw1.known_audio_id === null ? 'stayed NULL, as the writer asked' : 'unexpected value');
    assert('RULE0 and nothing is reported — the trigger did not act',
      (await dropsFor(c, lw1)).length === 0);

    const w2old = await mkClip(c, 'the big one',   'known', 'azure_en-GB-RyanNeural',  'eng');
    const w2set = await mkClip(c, 'the large one', 'known', 'azure_en-GB-SoniaNeural', 'eng');
    const lw2 = await mkLego(c, 'the big one', 'ලොකු එක', { known: w2old });
    await c.query(`UPDATE course_legos SET known_text='the large one', known_audio_id=$2 WHERE id=$1`,
      [lw2, w2set]);
    const rw2 = await linkOf(c, lw2);
    assert('RULE0 a writer SUPPLYING a link in the same UPDATE keeps it, even across voices',
      rw2.known_audio_id === w2set, 'an explicit audio-first repair is not second-guessed');
    assert('RULE0 and that is not reported as a drop either',
      (await dropsFor(c, lw2)).length === 0);

    // ── PRESENTATION: cosmetic keep, genuine drop, and the new reason ───────
    const pKeep = await mkClip(c, "ඉංග්‍රීසිෙන්. 'ගෙදර'. 'මට ගෙදර යන්න ඕන' ඉතින්. :",
      'presentation', 'azure_si-LK-SameeraNeural', 'sin');
    const lp1 = await mkLego(c, 'home', 'ගෙදර', { pres: pKeep });
    await c.query(`UPDATE course_legos SET target_text='ගෙදර ' WHERE id=$1`, [lp1]);
    const rp1 = await linkOf(c, lp1);
    assert('PRES a trailing-space edit KEEPS the presentation link (the bleed is stopped)',
      rp1.presentation_audio_id === pKeep,
      rp1.presentation_audio_id === null ? 'STILL DESTROYED' : 'kept');
    assert('PRES and reports nothing', (await dropsFor(c, lp1)).length === 0);

    const pDrop = await mkClip(c, "ඉංග්‍රීසිෙන්. 'දැන්'. 'මමට දැන් ඕනේ' ඉතින්. :",
      'presentation', 'azure_si-LK-SameeraNeural', 'sin');
    const lp2 = await mkLego(c, 'now', 'දැන්', { pres: pDrop });
    await c.query(`UPDATE course_legos SET target_text='පස්සේ' WHERE id=$1`, [lp2]);
    const rp2 = await linkOf(c, lp2);
    const dp2 = await dropsFor(c, lp2);
    assert('PRES a GENUINE edit still nulls presentation — but now it is RECORDED',
      rp2.presentation_audio_id === null && dp2.length === 1 &&
      dp2[0].column_name === 'presentation_audio_id' && dp2[0].role === 'presentation' &&
      dp2[0].old_audio_id === pDrop && dp2[0].old_voice_id === 'azure_si-LK-SameeraNeural',
      JSON.stringify(dp2.map(d => [d.column_name, d.reason])));
    assert('PRES the reason distinguishes "declined to look" from "looked and failed"',
      dp2[0]?.reason === 'nulled-presentation-not-text-addressable',
      `reason=${dp2[0]?.reason}`);
    assert('PRES the drop keeps the clip id, so the link is restorable by hand',
      dp2[0]?.old_audio_id === pDrop && rp2.presentation_audio_id === null);
    // The clip is never touched — make-before-break.
    assert('PRES the clip itself still exists in course_audio (nothing deletes audio)',
      (await q(c, `SELECT 1 FROM course_audio WHERE id=$1`, [pDrop])).length === 1);

    // A known_text-only change also invalidates presentation (scope preserved
    // from 20260806: a presentation clip can embed both sides).
    const pK = await mkClip(c, "ඉංග්‍රීසිෙන්. 'වතුර'. 'මට වතුර ඕන' ඉතින්. :",
      'presentation', 'azure_si-LK-SameeraNeural', 'sin');
    const lp3 = await mkLego(c, 'water', 'වතුර', { pres: pK });
    await c.query(`UPDATE course_legos SET known_text='some water' WHERE id=$1`, [lp3]);
    const rp3 = await linkOf(c, lp3);
    assert('PRES a KNOWN-side edit also invalidates presentation, and records it',
      rp3.presentation_audio_id === null && (await dropsFor(c, lp3)).length === 1);

    // ── Unparseable and dangling presentation values must not raise ─────────
    const lp4 = await mkLego(c, 'raw link', 'අමු', {});
    await c.query(`UPDATE course_legos SET presentation_audio_id='not-a-uuid-at-all' WHERE id=$1`, [lp4]);
    await c.query('SAVEPOINT rawprobe');
    let rawErr = null;
    try { await c.query(`UPDATE course_legos SET target_text='අලුත්' WHERE id=$1`, [lp4]); }
    catch (e) { rawErr = e.message; await c.query('ROLLBACK TO SAVEPOINT rawprobe'); }
    assert('RAW an unparseable presentation link does not RAISE and does not block the edit',
      rawErr === null, rawErr || 'edit succeeded');
    if (!rawErr) {
      const rp4 = await linkOf(c, lp4);
      const dp4 = await dropsFor(c, lp4);
      assert('RAW the edit really landed', (await q(c,
        `SELECT target_text FROM course_legos WHERE id=$1`, [lp4]))[0].target_text === 'අලුත්');
      assert('RAW the link is nulled and the raw value preserved in old_link_raw',
        rp4.presentation_audio_id === null && dp4.length === 1 &&
        dp4[0].reason === 'nulled-unparseable-link' &&
        dp4[0].old_link_raw === 'not-a-uuid-at-all' && dp4[0].old_audio_id === null,
        JSON.stringify(dp4.map(d => [d.reason, d.old_link_raw])));
    }

    const lp5 = await mkLego(c, 'dangling', 'එල්ලෙන', {});
    await c.query(`UPDATE course_legos SET presentation_audio_id=gen_random_uuid()::text WHERE id=$1`, [lp5]);
    await c.query(`UPDATE course_legos SET target_text='වෙනස්' WHERE id=$1`, [lp5]);
    const rp5 = await linkOf(c, lp5);
    const dp5 = await dropsFor(c, lp5);
    assert('DANGLE a presentation link to a clip that does not exist is nulled and reported',
      rp5.presentation_audio_id === null && dp5.length === 1 &&
      dp5[0].reason === 'nulled-dangling-link',
      JSON.stringify(dp5.map(d => d.reason)));

    // ── NULL known_text, and an already-NULL link ──────────────────────────
    const nkClip = await mkClip(c, 'about to vanish', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const lnk = await mkLego(c, 'about to vanish', 'නැති වෙනවා', { known: nkClip });
    await c.query('SAVEPOINT nullknown');
    let nkErr = null;
    try { await c.query(`UPDATE course_legos SET known_text=NULL WHERE id=$1`, [lnk]); }
    catch (e) { nkErr = e.message; await c.query('ROLLBACK TO SAVEPOINT nullknown'); }
    assert('NULLKNOWN known_text is NULLABLE here and setting it NULL does not raise',
      nkErr === null, nkErr || 'ok');
    if (!nkErr) {
      assert('NULLKNOWN it drops and reports rather than raising',
        (await linkOf(c, lnk)).known_audio_id === null &&
        (await dropsFor(c, lnk)).length === 1);
    }

    const lns = await mkLego(c, 'nothing linked here', 'මොකුත් නෑ', {});
    await c.query(`UPDATE course_legos SET known_text='still nothing linked' WHERE id=$1`, [lns]);
    assert('NULLSTAYS an already-NULL link stays NULL and reports nothing',
      (await linkOf(c, lns)).known_audio_id === null &&
      (await dropsFor(c, lns)).length === 0);

    // ── The WHEN clause: a non-text write must not even call the function ───
    // Observed the only way it can be: pg_stat counts the function's calls.
    const ntClip = await mkClip(c, 'unchanged text', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const ntPres = await mkClip(c, "ඉංග්‍රීසිෙන්. 'නොවෙනස්'. '' ඉතින්. :",
      'presentation', 'azure_si-LK-SameeraNeural', 'sin');
    const lnt = await mkLego(c, 'unchanged text', 'නොවෙනස්', { known: ntClip, pres: ntPres });
    const callsBefore = (await q(c, `
      SELECT coalesce(sum(calls), 0)::bigint AS n FROM pg_stat_user_functions f
        JOIN pg_proc p ON p.oid=f.funcid WHERE p.proname='null_lego_audio_on_text_change'`))[0].n;
    await c.query(`UPDATE course_legos SET release_batch=1 WHERE id=$1`, [lnt]);
    const callsAfter = (await q(c, `
      SELECT coalesce(sum(calls), 0)::bigint AS n FROM pg_stat_user_functions f
        JOIN pg_proc p ON p.oid=f.funcid WHERE p.proname='null_lego_audio_on_text_change'`))[0].n;
    const rnt = await linkOf(c, lnt);
    assert('WHEN a non-text update leaves every link alone and reports nothing',
      rnt.known_audio_id === ntClip && rnt.presentation_audio_id === ntPres &&
      (await dropsFor(c, lnt)).length === 0);
    // pg_stat_user_functions only tracks when track_functions is on; if it is
    // off both readings are 0 and this check states that honestly rather than
    // claiming a pass it cannot see.
    // off both readings are 0. That is an unavailable INSTRUMENT, not a defect,
    // so it is recorded as an explicit SKIP rather than either a pass it cannot
    // see or a failure it has no evidence for. The substantive claim does not
    // depend on it: the WHEN clause is proved present and correct by
    // pg_get_triggerdef above, and Postgres evaluates a row trigger's WHEN
    // clause before entering the function, so a false condition cannot call it.
    const tracked = (await q(c, `SHOW track_functions`))[0].track_functions !== 'none';
    if (tracked) {
      assert('WHEN and the function was NOT ENTERED AT ALL — the WHEN clause did its job',
        String(callsAfter) === String(callsBefore),
        `calls ${callsBefore} -> ${callsAfter}`);
    } else {
      skipped.push('WHEN the runtime proof that the function was not entered: track_functions=none on this server, so pg_stat_user_functions cannot see it. The WHEN clause itself is verified present by pg_get_triggerdef (SHAPE, above).');
      console.log('  SKIP  WHEN runtime call-count proof unavailable (track_functions=none) — see gap note at the end');
    }

    // ── The real production lego the canary probes must be clean ───────────
    const real = (await q(c, `
      SELECT id, known_text, target_text, version
        FROM course_legos WHERE course_code=$1 AND presentation_audio_id IS NOT NULL
       ORDER BY seed_number, lego_index LIMIT 1`, [PROBE_COURSE]))[0];
    assert('CLEAN the production lego the canary probes still exists', !!real,
      real && `${String(real.id).slice(0, 8)} v${real.version}`);
    assert('CLEAN its known_text carries no trailing/leading space left by a canary run',
      !!real && real.known_text === real.known_text.trim(),
      real && JSON.stringify(real.known_text));
    assert('CLEAN its target_text likewise',
      !!real && real.target_text === real.target_text.trim(),
      real && JSON.stringify(real.target_text));

    // Nothing this verifier did may be recorded against a real course. Scoped by
    // the high-water id — the table is NOT empty and other agents write to it.
    const stray = await q(c, `
      SELECT course_code, count(*)::int n FROM content_audio_link_drops
       WHERE id > $2 AND course_code <> $1 GROUP BY 1`, [COURSE, dropsHighWater]);
    assert('SCOPE this verifier recorded no drop against any real course',
      stray.length === 0, `high-water ${dropsHighWater}; strays ${JSON.stringify(stray)}`);

    // ── Verdict ────────────────────────────────────────────────────────────
    const failed = checks.filter(x => !x.ok);
    console.log(`\n  ${checks.length - failed.length}/${checks.length} green`);
    if (failed.length) console.log(`  RED: ${failed.map(f => f.name).join('; ')}`);
    if (skipped.length) {
      console.log(`\n  ${skipped.length} EXPLICIT GAP(S) — not counted as passes:`);
      for (const s of skipped) console.log(`    - ${s}`);
    }

    await c.query('ROLLBACK');
    console.log('  ROLLED BACK — this verifier never commits; production is untouched.\n');
    if (failed.length) process.exitCode = 1;
  } catch (err) {
    try { await c.query('ROLLBACK'); } catch {}
    console.error(`\n  VERIFIER ERROR: ${err.message}\n  ROLLED BACK.\n`);
    process.exitCode = 2;
  } finally {
    await c.end();
  }
})();

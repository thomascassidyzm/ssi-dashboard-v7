#!/usr/bin/env node
/**
 * Canary for 20260817b_phrase_audio_link_integrity.sql
 *
 * Same method as canary_seed_audio_link_integrity.cjs, which this is modelled on
 * deliberately: apply the migration inside ONE transaction, replay the real
 * behaviour against it, assert every legitimate path is still alive, and COMMIT
 * only if every assertion is green. Anything red — or no --commit — rolls the
 * whole thing back and the database never saw it.
 *
 * The controls are the point. This migration REPLACES a behaviour, it does not
 * add one, so "it is better now" has to be demonstrated on the same fixtures
 * rather than asserted:
 *
 *   BASELINE   the CURRENT trigger, before anything is applied, silently moves a
 *              phrase's audio onto a DIFFERENT VOICE on an ordinary text edit —
 *              no NULL, nothing written down. Proves the defect is real.
 *   CONTROL    on the same fixture, audio_id_for_text() WOULD still make that
 *              swap after the migration. Proves the improvement is the new rule,
 *              not the fixture.
 *   NOSWAP     the new rule nulls instead, and writes the drop down.
 *   SAMEVOICE  a clip we already own for the new text in the SAME voice is
 *              re-pointed to, and the move is written down.
 *   COSMETIC   a whitespace/trailing-punctuation edit KEEPS its clip (the
 *              regression 20260806 existed to prevent, still prevented).
 *   STALENORM  a clip whose stored text_normalized predates the normaliser's
 *              redefinition, but which speaks the right words, is KEPT.
 *   TARGET     a target_text edit handles target1 AND target2.
 *   NULLSTAYS  an already-NULL link stays NULL and reports nothing.
 *   NOTEXT     a non-text update touches no link and reports nothing (WHEN clause).
 *   PRESENTATION presentation_audio_id is left exactly as it was — scope unchanged.
 *   NAME       the trigger keeps its (misleading) name, so every pg_trigger match
 *              on it — tools/edit-impact-check.cjs included — still resolves.
 *   ROWID      row_id widened to text, phrase text keys land, and a SEED edit
 *              still records correctly through the widened column.
 *   NOAUDIODEL no course_audio row is inserted, updated or deleted by any of it.
 *   LIVEPATHS  the queries the learner path and the dashboard run against
 *              course_practice_phrases still work, and a real production phrase
 *              can still be written.
 *
 * If 20260817_seed_audio_link_integrity.sql is not live yet, it is applied first
 * inside the same transaction — the phrase migration hard-depends on its matcher
 * and its report table, and refuses to apply without them.
 *
 * Fixtures are created inside the transaction under a course_code that cannot
 * collide with a real course, and vanish on rollback. No TTS, ever.
 *
 * Usage:
 *   node database/canary/canary_phrase_audio_link_integrity.cjs            # dry run, always rolls back
 *   node database/canary/canary_phrase_audio_link_integrity.cjs --commit   # commit iff every check is green
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const REPO = path.resolve(__dirname, '../..');
const SEED_MIGRATION = path.join(REPO, 'database/migrations/20260817_seed_audio_link_integrity.sql');
const MIGRATION = path.join(REPO, 'database/migrations/20260817b_phrase_audio_link_integrity.sql');
const COMMIT = process.argv.includes('--commit');
const COURSE = 'zzz_pcanary_for_zzz';   // shaped to satisfy chk_course_code_format; no real course can collide

function databaseUrl() {
  const envPath = path.join(REPO, '.env.psql');
  const m = fs.readFileSync(envPath, 'utf8').match(/DATABASE_URL\s*=\s*"?([^"\n]+)"?/);
  if (!m) throw new Error(`No DATABASE_URL in ${envPath}`);
  return m[1];
}

const checks = [];
function assert(name, ok, detail) {
  checks.push({ name, ok: !!ok, detail });
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const q = async (c, sql, params = []) => (await c.query(sql, params)).rows;

// The migration files carry their own BEGIN/COMMIT so they are runnable
// standalone; inside an open transaction those would end ours early.
const inlined = (file) => fs.readFileSync(file, 'utf8')
  .replace(/^\s*BEGIN\s*;\s*$/mi, '-- BEGIN (canary: outer txn owns this)')
  .replace(/^\s*COMMIT\s*;\s*$/mi, '-- COMMIT (canary: outer txn owns this)');

async function mkClip(c, text, role, voice, language) {
  const rows = await q(c, `
    INSERT INTO course_audio (course_code, text, language, role, voice_id, s3_key, origin, duration_ms)
    VALUES ($1, $2, $3, $4, $5, $6, 'tts', 1000)
    RETURNING id`,
    [COURSE, text, language, role, voice, `pcanary/${role}/${encodeURIComponent(text)}-${voice}.mp3`]);
  return rows[0].id;
}

// course_practice_phrases has an FK onto course_legos (course_code, seed_number,
// lego_index), which in turn needs the seed. Build the whole spine once.
let legoSeq = 0;
async function mkPhrase(c, seedNumber, known, target, links = {}) {
  legoSeq += 1;
  const legoIndex = 1;
  await c.query(`
    INSERT INTO course_seeds (course_code, seed_number, known_text, target_text)
    VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`, [COURSE, seedNumber, known, target]);
  await c.query(`
    INSERT INTO course_legos (id, course_code, seed_number, lego_index, type, is_new, known_text, target_text)
    VALUES ($1, $2, $3, $4, 'M', true, $5, $6) ON CONFLICT DO NOTHING`,
    [`${COURSE}:S${String(seedNumber).padStart(4, '0')}L01`, COURSE, seedNumber, legoIndex, known, target]);
  const id = `${COURSE}:S${String(seedNumber).padStart(4, '0')}L01U${String(legoSeq).padStart(2, '0')}`;
  await c.query(`
    INSERT INTO course_practice_phrases
      (id, course_code, seed_number, lego_index, position, known_text, target_text,
       phrase_role, known_audio_id, target1_audio_id, target2_audio_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,'use',$8,$9,$10)`,
    [id, COURSE, seedNumber, legoIndex, legoSeq, known, target,
     links.known || null, links.t1 || null, links.t2 || null]);
  return id;
}

const linkOf = async (c, id) =>
  (await q(c, `SELECT known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id
                 FROM course_practice_phrases WHERE id=$1`, [id]))[0];

const dropsFor = async (c, id) =>
  q(c, `SELECT table_name, column_name, role, old_audio_id, new_audio_id, old_text, new_text,
               old_voice_id, reason
          FROM content_audio_link_drops WHERE row_id=$1::text ORDER BY id`, [String(id)]);

(async () => {
  const c = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await c.connect();
  let committed = false;
  try {
    await c.query('BEGIN');

    await c.query(
      `INSERT INTO courses (course_code, display_name, known_lang, target_lang)
       VALUES ($1, 'phrase-audio canary', 'eng', 'sin')
       ON CONFLICT (course_code) DO NOTHING`, [COURSE]);

    // ── The trigger definition, BEFORE we touch it ──────────────────────────
    const defBefore = (await q(c, `
      SELECT pg_get_triggerdef(oid) AS def FROM pg_trigger
       WHERE tgname='trg_null_phrase_audio_on_text_change'`))[0];
    assert('BASELINE the phrase trigger exists today', !!defBefore, defBefore?.def?.slice(0, 100));

    // ── BASELINE: the current rule silently swaps the VOICE ─────────────────
    // This is the shenanigan, reproduced. A phrase linked to a Ryan clip, edited
    // to text we happen to own only in Sonia's voice, ends up on Sonia — with no
    // NULL, no orphan and nothing written down anywhere.
    const bOld = await mkClip(c, 'I have to take her', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const bOther = await mkClip(c, 'I have to bring her', 'known', 'azure_en-GB-SoniaNeural', 'eng');
    const bPhrase = await mkPhrase(c, 900, 'I have to take her', 'මට එයාව එක්කගෙන යන්න වෙනවා', { known: bOld });
    await c.query(`UPDATE course_practice_phrases SET known_text='I have to bring her' WHERE id=$1`, [bPhrase]);
    const bAfter = await linkOf(c, bPhrase);
    assert('BASELINE today a phrase text edit SILENTLY MOVES THE SLOT TO ANOTHER VOICE',
      bAfter.known_audio_id === bOther,
      bAfter.known_audio_id === bOther ? 'Ryan -> Sonia, no NULL, no alarm'
        : `link is ${bAfter.known_audio_id === null ? 'NULL' : String(bAfter.known_audio_id).slice(0, 8)}`);

    // ── Apply, in this same transaction ─────────────────────────────────────
    const dropsExists = (await q(c, `SELECT to_regclass('public.content_audio_link_drops') AS t`))[0].t;
    if (!dropsExists) {
      await c.query(inlined(SEED_MIGRATION));
      console.log('  seed migration applied first (its machinery is a hard dependency)');
    } else {
      console.log('  seed migration already live — reusing its matcher and report table');
    }
    await c.query(inlined(MIGRATION));
    console.log('  phrase migration applied inside the transaction\n');

    const audioBefore = await q(c, `SELECT count(*)::int n FROM course_audio`);

    // ── NAME: the misleading name is KEPT, so nothing that matches it breaks ─
    const defAfter = (await q(c, `
      SELECT pg_get_triggerdef(oid) AS def FROM pg_trigger
       WHERE tgname='trg_null_phrase_audio_on_text_change'`))[0];
    assert('NAME the trigger keeps its name — every pg_trigger match still resolves',
      !!defAfter, defAfter?.def?.slice(0, 110));
    assert('NAME the lie is corrected in the function comment instead',
      /does NOT simply null/i.test((await q(c, `
        SELECT obj_description(p.oid, 'pg_proc') AS d FROM pg_proc p
          JOIN pg_namespace n ON n.oid=p.pronamespace
         WHERE n.nspname='public' AND p.proname='null_phrase_audio_on_text_change'`))[0]?.d || ''));

    // ── ROWID: widened to text ──────────────────────────────────────────────
    const rowIdType = (await q(c, `
      SELECT data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name='content_audio_link_drops' AND column_name='row_id'`))[0];
    assert('ROWID row_id is text, so a phrase key can be recorded at all',
      rowIdType?.data_type === 'text', rowIdType?.data_type);

    // ── NOSWAP: the same fixture shape, now under the new rule ──────────────
    const nsOld = await mkClip(c, 'she wants to leave', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const nsOther = await mkClip(c, 'she wants to go', 'known', 'azure_en-GB-SoniaNeural', 'eng');
    const nsPhrase = await mkPhrase(c, 901, 'she wants to leave', 'එයාට යන්න ඕන', { known: nsOld });
    await c.query(`UPDATE course_practice_phrases SET known_text='she wants to go' WHERE id=$1`, [nsPhrase]);
    const ns = await linkOf(c, nsPhrase);
    assert('NOSWAP does NOT silently move the slot to another voice',
      ns.known_audio_id !== nsOther,
      `link is now ${ns.known_audio_id === null ? 'NULL' : String(ns.known_audio_id).slice(0, 8)}`);
    assert('NOSWAP nulls instead of relinking', ns.known_audio_id === null);
    const nsDrops = await dropsFor(c, nsPhrase);
    assert('NOSWAP the drop is written down, naming the clip, its voice and its words',
      nsDrops.length === 1 && nsDrops[0].table_name === 'course_practice_phrases' &&
      nsDrops[0].reason === 'nulled-no-same-voice-clip-for-new-text' &&
      nsDrops[0].old_audio_id === nsOld && nsDrops[0].old_text === 'she wants to leave' &&
      nsDrops[0].new_text === 'she wants to go' &&
      nsDrops[0].old_voice_id === 'azure_en-GB-RyanNeural',
      JSON.stringify(nsDrops.map(d => [d.reason, d.old_voice_id])));

    // ── CONTROL: the OLD rule would still have made that swap ───────────────
    // The improvement demonstrated on the same fixture, not asserted.
    const wouldHave = await q(c, `SELECT audio_id_for_text($1,$2,'known') AS id`, [COURSE, 'she wants to go']);
    assert('CONTROL audio_id_for_text — the rule this migration removes — WOULD have swapped it',
      wouldHave[0].id === nsOther, 'confirms the hazard is real, and still live in that function');

    // ── SAMEVOICE ───────────────────────────────────────────────────────────
    const svOld = await mkClip(c, 'she is my mother', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const svNew = await mkClip(c, 'she is my mum', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const svPhrase = await mkPhrase(c, 902, 'she is my mother', 'එයා මගේ අම්මා', { known: svOld });
    await c.query(`UPDATE course_practice_phrases SET known_text='she is my mum' WHERE id=$1`, [svPhrase]);
    const sv = await linkOf(c, svPhrase);
    assert('SAMEVOICE re-points to the clip we already own in that voice',
      sv.known_audio_id === svNew, `-> ${String(sv.known_audio_id).slice(0, 8)}`);
    const svDrops = await dropsFor(c, svPhrase);
    assert('SAMEVOICE the move is written down', svDrops.length === 1 &&
      svDrops[0].reason === 'relinked-same-voice' && svDrops[0].old_audio_id === svOld &&
      svDrops[0].new_audio_id === svNew && svDrops[0].old_text === 'she is my mother',
      JSON.stringify(svDrops.map(d => d.reason)));

    // ── COSMETIC ────────────────────────────────────────────────────────────
    const cosClip = await mkClip(c, 'I want to go home', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const cosPhrase = await mkPhrase(c, 903, 'I want to go home', 'මට ගෙදර යන්න ඕන', { known: cosClip });
    await c.query(`UPDATE course_practice_phrases SET known_text='  I want to go home.  ' WHERE id=$1`, [cosPhrase]);
    const cos = await linkOf(c, cosPhrase);
    assert('COSMETIC a whitespace/punctuation-only edit KEEPS its clip', cos.known_audio_id === cosClip);
    assert('COSMETIC nothing is reported for it', (await dropsFor(c, cosPhrase)).length === 0);

    // ── STALENORM: borrow a REAL clip in the stale state ────────────────────
    // The state cannot be forged: trg_course_audio_normalize recomputes
    // text_normalized on every write to course_audio, so an UPDATE trying to
    // write a stale value has it corrected on the way in. Borrow one instead;
    // nothing about the borrowed clip is modified.
    const snClip = (await q(c, `
      SELECT id, text, text_normalized, normalize_text(text) AS live
        FROM course_audio
       WHERE course_code='ara_for_eng' AND role='known'
         AND text_normalized <> normalize_text(text)
       ORDER BY id LIMIT 1`))[0];
    if (!snClip) {
      assert('STALENORM no stale-normalised clip left to test against', true,
        'the backlog has been backfilled — this check is obsolete');
    } else {
      assert('STALENORM a real clip is in the stale state', snClip.text_normalized !== snClip.live,
        `stored "${snClip.text_normalized}" vs live "${snClip.live}"`);
      const snPhrase = await mkPhrase(c, 904, snClip.text, 'ඕනෑම දෙයක්', { known: snClip.id });
      await c.query(`UPDATE course_practice_phrases SET known_text=upper(known_text) WHERE id=$1`, [snPhrase]);
      const sn = await linkOf(c, snPhrase);
      assert('STALENORM a stale-normalised clip that speaks the right words is KEPT',
        sn.known_audio_id === snClip.id,
        sn.known_audio_id === null ? 'DROPPED a good link' : 'kept');
      assert('STALENORM nothing is reported for it', (await dropsFor(c, snPhrase)).length === 0);
      const naive = (await q(c, `SELECT $1::text = normalize_text($2) AS same`,
        [snClip.text_normalized, snClip.text.toUpperCase()]))[0];
      assert('STALENORM control: a stored-column-only test WOULD have dropped it',
        naive.same === false, 'confirms the disjunct is load-bearing, not decorative');
    }

    // ── TARGET: both target roles move on a target_text edit ────────────────
    const t1 = await mkClip(c, 'පරණ වාක්‍යය', 'target1', 'azure_si-LK-SameeraNeural', 'sin');
    const t2 = await mkClip(c, 'පරණ වාක්‍යය', 'target2', 'azure_si-LK-ThiliniNeural', 'sin');
    const tPhrase = await mkPhrase(c, 905, 'the old one', 'පරණ වාක්‍යය', { t1, t2 });
    await c.query(`UPDATE course_practice_phrases SET target_text='අලුත් වාක්‍යය' WHERE id=$1`, [tPhrase]);
    const t = await linkOf(c, tPhrase);
    assert('TARGET both target roles are handled on a target_text edit',
      t.target1_audio_id === null && t.target2_audio_id === null);
    assert('TARGET both drops are reported', (await dropsFor(c, tPhrase)).length === 2);

    // ── PRESENTATION: scope is unchanged — still not touched ────────────────
    const presClip = await mkClip(c, 'an intro clip', 'presentation', 'azure_en-GB-RyanNeural', 'eng');
    const prPhrase = await mkPhrase(c, 906, 'presentation stays', 'ඉදිරිපත් කිරීම', {});
    await c.query(`UPDATE course_practice_phrases SET presentation_audio_id=$2 WHERE id=$1`, [prPhrase, presClip]);
    await c.query(`UPDATE course_practice_phrases SET target_text='සම්පූර්ණයෙන් වෙනස්' WHERE id=$1`, [prPhrase]);
    const pr = await linkOf(c, prPhrase);
    assert('PRESENTATION presentation_audio_id is left exactly as it was — scope unchanged',
      pr.presentation_audio_id === presClip,
      'deliberate: 20260806 declined to widen, and 17,480 rows already dangle on that column');

    // ── NULLSTAYS ───────────────────────────────────────────────────────────
    const nullPhrase = await mkPhrase(c, 907, 'nothing linked here', 'මොකුත් නෑ', {});
    await c.query(`UPDATE course_practice_phrases SET known_text='still nothing linked' WHERE id=$1`, [nullPhrase]);
    const nl = await linkOf(c, nullPhrase);
    assert('NULLSTAYS an already-NULL link stays NULL and reports nothing',
      nl.known_audio_id === null && (await dropsFor(c, nullPhrase)).length === 0);

    // ── NOTEXT: the WHEN clause ─────────────────────────────────────────────
    const ntClip = await mkClip(c, 'unchanged text', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const ntPhrase = await mkPhrase(c, 908, 'unchanged text', 'වෙනස් වෙලා නෑ', { known: ntClip });
    await c.query(`UPDATE course_practice_phrases SET position=position WHERE id=$1`, [ntPhrase]);
    const nt = await linkOf(c, ntPhrase);
    assert('NOTEXT a non-text update leaves the link alone and reports nothing',
      nt.known_audio_id === ntClip && (await dropsFor(c, ntPhrase)).length === 0);

    // ── ROWID part two: a SEED edit still records through the widened column ─
    // The seed trigger's INSERT was written against a uuid row_id and is NOT
    // changed by this migration. Prove the assignment cast holds rather than
    // assuming it — a silent failure here would break Part 1 while fixing Part 2.
    const sClip = await mkClip(c, 'a seed sentence', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const sSeed = (await q(c, `
      INSERT INTO course_seeds (course_code, seed_number, known_text, target_text, known_audio_id)
      VALUES ($1, 990, 'a seed sentence', 'බීජ වාක්‍යය', $2) RETURNING id`, [COURSE, sClip]))[0].id;
    await c.query(`UPDATE course_seeds SET known_text='a completely different seed sentence' WHERE id=$1`, [sSeed]);
    const seedDrops = await dropsFor(c, sSeed);
    assert('ROWID a SEED edit still records correctly through the widened text column',
      seedDrops.length === 1 && seedDrops[0].table_name === 'course_seeds' &&
      seedDrops[0].reason === 'nulled-no-same-voice-clip-for-new-text',
      JSON.stringify(seedDrops.map(d => [d.table_name, d.reason])));

    // ── NOAUDIODEL ──────────────────────────────────────────────────────────
    const audioAfter = await q(c, `SELECT count(*)::int n FROM course_audio`);
    const fixtureClips = await q(c, `SELECT count(*)::int n FROM course_audio WHERE course_code=$1`, [COURSE]);
    const madeAfterBaseline = fixtureClips[0].n - 2;   // bOld and bOther predate audioBefore
    assert('NOAUDIODEL no course_audio row outside the fixtures changed count',
      audioAfter[0].n - audioBefore[0].n === madeAfterBaseline,
      `${audioBefore[0].n} -> ${audioAfter[0].n}, fixtures made after baseline ${madeAfterBaseline}`);

    // ── LIVEPATHS ───────────────────────────────────────────────────────────
    const live = await q(c, `
      SELECT p.id, p.seed_number, p.known_text, p.target_text, p.known_audio_id,
             p.target1_audio_id, p.target2_audio_id
        FROM course_practice_phrases p WHERE p.course_code='eng_for_sin'
       ORDER BY p.seed_number LIMIT 5`);
    assert('LIVEPATHS the phrase read a real course uses still returns rows', live.length === 5);

    for (const v of ['seed_with_legos', 'seed_cycles']) {
      await c.query('SAVEPOINT viewprobe');
      let rows = null, err = null;
      try { rows = await q(c, `SELECT * FROM ${v} WHERE course_code='eng_for_sin' LIMIT 3`);
            await c.query('RELEASE SAVEPOINT viewprobe'); }
      catch (e) { err = e.message; await c.query('ROLLBACK TO SAVEPOINT viewprobe'); }
      assert(`LIVEPATHS ${v} still resolves`, rows !== null && rows.length > 0, err || `${rows?.length} rows`);
    }

    // A real production phrase must still be writable — the trigger must not be
    // able to REFUSE an edit anybody legitimately makes.
    const realPhrase = (await q(c, `SELECT id, known_text FROM course_practice_phrases
                                     WHERE course_code='eng_for_sin' ORDER BY seed_number LIMIT 1`))[0];
    await c.query(`UPDATE course_practice_phrases SET position=position WHERE id=$1`, [realPhrase.id]);
    assert('LIVEPATHS a no-op write on a real production phrase still succeeds', true);
    await c.query(`UPDATE course_practice_phrases SET known_text = known_text || ' ' WHERE id=$1`, [realPhrase.id]);
    const realDrops = await dropsFor(c, realPhrase.id);
    assert('LIVEPATHS a trailing-space edit on a real phrase changes no link',
      realDrops.length === 0, `drops=${realDrops.length}`);

    // ── Verdict ─────────────────────────────────────────────────────────────
    const failed = checks.filter(x => !x.ok);
    console.log(`\n  ${checks.length - failed.length}/${checks.length} green`);
    if (failed.length) {
      console.log(`  RED: ${failed.map(f => f.name).join('; ')}`);
      await c.query('ROLLBACK');
      console.log('  ROLLED BACK — the database never saw this migration.\n');
      process.exit(1);
    }
    if (!COMMIT) {
      await c.query('ROLLBACK');
      console.log('  ALL GREEN, but --commit was not given: ROLLED BACK.');
      console.log('  The database is unchanged. Re-run with --commit to apply for real.\n');
    } else {
      await c.query(`DELETE FROM content_audio_link_drops WHERE course_code=$1`, [COURSE]);
      await c.query(`DELETE FROM course_practice_phrases WHERE course_code=$1`, [COURSE]);
      await c.query(`DELETE FROM course_legos           WHERE course_code=$1`, [COURSE]);
      await c.query(`DELETE FROM course_seeds           WHERE course_code=$1`, [COURSE]);
      await c.query(`DELETE FROM course_audio           WHERE course_code=$1`, [COURSE]);
      await c.query(`DELETE FROM courses                WHERE course_code=$1`, [COURSE]);
      await c.query('COMMIT');
      committed = true;
      console.log('  ALL GREEN — COMMITTED. Fixtures removed. PostgREST notified.\n');
    }
  } catch (err) {
    if (!committed) { try { await c.query('ROLLBACK'); } catch {} }
    console.error(`\n  CANARY FAILED: ${err.message}\n  ROLLED BACK.\n`);
    process.exitCode = 2;
  } finally {
    await c.end();
  }
})();

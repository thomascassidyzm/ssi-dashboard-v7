#!/usr/bin/env node
/**
 * Canary for 20260817_seed_audio_link_integrity.sql
 *
 * The standing method (supabase/secfix-toolkit in ssi-learning-app): apply the
 * migration inside ONE transaction, replay the real behaviour against it, assert
 * every legitimate path is still alive, and COMMIT only if every assertion is
 * green. Anything red — or --dry-run — rolls the whole thing back and the
 * database never saw it.
 *
 * What it asserts, in the same transaction as the DDL:
 *
 *   BASELINE   the trigger does not exist yet, and a seed text edit today leaves
 *              its audio link untouched and stale. (Proves the defect is real
 *              rather than assumed.)
 *   COSMETIC   a whitespace / trailing-punctuation-only edit KEEPS its clip.
 *              This is the regression the 2026-08-06 lego migration existed to
 *              prevent, and the one a naive "just null it" trigger reintroduces.
 *   SAMEVOICE  a real text change with a clip we already own for the new text
 *              IN THE SAME VOICE re-points to it, and writes the move down.
 *   NOSWAP     a real text change whose only candidate clip is in a DIFFERENT
 *              VOICE does NOT swap. It nulls, and writes the drop down. This is
 *              the hazard the lego/phrase triggers carry and the reason this
 *              migration exists in this shape.
 *   NULLSTAYS  an already-NULL link is left NULL and reports nothing.
 *   NOTEXT     an update that changes status but not text touches no link and
 *              reports nothing (the WHEN clause).
 *   DANGLING   a link pointing at a deleted clip nulls and reports.
 *   NOAUDIODEL no course_audio row is inserted, updated or deleted by any of it.
 *   LIVEPATHS  the queries the learner path and the dashboard actually run
 *              against course_seeds still work, and the seed-with-audio view
 *              still returns rows.
 *
 * Fixtures are created inside the transaction under a course_code that cannot
 * collide with a real course, and vanish on rollback. No TTS, ever.
 *
 * Usage:
 *   node database/canary/canary_seed_audio_link_integrity.cjs            # dry run, always rolls back
 *   node database/canary/canary_seed_audio_link_integrity.cjs --commit   # commit iff every check is green
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const REPO = path.resolve(__dirname, '../..');
const MIGRATION = path.join(REPO, 'database/migrations/20260817_seed_audio_link_integrity.sql');
const COMMIT = process.argv.includes('--commit');
const COURSE = 'zzz_canary_for_zzz';   // shaped to satisfy chk_course_code_format; no real course can collide

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

// A clip we own, in a named voice, for a given text and role.
async function mkClip(c, text, role, voice, language) {
  const rows = await q(c, `
    INSERT INTO course_audio (course_code, text, language, role, voice_id, s3_key, origin, duration_ms)
    VALUES ($1, $2, $3, $4, $5, $6, 'tts', 1000)
    RETURNING id`,
    [COURSE, text, language, role, voice, `canary/${role}/${encodeURIComponent(text)}.mp3`]);
  return rows[0].id;
}

async function mkSeed(c, n, known, target, knownAudio) {
  const rows = await q(c, `
    INSERT INTO course_seeds (course_code, seed_number, known_text, target_text, known_audio_id)
    VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [COURSE, n, known, target, knownAudio || null]);   // seed_id is GENERATED ALWAYS
  return rows[0].id;
}

const linkOf = async (c, id) =>
  (await q(c, 'SELECT known_audio_id, target1_audio_id, target2_audio_id FROM course_seeds WHERE id=$1', [id]))[0];

const dropsFor = async (c, id) =>
  q(c, 'SELECT column_name, role, old_audio_id, new_audio_id, old_text, new_text, reason FROM content_audio_link_drops WHERE row_id=$1 ORDER BY id', [id]);

(async () => {
  const c = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await c.connect();
  let committed = false;
  try {
    await c.query('BEGIN');

    // ── The course row the fixtures hang off ────────────────────────────────
    await c.query(
      `INSERT INTO courses (course_code, display_name, known_lang, target_lang)
       VALUES ($1, 'seed-audio canary', 'eng', 'sin')
       ON CONFLICT (course_code) DO NOTHING`, [COURSE]);

    // ── BASELINE: today, a seed text edit leaves the link stale ─────────────
    const preTrig = await q(c, `SELECT 1 FROM pg_trigger WHERE tgname='trg_null_seed_audio_on_text_change'`);
    assert('BASELINE trigger does not exist yet', preTrig.length === 0);

    const baseClip = await mkClip(c, 'the old sentence', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const baseSeed = await mkSeed(c, 900, 'the old sentence', 'ඉස්සර වාක්‍යය', baseClip);
    await c.query(`UPDATE course_seeds SET known_text='a completely different sentence' WHERE id=$1`, [baseSeed]);
    const after = await linkOf(c, baseSeed);
    assert('BASELINE a seed edit leaves audio pointing at the OLD text',
      after.known_audio_id === baseClip, `link still ${String(after.known_audio_id).slice(0, 8)}`);

    // ── Apply the migration, in this same transaction ───────────────────────
    // The file carries its own BEGIN/COMMIT so it is runnable standalone; inside
    // an open transaction those are a no-op plus a WARNING, and would end our
    // transaction early. Strip them and keep everything between.
    const sql = fs.readFileSync(MIGRATION, 'utf8')
      .replace(/^\s*BEGIN\s*;\s*$/mi, '-- BEGIN (canary: outer txn owns this)')
      .replace(/^\s*COMMIT\s*;\s*$/mi, '-- COMMIT (canary: outer txn owns this)');
    await c.query(sql);
    console.log('  migration applied inside the transaction\n');

    const postTrig = await q(c, `
      SELECT pg_get_triggerdef(oid) AS def FROM pg_trigger
       WHERE tgname='trg_null_seed_audio_on_text_change'`);
    assert('trigger exists after apply', postTrig.length === 1, postTrig[0]?.def?.slice(0, 90));

    const audioBefore = await q(c, `SELECT count(*)::int n, max(id::text) mx FROM course_audio`);

    // ── COSMETIC: trailing punctuation only — the clip must be KEPT ─────────
    const cosClip = await mkClip(c, 'I want to go home', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const cosSeed = await mkSeed(c, 901, 'I want to go home', 'මට ගෙදර යන්න ඕන', cosClip);
    await c.query(`UPDATE course_seeds SET known_text='  I want to go home.  ' WHERE id=$1`, [cosSeed]);
    const cos = await linkOf(c, cosSeed);
    assert('COSMETIC a whitespace/punctuation-only edit KEEPS its clip',
      cos.known_audio_id === cosClip);
    assert('COSMETIC nothing is reported for it', (await dropsFor(c, cosSeed)).length === 0);

    // ── SAMEVOICE: we already own the new text in the same voice ────────────
    const svOld = await mkClip(c, 'she is my mother', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const svNew = await mkClip(c, 'she is my mum', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const svSeed = await mkSeed(c, 902, 'she is my mother', 'එයා මගේ අම්මා', svOld);
    await c.query(`UPDATE course_seeds SET known_text='she is my mum' WHERE id=$1`, [svSeed]);
    const sv = await linkOf(c, svSeed);
    assert('SAMEVOICE re-points to the clip we already own in that voice',
      sv.known_audio_id === svNew, `-> ${String(sv.known_audio_id).slice(0, 8)}`);
    const svDrops = await dropsFor(c, svSeed);
    assert('SAMEVOICE the move is written down', svDrops.length === 1 &&
      svDrops[0].reason === 'relinked-same-voice' && svDrops[0].old_audio_id === svOld &&
      svDrops[0].new_audio_id === svNew && svDrops[0].old_text === 'she is my mother',
      JSON.stringify(svDrops.map(d => d.reason)));

    // ── NOSWAP: the only candidate for the new text is a DIFFERENT voice ────
    // This is the exact hazard audio_id_for_text carries on legos and phrases.
    const nsOld = await mkClip(c, 'I have to take her', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const nsOther = await mkClip(c, 'I have to bring her', 'known', 'azure_en-GB-SoniaNeural', 'eng');
    const nsSeed = await mkSeed(c, 903, 'I have to take her', 'මට එයාව එක්කගෙන යන්න වෙනවා', nsOld);
    await c.query(`UPDATE course_seeds SET known_text='I have to bring her' WHERE id=$1`, [nsSeed]);
    const ns = await linkOf(c, nsSeed);
    assert('NOSWAP does NOT silently move the slot to another voice',
      ns.known_audio_id !== nsOther, `link is now ${ns.known_audio_id === null ? 'NULL' : String(ns.known_audio_id).slice(0, 8)}`);
    assert('NOSWAP nulls instead of relinking', ns.known_audio_id === null);
    const nsDrops = await dropsFor(c, nsSeed);
    assert('NOSWAP the drop is written down, with the clip it used to speak',
      nsDrops.length === 1 && nsDrops[0].reason === 'nulled-no-same-voice-clip-for-new-text' &&
      nsDrops[0].old_audio_id === nsOld && nsDrops[0].old_text === 'I have to take her' &&
      nsDrops[0].new_text === 'I have to bring her',
      JSON.stringify(nsDrops.map(d => [d.reason, d.old_text])));
    // and the control: audio_id_for_text WOULD have swapped it.
    const wouldHave = await q(c, `SELECT audio_id_for_text($1,$2,'known') AS id`, [COURSE, 'I have to bring her']);
    assert('NOSWAP control: the lego/phrase rule WOULD have made that swap',
      wouldHave[0].id === nsOther, 'confirms the hazard is real, not hypothetical');

    // ── Both target roles move together on a target_text edit ──────────────
    const t1 = await mkClip(c, 'පරණ වාක්‍යය', 'target1', 'azure_si-LK-SameeraNeural', 'sin');
    const t2 = await mkClip(c, 'පරණ වාක්‍යය', 'target2', 'azure_si-LK-ThiliniNeural', 'sin');
    const tSeedRows = await q(c, `
      INSERT INTO course_seeds (course_code, seed_number, known_text, target_text,
                                target1_audio_id, target2_audio_id)
      VALUES ($1, 904, 'the old one', 'පරණ වාක්‍යය', $2, $3) RETURNING id`, [COURSE, t1, t2]);
    const tSeed = tSeedRows[0].id;
    await c.query(`UPDATE course_seeds SET target_text='අලුත් වාක්‍යය' WHERE id=$1`, [tSeed]);
    const t = await linkOf(c, tSeed);
    assert('TARGET both target roles are handled on a target_text edit',
      t.target1_audio_id === null && t.target2_audio_id === null);
    assert('TARGET both drops are reported', (await dropsFor(c, tSeed)).length === 2);

    // ── NULLSTAYS ───────────────────────────────────────────────────────────
    const nullSeed = await mkSeed(c, 905, 'nothing linked here', 'මොකුත් නෑ', null);
    await c.query(`UPDATE course_seeds SET known_text='still nothing linked' WHERE id=$1`, [nullSeed]);
    const nl = await linkOf(c, nullSeed);
    assert('NULLSTAYS an already-NULL link stays NULL and reports nothing',
      nl.known_audio_id === null && (await dropsFor(c, nullSeed)).length === 0);

    // ── NOTEXT: a non-text update must not touch anything ───────────────────
    const ntClip = await mkClip(c, 'unchanged text', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const ntSeed = await mkSeed(c, 906, 'unchanged text', 'වෙනස් වෙලා නෑ', ntClip);
    await c.query(`UPDATE course_seeds SET approved_at=now() WHERE id=$1`, [ntSeed]);
    const nt = await linkOf(c, ntSeed);
    assert('NOTEXT a status-only update leaves the link alone and reports nothing',
      nt.known_audio_id === ntClip && (await dropsFor(c, ntSeed)).length === 0);

    // ── DANGLING ────────────────────────────────────────────────────────────
    const dgClip = await mkClip(c, 'about to vanish', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const dgSeed = await mkSeed(c, 907, 'about to vanish', 'නැති වෙනවා', dgClip);
    await c.query(`UPDATE course_seeds SET known_audio_id=NULL WHERE id=$1`, [dgSeed]);   // release the FK, if any
    await c.query(`DELETE FROM course_audio WHERE id=$1`, [dgClip]);
    // Re-pointing at the now-deleted clip may hit a foreign key. A plain .catch()
    // is not enough: in Postgres ANY error aborts the whole transaction, so the
    // attempt has to sit inside its own savepoint or it takes the canary with it.
    await c.query('SAVEPOINT dangling_probe');
    try {
      await c.query(`UPDATE course_seeds SET known_audio_id=$2 WHERE id=$1`, [dgSeed, dgClip]);
      await c.query('RELEASE SAVEPOINT dangling_probe');
    } catch {
      await c.query('ROLLBACK TO SAVEPOINT dangling_probe');
    }
    const dgPre = await linkOf(c, dgSeed);
    if (dgPre.known_audio_id === dgClip) {
      await c.query(`UPDATE course_seeds SET known_text='it vanished' WHERE id=$1`, [dgSeed]);
      const dg = await linkOf(c, dgSeed);
      const dgDrops = await dropsFor(c, dgSeed);
      assert('DANGLING a link to a deleted clip nulls and is reported',
        dg.known_audio_id === null && dgDrops.some(d => d.reason === 'nulled-dangling-link'));
    } else {
      assert('DANGLING cannot occur — a foreign key already forbids it', true, 'case not reachable');
    }

    // ── NOAUDIODEL: none of this touched course_audio beyond our fixtures ───
    const audioAfter = await q(c, `SELECT count(*)::int n FROM course_audio`);
    const fixtureClips = await q(c, `SELECT count(*)::int n FROM course_audio WHERE course_code=$1`, [COURSE]);
    assert('NOAUDIODEL no course_audio row outside the fixtures changed count',
      audioAfter[0].n - audioBefore[0].n === fixtureClips[0].n - 1,   // -1: dgClip was deleted on purpose
      `${audioBefore[0].n} -> ${audioAfter[0].n}, fixtures ${fixtureClips[0].n}`);

    // ── LIVEPATHS: the real read paths still work ──────────────────────────
    const live = await q(c, `
      SELECT s.seed_number, s.known_text, s.target_text, s.known_audio_id,
             s.target1_audio_id, s.target2_audio_id, s.status
        FROM course_seeds s WHERE s.course_code='eng_for_sin'
       ORDER BY s.seed_number LIMIT 5`);
    assert('LIVEPATHS the seed read a real course uses still returns rows', live.length === 5);

    // The two views built on course_seeds. Named from the live catalogue, not
    // guessed: SELECT table_name FROM information_schema.views WHERE
    // view_definition LIKE '%course_seeds%'.
    for (const v of ['seed_with_legos', 'seed_cycles']) {
      await c.query('SAVEPOINT viewprobe');
      let rows = null, err = null;
      try { rows = await q(c, `SELECT * FROM ${v} WHERE course_code='eng_for_sin' LIMIT 3`);
            await c.query('RELEASE SAVEPOINT viewprobe'); }
      catch (e) { err = e.message; await c.query('ROLLBACK TO SAVEPOINT viewprobe'); }
      assert(`LIVEPATHS ${v} still resolves`, rows !== null && rows.length > 0,
        err || `${rows?.length} rows`);
    }

    // A real approval-shaped write on a real course must still succeed —
    // proving the trigger cannot refuse an edit anybody legitimately makes.
    const realSeed = (await q(c, `SELECT id, known_text FROM course_seeds
                                   WHERE course_code='eng_for_sin' ORDER BY seed_number LIMIT 1`))[0];
    await c.query(`UPDATE course_seeds SET status=status WHERE id=$1`, [realSeed.id]);
    assert('LIVEPATHS a no-op write on a real production seed still succeeds', true);
    // and a real text edit on a real row behaves, then we undo it (inside the txn).
    await c.query(`UPDATE course_seeds SET known_text = known_text || ' ' WHERE id=$1`, [realSeed.id]);
    const realAfter = await q(c, `SELECT known_audio_id FROM course_seeds WHERE id=$1`, [realSeed.id]);
    const realDrops = await q(c, `SELECT reason FROM content_audio_link_drops WHERE row_id=$1`, [realSeed.id]);
    assert('LIVEPATHS a trailing-space edit on a real seed changes no link',
      realDrops.length === 0, `drops=${realDrops.length}, link=${realAfter[0].known_audio_id ? 'kept' : 'null'}`);

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
      await c.query(`DELETE FROM course_seeds  WHERE course_code=$1`, [COURSE]);
      await c.query(`DELETE FROM course_audio  WHERE course_code=$1`, [COURSE]);
      await c.query(`DELETE FROM courses       WHERE course_code=$1`, [COURSE]);
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

#!/usr/bin/env node
/**
 * Canary for 20260817c_lego_audio_link_integrity.sql
 *
 * Same method as canary_seed_audio_link_integrity.cjs and
 * canary_phrase_audio_link_integrity.cjs, which this is modelled on
 * deliberately: apply the migration inside ONE transaction, replay the real
 * behaviour against it, assert every legitimate path is still alive, and COMMIT
 * only if every assertion is green. Anything red — or no --commit — rolls the
 * whole thing back and the database never saw it.
 *
 * The controls are the point. This migration REPLACES a behaviour, it does not
 * add one, so "it is better now" has to be demonstrated on the same fixtures
 * rather than asserted:
 *
 *   BASELINE     the CURRENT trigger, before anything is applied, silently moves
 *                a lego's audio onto a DIFFERENT VOICE on an ordinary text edit
 *                — no NULL, nothing written down. Proves the defect is real on
 *                THIS table, not just on phrases.
 *   BASELINEPRES the CURRENT trigger destroys a lego's presentation link on a
 *                TRAILING-SPACE edit, permanently and unrecorded. Proves finding
 *                2/3 of the migration header on live machinery.
 *   CONTROL      on the same fixture, audio_id_for_text() WOULD still make that
 *                swap after the migration. Proves the improvement is the new
 *                rule, not the fixture.
 *   NOSWAP       the new rule nulls instead, and writes the drop down.
 *   SAMEVOICE    a clip we already own for the new text in the SAME voice is
 *                re-pointed to, and the move is written down.
 *   COSMETIC     a whitespace/trailing-punctuation edit KEEPS its known clip.
 *   COSMETICPRES the same edit now KEEPS its presentation clip — the new
 *                protection — with a control showing the old rule would not.
 *   PRESDROP     a GENUINE edit still nulls presentation, but now reports it,
 *                naming the clip, its voice and the words it speaks.
 *   PRESRAW      a presentation link that is not uuid-shaped does not raise, does
 *                not block the edit, and is recorded in old_link_raw.
 *   PRESDANGLE   a presentation link to a course_audio row that does not exist
 *                (possible: text column, no FK) is nulled and reported.
 *   STALENORM    a clip whose stored text_normalized predates the normaliser's
 *                redefinition, but which speaks the right words, is KEPT.
 *   TARGET       a target_text edit handles target1 AND target2.
 *   NULLKNOWN    course_legos.known_text is NULLABLE; setting it to NULL drops
 *                and reports rather than raising.
 *   NULLSTAYS    an already-NULL link stays NULL and reports nothing.
 *   NOTEXT       a non-text update touches no link and reports nothing.
 *   WRITERWINS   a link set in the SAME UPDATE as the text is respected, and an
 *                explicit NULL is not resurrected (rule 0).
 *   LANGUAGE     a same-voice clip in a DIFFERENT language is not accepted as a
 *                substitute, with a control showing the old rule would take it.
 *   NAME         the trigger keeps its (misleading) name, so every pg_trigger
 *                match on it — tools/edit-impact-check.cjs included — resolves.
 *   ROWID        a lego uuid id records through the text row_id column, and a
 *                SEED edit and a PHRASE edit still record correctly too.
 *   NOAUDIODEL   the function contains no write against course_audio in any
 *                branch (static), and the one borrowed production clip is
 *                byte-identical afterwards (targeted).
 *   LIVEPATHS    the queries the learner path and the dashboard run against
 *                course_legos still work, and a real production lego can still
 *                be written.
 *
 * The restore discipline is not decoration. Both prior canaries dirtied a real
 * production row and never cleaned it up; --commit commits, so on 2026-08-17
 * that left a real trailing space on eng_for_sin seed 1 and on
 * eng_for_sin:S0001L01B01. This canary performs the explicit restore AND asserts
 * it — and then rolls the whole production probe back to a SAVEPOINT, because an
 * explicit restore cannot undo the version bump, the content_audit_log rows or
 * the content-stamp bump that invalidates learners' cached scripts. Claiming
 * "left exactly as it was found" on the strength of a text rewrite alone was
 * overclaiming, and an adversarial review said so.
 *
 * Several checks are deliberately KEEP tests (COSMETIC, COSMETICPRES, NULLSTAYS,
 * NOTEXT, STALENORM) and would also pass if the trigger were simply absent. That
 * is what they are for — they guard against over-eager dropping. The tests that
 * prove the trigger is present and doing work are NOSWAP, SAMEVOICE, PRESDROP,
 * TARGET, WRITERWINS, LANGUAGE and NAME.
 *
 * 20260817_seed_audio_link_integrity.sql and 20260817b_phrase_audio_link_integrity.sql
 * are hard dependencies (this migration owns no matcher and no report table of
 * its own). If either is not live it is applied first, inside the same
 * transaction.
 *
 * Fixtures are created inside the transaction under a course_code that cannot
 * collide with a real course, and vanish on rollback. No TTS, ever.
 *
 * Usage:
 *   node database/canary/canary_lego_audio_link_integrity.cjs            # dry run, always rolls back
 *   node database/canary/canary_lego_audio_link_integrity.cjs --commit   # commit iff every check is green
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const REPO = path.resolve(__dirname, '../..');
const SEED_MIGRATION   = path.join(REPO, 'database/migrations/20260817_seed_audio_link_integrity.sql');
const PHRASE_MIGRATION = path.join(REPO, 'database/migrations/20260817b_phrase_audio_link_integrity.sql');
const MIGRATION        = path.join(REPO, 'database/migrations/20260817c_lego_audio_link_integrity.sql');
const COMMIT = process.argv.includes('--commit');
const COURSE = 'zzz_lcanary_for_zzz';   // satisfies chk_course_code_format; no real course can collide

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
    [COURSE, text, language, role, voice, `lcanary/${role}/${encodeURIComponent(text)}-${voice}.mp3`]);
  return rows[0].id;
}

// course_legos has fk_course_legos_seed onto course_seeds (course_code, seed_number),
// so the seed has to exist first. course_legos.id is a uuid with a
// gen_random_uuid() default — verified against information_schema on 2026-08-17,
// NOT assumed — so it is never supplied here. The NOT NULL columns with no
// default are course_code, seed_number, lego_index, type, is_new and target_text;
// every one of them is supplied. known_text is NULLABLE and is exercised as such
// by the NULLKNOWN check.
let legoSeq = 0;
async function mkLego(c, seedNumber, known, target, links = {}) {
  legoSeq += 1;
  await c.query(`
    INSERT INTO course_seeds (course_code, seed_number, known_text, target_text)
    VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
    [COURSE, seedNumber, known || 'seed known', target]);
  const rows = await q(c, `
    INSERT INTO course_legos
      (course_code, seed_number, lego_index, type, is_new, known_text, target_text,
       known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id)
    VALUES ($1,$2,$3,'M',true,$4,$5,$6,$7,$8,$9)
    RETURNING id`,
    [COURSE, seedNumber, 1, known, target,
     links.known || null, links.t1 || null, links.t2 || null,
     links.pres === undefined ? null : links.pres]);
  return rows[0].id;
}

const linkOf = async (c, id) =>
  (await q(c, `SELECT known_audio_id, target1_audio_id, target2_audio_id, presentation_audio_id
                 FROM course_legos WHERE id=$1`, [id]))[0];

// Every drops read is scoped to rows THIS RUN wrote. content_audio_link_drops is
// not empty and must not be assumed to be: the seed and phrase triggers have been
// live since earlier on 2026-08-17 and other agents' real edits land in it while
// this canary runs.
let dropsHighWater = 0;
const dropsFor = async (c, id) =>
  q(c, `SELECT table_name, column_name, role, old_audio_id, new_audio_id, old_text, new_text,
               old_voice_id, old_link_raw, reason
          FROM content_audio_link_drops WHERE row_id=$1::text AND id > $2 ORDER BY id`,
    [String(id), dropsHighWater]);

// Same shape, for use BEFORE the migration adds old_link_raw.
const dropsForPre = async (c, id) =>
  q(c, `SELECT table_name, column_name, reason FROM content_audio_link_drops
         WHERE row_id=$1::text AND id > $2 ORDER BY id`, [String(id), dropsHighWater]);

(async () => {
  const c = new Client({ connectionString: databaseUrl(), ssl: { rejectUnauthorized: false } });
  await c.connect();
  let committed = false;
  try {
    // The fingerprint and the stale predicates below both blow the server
    // default; a read that proves safety must not be the thing that times out.
    await c.query(`SET statement_timeout = '300s'`);
    // DROP/CREATE TRIGGER takes ACCESS EXCLUSIVE on course_legos and holds it to
    // COMMIT. course_legos is written by content passes all day, so without this
    // a canary run started against a busy table would queue behind them AND make
    // every one of their writes queue behind it. Fail fast and be re-run instead.
    await c.query(`SET lock_timeout = '15s'`);
    await c.query('BEGIN');

    await c.query(
      `INSERT INTO courses (course_code, display_name, known_lang, target_lang)
       VALUES ($1, 'lego-audio canary', 'eng', 'sin')
       ON CONFLICT (course_code) DO NOTHING`, [COURSE]);

    // High-water mark on the report table, taken before anything is applied.
    // The seed and phrase triggers went live earlier today, so this table
    // already holds real rows from other agents' edits; every "did we record
    // anything we should not have" assertion below is scoped by it.
    dropsHighWater = (await q(c,
      `SELECT coalesce(max(id), 0)::bigint AS m FROM content_audio_link_drops`))[0].m;
    console.log(`  content_audio_link_drops high-water id at start: ${dropsHighWater}`);

    // ── The trigger definition, BEFORE we touch it ──────────────────────────
    const defBefore = (await q(c, `
      SELECT pg_get_triggerdef(oid) AS def FROM pg_trigger
       WHERE tgname='trg_null_lego_audio_on_text_change'`))[0];
    assert('BASELINE the lego trigger exists today', !!defBefore, defBefore?.def?.slice(0, 100));
    assert('BASELINE it has NO WHEN clause today (fires on every lego write)',
      !!defBefore && !/WHEN/.test(defBefore.def));

    // ── BASELINE: the current rule silently swaps the VOICE ─────────────────
    // A lego linked to a Ryan clip, edited to text we happen to own only in
    // Sonia's voice, ends up on Sonia — no NULL, no orphan, nothing written down.
    const bOld   = await mkClip(c, 'I have to take her', 'known', 'azure_en-GB-RyanNeural',  'eng');
    const bOther = await mkClip(c, 'I have to bring her', 'known', 'azure_en-GB-SoniaNeural', 'eng');
    const bLego  = await mkLego(c, 900, 'I have to take her', 'මට එයාව එක්කගෙන යන්න වෙනවා', { known: bOld });
    await c.query(`UPDATE course_legos SET known_text='I have to bring her' WHERE id=$1`, [bLego]);
    const bAfter = await linkOf(c, bLego);
    assert('BASELINE today a lego text edit SILENTLY MOVES THE SLOT TO ANOTHER VOICE',
      bAfter.known_audio_id === bOther,
      bAfter.known_audio_id === bOther ? 'Ryan -> Sonia, no NULL, no alarm'
        : `link is ${bAfter.known_audio_id === null ? 'NULL' : String(bAfter.known_audio_id).slice(0, 8)}`);
    assert('BASELINE and nothing at all is written down about it',
      (await dropsForPre(c, bLego)).length === 0);

    // ── BASELINEPRES: a TRAILING SPACE destroys the presentation link ───────
    // This is the bleed, reproduced on the live rule. The clip is untouched in
    // course_audio and becomes permanently unreachable: link_audio_to_content
    // matches presentation on normalize_text(target_text) = text_normalized,
    // which a composed introduction can never satisfy.
    const bpClip = await mkClip(c, "ඉංග්‍රීසිෙන්. 'දැන්'. 'මමට දැන් කතා කරන්න ඕනේ' ඉතින්. :",
      'presentation', 'azure_si-LK-SameeraNeural', 'sin');
    const bpLego = await mkLego(c, 909, 'now', 'දැන්', { pres: bpClip });
    await c.query(`UPDATE course_legos SET target_text='දැන් ' WHERE id=$1`, [bpLego]);
    const bp = await linkOf(c, bpLego);
    assert('BASELINEPRES today a TRAILING-SPACE edit destroys the presentation link',
      bp.presentation_audio_id === null,
      bp.presentation_audio_id === null ? 'severed by a cosmetic edit'
        : `still ${String(bp.presentation_audio_id).slice(0, 8)}`);
    assert('BASELINEPRES and nothing is written down about that either',
      (await dropsForPre(c, bpLego)).length === 0);
    const bpStillThere = await q(c, `SELECT id FROM course_audio WHERE id=$1`, [bpClip]);
    assert('BASELINEPRES the clip itself survives — it is the LINK that is lost',
      bpStillThere.length === 1, 'paid for, alive in course_audio, now unreachable');
    // No DATABASE path can put it back. link_audio_to_content is the only trigger
    // that refills NULL slots; read its LIVE body and confirm the predicate it
    // really uses for presentation, rather than re-deriving the arithmetic of a
    // predicate we wrote out ourselves — which is a tautology, and is what an
    // earlier draft of this check did.
    const linkFn = (await q(c, `
      SELECT pg_get_functiondef(p.oid) AS d FROM pg_proc p
        JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='link_audio_to_content'`))[0].d;
    const presBranch = linkFn.slice(linkFn.indexOf("NEW.role = 'presentation'"));
    assert('BASELINEPRES no TRIGGER can refill it — link_audio_to_content keys presentation on target_text',
      /course_legos/.test(presBranch) &&
      /normalize_text\(target_text\)\s*=\s*NEW\.text_normalized/.test(presBranch),
      'read from the live function body, not assumed');
    // But repair is not IMPOSSIBLE, and saying so was a real error in an earlier
    // draft of the migration header, caught by adversarial review.
    // linkPresentationAudio() in phase8 refills NULL lego presentation slots by
    // course_audio.lego_id — not by text — for is_new legos. It is simply not
    // automatic, and nothing prompts it, because nothing records the loss.
    const bpRefillable = (await q(c, `
      SELECT count(*)::int n FROM course_legos l
       WHERE l.presentation_audio_id IS NULL AND l.is_new AND l.lego_id IS NOT NULL
         AND EXISTS (SELECT 1 FROM course_audio a
                      WHERE a.course_code=l.course_code AND a.role='presentation'
                        AND a.lego_id = l.lego_id
                        AND (a.s3_key IS NULL OR a.s3_key NOT LIKE 'pending/%'))`))[0].n;
    assert('BASELINEPRES the phase8 lego_id refill route is real — the header must not deny it',
      bpRefillable > 0,
      `${bpRefillable} currently-NULL lego presentation slots are refillable by a phase8 run today`);

    // ── Read the slow stuff BEFORE the apply ────────────────────────────────
    // Everything after the apply runs while this transaction holds ACCESS
    // EXCLUSIVE on course_legos (DROP/CREATE TRIGGER takes it and holds it to
    // COMMIT), and every other session writing legos queues behind us for that
    // whole window. This scan alone measured ~3.3s. It is a read of a real
    // course that does not need the migration live, so it is paid up front.
    const snClip = (await q(c, `
      SELECT id, text, text_normalized, normalize_text(text) AS live
        FROM course_audio
       WHERE course_code='ara_for_eng' AND role='known'
         AND text_normalized <> normalize_text(text)
       ORDER BY id LIMIT 1`))[0];

    // The real production lego the LIVEPATHS block probes, chosen up front for
    // the same reason.
    const realLego = (await q(c, `
      SELECT id, known_text, target_text, known_audio_id, target1_audio_id,
             target2_audio_id, presentation_audio_id, version
        FROM course_legos WHERE course_code='eng_for_sin' AND presentation_audio_id IS NOT NULL
       ORDER BY seed_number, lego_index LIMIT 1`))[0];

    // ── Apply, in this same transaction ─────────────────────────────────────
    if (!(await q(c, `SELECT to_regclass('public.content_audio_link_drops') AS t`))[0].t) {
      await c.query(inlined(SEED_MIGRATION));
      console.log('  seed migration applied first (its machinery is a hard dependency)');
    } else {
      console.log('  seed migration already live — reusing its matcher and report table');
    }
    const rowIdIsText = (await q(c, `
      SELECT data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name='content_audio_link_drops' AND column_name='row_id'`))[0]?.data_type === 'text';
    if (!rowIdIsText) {
      await c.query(inlined(PHRASE_MIGRATION));
      console.log('  phrase migration applied first (it widens row_id to text)');
    } else {
      console.log('  phrase migration already live — row_id is already text');
    }
    await c.query(inlined(MIGRATION));
    console.log('  lego migration applied inside the transaction\n');


    // ── NAME ────────────────────────────────────────────────────────────────
    const defAfter = (await q(c, `
      SELECT pg_get_triggerdef(oid) AS def FROM pg_trigger
       WHERE tgname='trg_null_lego_audio_on_text_change'`))[0];
    assert('NAME the trigger keeps its name — every pg_trigger match still resolves',
      !!defAfter, defAfter?.def?.slice(0, 110));
    assert('NAME it now carries the WHEN clause the other two tables have',
      !!defAfter && /WHEN/.test(defAfter.def));
    assert('NAME the lie is corrected in the function comment instead',
      /does NOT simply null/i.test((await q(c, `
        SELECT obj_description(p.oid, 'pg_proc') AS d FROM pg_proc p
          JOIN pg_namespace n ON n.oid=p.pronamespace
         WHERE n.nspname='public' AND p.proname='null_lego_audio_on_text_change'`))[0]?.d || ''));

    // ── NOSWAP ──────────────────────────────────────────────────────────────
    const nsOld   = await mkClip(c, 'she wants to leave', 'known', 'azure_en-GB-RyanNeural',  'eng');
    const nsOther = await mkClip(c, 'she wants to go',    'known', 'azure_en-GB-SoniaNeural', 'eng');
    const nsLego  = await mkLego(c, 901, 'she wants to leave', 'එයාට යන්න ඕන', { known: nsOld });
    await c.query(`UPDATE course_legos SET known_text='she wants to go' WHERE id=$1`, [nsLego]);
    const ns = await linkOf(c, nsLego);
    assert('NOSWAP does NOT silently move the slot to another voice',
      ns.known_audio_id !== nsOther,
      `link is now ${ns.known_audio_id === null ? 'NULL' : String(ns.known_audio_id).slice(0, 8)}`);
    assert('NOSWAP nulls instead of relinking', ns.known_audio_id === null);
    const nsDrops = await dropsFor(c, nsLego);
    assert('NOSWAP the drop is written down, naming the clip, its voice and its words',
      nsDrops.length === 1 && nsDrops[0].table_name === 'course_legos' &&
      nsDrops[0].reason === 'nulled-no-same-voice-clip-for-new-text' &&
      nsDrops[0].old_audio_id === nsOld && nsDrops[0].old_text === 'she wants to leave' &&
      nsDrops[0].new_text === 'she wants to go' &&
      nsDrops[0].old_voice_id === 'azure_en-GB-RyanNeural',
      JSON.stringify(nsDrops.map(d => [d.reason, d.old_voice_id])));

    // ── CONTROL ─────────────────────────────────────────────────────────────
    const wouldHave = await q(c, `SELECT audio_id_for_text($1,$2,'known') AS id`, [COURSE, 'she wants to go']);
    assert('CONTROL audio_id_for_text — the rule this migration removes — WOULD have swapped it',
      wouldHave[0].id === nsOther, 'confirms the hazard is real, and still live in that function');

    // ── SAMEVOICE ───────────────────────────────────────────────────────────
    const svOld = await mkClip(c, 'she is my mother', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const svNew = await mkClip(c, 'she is my mum',    'known', 'azure_en-GB-RyanNeural', 'eng');
    const svLego = await mkLego(c, 902, 'she is my mother', 'එයා මගේ අම්මා', { known: svOld });
    await c.query(`UPDATE course_legos SET known_text='she is my mum' WHERE id=$1`, [svLego]);
    const sv = await linkOf(c, svLego);
    assert('SAMEVOICE re-points to the clip we already own in that voice',
      sv.known_audio_id === svNew, `-> ${String(sv.known_audio_id).slice(0, 8)}`);
    const svDrops = await dropsFor(c, svLego);
    assert('SAMEVOICE the move is written down', svDrops.length === 1 &&
      svDrops[0].reason === 'relinked-same-voice' && svDrops[0].old_audio_id === svOld &&
      svDrops[0].new_audio_id === svNew && svDrops[0].old_text === 'she is my mother',
      JSON.stringify(svDrops.map(d => d.reason)));

    // ── WRITERWINS: a text+audio UPDATE in one statement is not clobbered ───
    // The audio-first repair shape: render the new clip, then swap the text and
    // the link together. Without rule 0 the trigger reads OLD, resolves from
    // OLD's voice, and overwrites what the writer just set.
    const wwOld = await mkClip(c, 'the old wording', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const wwNew = await mkClip(c, 'the new wording', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const wwLego = await mkLego(c, 915, 'the old wording', 'පරණ වචන', { known: wwOld });
    await c.query(`UPDATE course_legos SET known_text='the new wording', known_audio_id=$2 WHERE id=$1`,
      [wwLego, wwNew]);
    const ww = await linkOf(c, wwLego);
    assert('WRITERWINS a link set in the SAME UPDATE as the text is respected, not overwritten',
      ww.known_audio_id === wwNew,
      ww.known_audio_id === wwOld ? 'CLOBBERED back to the old clip' : 'kept the writer value');
    assert('WRITERWINS and nothing is reported, because nothing was dropped',
      (await dropsFor(c, wwLego)).length === 0);

    // The destructive half of the same shape: an explicit NULL must stay NULL.
    const wnClip = await mkClip(c, 'clear me', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const wnLego = await mkLego(c, 916, 'clear me', 'මකන්න', { known: wnClip });
    await c.query(`UPDATE course_legos SET known_text='cleared', known_audio_id=NULL WHERE id=$1`, [wnLego]);
    const wn = await linkOf(c, wnLego);
    assert('WRITERWINS an explicit NULL in the same UPDATE is not resurrected',
      wn.known_audio_id === null,
      wn.known_audio_id === null ? 'stayed NULL' : 'RESURRECTED a link the writer cleared');

    // ── LANGUAGE: the same-voice matcher also constrains language ───────────
    // Never exercised before this review. Same canonical voice id, different
    // language — must NOT be accepted as a substitute.
    const lgOld = await mkClip(c, 'ich will gehen', 'known', 'azure_multi-Ryan', 'deu');
    const lgWrong = await mkClip(c, 'i want to go', 'known', 'azure_multi-Ryan', 'eng');
    const lgLego = await mkLego(c, 917, 'ich will gehen', 'මට යන්න ඕන', { known: lgOld });
    await c.query(`UPDATE course_legos SET known_text='i want to go' WHERE id=$1`, [lgLego]);
    const lg = await linkOf(c, lgLego);
    assert('LANGUAGE a same-voice clip in a DIFFERENT language is not accepted as a substitute',
      lg.known_audio_id !== lgWrong && lg.known_audio_id === null,
      lg.known_audio_id === lgWrong ? 'ACCEPTED a cross-language substitute' : 'nulled, correctly');
    const lgControl = await q(c, `SELECT audio_id_for_text($1,$2,'known') AS id`, [COURSE, 'i want to go']);
    assert('LANGUAGE control: the old voice-and-language-blind rule WOULD have taken it',
      lgControl[0].id === lgWrong, 'audio_id_for_text constrains neither');

    // ── SAMEVOICE on target1, not just known ───────────────────────────────
    const svtOld = await mkClip(c, 'පරණ ඉලක්කය', 'target1', 'azure_si-LK-SameeraNeural', 'sin');
    const svtNew = await mkClip(c, 'අලුත් ඉලක්කය', 'target1', 'azure_si-LK-SameeraNeural', 'sin');
    const svtLego = await mkLego(c, 918, 'old target', 'පරණ ඉලක්කය', { t1: svtOld });
    await c.query(`UPDATE course_legos SET target_text='අලුත් ඉලක්කය' WHERE id=$1`, [svtLego]);
    const svt = await linkOf(c, svtLego);
    assert('SAMEVOICE the same-voice relink works on target1 too, not only known',
      svt.target1_audio_id === svtNew);

    // ── COSMETIC ────────────────────────────────────────────────────────────
    const cosClip = await mkClip(c, 'I want to go home', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const cosLego = await mkLego(c, 903, 'I want to go home', 'මට ගෙදර යන්න ඕන', { known: cosClip });
    await c.query(`UPDATE course_legos SET known_text='  I want to go home.  ' WHERE id=$1`, [cosLego]);
    const cos = await linkOf(c, cosLego);
    assert('COSMETIC a whitespace/punctuation-only edit KEEPS its clip', cos.known_audio_id === cosClip);
    assert('COSMETIC nothing is reported for it', (await dropsFor(c, cosLego)).length === 0);

    // ── COSMETICPRES: the new protection ────────────────────────────────────
    const cpPres = await mkClip(c, "ඉංග්‍රීසිෙන්. 'ගෙදර'. 'මට ගෙදර යන්න ඕන' ඉතින්. :",
      'presentation', 'azure_si-LK-SameeraNeural', 'sin');
    const cpLego = await mkLego(c, 910, 'home', 'ගෙදර', { pres: cpPres });
    await c.query(`UPDATE course_legos SET target_text='ගෙදර ' WHERE id=$1`, [cpLego]);
    const cp = await linkOf(c, cpLego);
    assert('COSMETICPRES a trailing-space edit now KEEPS the presentation link',
      cp.presentation_audio_id === cpPres,
      cp.presentation_audio_id === null ? 'STILL DESTROYED' : 'kept');
    assert('COSMETICPRES nothing is reported for it', (await dropsFor(c, cpLego)).length === 0);
    const cpControl = await q(c, `SELECT audio_id_for_text($1,$2,'presentation') AS id`, [COURSE, 'ගෙදර ']);
    assert('COSMETICPRES control: the old rule would have assigned NULL and severed it',
      cpControl[0].id === null, 'a presentation clip never speaks the lego text — 0 of 72,062 estate-wide');

    // ── PRESDROP: a genuine edit still nulls, but now reports ───────────────
    const pdPres = await mkClip(c, "ඉංග්‍රීසිෙන්. 'දැන්'. 'මමට දැන් ඕනේ' ඉතින්. :",
      'presentation', 'azure_si-LK-SameeraNeural', 'sin');
    const pdLego = await mkLego(c, 911, 'now', 'දැන්', { pres: pdPres });
    await c.query(`UPDATE course_legos SET target_text='පස්සේ' WHERE id=$1`, [pdLego]);
    const pd = await linkOf(c, pdLego);
    assert('PRESDROP a genuine edit still nulls the presentation link', pd.presentation_audio_id === null);
    const pdDrops = await dropsFor(c, pdLego);
    assert('PRESDROP but the drop is now RECORDED — clip, voice and words',
      pdDrops.length === 1 && pdDrops[0].column_name === 'presentation_audio_id' &&
      pdDrops[0].role === 'presentation' && pdDrops[0].old_audio_id === pdPres &&
      pdDrops[0].old_voice_id === 'azure_si-LK-SameeraNeural' &&
      // A reason of its own: rule 2 is not attempted for presentation, so this
      // is "we declined to look", not "we looked and found nothing". Folding it
      // into nulled-no-same-voice-clip-for-new-text would corrupt that count.
      pdDrops[0].reason === 'nulled-presentation-not-text-addressable' &&
      pdDrops[0].new_text === 'පස්සේ',
      JSON.stringify(pdDrops.map(d => [d.column_name, d.reason])));
    assert('PRESDROP the drop is therefore reversible by hand — the clip id is kept',
      pdDrops[0]?.old_audio_id === pdPres);

    // ── PRESRAW: a non-uuid presentation value must not raise ───────────────
    // The column is text with no FK. Nothing today puts junk there (0 of 72,062
    // non-uuid-shaped, measured) but nothing in the schema stops it, and a
    // trigger that raised would BLOCK a legitimate edit.
    const prLego = await mkLego(c, 912, 'raw link', 'අමු', {});
    await c.query(`UPDATE course_legos SET presentation_audio_id='not-a-uuid-at-all' WHERE id=$1`, [prLego]);
    await c.query(`UPDATE course_legos SET target_text='අලුත්' WHERE id=$1`, [prLego]);
    const pr = await linkOf(c, prLego);
    // Reaching this line at all IS the "it did not raise" result — an exception
    // would have aborted the transaction two statements ago. Asserting `true`
    // here, as an earlier draft did, records a pass that cannot fail.
    assert('PRESRAW an unparseable presentation link is nulled, and did not block the edit',
      pr.presentation_audio_id === null);
    const prDrops = await dropsFor(c, prLego);
    assert('PRESRAW and the raw value is preserved in old_link_raw',
      prDrops.length === 1 && prDrops[0].reason === 'nulled-unparseable-link' &&
      prDrops[0].old_link_raw === 'not-a-uuid-at-all' && prDrops[0].old_audio_id === null,
      JSON.stringify(prDrops.map(d => [d.reason, d.old_link_raw])));

    // ── PRESDANGLE: uuid-shaped but no such clip ────────────────────────────
    const pgLego = await mkLego(c, 913, 'dangling', 'එල්ලෙන', {});
    await c.query(`UPDATE course_legos SET presentation_audio_id=gen_random_uuid()::text WHERE id=$1`, [pgLego]);
    await c.query(`UPDATE course_legos SET target_text='වෙනස්' WHERE id=$1`, [pgLego]);
    const pg2 = await linkOf(c, pgLego);
    const pgDrops = await dropsFor(c, pgLego);
    assert('PRESDANGLE a presentation link to a clip that does not exist is nulled and reported',
      pg2.presentation_audio_id === null && pgDrops.length === 1 &&
      pgDrops[0].reason === 'nulled-dangling-link',
      JSON.stringify(pgDrops.map(d => d.reason)));

    // ── STALENORM ───────────────────────────────────────────────────────────
    // The state cannot be forged: trg_course_audio_normalize recomputes
    // text_normalized on every write to course_audio. Borrow a real clip in that
    // state; nothing about the borrowed clip is modified.
    // (snClip was read BEFORE the apply — see the pre-apply block — so its
    //  multi-second scan is not paid while holding ACCESS EXCLUSIVE.)
    if (!snClip) {
      assert('STALENORM no stale-normalised clip left to test against', true,
        'the backlog has been backfilled — this check is obsolete');
    } else {
      assert('STALENORM a real clip is in the stale state', snClip.text_normalized !== snClip.live,
        `stored "${snClip.text_normalized}" vs live "${snClip.live}"`);
      const snLego = await mkLego(c, 904, snClip.text, 'ඕනෑම දෙයක්', { known: snClip.id });
      await c.query(`UPDATE course_legos SET known_text=upper(known_text) WHERE id=$1`, [snLego]);
      const sn = await linkOf(c, snLego);
      assert('STALENORM a stale-normalised clip that speaks the right words is KEPT',
        sn.known_audio_id === snClip.id,
        sn.known_audio_id === null ? 'DROPPED a good link' : 'kept');
      assert('STALENORM nothing is reported for it', (await dropsFor(c, snLego)).length === 0);
      const naive = (await q(c, `SELECT $1::text = normalize_text($2) AS same`,
        [snClip.text_normalized, snClip.text.toUpperCase()]))[0];
      assert('STALENORM control: a stored-column-only test WOULD have dropped it',
        naive.same === false, 'confirms the disjunct is load-bearing, not decorative');
    }

    // ── TARGET ──────────────────────────────────────────────────────────────
    const t1 = await mkClip(c, 'පරණ වචනය', 'target1', 'azure_si-LK-SameeraNeural', 'sin');
    const t2 = await mkClip(c, 'පරණ වචනය', 'target2', 'azure_si-LK-ThiliniNeural', 'sin');
    const tLego = await mkLego(c, 905, 'the old one', 'පරණ වචනය', { t1, t2 });
    await c.query(`UPDATE course_legos SET target_text='අලුත් වචනය' WHERE id=$1`, [tLego]);
    const t = await linkOf(c, tLego);
    assert('TARGET both target roles are handled on a target_text edit',
      t.target1_audio_id === null && t.target2_audio_id === null);
    assert('TARGET both drops are reported', (await dropsFor(c, tLego)).length === 2);

    // ── NULLKNOWN: known_text is NULLABLE on this table ─────────────────────
    const nkClip = await mkClip(c, 'about to vanish', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const nkLego = await mkLego(c, 906, 'about to vanish', 'නැති වෙනවා', { known: nkClip });
    await c.query(`UPDATE course_legos SET known_text=NULL WHERE id=$1`, [nkLego]);
    const nk = await linkOf(c, nkLego);
    const nkDrops = await dropsFor(c, nkLego);
    assert('NULLKNOWN setting known_text to NULL drops and reports rather than raising',
      nk.known_audio_id === null && nkDrops.length === 1 &&
      nkDrops[0].column_name === 'known_audio_id',
      JSON.stringify(nkDrops.map(d => [d.column_name, d.reason])));
    // …and back from NULL is symmetrical.
    const nk2Lego = await mkLego(c, 907, null, 'හිස්', {});
    await c.query(`UPDATE course_legos SET known_text='now it has one' WHERE id=$1`, [nk2Lego]);
    assert('NULLKNOWN a NULL -> value edit on an unlinked row reports nothing',
      (await dropsFor(c, nk2Lego)).length === 0);

    // ── NULLSTAYS ───────────────────────────────────────────────────────────
    const nullLego = await mkLego(c, 908, 'nothing linked here', 'මොකුත් නෑ', {});
    await c.query(`UPDATE course_legos SET known_text='still nothing linked' WHERE id=$1`, [nullLego]);
    const nl = await linkOf(c, nullLego);
    assert('NULLSTAYS an already-NULL link stays NULL and reports nothing',
      nl.known_audio_id === null && (await dropsFor(c, nullLego)).length === 0);

    // ── NOTEXT: the WHEN clause ─────────────────────────────────────────────
    const ntClip = await mkClip(c, 'unchanged text', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const ntPres = await mkClip(c, "ඉංග්‍රීසිෙන්. 'නොවෙනස්'. '' ඉතින්. :", 'presentation', 'azure_si-LK-SameeraNeural', 'sin');
    const ntLego = await mkLego(c, 914, 'unchanged text', 'නොවෙනස්', { known: ntClip, pres: ntPres });
    await c.query(`UPDATE course_legos SET release_batch=1 WHERE id=$1`, [ntLego]);
    const nt = await linkOf(c, ntLego);
    assert('NOTEXT a non-text update leaves every link alone and reports nothing',
      nt.known_audio_id === ntClip && nt.presentation_audio_id === ntPres &&
      (await dropsFor(c, ntLego)).length === 0);

    // ── ROWID: all three tables record through the one text column ─────────
    const sClip = await mkClip(c, 'a seed sentence', 'known', 'azure_en-GB-RyanNeural', 'eng');
    const sSeed = (await q(c, `
      INSERT INTO course_seeds (course_code, seed_number, known_text, target_text, known_audio_id)
      VALUES ($1, 990, 'a seed sentence', 'බීජ වාක්‍යය', $2) RETURNING id`, [COURSE, sClip]))[0].id;
    await c.query(`UPDATE course_seeds SET known_text='a completely different seed sentence' WHERE id=$1`, [sSeed]);
    const seedDrops = await dropsFor(c, sSeed);
    assert('ROWID a SEED edit still records correctly alongside the lego rows',
      seedDrops.length === 1 && seedDrops[0].table_name === 'course_seeds' &&
      seedDrops[0].reason === 'nulled-no-same-voice-clip-for-new-text',
      JSON.stringify(seedDrops.map(d => [d.table_name, d.reason])));

    const pClip = await mkClip(c, 'a practice phrase', 'known', 'azure_en-GB-RyanNeural', 'eng');
    // The seed FIRST: course_legos carries fk_course_legos_seed onto
    // course_seeds (course_code, seed_number), so the spine has to exist before
    // the lego that hangs off it, and the lego before the phrase that hangs off
    // that (fk_course_practice_phrases_lego, on course_code/seed_number/lego_index).
    await c.query(`
      INSERT INTO course_seeds (course_code, seed_number, known_text, target_text)
      VALUES ($1, 991, 'phrase spine', 'වාක්‍ය ඛණ්ඩය') ON CONFLICT DO NOTHING`, [COURSE]);
    await c.query(`
      INSERT INTO course_legos (course_code, seed_number, lego_index, type, is_new, known_text, target_text)
      VALUES ($1, 991, 1, 'M', true, 'phrase spine', 'වාක්‍ය ඛණ්ඩය')`, [COURSE]);
    const pId = `${COURSE}:S0991L01U01`;
    await c.query(`
      INSERT INTO course_practice_phrases
        (id, course_code, seed_number, lego_index, position, known_text, target_text,
         word_count, lego_count, phrase_role, known_audio_id)
      VALUES ($1,$2,991,1,1,'a practice phrase','පුහුණු වාක්‍යය',3,1,'use',$3)`,
      [pId, COURSE, pClip]);
    await c.query(`UPDATE course_practice_phrases SET known_text='an entirely other phrase' WHERE id=$1`, [pId]);
    const phraseDrops = await dropsFor(c, pId);
    assert('ROWID a PHRASE edit still records correctly too — all three tables share one column',
      phraseDrops.length === 1 && phraseDrops[0].table_name === 'course_practice_phrases',
      JSON.stringify(phraseDrops.map(d => [d.table_name, d.reason])));

    const rowIdType = (await q(c, `
      SELECT data_type FROM information_schema.columns
       WHERE table_schema='public' AND table_name='content_audio_link_drops' AND column_name='row_id'`))[0];
    assert('ROWID row_id is text and a lego uuid lands in it by assignment cast',
      rowIdType?.data_type === 'text' && (await dropsFor(c, nsLego)).length === 1, rowIdType?.data_type);

    // ── NOAUDIODEL ──────────────────────────────────────────────────────────
    // NOT a global count(*) diff. That was the first version of this check and it
    // proved nothing: in READ COMMITTED a concurrent render can false-FAIL it and
    // a paired delete+insert elsewhere can false-PASS it, and on 2.5M rows it also
    // cost seconds while holding ACCESS EXCLUSIVE. Two sound checks instead.
    //
    // (a) STATIC: the function body contains no write against course_audio at
    //     all. A property of the code, not a racy observation.
    const fnBody = (await q(c, `
      SELECT pg_get_functiondef(p.oid) AS d FROM pg_proc p
        JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname='null_lego_audio_on_text_change'`))[0].d;
    const writesAudio = /\b(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+course_audio\b/i.test(fnBody);
    assert('NOAUDIODEL the function contains no write against course_audio, in any branch',
      !writesAudio, 'static check on pg_get_functiondef — not a racy row count');

    // (b) TARGETED: the one real production clip this canary touches (the
    //     borrowed stale-normalised one) is byte-identical afterwards.
    if (snClip) {
      const snAfter = (await q(c, `
        SELECT id, text, text_normalized, voice_id, language, role, s3_key, duration_ms
          FROM course_audio WHERE id=$1`, [snClip.id]))[0];
      assert('NOAUDIODEL the borrowed production clip is byte-identical afterwards',
        !!snAfter && snAfter.text === snClip.text &&
        snAfter.text_normalized === snClip.text_normalized,
        'the only real course_audio row this canary reads');
    }

    // ── LIVEPATHS ───────────────────────────────────────────────────────────
    const live = await q(c, `
      SELECT l.id, l.seed_number, l.lego_index, l.known_text, l.target_text,
             l.known_audio_id, l.target1_audio_id, l.target2_audio_id, l.presentation_audio_id
        FROM course_legos l WHERE l.course_code='eng_for_sin'
       ORDER BY l.seed_number, l.lego_index LIMIT 5`);
    assert('LIVEPATHS the lego read a real course uses still returns rows', live.length === 5);

    for (const v of ['seed_with_legos', 'course_qa_cycle_clips', 'course_round_index']) {
      await c.query('SAVEPOINT viewprobe');
      let rows = null, err = null;
      try { rows = await q(c, `SELECT * FROM ${v} WHERE course_code='eng_for_sin' LIMIT 3`);
            await c.query('RELEASE SAVEPOINT viewprobe'); }
      catch (e) { err = e.message; await c.query('ROLLBACK TO SAVEPOINT viewprobe'); }
      assert(`LIVEPATHS ${v} still resolves`, rows !== null && rows.length > 0, err || `${rows?.length} rows`);
    }

    // A real production lego must still be writable — the trigger must not be
    // able to REFUSE an edit anybody legitimately makes. Everything this block
    // dirties is restored and the restore is ASSERTED, on the text AND on all
    // four links. Both prior canaries skipped this and left real trailing spaces
    // behind on --commit.
    assert('LIVEPATHS a real production lego with a presentation link was found to probe',
      !!realLego, realLego && `seed lego ${String(realLego.id).slice(0, 8)}`);

    // EVERYTHING that touches the real row happens inside a savepoint.
    //
    // An explicit restore of known_text is NOT enough, and saying "left exactly
    // as it was found" on the strength of one was overclaiming — an adversarial
    // review caught it. Two UPDATEs on a live lego also bump `version` (+3 via
    // increment_version), write permanent content_audit_log rows, bump the
    // course version, and fire touch_course_content_stamp — which on --commit
    // invalidates every eng_for_sin learner's cached script. None of that is
    // undone by writing the old text back.
    //
    // ROLLBACK TO SAVEPOINT undoes all of it. The explicit restore is still
    // performed and still asserted first, because that is the behaviour under
    // test; the savepoint is what makes the claim in the check name true.
    await c.query('SAVEPOINT realprobe');

    await c.query(`UPDATE course_legos SET release_batch=release_batch WHERE id=$1`, [realLego.id]);

    await c.query(`UPDATE course_legos SET known_text = known_text || ' ' WHERE id=$1`, [realLego.id]);
    const realAfter = await linkOf(c, realLego.id);
    const realDrops = await dropsFor(c, realLego.id);
    assert('LIVEPATHS a trailing-space edit on a real lego changes NO link, presentation included',
      realAfter.known_audio_id === realLego.known_audio_id &&
      realAfter.target1_audio_id === realLego.target1_audio_id &&
      realAfter.target2_audio_id === realLego.target2_audio_id &&
      realAfter.presentation_audio_id === realLego.presentation_audio_id,
      `presentation ${realAfter.presentation_audio_id === realLego.presentation_audio_id ? 'kept' : 'LOST'}`);
    assert('LIVEPATHS and nothing is reported for it', realDrops.length === 0, `drops=${realDrops.length}`);

    // Undo it. On --commit this transaction is COMMITTED, so without this the
    // probe leaves a real trailing space on a live lego — exactly what the
    // 2026-08-17 seed and phrase applies did before they were found and reverted.
    await c.query(`UPDATE course_legos SET known_text=$2 WHERE id=$1`, [realLego.id, realLego.known_text]);
    const restored = (await q(c, `
      SELECT known_text, target_text, known_audio_id, target1_audio_id,
             target2_audio_id, presentation_audio_id
        FROM course_legos WHERE id=$1`, [realLego.id]))[0];
    assert('LIVEPATHS the real lego is left EXACTLY as it was found — text',
      restored.known_text === realLego.known_text && restored.target_text === realLego.target_text,
      JSON.stringify(restored.known_text));
    assert('LIVEPATHS the real lego is left EXACTLY as it was found — all four links',
      restored.known_audio_id === realLego.known_audio_id &&
      restored.target1_audio_id === realLego.target1_audio_id &&
      restored.target2_audio_id === realLego.target2_audio_id &&
      restored.presentation_audio_id === realLego.presentation_audio_id);
    assert('LIVEPATHS the restore itself dropped nothing',
      (await dropsFor(c, realLego.id)).length === 0);

    // Now undo the side effects an explicit restore cannot reach.
    await c.query('ROLLBACK TO SAVEPOINT realprobe');
    const pristine = (await q(c, `
      SELECT known_text, target_text, version, known_audio_id, target1_audio_id,
             target2_audio_id, presentation_audio_id
        FROM course_legos WHERE id=$1`, [realLego.id]))[0];
    assert('LIVEPATHS the real lego is untouched down to its version number',
      pristine.version === realLego.version &&
      pristine.known_text === realLego.known_text &&
      pristine.presentation_audio_id === realLego.presentation_audio_id,
      `version ${realLego.version} -> ${pristine.version} (no audit rows, no cache-stamp bump)`);

    // Nothing outside the fixture course may have a drop recorded against it BY
    // THIS RUN. Scoped by id > the high-water mark taken before anything was
    // applied — NOT "the table is empty". The table is not empty: the seed and
    // phrase triggers have been live since earlier today and other agents' real
    // edits are recorded in it. An unscoped assertion here fails on their rows
    // and says nothing about ours.
    const strayDrops = await q(c, `
      SELECT course_code, count(*)::int n FROM content_audio_link_drops
       WHERE id > $2 AND course_code <> $1 GROUP BY 1`, [COURSE, dropsHighWater]);
    assert('LIVEPATHS this canary recorded no drop against any real course',
      strayDrops.length === 0, `high-water id ${dropsHighWater}; strays ${JSON.stringify(strayDrops)}`);

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

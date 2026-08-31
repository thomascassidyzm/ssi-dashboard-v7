#!/usr/bin/env node
/**
 * verify-human-voice-cast-guard.cjs — would a language cast speak over a real recording?
 *
 * READ-ONLY. No writes, no cast rows, no renders, no TTS. It reads `courses` and
 * the `course_human_recorded_roles` view, simulates a Cartesia phrase cast on
 * each language given, and prints what the reader
 * (services/shared/language-voice-cast.cjs) decides per course and per role.
 *
 * WHY IT EXISTS. Tom's ruling, 2026-08-31: the Voice Lab must label a
 * human-recorded language before the tap, and a language-level cast must never
 * silently override the per-course config the recording splicer reads. This is
 * the proof, runnable against the live estate at any time — the unit tests
 * prove the rule, this proves the rule against the actual data.
 *
 * It is also how the hole in the first cut was found: a cast on 'cym' reached
 * the WELSH KNOWN SIDE of the nine courses taught FROM Welsh, whose target_lang
 * is not Welsh and whose course codes are on no human-voice list.
 *
 *   node tools/voice/verify-human-voice-cast-guard.cjs [lang ...]      # default: cym eng deu spa
 */
const path = require('path');
const REPO = path.join(__dirname, '..', '..');
require('dotenv').config({ path: path.join(REPO, '.env.psql') });
const { Client } = require('pg');
const { applyLanguageCast } = require(path.join(REPO, 'services/shared/language-voice-cast.cjs'));
const { humanRecordedForLanguage } = require(path.join(REPO, 'services/shared/human-recorded-roles.cjs'));

// A pretend Cartesia pair, so the probe casts something real-shaped without
// touching the catalogue or registering anything.
const PROBE = [
  { voice_id: 'cartesia_probe_f', gender: 'f', tts_engine: 'cartesia', is_active: true, display_name: 'Probe (f)' },
  { voice_id: 'cartesia_probe_m', gender: 'm', tts_engine: 'cartesia', is_active: true, display_name: 'Probe (m)' },
];
const castRows = (language) => [
  { language, gender: 'f', rank: 0, slot: 'phrase', voice_id: 'cartesia_probe_f' },
  { language, gender: 'm', rank: 0, slot: 'phrase', voice_id: 'cartesia_probe_m' },
];

(async () => {
  const langs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const wanted = langs.length ? langs : ['cym', 'eng', 'deu', 'spa'];

  const db = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const courses = (await db.query('select course_code, target_lang, known_lang, voice_config from courses')).rows;
  const humanRows = (await db.query(
    'select course_code, role, target_lang, known_lang, clips, a_voice_id from course_human_recorded_roles'
  )).rows;
  await db.end();

  let anyBlocked = false;
  for (const lang of wanted) {
    const affected = humanRecordedForLanguage({ language: lang, slot: 'phrase', courses, humanRows });
    const reach = courses.filter((c) => c.target_lang === lang || c.known_lang === lang).length;
    const blocked = reach > 0 && affected.total >= reach;
    if (blocked) anyBlocked = true;

    console.log(`\n════ a Cartesia phrase cast on "${lang}" ════`);
    console.log(`  reaches ${reach} course(s); ${affected.total} human-recorded`);
    console.log(`  the endpoint would: ${blocked ? 'REFUSE with 409 and write nothing' : 'save the cast and report the skipped courses'}`);
    for (const a of affected.courses) {
      console.log(`   skipped  ${a.course}  [${a.roles.join(', ')}]  ${a.sources.join('/')}${a.clips ? `  ${a.clips} clips` : ''}`);
    }

    // And what the READER decides, course by course — the half no screen shows.
    for (const course of courses) {
      if (course.target_lang !== lang && course.known_lang !== lang) continue;
      const { decisions } = applyLanguageCast({
        voiceConfig: course.voice_config || {}, course, roles: castRows(lang), voices: PROBE, humanRows,
      });
      const refused = decisions.filter((d) => d.source === 'human-recorded');
      if (!refused.length) continue;
      console.log(`   reader   ${course.course_code}: ${refused.map((d) => `${d.role} REFUSED (${d.humanSource})`).join(', ')}`);
    }
  }
  console.log(`\n${anyBlocked ? 'At least one language is wholly human-recorded and cannot be cast.' : 'No language checked is wholly human-recorded.'}`);
})().catch((e) => { console.error(e.message); process.exit(1); });

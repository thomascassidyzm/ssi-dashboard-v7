/**
 * Apply welcome audio to all courses in Popty.
 * Inserts course_audio records pointing to existing S3 files (no TTS needed).
 * Skips courses that already have welcome audio.
 */
process.chdir(require('path').join(__dirname, '../..'));
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const welcomeIndex = require('./generated/welcomes/production/_welcome_index.json');

const SKIP_COURSES = ['ang_for_kor', 'por_br_for_eng', 'spa_mx_for_eng', 'cym_anthem_for_jpn'];
const DRY_RUN = !process.argv.includes('--execute');

// Map database language codes to welcome index codes where they differ
const LANG_ALIAS = { zho: 'cmn' };

// Parse target dialect suffix from course_code (e.g. ara_lb_for_eng → 'lb')
function parseTargetSuffix(courseCode, knownLang, targetLang) {
  const re = new RegExp(`^${targetLang}(?:_(.+?))?_for_${knownLang}(?:_(.+))?$`);
  const m = courseCode.match(re);
  return m?.[1] || '';
}

(async () => {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== EXECUTING ===');

  // Get all courses
  const { data: courses } = await sb.from('courses')
    .select('course_code, known_lang, target_lang, status')
    .order('course_code');

  // Check which already have welcome audio
  const existing = new Set();
  for (const c of courses) {
    const { count } = await sb.from('course_audio')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', c.course_code)
      .eq('role', 'welcome');
    if (count > 0) existing.add(c.course_code);
  }

  let inserted = 0;
  let skipped = 0;
  let noMatch = 0;

  for (const c of courses) {
    const cc = c.course_code;

    if (SKIP_COURSES.includes(cc)) {
      console.log('  SKIP ' + cc + ' (excluded)');
      skipped++;
      continue;
    }

    if (existing.has(cc)) {
      console.log('  SKIP ' + cc + ' (already has welcome)');
      skipped++;
      continue;
    }

    // Look up in welcome index: known_lang → target_lang (with alias fallback)
    // Dialect-aware: ara_lb_for_eng → try eng→ara_lb first, fall back to eng→ara
    const knownKey = LANG_ALIAS[c.known_lang] || c.known_lang;
    const baseTargetKey = LANG_ALIAS[c.target_lang] || c.target_lang;
    const targetSuffix = parseTargetSuffix(cc, c.known_lang, c.target_lang);
    const dialectTargetKey = targetSuffix ? `${baseTargetKey}_${targetSuffix}` : null;
    const knownEntries = welcomeIndex[knownKey];
    if (!knownEntries) {
      console.log('  MISS ' + cc + ' — known_lang ' + c.known_lang + ' (' + knownKey + ') not in index');
      noMatch++;
      continue;
    }

    const entry = (dialectTargetKey && knownEntries[dialectTargetKey]) || knownEntries[baseTargetKey];
    const usedKey = (dialectTargetKey && knownEntries[dialectTargetKey]) ? dialectTargetKey : baseTargetKey;
    if (!entry) {
      const tried = dialectTargetKey ? `${dialectTargetKey} or ${baseTargetKey}` : baseTargetKey;
      console.log('  MISS ' + cc + ' — target ' + tried + ' not in index for ' + knownKey);
      noMatch++;
      continue;
    }

    console.log('  ADD  ' + cc + ' — ' + c.known_lang + '→' + usedKey +
      ' uuid=' + entry.uuid.slice(0, 8) + ' duration=' + entry.duration_ms + 'ms');

    if (!DRY_RUN) {
      const { error } = await sb.from('course_audio').upsert({
        id: entry.uuid.toLowerCase(),
        course_code: cc,
        text: 'welcome',
        text_normalized: 'welcome',
        language: c.known_lang,
        role: 'welcome',
        voice_id: 'elevenlabs',
        s3_key: entry.s3_key,
        duration_ms: entry.duration_ms,
        origin: 'tts'
      }, { onConflict: 'id' });

      if (error) {
        console.log('    ERROR: ' + error.message);
      } else {
        inserted++;
      }
    } else {
      inserted++;
    }
  }

  console.log('\n=== Summary ===');
  console.log('Inserted: ' + inserted);
  console.log('Skipped: ' + skipped);
  console.log('No match in index: ' + noMatch);
  if (DRY_RUN) console.log('\nRun with --execute to apply.');
})();

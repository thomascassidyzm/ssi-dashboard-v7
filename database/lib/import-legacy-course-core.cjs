/**
 * Import Legacy Course - Core Logic
 *
 * Shared module for importing legacy course manifests to v13 schema.
 * Used by both CLI (import-legacy-course.cjs) and API (api/import-course.js).
 *
 * Imports 7 tables:
 * 1. courses - course record
 * 2. course_audio - course-specific audio samples
 * 3. shared_audio - encouragements (if not already populated)
 * 4. course_audio - shared audio references (copied from shared_audio)
 * 5. course_seeds - seed sentences
 * 6. course_legos - LEGO pieces
 * 7. course_practice_phrases - practice phrases
 * 8. lego_introductions - LEGO intro audio links
 */

const { createClient } = require('@supabase/supabase-js');

// =============================================================================
// COURSE ALIASES - Single Source of Truth
// =============================================================================

const COURSE_ALIASES = {
  'en-cy-north': 'cym_n_for_eng',
  'en-cy-south': 'cym_s_for_eng',
  'en-es': 'spa_for_eng',
  'en-ga': 'gle_for_eng',
  'cmn_for_eng': 'zho_for_eng',
  'En-Ch': 'zho_for_eng'
};

// Language code mappings (2-letter to 3-letter ISO 639)
const LANG_CODES = {
  'en': 'eng',
  'cy': 'cym',
  'es': 'spa',
  'ga': 'gle',
  'zh': 'zho',
  'cmn': 'zho'
};

// Display names for languages
const LANG_NAMES = {
  'eng': 'English',
  'cym': 'Welsh',
  'spa': 'Spanish',
  'gle': 'Irish',
  'zho': 'Chinese'
};

// Role mapping: legacy manifest → v13 schema
const ROLE_MAP = {
  'source': 'known',
  'target': 'target1',
  'target1': 'target1',
  'target2': 'target2',
  'presentation': 'presentation'
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

function resolveCourseCode(legacyId) {
  return COURSE_ALIASES[legacyId] || legacyId;
}

function resolveLangCode(code) {
  return LANG_CODES[code] || code;
}

function extractLanguages(manifest) {
  const knownLang = resolveLangCode(manifest.known);
  const targetLang = resolveLangCode(manifest.target);
  return { knownLang, targetLang };
}

function generateDisplayName(knownLang, targetLang) {
  const targetName = LANG_NAMES[targetLang] || targetLang.toUpperCase();
  const knownName = LANG_NAMES[knownLang] || knownLang.toUpperCase();
  return `${targetName} for ${knownName} Speakers`;
}

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function createSupabaseClient(url, serviceKey) {
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

// =============================================================================
// CLEAR COURSE DATA
// =============================================================================

/**
 * Delete all data for a course (used with --clear-first flag)
 * Order matters due to foreign key constraints
 */
async function clearCourseData(supabase, courseCode, onProgress) {
  onProgress?.({ step: 0, message: 'Clearing existing course data...' });

  const tables = [
    'lego_introductions',
    'course_practice_phrases',
    'course_legos',
    'course_seeds',
    'course_audio'
    // Note: Don't delete from 'courses' - we'll upsert it
    // Note: Don't delete from 'shared_audio' - it's shared across courses
  ];

  const results = {};

  for (const table of tables) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq('course_code', courseCode);

    if (error) {
      console.error(`  Warning: Failed to clear ${table}: ${error.message}`);
      results[table] = { error: error.message };
    } else {
      results[table] = { deleted: count || 0 };
    }

    onProgress?.({ step: 0, message: `Clearing ${table}... ${count || 0} rows deleted` });
  }

  return results;
}

// =============================================================================
// IMPORT FUNCTIONS
// =============================================================================

/**
 * Step 1: Import course record
 */
async function importCourseRecord(supabase, manifest, courseCode, knownLang, targetLang, onProgress) {
  onProgress?.({ step: 1, message: 'Upserting course record...' });

  const displayName = generateDisplayName(knownLang, targetLang);

  const { error } = await supabase
    .from('courses')
    .upsert({
      code: courseCode,
      display_name: displayName,
      known_lang: knownLang,
      target_lang: targetLang,
      status: 'released',
      course_type: 'official'
    }, { onConflict: 'code' });

  if (error) throw new Error(`Failed to upsert course: ${error.message}`);

  return { count: 1, displayName };
}

/**
 * Step 2: Import audio samples (course-specific)
 */
async function importAudioSamples(supabase, manifest, courseCode, knownLang, targetLang, onProgress) {
  onProgress?.({ step: 2, message: 'Importing audio samples...' });

  const slice = manifest.slices?.[0];
  const samples = slice?.samples || manifest.samples || {};

  const audioRecords = [];

  for (const [text, audioList] of Object.entries(samples)) {
    for (const audio of audioList) {
      const role = ROLE_MAP[audio.role] || audio.role;

      // Skip encouragement/instruction roles - those go to shared_audio
      if (role === 'encouragement' || role === 'instruction') continue;

      // Determine language based on role
      const language = (audio.role === 'source' || role === 'known') ? knownLang : targetLang;

      audioRecords.push({
        course_code: courseCode,
        text: text,
        text_normalized: normalizeText(text),
        language: language,
        role: role,
        voice_id: 'legacy_import',
        origin: 'tts',
        s3_key: audio.id.includes('/') ? audio.id : `${audio.id}.mp3`,
        duration_ms: audio.duration ? Math.round(audio.duration * 1000) : null
      });
    }
  }

  // Add course introduction if present
  if (manifest.introduction) {
    const intro = manifest.introduction;
    audioRecords.push({
      course_code: courseCode,
      text: '[Course Introduction]',
      text_normalized: '[course introduction]',
      language: knownLang,
      role: 'presentation',
      voice_id: 'human_recording',
      origin: 'human',
      s3_key: intro.id.includes('/') ? intro.id : `${intro.id}.mp3`,
      duration_ms: intro.duration ? Math.round(intro.duration * 1000) : null
    });
  }

  // Batch insert
  const BATCH_SIZE = 100;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < audioRecords.length; i += BATCH_SIZE) {
    const batch = audioRecords.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('course_audio')
      .upsert(batch, {
        onConflict: 'course_code,text_normalized,language,role',
        ignoreDuplicates: true
      });

    if (error) {
      errors += batch.length;
    } else {
      imported += batch.length;
    }

    onProgress?.({ step: 2, message: `Importing audio samples... ${imported}/${audioRecords.length}` });
  }

  return { count: imported, errors };
}

/**
 * Step 3: Import shared audio (encouragements) if not already populated
 */
async function importSharedAudio(supabase, manifest, knownLang, onProgress) {
  onProgress?.({ step: 3, message: 'Checking shared audio...' });

  // Check if shared_audio already has records for this known language
  const { count: existingCount } = await supabase
    .from('shared_audio')
    .select('*', { count: 'exact', head: true })
    .eq('language', knownLang);

  if (existingCount > 0) {
    return { count: 0, skipped: true, existingCount };
  }

  const slice = manifest.slices?.[0];
  const samples = slice?.samples || manifest.samples || {};

  const ordered = slice?.orderedEncouragements || [];
  const pooled = slice?.pooledEncouragements || [];

  if (ordered.length === 0 && pooled.length === 0) {
    return { count: 0, skipped: true, reason: 'No encouragements in manifest' };
  }

  onProgress?.({ step: 3, message: `Importing ${ordered.length + pooled.length} shared audio records...` });

  const sharedRecords = [];

  // Process ordered encouragements (instructions)
  for (const enc of ordered) {
    const audioInfo = samples[enc.text]?.find(s => s.role === 'presentation');

    sharedRecords.push({
      text: enc.text,
      text_normalized: normalizeText(enc.text),
      language: knownLang,
      audio_type: 'instruction',
      voice_id: 'human_recording',
      origin: 'human',
      s3_key: (enc.id || audioInfo?.id || '').includes('/')
        ? (enc.id || audioInfo?.id)
        : `${enc.id || audioInfo?.id}.mp3`,
      duration_ms: audioInfo?.duration ? Math.round(audioInfo.duration * 1000) : null
    });
  }

  // Process pooled encouragements
  for (const enc of pooled) {
    const audioInfo = samples[enc.text]?.find(s => s.role === 'presentation');

    sharedRecords.push({
      text: enc.text,
      text_normalized: normalizeText(enc.text),
      language: knownLang,
      audio_type: 'encouragement',
      voice_id: 'human_recording',
      origin: 'human',
      s3_key: (enc.id || audioInfo?.id || '').includes('/')
        ? (enc.id || audioInfo?.id)
        : `${enc.id || audioInfo?.id}.mp3`,
      duration_ms: audioInfo?.duration ? Math.round(audioInfo.duration * 1000) : null
    });
  }

  // Batch insert
  const BATCH_SIZE = 50;
  let imported = 0;

  for (let i = 0; i < sharedRecords.length; i += BATCH_SIZE) {
    const batch = sharedRecords.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('shared_audio')
      .upsert(batch, {
        onConflict: 'text_normalized,language,audio_type',
        ignoreDuplicates: true
      });

    if (!error) {
      imported += batch.length;
    }
  }

  return {
    count: imported,
    skipped: false,
    instructions: ordered.length,
    encouragements: pooled.length
  };
}

/**
 * Step 4: Copy shared audio to course_audio
 */
async function copySharedToCourse(supabase, courseCode, knownLang, onProgress) {
  onProgress?.({ step: 4, message: 'Copying shared audio to course...' });

  // Get all shared audio for this known language
  const { data: sharedAudio, error: fetchError } = await supabase
    .from('shared_audio')
    .select('*')
    .eq('language', knownLang);

  if (fetchError) throw new Error(`Failed to fetch shared audio: ${fetchError.message}`);
  if (!sharedAudio || sharedAudio.length === 0) {
    return { count: 0, reason: 'No shared audio to copy' };
  }

  // Map shared_audio to course_audio format
  const courseAudioRecords = sharedAudio.map(sa => ({
    course_code: courseCode,
    text: sa.text,
    text_normalized: sa.text_normalized,
    language: sa.language,
    role: sa.audio_type, // 'instruction' or 'encouragement'
    voice_id: sa.voice_id,
    origin: sa.origin,
    s3_key: sa.s3_key,
    duration_ms: sa.duration_ms
  }));

  // Batch insert
  const BATCH_SIZE = 50;
  let imported = 0;

  for (let i = 0; i < courseAudioRecords.length; i += BATCH_SIZE) {
    const batch = courseAudioRecords.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('course_audio')
      .upsert(batch, {
        onConflict: 'course_code,text_normalized,language,role',
        ignoreDuplicates: true
      });

    if (!error) {
      imported += batch.length;
    }
  }

  return { count: imported };
}

/**
 * Step 5: Import seeds
 */
async function importSeeds(supabase, manifest, courseCode, onProgress) {
  onProgress?.({ step: 5, message: 'Importing seeds...' });

  const slice = manifest.slices?.[0];
  const seeds = slice?.seeds || [];

  const seedRecords = [];

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    const seedNumber = i + 1;

    const knownText = seed.node?.known?.text || seed.seedSentence?.known?.text || '';
    const targetText = seed.node?.target?.text || seed.seedSentence?.target?.text || '';

    seedRecords.push({
      course_code: courseCode,
      seed_number: seedNumber,
      known_text: knownText,
      target_text: targetText,
      status: 'released'
    });
  }

  // Batch insert
  const BATCH_SIZE = 100;
  let imported = 0;

  for (let i = 0; i < seedRecords.length; i += BATCH_SIZE) {
    const batch = seedRecords.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('course_seeds')
      .upsert(batch, { onConflict: 'course_code,seed_number' });

    if (!error) {
      imported += batch.length;
    }

    onProgress?.({ step: 5, message: `Importing seeds... ${imported}/${seedRecords.length}` });
  }

  return { count: imported };
}

/**
 * Step 6: Import LEGOs
 */
async function importLegos(supabase, manifest, courseCode, onProgress) {
  onProgress?.({ step: 6, message: 'Importing LEGOs...' });

  const slice = manifest.slices?.[0];
  const seeds = slice?.seeds || [];

  const legoRecords = [];

  for (let seedIdx = 0; seedIdx < seeds.length; seedIdx++) {
    const seed = seeds[seedIdx];
    const seedNumber = seedIdx + 1;
    const legos = seed.introductionItems || seed.introduction_items || [];

    for (let legoIdx = 0; legoIdx < legos.length; legoIdx++) {
      const lego = legos[legoIdx];

      const legoKnown = lego.node?.known?.text || '';
      const legoTarget = lego.node?.target?.text || '';

      legoRecords.push({
        course_code: courseCode,
        seed_number: seedNumber,
        lego_index: legoIdx + 1,
        type: 'A',
        is_new: true,
        known_text: legoKnown,
        target_text: legoTarget,
        components: null,
        status: 'released'
      });
    }
  }

  // Batch insert
  const BATCH_SIZE = 100;
  let imported = 0;

  for (let i = 0; i < legoRecords.length; i += BATCH_SIZE) {
    const batch = legoRecords.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('course_legos')
      .upsert(batch, { onConflict: 'course_code,seed_number,lego_index' });

    if (!error) {
      imported += batch.length;
    }

    onProgress?.({ step: 6, message: `Importing LEGOs... ${imported}/${legoRecords.length}` });
  }

  return { count: imported };
}

/**
 * Step 7: Import practice phrases
 */
async function importPracticePhrases(supabase, manifest, courseCode, onProgress) {
  onProgress?.({ step: 7, message: 'Importing practice phrases...' });

  const slice = manifest.slices?.[0];
  const seeds = slice?.seeds || [];

  const phraseRecords = [];

  for (let seedIdx = 0; seedIdx < seeds.length; seedIdx++) {
    const seed = seeds[seedIdx];
    const seedNumber = seedIdx + 1;
    const legos = seed.introductionItems || seed.introduction_items || [];

    for (let legoIdx = 0; legoIdx < legos.length; legoIdx++) {
      const lego = legos[legoIdx];
      const phrases = lego.nodes || [];

      for (let phraseIdx = 0; phraseIdx < phrases.length; phraseIdx++) {
        const phrase = phrases[phraseIdx];

        const phraseKnown = phrase.known?.text || '';
        const phraseTarget = phrase.target?.text || '';
        const wordCount = phraseTarget.trim() ? phraseTarget.trim().split(/\s+/).length : 0;

        phraseRecords.push({
          course_code: courseCode,
          seed_number: seedNumber,
          lego_index: legoIdx + 1,
          position: phraseIdx + 1,
          known_text: phraseKnown,
          target_text: phraseTarget,
          word_count: wordCount,
          lego_count: 1,
          status: 'released'
        });
      }
    }
  }

  // Batch insert
  const BATCH_SIZE = 100;
  let imported = 0;

  for (let i = 0; i < phraseRecords.length; i += BATCH_SIZE) {
    const batch = phraseRecords.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('course_practice_phrases')
      .insert(batch);

    if (!error) {
      imported += batch.length;
    }

    onProgress?.({ step: 7, message: `Importing practice phrases... ${imported}/${phraseRecords.length}` });
  }

  return { count: imported };
}

/**
 * Step 8: Import LEGO introductions
 */
async function importLegoIntroductions(supabase, manifest, courseCode, onProgress) {
  onProgress?.({ step: 8, message: 'Importing LEGO introductions...' });

  const slice = manifest.slices?.[0];
  const seeds = slice?.seeds || [];
  const samples = slice?.samples || manifest.samples || {};

  const introRecords = [];

  for (let seedIdx = 0; seedIdx < seeds.length; seedIdx++) {
    const seed = seeds[seedIdx];
    const seedNumber = seedIdx + 1;
    const legos = seed.introductionItems || seed.introduction_items || [];

    for (let legoIdx = 0; legoIdx < legos.length; legoIdx++) {
      const lego = legos[legoIdx];
      const legoId = `S${String(seedNumber).padStart(4, '0')}L${String(legoIdx + 1).padStart(2, '0')}`;

      const presText = lego.presentation;
      if (!presText) continue;

      // Find audio in samples
      const sampleList = samples[presText];
      if (!sampleList) continue;

      const presAudio = sampleList.find(s => s.role === 'presentation');
      if (!presAudio) continue;

      introRecords.push({
        course_code: courseCode,
        lego_id: legoId,
        audio_uuid: presAudio.id.toUpperCase(),
        duration_ms: Math.round(presAudio.duration * 1000)
      });
    }
  }

  // Delete existing intros for this course
  await supabase.from('lego_introductions').delete().eq('course_code', courseCode);

  // Batch insert
  const BATCH_SIZE = 100;
  let imported = 0;

  for (let i = 0; i < introRecords.length; i += BATCH_SIZE) {
    const batch = introRecords.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('lego_introductions')
      .insert(batch);

    if (!error) {
      imported += batch.length;
    }

    onProgress?.({ step: 8, message: `Importing LEGO introductions... ${imported}/${introRecords.length}` });
  }

  return { count: imported };
}

// =============================================================================
// MAIN IMPORT FUNCTION
// =============================================================================

/**
 * Import a legacy course manifest
 *
 * @param {Object} manifest - Parsed JSON manifest
 * @param {Object} options - Import options
 * @param {string} options.supabaseUrl - Supabase URL
 * @param {string} options.supabaseKey - Supabase service key
 * @param {boolean} options.dryRun - If true, only analyze without importing
 * @param {number} options.maxSeeds - Limit number of seeds to import
 * @param {Function} options.onProgress - Progress callback
 * @returns {Object} Import results
 */
async function importLegacyCourse(manifest, options = {}) {
  const {
    supabaseUrl,
    supabaseKey,
    dryRun = false,
    clearFirst = false,
    maxSeeds = null,
    onProgress = null
  } = options;

  // Resolve course info
  const legacyId = manifest.id;
  const courseCode = resolveCourseCode(legacyId);
  const { knownLang, targetLang } = extractLanguages(manifest);

  // Analyze manifest
  const slice = manifest.slices?.[0];
  const seeds = slice?.seeds || [];
  const samples = slice?.samples || manifest.samples || {};
  const ordered = slice?.orderedEncouragements || [];
  const pooled = slice?.pooledEncouragements || [];

  let sampleCount = 0;
  for (const audioList of Object.values(samples)) {
    sampleCount += audioList.length;
  }

  let legoCount = 0;
  let phraseCount = 0;
  for (const seed of seeds) {
    const legos = seed.introductionItems || seed.introduction_items || [];
    legoCount += legos.length;
    for (const lego of legos) {
      phraseCount += (lego.nodes || []).length;
    }
  }

  const analysis = {
    legacyId,
    courseCode,
    knownLang,
    targetLang,
    displayName: generateDisplayName(knownLang, targetLang),
    seedCount: seeds.length,
    sampleCount,
    legoCount,
    phraseCount,
    orderedEncouragements: ordered.length,
    pooledEncouragements: pooled.length
  };

  if (dryRun) {
    return { dryRun: true, analysis };
  }

  // Create Supabase client
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey);

  // Run import steps
  const results = {
    analysis,
    steps: {}
  };

  // Step 0: Clear existing data (if requested)
  if (clearFirst) {
    results.steps.clearData = await clearCourseData(supabase, courseCode, onProgress);
  }

  // Step 1: Course record
  results.steps.courseRecord = await importCourseRecord(
    supabase, manifest, courseCode, knownLang, targetLang, onProgress
  );

  // Step 2: Audio samples
  results.steps.audioSamples = await importAudioSamples(
    supabase, manifest, courseCode, knownLang, targetLang, onProgress
  );

  // Step 3: Shared audio
  results.steps.sharedAudio = await importSharedAudio(
    supabase, manifest, knownLang, onProgress
  );

  // Step 4: Copy shared to course
  results.steps.copyShared = await copySharedToCourse(
    supabase, courseCode, knownLang, onProgress
  );

  // Step 5: Seeds
  results.steps.seeds = await importSeeds(
    supabase, manifest, courseCode, onProgress
  );

  // Step 6: LEGOs
  results.steps.legos = await importLegos(
    supabase, manifest, courseCode, onProgress
  );

  // Step 7: Practice phrases
  results.steps.practicePhrases = await importPracticePhrases(
    supabase, manifest, courseCode, onProgress
  );

  // Step 8: LEGO introductions
  results.steps.legoIntroductions = await importLegoIntroductions(
    supabase, manifest, courseCode, onProgress
  );

  onProgress?.({ step: 8, message: 'Import complete!' });

  return results;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // Main function
  importLegacyCourse,

  // Constants
  COURSE_ALIASES,
  LANG_CODES,
  LANG_NAMES,
  ROLE_MAP,

  // Utilities
  normalizeText,
  resolveCourseCode,
  resolveLangCode,
  extractLanguages,
  generateDisplayName,
  createSupabaseClient,

  // Individual import functions (for testing)
  clearCourseData,
  importCourseRecord,
  importAudioSamples,
  importSharedAudio,
  copySharedToCourse,
  importSeeds,
  importLegos,
  importPracticePhrases,
  importLegoIntroductions
};

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
const langService = require('../../services/language-code-service.cjs');
const {
  canonicalLanguage,
  canonicalVoiceId,
  tryCanonicalLanguage,
  tryCanonicalVoiceId,
  NON_VOICE_SENTINELS,
} = require('../../services/shared/clip-identity.cjs');

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
  // Use language-code-service: convert manifest codes (ja, cy, en) to database codes (jpn, cym, eng)
  return langService.standardToLegacy(code) || code;
}

/**
 * The voice id for a clip a legacy manifest carries no voice for.
 *
 * A legacy manifest names no voice, so these importers used to write a
 * placeholder — `'legacy_import'`, `'human_recording'`, `'legacy'`. None of
 * those is a voice, so none of them can be canonicalised
 * (services/shared/clip-identity.cjs rejects all three as non-voice
 * sentinels), and a clip filed under a placeholder can never dedup against
 * the same recording imported under another one.
 *
 * The `voices` registry already has a convention for exactly this case — a
 * recording with no TTS voice behind it is `human_<course>_<role>`
 * ('human_spa_for_eng_target1', 'human_cym_s_for_eng_presentation'). These
 * clips ARE recordings, so that is what they get. `canonicalVoiceId` checks
 * the composed form rather than trusting the template.
 *
 * @param {string} courseCode resolved course code, e.g. 'cym_s_for_eng'
 * @param {string} role       v13 role, e.g. 'known', 'target1', 'presentation'
 */
function legacyHumanVoiceId(courseCode, role) {
  if (!courseCode || !role) {
    throw new Error(`cannot compose a legacy voice id: courseCode=${JSON.stringify(courseCode)} role=${JSON.stringify(role)}`);
  }
  return canonicalVoiceId(`human_${courseCode}_${role}`);
}

/**
 * The same scheme for `shared_audio`, which has no course — encouragements and
 * instructions are recorded once per KNOWN language and reused by every course,
 * so the language and the audio type stand in for the course and the role:
 * 'human_shared_eng_encouragement'.
 *
 * @param {string} language   known language, canonicalised here
 * @param {string} audioType  'instruction' | 'encouragement'
 */
function sharedHumanVoiceId(language, audioType) {
  if (!audioType) throw new Error(`cannot compose a shared voice id: audioType=${JSON.stringify(audioType)}`);
  return canonicalVoiceId(`human_shared_${canonicalLanguage(language)}_${audioType}`);
}

/**
 * The canonical (language, voice_id) for a `shared_audio` row being copied into
 * `course_audio`. Copying the two columns verbatim is how drift crosses tables,
 * so every copier goes through here.
 *
 * A shared row written before this scheme carries a non-voice placeholder
 * ('human_recording', 'legacy'), which cannot be canonicalised — those resolve
 * to the shared human scheme, i.e. exactly what the same row would be written
 * as today. Anything else that will not canonicalise returns null so the caller
 * SKIPS and REPORTS the row rather than copying a value it cannot vouch for.
 *
 * @returns {{language: string, voice_id: string}|null}
 */
function canonicalSharedIdentity(sharedRow) {
  const language = tryCanonicalLanguage(sharedRow.language);
  if (!language) return null;
  const raw = String(sharedRow.voice_id == null ? '' : sharedRow.voice_id).trim();
  let voice_id;
  try {
    voice_id = NON_VOICE_SENTINELS.has(raw.toLowerCase())
      ? sharedHumanVoiceId(sharedRow.language, sharedRow.audio_type)
      : tryCanonicalVoiceId(raw);
  } catch {
    voice_id = null;
  }
  if (!voice_id) return null;
  return { language, voice_id };
}

function extractLanguages(manifest) {
  const knownLang = resolveLangCode(manifest.known);
  const targetLang = resolveLangCode(manifest.target);
  return { knownLang, targetLang };
}

function generateDisplayName(knownLang, targetLang) {
  // Use language-code-service for names (accepts any code format)
  const targetName = langService.getName(targetLang);
  const knownName = langService.getName(knownLang);
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
async function importCourseRecord(supabase, manifest, courseCode, knownLang, targetLang, onProgress, displayName) {
  onProgress?.({ step: 1, message: 'Upserting course record...' });

  displayName = displayName || generateDisplayName(knownLang, targetLang);

  const { error } = await supabase
    .from('courses')
    .upsert({
      course_code: courseCode,
      display_name: displayName,
      known_lang: knownLang,
      target_lang: targetLang,
      status: 'released',
      course_type: 'official'
    }, { onConflict: 'course_code' });

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
      const language = canonicalLanguage((audio.role === 'source' || role === 'known') ? knownLang : targetLang);

      audioRecords.push({
        course_code: courseCode,
        text: text,
        text_normalized: normalizeText(text),
        language: language,
        role: role,
        voice_id: legacyHumanVoiceId(courseCode, role),
        origin: 'tts',
        s3_key: audio.id.includes('/') ? audio.id : `mastered/${audio.id}.mp3`,
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
      language: canonicalLanguage(knownLang),
      role: 'presentation',
      voice_id: legacyHumanVoiceId(courseCode, 'presentation'),
      origin: 'human',
      s3_key: intro.id.includes('/') ? intro.id : `mastered/${intro.id}.mp3`,
      duration_ms: intro.duration ? Math.round(intro.duration * 1000) : null
    });
  }

  // Deduplicate before inserting (same text+lang+role = keep first)
  const seen = new Set();
  const dedupedRecords = [];
  for (const rec of audioRecords) {
    const key = `${rec.text_normalized}|${rec.language}|${rec.role}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedupedRecords.push(rec);
  }

  // Batch upsert (deduped, so batch failures should be rare)
  const BATCH_SIZE = 100;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < dedupedRecords.length; i += BATCH_SIZE) {
    const batch = dedupedRecords.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('course_audio')
      .upsert(batch, {
        onConflict: 'course_code,text_normalized,language,role',
        ignoreDuplicates: true
      });

    if (error) {
      // Batch failed — fall back to row-by-row to avoid losing good rows
      for (const row of batch) {
        const { error: rowErr } = await supabase
          .from('course_audio')
          .upsert(row, { onConflict: 'course_code,text_normalized,language,role', ignoreDuplicates: true });
        if (rowErr) errors++;
        else imported++;
      }
    } else {
      imported += batch.length;
    }

    onProgress?.({ step: 2, message: `Importing audio samples... ${imported}/${dedupedRecords.length}` });
  }

  return { count: imported, errors, skippedDuplicates: audioRecords.length - dedupedRecords.length };
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
      language: canonicalLanguage(knownLang),
      audio_type: 'instruction',
      voice_id: sharedHumanVoiceId(knownLang, 'instruction'),
      origin: 'human',
      s3_key: (enc.id || audioInfo?.id || '').includes('/')
        ? (enc.id || audioInfo?.id)
        : `mastered/${enc.id || audioInfo?.id}.mp3`,
      duration_ms: audioInfo?.duration ? Math.round(audioInfo.duration * 1000) : null
    });
  }

  // Process pooled encouragements
  for (const enc of pooled) {
    const audioInfo = samples[enc.text]?.find(s => s.role === 'presentation');

    sharedRecords.push({
      text: enc.text,
      text_normalized: normalizeText(enc.text),
      language: canonicalLanguage(knownLang),
      audio_type: 'encouragement',
      voice_id: sharedHumanVoiceId(knownLang, 'encouragement'),
      origin: 'human',
      s3_key: (enc.id || audioInfo?.id || '').includes('/')
        ? (enc.id || audioInfo?.id)
        : `mastered/${enc.id || audioInfo?.id}.mp3`,
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

  // Map shared_audio to course_audio format, canonicalising the identity on the
  // way across — a verbatim copy propagates whatever drift the shared row holds.
  const courseAudioRecords = [];
  const unresolved = [];
  for (const sa of sharedAudio) {
    const identity = canonicalSharedIdentity(sa);
    if (!identity) {
      unresolved.push({ text_normalized: sa.text_normalized, language: sa.language, voice_id: sa.voice_id });
      continue;
    }
    courseAudioRecords.push({
      course_code: courseCode,
      text: sa.text,
      text_normalized: sa.text_normalized,
      language: identity.language,
      role: sa.audio_type, // 'instruction' or 'encouragement'
      voice_id: identity.voice_id,
      origin: sa.origin,
      s3_key: sa.s3_key,
      duration_ms: sa.duration_ms
    });
  }
  if (unresolved.length) {
    onProgress?.({ step: 4, message: `Skipped ${unresolved.length} shared row(s) whose language/voice cannot be canonicalised` });
    console.warn(`[copySharedToCourse] SKIPPED ${unresolved.length} shared row(s) — identity not canonicalisable:`, unresolved.slice(0, 5));
  }

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

  return { count: imported, skippedUncanonicalisable: unresolved.length };
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
        const phraseRole = 'build';
        const rolePosition = phraseIdx + 1;

        // Deterministic phrase ID: {course_code}:S{NNNN}L{NN}B{NN}
        const s = String(seedNumber).padStart(4, '0');
        const l = String(legoIdx + 1).padStart(2, '0');
        const p = String(rolePosition).padStart(2, '0');
        const phraseId = `${courseCode}:S${s}L${l}B${p}`;

        phraseRecords.push({
          id: phraseId,
          course_code: courseCode,
          seed_number: seedNumber,
          lego_index: legoIdx + 1,
          position: phraseIdx + 1,
          phrase_role: phraseRole,
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
      .upsert(batch, { onConflict: 'id' });

    if (error) {
      console.error(`  Phrase batch error: ${error.message}`);
    } else {
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

/**
 * Step 9: Link audio to content rows
 * Matches course_audio records (by text_normalized + role) to seeds, LEGOs, and phrases,
 * then writes the audio IDs back as known_audio_id, target1_audio_id, target2_audio_id,
 * and presentation_audio_id.
 */
async function linkAudioToContent(supabase, courseCode, onProgress, manifest) {
  onProgress?.({ step: 9, message: 'Linking audio to content...' });

  // Build lookup: text_normalized+role → audio.id
  const { data: audioRows, error: audioErr } = await supabase
    .from('course_audio')
    .select('id, text_normalized, role')
    .eq('course_code', courseCode);

  if (audioErr) throw new Error(`Failed to fetch course audio: ${audioErr.message}`);

  const audioLookup = {}; // { "text_normalized|role" → audio.id }
  for (const row of audioRows) {
    const key = `${row.text_normalized}|${row.role}`;
    audioLookup[key] = row.id;
  }

  let linked = 0;

  // Also build exact-text lookup for presentations (normalization can strip trailing punctuation)
  const { data: audioRowsFull, error: audioFullErr } = await supabase
    .from('course_audio')
    .select('id, text, role')
    .eq('course_code', courseCode)
    .eq('role', 'presentation');

  if (!audioFullErr) {
    for (const row of audioRowsFull) {
      audioLookup[`${row.text}|${row.role}`] = row.id;
    }
  }

  // Helper: find audio ID for a text + role
  const findAudio = (text, role) => {
    if (!text) return null;
    // Try exact match first (important for presentation texts with trailing punctuation)
    const exactKey = `${text}|${role}`;
    if (audioLookup[exactKey]) return audioLookup[exactKey];
    // Fall back to normalized match
    const norm = text.toLowerCase().trim().replace(/\s+/g, ' ');
    return audioLookup[`${norm}|${role}`] || null;
  };

  // Link seeds
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode);

  for (const seed of (seeds || [])) {
    const updates = {};
    const knownId = findAudio(seed.known_text, 'known');
    const t1Id = findAudio(seed.target_text, 'target1');
    const t2Id = findAudio(seed.target_text, 'target2');
    if (knownId) updates.known_audio_id = knownId;
    if (t1Id) updates.target1_audio_id = t1Id;
    if (t2Id) updates.target2_audio_id = t2Id;

    if (Object.keys(updates).length > 0) {
      await supabase.from('course_seeds').update(updates)
        .eq('course_code', courseCode).eq('seed_number', seed.seed_number);
      linked++;
    }
  }

  onProgress?.({ step: 9, message: `Linking audio... ${linked} seeds done` });

  // Build presentation text map from manifest (presentation audio text != LEGO target_text)
  const presTextMap = {}; // "seedNumber|legoIndex" → presentation text
  if (manifest) {
    const slice = manifest.slices?.[0];
    const manifestSeeds = slice?.seeds || [];
    for (let si = 0; si < manifestSeeds.length; si++) {
      const mLegos = manifestSeeds[si].introductionItems || manifestSeeds[si].introduction_items || [];
      for (let li = 0; li < mLegos.length; li++) {
        if (mLegos[li].presentation) {
          presTextMap[`${si + 1}|${li + 1}`] = mLegos[li].presentation;
        }
      }
    }
  }

  // Link LEGOs
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text')
    .eq('course_code', courseCode);

  for (const lego of (legos || [])) {
    const updates = {};
    const knownId = findAudio(lego.known_text, 'known');
    const t1Id = findAudio(lego.target_text, 'target1');
    const t2Id = findAudio(lego.target_text, 'target2');
    // Presentation audio uses the explanation text, not target_text
    const presText = presTextMap[`${lego.seed_number}|${lego.lego_index}`];
    const presId = presText ? findAudio(presText, 'presentation') : findAudio(lego.target_text, 'presentation');
    if (knownId) updates.known_audio_id = knownId;
    if (t1Id) updates.target1_audio_id = t1Id;
    if (t2Id) updates.target2_audio_id = t2Id;
    if (presId) updates.presentation_audio_id = presId;

    if (Object.keys(updates).length > 0) {
      await supabase.from('course_legos').update(updates)
        .eq('course_code', courseCode)
        .eq('seed_number', lego.seed_number)
        .eq('lego_index', lego.lego_index);
      linked++;
    }
  }

  onProgress?.({ step: 9, message: `Linking audio... ${linked} seeds+legos done` });

  // Link phrases
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('id, known_text, target_text')
    .eq('course_code', courseCode);

  for (const phrase of (phrases || [])) {
    const updates = {};
    const knownId = findAudio(phrase.known_text, 'known');
    const t1Id = findAudio(phrase.target_text, 'target1');
    const t2Id = findAudio(phrase.target_text, 'target2');
    if (knownId) updates.known_audio_id = knownId;
    if (t1Id) updates.target1_audio_id = t1Id;
    if (t2Id) updates.target2_audio_id = t2Id;

    if (Object.keys(updates).length > 0) {
      await supabase.from('course_practice_phrases').update(updates)
        .eq('id', phrase.id);
      linked++;
    }
  }

  onProgress?.({ step: 9, message: `Linking audio... ${linked} total linked` });

  return { count: linked };
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
    onProgress = null,
    courseCodeOverride = null,
    displayNameOverride = null
  } = options;

  // Resolve course info (overrides take precedence)
  const legacyId = manifest.id;
  const courseCode = courseCodeOverride || resolveCourseCode(legacyId);
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

  const displayName = displayNameOverride || generateDisplayName(knownLang, targetLang);

  const analysis = {
    legacyId,
    courseCode,
    knownLang,
    targetLang,
    displayName,
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
    supabase, manifest, courseCode, knownLang, targetLang, onProgress, displayName
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

  // Step 9: Link audio to content rows (seeds, LEGOs, phrases)
  results.steps.audioLinks = await linkAudioToContent(
    supabase, courseCode, onProgress, manifest
  );

  onProgress?.({ step: 9, message: 'Import complete!' });

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
  ROLE_MAP,

  // Utilities
  normalizeText,
  resolveCourseCode,
  resolveLangCode,
  legacyHumanVoiceId,
  sharedHumanVoiceId,
  canonicalSharedIdentity,
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
  importLegoIntroductions,
  linkAudioToContent
};

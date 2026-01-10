/**
 * POST /api/import-course
 *
 * Import a legacy course manifest into the database.
 * Receives manifest JSON and imports:
 * - courses (1 record)
 * - course_audio (all audio samples)
 * - course_seeds (all seeds)
 * - course_legos (all LEGOs)
 * - course_practice_phrases (all practice phrases)
 * - lego_introductions (LEGO presentation audio links)
 * - shared_audio (encouragements, if not already populated)
 *
 * Body (multipart/form-data):
 *   manifest: JSON string of the course manifest
 *   clearFirst: "true" | "false" - clear existing data before import
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

// Course code aliases (single source of truth)
const COURSE_ALIASES = {
  'en-cy-north': 'cym_n_for_eng',
  'en-cy-south': 'cym_s_for_eng',
  'en-es': 'spa_for_eng',
  'en-ga': 'gle_for_eng',
  'cmn_for_eng': 'zho_for_eng',
  'En-Ch': 'zho_for_eng'
};

const DISPLAY_NAMES = {
  'cym_n_for_eng': 'Welsh (North) for English Speakers',
  'cym_s_for_eng': 'Welsh (South) for English Speakers',
  'spa_for_eng': 'Spanish for English Speakers',
  'gle_for_eng': 'Irish for English Speakers',
  'zho_for_eng': 'Mandarin for English Speakers'
};

function getSupabase() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase not configured');
  }
  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
}

function normalizeText(text) {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

function resolveCourseCode(legacyId) {
  return COURSE_ALIASES[legacyId] || legacyId;
}

// =============================================================================
// IMPORT FUNCTIONS
// =============================================================================

async function clearCourseData(supabase, courseCode) {
  const results = {};
  const tables = [
    'lego_introductions',
    'course_practice_phrases',
    'course_legos',
    'course_seeds',
    'course_audio'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .eq('course_code', courseCode);

      if (error) throw error;
      results[table] = { deleted: count || 0 };
    } catch (err) {
      results[table] = { deleted: 0, error: err.message };
    }
  }

  return results;
}

async function importCourseRecord(supabase, manifest, courseCode) {
  const knownLang = manifest.known || 'eng';
  const targetLang = manifest.target || 'unknown';
  const displayName = DISPLAY_NAMES[courseCode] || `${targetLang.toUpperCase()} for ${knownLang.toUpperCase()} speakers`;

  const { error } = await supabase
    .from('courses')
    .upsert({
      code: courseCode,
      known_lang: knownLang,
      target_lang: targetLang,
      display_name: displayName,
      status: 'released',
      course_type: 'language'
    }, { onConflict: 'code' });

  if (error) throw error;
  return { count: 1, displayName };
}

async function importAudioSamples(supabase, manifest, courseCode) {
  const samples = manifest.samples || {};
  const knownLang = manifest.known || 'eng';
  const targetLang = manifest.target || 'unknown';

  const ROLE_MAPPING = {
    source: 'known',
    target: 'target1',
    target1: 'target1',
    target2: 'target2',
    presentation: 'presentation',
    instruction: 'instruction'
  };

  const audioRecords = [];
  for (const [text, sampleList] of Object.entries(samples)) {
    for (const sample of sampleList) {
      const role = ROLE_MAPPING[sample.role] || sample.role;
      const language = (role === 'known' || role === 'instruction') ? knownLang : targetLang;
      const cadence = sample.cadence || (language === knownLang ? 'natural' : 'slow');

      audioRecords.push({
        course_code: courseCode,
        text: text,
        text_normalized: normalizeText(text),
        language: language,
        role: role,
        cadence: cadence,
        voice_id: sample.voice_id || 'legacy',
        origin: 'tts',
        s3_uuid: sample.id.toUpperCase(),
        duration_ms: Math.round((sample.duration || 0) * 1000)
      });
    }
  }

  let inserted = 0;
  let errors = 0;
  const BATCH_SIZE = 100;

  for (let i = 0; i < audioRecords.length; i += BATCH_SIZE) {
    const batch = audioRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('course_audio')
      .upsert(batch, {
        onConflict: 'course_code,text_normalized,language,role,cadence,voice_id',
        ignoreDuplicates: false
      });

    if (error) {
      errors += batch.length;
    } else {
      inserted += batch.length;
    }
  }

  return { count: inserted, errors };
}

async function importSharedAudio(supabase, manifest, courseCode) {
  const knownLang = manifest.known || 'eng';
  const slice = manifest.slices?.[0];
  if (!slice) return { count: 0 };

  // Check if shared audio already exists
  const { count: existing } = await supabase
    .from('shared_audio')
    .select('*', { count: 'exact', head: true })
    .eq('language', knownLang);

  if (existing > 0) {
    return { count: 0, skipped: true };
  }

  const samples = manifest.samples || {};
  const sharedRecords = [];

  // Ordered encouragements (instructions)
  const ordered = slice.orderedEncouragements || [];
  for (let i = 0; i < ordered.length; i++) {
    const enc = ordered[i];
    const sampleList = samples[enc.text] || [];
    const sample = sampleList.find(s => s.role === 'presentation');

    if (sample) {
      sharedRecords.push({
        text: enc.text,
        text_normalized: normalizeText(enc.text),
        language: knownLang,
        audio_type: 'instruction',
        order_index: i,
        s3_uuid: sample.id.toUpperCase(),
        duration_ms: Math.round((sample.duration || 0) * 1000),
        voice_id: sample.voice_id || 'legacy',
        origin: 'human'
      });
    }
  }

  // Pooled encouragements
  const pooled = slice.pooledEncouragements || [];
  for (const enc of pooled) {
    const sampleList = samples[enc.text] || [];
    const sample = sampleList.find(s => s.role === 'presentation');

    if (sample) {
      sharedRecords.push({
        text: enc.text,
        text_normalized: normalizeText(enc.text),
        language: knownLang,
        audio_type: 'encouragement',
        order_index: null,
        s3_uuid: sample.id.toUpperCase(),
        duration_ms: Math.round((sample.duration || 0) * 1000),
        voice_id: sample.voice_id || 'legacy',
        origin: 'human'
      });
    }
  }

  if (sharedRecords.length === 0) {
    return { count: 0 };
  }

  const { error } = await supabase.from('shared_audio').insert(sharedRecords);
  if (error) throw error;

  return { count: sharedRecords.length };
}

async function copySharedToCourse(supabase, manifest, courseCode) {
  const knownLang = manifest.known || 'eng';

  const { data: shared, error: fetchError } = await supabase
    .from('shared_audio')
    .select('*')
    .eq('language', knownLang);

  if (fetchError) throw fetchError;
  if (!shared || shared.length === 0) return { count: 0 };

  const courseAudioRecords = shared.map(s => ({
    course_code: courseCode,
    text: s.text,
    text_normalized: s.text_normalized,
    language: s.language,
    role: s.audio_type === 'instruction' ? 'instruction' : 'encouragement',
    cadence: 'natural',
    voice_id: s.voice_id,
    origin: s.origin,
    s3_uuid: s.s3_uuid,
    duration_ms: s.duration_ms
  }));

  const { error } = await supabase
    .from('course_audio')
    .upsert(courseAudioRecords, {
      onConflict: 'course_code,text_normalized,language,role,cadence,voice_id',
      ignoreDuplicates: true
    });

  if (error) throw error;
  return { count: courseAudioRecords.length };
}

async function importSeeds(supabase, manifest, courseCode) {
  const slice = manifest.slices?.[0];
  if (!slice) return { count: 0 };

  const seeds = slice.seeds || [];
  const seedRecords = seeds.map((seed, idx) => {
    const knownText = seed.node?.known?.text || seed.seedSentence?.known?.text || '';
    const targetText = seed.node?.target?.text || seed.seedSentence?.target?.text || '';

    return {
      course_code: courseCode,
      seed_number: idx + 1,
      known_text: knownText,
      target_text: targetText,
      status: 'released'
    };
  });

  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < seedRecords.length; i += BATCH_SIZE) {
    const batch = seedRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('course_seeds')
      .upsert(batch, { onConflict: 'course_code,seed_number' });

    if (error) throw error;
    inserted += batch.length;
  }

  return { count: inserted };
}

async function importLegos(supabase, manifest, courseCode) {
  const slice = manifest.slices?.[0];
  if (!slice) return { count: 0 };

  const seeds = slice.seeds || [];
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

  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < legoRecords.length; i += BATCH_SIZE) {
    const batch = legoRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('course_legos')
      .upsert(batch, { onConflict: 'course_code,seed_number,lego_index' });

    if (error) throw error;
    inserted += batch.length;
  }

  return { count: inserted };
}

async function importPracticePhrases(supabase, manifest, courseCode) {
  const slice = manifest.slices?.[0];
  if (!slice) return { count: 0 };

  const seeds = slice.seeds || [];
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

  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < phraseRecords.length; i += BATCH_SIZE) {
    const batch = phraseRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('course_practice_phrases')
      .upsert(batch, { onConflict: 'course_code,seed_number,lego_index,position' });

    if (error) throw error;
    inserted += batch.length;
  }

  return { count: inserted };
}

async function importLegoIntroductions(supabase, manifest, courseCode) {
  const slice = manifest.slices?.[0];
  if (!slice) return { count: 0 };

  const seeds = slice.seeds || [];
  const samples = manifest.samples || {};
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

      const sampleList = samples[presText];
      if (!sampleList) continue;

      const presAudio = sampleList.find(s => s.role === 'presentation');
      if (!presAudio) continue;

      introRecords.push({
        course_code: courseCode,
        lego_id: legoId,
        audio_uuid: presAudio.id.toUpperCase(),
        duration_ms: Math.round((presAudio.duration || 0) * 1000)
      });
    }
  }

  // Clear existing
  await supabase.from('lego_introductions').delete().eq('course_code', courseCode);

  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < introRecords.length; i += BATCH_SIZE) {
    const batch = introRecords.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('lego_introductions').insert(batch);
    if (error) throw error;
    inserted += batch.length;
  }

  return { count: inserted };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse body
    let manifest;
    let clearFirst = false;

    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // FormData
      const manifestStr = req.body?.manifest || req.body?.get?.('manifest');
      clearFirst = (req.body?.clearFirst || req.body?.get?.('clearFirst')) === 'true';
      manifest = typeof manifestStr === 'string' ? JSON.parse(manifestStr) : manifestStr;
    } else {
      // JSON body
      manifest = req.body?.manifest || req.body;
      clearFirst = req.body?.clearFirst === true || req.body?.clearFirst === 'true';
    }

    if (!manifest || !manifest.id || !manifest.slices) {
      return res.status(400).json({
        success: false,
        error: 'Invalid manifest: missing id or slices'
      });
    }

    const legacyId = manifest.id;
    const courseCode = resolveCourseCode(legacyId);

    const supabase = getSupabase();

    // Clear existing data if requested
    let clearResult = null;
    if (clearFirst) {
      clearResult = await clearCourseData(supabase, courseCode);
    }

    // Run import steps
    const courseResult = await importCourseRecord(supabase, manifest, courseCode);
    const audioResult = await importAudioSamples(supabase, manifest, courseCode);
    const sharedResult = await importSharedAudio(supabase, manifest, courseCode);
    const copyResult = await copySharedToCourse(supabase, manifest, courseCode);
    const seedsResult = await importSeeds(supabase, manifest, courseCode);
    const legosResult = await importLegos(supabase, manifest, courseCode);
    const phrasesResult = await importPracticePhrases(supabase, manifest, courseCode);
    const introsResult = await importLegoIntroductions(supabase, manifest, courseCode);

    return res.status(200).json({
      success: true,
      courseCode,
      displayName: courseResult.displayName,
      cleared: clearResult,
      statistics: {
        courses: courseResult.count,
        course_audio: audioResult.count + copyResult.count,
        shared_audio: sharedResult.count,
        course_seeds: seedsResult.count,
        course_legos: legosResult.count,
        course_practice_phrases: phrasesResult.count,
        lego_introductions: introsResult.count
      }
    });

  } catch (error) {
    console.error('[Import Course] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

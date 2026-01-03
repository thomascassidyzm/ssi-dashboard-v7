/**
 * GET /api/production/:courseCode/script-view
 * Returns seeds with nested LEGOs and phrases for the Script Viewer
 *
 * This is a Vercel serverless version of the production-api endpoint.
 */

import { isSupabaseConfigured, getSupabase } from '../../lib/supabase.js';

/**
 * Batch lookup audio UUIDs for given texts
 * v13: Query course_audio directly (flat table, no joins needed)
 */
async function batchLookupAudioUuids(db, courseCode, knownTexts, targetTexts) {
  const audioMap = new Map();

  // Normalize all texts
  const allTexts = [...new Set([...knownTexts, ...targetTexts].map(t => t?.toLowerCase().trim()).filter(Boolean))];

  if (allTexts.length === 0) return audioMap;

  // v13: Query course_audio directly (flat table with text_normalized)
  const { data: courseAudio } = await db
    .from('course_audio')
    .select('id, text_normalized, role')
    .eq('course_code', courseCode)
    .in('text_normalized', allTexts);

  if (!courseAudio || courseAudio.length === 0) return audioMap;

  // Build map: normalized_text -> { known, target1, target2 }
  for (const audio of courseAudio) {
    const normalized = audio.text_normalized;
    if (!normalized) continue;

    if (!audioMap.has(normalized)) {
      audioMap.set(normalized, {});
    }
    const entry = audioMap.get(normalized);

    if (audio.role === 'known') {
      entry.known = audio.id;
    } else if (audio.role === 'target1') {
      entry.target1 = audio.id;
    } else if (audio.role === 'target2') {
      entry.target2 = audio.id;
    }
  }

  return audioMap;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { courseCode } = req.query;

  if (!courseCode) {
    return res.status(400).json({ error: 'Course code is required' });
  }

  try {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({ error: 'Supabase not configured' });
    }

    const db = getSupabase();
    if (!db) {
      return res.status(503).json({ error: 'Database connection failed' });
    }

    // Query all seeds with their LEGOs and phrases in a single nested query
    const { data: seeds, error } = await db
      .from('course_seeds')
      .select(`
        id,
        seed_number,
        known_text,
        target_text,
        status,
        course_legos (
          id,
          lego_index,
          known_text,
          target_text,
          type,
          is_new,
          course_practice_phrases (
            id,
            position,
            known_text,
            target_text,
            word_count,
            lego_count
          )
        )
      `)
      .eq('course_code', courseCode)
      .eq('status', 'released')
      .order('seed_number', { ascending: true });

    if (error) {
      console.error(`Script view query error for ${courseCode}:`, error);
      throw error;
    }

    if (!seeds || seeds.length === 0) {
      return res.status(404).json({
        error: 'Course not found',
        message: `No seeds found for course: ${courseCode}`
      });
    }

    // Collect all unique texts for audio lookup
    const knownTexts = [];
    const targetTexts = [];
    for (const seed of seeds) {
      for (const lego of (seed.course_legos || [])) {
        for (const phrase of (lego.course_practice_phrases || [])) {
          if (phrase.known_text) knownTexts.push(phrase.known_text);
          if (phrase.target_text) targetTexts.push(phrase.target_text);
        }
      }
    }

    // Batch lookup audio UUIDs
    const audioMap = await batchLookupAudioUuids(db, courseCode, knownTexts, targetTexts);
    console.log(`[script-view] Audio lookup for ${courseCode}: found ${audioMap.size} text->audio mappings`);

    // Transform to the expected hierarchical structure
    const transformedSeeds = seeds.map(seed => {
      const seedId = 'S' + String(seed.seed_number).padStart(4, '0');

      // Transform LEGOs, sorted by lego_index
      const legos = (seed.course_legos || [])
        .sort((a, b) => a.lego_index - b.lego_index)
        .map(lego => {
          const legoId = seedId + 'L' + String(lego.lego_index).padStart(2, '0');

          // Transform phrases, sorted by position
          const phrases = (lego.course_practice_phrases || [])
            .sort((a, b) => a.position - b.position)
            .map(phrase => {
              // Derive phrase type based on position
              let phraseType = 'practice';
              if (phrase.position === 1) phraseType = 'intro';
              else if (phrase.position === 2) phraseType = 'lego';
              else if (phrase.position === 3) phraseType = 'debut';

              // Look up audio UUIDs
              const knownNorm = phrase.known_text?.toLowerCase().trim();
              const targetNorm = phrase.target_text?.toLowerCase().trim();
              const knownAudio = knownNorm ? audioMap.get(knownNorm) : null;
              const targetAudio = targetNorm ? audioMap.get(targetNorm) : null;

              return {
                id: phrase.id,
                position: phrase.position,
                known_text: phrase.known_text,
                target_text: phrase.target_text,
                type: phraseType,
                word_count: phrase.word_count,
                lego_count: phrase.lego_count,
                known_audio_uuid: knownAudio?.known || null,
                target1_audio_uuid: targetAudio?.target1 || null,
                target2_audio_uuid: targetAudio?.target2 || null
              };
            });

          return {
            lego_id: legoId,
            lego_index: lego.lego_index,
            type: lego.type,
            known_text: lego.known_text,
            target_text: lego.target_text,
            is_new: lego.is_new,
            phrases
          };
        });

      return {
        seed_id: seedId,
        seed_number: seed.seed_number,
        known_text: seed.known_text,
        target_text: seed.target_text,
        status: seed.status,
        legos,
        // Empty introduction phrases for now (can be populated later)
        introduction_phrases: []
      };
    });

    res.json({
      courseCode,
      seeds: transformedSeeds,
      stats: {
        seedCount: transformedSeeds.length,
        legoCount: transformedSeeds.reduce((sum, s) => sum + s.legos.length, 0),
        phraseCount: transformedSeeds.reduce((sum, s) =>
          sum + s.legos.reduce((lsum, l) => lsum + l.phrases.length, 0), 0),
        audioMappings: audioMap.size
      },
      _source: 'database'
    });

  } catch (err) {
    console.error(`[script-view] Error for ${courseCode}:`, err.message);
    res.status(500).json({
      error: 'Failed to fetch script view',
      message: err.message
    });
  }
}

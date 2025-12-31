/**
 * GET /api/production/:courseCode/audio-pipeline/plan
 * Returns audio generation plan with counts of needed vs existing audio
 */

import { isSupabaseConfigured, getSupabase } from '../../../lib/supabase.js';

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

  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  const db = getSupabase();
  if (!db) {
    return res.status(503).json({ error: 'Database connection failed' });
  }

  try {
    // Get course config for voice assignments and languages
    const { data: course, error: courseError } = await db
      .from('courses')
      .select('known_lang, target_lang, known_voice, target1_voice, target2_voice, known_cadence, target_cadence')
      .eq('course_code', courseCode)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Use course-specific cadences (default to natural/slow if not set)
    const knownCadence = course.known_cadence || 'natural';
    const targetCadence = course.target_cadence || 'natural';

    // Get unique texts from practice phrases
    const { data: phrases, error: phrasesError } = await db
      .from('course_practice_phrases')
      .select('known_text, target_text')
      .eq('course_code', courseCode)
      .eq('status', 'released');

    if (phrasesError) throw phrasesError;

    // Collect unique normalized texts
    const knownTexts = new Set();
    const targetTexts = new Set();
    for (const p of (phrases || [])) {
      if (p.known_text) knownTexts.add(p.known_text.toLowerCase().trim());
      if (p.target_text) targetTexts.add(p.target_text.toLowerCase().trim());
    }

    // Total needed: known texts need 1 audio, target texts need 2 (target1 + target2)
    const totalAudioNeeded = knownTexts.size + (targetTexts.size * 2);

    // Query audio_files via texts table (v12 schema)
    // Step 1: Get text IDs for known texts
    // Step 2: Count audio files matching those text IDs + voice + cadence
    let existingKnown = 0;
    let existingTarget1 = 0;
    let existingTarget2 = 0;

    // Helper to count audio files for a set of texts
    async function countAudioForTexts(textArray, language, voiceId, cadence) {
      if (!textArray.length || !voiceId) return 0;

      // Step 1: Get text IDs (batch to avoid URL length issues)
      const batchSize = 100;
      let totalCount = 0;

      for (let i = 0; i < textArray.length; i += batchSize) {
        const batch = textArray.slice(i, i + batchSize);

        // Get text IDs for this batch
        const { data: texts } = await db
          .from('texts')
          .select('id')
          .eq('language', language)
          .in('content_normalized', batch);

        if (!texts || texts.length === 0) continue;

        const textIds = texts.map(t => t.id);

        // Count audio files matching these text IDs
        const { count } = await db
          .from('audio_files')
          .select('id', { count: 'exact', head: true })
          .eq('voice_id', voiceId)
          .eq('cadence', cadence)
          .in('text_id', textIds);

        totalCount += count || 0;
      }

      return totalCount;
    }

    // Count existing audio
    const knownArray = Array.from(knownTexts);
    const targetArray = Array.from(targetTexts);

    existingKnown = await countAudioForTexts(knownArray, course.known_lang, course.known_voice, knownCadence);
    existingTarget1 = await countAudioForTexts(targetArray, course.target_lang, course.target1_voice, targetCadence);
    existingTarget2 = await countAudioForTexts(targetArray, course.target_lang, course.target2_voice, targetCadence);

    const existingCount = existingKnown + existingTarget1 + existingTarget2;
    const missing = Math.max(0, totalAudioNeeded - existingCount);
    const percentComplete = totalAudioNeeded > 0
      ? Math.round((existingCount / totalAudioNeeded) * 100)
      : 0;

    return res.json({
      courseCode,
      total: totalAudioNeeded,
      existing: existingCount,
      missing,
      percentComplete,
      uniqueKnownTexts: knownTexts.size,
      uniqueTargetTexts: targetTexts.size,
      breakdown: {
        known: { needed: knownTexts.size, existing: existingKnown, voice: course.known_voice },
        target1: { needed: targetTexts.size, existing: existingTarget1, voice: course.target1_voice },
        target2: { needed: targetTexts.size, existing: existingTarget2, voice: course.target2_voice }
      },
      languages: { known: course.known_lang, target: course.target_lang },
      estimatedCost: `$${(missing * 0.002).toFixed(2)}`,
      estimatedTime: `${Math.ceil(missing / 60)} min`
    });

  } catch (err) {
    console.error(`[audio-pipeline/plan] Error for ${courseCode}:`, err.message);
    res.status(500).json({
      error: 'Failed to generate audio plan',
      message: err.message
    });
  }
}

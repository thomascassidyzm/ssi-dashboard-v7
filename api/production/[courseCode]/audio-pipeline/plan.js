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
    // Count unique texts needed for audio (from practice phrases)
    const { data: phrases, error: phrasesError } = await db
      .from('course_practice_phrases')
      .select('known_text, target_text')
      .eq('course_code', courseCode)
      .eq('status', 'released');

    if (phrasesError) throw phrasesError;

    // Collect unique texts (known + target, normalized)
    const uniqueKnownTexts = new Set();
    const uniqueTargetTexts = new Set();
    for (const phrase of (phrases || [])) {
      if (phrase.known_text) uniqueKnownTexts.add(phrase.known_text.toLowerCase().trim());
      if (phrase.target_text) uniqueTargetTexts.add(phrase.target_text.toLowerCase().trim());
    }

    // Each unique text needs audio files:
    // - Known texts need 1 audio (source role)
    // - Target texts need 2 audio (target1 + target2 roles)
    const totalAudioNeeded = uniqueKnownTexts.size + (uniqueTargetTexts.size * 2);

    // Count existing audio in audio_samples table (legacy table the learning app uses)
    // This joins on text_normalized + role
    let existingSource = 0;
    let existingTarget1 = 0;
    let existingTarget2 = 0;

    if (uniqueKnownTexts.size > 0) {
      const knownTextsArray = Array.from(uniqueKnownTexts).slice(0, 1000);
      const { count } = await db
        .from('audio_samples')
        .select('*', { count: 'exact', head: true })
        .in('text_normalized', knownTextsArray)
        .eq('role', 'source');
      existingSource = count || 0;
    }

    if (uniqueTargetTexts.size > 0) {
      const targetTextsArray = Array.from(uniqueTargetTexts).slice(0, 1000);

      const { count: t1Count } = await db
        .from('audio_samples')
        .select('*', { count: 'exact', head: true })
        .in('text_normalized', targetTextsArray)
        .eq('role', 'target1');
      existingTarget1 = t1Count || 0;

      const { count: t2Count } = await db
        .from('audio_samples')
        .select('*', { count: 'exact', head: true })
        .in('text_normalized', targetTextsArray)
        .eq('role', 'target2');
      existingTarget2 = t2Count || 0;
    }

    const existingCount = existingSource + existingTarget1 + existingTarget2;
    const missing = Math.max(0, totalAudioNeeded - existingCount);
    const percentComplete = totalAudioNeeded > 0
      ? Math.round((existingCount / totalAudioNeeded) * 100)
      : 0;

    return res.json({
      courseCode,
      total: totalAudioNeeded,
      existing: existingCount,
      missing: missing,
      phraseNeeds: phrases?.length || 0,
      uniqueKnownTexts: uniqueKnownTexts.size,
      uniqueTargetTexts: uniqueTargetTexts.size,
      percentComplete,
      breakdown: {
        source: { needed: uniqueKnownTexts.size, existing: existingSource },
        target1: { needed: uniqueTargetTexts.size, existing: existingTarget1 },
        target2: { needed: uniqueTargetTexts.size, existing: existingTarget2 }
      },
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

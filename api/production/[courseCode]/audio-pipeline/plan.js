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
    // Get course voice assignments
    const { data: course, error: courseError } = await db
      .from('courses')
      .select('known_voice, target1_voice, target2_voice')
      .eq('course_code', courseCode)
      .single();

    if (courseError) {
      console.error(`[audio-pipeline/plan] Course lookup error:`, courseError);
      return res.status(404).json({ error: 'Course not found' });
    }

    // Count unique texts needed for audio (from practice phrases)
    const { data: phrases, error: phrasesError } = await db
      .from('course_practice_phrases')
      .select('known_text, target_text')
      .eq('course_code', courseCode)
      .eq('status', 'released');

    if (phrasesError) throw phrasesError;

    // Collect unique texts (known + target, normalized)
    const uniqueTexts = new Set();
    for (const phrase of (phrases || [])) {
      if (phrase.known_text) uniqueTexts.add(phrase.known_text.toLowerCase().trim());
      if (phrase.target_text) uniqueTexts.add(phrase.target_text.toLowerCase().trim());
    }

    // Each unique text needs multiple audio files (known voice + target voices)
    // For now, estimate 3 audio files per phrase (known + target1 + target2)
    const uniquePhraseCount = phrases?.length || 0;
    const totalAudioNeeded = uniquePhraseCount * 3; // known + target1 + target2 for each phrase

    // Count existing audio files for this course's voices
    const voiceIds = [course.known_voice, course.target1_voice, course.target2_voice].filter(Boolean);

    let existingCount = 0;
    if (voiceIds.length > 0 && uniqueTexts.size > 0) {
      // Get text IDs for our unique texts
      const { data: texts } = await db
        .from('texts')
        .select('id')
        .in('content_normalized', Array.from(uniqueTexts).slice(0, 1000)); // Limit for performance

      if (texts && texts.length > 0) {
        const textIds = texts.map(t => t.id);

        // Count audio files that exist for these texts + voices
        const { count } = await db
          .from('audio_files')
          .select('*', { count: 'exact', head: true })
          .in('text_id', textIds)
          .in('voice_id', voiceIds);

        existingCount = count || 0;
      }
    }

    const missing = Math.max(0, totalAudioNeeded - existingCount);
    const percentComplete = totalAudioNeeded > 0
      ? Math.round((existingCount / totalAudioNeeded) * 100)
      : 0;

    return res.json({
      courseCode,
      total: totalAudioNeeded,
      existing: existingCount,
      missing: missing,
      phraseNeeds: uniquePhraseCount,
      percentComplete,
      voices: {
        known: course.known_voice,
        target1: course.target1_voice,
        target2: course.target2_voice
      },
      estimatedCost: `$${(missing * 0.002).toFixed(2)}`, // Rough estimate: $0.002 per audio
      estimatedTime: `${Math.ceil(missing / 60)} min` // Rough estimate: 60 per minute
    });

  } catch (err) {
    console.error(`[audio-pipeline/plan] Error for ${courseCode}:`, err.message);
    res.status(500).json({
      error: 'Failed to generate audio plan',
      message: err.message
    });
  }
}

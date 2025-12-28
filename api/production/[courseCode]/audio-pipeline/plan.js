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
      .select('known_lang, target_lang, known_voice, target1_voice, target2_voice')
      .eq('course_code', courseCode)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

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
    // Known audio: texts(content_normalized, lang=known_lang) → audio_files(text_id, voice_id=known_voice, cadence=natural)
    let existingKnown = 0;
    let existingTarget1 = 0;
    let existingTarget2 = 0;

    if (knownTexts.size > 0 && course.known_voice) {
      const knownArray = Array.from(knownTexts).slice(0, 500);
      const { count } = await db
        .from('audio_files')
        .select('id', { count: 'exact', head: true })
        .eq('voice_id', course.known_voice)
        .eq('cadence', 'natural')
        .in('text_id', db
          .from('texts')
          .select('id')
          .eq('language', course.known_lang)
          .in('content_normalized', knownArray)
        );
      existingKnown = count || 0;
    }

    if (targetTexts.size > 0) {
      const targetArray = Array.from(targetTexts).slice(0, 500);

      if (course.target1_voice) {
        const { count: t1 } = await db
          .from('audio_files')
          .select('id', { count: 'exact', head: true })
          .eq('voice_id', course.target1_voice)
          .eq('cadence', 'slow')
          .in('text_id', db
            .from('texts')
            .select('id')
            .eq('language', course.target_lang)
            .in('content_normalized', targetArray)
          );
        existingTarget1 = t1 || 0;
      }

      if (course.target2_voice) {
        const { count: t2 } = await db
          .from('audio_files')
          .select('id', { count: 'exact', head: true })
          .eq('voice_id', course.target2_voice)
          .eq('cadence', 'slow')
          .in('text_id', db
            .from('texts')
            .select('id')
            .eq('language', course.target_lang)
            .in('content_normalized', targetArray)
          );
        existingTarget2 = t2 || 0;
      }
    }

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

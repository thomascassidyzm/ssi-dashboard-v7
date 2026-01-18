/**
 * GET /api/production/:courseCode/audio-pipeline/plan
 * Returns audio generation plan with counts of needed vs existing audio
 *
 * v13 Schema: Uses course_audio table directly (no texts/audio_files join)
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
    // Get course config (v13: voice_config is JSONB)
    const { data: course, error: courseError } = await db
      .from('courses')
      .select('code, display_name, known_lang, target_lang, voice_config, status')
      .eq('course_code', courseCode)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const voiceConfig = course.voice_config || {};

    // Get unique texts from practice phrases
    const { data: phrases, error: phrasesError } = await db
      .from('course_practice_phrases')
      .select('known, target')
      .eq('course_code', courseCode);

    if (phrasesError) throw phrasesError;

    // Collect unique normalized texts
    const knownTexts = new Set();
    const targetTexts = new Set();
    for (const p of (phrases || [])) {
      if (p.known) knownTexts.add(p.known.toLowerCase().trim());
      if (p.target) targetTexts.add(p.target.toLowerCase().trim());
    }

    // Total needed: known texts need 1 audio, target texts need 2 (target1 + target2)
    const totalAudioNeeded = knownTexts.size + (targetTexts.size * 2);

    // Get existing audio from course_audio (v13: flat table)
    const { data: existingAudio, error: audioError } = await db
      .from('course_audio')
      .select('text_normalized, role')
      .eq('course_code', courseCode);

    if (audioError) throw audioError;

    // Count by role
    const existingByRole = {
      known: new Set(),
      target1: new Set(),
      target2: new Set()
    };

    for (const audio of (existingAudio || [])) {
      if (existingByRole[audio.role]) {
        existingByRole[audio.role].add(audio.text_normalized);
      }
    }

    // Calculate missing
    let missingKnown = 0;
    let missingTarget1 = 0;
    let missingTarget2 = 0;

    for (const text of knownTexts) {
      if (!existingByRole.known.has(text)) missingKnown++;
    }
    for (const text of targetTexts) {
      if (!existingByRole.target1.has(text)) missingTarget1++;
      if (!existingByRole.target2.has(text)) missingTarget2++;
    }

    const existingCount = existingByRole.known.size + existingByRole.target1.size + existingByRole.target2.size;
    const missing = missingKnown + missingTarget1 + missingTarget2;
    const percentComplete = totalAudioNeeded > 0
      ? Math.round((existingCount / totalAudioNeeded) * 100)
      : 0;

    // Estimate cost (rough: ~100 chars avg per phrase, $0.016 per 1000 chars)
    const estimatedChars = missing * 100;
    const estimatedCost = (estimatedChars / 1000) * 0.016;

    return res.json({
      courseCode,
      displayName: course.display_name,
      status: course.status,
      total: totalAudioNeeded,
      existing: existingCount,
      missing,
      percentComplete,
      uniqueKnownTexts: knownTexts.size,
      uniqueTargetTexts: targetTexts.size,
      breakdown: {
        known: {
          needed: knownTexts.size,
          existing: existingByRole.known.size,
          missing: missingKnown,
          voice: voiceConfig.known || 'not configured'
        },
        target1: {
          needed: targetTexts.size,
          existing: existingByRole.target1.size,
          missing: missingTarget1,
          voice: voiceConfig.target1 || 'not configured'
        },
        target2: {
          needed: targetTexts.size,
          existing: existingByRole.target2.size,
          missing: missingTarget2,
          voice: voiceConfig.target2 || 'not configured'
        }
      },
      languages: {
        known: course.known_lang,
        target: course.target_lang
      },
      voiceConfig,
      estimatedCost: `$${estimatedCost.toFixed(2)}`,
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

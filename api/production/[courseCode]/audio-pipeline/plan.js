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
    // Use lego_cycles view directly - same as learning app
    // This view already JOINs with audio_samples and has audio UUIDs populated
    const { data: legoCycles, error: legoError } = await db
      .from('lego_cycles')
      .select('lego_id, known_audio_uuid, target1_audio_uuid, target2_audio_uuid')
      .eq('course_code', courseCode);

    if (legoError) {
      console.error(`[audio-pipeline/plan] lego_cycles query error:`, legoError);
      throw legoError;
    }

    // Count how many LEGOs have each type of audio
    let withKnownAudio = 0;
    let withTarget1Audio = 0;
    let withTarget2Audio = 0;
    const totalLegos = legoCycles?.length || 0;

    for (const lego of (legoCycles || [])) {
      if (lego.known_audio_uuid) withKnownAudio++;
      if (lego.target1_audio_uuid) withTarget1Audio++;
      if (lego.target2_audio_uuid) withTarget2Audio++;
    }

    // Total audio needed = 3 per LEGO (known + target1 + target2)
    const totalAudioNeeded = totalLegos * 3;
    const existingCount = withKnownAudio + withTarget1Audio + withTarget2Audio;
    const missing = Math.max(0, totalAudioNeeded - existingCount);
    const percentComplete = totalAudioNeeded > 0
      ? Math.round((existingCount / totalAudioNeeded) * 100)
      : 0;

    // Debug: sample first few LEGOs to show audio status
    const sampleLegos = (legoCycles || []).slice(0, 3).map(l => ({
      lego_id: l.lego_id,
      hasKnown: !!l.known_audio_uuid,
      hasTarget1: !!l.target1_audio_uuid,
      hasTarget2: !!l.target2_audio_uuid
    }));

    return res.json({
      courseCode,
      total: totalAudioNeeded,
      existing: existingCount,
      missing: missing,
      totalLegos,
      percentComplete,
      breakdown: {
        known: { needed: totalLegos, existing: withKnownAudio },
        target1: { needed: totalLegos, existing: withTarget1Audio },
        target2: { needed: totalLegos, existing: withTarget2Audio }
      },
      sampleLegos,
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

/**
 * GET /api/production/:courseCode/audio-metadata
 * Returns audio metadata for all samples in a course
 */

import { getCourseAudioSamples, isSupabaseConfigured } from '../../lib/supabase.js';

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

  // Check if Supabase is configured
  if (!isSupabaseConfigured()) {
    return res.json({
      courseCode,
      audio: {},
      message: 'Supabase not configured - audio metadata unavailable'
    });
  }

  try {
    const samples = await getCourseAudioSamples(courseCode);

    // Transform to object keyed by UUID for frontend compatibility
    const audio = {};
    for (const sample of samples) {
      audio[sample.uuid] = {
        text: sample.text,
        lang: sample.lang,
        role: sample.role,
        cadence: sample.cadence,
        voiceId: sample.voice_id,
        duration: sample.duration_ms,
        fileSize: sample.file_size_bytes,
        s3Key: sample.s3_key,
        s3Bucket: sample.s3_bucket,
        source: sample.source,
        ttsEngine: sample.tts_engine,
        createdAt: sample.created_at,
        usedIn: sample.usedIn,
        seedId: sample.seedId,
        legoId: sample.legoId
      };
    }

    res.json({
      courseCode,
      audio,
      totalSamples: samples.length
    });

  } catch (err) {
    console.error(`[Production] Audio metadata fetch failed for ${courseCode}:`, err.message);
    res.status(500).json({
      error: 'Failed to fetch audio metadata',
      message: err.message
    });
  }
}

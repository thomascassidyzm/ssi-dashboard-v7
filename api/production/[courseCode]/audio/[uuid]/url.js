/**
 * GET /api/production/:courseCode/audio/:uuid/url
 * Returns a signed S3 URL for audio playback
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getAudioSample, isSupabaseConfigured } from '../../../../lib/supabase.js';

const S3_BUCKET = process.env.S3_BUCKET || 'popty-bach-lfs';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';

// Initialize S3 client
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { courseCode, uuid } = req.query;

  if (!courseCode || !uuid) {
    return res.status(400).json({ error: 'Course code and UUID are required' });
  }

  try {
    let s3Key;

    // Try to get S3 key from Supabase if configured
    if (isSupabaseConfigured()) {
      const sample = await getAudioSample(uuid);
      if (sample && sample.s3_key) {
        s3Key = sample.s3_key;
      }
    }

    // Fallback to standard path if not found in Supabase
    if (!s3Key) {
      s3Key = `ssiborg-assets/mastered/${uuid}.mp3`;
    }

    // Generate signed URL (valid for 1 hour)
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

    res.json({
      uuid,
      url: signedUrl,
      expiresIn: 3600,
      s3Key
    });

  } catch (err) {
    console.error(`[Production] Audio URL generation failed for ${uuid}:`, err.message);
    res.status(500).json({
      error: 'Failed to generate audio URL',
      message: err.message
    });
  }
}

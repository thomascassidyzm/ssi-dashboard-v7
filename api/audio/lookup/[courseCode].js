/**
 * POST /api/audio/lookup/:courseCode
 * Look up audio UUIDs by text content
 *
 * Uses the audio-index.json from S3 which maps text:role:cadence -> UUID
 * This index is built from the MAR (Master Audio Registry) and contains
 * all generated audio samples.
 *
 * Body: { knownText: string, targetText: string }
 *
 * Returns: {
 *   success: boolean,
 *   audio: {
 *     sourceId: string (UUID for known/source audio),
 *     target1Id: string (UUID for target voice 1),
 *     target2Id: string (UUID for target voice 2)
 *   }
 * }
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const AUDIO_BUCKET = 'ssi-audio-stage';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';

// Cache the audio index (refreshed hourly)
let audioIndexCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// Initialize S3 client
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// Normalize text for lookup (must match build-audio-index.cjs)
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase().trim().replace(/^[,.\s]+|[,.\s]+$/g, '').replace(/\s+/g, ' ');
}

// Build lookup key (must match build-audio-index.cjs)
function buildKey(text, role, cadence = 'natural') {
  const normalized = normalizeText(text);
  return `${normalized}|${role}|${cadence}`;
}

// Load audio index from S3
async function loadAudioIndex() {
  const now = Date.now();

  // Return cached if fresh
  if (audioIndexCache && (now - cacheTimestamp) < CACHE_TTL) {
    return audioIndexCache;
  }

  console.log('[AudioLookup] Loading audio-index.json from S3...');

  const command = new GetObjectCommand({
    Bucket: AUDIO_BUCKET,
    Key: 'audio-index.json'
  });

  const result = await s3.send(command);
  const body = await result.Body.transformToString();
  audioIndexCache = JSON.parse(body);
  cacheTimestamp = now;

  console.log(`[AudioLookup] Loaded ${audioIndexCache.total_samples} samples`);

  return audioIndexCache;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { courseCode } = req.query;
  const { knownText, targetText, cadence = 'natural' } = req.body || {};

  if (!courseCode) {
    return res.status(400).json({ error: 'Course code required' });
  }

  if (!knownText && !targetText) {
    return res.status(400).json({ error: 'At least one of knownText or targetText required' });
  }

  try {
    // Load audio index
    const index = await loadAudioIndex();

    // Look up UUIDs for each role
    const audio = {
      sourceId: null,
      target1Id: null,
      target2Id: null
    };

    // Source (known text in English)
    if (knownText) {
      const sourceKey = buildKey(knownText, 'source', cadence);
      const sourceSample = index.samples[sourceKey];
      if (sourceSample) {
        audio.sourceId = sourceSample.uuid;
      }
    }

    // Target voices
    if (targetText) {
      // Try target1
      const target1Key = buildKey(targetText, 'target1', cadence);
      const target1Sample = index.samples[target1Key];
      if (target1Sample) {
        audio.target1Id = target1Sample.uuid;
      }

      // Try target2
      const target2Key = buildKey(targetText, 'target2', cadence);
      const target2Sample = index.samples[target2Key];
      if (target2Sample) {
        audio.target2Id = target2Sample.uuid;
      } else if (audio.target1Id) {
        // Fall back to target1 if target2 not found
        audio.target2Id = audio.target1Id;
      }
    }

    const hasAudio = !!(audio.sourceId || audio.target1Id);

    console.log(`[AudioLookup] ${courseCode}: known="${knownText?.substring(0, 30)}..." target="${targetText?.substring(0, 30)}..." -> source=${!!audio.sourceId} t1=${!!audio.target1Id} t2=${!!audio.target2Id}`);

    res.json({
      success: hasAudio,
      audio,
      courseCode
    });

  } catch (err) {
    console.error(`[AudioLookup] Error:`, err.message);

    // If index not found, fall back to manifest lookup
    if (err.name === 'NoSuchKey') {
      return res.status(503).json({
        error: 'Audio index not available',
        message: 'Run build-audio-index.cjs --upload to create it'
      });
    }

    res.status(500).json({
      error: 'Failed to lookup audio',
      message: err.message
    });
  }
}

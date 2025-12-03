/**
 * GET /api/audio/stream/:uuid
 * Stream audio file from S3 ssi-audio-stage bucket
 *
 * Audio files are stored as: s3://ssi-audio-stage/mastered/{UUID}.mp3
 * UUIDs encode: voice, language, text, role, cadence metadata
 */

import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const AUDIO_BUCKET = 'ssi-audio-stage';
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
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { uuid } = req.query;

  if (!uuid) {
    return res.status(400).json({ error: 'UUID required' });
  }

  // Validate UUID format (uppercase with hyphens)
  const uuidPattern = /^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i;
  if (!uuidPattern.test(uuid)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }

  const key = `mastered/${uuid.toUpperCase()}.mp3`;

  try {
    if (req.method === 'HEAD') {
      // HEAD request - return metadata only
      const headCommand = new HeadObjectCommand({
        Bucket: AUDIO_BUCKET,
        Key: key
      });
      const headResult = await s3.send(headCommand);

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', headResult.ContentLength);
      res.setHeader('Accept-Ranges', 'bytes');
      return res.status(200).end();
    }

    // GET request - stream audio
    const command = new GetObjectCommand({
      Bucket: AUDIO_BUCKET,
      Key: key
    });

    const result = await s3.send(command);

    // Set response headers
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', result.ContentLength);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year (immutable)

    // Stream the audio data
    const stream = result.Body;

    // Pipe the S3 stream to the response
    for await (const chunk of stream) {
      res.write(chunk);
    }
    res.end();

  } catch (error) {
    if (error.name === 'NoSuchKey' || error.name === 'NotFound') {
      console.log(`[Audio] Not found: ${key}`);
      return res.status(404).json({
        error: 'Audio file not found',
        uuid: uuid
      });
    }

    console.error(`[Audio] Stream error for ${uuid}:`, error.message);
    res.status(500).json({
      error: 'Failed to stream audio',
      message: error.message
    });
  }
}

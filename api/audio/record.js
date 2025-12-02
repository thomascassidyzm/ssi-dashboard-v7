/**
 * POST /api/audio/record
 * Upload a human voice recording
 *
 * Accepts JSON with base64-encoded audio (simpler than multipart)
 * Body: { audio: "base64...", mimeType: "audio/webm", metadata: {...} }
 */

import AWS from 'aws-sdk';
import crypto from 'crypto';

const S3_BUCKET = process.env.S3_BUCKET || 'popty-bach-lfs';
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};

export default async function handler(req, res) {
  console.log('[Recording] Handler called, method:', req.method);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('[Recording] AWS credentials not configured');
      return res.status(500).json({ error: 'Server not configured for uploads' });
    }

    const { audio, mimeType, metadata } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'Missing audio data' });
    }
    if (!metadata) {
      return res.status(400).json({ error: 'Missing metadata' });
    }

    console.log('[Recording] Received:', {
      audioLength: audio.length,
      mimeType,
      text: metadata.text?.slice(0, 50),
      language: metadata.language,
      voiceId: metadata.voiceId
    });

    // Decode base64 to buffer
    const audioBuffer = Buffer.from(audio, 'base64');
    console.log('[Recording] Decoded audio size:', audioBuffer.length, 'bytes');

    // Determine file extension from mime type
    const ext = mimeType?.includes('webm') ? 'webm' :
                mimeType?.includes('mp4') ? 'mp4' :
                mimeType?.includes('ogg') ? 'ogg' : 'webm';

    // Generate key: {text_hash}_{lang}_{role}_{cadence}_{voice_id}.ext
    const textHash = crypto.createHash('md5').update(metadata.text).digest('hex').slice(0, 8);
    const key = `recordings/${textHash}_${metadata.language}_${metadata.role}_${metadata.cadence}_${metadata.voiceId}.${ext}`;

    console.log('[Recording] Uploading to S3:', key);

    // Upload to S3
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: key,
      Body: audioBuffer,
      ContentType: mimeType || 'audio/webm',
      Metadata: {
        text: encodeURIComponent(metadata.text.slice(0, 200)),
        language: metadata.language || '',
        role: metadata.role || '',
        cadence: metadata.cadence || 'normal',
        voiceId: metadata.voiceId || '',
        courseCode: metadata.courseCode || '',
        uuid: metadata.uuid || '',
        recordedAt: new Date().toISOString()
      }
    }).promise();

    const url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/${key}`;

    console.log('[Recording] Success! Key:', key, 'Size:', audioBuffer.length);

    res.json({
      success: true,
      key,
      url,
      size: audioBuffer.length
    });

  } catch (err) {
    console.error('[Recording] Error:', err.message);
    console.error('[Recording] Stack:', err.stack);
    res.status(500).json({
      error: 'Upload failed',
      message: err.message
    });
  }
}

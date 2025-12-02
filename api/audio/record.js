/**
 * POST /api/audio/record
 * Upload a human voice recording
 */

import AWS from 'aws-sdk';
import crypto from 'crypto';
import Busboy from 'busboy';

const S3_BUCKET = process.env.S3_BUCKET || 'popty-bach-lfs';
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

export const config = {
  api: {
    bodyParser: false // Handle multipart form data manually
  }
};

// Parse multipart form data using busboy
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const result = {
      audioBuffer: null,
      metadata: null
    };

    busboy.on('file', (fieldname, file, info) => {
      const chunks = [];
      file.on('data', (chunk) => chunks.push(chunk));
      file.on('end', () => {
        if (fieldname === 'audio') {
          result.audioBuffer = Buffer.concat(chunks);
        }
      });
    });

    busboy.on('field', (fieldname, value) => {
      if (fieldname === 'metadata') {
        try {
          result.metadata = JSON.parse(value);
        } catch (e) {
          // ignore parse errors
        }
      }
    });

    busboy.on('finish', () => resolve(result));
    busboy.on('error', reject);

    req.pipe(busboy);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Parse multipart form data
    const { audioBuffer, metadata } = await parseMultipart(req);

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'Missing audio data' });
    }
    if (!metadata) {
      return res.status(400).json({ error: 'Missing metadata' });
    }

    console.log('[Recording] Received:', {
      audioSize: audioBuffer.length,
      text: metadata.text?.slice(0, 50),
      language: metadata.language,
      voiceId: metadata.voiceId
    });

    // Generate key: {text_hash}_{lang}_{role}_{cadence}_{voice_id}
    const textHash = crypto.createHash('md5').update(metadata.text).digest('hex').slice(0, 8);
    const key = `recordings/${textHash}_${metadata.language}_${metadata.role}_${metadata.cadence}_${metadata.voiceId}.webm`;

    // Upload to S3
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/webm',
      Metadata: {
        text: encodeURIComponent(metadata.text), // Encode for S3 metadata
        language: metadata.language,
        role: metadata.role,
        cadence: metadata.cadence || 'normal',
        voiceId: metadata.voiceId,
        courseCode: metadata.courseCode || '',
        recordedAt: new Date().toISOString()
      }
    }).promise();

    const url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/${key}`;

    console.log('[Recording] Uploaded:', key);

    res.json({
      success: true,
      key,
      url,
      metadata
    });

  } catch (err) {
    console.error('[Recording] Upload failed:', err);
    res.status(500).json({ error: 'Upload failed', message: err.message });
  }
}

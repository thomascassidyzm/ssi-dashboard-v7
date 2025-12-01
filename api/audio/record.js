/**
 * POST /api/audio/record
 * Upload a human voice recording
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
    bodyParser: false // Handle multipart form data manually
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Parse multipart form data (simplified - in production use formidable or multer)
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Extract metadata from boundary (simplified parsing)
    // In production, use proper multipart parser
    const boundary = req.headers['content-type'].split('boundary=')[1];
    const parts = buffer.toString().split(`--${boundary}`);

    let audioBuffer = null;
    let metadata = null;

    // Parse parts (simplified)
    for (const part of parts) {
      if (part.includes('name="metadata"')) {
        const jsonStart = part.indexOf('{');
        const jsonEnd = part.lastIndexOf('}') + 1;
        metadata = JSON.parse(part.slice(jsonStart, jsonEnd));
      }
      if (part.includes('name="audio"')) {
        // Extract binary data after headers
        const dataStart = part.indexOf('\r\n\r\n') + 4;
        audioBuffer = Buffer.from(part.slice(dataStart), 'binary');
      }
    }

    if (!audioBuffer || !metadata) {
      return res.status(400).json({ error: 'Missing audio or metadata' });
    }

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
        text: metadata.text,
        language: metadata.language,
        role: metadata.role,
        voiceId: metadata.voiceId,
        courseCode: metadata.courseCode,
        recordedAt: new Date().toISOString()
      }
    }).promise();

    const url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/${key}`;

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

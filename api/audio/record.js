/**
 * POST /api/audio/record
 * Upload a human voice recording
 */

import AWS from 'aws-sdk';
import crypto from 'crypto';
import Busboy from 'busboy';
import { Readable } from 'stream';

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
          console.log('[Recording] File received:', fieldname, 'size:', result.audioBuffer.length);
        }
      });
    });

    busboy.on('field', (fieldname, value) => {
      console.log('[Recording] Field received:', fieldname);
      if (fieldname === 'metadata') {
        try {
          result.metadata = JSON.parse(value);
        } catch (e) {
          console.error('[Recording] Failed to parse metadata:', e.message);
        }
      }
    });

    busboy.on('finish', () => {
      console.log('[Recording] Busboy finished parsing');
      resolve(result);
    });

    busboy.on('error', (err) => {
      console.error('[Recording] Busboy error:', err);
      reject(err);
    });

    // Handle both streaming and buffered request bodies
    if (req.body) {
      // Vercel buffers the body - convert to stream
      const bodyBuffer = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(req.body);
      const stream = Readable.from(bodyBuffer);
      stream.pipe(busboy);
    } else if (typeof req.pipe === 'function') {
      // Standard Node.js streaming
      req.pipe(busboy);
    } else {
      // Read body manually
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        const stream = Readable.from(bodyBuffer);
        stream.pipe(busboy);
      });
      req.on('error', reject);
    }
  });
}

export default async function handler(req, res) {
  // Log environment check
  console.log('[Recording] Handler called, method:', req.method);
  console.log('[Recording] AWS configured:', !!process.env.AWS_ACCESS_KEY_ID);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const contentType = req.headers['content-type'];
    console.log('[Recording] Content-Type:', contentType);

    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Missing Content-Type', expected: 'multipart/form-data' });
    }

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
    console.log('[Recording] Uploading to S3:', key);
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

    console.log('[Recording] Uploaded successfully:', key);

    res.json({
      success: true,
      key,
      url,
      metadata
    });

  } catch (err) {
    console.error('[Recording] Upload failed:', err.message, err.stack);
    res.status(500).json({ error: 'Upload failed', message: err.message });
  }
}

/**
 * POST /api/audio/record
 * Upload a human voice recording
 *
 * Uses raw body parsing since Vercel's bodyParser: false can be unreliable
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

// Simple multipart parser for our specific use case
function parseMultipartBody(body, boundary) {
  const parts = body.split(boundary);
  const result = { audioBuffer: null, metadata: null };

  for (const part of parts) {
    if (part.includes('name="metadata"')) {
      const jsonMatch = part.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          result.metadata = JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('[Recording] Failed to parse metadata JSON:', e.message);
        }
      }
    }

    if (part.includes('name="audio"')) {
      // Find the start of binary data (after double CRLF)
      const headerEnd = part.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        // Extract binary portion - remove trailing boundary markers
        let binaryPart = part.slice(headerEnd + 4);
        // Remove trailing \r\n-- that precedes next boundary
        if (binaryPart.endsWith('\r\n')) {
          binaryPart = binaryPart.slice(0, -2);
        }
        result.audioBuffer = Buffer.from(binaryPart, 'binary');
      }
    }
  }

  return result;
}

export default async function handler(req, res) {
  console.log('[Recording] Handler called');
  console.log('[Recording] Method:', req.method);
  console.log('[Recording] AWS_ACCESS_KEY_ID set:', !!process.env.AWS_ACCESS_KEY_ID);
  console.log('[Recording] AWS_SECRET_ACCESS_KEY set:', !!process.env.AWS_SECRET_ACCESS_KEY);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const contentType = req.headers['content-type'] || '';
    console.log('[Recording] Content-Type:', contentType);

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        error: 'Invalid Content-Type',
        expected: 'multipart/form-data',
        received: contentType
      });
    }

    // Extract boundary from content-type
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/);
    if (!boundaryMatch) {
      return res.status(400).json({ error: 'Missing boundary in Content-Type' });
    }
    const boundary = '--' + (boundaryMatch[1] || boundaryMatch[2]);
    console.log('[Recording] Boundary:', boundary);

    // Get body - Vercel may provide it as string, buffer, or raw
    let bodyBuffer;
    if (Buffer.isBuffer(req.body)) {
      bodyBuffer = req.body;
    } else if (typeof req.body === 'string') {
      bodyBuffer = Buffer.from(req.body, 'binary');
    } else if (req.body) {
      // Could be parsed JSON or other format
      bodyBuffer = Buffer.from(JSON.stringify(req.body));
    } else {
      // Read raw body
      const chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      bodyBuffer = Buffer.concat(chunks);
    }

    console.log('[Recording] Body size:', bodyBuffer.length);

    if (bodyBuffer.length === 0) {
      return res.status(400).json({ error: 'Empty request body' });
    }

    // Parse multipart
    const bodyString = bodyBuffer.toString('binary');
    const { audioBuffer, metadata } = parseMultipartBody(bodyString, boundary);

    console.log('[Recording] Audio buffer size:', audioBuffer?.length || 0);
    console.log('[Recording] Metadata:', metadata ? JSON.stringify(metadata).slice(0, 100) : 'null');

    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'Missing audio data' });
    }
    if (!metadata) {
      return res.status(400).json({ error: 'Missing metadata' });
    }

    // Generate key
    const textHash = crypto.createHash('md5').update(metadata.text).digest('hex').slice(0, 8);
    const key = `recordings/${textHash}_${metadata.language}_${metadata.role}_${metadata.cadence}_${metadata.voiceId}.webm`;

    console.log('[Recording] Uploading to S3:', key);

    // Upload to S3
    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: key,
      Body: audioBuffer,
      ContentType: 'audio/webm',
      Metadata: {
        text: encodeURIComponent(metadata.text.slice(0, 200)), // S3 metadata limit
        language: metadata.language || '',
        role: metadata.role || '',
        cadence: metadata.cadence || 'normal',
        voiceId: metadata.voiceId || '',
        courseCode: metadata.courseCode || '',
        recordedAt: new Date().toISOString()
      }
    }).promise();

    const url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/${key}`;

    console.log('[Recording] Success! Uploaded:', key);

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
      message: err.message,
      type: err.name
    });
  }
}

/**
 * GET /api/audio/recordings
 * List human voice recordings
 * Query params: language, role, voiceId
 */

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const S3_BUCKET = process.env.S3_BUCKET || 'popty-bach-lfs';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { language, role, voiceId } = req.query;

  try {
    // List all recordings
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: 'recordings/'
    });
    const result = await s3.send(command);

    let recordings = (result.Contents || []).map(obj => {
      // Parse key: recordings/{hash}_{lang}_{role}_{cadence}_{voiceId}.webm
      const parts = obj.Key.replace('recordings/', '').replace('.webm', '').split('_');
      return {
        key: obj.Key,
        textHash: parts[0],
        language: parts[1],
        role: parts[2],
        cadence: parts[3],
        voiceId: parts.slice(4).join('_'), // voiceId may contain underscores
        size: obj.Size,
        lastModified: obj.LastModified,
        url: `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'eu-west-1'}.amazonaws.com/${obj.Key}`
      };
    });

    // Apply filters
    if (language) recordings = recordings.filter(r => r.language === language);
    if (role) recordings = recordings.filter(r => r.role === role);
    if (voiceId) recordings = recordings.filter(r => r.voiceId === voiceId);

    res.json({
      recordings,
      total: recordings.length
    });

  } catch (err) {
    console.error('[Recordings] List failed:', err.message);
    res.status(500).json({ error: 'Failed to list recordings' });
  }
}

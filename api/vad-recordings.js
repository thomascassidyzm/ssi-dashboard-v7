/**
 * /api/vad-recordings — the VAD Lab's record-yourself calibration corpus.
 *
 * Private admin surface (no learner exposure). Recordings made in the lab
 * (src/views/admin/VadLab.vue) are stored with language + self-rated
 * proficiency tags as input to the CEFR variance-band calibration work
 * (docs/course-optimization/prosody-lab-poc.md, open questions).
 *
 * Storage: s3://ssi-audio-stage/vad-lab/recordings/<id>/
 *   audio.part-NN  — raw audio bytes, chunked
 *   meta.json      — tags + client-side features/scores + part list
 *
 * Uploads are CHUNKED (~32 KB per POST) for the same reason lab-data ships
 * as part-files: some networks (Tom's, 2026-07-28) corrupt HTTPS uploads
 * over ~50 KB, and the founder records from his phone.
 *
 * POST {action:'chunk', id, index, data}        — data = base64 of that chunk's bytes
 * POST {action:'finalize', id, parts, mime, meta} — writes meta.json after verifying parts
 * GET  ?action=list                              — all meta.json payloads, newest first
 * GET  ?action=audio&id=<id>                     — reassembled audio stream
 */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';

const S3_BUCKET = process.env.S3_BUCKET || 'ssi-audio-stage';
const AWS_REGION = process.env.AWS_REGION || 'eu-west-1';
const PREFIX = 'vad-lab/recordings/';

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const config = {
  api: { bodyParser: { sizeLimit: '256kb' } },
};

const SAFE_ID = /^[a-z0-9-]{8,64}$/;

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

async function listMetaKeys() {
  const keys = [];
  let token;
  do {
    const out = await s3.send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        Prefix: PREFIX,
        ContinuationToken: token,
      })
    );
    for (const o of out.Contents || []) {
      if (o.Key.endsWith('/meta.json')) keys.push(o.Key);
    }
    token = out.IsTruncated ? out.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { action, id } = req.query;

      if (action === 'list') {
        const keys = await listMetaKeys();
        const metas = await Promise.all(
          keys.map(async (Key) => {
            try {
              const out = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key }));
              return JSON.parse((await streamToBuffer(out.Body)).toString('utf8'));
            } catch {
              return null;
            }
          })
        );
        const list = metas
          .filter(Boolean)
          .sort((a, b) => (b.created || '').localeCompare(a.created || ''));
        return res.status(200).json({ recordings: list });
      }

      if (action === 'audio') {
        if (!SAFE_ID.test(id || '')) return res.status(400).json({ error: 'bad id' });
        const metaOut = await s3.send(
          new GetObjectCommand({ Bucket: S3_BUCKET, Key: `${PREFIX}${id}/meta.json` })
        );
        const meta = JSON.parse((await streamToBuffer(metaOut.Body)).toString('utf8'));
        const parts = await Promise.all(
          Array.from({ length: meta.parts }, (_, i) =>
            s3
              .send(
                new GetObjectCommand({
                  Bucket: S3_BUCKET,
                  Key: `${PREFIX}${id}/audio.part-${String(i).padStart(2, '0')}`,
                })
              )
              .then((o) => streamToBuffer(o.Body))
          )
        );
        const audio = Buffer.concat(parts);
        res.setHeader('Content-Type', meta.mime || 'audio/mp4');
        res.setHeader('Content-Length', audio.length);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.status(200).send(audio);
      }

      return res.status(400).json({ error: 'unknown action' });
    }

    if (req.method === 'POST') {
      const { action, id } = req.body || {};
      if (!SAFE_ID.test(id || '')) return res.status(400).json({ error: 'bad id' });

      if (action === 'chunk') {
        const { index, data } = req.body;
        if (!Number.isInteger(index) || index < 0 || index > 999 || typeof data !== 'string') {
          return res.status(400).json({ error: 'bad chunk' });
        }
        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: `${PREFIX}${id}/audio.part-${String(index).padStart(2, '0')}`,
            Body: Buffer.from(data, 'base64'),
            ContentType: 'application/octet-stream',
          })
        );
        return res.status(200).json({ ok: true, index });
      }

      if (action === 'finalize') {
        const { parts, mime, meta } = req.body;
        if (!Number.isInteger(parts) || parts < 1 || parts > 999) {
          return res.status(400).json({ error: 'bad parts count' });
        }
        // verify every part actually landed (a corrupted upload aborts client-side,
        // but never trust the happy path)
        const listed = await s3.send(
          new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: `${PREFIX}${id}/audio.part-` })
        );
        const have = new Set((listed.Contents || []).map((o) => o.Key));
        const missing = [];
        for (let i = 0; i < parts; i++) {
          const k = `${PREFIX}${id}/audio.part-${String(i).padStart(2, '0')}`;
          if (!have.has(k)) missing.push(i);
        }
        if (missing.length) return res.status(409).json({ error: 'missing parts', missing });

        const record = {
          id,
          created: new Date().toISOString(),
          parts,
          mime: typeof mime === 'string' ? mime.slice(0, 64) : 'audio/mp4',
          ...(typeof meta === 'object' && meta ? meta : {}),
        };
        await s3.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: `${PREFIX}${id}/meta.json`,
            Body: JSON.stringify(record),
            ContentType: 'application/json',
          })
        );
        return res.status(200).json({ ok: true, id });
      }

      return res.status(400).json({ error: 'unknown action' });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('[vad-recordings]', err);
    return res.status(500).json({ error: err.message });
  }
}

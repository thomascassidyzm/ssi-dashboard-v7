#!/usr/bin/env node
// Download one nightly SSi DB dump from the private backup bucket (written by ~/ssi-backups/bin/ssi-db-dump.sh).
//   node tools/qa-copy/fetch-dump.cjs <key> <out-file>      (AWS creds + region from env, as ssi-db-upload.cjs)
// Verifies the byte count against S3 so a truncated download never reaches pg_restore.
const path = require('path');
const fs = require('fs');
const { pipeline } = require('stream/promises');
const SDK = process.env.SSI_NODE_MODULES || '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/node_modules';
const { S3Client, GetObjectCommand } = require(path.join(SDK, '@aws-sdk/client-s3'));
(async () => {
  const [Key, out] = process.argv.slice(2);
  if (!Key || !out) throw new Error('usage: fetch-dump.cjs <key> <out-file>');
  const c = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
  const r = await c.send(new GetObjectCommand({ Bucket: process.env.SSI_BACKUP_BUCKET || 'ssi-db-backups-popty', Key }));
  await pipeline(r.Body, fs.createWriteStream(out));
  const got = fs.statSync(out).size;
  if (got !== r.ContentLength) throw new Error(`size mismatch: s3 ${r.ContentLength} vs local ${got}`);
  console.log(JSON.stringify({ key: Key, bytes: got }));
})().catch((e) => { console.error('fetch-dump failed:', e.message); process.exit(1); });

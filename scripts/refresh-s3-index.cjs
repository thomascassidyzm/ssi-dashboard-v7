#!/usr/bin/env node

/**
 * Refresh S3 Audio Index
 *
 * Downloads a listing of all audio files from S3 and saves as a local JSON index.
 * This allows the plan endpoint to check file existence instantly instead of
 * making 60k+ individual S3 HEAD requests.
 *
 * Usage:
 *   node scripts/refresh-s3-index.cjs
 *
 * Output:
 *   temp/s3-audio-index.json - Set of all UUIDs in S3
 */

require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const INDEX_PATH = path.join(__dirname, '../temp/s3-audio-index.json');
const BUCKET = 'ssi-audio-stage';
const PREFIX = 'mastered/';

async function refreshIndex() {
  console.log('Refreshing S3 audio index...');
  console.log(`Bucket: s3://${BUCKET}/${PREFIX}`);

  const startTime = Date.now();

  try {
    // Use AWS CLI to list all files (much faster than SDK for large listings)
    console.log('Fetching file list from S3...');

    const awsCmd = `aws s3 ls s3://${BUCKET}/${PREFIX} --recursive`;
    const output = execSync(awsCmd, {
      encoding: 'utf8',
      maxBuffer: 100 * 1024 * 1024, // 100MB buffer for large listings
      env: {
        ...process.env,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: process.env.AWS_REGION || 'eu-west-1'
      }
    });

    // Parse output: each line is "date time size key"
    // We only need the UUID (filename without .mp3)
    const lines = output.trim().split('\n').filter(l => l);
    console.log(`Found ${lines.length} files in S3`);

    const uuids = [];
    for (const line of lines) {
      // Line format: "2024-01-01 12:00:00     12345 mastered/UUID.mp3"
      const match = line.match(/mastered\/([A-F0-9-]+)\.mp3$/i);
      if (match) {
        uuids.push(match[1].toUpperCase());
      }
    }

    console.log(`Extracted ${uuids.length} UUIDs`);

    // Save index
    const index = {
      timestamp: new Date().toISOString(),
      bucket: BUCKET,
      prefix: PREFIX,
      count: uuids.length,
      uuids: uuids
    };

    await fs.ensureDir(path.dirname(INDEX_PATH));
    await fs.writeJson(INDEX_PATH, index);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✓ Index saved to ${INDEX_PATH}`);
    console.log(`  ${uuids.length} UUIDs indexed in ${elapsed}s`);

    return index;

  } catch (error) {
    console.error('Failed to refresh S3 index:', error.message);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  refreshIndex()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { refreshIndex, INDEX_PATH };

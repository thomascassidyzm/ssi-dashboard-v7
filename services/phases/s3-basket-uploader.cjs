/**
 * S3 Basket Uploader
 *
 * Simple utility for agents to upload Phase 5 baskets directly to S3
 * instead of going through GitHub branches.
 *
 * Usage from agent:
 *   const uploader = require('./s3-basket-uploader.cjs');
 *   await uploader.uploadBasket('cmn_for_eng', 'S0532', basketData);
 */

const AWS = require('aws-sdk');
require('dotenv').config();

// Configure S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

const BUCKET = process.env.S3_BUCKET || 'popty-bach-lfs';

/**
 * Upload a basket file to S3
 * @param {string} courseCode - e.g. 'cmn_for_eng'
 * @param {string} seedId - e.g. 'S0532'
 * @param {object} basketData - The basket object: { S0532L01: {...}, S0532L02: {...} }
 * @returns {Promise<string>} - S3 URL of uploaded file
 */
async function uploadBasket(courseCode, seedId, basketData) {
  const key = `phase5-baskets/${courseCode}/seed_${seedId}_baskets.json`;

  console.log(`📤 Uploading ${seedId} baskets to S3...`);

  const params = {
    Bucket: BUCKET,
    Key: key,
    Body: JSON.stringify(basketData, null, 2),
    ContentType: 'application/json',
    Metadata: {
      'uploaded-at': new Date().toISOString(),
      'seed-id': seedId,
      'course': courseCode
    }
  };

  try {
    await s3.putObject(params).promise();
    const url = `s3://${BUCKET}/${key}`;
    console.log(`✅ Uploaded to ${url}`);
    return url;
  } catch (error) {
    console.error(`❌ Upload failed:`, error.message);
    throw error;
  }
}

/**
 * List all baskets for a course
 * @param {string} courseCode - e.g. 'cmn_for_eng'
 * @returns {Promise<Array>} - List of basket file keys
 */
async function listBaskets(courseCode) {
  const params = {
    Bucket: BUCKET,
    Prefix: `phase5-baskets/${courseCode}/`
  };

  try {
    const response = await s3.listObjectsV2(params).promise();
    return response.Contents || [];
  } catch (error) {
    console.error(`❌ List failed:`, error.message);
    throw error;
  }
}

/**
 * Download a basket file from S3
 * @param {string} courseCode - e.g. 'cmn_for_eng'
 * @param {string} seedId - e.g. 'S0532'
 * @returns {Promise<object>} - The basket data
 */
async function downloadBasket(courseCode, seedId) {
  const key = `phase5-baskets/${courseCode}/seed_${seedId}_baskets.json`;

  try {
    const response = await s3.getObject({
      Bucket: BUCKET,
      Key: key
    }).promise();

    return JSON.parse(response.Body.toString('utf-8'));
  } catch (error) {
    if (error.code === 'NoSuchKey') {
      return null; // Basket doesn't exist
    }
    console.error(`❌ Download failed:`, error.message);
    throw error;
  }
}

/**
 * Download all baskets for a course and merge into lego_baskets.json format
 * @param {string} courseCode - e.g. 'cmn_for_eng'
 * @returns {Promise<object>} - Merged baskets: { metadata, baskets }
 */
async function downloadAllBaskets(courseCode) {
  console.log(`📥 Downloading all baskets for ${courseCode}...`);

  const files = await listBaskets(courseCode);
  console.log(`Found ${files.length} basket files in S3`);

  const mergedBaskets = {};
  let downloadedCount = 0;

  for (const file of files) {
    try {
      const response = await s3.getObject({
        Bucket: BUCKET,
        Key: file.Key
      }).promise();

      const basketData = JSON.parse(response.Body.toString('utf-8'));

      // Merge baskets
      for (const [legoId, basket] of Object.entries(basketData)) {
        mergedBaskets[legoId] = basket;
      }

      downloadedCount++;
    } catch (error) {
      console.error(`⚠️  Failed to download ${file.Key}:`, error.message);
    }
  }

  console.log(`✅ Downloaded ${downloadedCount} files, merged ${Object.keys(mergedBaskets).length} baskets`);

  return {
    metadata: {
      last_merged: new Date().toISOString(),
      total_baskets: Object.keys(mergedBaskets).length,
      source: 's3',
      files_merged: downloadedCount
    },
    baskets: mergedBaskets
  };
}

/**
 * Test the S3 connection
 */
async function testConnection() {
  console.log('Testing S3 connection...');
  console.log('Bucket:', BUCKET);
  console.log('Region:', process.env.AWS_REGION || 'eu-west-1');
  console.log('Access Key:', process.env.AWS_ACCESS_KEY_ID ? process.env.AWS_ACCESS_KEY_ID.substring(0, 8) + '...' : 'NOT SET');

  try {
    await s3.headBucket({ Bucket: BUCKET }).promise();
    console.log(`✅ S3 connection successful (bucket: ${BUCKET})`);
    return true;
  } catch (error) {
    console.error(`❌ S3 connection failed:`, error);
    return false;
  }
}

module.exports = {
  uploadBasket,
  listBaskets,
  downloadBasket,
  downloadAllBaskets,
  testConnection
};

// CLI usage
if (require.main === module) {
  const command = process.argv[2];
  const courseCode = process.argv[3];

  if (command === 'test') {
    testConnection();
  } else if (command === 'list' && courseCode) {
    listBaskets(courseCode).then(files => {
      console.log(`Found ${files.length} basket files:`);
      files.forEach(f => console.log(`  - ${f.Key}`));
    });
  } else if (command === 'download' && courseCode) {
    downloadAllBaskets(courseCode).then(result => {
      console.log(`Downloaded ${result.metadata.total_baskets} baskets`);
    });
  } else {
    console.log('Usage:');
    console.log('  node s3-basket-uploader.cjs test');
    console.log('  node s3-basket-uploader.cjs list <courseCode>');
    console.log('  node s3-basket-uploader.cjs download <courseCode>');
  }
}

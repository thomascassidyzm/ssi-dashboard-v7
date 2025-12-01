/**
 * Initialize Auth Users in S3
 * Run this once to create the initial users.json in S3
 *
 * Usage:
 *   node scripts/init-auth-users.js
 *
 * This will upload the users.json to S3 at: popty-bach-lfs/auth/users.json
 */

import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();

const S3_BUCKET = process.env.S3_BUCKET || 'popty-bach-lfs';
const AUTH_PREFIX = 'auth/';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-west-1'
});

const users = {
  users: {
    "kai@ssi.org": {
      name: "Kai",
      role: "admin",
      courses: "*"
    },
    "tom@ssi.org": {
      name: "Tom",
      role: "admin",
      courses: "*"
    }
  }
};

async function initUsers() {
  try {
    console.log('[Init] Uploading users.json to S3...');
    console.log(`[Init] Bucket: ${S3_BUCKET}`);
    console.log(`[Init] Key: ${AUTH_PREFIX}users.json`);
    console.log(`[Init] Users:`, Object.keys(users.users));

    await s3.putObject({
      Bucket: S3_BUCKET,
      Key: `${AUTH_PREFIX}users.json`,
      Body: JSON.stringify(users, null, 2),
      ContentType: 'application/json'
    }).promise();

    console.log('[Init] Successfully uploaded users.json to S3!');
    console.log('[Init] Users configured:');
    for (const [email, user] of Object.entries(users.users)) {
      console.log(`  - ${email}: ${user.name} (${user.role})`);
    }
  } catch (error) {
    console.error('[Init] Error uploading users.json:', error);
    process.exit(1);
  }
}

// Run the initialization
initUsers();

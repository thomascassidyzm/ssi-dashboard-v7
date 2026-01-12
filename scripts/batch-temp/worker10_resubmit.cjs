#!/usr/bin/env node

/**
 * Worker 10 Resubmission Script
 * Generates and uploads practice phrases for S0120L04 and S0121L01
 */

const https = require('https');
const http = require('http');

const ENDPOINT = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';
const COURSE = 'zho_for_eng';

// LEGO definitions
const LEGOS = {
  'S0120L04': {
    seed: 'S0120',
    lego_id: 'S0120L04',
    type: 'M-type',
    known: 'you like to go by bus',
    target: '你喜欢坐公交车'
  },
  'S0121L01': {
    seed: 'S0121',
    lego_id: 'S0121L01',
    type: 'A-type',
    known: 'car',
    target: '车'
  }
};

// Practice phrases for S0120L04 (M-type: "you like to go by bus")
const S0120L04_PHRASES = [
  // Basic (2 phrases)
  { known: "you like to go by bus", target: "你喜欢坐公交车" },
  { known: "do you like to go by bus?", target: "你喜欢坐公交车吗？" },

  // Intermediate (2 phrases)
  { known: "you like to go by bus every day", target: "你喜欢每天坐公交车" },
  { known: "you don't like to go by bus", target: "你不喜欢坐公交车" },

  // Advanced (2 phrases)
  { known: "you like to go by bus to work", target: "你喜欢坐公交车去上班" },
  { known: "you like to go by bus in the morning", target: "你喜欢早上坐公交车" },

  // Complex (4 phrases)
  { known: "you like to go by bus because it's convenient", target: "你喜欢坐公交车因为很方便" },
  { known: "you like to go by bus but I don't", target: "你喜欢坐公交车但我不喜欢" },
  { known: "you like to go by bus when it rains", target: "你喜欢下雨的时候坐公交车" },
  { known: "you like to go by bus more than by taxi", target: "你喜欢坐公交车多过坐出租车" }
];

// Practice phrases for S0121L01 (A-type: "car")
const S0121L01_PHRASES = [
  // Basic (2 phrases)
  { known: "car", target: "车" },
  { known: "this is a car", target: "这是车" },

  // Intermediate (2 phrases)
  { known: "I have a car", target: "我有车" },
  { known: "do you have a car?", target: "你有车吗？" },

  // Advanced (2 phrases)
  { known: "I like this car", target: "我喜欢这辆车" },
  { known: "this car is very good", target: "这辆车很好" },

  // Complex (4 phrases)
  { known: "I want to buy a car", target: "我想买车" },
  { known: "his car is very expensive", target: "他的车很贵" },
  { known: "I go to work by car", target: "我开车去上班" },
  { known: "this car is bigger than that car", target: "这辆车比那辆车大" }
];

/**
 * Upload basket to endpoint with retry logic
 */
async function uploadBasket(seed, legoId, phrases) {
  const payload = {
    course: COURSE,
    seed: seed,
    baskets: {
      [legoId]: {
        lego_id: legoId,
        practice_phrases: phrases
      }
    }
  };

  const postData = JSON.stringify(payload);

  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(ENDPOINT);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, statusCode: res.statusCode, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Upload with retry logic
 */
async function uploadWithRetry(seed, legoId, phrases, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n📤 Uploading ${legoId} (attempt ${attempt}/${maxRetries})...`);
      const result = await uploadBasket(seed, legoId, phrases);
      console.log(`✅ ${legoId} uploaded successfully (HTTP ${result.statusCode})`);
      return result;
    } catch (error) {
      console.error(`❌ ${legoId} upload failed (attempt ${attempt}/${maxRetries}): ${error.message}`);
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`⏳ Waiting ${waitTime/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Worker 10 Resubmission');
  console.log('==========================');
  console.log(`Course: ${COURSE}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`LEGOs to process: 2`);

  const results = {
    success: [],
    failed: []
  };

  // Upload S0120L04
  try {
    await uploadWithRetry('S0120', 'S0120L04', S0120L04_PHRASES);
    results.success.push('S0120L04');
  } catch (error) {
    console.error(`\n❌ FAILED: S0120L04 - ${error.message}`);
    results.failed.push('S0120L04');
  }

  // Upload S0121L01
  try {
    await uploadWithRetry('S0121', 'S0121L01', S0121L01_PHRASES);
    results.success.push('S0121L01');
  } catch (error) {
    console.error(`\n❌ FAILED: S0121L01 - ${error.message}`);
    results.failed.push('S0121L01');
  }

  // Summary
  console.log('\n📊 Upload Summary');
  console.log('==================');
  console.log(`✅ Successful: ${results.success.length}/${Object.keys(LEGOS).length}`);
  if (results.success.length > 0) {
    console.log(`   - ${results.success.join(', ')}`);
  }

  if (results.failed.length > 0) {
    console.log(`❌ Failed: ${results.failed.length}/${Object.keys(LEGOS).length}`);
    console.log(`   - ${results.failed.join(', ')}`);
    process.exit(1);
  } else {
    console.log('\n✅ Worker 10 resubmitted: 2 LEGOs');
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

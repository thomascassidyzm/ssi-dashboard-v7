#!/usr/bin/env node

/**
 * Worker 12 Resubmission Script
 * LEGOs: S0121L05, S0121L06
 * Endpoint: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket
 */

const https = require('https');

const ENDPOINT = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';
const COURSE = 'zho_for_eng';
const SEED = 'S0121';

// LEGO Data
const LEGOS = {
  'S0121L05': {
    lego_id: 'S0121L05',
    type: 'A-type',
    known: 'use',
    target: '用',
    practice_phrases: [
      // Level 1: Simple (2 phrases)
      { known: "I use it", target: "我用它" },
      { known: "you use it", target: "你用它" },

      // Level 2: Medium (2 phrases)
      { known: "I want to use it", target: "我想用它" },
      { known: "I don't want to use that", target: "我不想用那个" },

      // Level 3: Complex (2 phrases)
      { known: "I like to use this", target: "我喜欢用这个" },
      { known: "you don't like to use it", target: "你不喜欢用它" },

      // Level 4: Advanced (4 phrases)
      { known: "I want to use your car", target: "我想用你的车" },
      { known: "I don't like to use it", target: "我不喜欢用它" },
      { known: "do you want to use this?", target: "你想用这个吗?" },
      { known: "I like to use it", target: "我喜欢用它" }
    ]
  },
  'S0121L06': {
    lego_id: 'S0121L06',
    type: 'M-type',
    known: "don't like to use your car",
    target: '不喜欢用你的车',
    practice_phrases: [
      // Level 1: Simple (2 phrases)
      { known: "I don't like to use your car", target: "我不喜欢用你的车" },
      { known: "you don't like to use your car", target: "你不喜欢用你的车" },

      // Level 2: Medium (2 phrases)
      { known: "I don't like to use your car today", target: "我今天不喜欢用你的车" },
      { known: "do you like to use your car?", target: "你喜欢用你的车吗?" },

      // Level 3: Complex (2 phrases)
      { known: "I don't like to use your car at work", target: "我不喜欢在工作时用你的车" },
      { known: "you don't like to use your car here", target: "你不喜欢在这里用你的车" },

      // Level 4: Advanced (4 phrases)
      { known: "I don't want to use your car", target: "我不想用你的车" },
      { known: "why don't you like to use your car?", target: "你为什么不喜欢用你的车?" },
      { known: "I really don't like to use your car", target: "我真的不喜欢用你的车" },
      { known: "I don't like to use your car much", target: "我不太喜欢用你的车" }
    ]
  }
};

/**
 * Upload basket with retry logic
 */
async function uploadBasket(legoId, basketData) {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      attempt++;
      console.log(`\n[${legoId}] Upload attempt ${attempt}/${maxRetries}...`);

      const result = await makeRequest(basketData);
      console.log(`✅ [${legoId}] Upload successful!`);
      console.log(`   Response:`, JSON.stringify(result, null, 2));
      return result;

    } catch (error) {
      console.error(`❌ [${legoId}] Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        const delay = attempt * 2000; // 2s, 4s
        console.log(`   Retrying in ${delay/1000}s...`);
        await sleep(delay);
      } else {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }
    }
  }
}

/**
 * Make HTTPS POST request
 */
function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const url = new URL(ENDPOINT);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseBody = '';

      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(responseBody);
            resolve(parsed);
          } catch (e) {
            resolve({ raw: responseBody });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseBody}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Worker 12 Resubmission Starting...');
  console.log(`   Course: ${COURSE}`);
  console.log(`   Seed: ${SEED}`);
  console.log(`   LEGOs: S0121L05, S0121L06`);
  console.log(`   Endpoint: ${ENDPOINT}\n`);

  const results = [];

  for (const [legoId, legoData] of Object.entries(LEGOS)) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing ${legoId} (${legoData.type})`);
    console.log(`Known: "${legoData.known}"`);
    console.log(`Target: "${legoData.target}"`);
    console.log(`Practice phrases: ${legoData.practice_phrases.length}`);
    console.log('='.repeat(60));

    const payload = {
      course: COURSE,
      seed: SEED,
      baskets: {
        [legoId]: {
          lego_id: legoId,
          practice_phrases: legoData.practice_phrases
        }
      }
    };

    try {
      const result = await uploadBasket(legoId, payload);
      results.push({ legoId, status: 'success', result });
    } catch (error) {
      console.error(`\n❌ [${legoId}] FAILED:`, error.message);
      results.push({ legoId, status: 'failed', error: error.message });
    }

    // Delay between LEGOs
    if (legoId !== 'S0121L06') {
      console.log('\n⏳ Waiting 2s before next LEGO...');
      await sleep(2000);
    }
  }

  // Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;

  results.forEach(r => {
    const icon = r.status === 'success' ? '✅' : '❌';
    console.log(`${icon} ${r.legoId}: ${r.status.toUpperCase()}`);
  });

  console.log(`\nTotal: ${successful} succeeded, ${failed} failed`);

  if (failed === 0) {
    console.log('\n✅ Worker 12 resubmitted: 2 LEGOs');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some uploads failed - review logs above');
    process.exit(1);
  }
}

// Execute
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

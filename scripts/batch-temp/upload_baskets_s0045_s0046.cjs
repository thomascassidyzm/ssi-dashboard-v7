#!/usr/bin/env node

/**
 * Upload baskets for S0045L04 and S0046L02 with retry logic
 */

const https = require('https');
const fs = require('fs');

const API_BASE = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadBasket(basketFile, legoId) {
  const basketData = JSON.parse(fs.readFileSync(basketFile, 'utf8'));

  console.log(`\n📤 Uploading ${legoId}...`);
  console.log(`   Seed: ${basketData.seed}`);
  console.log(`   Phrases: ${basketData.baskets[legoId].practice_phrases.length}`);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await makeRequest('/upload-basket', basketData);
      console.log(`✅ Upload successful (attempt ${attempt}/${MAX_RETRIES})`);
      console.log(`   Response:`, JSON.stringify(result, null, 2));
      return result;
    } catch (error) {
      console.log(`❌ Attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);

      if (attempt < MAX_RETRIES) {
        console.log(`   Retrying in ${RETRY_DELAY/1000}s...`);
        await sleep(RETRY_DELAY);
      } else {
        console.log(`   All retries exhausted for ${legoId}`);
        throw error;
      }
    }
  }
}

function makeRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'mirthlessly-nonanesthetized-marilyn.ngrok-free.dev',
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'ngrok-skip-browser-warning': 'true'
      },
      rejectUnauthorized: false
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            resolve({ raw: responseData });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
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

async function main() {
  console.log('🚀 Starting basket upload process...\n');
  console.log('Target endpoint:', `${API_BASE}/upload-basket`);

  const results = {
    success: [],
    failed: []
  };

  // Upload S0045L04
  try {
    await uploadBasket('/tmp/s0045_basket.json', 'S0045L04');
    results.success.push('S0045L04');
  } catch (error) {
    results.failed.push({ lego: 'S0045L04', error: error.message });
  }

  // Upload S0046L02
  try {
    await uploadBasket('/tmp/s0046_basket.json', 'S0046L02');
    results.success.push('S0046L02');
  } catch (error) {
    results.failed.push({ lego: 'S0046L02', error: error.message });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 UPLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${results.success.length}`);
  results.success.forEach(lego => console.log(`   - ${lego}`));

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(item => {
      console.log(`   - ${item.lego}: ${item.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All baskets uploaded successfully!');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

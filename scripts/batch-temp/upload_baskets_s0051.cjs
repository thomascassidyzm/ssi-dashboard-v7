#!/usr/bin/env node

/**
 * Upload baskets for S0051L03 and S0051L04 to the endpoint
 * With retry logic and error handling
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ENDPOINT = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function uploadBasket(basketPath, legoId, attempt = 1) {
  const basketData = JSON.parse(fs.readFileSync(basketPath, 'utf8'));
  const postData = JSON.stringify(basketData);

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'ngrok-skip-browser-warning': 'true'
      },
      rejectUnauthorized: false // Allow self-signed certs for ngrok
    };

    const req = https.request(ENDPOINT, options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✓ ${legoId} uploaded successfully (attempt ${attempt})`);
          console.log(`  Response: ${responseData}`);
          resolve({ success: true, data: responseData });
        } else {
          console.log(`✗ ${legoId} failed with status ${res.statusCode} (attempt ${attempt})`);
          console.log(`  Response: ${responseData}`);
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      console.log(`✗ ${legoId} request error (attempt ${attempt}): ${error.message}`);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function uploadWithRetry(basketPath, legoId) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await uploadBasket(basketPath, legoId, attempt);
      return result;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        console.log(`  Retrying in ${RETRY_DELAY/1000} seconds...`);
        await sleep(RETRY_DELAY);
      } else {
        console.log(`  Failed after ${MAX_RETRIES} attempts`);
        throw error;
      }
    }
  }
}

async function main() {
  const baskets = [
    { path: path.join(__dirname, 'basket_s0051l03.json'), id: 'S0051L03' },
    { path: path.join(__dirname, 'basket_s0051l04.json'), id: 'S0051L04' }
  ];

  console.log('Starting basket uploads...\n');

  const results = [];
  for (const basket of baskets) {
    console.log(`Uploading ${basket.id}...`);
    try {
      const result = await uploadWithRetry(basket.path, basket.id);
      results.push({ id: basket.id, success: true, result });
    } catch (error) {
      results.push({ id: basket.id, success: false, error: error.message });
    }
    console.log(''); // Blank line between uploads
  }

  // Summary
  console.log('\n=== UPLOAD SUMMARY ===');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nSuccessful: ${successful.length}/${results.length}`);
  successful.forEach(r => {
    console.log(`  ✓ ${r.id}`);
  });

  if (failed.length > 0) {
    console.log(`\nFailed: ${failed.length}/${results.length}`);
    failed.forEach(r => {
      console.log(`  ✗ ${r.id}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✓ All baskets uploaded successfully!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

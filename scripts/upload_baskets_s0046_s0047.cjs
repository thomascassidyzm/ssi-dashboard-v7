const fs = require('fs');
const path = require('path');
const https = require('https');

const ENDPOINT = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Read generated baskets
const baskets = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'practice_phrases_s0046_s0047.json'),
  'utf8'
));

// Helper function to make HTTP POST request
function postJSON(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'ngrok-skip-browser-warning': 'true'
      },
      rejectUnauthorized: false // Allow self-signed certs for ngrok
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, body: body });
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (error) => reject(error));
    req.write(postData);
    req.end();
  });
}

// Helper function to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Upload basket with retry logic
async function uploadBasket(legoId, basketData, seedId) {
  const payload = {
    course: "zho_for_eng",
    seed: seedId,
    baskets: {
      [legoId]: basketData
    }
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`\n[${legoId}] Attempt ${attempt}/${MAX_RETRIES}...`);
      const result = await postJSON(ENDPOINT, payload);
      console.log(`[${legoId}] ✓ Success! Status: ${result.status}`);
      console.log(`[${legoId}] Response:`, JSON.stringify(result.body, null, 2));
      return result;
    } catch (error) {
      console.log(`[${legoId}] ✗ Attempt ${attempt} failed: ${error.message}`);

      if (attempt < MAX_RETRIES) {
        console.log(`[${legoId}] Retrying in ${RETRY_DELAY/1000} seconds...`);
        await sleep(RETRY_DELAY);
      } else {
        console.log(`[${legoId}] ✗ Failed after ${MAX_RETRIES} attempts`);
        throw error;
      }
    }
  }
}

// Main execution
async function main() {
  console.log('========================================');
  console.log('UPLOADING BASKETS TO ENDPOINT');
  console.log('========================================');
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Course: zho_for_eng`);
  console.log(`LEGOs to upload: S0046L03, S0047L01`);

  const results = {
    success: [],
    failed: []
  };

  // Upload S0046L03
  try {
    await uploadBasket('S0046L03', baskets.S0046L03, 'S0046');
    results.success.push('S0046L03');
  } catch (error) {
    results.failed.push({ lego: 'S0046L03', error: error.message });
  }

  // Upload S0047L01
  try {
    await uploadBasket('S0047L01', baskets.S0047L01, 'S0047');
    results.success.push('S0047L01');
  } catch (error) {
    results.failed.push({ lego: 'S0047L01', error: error.message });
  }

  // Summary
  console.log('\n========================================');
  console.log('UPLOAD SUMMARY');
  console.log('========================================');
  console.log(`✓ Successful: ${results.success.length}`);
  if (results.success.length > 0) {
    results.success.forEach(lego => console.log(`  - ${lego}`));
  }

  console.log(`✗ Failed: ${results.failed.length}`);
  if (results.failed.length > 0) {
    results.failed.forEach(item => console.log(`  - ${item.lego}: ${item.error}`));
  }

  console.log('========================================');

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

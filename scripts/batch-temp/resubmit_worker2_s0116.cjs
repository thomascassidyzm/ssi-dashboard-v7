#!/usr/bin/env node

/**
 * Resubmit Worker 2 Baskets - S0116L02, S0116L03
 * Generate practice phrases and upload to ngrok endpoint
 */

const https = require('https');
const http = require('http');

const ENDPOINT = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';
const COURSE = 'zho_for_eng';

// LEGO definitions
const LEGOS = {
  'S0116L02': {
    lego_id: 'S0116L02',
    known: 'the best choice',
    target: '最好的选择',
    type: 'A-type'
  },
  'S0116L03': {
    lego_id: 'S0116L03',
    known: 'I could make',
    target: '我能做出的',
    type: 'A-type'
  }
};

// Practice phrases for S0116L02 (the best choice / 最好的选择)
const S0116L02_PHRASES = [
  // First 2: Simple usage
  { known: "That's the best choice", target: "那是最好的选择" },
  { known: "This is the best choice for you", target: "这是你最好的选择" },

  // Next 2: Slightly more complex
  { known: "It's not the best choice", target: "这不是最好的选择" },
  { known: "Was that the best choice?", target: "那是最好的选择吗？" },

  // Next 2: More varied contexts
  { known: "I think it's the best choice", target: "我认为这是最好的选择" },
  { known: "The best choice would be to wait", target: "最好的选择是等待" },

  // Final 4: Complex/varied
  { known: "What's the best choice here?", target: "这里最好的选择是什么？" },
  { known: "He always makes the best choice", target: "他总是做出最好的选择" },
  { known: "The best choice isn't always easy", target: "最好的选择并不总是容易的" },
  { known: "We need to find the best choice", target: "我们需要找到最好的选择" }
];

// Practice phrases for S0116L03 (I could make / 我能做出的)
const S0116L03_PHRASES = [
  // First 2: Simple usage
  { known: "the decision I could make", target: "我能做出的决定" },
  { known: "the choice I could make", target: "我能做出的选择" },

  // Next 2: Slightly more complex
  { known: "It's the best thing I could make", target: "这是我能做出的最好的东西" },
  { known: "the only choice I could make", target: "我能做出的唯一选择" },

  // Next 2: More varied contexts
  { known: "the biggest change I could make", target: "我能做出的最大改变" },
  { known: "the difference I could make here", target: "我能做出的改变在这里" },

  // Final 4: Complex/varied
  { known: "What's the best decision I could make?", target: "我能做出的最好决定是什么？" },
  { known: "the contribution I could make to the team", target: "我能为团队做出的贡献" },
  { known: "I thought about every choice I could make", target: "我考虑了我能做出的每个选择" },
  { known: "the impact I could make would be significant", target: "我能做出的影响将是显著的" }
];

/**
 * Upload basket to endpoint with retry logic
 */
async function uploadBasket(seedId, legoId, practicePhrases, maxRetries = 3) {
  const payload = {
    course: COURSE,
    seed: seedId,
    baskets: {
      [legoId]: {
        lego_id: legoId,
        practice_phrases: practicePhrases
      }
    }
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n[${legoId}] Attempt ${attempt}/${maxRetries}...`);

      const result = await new Promise((resolve, reject) => {
        const url = new URL(ENDPOINT);
        const postData = JSON.stringify(payload);

        const options = {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'ngrok-skip-browser-warning': 'true'
          }
        };

        const client = url.protocol === 'https:' ? https : http;

        const req = client.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, statusCode: res.statusCode, body: data });
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

      console.log(`✅ [${legoId}] Upload successful (${result.statusCode})`);
      console.log(`   Response: ${result.body}`);
      return true;

    } catch (error) {
      console.error(`❌ [${legoId}] Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        const waitTime = attempt * 2000; // Exponential backoff
        console.log(`   Retrying in ${waitTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error(`❌ [${legoId}] All ${maxRetries} attempts failed`);
        return false;
      }
    }
  }

  return false;
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(70));
  console.log('WORKER 2 RESUBMISSION - S0116L02, S0116L03');
  console.log('='.repeat(70));
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Course: ${COURSE}`);
  console.log('');

  const results = [];

  // Upload S0116L02
  console.log('\n--- Processing S0116L02 (the best choice / 最好的选择) ---');
  console.log(`Type: ${LEGOS.S0116L02.type}`);
  console.log(`Practice phrases: ${S0116L02_PHRASES.length}`);
  const result1 = await uploadBasket('S0116', 'S0116L02', S0116L02_PHRASES);
  results.push({ lego: 'S0116L02', success: result1 });

  // Upload S0116L03
  console.log('\n--- Processing S0116L03 (I could make / 我能做出的) ---');
  console.log(`Type: ${LEGOS.S0116L03.type}`);
  console.log(`Practice phrases: ${S0116L03_PHRASES.length}`);
  const result2 = await uploadBasket('S0116', 'S0116L03', S0116L03_PHRASES);
  results.push({ lego: 'S0116L03', success: result2 });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.lego}`);
  });

  console.log('');
  console.log(`Total: ${results.length} LEGOs`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  if (successCount === results.length) {
    console.log('\n🎉 ✅ Worker 2 resubmitted: 2 LEGOs');
  } else {
    console.log(`\n⚠️  Only ${successCount}/${results.length} LEGOs uploaded successfully`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

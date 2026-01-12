#!/usr/bin/env node

/**
 * Worker 8 Resubmission Script
 * Generates practice phrases for S0119L04 and S0120L01
 * Submits to new endpoint with retry logic
 */

const https = require('https');

const ENDPOINT = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';
const COURSE = 'zho_for_eng';

// LEGO definitions
const LEGOS = {
  'S0119L04': {
    seed_id: 'S0119',
    lego_id: 'S0119L04',
    type: 'M',
    known: 'Can I ask you something before you leave',
    target: '我能在你离开之前问你什么吗',
    components: [
      { known: 'ask you something', target: '问你什么' },
      { known: 'before you leave', target: '在你离开之前' }
    ]
  },
  'S0120L01': {
    seed_id: 'S0120',
    lego_id: 'S0120L01',
    type: 'A',
    known: "It's interesting",
    target: '很有趣',
    components: []
  }
};

// Practice phrases for S0119L04 (M-type: 2-2-2-4 progression)
const PRACTICE_S0119L04 = [
  // First 2: Component practice
  { known: "Can I ask you something?", target: "我能问你什么吗？" },
  { known: "Please wait before you leave.", target: "请在你离开之前等一下。" },

  // Second 2: Component recombination
  { known: "I want to ask you something before dinner.", target: "我想在晚饭前问你什么。" },
  { known: "Can I tell you before you leave?", target: "我能在你离开之前告诉你吗？" },

  // Third 2: Near-full LEGO
  { known: "Can I ask you before you leave tomorrow?", target: "我能在你明天离开之前问你吗？" },
  { known: "May I ask you something before you leave tonight?", target: "我能在你今晚离开之前问你什么吗？" },

  // Final 4: Full LEGO in context
  { known: "Can I ask you something before you leave for work?", target: "我能在你去上班之前问你什么吗？" },
  { known: "Can I ask you something important before you leave?", target: "我能在你离开之前问你重要的事情吗？" },
  { known: "Can I ask you something quickly before you leave?", target: "我能在你离开之前快速问你什么吗？" },
  { known: "Can I ask you something before you leave today?", target: "我能在你今天离开之前问你什么吗？" }
];

// Practice phrases for S0120L01 (A-type: 2-2-2-4 progression)
const PRACTICE_S0120L01 = [
  // First 2: Simple usage
  { known: "That's interesting.", target: "那很有趣。" },
  { known: "It's interesting to learn.", target: "学习很有趣。" },

  // Second 2: With modifiers
  { known: "It's very interesting.", target: "非常有趣。" },
  { known: "It's really interesting.", target: "真的很有趣。" },

  // Third 2: In longer sentences
  { known: "I think it's interesting.", target: "我认为很有趣。" },
  { known: "It's interesting, isn't it?", target: "很有趣，不是吗？" },

  // Final 4: Full contextual usage
  { known: "It's interesting that you know Chinese.", target: "你会中文很有趣。" },
  { known: "It's interesting to see how it works.", target: "看它如何工作很有趣。" },
  { known: "It's interesting what you said.", target: "你说的很有趣。" },
  { known: "It's interesting to meet you here.", target: "在这里遇见你很有趣。" }
];

/**
 * Submit basket with retry logic
 */
async function submitBasket(seed_id, lego_id, practice_phrases, maxRetries = 3) {
  const payload = {
    course: COURSE,
    seed: seed_id,
    baskets: {
      [lego_id]: {
        lego_id: lego_id,
        practice_phrases: practice_phrases
      }
    }
  };

  const postData = JSON.stringify(payload);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n[${lego_id}] Attempt ${attempt}/${maxRetries}...`);

      const result = await new Promise((resolve, reject) => {
        const url = new URL(ENDPOINT);
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

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ status: res.statusCode, body: data });
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          });
        });

        req.on('error', reject);
        req.setTimeout(30000, () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.write(postData);
        req.end();
      });

      console.log(`✅ [${lego_id}] Success! Status: ${result.status}`);
      console.log(`   Response: ${result.body.substring(0, 100)}...`);
      return true;

    } catch (error) {
      console.error(`❌ [${lego_id}] Attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        const delay = attempt * 2000; // Exponential backoff
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error(`❌ [${lego_id}] All attempts failed!`);
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
  console.log('='.repeat(60));
  console.log('Worker 8 Resubmission');
  console.log('='.repeat(60));
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log(`Course: ${COURSE}`);
  console.log(`LEGOs: S0119L04, S0120L01`);
  console.log('='.repeat(60));

  const results = [];

  // Submit S0119L04
  console.log('\n📦 Submitting S0119L04 (M-type)...');
  const success1 = await submitBasket('S0119', 'S0119L04', PRACTICE_S0119L04);
  results.push({ lego: 'S0119L04', success: success1 });

  // Submit S0120L01
  console.log('\n📦 Submitting S0120L01 (A-type)...');
  const success2 = await submitBasket('S0120', 'S0120L01', PRACTICE_S0120L01);
  results.push({ lego: 'S0120L01', success: success2 });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUBMISSION SUMMARY');
  console.log('='.repeat(60));

  let successCount = 0;
  results.forEach(r => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} ${r.lego}: ${r.success ? 'SUCCESS' : 'FAILED'}`);
    if (r.success) successCount++;
  });

  console.log('='.repeat(60));

  if (successCount === 2) {
    console.log('✅ Worker 8 resubmitted: 2 LEGOs');
    process.exit(0);
  } else {
    console.log(`⚠️  Worker 8 partial completion: ${successCount}/2 LEGOs`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

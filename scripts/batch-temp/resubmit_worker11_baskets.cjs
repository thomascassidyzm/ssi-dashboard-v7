#!/usr/bin/env node

/**
 * Resubmit Worker 11 Baskets
 * LEGOs: S0121L02 (unusual/不寻常), S0121L03 (your/你的)
 * Endpoint: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket
 */

const https = require('https');

const ENDPOINT_URL = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';
const COURSE = 'zho_for_eng';

// LEGO definitions
const LEGOS = {
  S0121L02: {
    lego_id: 'S0121L02',
    seed: 'S0121',
    type: 'A',
    known: 'unusual',
    target: '不寻常',
    practice_phrases: [
      // Phase 1: Simple contexts (2 phrases)
      { known: 'It is unusual', target: '这很不寻常' },
      { known: 'That is unusual', target: '那很不寻常' },

      // Phase 2: Question forms (2 phrases)
      { known: 'Is it unusual?', target: '这不寻常吗？' },
      { known: 'Was that unusual?', target: '那不寻常吗？' },

      // Phase 3: Descriptive contexts (2 phrases)
      { known: 'This is very unusual', target: '这非常不寻常' },
      { known: 'It seems unusual', target: '这似乎很不寻常' },

      // Phase 4: Complex usage (4 phrases)
      { known: 'That is quite unusual for him', target: '这对他来说很不寻常' },
      { known: 'I find this unusual', target: '我觉得这很不寻常' },
      { known: 'This is not unusual here', target: '这在这里并不不寻常' },
      { known: 'It would be unusual to see that', target: '看到那个会很不寻常' }
    ]
  },

  S0121L03: {
    lego_id: 'S0121L03',
    seed: 'S0121',
    type: 'A',
    known: 'your',
    target: '你的',
    practice_phrases: [
      // Phase 1: Simple possession (2 phrases)
      { known: 'your book', target: '你的书' },
      { known: 'your house', target: '你的房子' },

      // Phase 2: Question forms (2 phrases)
      { known: 'Is this your bag?', target: '这是你的包吗？' },
      { known: 'Is that your car?', target: '那是你的车吗？' },

      // Phase 3: Descriptive contexts (2 phrases)
      { known: 'I like your idea', target: '我喜欢你的想法' },
      { known: 'Your friend is here', target: '你的朋友在这里' },

      // Phase 4: Complex usage (4 phrases)
      { known: 'This is your opportunity', target: '这是你的机会' },
      { known: 'I appreciate your help', target: '我感谢你的帮助' },
      { known: 'Your decision is important', target: '你的决定很重要' },
      { known: 'What is your name?', target: '你的名字是什么？' }
    ]
  }
};

/**
 * Upload basket to endpoint with retry logic
 */
async function uploadBasket(legoData) {
  const payload = {
    course: COURSE,
    seed: legoData.seed,
    baskets: {
      [legoData.lego_id]: {
        lego_id: legoData.lego_id,
        practice_phrases: legoData.practice_phrases
      }
    }
  };

  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(ENDPOINT_URL, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ success: true, data, statusCode: res.statusCode });
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
async function uploadWithRetry(legoData, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n📤 Uploading ${legoData.lego_id} (attempt ${attempt}/${maxRetries})...`);
      const result = await uploadBasket(legoData);
      console.log(`✅ Success! Status: ${result.statusCode}`);
      console.log(`   Response: ${result.data}`);
      return result;
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed: ${error.message}`);
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // Exponential backoff
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Worker 11 Basket Resubmission');
  console.log('================================');
  console.log(`Endpoint: ${ENDPOINT_URL}`);
  console.log(`Course: ${COURSE}`);
  console.log(`LEGOs: ${Object.keys(LEGOS).join(', ')}\n`);

  const results = {
    successful: [],
    failed: []
  };

  for (const [legoId, legoData] of Object.entries(LEGOS)) {
    try {
      await uploadWithRetry(legoData);
      results.successful.push(legoId);
    } catch (error) {
      console.error(`\n💥 Failed to upload ${legoId} after all retries`);
      results.failed.push({ legoId, error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Successful: ${results.successful.length}/${Object.keys(LEGOS).length}`);
  if (results.successful.length > 0) {
    results.successful.forEach(id => console.log(`   - ${id}`));
  }

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(({ legoId, error }) => {
      console.log(`   - ${legoId}: ${error}`);
    });
  }

  if (results.successful.length === Object.keys(LEGOS).length) {
    console.log('\n✅ Worker 11 resubmitted: 2 LEGOs');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some uploads failed. Please review errors above.');
    process.exit(1);
  }
}

// Run
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

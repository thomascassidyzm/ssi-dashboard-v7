#!/usr/bin/env node

const https = require('https');

const ENDPOINT = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';

// LEGO data
const LEGOS = {
  'S0048L02': {
    seed_id: 'S0048',
    lego: {
      id: 'S0048L02',
      type: 'A',
      known: "don't care about",
      target: '不在乎',
      new: true
    }
  },
  'S0049L01': {
    seed_id: 'S0049',
    lego: {
      id: 'S0049L01',
      type: 'A',
      known: "It's like this",
      target: '就是这样',
      new: true
    }
  }
};

// Available vocabulary up to S0049 (selected for variety)
const VOCAB = {
  // Basic
  'S0001L01': { known: 'I want', target: '我想' },
  'S0001L02': { known: 'to speak', target: '说' },
  'S0001L03': { known: 'Chinese', target: '中文' },
  'S0001L04': { known: 'with you', target: '跟你' },
  'S0001L06': { known: 'now', target: '现在' },
  'S0002L01': { known: "I'm trying", target: '我在尝试' },
  'S0002L02': { known: 'to learn', target: '学' },
  'S0006L01': { known: 'I', target: '我' },
  'S0006L02': { known: "don't want", target: '不想' },
  'S0008L01': { known: 'You', target: '你' },
  'S0008L02': { known: 'need', target: '需要' },
  'S0008L03': { known: 'to practice', target: '练习' },
  'S0010L01': { known: 'Can you', target: '你能' },
  'S0010L02': { known: 'help', target: '帮助' },
  'S0010L03': { known: 'me', target: '我' },
  'S0012L01': { known: "I'm going", target: '我要去' },
  'S0012L02': { known: 'to try', target: '试试' },
  'S0014L01': { known: 'This', target: '这' },
  'S0014L02': { known: 'is', target: '是' },
  'S0014L03': { known: 'very', target: '很' },
  'S0014L04': { known: 'important', target: '重要' },
  'S0016L01': { known: 'I need', target: '我需要' },
  'S0016L02': { known: 'to think', target: '想想' },
  'S0018L01': { known: 'Do you understand', target: '你明白' },
  'S0020L01': { known: 'I think', target: '我觉得' },
  'S0020L02': { known: 'it', target: '它' },
  'S0022L01': { known: "I'm learning", target: '我在学' },
  'S0024L01': { known: 'to do', target: '做' },
  'S0024L02': { known: 'this', target: '这个' },
  'S0026L01': { known: "That's", target: '那是' },
  'S0026L02': { known: 'good', target: '好' },
  'S0028L01': { known: 'I know', target: '我知道' },
  'S0030L01': { known: 'Can I', target: '我能' },
  'S0032L01': { known: 'to ask', target: '问' },
  'S0034L01': { known: 'a question', target: '问题' },
  'S0036L01': { known: 'to say', target: '说' },
  'S0038L01': { known: 'something', target: '一些事' },
  'S0040L01': { known: 'every day', target: '每天' },
  'S0042L01': { known: "I'd like", target: '我想要' },
  'S0044L01': { known: 'to understand', target: '理解' },
  'S0046L01': { known: 'making mistakes', target: '犯错' },
};

// Practice phrases for S0048L02: "don't care about"
const S0048L02_PHRASES = [
  // Pair 1-2: Simple combinations
  { known: "I don't care about this", target: '我不在乎这个' },
  { known: "You don't care about it", target: '你不在乎它' },

  // Pair 3-4: Progressive complexity
  { known: "I don't care about making mistakes now", target: '我现在不在乎犯错' },
  { known: "I don't care about practice every day", target: '我不在乎每天练习' },

  // Pair 5-6: More complexity
  { known: "I think you don't care about learning Chinese", target: '我觉得你不在乎学中文' },
  { known: "I don't care about speaking with you", target: '我不在乎跟你说' },

  // Pair 7-10: Maximum complexity (4 phrases)
  { known: "I don't care about trying to understand this question", target: '我不在乎试试理解这个问题' },
  { known: "Do you understand I don't care about making mistakes now", target: '你明白我现在不在乎犯错' },
  { known: "I'm learning and I don't care about saying something wrong", target: '我在学，我不在乎说一些错的事' },
  { known: "That's good because I don't care about this every day", target: '那是好，因为我不在乎每天这个' }
];

// Practice phrases for S0049L01: "It's like this"
const S0049L01_PHRASES = [
  // Pair 1-2: Simple combinations
  { known: "It's like this now", target: '就是这样现在' },
  { known: "It's like this every day", target: '就是这样每天' },

  // Pair 3-4: Progressive complexity
  { known: "It's like this when I'm learning", target: '就是这样当我在学' },
  { known: "It's like this, I need to practice", target: '就是这样，我需要练习' },

  // Pair 5-6: More complexity
  { known: "I think it's like this with Chinese", target: '我觉得就是这样跟中文' },
  { known: "It's like this, I don't care about mistakes", target: '就是这样，我不在乎错误' },

  // Pair 7-10: Maximum complexity (4 phrases)
  { known: "Do you understand it's like this when learning", target: '你明白就是这样当学习' },
  { known: "That's good, it's like this every day now", target: '那是好，就是这样每天现在' },
  { known: "It's like this, I want to speak Chinese with you", target: '就是这样，我想跟你说中文' },
  { known: "I know it's like this, I'm trying to learn something", target: '我知道就是这样，我在尝试学一些事' }
];

// Upload function with retry logic
async function uploadBasket(basketData, legoId) {
  const maxRetries = 3;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n[${legoId}] Attempt ${attempt}/${maxRetries}...`);

      const result = await new Promise((resolve, reject) => {
        const postData = JSON.stringify(basketData);

        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'ngrok-skip-browser-warning': 'true'
          }
        };

        const req = https.request(ENDPOINT, options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, status: res.statusCode, data });
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

      console.log(`[${legoId}] ✓ Success! Status: ${result.status}`);
      console.log(`[${legoId}] Response: ${result.data}`);
      return result;

    } catch (error) {
      console.error(`[${legoId}] ✗ Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        console.log(`[${legoId}] Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error(`[${legoId}] ✗ All ${maxRetries} attempts failed`);
        throw error;
      }
    }
  }
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('BASKET UPLOAD: S0048L02 & S0049L01');
  console.log('='.repeat(60));

  const results = {
    success: [],
    failed: []
  };

  // Upload S0048L02
  const basket1 = {
    course: 'zho_for_eng',
    seed: 'S0048',
    baskets: {
      'S0048L02': {
        lego_id: 'S0048L02',
        practice_phrases: S0048L02_PHRASES
      }
    }
  };

  try {
    await uploadBasket(basket1, 'S0048L02');
    results.success.push('S0048L02');
  } catch (error) {
    results.failed.push({ lego: 'S0048L02', error: error.message });
  }

  // Wait between uploads
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Upload S0049L01
  const basket2 = {
    course: 'zho_for_eng',
    seed: 'S0049',
    baskets: {
      'S0049L01': {
        lego_id: 'S0049L01',
        practice_phrases: S0049L01_PHRASES
      }
    }
  };

  try {
    await uploadBasket(basket2, 'S0049L01');
    results.success.push('S0049L01');
  } catch (error) {
    results.failed.push({ lego: 'S0049L01', error: error.message });
  }

  // Final report
  console.log('\n' + '='.repeat(60));
  console.log('UPLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`✓ Successful: ${results.success.length} baskets`);
  if (results.success.length > 0) {
    results.success.forEach(lego => console.log(`  - ${lego}`));
  }

  console.log(`✗ Failed: ${results.failed.length} baskets`);
  if (results.failed.length > 0) {
    results.failed.forEach(({ lego, error }) => {
      console.log(`  - ${lego}: ${error}`);
    });
  }

  console.log('='.repeat(60));

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('\nFatal error:', error);
  process.exit(1);
});

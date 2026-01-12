#!/usr/bin/env node

/**
 * Generate and upload practice baskets for S0049L02 and S0050L02
 * Each LEGO gets 10 practice phrases following the progressive 2-2-2-4 pattern
 */

const https = require('https');

// LEGO data
const legos = {
  S0049L02: {
    seed_id: "S0049",
    lego_id: "S0049L02",
    type: "A",
    known: "if you know what I mean",
    target: "你懂我的意思吧"
  },
  S0050L02: {
    seed_id: "S0050",
    lego_id: "S0050L02",
    type: "A",
    known: "am not trying to",
    target: "不是在试图"
  }
};

// Practice phrases for S0049L02 - "if you know what I mean" / "你懂我的意思吧"
const s0049l02_practice = [
  // Simple pairs (2)
  { known: "I want to learn Chinese, if you know what I mean.", target: "我想学中文，你懂我的意思吧。" },
  { known: "I'm trying to speak better, if you know what I mean.", target: "我在尝试说得更好，你懂我的意思吧。" },

  // Intermediate pairs (2)
  { known: "I like speaking with people, if you know what I mean.", target: "我喜欢和人说话，你懂我的意思吧。" },
  { known: "I don't want to make mistakes, if you know what I mean.", target: "我不想犯错，你懂我的意思吧。" },

  // Progressive pairs (2)
  { known: "I'm not sure how to explain, if you know what I mean.", target: "我不确定怎么解释，你懂我的意思吧。" },
  { known: "I want to practise as often as possible, if you know what I mean.", target: "我想尽可能常练习，你懂我的意思吧。" },

  // Complex pairs (4)
  { known: "I'm trying to improve quickly, if you know what I mean.", target: "我在尝试很快提高，你懂我的意思吧。" },
  { known: "I think learning Chinese is useful, if you know what I mean.", target: "我认为学中文很有用，你懂我的意思吧。" },
  { known: "I want to remember the whole sentence, if you know what I mean.", target: "我想记住整句话，你懂我的意思吧。" },
  { known: "I'm looking forward to speaking with you tomorrow, if you know what I mean.", target: "我期待明天和你说话，你懂我的意思吧。" }
];

// Practice phrases for S0050L02 - "am not trying to" / "不是在试图"
const s0050l02_practice = [
  // Simple pairs (2)
  { known: "I am not trying to finish now.", target: "我不是在试图现在完成。" },
  { known: "I am not trying to learn everything.", target: "我不是在试图学一切。" },

  // Intermediate pairs (2)
  { known: "I am not trying to speak very well.", target: "我不是在试图说得很好。" },
  { known: "I am not trying to answer quickly.", target: "我不是在试图很快回答。" },

  // Progressive pairs (2)
  { known: "I am not trying to remember the whole sentence.", target: "我不是在试图记住整句话。" },
  { known: "I am not trying to improve as quickly as possible.", target: "我不是在试图尽快提高。" },

  // Complex pairs (4)
  { known: "I am not trying to guess what the answer is.", target: "我不是在试图猜测答案是什么。" },
  { known: "I am not trying to interrupt when you are speaking.", target: "我不是在试图在你说话时打断。" },
  { known: "I am not trying to start before you finish.", target: "我不是在试图在你完成之前开始。" },
  { known: "I am not trying to explain everything this morning.", target: "我不是在试图今天早上解释一切。" }
];

// Create basket payloads
const baskets = {
  S0049L02: {
    course: "zho_for_eng",
    seed: "S0049",
    baskets: {
      S0049L02: {
        lego_id: "S0049L02",
        practice_phrases: s0049l02_practice
      }
    }
  },
  S0050L02: {
    course: "zho_for_eng",
    seed: "S0050",
    baskets: {
      S0050L02: {
        lego_id: "S0050L02",
        practice_phrases: s0050l02_practice
      }
    }
  }
};

// Upload function with retry logic
async function uploadBasket(legoId, payload, retries = 3) {
  const endpoint = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`\n[${legoId}] Attempt ${attempt}/${retries}...`);

      const result = await new Promise((resolve, reject) => {
        const postData = JSON.stringify(payload);

        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
            'ngrok-skip-browser-warning': 'true'
          },
          rejectUnauthorized: false // Allow self-signed certs for ngrok
        };

        const req = https.request(endpoint, options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const jsonData = JSON.parse(data);
                resolve({ success: true, status: res.statusCode, data: jsonData });
              } catch (e) {
                resolve({ success: true, status: res.statusCode, data: data });
              }
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

      console.log(`[${legoId}] ✅ SUCCESS (HTTP ${result.status})`);
      console.log(`[${legoId}] Response:`, JSON.stringify(result.data, null, 2));
      return result;

    } catch (error) {
      console.error(`[${legoId}] ❌ Attempt ${attempt} failed:`, error.message);

      if (attempt === retries) {
        console.error(`[${legoId}] ❌ All ${retries} attempts failed`);
        throw error;
      }

      // Wait before retry (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`[${legoId}] ⏳ Waiting ${waitTime/1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
}

// Main execution
async function main() {
  console.log('='.repeat(60));
  console.log('BASKET UPLOAD - S0049L02 and S0050L02');
  console.log('='.repeat(60));
  console.log(`Endpoint: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket`);
  console.log(`Course: zho_for_eng`);
  console.log(`LEGOs: S0049L02, S0050L02`);
  console.log(`Practice phrases per LEGO: 10 (progressive 2-2-2-4 pattern)`);
  console.log('='.repeat(60));

  const results = {
    successful: [],
    failed: []
  };

  // Upload S0049L02
  try {
    await uploadBasket('S0049L02', baskets.S0049L02);
    results.successful.push('S0049L02');
  } catch (error) {
    results.failed.push({ lego: 'S0049L02', error: error.message });
  }

  // Upload S0050L02
  try {
    await uploadBasket('S0050L02', baskets.S0050L02);
    results.successful.push('S0050L02');
  } catch (error) {
    results.failed.push({ lego: 'S0050L02', error: error.message });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('UPLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${results.successful.length}`);
  if (results.successful.length > 0) {
    results.successful.forEach(lego => console.log(`   - ${lego}`));
  }

  console.log(`\n❌ Failed: ${results.failed.length}`);
  if (results.failed.length > 0) {
    results.failed.forEach(({ lego, error }) => {
      console.log(`   - ${lego}: ${error}`);
    });
  }
  console.log('='.repeat(60));

  if (results.failed.length > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});

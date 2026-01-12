#!/usr/bin/env node

/**
 * Upload baskets for S0050L04 and S0051L02 to the new /upload-basket endpoint
 * with retry logic
 */

const https = require('https');

const ENDPOINT_URL = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';

// Basket data for S0050L04
const basket_S0050L04 = {
  course: 'zho_for_eng',
  seed: 'S0050',
  baskets: {
    S0050L04: {
      lego_id: 'S0050L04',
      practice_phrases: [
        {
          known: 'As quickly as possible.',
          target: '尽快。'
        },
        {
          known: 'I need to finish as quickly as possible.',
          target: '我需要尽快完成。'
        },
        {
          known: 'Can you come as quickly as possible?',
          target: '你能尽快来吗？'
        },
        {
          known: 'I want to learn as quickly as possible.',
          target: '我想尽快学。'
        },
        {
          known: 'I need to answer as quickly as possible.',
          target: '我需要尽快回答。'
        },
        {
          known: "I'm trying to improve as quickly as possible.",
          target: '我在试图尽快提高。'
        },
        {
          known: 'I want to go back and finish as quickly as possible.',
          target: '我想回去尽快完成。'
        },
        {
          known: "I don't need to finish as quickly as possible, if you know what I mean.",
          target: '我不需要尽快完成，你懂我的意思吧。'
        },
        {
          known: "I'm not trying to finish as quickly as possible, it's like this.",
          target: '我不是在试图尽快完成，就是这样。'
        },
        {
          known: "I'm not trying to finish as quickly as possible.",
          target: '我不是在试图尽快地完成。'
        }
      ]
    }
  }
};

// Basket data for S0051L02
const basket_S0051L02 = {
  course: 'zho_for_eng',
  seed: 'S0051',
  baskets: {
    S0051L02: {
      lego_id: 'S0051L02',
      practice_phrases: [
        {
          known: 'I enjoy this.',
          target: '我喜欢这个。'
        },
        {
          known: 'I enjoy Chinese.',
          target: '我喜欢中文。'
        },
        {
          known: 'I enjoy speaking.',
          target: '我喜欢说话。'
        },
        {
          known: 'I enjoy learning.',
          target: '我喜欢学习。'
        },
        {
          known: 'We enjoy speaking Chinese.',
          target: '我们喜欢说中文。'
        },
        {
          known: 'I enjoy speaking now.',
          target: '我现在喜欢说。'
        },
        {
          known: 'I enjoy learning Chinese.',
          target: '我喜欢学中文。'
        },
        {
          known: 'We enjoy speaking this morning.',
          target: '我们今天早上喜欢说。'
        },
        {
          known: 'I enjoy speaking Chinese now.',
          target: '我现在喜欢说中文。'
        },
        {
          known: 'I enjoy learning now.',
          target: '我现在喜欢学。'
        }
      ]
    }
  }
};

/**
 * Upload a basket with retry logic
 */
async function uploadBasket(basketData, legoId, maxRetries = 3) {
  const payload = JSON.stringify(basketData);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n[${legoId}] Attempt ${attempt}/${maxRetries}...`);

      const response = await new Promise((resolve, reject) => {
        const url = new URL(ENDPOINT_URL);

        const options = {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            'ngrok-skip-browser-warning': 'true'
          },
          rejectUnauthorized: false // Skip SSL verification for ngrok
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            resolve({
              statusCode: res.statusCode,
              statusMessage: res.statusMessage,
              headers: res.headers,
              body: data
            });
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.setTimeout(30000); // 30 second timeout
        req.write(payload);
        req.end();
      });

      console.log(`[${legoId}] Response status: ${response.statusCode} ${response.statusMessage}`);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        console.log(`[${legoId}] ✓ SUCCESS`);
        try {
          const parsed = JSON.parse(response.body);
          console.log(`[${legoId}] Response:`, JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log(`[${legoId}] Response:`, response.body);
        }
        return { success: true, response };
      } else {
        console.log(`[${legoId}] ✗ FAILED - Status ${response.statusCode}`);
        console.log(`[${legoId}] Response body:`, response.body);

        if (attempt < maxRetries) {
          const delay = attempt * 2000; // Exponential backoff: 2s, 4s, 6s
          console.log(`[${legoId}] Retrying in ${delay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } catch (error) {
      console.error(`[${legoId}] ✗ ERROR on attempt ${attempt}:`, error.message);

      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        console.log(`[${legoId}] Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return { success: false };
}

/**
 * Main execution
 */
async function main() {
  console.log('========================================');
  console.log('Uploading baskets for S0050L04 and S0051L02');
  console.log('========================================');

  const results = [];

  // Upload S0050L04
  console.log('\n--- Uploading S0050L04 ---');
  const result1 = await uploadBasket(basket_S0050L04, 'S0050L04');
  results.push({ lego: 'S0050L04', ...result1 });

  // Wait a bit between uploads
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Upload S0051L02
  console.log('\n--- Uploading S0051L02 ---');
  const result2 = await uploadBasket(basket_S0051L02, 'S0051L02');
  results.push({ lego: 'S0051L02', ...result2 });

  // Summary
  console.log('\n========================================');
  console.log('UPLOAD SUMMARY');
  console.log('========================================');
  results.forEach(r => {
    console.log(`${r.lego}: ${r.success ? '✓ SUCCESS' : '✗ FAILED'}`);
  });

  const allSuccess = results.every(r => r.success);
  console.log(`\nOverall: ${allSuccess ? '✓ ALL UPLOADS SUCCESSFUL' : '✗ SOME UPLOADS FAILED'}`);

  process.exit(allSuccess ? 0 : 1);
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

#!/usr/bin/env node

const https = require('https');

// LEGO data
const LEGOS = {
  "S0047L02": {
    "id": "S0047L02",
    "type": "A",
    "known": "to make mistakes",
    "target": "犯错"
  },
  "S0047L03": {
    "id": "S0047L03",
    "type": "A",
    "known": "is a good thing",
    "target": "是件好事"
  }
};

// Practice phrases for S0047L02: "to make mistakes" / "犯错"
const S0047L02_PHRASES = [
  // Complete LEGO (2 phrases)
  { known: "I like to make mistakes.", target: "我喜欢犯错。" },
  { known: "I want to make mistakes.", target: "我想犯错。" },

  // Progressive usage (2 phrases)
  { known: "Making mistakes is useful.", target: "犯错很有用。" },
  { known: "I don't like making mistakes.", target: "我不喜欢犯错。" },

  // Progressive usage (2 more phrases)
  { known: "Are you going to make mistakes?", target: "你会犯错吗？" },
  { known: "I'm trying to make mistakes.", target: "我在尝试犯错。" },

  // Contextual sentences (4 phrases)
  { known: "I think making mistakes is important.", target: "我认为犯错很重要。" },
  { known: "I don't want to make mistakes now.", target: "我现在不想犯错。" },
  { known: "Do you like to make mistakes?", target: "你喜欢犯错吗？" },
  { known: "I started to make mistakes yesterday.", target: "我昨天开始犯错。" }
];

// Practice phrases for S0047L03: "is a good thing" / "是件好事"
const S0047L03_PHRASES = [
  // Complete LEGO (2 phrases)
  { known: "Learning is a good thing.", target: "学习是件好事。" },
  { known: "Practising is a good thing.", target: "练习是件好事。" },

  // Progressive usage (2 phrases)
  { known: "Speaking Chinese is a good thing.", target: "说中文是件好事。" },
  { known: "I think it's a good thing.", target: "我认为是件好事。" },

  // Progressive usage (2 more phrases)
  { known: "Making mistakes is a good thing.", target: "犯错是件好事。" },
  { known: "Trying is a good thing.", target: "尝试是件好事。" },

  // Contextual sentences (4 phrases)
  { known: "I think learning Chinese is a good thing.", target: "我认为学中文是件好事。" },
  { known: "I think making mistakes is a good thing.", target: "我认为犯错是件好事。" },
  { known: "Do you think it's a good thing?", target: "你认为是件好事吗？" },
  { known: "I think speaking with you is a good thing.", target: "我认为和你说话是件好事。" }
];

// Build basket payloads
const BASKETS = {
  "S0047L02": {
    course: "zho_for_eng",
    seed: "S0047",
    baskets: {
      "S0047L02": {
        lego_id: "S0047L02",
        practice_phrases: S0047L02_PHRASES
      }
    }
  },
  "S0047L03": {
    course: "zho_for_eng",
    seed: "S0047",
    baskets: {
      "S0047L03": {
        lego_id: "S0047L03",
        practice_phrases: S0047L03_PHRASES
      }
    }
  }
};

// Upload function with retry logic
async function uploadBasket(legoId, payload, maxRetries = 3) {
  const url = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n[${legoId}] Upload attempt ${attempt}/${maxRetries}...`);

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

        const req = https.request(url, options, (res) => {
          let data = '';

          res.on('data', (chunk) => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              try {
                const parsed = JSON.parse(data);
                resolve({ success: true, data: parsed, statusCode: res.statusCode });
              } catch (e) {
                resolve({ success: true, data: data, statusCode: res.statusCode });
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

      console.log(`[${legoId}] ✅ Success! Status: ${result.statusCode}`);
      console.log(`[${legoId}] Response:`, JSON.stringify(result.data, null, 2));
      return result;

    } catch (error) {
      console.error(`[${legoId}] ❌ Attempt ${attempt} failed:`, error.message);

      if (attempt < maxRetries) {
        const waitTime = attempt * 2000; // Exponential backoff
        console.log(`[${legoId}] Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error(`[${legoId}] ❌ All retry attempts exhausted.`);
        throw error;
      }
    }
  }
}

// Main execution
async function main() {
  console.log('========================================');
  console.log('Uploading S0047L02 and S0047L03 Baskets');
  console.log('========================================');

  const results = {
    success: [],
    failed: []
  };

  // Upload S0047L02
  try {
    await uploadBasket('S0047L02', BASKETS['S0047L02']);
    results.success.push('S0047L02');
  } catch (error) {
    results.failed.push({ lego: 'S0047L02', error: error.message });
  }

  // Wait between uploads
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Upload S0047L03
  try {
    await uploadBasket('S0047L03', BASKETS['S0047L03']);
    results.success.push('S0047L03');
  } catch (error) {
    results.failed.push({ lego: 'S0047L03', error: error.message });
  }

  // Summary
  console.log('\n========================================');
  console.log('UPLOAD SUMMARY');
  console.log('========================================');
  console.log(`✅ Successful: ${results.success.length}`);
  if (results.success.length > 0) {
    results.success.forEach(lego => console.log(`   - ${lego}`));
  }
  console.log(`❌ Failed: ${results.failed.length}`);
  if (results.failed.length > 0) {
    results.failed.forEach(({ lego, error }) => {
      console.log(`   - ${lego}: ${error}`);
    });
  }
  console.log('========================================\n');

  process.exit(results.failed.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

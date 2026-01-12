#!/usr/bin/env node

const https = require('https');

const ENDPOINT = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';
const COURSE = 'zho_for_eng';

// LEGO Data
const LEGOS = {
  'S0115L03': {
    type: 'M-type',
    known: "I don't feel as if I'm ready to have a conversation.",
    target: "我不觉得我已经准备好进行一次对话。"
  },
  'S0116L01': {
    type: 'A-type',
    known: "This isn't",
    target: "这不是"
  }
};

// Practice phrases for S0115L03 (M-type - 2-2-2-4 progression)
const S0115L03_PHRASES = [
  // First 2 (simple context)
  { known: "I don't feel as if I'm ready to have a conversation with them.", target: "我不觉得我已经准备好和他们进行一次对话。" },
  { known: "I don't feel as if I'm ready to have a conversation right now.", target: "我不觉得我现在已经准备好进行一次对话。" },

  // Second 2 (slight variation)
  { known: "I don't feel as if I'm ready to have a serious conversation.", target: "我不觉得我已经准备好进行一次严肃的对话。" },
  { known: "I don't feel as if I'm ready to have a long conversation.", target: "我不觉得我已经准备好进行一次长对话。" },

  // Third 2 (more complex)
  { known: "I don't feel as if I'm ready to have a conversation about this topic.", target: "我不觉得我已经准备好就这个话题进行一次对话。" },
  { known: "I don't feel as if I'm ready to have a conversation in Chinese yet.", target: "我不觉得我已经准备好用中文进行一次对话了。" },

  // Final 4 (full complexity)
  { known: "I don't feel as if I'm ready to have a conversation with my teacher.", target: "我不觉得我已经准备好和我的老师进行一次对话。" },
  { known: "I don't feel as if I'm ready to have a conversation about my future.", target: "我不觉得我已经准备好谈论我的未来进行一次对话。" },
  { known: "I don't feel as if I'm ready to have a difficult conversation today.", target: "我不觉得我今天已经准备好进行一次困难的对话。" },
  { known: "I don't feel as if I'm ready to have a conversation without help.", target: "我不觉得我已经准备好在没有帮助的情况下进行一次对话。" }
];

// Practice phrases for S0116L01 (A-type - 2-2-2-4 progression)
const S0116L01_PHRASES = [
  // First 2 (simple usage)
  { known: "This isn't my book.", target: "这不是我的书。" },
  { known: "This isn't right.", target: "这不是对的。" },

  // Second 2 (common contexts)
  { known: "This isn't what I wanted.", target: "这不是我想要的。" },
  { known: "This isn't easy.", target: "这不是容易的。" },

  // Third 2 (more variety)
  { known: "This isn't my first time.", target: "这不是我第一次。" },
  { known: "This isn't fair.", target: "这不是公平的。" },

  // Final 4 (full complexity)
  { known: "This isn't the answer I was looking for.", target: "这不是我在寻找的答案。" },
  { known: "This isn't going to work.", target: "这不是会奏效的。" },
  { known: "This isn't what we discussed yesterday.", target: "这不是我们昨天讨论的。" },
  { known: "This isn't the best solution.", target: "这不是最好的解决方案。" }
];

const BASKETS = {
  'S0115L03': {
    seed: 'S0115',
    phrases: S0115L03_PHRASES
  },
  'S0116L01': {
    seed: 'S0116',
    phrases: S0116L01_PHRASES
  }
};

async function uploadBasket(legoId, seedId, phrases) {
  const payload = {
    course: COURSE,
    seed: seedId,
    baskets: {
      [legoId]: {
        lego_id: legoId,
        practice_phrases: phrases
      }
    }
  };

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const url = new URL(ENDPOINT);

    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ legoId, status: res.statusCode, response: responseData });
        } else {
          reject(new Error(`Upload failed for ${legoId}: ${res.statusCode} ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function uploadWithRetry(legoId, seedId, phrases, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Uploading ${legoId} (attempt ${attempt}/${maxRetries})...`);
      const result = await uploadBasket(legoId, seedId, phrases);
      console.log(`✅ ${legoId} uploaded successfully (${result.status})`);
      return result;
    } catch (error) {
      console.error(`❌ Attempt ${attempt} failed for ${legoId}: ${error.message}`);
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

async function main() {
  console.log('Worker 1 Resubmission - Starting upload...\n');

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const [legoId, basket] of Object.entries(BASKETS)) {
    try {
      const result = await uploadWithRetry(legoId, basket.seed, basket.phrases);
      results.push(result);
      successCount++;
    } catch (error) {
      console.error(`\n❌ Failed to upload ${legoId} after all retries: ${error.message}\n`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('UPLOAD SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total LEGOs: ${Object.keys(BASKETS).length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('='.repeat(60));

  if (successCount === Object.keys(BASKETS).length) {
    console.log('\n✅ Worker 1 resubmitted: 2 LEGOs');
  } else {
    console.log(`\n⚠️  Worker 1 partial completion: ${successCount}/2 LEGOs uploaded`);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

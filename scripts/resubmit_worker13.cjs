#!/usr/bin/env node

/**
 * Worker 13 Basket Resubmission Script
 * LEGOs: S0121L07, S0122L01
 * Endpoint: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket
 */

const https = require('https');
const http = require('http');

const ENDPOINT = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';
const COURSE = 'zho_for_eng';

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

// Basket data
const baskets = {
  S0121L07: {
    course: 'zho_for_eng',
    seed: 'S0121',
    baskets: {
      S0121L07: {
        lego_id: 'S0121L07',
        practice_phrases: [
          { known: "It's unusual.", target: "很不寻常。" },
          { known: "It's unusual now.", target: "现在很不寻常。" },
          { known: "It's unusual you said that.", target: "你说那个很不寻常。" },
          { known: "It's unusual when you speak Chinese.", target: "你说中文的时候很不寻常。" },
          { known: "It's unusual you want to learn.", target: "你想学很不寻常。" },
          { known: "It's unusual you don't like to go by bus.", target: "你不喜欢坐公交车很不寻常。" },
          { known: "It's unusual you feel better today than yesterday.", target: "你今天觉得比昨天好很不寻常。" },
          { known: "It's unusual you don't want to speak with me tomorrow.", target: "你不想明天和我说话很不寻常。" },
          { known: "It's unusual when we meet people who don't like to use your car.", target: "我们见不喜欢用你的车的人很不寻常。" },
          { known: "It's unusual that you don't like to use your car.", target: "你不喜欢用你的车很不寻常。" }
        ]
      }
    }
  },
  S0122L01: {
    course: 'zho_for_eng',
    seed: 'S0122',
    baskets: {
      S0122L01: {
        lego_id: 'S0122L01',
        practice_phrases: [
          { known: "It's easier.", target: "更容易。" },
          { known: "Learning is easier now.", target: "现在学习更容易。" },
          { known: "I think it's easier.", target: "我认为更容易。" },
          { known: "Speaking Chinese is easier.", target: "说中文更容易。" },
          { known: "I feel learning is easier today.", target: "我觉得今天学习更容易。" },
          { known: "Speaking is easier than before.", target: "说话比以前更容易。" },
          { known: "I feel as if learning is easier now than yesterday.", target: "我觉得现在学习比昨天更容易。" },
          { known: "Speaking Chinese is definitely easier than last time.", target: "说中文肯定比上次更容易。" },
          { known: "I'm starting to feel learning is easier than before.", target: "我开始觉得学习比以前更容易。" },
          { known: "I think speaking Chinese is easier now than when we were in the pub.", target: "我认为现在说中文比我们在酒吧的时候更容易。" }
        ]
      }
    }
  }
};

/**
 * Make HTTP POST request
 */
function postJSON(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'ngrok-skip-browser-warning': 'true'
      },
      timeout: 30000
    };

    const protocol = urlObj.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body,
          headers: res.headers
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

    req.write(postData);
    req.end();
  });
}

/**
 * Upload basket with retry logic
 */
async function uploadBasket(legoId, basketData, maxRetries = 3) {
  console.log(`${colors.blue}Uploading ${legoId}...${colors.reset}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await postJSON(ENDPOINT, basketData);

      if (response.statusCode === 200 || response.statusCode === 201) {
        console.log(`${colors.green}✓ ${legoId} uploaded successfully (HTTP ${response.statusCode})${colors.reset}`);
        console.log(`  Response: ${response.body}`);
        return true;
      } else {
        console.log(`${colors.red}✗ Attempt ${attempt} failed (HTTP ${response.statusCode})${colors.reset}`);
        console.log(`  Response: ${response.body}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Attempt ${attempt} failed: ${error.message}${colors.reset}`);
    }

    if (attempt < maxRetries) {
      console.log(`  Retrying in 2 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`${colors.red}✗ Failed to upload ${legoId} after ${maxRetries} attempts${colors.reset}`);
  return false;
}

/**
 * Test endpoint connectivity
 */
async function testEndpoint() {
  console.log(`${colors.blue}Testing endpoint connectivity...${colors.reset}`);
  try {
    const healthUrl = ENDPOINT.replace('/upload-basket', '/health');
    const response = await new Promise((resolve, reject) => {
      const urlObj = new URL(healthUrl);
      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname,
        method: 'GET',
        headers: {
          'ngrok-skip-browser-warning': 'true'
        },
        timeout: 5000
      };

      const req = https.request(options, (res) => {
        resolve({ statusCode: res.statusCode });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });

      req.end();
    });

    console.log(`${colors.green}✓ Endpoint is accessible${colors.reset}\n`);
    return true;
  } catch (error) {
    console.log(`${colors.red}✗ Endpoint is not accessible: ${error.message}${colors.reset}`);
    console.log(`${colors.yellow}Please ensure the ngrok tunnel is active and the endpoint is correct${colors.reset}`);
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('Worker 13 Basket Resubmission Script');
  console.log('LEGOs: S0121L07, S0122L01');
  console.log(`Endpoint: ${ENDPOINT}\n`);

  // Test endpoint
  const isAccessible = await testEndpoint();
  if (!isAccessible) {
    console.log(`\n${colors.yellow}Tip: The JSON payloads are available in the script and can be used for manual upload${colors.reset}`);
    process.exit(1);
  }

  // Upload baskets
  console.log(`${colors.blue}Starting Worker 13 basket uploads...${colors.reset}\n`);

  let successCount = 0;

  if (await uploadBasket('S0121L07', baskets.S0121L07)) {
    successCount++;
  }
  console.log('');

  if (await uploadBasket('S0122L01', baskets.S0122L01)) {
    successCount++;
  }

  // Final report
  console.log('\n=========================================');
  if (successCount === 2) {
    console.log(`${colors.green}✅ Worker 13 resubmitted: 2 LEGOs${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`${colors.red}⚠ Worker 13 completed with errors: ${successCount}/2 LEGOs uploaded${colors.reset}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { baskets, uploadBasket };

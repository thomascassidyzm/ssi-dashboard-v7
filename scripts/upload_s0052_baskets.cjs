const fs = require('fs');
const https = require('https');

const ENDPOINT = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';
const COURSE = 'zho_for_eng';
const SEED_ID = 'S0052';

// S0052L05: A-type LEGO (his friend / 朋友)
const basketL05 = {
  course: COURSE,
  seed: SEED_ID,
  baskets: {
    S0052L05: {
      lego_id: 'S0052L05',
      practice_phrases: [
        { known: "his friend", target: "朋友" },
        { known: "his friend wanted to", target: "朋友想" },
        { known: "his friend wanted to eat", target: "朋友想吃" },
        { known: "his friend wanted to drink", target: "朋友想喝" },
        { known: "his friend wanted to drink water", target: "朋友想喝水" },
        { known: "his friend is here", target: "朋友在这里" },
        { known: "his friend is not here", target: "朋友不在这里" },
        { known: "his friend said", target: "朋友说" },
        { known: "his friend said that he wanted to eat", target: "朋友说他想吃" },
        { known: "his friend said that he wanted to drink water", target: "朋友说他想喝水" }
      ]
    }
  }
};

// S0052L06: M-type LEGO (to his friend / 给朋友)
// Component: his friend / 朋友
const basketL06 = {
  course: COURSE,
  seed: SEED_ID,
  baskets: {
    S0052L06: {
      lego_id: 'S0052L06',
      practice_phrases: [
        // Component introduction
        { known: "his friend", target: "朋友" },
        { known: "his friend wanted to eat", target: "朋友想吃" },
        // LEGO debut
        { known: "to his friend", target: "给朋友" },
        { known: "give to his friend", target: "给朋友" },
        // Practice phrases using the complete LEGO
        { known: "he wanted to write to his friend", target: "他想给朋友写" },
        { known: "he wanted to say to his friend", target: "他想给朋友说" },
        { known: "she wanted to give to his friend", target: "她想给朋友" },
        { known: "I wanted to write a letter to his friend", target: "我想给朋友写信" },
        { known: "he wanted to write a letter to his friend", target: "他想给朋友写信" },
        { known: "he wanted to write a letter to his friend last week", target: "他上周想给朋友写信" }
      ]
    }
  }
};

function uploadBasket(basket, legoId) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(basket);

    const url = new URL(ENDPOINT);
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'ngrok-skip-browser-warning': 'true'
      },
      rejectUnauthorized: false // Handle self-signed certs
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ Successfully uploaded ${legoId}`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response: ${responseData}`);
          resolve({ legoId, success: true, response: responseData });
        } else {
          console.log(`❌ Failed to upload ${legoId}`);
          console.log(`   Status: ${res.statusCode}`);
          console.log(`   Response: ${responseData}`);
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Error uploading ${legoId}: ${error.message}`);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function uploadWithRetry(basket, legoId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n📤 Uploading ${legoId} (attempt ${attempt}/${maxRetries})...`);
      const result = await uploadBasket(basket, legoId);
      return result;
    } catch (error) {
      console.log(`   Attempt ${attempt} failed: ${error.message}`);
      if (attempt < maxRetries) {
        const delay = attempt * 1000; // 1s, 2s, 3s
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

async function main() {
  console.log('🚀 Starting basket upload for S0052L05 and S0052L06\n');

  const results = [];

  try {
    // Upload S0052L05
    const result1 = await uploadWithRetry(basketL05, 'S0052L05');
    results.push(result1);

    // Small delay between uploads
    await new Promise(resolve => setTimeout(resolve, 500));

    // Upload S0052L06
    const result2 = await uploadWithRetry(basketL06, 'S0052L06');
    results.push(result2);

    console.log('\n✨ All baskets uploaded successfully!');
    console.log('\nSummary:');
    results.forEach(r => {
      console.log(`  - ${r.legoId}: ✅ Success`);
    });

  } catch (error) {
    console.error('\n💥 Upload failed:', error.message);
    process.exit(1);
  }
}

main();

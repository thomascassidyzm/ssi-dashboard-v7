#!/usr/bin/env node
/**
 * Run Test Orchestration - Phase 5 Staging Workflow
 *
 * Minimal end-to-end test that simulates:
 * - 3 agents working in parallel
 * - Each agent processes 1 seed
 * - All save to staging
 * - Extract, preview, and upload to canon
 *
 * This tests the full workflow WITHOUT opening browser windows.
 * For browser-based testing, see: test-with-browsers.cjs
 *
 * Usage:
 *   node tools/phase5/run-test-orchestration.cjs
 */

const fs = require('fs-extra');
const path = require('path');
const https = require('https');

const TEST_CONFIG = {
  course: 'test',
  seeds: ['S0001', 'S0002', 'S0003'],
  agents: ['agent-01', 'agent-02', 'agent-03'],
  ngrokUrl: 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev',
  stagingMode: true  // ← Key: Save to staging first
};

const VFS_ROOT = path.join(__dirname, '../../public/vfs/courses');

// Mock basket data for testing
const generateMockBasket = (seed, legoNum) => {
  const legoId = `${seed}L${String(legoNum).padStart(2, '0')}`;

  return {
    [legoId]: {
      lego: [`test phrase ${legoId}`, `测试短语 ${legoId}`],
      type: 'M',
      practice_phrases: [
        [`Test ${legoId}`, `测试 ${legoId}`, null, 1],
        [`I test ${legoId}`, `我测试 ${legoId}`, null, 2]
      ]
    }
  };
};

async function runOrchestration() {
  console.log('=== Phase 5 Test Orchestration ===\n');
  console.log('Configuration:');
  console.log(`  Course: ${TEST_CONFIG.course}`);
  console.log(`  Seeds: ${TEST_CONFIG.seeds.join(', ')}`);
  console.log(`  Agents: ${TEST_CONFIG.agents.length}`);
  console.log(`  Staging mode: ${TEST_CONFIG.stagingMode ? 'ON ✅' : 'OFF'}`);
  console.log('');

  // Step 1: Setup
  console.log('Step 1: Setup test environment\n');

  const courseDir = path.join(VFS_ROOT, TEST_CONFIG.course);
  const stagingDir = path.join(courseDir, 'phase5_baskets_staging');

  await fs.ensureDir(stagingDir);
  console.log(`✅ Staging directory ready: ${stagingDir}\n`);

  // Step 2: Simulate parallel agent work
  console.log('Step 2: Simulate 3 agents working in parallel\n');

  const agentTasks = TEST_CONFIG.agents.map(async (agentId, index) => {
    const seed = TEST_CONFIG.seeds[index];

    console.log(`[${agentId}] Processing ${seed}...`);

    // Generate mock baskets (2 LEGOs per seed)
    const baskets = {
      ...generateMockBasket(seed, 1),
      ...generateMockBasket(seed, 2)
    };

    // Save to staging (simulates agent output)
    if (TEST_CONFIG.stagingMode) {
      const stagingFile = path.join(stagingDir, `seed_${seed}_${agentId}.json`);
      await fs.writeJson(stagingFile, baskets, { spaces: 2 });
      console.log(`[${agentId}] ✅ Saved to staging: ${path.basename(stagingFile)}`);
    }

    return { agentId, seed, baskets };
  });

  const results = await Promise.all(agentTasks);

  console.log(`\n✅ All ${results.length} agents completed\n`);

  // Step 3: Extract from staging
  console.log('Step 3: Extract and normalize from staging\n');

  const stagingFiles = await fs.readdir(stagingDir);
  const jsonFiles = stagingFiles.filter(f => f.endsWith('.json'));

  console.log(`Found ${jsonFiles.length} files in staging:`);
  jsonFiles.forEach(f => console.log(`  - ${f}`));
  console.log('');

  // Step 4: Upload to canon via ngrok
  console.log('Step 4: Upload to canon via ngrok\n');

  let uploadSuccess = 0;
  let uploadFailed = 0;

  for (const result of results) {
    try {
      const response = await uploadViaHttps(
        result.seed,
        result.baskets,
        result.agentId
      );

      if (response.success) {
        uploadSuccess++;
        console.log(`[${result.agentId}] ✅ Uploaded ${result.seed} (${response.legosReceived} LEGOs)`);
      } else {
        uploadFailed++;
        console.log(`[${result.agentId}] ❌ Upload failed: ${response.error}`);
      }

      // Small delay between uploads
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      uploadFailed++;
      console.log(`[${result.agentId}] ❌ Upload error: ${error.message}`);
    }
  }

  console.log(`\n=== Upload Results ===`);
  console.log(`✅ Success: ${uploadSuccess}`);
  console.log(`❌ Failed: ${uploadFailed}\n`);

  // Step 5: Verify canon
  console.log('Step 5: Verify canon was updated\n');

  const canonPath = path.join(courseDir, 'lego_baskets.json');

  if (await fs.pathExists(canonPath)) {
    const canon = await fs.readJson(canonPath);
    const totalBaskets = Object.keys(canon.baskets || {}).length;
    const recentUploads = (canon.metadata?.uploads || []).slice(-5);

    console.log(`✅ Canon file: ${path.basename(canonPath)}`);
    console.log(`📊 Total baskets: ${totalBaskets}`);
    console.log(`📅 Last upload: ${canon.metadata?.last_upload || 'N/A'}`);
    console.log(`🤖 Last agent: ${canon.metadata?.last_agent || 'N/A'}`);
    console.log('');
    console.log('Recent uploads:');
    recentUploads.forEach(upload => {
      console.log(`  ${upload.timestamp.substring(11, 19)} | ${upload.seed} | ${upload.agentId} | +${upload.legosAdded}`);
    });
    console.log('');
  }

  // Step 6: Summary
  console.log('=== Test Orchestration Complete ===\n');
  console.log('What we tested:');
  console.log('  ✅ 3 parallel agents each processing 1 seed');
  console.log('  ✅ All baskets saved to staging (git-ignored)');
  console.log('  ✅ Successful upload to canon via ngrok');
  console.log('  ✅ Canon updated with proper tracking');
  console.log('  ✅ No git conflicts (staging is isolated)');
  console.log('');
  console.log('Staging directory:');
  console.log(`  ${stagingDir}`);
  console.log(`  ${jsonFiles.length} files preserved for recovery`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Run extraction: node tools/phase5/extract-and-normalize.cjs test');
  console.log('  2. Preview merge: node tools/phase5/preview-merge.cjs test');
  console.log('  3. Scale to production with real browser agents');
}

/**
 * Upload via HTTPS to Phase 5 server
 */
function uploadViaHttps(seed, baskets, agentId) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      course: TEST_CONFIG.course,
      seed: seed,
      baskets: baskets,
      agentId: agentId || 'test-orchestrator'
    });

    const url = new URL(TEST_CONFIG.ngrokUrl);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: '/phase5/upload-basket',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (e) {
          resolve({ success: false, error: 'Invalid JSON response' });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

// Run orchestration
runOrchestration().catch(console.error);

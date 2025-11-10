#!/usr/bin/env node

/**
 * Spawn Claude Code on the Web agents via browser automation
 *
 * Uses osascript to open Safari/Chrome tabs with claude.ai/code
 * Prompts are passed via clipboard (since URL encoding has limits)
 *
 * Benefits:
 * - Uses Claude Pro subscription ($0 additional cost)
 * - Runs on Anthropic's servers (no local RAM for AI)
 * - Simple browser automation (no iTerm2/CLI complexity)
 *
 * Usage:
 *   node spawn_claude_web_agent.cjs --prompt "Generate baskets" --count 34
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

/**
 * Opens a single Claude Code on the Web session in browser
 * @param {string} prompt - The prompt to send to Claude
 * @param {number} agentId - Agent number (for window positioning)
 * @param {string} browser - Browser to use (safari, chrome, brave)
 * @returns {Promise<{success: boolean, tabId: string}>}
 */
async function spawnClaudeWebAgent(prompt, agentId = 1, browser = 'chrome') {
  console.log(`[Web Agent ${agentId}] Opening Claude Code on the Web in ${browser}...`);

  // Strategy: Write prompt to temp file, copy to clipboard via pbcopy, open claude.ai/code, then paste
  // (More reliable than embedding in AppleScript which has escaping issues)

  const tmpFile = `/tmp/claude_prompt_${agentId}_${Date.now()}.txt`;
  await fs.writeFile(tmpFile, prompt, 'utf8');

  // Copy to clipboard using pbcopy (avoids AppleScript escaping issues)
  await new Promise((resolve, reject) => {
    const pbcopy = spawn('pbcopy', [], { stdio: ['pipe', 'inherit', 'inherit'] });
    pbcopy.stdin.write(prompt);
    pbcopy.stdin.end();
    pbcopy.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`pbcopy failed with code ${code}`));
    });
  });

  const appleScript = `
-- Open Claude Code on the Web
tell application "${getBrowserAppName(browser)}"
    activate

    -- Open new tab with claude.ai/code
    tell window 1
        set newTab to make new tab with properties {URL:"https://claude.ai/code"}
    end tell

    -- Wait for page to load (6 seconds - page + input field)
    delay 6

    -- Click in the center of the window to focus input field
    tell application "System Events"
        -- Click to focus the textarea (center of window)
        click at {700, 400}
        delay 0.5

        -- Paste prompt with Cmd+V
        keystroke "v" using command down
        delay 1

        -- Auto-submit with Enter
        keystroke return
    end tell
end tell

-- Return success
return "success"
  `.trim();

  return new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-e', appleScript], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`[Web Agent ${agentId}] ✅ Browser tab opened successfully`);
        resolve({
          success: true,
          tabId: `web-agent-${agentId}-${Date.now()}`
        });
      } else {
        console.error(`[Web Agent ${agentId}] ❌ Failed to open browser: ${stderr}`);
        reject(new Error(`osascript exited with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Get macOS application name for browser
 */
function getBrowserAppName(browser) {
  const browserMap = {
    'safari': 'Safari',
    'chrome': 'Google Chrome',
    'brave': 'Brave Browser',
    'arc': 'Arc'
  };
  return browserMap[browser.toLowerCase()] || 'Google Chrome';
}

/**
 * Spawn multiple Claude Code on the Web agents in parallel
 * @param {Array<string>} prompts - Array of prompts for each agent
 * @param {Object} options - Configuration options
 * @returns {Promise<Array<{agentId: number, success: boolean, tabId: string}>>}
 */
async function spawnParallelAgents(prompts, options = {}) {
  const {
    browser = 'chrome',
    delayBetweenAgents = 2000, // 2 seconds between spawns to avoid overwhelming browser
    batchSize = 10 // Spawn 10 at a time
  } = options;

  console.log(`[Parallel Spawn] Starting ${prompts.length} agents in batches of ${batchSize}...`);

  const results = [];

  // Spawn in batches to avoid browser lockup
  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;

    console.log(`[Parallel Spawn] Batch ${batchNumber}: Spawning agents ${i + 1} to ${i + batch.length}...`);

    const batchResults = await Promise.all(
      batch.map((prompt, idx) =>
        spawnClaudeWebAgent(prompt, i + idx + 1, browser)
          .catch(err => ({
            success: false,
            agentId: i + idx + 1,
            error: err.message
          }))
      )
    );

    results.push(...batchResults);

    // Delay between batches
    if (i + batchSize < prompts.length) {
      console.log(`[Parallel Spawn] Waiting ${delayBetweenAgents}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenAgents));
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`[Parallel Spawn] ✅ ${successCount}/${prompts.length} agents spawned successfully`);

  return results;
}

/**
 * Simpler approach: Open all claude.ai/code tabs, then copy prompts to files
 * User manually pastes prompts from files into each tab
 */
async function spawnAgentsWithPromptFiles(prompts, outputDir) {
  console.log(`[Simple Spawn] Creating ${prompts.length} prompt files...`);

  // Create prompt files
  await fs.ensureDir(outputDir);

  const promptFiles = await Promise.all(
    prompts.map(async (prompt, idx) => {
      const agentNum = String(idx + 1).padStart(2, '0');
      const filePath = path.join(outputDir, `agent_${agentNum}_prompt.md`);
      await fs.writeFile(filePath, prompt, 'utf8');
      return filePath;
    })
  );

  console.log(`[Simple Spawn] ✅ Created ${promptFiles.length} prompt files in ${outputDir}`);

  // Open all browser tabs
  console.log(`[Simple Spawn] Opening ${prompts.length} browser tabs...`);

  const appleScript = `
tell application "Google Chrome"
    activate
    ${prompts.map((_, idx) => `
    tell window 1
        make new tab with properties {URL:"https://claude.ai/code"}
    end tell
    delay 1
    `).join('\n')}
end tell
  `.trim();

  await new Promise((resolve, reject) => {
    const child = spawn('osascript', ['-e', appleScript], {
      stdio: 'inherit'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to open browser tabs`));
      }
    });
  });

  console.log(`[Simple Spawn] ✅ Opened ${prompts.length} Claude Code tabs`);
  console.log(`[Simple Spawn] 📋 Prompt files ready in: ${outputDir}`);
  console.log(`[Simple Spawn]
Next steps:
1. Switch to each browser tab
2. Copy prompt from agent_XX_prompt.md files
3. Paste into Claude Code
4. Hit Enter to run
`);

  return {
    success: true,
    promptFiles,
    tabCount: prompts.length
  };
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node spawn_claude_web_agent.cjs [options]

Options:
  --prompt <text>       Single prompt to send
  --count <n>           Number of parallel agents (default: 1)
  --browser <name>      Browser to use: chrome, safari, brave, arc (default: chrome)
  --batch-size <n>      Agents per batch (default: 10)
  --prompts-dir <path>  Directory with agent_XX_prompt.md files
  --output-dir <path>   Output directory for generated prompt files
  --simple              Use simple approach (open tabs + prompt files)

Examples:
  # Spawn single agent
  node spawn_claude_web_agent.cjs --prompt "Generate test data"

  # Spawn 34 parallel agents with prompts from directory
  node spawn_claude_web_agent.cjs --prompts-dir ./phase5_batch2/prompts --count 34

  # Simple approach: open 34 tabs and create prompt files
  node spawn_claude_web_agent.cjs --count 34 --simple --output-dir ./phase5_batch2/prompts
    `);
    process.exit(0);
  }

  const promptArg = args.find((_, i) => args[i - 1] === '--prompt');
  const countArg = parseInt(args.find((_, i) => args[i - 1] === '--count')) || 1;
  const browserArg = args.find((_, i) => args[i - 1] === '--browser') || 'chrome';
  const batchSizeArg = parseInt(args.find((_, i) => args[i - 1] === '--batch-size')) || 10;
  const promptsDirArg = args.find((_, i) => args[i - 1] === '--prompts-dir');
  const outputDirArg = args.find((_, i) => args[i - 1] === '--output-dir');
  const simpleMode = args.includes('--simple');

  (async () => {
    try {
      if (simpleMode) {
        // Simple mode: just open tabs and create prompt files
        const prompts = Array(countArg).fill('# Agent Prompt\n\nReplace this with your actual prompt.');
        const outputDir = outputDirArg || './prompts';

        await spawnAgentsWithPromptFiles(prompts, outputDir);

      } else if (promptsDirArg) {
        // Load prompts from directory
        const promptFiles = await fs.readdir(promptsDirArg);
        const prompts = await Promise.all(
          promptFiles
            .filter(f => f.endsWith('.md'))
            .sort()
            .map(f => fs.readFile(path.join(promptsDirArg, f), 'utf8'))
        );

        await spawnParallelAgents(prompts, {
          browser: browserArg,
          batchSize: batchSizeArg
        });

      } else if (promptArg) {
        // Single prompt
        const prompts = Array(countArg).fill(promptArg);

        await spawnParallelAgents(prompts, {
          browser: browserArg,
          batchSize: batchSizeArg
        });

      } else {
        console.error('Error: Must provide --prompt, --prompts-dir, or --simple');
        process.exit(1);
      }

      console.log('\n✅ All agents spawned successfully!');

    } catch (error) {
      console.error('\n❌ Error spawning agents:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  spawnClaudeWebAgent,
  spawnParallelAgents,
  spawnAgentsWithPromptFiles
};

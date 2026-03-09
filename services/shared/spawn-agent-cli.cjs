#!/usr/bin/env node

/**
 * Spawn Claude Code CLI agents via iTerm2
 *
 * Uses osascript to open iTerm2 windows/tabs running `claude` CLI
 * Prompts are passed via stdin (no clipboard bottleneck!)
 *
 * Benefits:
 * - Uses Claude Pro Max subscription ($0 additional cost)
 * - True parallelism (each window is independent)
 * - Full visibility into agent progress
 * - Self-repair capability (CLI can see everything)
 * - Model selection (--model sonnet to avoid Opus rate limits)
 *
 * Usage:
 *   node spawn-agent-cli.cjs --prompt "Generate baskets" --count 10
 *   node spawn-agent-cli.cjs --prompts-dir ./prompts --model sonnet
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Default configuration
const DEFAULTS = {
  model: 'sonnet',           // Use Sonnet to avoid Opus rate limits
  workingDir: process.cwd(), // Working directory for Claude CLI
  timeout: 600000,           // 10 minute timeout per agent
  delayBetweenAgents: 2000,  // 2 seconds between spawns (iTerm2 setup time)
  skipPermissions: true,     // Use --dangerously-skip-permissions
  printMode: false           // Non-interactive by default (agent stays open)
};

/**
 * Spawn a single Claude CLI agent in iTerm2
 * @param {string} prompt - The prompt to send to Claude
 * @param {number} agentId - Agent number for tracking
 * @param {Object} options - Configuration options
 * @returns {Promise<{success: boolean, windowId: string, pid: number}>}
 */
async function spawnClaudeCliAgent(prompt, agentId = 1, options = {}) {
  const {
    model = DEFAULTS.model,
    workingDir = DEFAULTS.workingDir,
    skipPermissions = DEFAULTS.skipPermissions,
    printMode = DEFAULTS.printMode,
    job,
    addEvent,
    phase,
    task
  } = options;

  console.log(`[CLI Agent ${agentId}] Opening iTerm2 with Claude CLI (model: ${model})...`);

  // Emit window_opening event
  if (job && addEvent) {
    addEvent(job, {
      type: 'window_opening',
      window: agentId,
      terminal: 'iTerm2',
      model,
      phase,
      task
    });
  }

  // Write prompt to temp file
  const tmpPromptFile = `/tmp/claude_cli_prompt_${agentId}_${Date.now()}.md`;
  await fs.writeFile(tmpPromptFile, prompt, 'utf8');

  // Build claude command
  const claudeArgs = [
    `--model ${model}`,
    skipPermissions ? '--dangerously-skip-permissions' : '',
    printMode ? '--print' : '',
    `"$(cat ${tmpPromptFile})"`
  ].filter(Boolean).join(' ');

  const claudeCmd = `cd "${workingDir}" && claude ${claudeArgs}`;

  // AppleScript to open iTerm2 and run claude
  const appleScript = `
tell application "iTerm"
    activate

    -- Create new window or tab based on agent ID
    if ${agentId} = 1 then
        -- First agent: create new window
        set newWindow to (create window with default profile)
        set targetSession to current session of newWindow
    else
        -- Subsequent agents: create new tab in front window
        tell current window
            set newTab to (create tab with default profile)
            set targetSession to current session of newTab
        end tell
    end if

    -- Set window title for identification
    tell targetSession
        set name to "Claude Agent ${agentId}"
        write text "echo '=== Claude CLI Agent ${agentId} (${model}) ==='"
        delay 0.3
        write text "${claudeCmd.replace(/"/g, '\\"').replace(/'/g, "'\\''")}"
    end tell

end tell

return "spawned"
  `.trim();

  // Terminal.app fallback AppleScript
  const terminalFallbackScript = `
tell application "Terminal"
    activate
    do script "${claudeCmd.replace(/"/g, '\\"').replace(/'/g, "'\\''")}"
end tell
return "spawned"
  `.trim();

  function tryTerminal() {
    return new Promise((resolve, reject) => {
      console.log(`[CLI Agent ${agentId}] Falling back to Terminal.app...`);
      const termChild = spawn('osascript', ['-e', terminalFallbackScript], {
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let termStderr = '';
      termChild.stderr.on('data', (data) => { termStderr += data.toString(); });
      termChild.on('close', (code) => {
        if (code === 0) {
          console.log(`[CLI Agent ${agentId}] Terminal.app window opened, Claude CLI running`);
          if (job && addEvent) {
            addEvent(job, { type: 'window_ready', window: agentId, model, message: 'Claude CLI started in Terminal.app' });
          }
          resolve({ success: true, windowId: `cli-agent-${agentId}-${Date.now()}`, promptFile: tmpPromptFile, terminal: 'Terminal.app' });
        } else {
          reject(new Error(`Terminal.app osascript exited with code ${code}: ${termStderr}`));
        }
      });
      termChild.on('error', reject);
    });
  }

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
        console.log(`[CLI Agent ${agentId}] iTerm2 window opened, Claude CLI running`);

        // Emit window_ready event
        if (job && addEvent) {
          addEvent(job, {
            type: 'window_ready',
            window: agentId,
            model,
            message: 'Claude CLI started with prompt'
          });
        }

        resolve({
          success: true,
          windowId: `cli-agent-${agentId}-${Date.now()}`,
          promptFile: tmpPromptFile,
          terminal: 'iTerm2'
        });
      } else {
        console.warn(`[CLI Agent ${agentId}] iTerm2 failed (exit ${code}), trying Terminal.app...`);
        tryTerminal().then(resolve).catch(reject);
      }
    });

    child.on('error', (err) => {
      console.warn(`[CLI Agent ${agentId}] iTerm2 error: ${err.message}, trying Terminal.app...`);
      tryTerminal().then(resolve).catch(reject);
    });
  });
}

/**
 * Spawn multiple Claude CLI agents in parallel
 * Unlike browser version, these can truly run in parallel!
 * @param {Array<string>} prompts - Array of prompts for each agent
 * @param {Object} options - Configuration options
 * @returns {Promise<Array<{agentId: number, success: boolean}>>}
 */
async function spawnParallelCliAgents(prompts, options = {}) {
  const {
    model = DEFAULTS.model,
    workingDir = DEFAULTS.workingDir,
    delayBetweenAgents = DEFAULTS.delayBetweenAgents,
    batchSize = 5,           // Spawn 5 at a time to avoid overwhelming iTerm2
    ...restOptions
  } = options;

  console.log(`[Parallel CLI Spawn] Starting ${prompts.length} agents (${model})...`);
  console.log(`[Parallel CLI Spawn] Batch size: ${batchSize}, delay: ${delayBetweenAgents}ms`);

  const results = [];

  // Process in batches
  for (let batchStart = 0; batchStart < prompts.length; batchStart += batchSize) {
    const batchEnd = Math.min(batchStart + batchSize, prompts.length);
    const batchPrompts = prompts.slice(batchStart, batchEnd);

    console.log(`[Parallel CLI Spawn] Batch ${Math.floor(batchStart / batchSize) + 1}: agents ${batchStart + 1}-${batchEnd}`);

    // Spawn batch with staggered delays
    const batchPromises = batchPrompts.map(async (prompt, idx) => {
      const agentId = batchStart + idx + 1;

      // Stagger within batch
      if (idx > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenAgents * idx));
      }

      try {
        const result = await spawnClaudeCliAgent(prompt, agentId, {
          model,
          workingDir,
          ...restOptions
        });
        return { ...result, agentId };
      } catch (err) {
        console.error(`[Parallel CLI Spawn] Agent ${agentId} failed: ${err.message}`);
        return { success: false, agentId, error: err.message };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Delay between batches
    if (batchEnd < prompts.length) {
      console.log(`[Parallel CLI Spawn] Waiting 5s before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  const successCount = results.filter(r => r.success).length;
  console.log(`[Parallel CLI Spawn] ${successCount}/${prompts.length} agents spawned successfully`);

  return results;
}

/**
 * Create prompt files for agents without spawning
 * Useful for review before launching
 */
async function createPromptFiles(prompts, outputDir, options = {}) {
  const { prefix = 'agent' } = options;

  await fs.ensureDir(outputDir);

  const files = await Promise.all(
    prompts.map(async (prompt, idx) => {
      const agentNum = String(idx + 1).padStart(2, '0');
      const filePath = path.join(outputDir, `${prefix}_${agentNum}_prompt.md`);
      await fs.writeFile(filePath, prompt, 'utf8');
      return filePath;
    })
  );

  console.log(`Created ${files.length} prompt files in ${outputDir}`);
  return files;
}

/**
 * Check if claude CLI is available
 */
async function checkClaudeCliAvailable() {
  try {
    const { stdout } = await execAsync('claude --version');
    console.log(`Claude CLI available: ${stdout.trim()}`);
    return true;
  } catch (err) {
    console.error('Claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code');
    return false;
  }
}

/**
 * Check if iTerm2 is available
 */
async function checkITermAvailable() {
  try {
    await execAsync('osascript -e \'tell application "System Events" to name of processes contains "iTerm2"\'');
    return true;
  } catch (err) {
    // Check if app exists even if not running
    try {
      await execAsync('ls /Applications/iTerm.app');
      return true;
    } catch {
      console.error('iTerm2 not found. Install from: https://iterm2.com/');
      return false;
    }
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node spawn-agent-cli.cjs [options]

Options:
  --prompt <text>       Single prompt to send
  --count <n>           Number of parallel agents (default: 1)
  --model <name>        Claude model: sonnet, opus, haiku (default: sonnet)
  --working-dir <path>  Working directory for Claude CLI
  --prompts-dir <path>  Directory with agent_XX_prompt.md files
  --output-dir <path>   Create prompt files without spawning
  --batch-size <n>      Agents per batch (default: 5)
  --delay <ms>          Delay between agent spawns (default: 2000)
  --print               Use --print mode (non-interactive, exit after response)
  --no-skip-permissions Don't use --dangerously-skip-permissions
  --check               Check if claude CLI and iTerm2 are available

Examples:
  # Check prerequisites
  node spawn-agent-cli.cjs --check

  # Spawn single agent with Sonnet
  node spawn-agent-cli.cjs --prompt "Generate test data" --model sonnet

  # Spawn 10 parallel agents
  node spawn-agent-cli.cjs --prompt "Process batch" --count 10

  # Spawn agents from prompt files
  node spawn-agent-cli.cjs --prompts-dir ./prompts --model sonnet

  # Create prompt files for review (no spawning)
  node spawn-agent-cli.cjs --count 10 --output-dir ./prompts
    `);
    process.exit(0);
  }

  // Parse arguments
  const getArg = (name) => args.find((_, i) => args[i - 1] === name);
  const getIntArg = (name, def) => parseInt(getArg(name)) || def;

  const promptArg = getArg('--prompt');
  const countArg = getIntArg('--count', 1);
  const modelArg = getArg('--model') || DEFAULTS.model;
  const workingDirArg = getArg('--working-dir') || process.cwd();
  const promptsDirArg = getArg('--prompts-dir');
  const outputDirArg = getArg('--output-dir');
  const batchSizeArg = getIntArg('--batch-size', 5);
  const delayArg = getIntArg('--delay', DEFAULTS.delayBetweenAgents);
  const printMode = args.includes('--print');
  const skipPermissions = !args.includes('--no-skip-permissions');
  const checkMode = args.includes('--check');

  (async () => {
    try {
      // Check mode - verify prerequisites
      if (checkMode) {
        console.log('Checking prerequisites...\n');
        const cliOk = await checkClaudeCliAvailable();
        const itermOk = await checkITermAvailable();

        if (cliOk && itermOk) {
          console.log('\nAll prerequisites met!');
          process.exit(0);
        } else {
          console.log('\nSome prerequisites missing.');
          process.exit(1);
        }
      }

      // Verify prerequisites
      const cliAvailable = await checkClaudeCliAvailable();
      if (!cliAvailable) {
        process.exit(1);
      }

      if (outputDirArg) {
        // Create prompt files only (no spawning)
        const prompts = promptArg
          ? Array(countArg).fill(promptArg)
          : Array(countArg).fill('# Agent Prompt\n\nReplace with actual prompt.');

        await createPromptFiles(prompts, outputDirArg);
        console.log(`\nPrompt files created in: ${outputDirArg}`);
        console.log('Review files, then run again with --prompts-dir to spawn agents.');

      } else if (promptsDirArg) {
        // Load prompts from directory
        const promptFiles = (await fs.readdir(promptsDirArg))
          .filter(f => f.endsWith('.md'))
          .sort();

        const prompts = await Promise.all(
          promptFiles.map(f => fs.readFile(path.join(promptsDirArg, f), 'utf8'))
        );

        console.log(`Loaded ${prompts.length} prompts from ${promptsDirArg}`);

        await spawnParallelCliAgents(prompts, {
          model: modelArg,
          workingDir: workingDirArg,
          batchSize: batchSizeArg,
          delayBetweenAgents: delayArg,
          printMode,
          skipPermissions
        });

      } else if (promptArg) {
        // Single or multiple agents with same prompt
        const prompts = Array(countArg).fill(promptArg);

        await spawnParallelCliAgents(prompts, {
          model: modelArg,
          workingDir: workingDirArg,
          batchSize: batchSizeArg,
          delayBetweenAgents: delayArg,
          printMode,
          skipPermissions
        });

      } else {
        console.error('Error: Must provide --prompt, --prompts-dir, or --output-dir');
        console.error('Use --help for usage information.');
        process.exit(1);
      }

      console.log('\nAll agents spawned successfully!');

    } catch (error) {
      console.error('\nError spawning agents:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  spawnClaudeCliAgent,
  spawnParallelCliAgents,
  createPromptFiles,
  checkClaudeCliAvailable,
  checkITermAvailable,
  DEFAULTS
};

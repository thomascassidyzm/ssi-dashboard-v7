#!/usr/bin/env node

/**
 * Unified Agent Spawner
 *
 * Single interface for spawning Claude agents via:
 * - Browser (Safari/Chrome) with Claude Code on Web
 * - iTerm2 with Claude Code CLI
 *
 * Usage:
 *   node spawn-agent-unified.cjs --mode browser --prompt "..." --count 10
 *   node spawn-agent-unified.cjs --mode cli --prompt "..." --count 10 --model sonnet
 */

const browserSpawner = require('./spawn-agent.cjs');
const cliSpawner = require('./spawn-agent-cli.cjs');

// Spawner modes
const MODES = {
  BROWSER: 'browser',  // Safari/Chrome with Claude Code on Web
  CLI: 'cli'           // iTerm2 with Claude Code CLI
};

/**
 * Get recommended mode based on task characteristics
 */
function getRecommendedMode(options = {}) {
  const { agentCount = 1, needsParallel = false, needsVisibility = false } = options;

  // CLI is better for:
  // - True parallelism (no clipboard bottleneck)
  // - Full visibility into agent progress
  // - Self-repair capability
  // - When using Sonnet to avoid Opus rate limits

  // Browser is better for:
  // - Using Pro subscription only (not Pro Max)
  // - When iTerm2 is not available

  if (needsParallel && agentCount > 1) {
    return MODES.CLI;
  }

  if (needsVisibility) {
    return MODES.CLI;
  }

  // Default to CLI for new projects
  return MODES.CLI;
}

/**
 * Spawn agents using the specified mode
 * @param {Array<string>} prompts - Prompts for each agent
 * @param {Object} options - Configuration options
 * @returns {Promise<Array>}
 */
async function spawnAgents(prompts, options = {}) {
  const {
    mode = MODES.CLI,
    model = 'sonnet',
    browser = 'chrome',
    workingDir = process.cwd(),
    batchSize = 5,
    delayBetweenAgents = 2000,
    job,
    addEvent,
    phase,
    task
  } = options;

  console.log(`[Unified Spawner] Mode: ${mode}, Count: ${prompts.length}`);

  if (mode === MODES.CLI) {
    // Use iTerm2 + Claude CLI
    const cliAvailable = await cliSpawner.checkClaudeCliAvailable();
    if (!cliAvailable) {
      console.warn('[Unified Spawner] Claude CLI not available, falling back to browser mode');
      return spawnAgents(prompts, { ...options, mode: MODES.BROWSER });
    }

    return cliSpawner.spawnParallelCliAgents(prompts, {
      model,
      workingDir,
      batchSize,
      delayBetweenAgents,
      job,
      addEvent,
      phase,
      task
    });

  } else {
    // Use browser (Safari/Chrome)
    return browserSpawner.spawnParallelAgents(prompts, {
      browser,
      batchSize,
      delayBetweenAgents,
      job,
      addEvent,
      phase,
      task
    });
  }
}

/**
 * Spawn a single agent
 */
async function spawnSingleAgent(prompt, options = {}) {
  const results = await spawnAgents([prompt], options);
  return results[0];
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node spawn-agent-unified.cjs [options]

Options:
  --mode <mode>         Spawner mode: cli (default), browser
  --prompt <text>       Prompt to send
  --count <n>           Number of agents (default: 1)
  --model <name>        Model for CLI mode: sonnet (default), opus, haiku
  --browser <name>      Browser for browser mode: chrome (default), safari, brave
  --working-dir <path>  Working directory for CLI mode
  --prompts-dir <path>  Load prompts from directory
  --batch-size <n>      Agents per batch (default: 5)
  --delay <ms>          Delay between spawns (default: 2000)

Mode Comparison:
  cli     - iTerm2 + Claude CLI (true parallelism, --model sonnet)
  browser - Safari/Chrome + Claude Web (sequential, clipboard-based)

Examples:
  # Spawn 10 CLI agents with Sonnet
  node spawn-agent-unified.cjs --mode cli --prompt "Process batch" --count 10 --model sonnet

  # Spawn browser agents (sequential)
  node spawn-agent-unified.cjs --mode browser --prompt "Process batch" --count 5
    `);
    process.exit(0);
  }

  const getArg = (name) => args.find((_, i) => args[i - 1] === name);
  const getIntArg = (name, def) => parseInt(getArg(name)) || def;

  const modeArg = getArg('--mode') || MODES.CLI;
  const promptArg = getArg('--prompt');
  const countArg = getIntArg('--count', 1);
  const modelArg = getArg('--model') || 'sonnet';
  const browserArg = getArg('--browser') || 'chrome';
  const workingDirArg = getArg('--working-dir') || process.cwd();
  const promptsDirArg = getArg('--prompts-dir');
  const batchSizeArg = getIntArg('--batch-size', 5);
  const delayArg = getIntArg('--delay', 2000);

  (async () => {
    try {
      let prompts;

      if (promptsDirArg) {
        const fs = require('fs-extra');
        const path = require('path');
        const files = (await fs.readdir(promptsDirArg))
          .filter(f => f.endsWith('.md'))
          .sort();
        prompts = await Promise.all(
          files.map(f => fs.readFile(path.join(promptsDirArg, f), 'utf8'))
        );
        console.log(`Loaded ${prompts.length} prompts from ${promptsDirArg}`);
      } else if (promptArg) {
        prompts = Array(countArg).fill(promptArg);
      } else {
        console.error('Error: Must provide --prompt or --prompts-dir');
        process.exit(1);
      }

      await spawnAgents(prompts, {
        mode: modeArg,
        model: modelArg,
        browser: browserArg,
        workingDir: workingDirArg,
        batchSize: batchSizeArg,
        delayBetweenAgents: delayArg
      });

      console.log('\nAll agents spawned!');

    } catch (error) {
      console.error('\nError:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  MODES,
  getRecommendedMode,
  spawnAgents,
  spawnSingleAgent
};

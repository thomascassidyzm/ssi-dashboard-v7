#!/usr/bin/env node

/**
 * Spawn Claude Code CLI agents via Terminal.app
 *
 * Companion to spawn-agent-cli.cjs (iTerm2) - allows using a second
 * Pro Max account logged into Terminal for parallel course builds.
 *
 * Usage:
 *   node spawn-agent-terminal.cjs --prompt "Build course" --model sonnet
 */

const fs = require('fs-extra');
const path = require('path');
const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

const DEFAULTS = {
  model: 'sonnet',
  workingDir: process.cwd(),
  timeout: 600000,
  skipPermissions: true
};

/**
 * Spawn a single Claude CLI agent in Terminal.app
 */
async function spawnClaudeTerminalAgent(prompt, agentId = 1, options = {}) {
  const {
    model = DEFAULTS.model,
    workingDir = DEFAULTS.workingDir,
    skipPermissions = DEFAULTS.skipPermissions,
    job,
    addEvent
  } = options;

  console.log(`[Terminal Agent ${agentId}] Opening Terminal.app with Claude CLI (model: ${model})...`);

  if (job && addEvent) {
    addEvent(job, {
      type: 'window_opening',
      window: agentId,
      terminal: 'Terminal.app',
      model
    });
  }

  // Write prompt to temp file
  const tmpPromptFile = `/tmp/claude_terminal_prompt_${agentId}_${Date.now()}.md`;
  await fs.writeFile(tmpPromptFile, prompt, 'utf8');

  // Build claude command
  const claudeArgs = [
    `--model ${model}`,
    skipPermissions ? '--dangerously-skip-permissions' : '',
    `"$(cat ${tmpPromptFile})"`
  ].filter(Boolean).join(' ');

  const claudeCmd = `cd "${workingDir}" && claude ${claudeArgs}`;

  // AppleScript to open Terminal.app and run claude
  const appleScript = `
tell application "Terminal"
    activate

    -- Create new window or tab based on agent ID
    if ${agentId} = 1 then
        -- First agent: create new window
        do script "echo '=== Claude Terminal Agent ${agentId} (${model}) ===' && ${claudeCmd.replace(/"/g, '\\"').replace(/'/g, "'\\''")}"
    else
        -- Subsequent agents: create new tab
        tell application "System Events"
            keystroke "t" using command down
        end tell
        delay 0.5
        do script "echo '=== Claude Terminal Agent ${agentId} (${model}) ===' && ${claudeCmd.replace(/"/g, '\\"').replace(/'/g, "'\\''")}" in front window
    end if

end tell

return "spawned"
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
        console.log(`[Terminal Agent ${agentId}] Terminal.app window opened, Claude CLI running`);

        if (job && addEvent) {
          addEvent(job, {
            type: 'window_ready',
            window: agentId,
            terminal: 'Terminal.app',
            model,
            message: 'Claude CLI started with prompt'
          });
        }

        resolve({
          success: true,
          windowId: `terminal-agent-${agentId}-${Date.now()}`,
          promptFile: tmpPromptFile
        });
      } else {
        console.error(`[Terminal Agent ${agentId}] Failed to open Terminal: ${stderr}`);
        reject(new Error(`osascript exited with code ${code}: ${stderr}`));
      }
    });

    child.on('error', reject);
  });
}

/**
 * Check if Terminal.app is available (always true on macOS)
 */
async function checkTerminalAvailable() {
  try {
    await execAsync('ls /System/Applications/Utilities/Terminal.app || ls /Applications/Utilities/Terminal.app');
    return true;
  } catch {
    console.error('Terminal.app not found (unusual for macOS)');
    return false;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node spawn-agent-terminal.cjs [options]

Options:
  --prompt <text>       Prompt to send to Claude
  --model <name>        Claude model: sonnet, opus, haiku (default: opus)
  --working-dir <path>  Working directory for Claude CLI
  --check               Check if Terminal.app is available

Examples:
  node spawn-agent-terminal.cjs --check
  node spawn-agent-terminal.cjs --prompt "Build Chinese course" --model sonnet
    `);
    process.exit(0);
  }

  const getArg = (name) => args.find((_, i) => args[i - 1] === name);
  const promptArg = getArg('--prompt');
  const modelArg = getArg('--model') || DEFAULTS.model;
  const workingDirArg = getArg('--working-dir') || process.cwd();
  const checkMode = args.includes('--check');

  (async () => {
    try {
      if (checkMode) {
        const ok = await checkTerminalAvailable();
        process.exit(ok ? 0 : 1);
      }

      if (!promptArg) {
        console.error('Error: --prompt required');
        process.exit(1);
      }

      await spawnClaudeTerminalAgent(promptArg, 1, {
        model: modelArg,
        workingDir: workingDirArg
      });

      console.log('\nAgent spawned in Terminal.app');

    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  spawnClaudeTerminalAgent,
  checkTerminalAvailable,
  DEFAULTS
};

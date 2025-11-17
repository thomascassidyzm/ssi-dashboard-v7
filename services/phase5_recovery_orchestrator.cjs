#!/usr/bin/env node

/**
 * Phase 5 Recovery Orchestrator Service
 *
 * Integrated service for detecting missing baskets and orchestrating recovery.
 * Part of the SSi Dashboard automation architecture.
 *
 * Architecture Flow:
 *   Dashboard UI → automation_server.cjs → phase5_recovery_orchestrator.cjs
 *   → detect_missing_baskets.cjs → generate_recovery_prompts.cjs → Safari/Claude Code
 *
 * Features:
 *   - Auto-detects missing baskets from GitHub branches
 *   - Dynamically calculates optimal seeds-per-agent
 *   - Generates 12 orchestrator prompts
 *   - Launches Safari tabs with Claude Code
 *   - Tracks recovery progress
 *   - Integrates with Phase 5 validation gates
 */

const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

class Phase5RecoveryOrchestrator {
  constructor(config = {}) {
    this.config = {
      vfsRoot: config.vfsRoot || path.join(__dirname, '..', 'public', 'vfs', 'courses'),
      scriptsRoot: config.scriptsRoot || path.join(__dirname, '..', 'scripts'),
      outputDir: config.outputDir || path.join(__dirname, '..', '.claude', 'recovery_prompts'),
      ...config
    };

    this.logger = config.logger || console;
  }

  /**
   * Main recovery workflow
   * @param {string} courseCode - Course code (e.g., 'cmn_for_eng')
   * @param {Object} options - Recovery options
   * @returns {Promise<Object>} Recovery status and metadata
   */
  async runRecovery(courseCode, options = {}) {
    this.logger.log('═══════════════════════════════════════════════════════════');
    this.logger.log('PHASE 5 RECOVERY ORCHESTRATOR');
    this.logger.log('═══════════════════════════════════════════════════════════\n');
    this.logger.log(`Course: ${courseCode}\n`);

    try {
      // Step 1: Detect missing baskets
      this.logger.log('Step 1: Detecting missing baskets...');
      const gapAnalysis = await this.detectGaps(courseCode);

      if (gapAnalysis.missing_count === 0) {
        this.logger.log('\n✅ No missing baskets - recovery not needed!\n');
        return {
          success: true,
          recovery_needed: false,
          message: 'All baskets complete'
        };
      }

      this.logger.log(`\nFound ${gapAnalysis.missing_count} missing seeds`);
      this.logger.log(`Recovery strategy: ${gapAnalysis.recovery_params.num_windows} windows × ${gapAnalysis.recovery_params.agents_per_window} agents × ${gapAnalysis.recovery_params.seeds_per_agent} seeds\n`);

      // Step 2: Generate recovery prompts
      this.logger.log('Step 2: Generating recovery orchestrator prompts...');
      const prompts = await this.generatePrompts(courseCode, gapAnalysis);

      this.logger.log(`\nGenerated ${prompts.count} orchestrator prompts`);
      this.logger.log(`Prompts saved to: ${prompts.directory}\n`);

      // Step 3: Launch browsers (if requested)
      if (options.autoLaunch !== false) {
        this.logger.log('Step 3: Launching Safari tabs with Claude Code...');
        await this.launchBrowsers(prompts.count);
        this.logger.log('\n✅ Safari tabs launched\n');
      }

      // Step 4: Return recovery metadata
      const recovery = {
        success: true,
        recovery_needed: true,
        course: courseCode,
        missing_seeds: gapAnalysis.missing_count,
        recovery_params: gapAnalysis.recovery_params,
        prompts: {
          count: prompts.count,
          directory: prompts.directory,
          files: prompts.files
        },
        next_steps: [
          'Wait for Claude Code tabs to load',
          'Paste corresponding prompt in each tab',
          'Replace {SESSION_ID} with actual session ID',
          'Monitor progress via GitHub branches'
        ]
      };

      this.logger.log('═══════════════════════════════════════════════════════════');
      this.logger.log('RECOVERY ORCHESTRATION COMPLETE');
      this.logger.log('═══════════════════════════════════════════════════════════\n');

      return recovery;

    } catch (error) {
      this.logger.error('❌ Recovery orchestration failed:', error.message);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * Detect missing baskets from GitHub branches
   */
  async detectGaps(courseCode) {
    const detectScript = path.join(this.config.scriptsRoot, 'detect_missing_baskets.cjs');

    if (!fs.existsSync(detectScript)) {
      throw new Error(`Detection script not found: ${detectScript}`);
    }

    // Run detection script
    execSync(`node "${detectScript}" ${courseCode}`, {
      cwd: path.join(this.config.scriptsRoot, '..'),
      stdio: 'inherit'
    });

    // Read analysis output
    const analysisPath = path.join(this.config.scriptsRoot, '..', 'missing_seeds.json');
    if (!fs.existsSync(analysisPath)) {
      throw new Error('Gap detection did not produce missing_seeds.json');
    }

    const analysis = await fs.readJSON(analysisPath);
    return analysis;
  }

  /**
   * Generate recovery orchestrator prompts
   */
  async generatePrompts(courseCode, gapAnalysis) {
    const generateScript = path.join(this.config.scriptsRoot, 'generate_recovery_prompts.cjs');

    if (!fs.existsSync(generateScript)) {
      throw new Error(`Generation script not found: ${generateScript}`);
    }

    // Run prompt generation script
    execSync(`node "${generateScript}" ${courseCode}`, {
      cwd: path.join(this.config.scriptsRoot, '..'),
      stdio: 'inherit'
    });

    // List generated prompts
    const promptsDir = this.config.outputDir;
    const promptFiles = (await fs.readdir(promptsDir))
      .filter(f => f.startsWith('window_') && f.endsWith('.md'))
      .sort();

    return {
      count: promptFiles.length,
      directory: promptsDir,
      files: promptFiles
    };
  }

  /**
   * Launch Safari tabs with Claude Code
   */
  async launchBrowsers(windowCount) {
    const appleScript = `
tell application "Safari"
  activate

  -- Create new window with first tab
  make new document
  set URL of document 1 to "https://claude.ai/code"
  delay 2

  -- Open additional tabs
  repeat with i from 2 to ${windowCount}
    tell window 1
      make new tab at end of tabs
      set current tab to last tab
      set URL of current tab to "https://claude.ai/code"
      delay 1
    end tell
  end repeat

  -- Return to first tab
  set current tab of window 1 to tab 1 of window 1
end tell
`;

    execSync(`osascript -e '${appleScript.replace(/'/g, `'\\''`)}'`, {
      stdio: 'inherit'
    });
  }

  /**
   * Check recovery status
   * @param {string} courseCode - Course code
   * @returns {Promise<Object>} Current status of recovery operation
   */
  async checkStatus(courseCode) {
    const analysisPath = path.join(this.config.scriptsRoot, '..', 'missing_seeds.json');

    if (!fs.existsSync(analysisPath)) {
      return {
        status: 'not_started',
        message: 'No recovery analysis found'
      };
    }

    const analysis = await fs.readJSON(analysisPath);

    // Re-check GitHub to see if gaps have been filled
    const currentGaps = await this.detectGaps(courseCode);

    const filled = analysis.missing_count - currentGaps.missing_count;
    const progress = (filled / analysis.missing_count) * 100;

    return {
      status: currentGaps.missing_count === 0 ? 'complete' : 'in_progress',
      initial_missing: analysis.missing_count,
      current_missing: currentGaps.missing_count,
      filled: filled,
      progress: progress.toFixed(1) + '%',
      remaining_seeds: currentGaps.missing_seeds
    };
  }
}

// Export for use as module
module.exports = Phase5RecoveryOrchestrator;

// Allow running as standalone CLI
if (require.main === module) {
  const courseCode = process.argv[2];
  const autoLaunch = process.argv[3] !== '--no-launch';

  if (!courseCode) {
    console.error('Usage: node phase5_recovery_orchestrator.cjs <course_code> [--no-launch]');
    console.error('Example: node phase5_recovery_orchestrator.cjs cmn_for_eng');
    process.exit(1);
  }

  const orchestrator = new Phase5RecoveryOrchestrator();
  orchestrator.runRecovery(courseCode, { autoLaunch })
    .then(result => {
      if (result.success) {
        console.log('\n✅ Recovery orchestration successful\n');
        if (result.recovery_needed) {
          console.log(`Next: Paste prompts from ${result.prompts.directory}\n`);
        }
        process.exit(0);
      } else {
        console.error('\n❌ Recovery orchestration failed\n');
        console.error(result.error);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('\n❌ Unexpected error:', err);
      process.exit(1);
    });
}

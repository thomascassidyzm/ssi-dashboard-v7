/**
 * Agent spawner — spawn Claude agents in iTerm2/Terminal/headless mode.
 * Contains brief generation and process spawning logic.
 * Stateful: uses ctx for supabase, config.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getLanguageName, getGoldenSeedCount, getLangFamily, PREPOSITIONS } = require('./language-config.cjs');
const { classifySeedPattern, formatDecompositionPatterns } = require('./validation.cjs');

const MAX_CONCURRENT_AGENTS = parseInt(process.env.MAX_CONCURRENT_AGENTS) || 12;

/**
 * Spawn a process in the configured terminal mode.
 * Returns the child process (or null for osascript).
 * Enforces MAX_CONCURRENT_AGENTS cap before spawning.
 */
function spawnInTerminal(ctx, cmd, label, courseCode) {
  const running = getRunningAgentCount();
  if (running >= MAX_CONCURRENT_AGENTS) {
    throw new Error(`Agent cap reached: ${running}/${MAX_CONCURRENT_AGENTS} agents running. Not spawning "${label}" for ${courseCode}.`);
  }
  const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : ctx.SPAWN_MODE;

  if (effectiveTerminal === 'headless') {
    const logsDir = path.join(ctx.PROJECT_DIR, 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    const logFile = `${logsDir}/${label}-${courseCode}.log`;
    const out = fs.openSync(logFile, 'a');
    const err = fs.openSync(logFile, 'a');

    const agent = spawn('bash', ['-c', cmd], { stdio: ['ignore', out, err], detached: true });
    agent.unref();
    console.log(`[SPAWN] ${label} launched headless (pid: ${agent.pid}, log: ${logFile})`);

    agent.on('error', (e) => console.error(`[SPAWN] ${label} error:`, e.message));
    agent.on('exit', (code) => console.log(`[SPAWN] ${label} exited (code: ${code})`));

    return agent;
  } else {
    const escapedCmd = cmd.replace(/"/g, '\\"');
    const osascript = effectiveTerminal === 'iTerm2'
      ? `tell application "iTerm"
  activate
  set newWindow to (create window with default profile)
  tell current session of newWindow
    set name to "${label}: ${courseCode}"
    write text "${escapedCmd}"
  end tell
end tell`
      : `tell application "Terminal"
  activate
  do script "${escapedCmd}"
end tell`;

    const agent = spawn('osascript', ['-e', osascript], { stdio: 'pipe', detached: true });
    agent.on('error', (e) => console.error(`[SPAWN] ${label} osascript error:`, e.message));
    agent.on('exit', (code) => console.log(`[SPAWN] ${label} terminal launched (osascript exit: ${code})`));

    return agent;
  }
}

/**
 * Fetch golden seed examples from DB (LEGOs + BUILD/USE phrases).
 */
async function fetchGoldenSeedExamples(ctx, courseCode, seedNumbers = [2, 5, 8]) {
  const examples = [];
  for (const seedNum of seedNumbers) {
    const { data: seed } = await ctx.supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .single();
    if (!seed) continue;

    const { data: legos } = await ctx.supabase
      .from('course_legos')
      .select('lego_index, type, known_text, target_text, components')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .order('lego_index');

    const { data: phrases } = await ctx.supabase
      .from('course_practice_phrases')
      .select('lego_index, known_text, target_text, phrase_role, metadata')
      .eq('course_code', courseCode)
      .eq('seed_number', seedNum)
      .order('lego_index')
      .order('position');

    if (!legos || legos.length === 0) continue;

    const legoArray = legos.map(lego => {
      const legoPhrases = (phrases || []).filter(p => p.lego_index === lego.lego_index);
      const buildPhrases = legoPhrases
        .filter(p => p.phrase_role === 'build' || p.phrase_role === 'practice')
        .map(p => ({ known: p.known_text, target: p.target_text }));
      const usePhrases = legoPhrases
        .filter(p => p.phrase_role === 'use')
        .map(p => ({ known: p.known_text, target: p.target_text, score: p.metadata?.score || 7 }));

      const entry = {
        idx: lego.lego_index,
        type: lego.type,
        known: lego.known_text,
        target: lego.target_text,
        build: buildPhrases,
        use: usePhrases,
      };
      if (lego.components && lego.components.length > 0) {
        entry.components = lego.components;
      }
      return entry;
    });

    examples.push({
      course_code: courseCode,
      seed_number: seedNum,
      known_text: seed.known_text,
      target_text: seed.target_text,
      legos: legoArray,
    });
  }
  return examples;
}

/**
 * Build cross-course summaries for seeds 1-N.
 */
async function buildCrossCourseSummaries(ctx, maxSeed = 5) {
  const lines = [];
  for (let n = 1; n <= maxSeed; n++) {
    const { data: courses } = await ctx.supabase
      .from('courses')
      .select('course_code, display_name, quality_rules')
      .not('quality_rules', 'is', null);

    if (!courses || courses.length === 0) continue;

    const comparisons = [];
    for (const course of courses) {
      const goldenCount = course.quality_rules?.golden_seed_count || 10;
      if (goldenCount < 50) continue;

      const golden = course.quality_rules?.golden_decompositions || [];
      const seed = golden.find(g => g.seed_number === n);
      if (!seed) continue;

      const legoSummary = (seed.legos || []).map(l => {
        const label = l.type === 'M' ? 'M' : 'A';
        return `${label}: "${l.known}" → "${l.target}"`;
      });

      comparisons.push({
        course: course.course_code,
        name: course.display_name,
        known: seed.known_text,
        target: seed.target_text,
        legos: legoSummary,
        insight: seed.key_insight || '',
      });
    }

    if (comparisons.length === 0) continue;

    lines.push(`### Seed ${n}: "${comparisons[0].known}"`);
    for (const c of comparisons) {
      lines.push(`**${c.course}** (${c.name}): ${c.target}`);
      lines.push(`  LEGOs: ${c.legos.join(' | ')}`);
      if (c.insight) lines.push(`  Insight: ${c.insight}`);
    }
    lines.push('');
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

/**
 * Spawn golden seed builder agents (Creator + Checker).
 */
async function spawnGoldenBuildAgents(ctx, courseCode, targetSeeds = 50, terminal = 'iTerm2', dryRun = false, phase = 'golden') {
  // This is a large function — for the initial split we delegate to the original monolith
  // and will fully extract the brief generation in Phase D.
  // For now, this module provides the spawning infrastructure.
  throw new Error('spawnGoldenBuildAgents: use the route handler which still contains brief generation');
}

/**
 * Spawn a translation agent for a course.
 */
async function spawnTranslationAgent(ctx, courseCode, terminal = 'iTerm2', dryRun = false) {
  throw new Error('spawnTranslationAgent: use the route handler which still contains brief generation');
}

/**
 * Spawn parallel QA coordinator agent.
 */
async function spawnParallelQAAgent(ctx, courseCode, terminal = 'iTerm2') {
  throw new Error('spawnParallelQAAgent: use the route handler which still contains brief generation');
}

/**
 * Spawn parallel build coordinator agent.
 */
async function spawnParallelBuildAgent(ctx, courseCode, agentNumber, terminal = 'iTerm2') {
  throw new Error('spawnParallelBuildAgent: use the route handler which still contains brief generation');
}

/**
 * Get running Claude agent count.
 */
function getRunningAgentCount() {
  try {
    const { execSync } = require('child_process');
    const output = execSync('pgrep -f "claude --model" 2>/dev/null || true', { encoding: 'utf8' });
    return output.trim().split('\n').filter(l => l.trim()).length;
  } catch (e) {
    return 0;
  }
}

module.exports = {
  MAX_CONCURRENT_AGENTS,
  spawnInTerminal,
  fetchGoldenSeedExamples,
  buildCrossCourseSummaries,
  spawnGoldenBuildAgents,
  spawnTranslationAgent,
  spawnParallelQAAgent,
  spawnParallelBuildAgent,
  getRunningAgentCount,
};

/**
 * Build routes — translate, decompose, stop, status, seed-grid, rebuild (wipe only).
 * No auto-spawning. No checkpoints. No old pipeline stages.
 */

const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const { getBuildProgress, stopBuild, getBuildStatus } = require('../lib/build-manager.cjs');
const { spawnInTerminal } = require('../lib/agent-spawner.cjs');

module.exports = function (ctx) {
  const router = Router();

  // POST /build/stop/:courseCode
  router.post('/build/stop/:courseCode', async (req, res) => {
    const result = await stopBuild(ctx, req.params.courseCode);
    ctx.emitPipelineEvent(req.params.courseCode, 'build:status', { active: false });
    res.json(result);
  });

  // GET /build/status/:courseCode
  router.get('/build/status/:courseCode', async (req, res) => {
    try {
      res.json(await getBuildStatus(ctx, req.params.courseCode));
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /build/rebuild/:courseCode — Wipe seeds (no spawn)
  router.post('/build/rebuild/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { from_seed = 1, to_seed = 300 } = req.body || {};

    try {
      if (from_seed < 1 || to_seed < from_seed) {
        return res.status(400).json({ ok: false, error: `Invalid range: ${from_seed}-${to_seed}` });
      }

      const { count: phrasesDeleted } = await ctx.supabase
        .from('course_practice_phrases').delete({ count: 'exact' })
        .eq('course_code', courseCode)
        .gte('seed_number', from_seed).lte('seed_number', to_seed);

      const { count: legosDeleted } = await ctx.supabase
        .from('course_legos').delete({ count: 'exact' })
        .eq('course_code', courseCode)
        .gte('seed_number', from_seed).lte('seed_number', to_seed);

      const { count: seedsReset } = await ctx.supabase
        .from('course_seeds').update({ decomposed_at: null, approved_at: null }, { count: 'exact' })
        .eq('course_code', courseCode)
        .gte('seed_number', from_seed).lte('seed_number', to_seed);

      ctx.courseVocabCache.delete(courseCode);

      res.json({
        ok: true,
        seeds_to_build: to_seed - from_seed + 1,
        phrases_deleted: phrasesDeleted || 0,
        legos_deleted: legosDeleted || 0,
        seeds_reset: seedsReset || 0
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /build/seed-grid/:courseCode
  router.get('/build/seed-grid/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    try {
      const { data: courseData } = await ctx.supabase
        .from('courses').select('seed_count').eq('course_code', courseCode).single();
      const maxSeed = courseData?.seed_count || 300;

      const { data: seeds } = await ctx.supabase
        .from('course_seeds').select('seed_number, decomposed_at, approved_at')
        .eq('course_code', courseCode).lte('seed_number', maxSeed).order('seed_number');

      const { data: legoCounts } = await ctx.supabase
        .from('course_legos').select('seed_number')
        .eq('course_code', courseCode).lte('seed_number', maxSeed);

      const { data: phraseCounts } = await ctx.supabase
        .from('course_practice_phrases').select('seed_number')
        .eq('course_code', courseCode).lte('seed_number', maxSeed);

      const legosBySeed = {};
      for (const l of legoCounts || []) legosBySeed[l.seed_number] = (legosBySeed[l.seed_number] || 0) + 1;

      const phrasesBySeed = {};
      for (const p of phraseCounts || []) phrasesBySeed[p.seed_number] = (phrasesBySeed[p.seed_number] || 0) + 1;

      let complete = 0, drafted = 0, building = 0, empty = 0;
      const grid = (seeds || []).map(s => {
        const legos = legosBySeed[s.seed_number] || 0;
        const phrases = phrasesBySeed[s.seed_number] || 0;
        let status;
        if (s.approved_at) { status = 'complete'; complete++; }
        else if (s.decomposed_at) { status = 'drafted'; drafted++; }
        else if (legos > 0) { status = 'building'; building++; }
        else { status = 'empty'; empty++; }
        return { seed: s.seed_number, status, legos, phrases };
      });

      res.json({ seeds: grid, total: grid.length, complete, drafted, building, empty });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /build/translate/:courseCode
  router.post('/build/translate/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.query.terminal || 'iTerm2';

      const { data: activeJob } = await ctx.supabase
        .from('build_jobs').select('id')
        .eq('course_code', courseCode).eq('pass', 'translate').in('status', ['running']).maybeSingle();
      if (activeJob) return res.status(409).json({ error: 'Translation already running' });

      const briefResp = await fetch(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/translate`);
      if (!briefResp.ok) throw new Error(`Failed to fetch translate brief: ${briefResp.status}`);
      const brief = await briefResp.text();

      const tmpFile = `/tmp/translate_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      const { data: jobData } = await ctx.supabase
        .from('build_jobs')
        .insert({
          course_code: courseCode, pass: 'translate', status: 'running',
          current_seed: 0, seeds_completed: 0, total_seeds: 668,
          started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard', terminal: effectiveTerminal,
          agent_count: 1, respawn_count: 0, machine_name: ctx.MACHINE_NAME, build_mode: 'translate'
        })
        .select('id').single();

      const claudeCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      spawnInTerminal(ctx, claudeCmd, 'Translate', courseCode);

      res.json({ ok: true, course_code: courseCode, job_id: jobData?.id, message: `Translation agent spawned` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /build/decompose/:courseCode
  router.post('/build/decompose/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.query.terminal || 'iTerm2';

      const { data: activeJob } = await ctx.supabase
        .from('build_jobs').select('id')
        .eq('course_code', courseCode).eq('pass', 'decompose').in('status', ['running']).maybeSingle();
      if (activeJob) return res.status(409).json({ error: 'Decompose agent already running' });

      const briefResp = await fetch(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/decompose`);
      if (!briefResp.ok) throw new Error(`Failed to fetch decompose brief: ${briefResp.status}`);
      const brief = await briefResp.text();

      const tmpFile = `/tmp/decompose_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      const { data: jobData } = await ctx.supabase
        .from('build_jobs')
        .insert({
          course_code: courseCode, pass: 'decompose', status: 'running',
          current_seed: 0, seeds_completed: 0, total_seeds: 300,
          started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard', terminal: effectiveTerminal,
          agent_count: 1, respawn_count: 0, machine_name: ctx.MACHINE_NAME, build_mode: 'decompose'
        })
        .select('id').single();

      const claudeCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      spawnInTerminal(ctx, claudeCmd, 'Decompose', courseCode);

      res.json({ ok: true, course_code: courseCode, job_id: jobData?.id, message: `Decompose agent spawned` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /build/team-start/:courseCode
  router.post('/build/team-start/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.query.terminal || 'iTerm2';

      const { data: activeJob } = await ctx.supabase
        .from('build_jobs').select('id')
        .eq('course_code', courseCode).eq('pass', 'build-team').in('status', ['running']).maybeSingle();
      if (activeJob) return res.status(409).json({ error: 'Build Team already running' });

      const briefResp = await fetch(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/build-team-orchestrator`);
      if (!briefResp.ok) throw new Error(`Failed to fetch build-team brief: ${briefResp.status}`);
      const brief = await briefResp.text();

      const tmpFile = `/tmp/build-team_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      const { data: jobData } = await ctx.supabase
        .from('build_jobs')
        .insert({
          course_code: courseCode, pass: 'build-team', status: 'running',
          current_seed: 0, seeds_completed: 0, total_seeds: 300,
          started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard', terminal: effectiveTerminal,
          agent_count: 1, respawn_count: 0, machine_name: ctx.MACHINE_NAME, build_mode: 'build-team'
        })
        .select('id').single();

      const claudeCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      spawnInTerminal(ctx, claudeCmd, 'Build Team', courseCode);

      res.json({ ok: true, course_code: courseCode, job_id: jobData?.id, message: `Build Team agent spawned` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /build/final-pass/:courseCode
  router.post('/build/final-pass/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.query.terminal || 'iTerm2';

      const { data: activeJob } = await ctx.supabase
        .from('build_jobs').select('id')
        .eq('course_code', courseCode).eq('pass', 'final-pass').in('status', ['running']).maybeSingle();
      if (activeJob) return res.status(409).json({ error: 'Final Pass already running' });

      const briefResp = await fetch(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/final-pass`);
      if (!briefResp.ok) throw new Error(`Failed to fetch final-pass brief: ${briefResp.status}`);
      const brief = await briefResp.text();

      const tmpFile = `/tmp/final-pass_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      const { data: jobData } = await ctx.supabase
        .from('build_jobs')
        .insert({
          course_code: courseCode, pass: 'final-pass', status: 'running',
          current_seed: 0, seeds_completed: 0, total_seeds: 300,
          started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard', terminal: effectiveTerminal,
          agent_count: 1, respawn_count: 0, machine_name: ctx.MACHINE_NAME, build_mode: 'final-pass'
        })
        .select('id').single();

      const claudeCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      spawnInTerminal(ctx, claudeCmd, 'Final Pass', courseCode);

      res.json({ ok: true, course_code: courseCode, job_id: jobData?.id, message: `Final Pass agent spawned` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

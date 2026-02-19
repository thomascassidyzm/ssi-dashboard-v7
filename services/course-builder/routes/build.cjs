/**
 * Build management routes — start/stop/status/rebuild/seed-grid/translate/golden.
 *
 * Factory: receives ctx with supabase, activeBuilds, courseActivity,
 *          agentHeartbeats, courseVocabCache, config, SPAWN_MODE, etc.
 */

const { Router } = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getBuildProgress, startBuild, stopBuild, getBuildStatus } = require('../lib/build-manager.cjs');
const { spawnInTerminal, fetchGoldenSeedExamples } = require('../lib/agent-spawner.cjs');
const { getGoldenSeedCount } = require('../lib/language-config.cjs');
const { startPipeline, getPipelineStatus, advancePipeline, DEFAULT_HUMAN_GATES, getGateModes, isHumanGate } = require('../lib/pipeline.cjs');

module.exports = function (ctx) {
  const router = Router();

  // ===========================================================================
  // POST /build/start/:courseCode — Start a parallel build with agent spawning
  // ===========================================================================
  router.post('/build/start/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { targetSeeds = 300, maxAgents = 50 } = req.body || {};
    const dryRun = req.query.dry_run === 'true';
    const port = ctx.config.PORT || 3471;
    const projectDir = path.resolve(__dirname, '..', '..', '..');
    const SEEDS_PER_AGENT = 5;

    try {
      // Find remaining undecomposed seeds up to targetSeeds
      const { data: completedSeeds } = await ctx.supabase
        .from('course_seeds').select('seed_number')
        .eq('course_code', courseCode).not('decomposed_at', 'is', null)
        .lte('seed_number', targetSeeds).order('seed_number');

      const completedSet = new Set((completedSeeds || []).map(s => s.seed_number));

      // Golden seeds (1-50) are handled by /build/golden — start from 51
      const goldenCount = getGoldenSeedCount(
        (await ctx.supabase.from('courses').select('quality_rules').eq('course_code', courseCode).single()).data
      );
      const mvpStart = goldenCount + 1; // typically 51

      const remaining = [];
      for (let i = mvpStart; i <= targetSeeds; i++) {
        if (!completedSet.has(i)) remaining.push(i);
      }

      if (remaining.length === 0) {
        return res.json({ ok: false, error: `All seeds ${mvpStart}-${targetSeeds} already complete` });
      }

      // Split into batches of SEEDS_PER_AGENT
      const batches = [];
      for (let i = 0; i < remaining.length; i += SEEDS_PER_AGENT) {
        batches.push(remaining.slice(i, i + SEEDS_PER_AGENT));
      }

      // Cap at maxAgents
      const cappedBatches = batches.slice(0, maxAgents);

      if (dryRun) {
        return res.json({
          dry_run: true,
          remaining_seeds: remaining.length,
          total_batches: batches.length,
          capped_batches: cappedBatches.length,
          seeds_per_agent: SEEDS_PER_AGENT,
          max_agents: maxAgents,
          first_batch: cappedBatches[0],
          last_batch: cappedBatches[cappedBatches.length - 1]
        });
      }

      // Create build_jobs record
      let jobId = null;
      try {
        const { data: jobData, error: jobError } = await ctx.supabase.from('build_jobs').insert({
          course_code: courseCode, pass: 'build_mvp', status: 'running',
          current_seed: remaining[0], seeds_completed: completedSet.size, total_seeds: targetSeeds,
          started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard', terminal: ctx.SPAWN_MODE === 'headless' ? 'headless' : 'iTerm2',
          agent_count: cappedBatches.length, respawn_count: 0,
          machine_name: ctx.MACHINE_NAME, build_mode: 'build_mvp'
        }).select('id').single();
        if (!jobError && jobData) jobId = jobData.id;
      } catch (e) { console.error('[BUILD-MVP] Failed to create build_jobs record:', e.message); }

      // Spawn parallel Sonnet agents — one per batch
      const ts = Date.now();
      for (let i = 0; i < cappedBatches.length; i++) {
        const batch = cappedBatches[i];
        const seedList = batch.join(',');
        const briefResp = await fetch(`http://localhost:${port}/api/brief/${courseCode}/build-mvp?seeds=${seedList}`);
        if (!briefResp.ok) throw new Error(`Failed to fetch build-mvp brief for batch ${i + 1}: ${briefResp.status}`);
        const brief = await briefResp.text();

        const tmpFile = `/tmp/build_mvp_${courseCode}_batch${i + 1}_${ts}.md`;
        fs.writeFileSync(tmpFile, brief);

        const claudeCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`;
        console.log(`[BUILD-MVP] Spawning Sonnet Builder ${i + 1}/${cappedBatches.length} for ${courseCode} — seeds ${batch[0]}-${batch[batch.length - 1]}`);
        spawnInTerminal(ctx, claudeCmd, `Builder ${i + 1}/${cappedBatches.length}`, courseCode);

        // Stagger spawns by 2 seconds
        if (i < cappedBatches.length - 1) await new Promise(resolve => setTimeout(resolve, 2000));
      }

      ctx.emitPipelineEvent(courseCode, 'build:status', { active: true, pass: 'build_mvp', agent_count: cappedBatches.length });

      res.json({
        ok: true,
        course_code: courseCode,
        job_id: jobId,
        remaining_seeds: remaining.length,
        agent_count: cappedBatches.length,
        seeds_per_agent: SEEDS_PER_AGENT,
        model: 'sonnet',
        message: `MVP build started — ${cappedBatches.length} Sonnet agents spawned for ${remaining.length} remaining seeds (${mvpStart}-${targetSeeds})`
      });
    } catch (err) {
      console.error('[BUILD-MVP] Error:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/stop/:courseCode — Stop an active build
  // ===========================================================================
  router.post('/build/stop/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const result = await stopBuild(ctx, courseCode);
    ctx.emitPipelineEvent(courseCode, 'build:status', { active: false, pass: null, agent_count: 0 });
    res.json(result);
  });

  // ===========================================================================
  // GET /build/status/:courseCode — Get build status for a course
  // ===========================================================================
  router.get('/build/status/:courseCode', async (req, res) => {
    const { courseCode } = req.params;

    try {
      const status = await getBuildStatus(ctx, courseCode);
      res.json(status);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // GET /build/active — List all active builds
  // ===========================================================================
  router.get('/build/active', async (req, res) => {
    const builds = [];
    const seenCourses = new Set();

    // 1. Formally registered builds
    for (const [courseCode, build] of ctx.activeBuilds.entries()) {
      seenCourses.add(courseCode);
      const progress = await getBuildProgress(ctx, courseCode);
      builds.push({
        course_code: courseCode,
        status: build.status,
        agent_count: build.agentCount,
        progress: progress,
        source: 'registered'
      });
    }

    // 2. Courses with recent activity (not stalled, not already in activeBuilds)
    const now = Date.now();
    for (const [courseCode, activity] of ctx.courseActivity.entries()) {
      if (seenCourses.has(courseCode)) continue;

      const elapsed = now - activity.lastSubmission;
      const isActive = elapsed < ctx.config.STALL_THRESHOLD_MS;

      if (isActive) {
        const progress = await getBuildProgress(ctx, courseCode);
        builds.push({
          course_code: courseCode,
          status: activity.status === 'BATCH_COMPLETE' ? 'batch_complete' : 'agent_running',
          agent_count: 1,
          progress: progress,
          source: 'activity',
          last_seed: activity.lastSeed,
          seeds_this_session: activity.seedsThisSession,
          last_submission: new Date(activity.lastSubmission).toISOString()
        });
        seenCourses.add(courseCode);
      }
    }

    // 3. Courses with active heartbeats (agent alive but may not have submitted yet)
    for (const [courseCode, hb] of ctx.agentHeartbeats.entries()) {
      if (seenCourses.has(courseCode)) continue;

      const elapsed = now - hb.lastHeartbeat;
      const isAlive = elapsed < ctx.config.HEARTBEAT_TIMEOUT_MS;

      if (isAlive) {
        const progress = await getBuildProgress(ctx, courseCode);
        builds.push({
          course_code: courseCode,
          status: 'agent_running',
          agent_count: 1,
          progress: progress,
          source: 'heartbeat',
          agent_id: hb.agentId,
          current_seed: hb.currentSeed,
          last_heartbeat: new Date(hb.lastHeartbeat).toISOString()
        });
        seenCourses.add(courseCode);
      }
    }

    res.json({
      active_builds: builds.length,
      builds
    });
  });

  // ===========================================================================
  // POST /build/rebuild/:courseCode — Wipe and rebuild a seed range
  // ===========================================================================
  router.post('/build/rebuild/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { from_seed = 11, to_seed = 300 } = req.body || {};

    try {
      // Validate range
      if (from_seed < 1 || to_seed < from_seed) {
        return res.status(400).json({ ok: false, error: `Invalid range: ${from_seed}-${to_seed}` });
      }

      // Check for active build — block bulk wipes but allow single-seed rebuilds (Checker workflow)
      if (from_seed !== to_seed) {
        const { data: activeJob } = await ctx.supabase
          .from('build_jobs')
          .select('id, status')
          .eq('course_code', courseCode)
          .in('status', ['running'])
          .limit(1)
          .maybeSingle();

        if (activeJob) {
          return res.status(409).json({ ok: false, error: 'Build already running - stop it first (single-seed rebuilds are allowed)' });
        }
      }

      console.log(`[REBUILD] Starting rebuild of ${courseCode} seeds ${from_seed}-${to_seed}...`);

      // 1. Delete phrases in range
      const { count: phrasesDeleted } = await ctx.supabase
        .from('course_practice_phrases')
        .delete({ count: 'exact' })
        .eq('course_code', courseCode)
        .gte('seed_number', from_seed)
        .lte('seed_number', to_seed);

      console.log(`[REBUILD] Deleted ${phrasesDeleted || 0} phrases`);

      // 2. Delete LEGOs in range
      const { count: legosDeleted } = await ctx.supabase
        .from('course_legos')
        .delete({ count: 'exact' })
        .eq('course_code', courseCode)
        .gte('seed_number', from_seed)
        .lte('seed_number', to_seed);

      console.log(`[REBUILD] Deleted ${legosDeleted || 0} LEGOs`);

      // 3. NULL decomposed_at in range
      const { count: seedsReset } = await ctx.supabase
        .from('course_seeds')
        .update({ decomposed_at: null }, { count: 'exact' })
        .eq('course_code', courseCode)
        .gte('seed_number', from_seed)
        .lte('seed_number', to_seed);

      console.log(`[REBUILD] Reset ${seedsReset || 0} seeds (decomposed_at → null)`);

      // 4. Clear vocab cache
      ctx.courseVocabCache.delete(courseCode);

      console.log(`[REBUILD] Wiped ${courseCode} seeds ${from_seed}-${to_seed} — use Start Course Builder to launch agents`);

      res.json({
        ok: true,
        seeds_to_build: to_seed - from_seed + 1,
        phrases_deleted: phrasesDeleted || 0,
        legos_deleted: legosDeleted || 0,
        seeds_reset: seedsReset || 0
      });

    } catch (err) {
      console.error('[REBUILD] Error:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/redo-seed/:courseCode/:seedNumber — Wipe + respawn single seed
  // Wipes the seed in-process then spawns a focused Opus agent for just that seed.
  // Much cheaper than a full ad-hoc agent — no methodology re-discovery needed.
  // ===========================================================================
  router.post('/build/redo-seed/:courseCode/:seedNumber', async (req, res) => {
    const { courseCode, seedNumber } = req.params;
    const notes = req.body?.notes || '';
    const n = parseInt(seedNumber);

    try {
      if (!n || n < 1) return res.status(400).json({ ok: false, error: 'Invalid seed number' });

      const port = ctx.config.PORT || 3471;
      const projectDir = path.resolve(__dirname, '..', '..', '..');

      // 1. Wipe the seed
      const { count: phrasesDeleted } = await ctx.supabase
        .from('course_practice_phrases').delete({ count: 'exact' })
        .eq('course_code', courseCode).eq('seed_number', n);
      const { count: legosDeleted } = await ctx.supabase
        .from('course_legos').delete({ count: 'exact' })
        .eq('course_code', courseCode).eq('seed_number', n);
      await ctx.supabase
        .from('course_seeds').update({ decomposed_at: null })
        .eq('course_code', courseCode).eq('seed_number', n);
      ctx.courseVocabCache.delete(courseCode);

      console.log(`[REDO-SEED] Wiped ${courseCode} seed ${n}: ${phrasesDeleted||0} phrases, ${legosDeleted||0} LEGOs`);

      // 2. Fetch the calibrate brief and patch it for single-seed use
      const briefResp = await fetch(`http://localhost:${port}/api/brief/${courseCode}/calibrate`);
      if (!briefResp.ok) throw new Error('Failed to fetch calibrate brief');
      let brief = await briefResp.text();

      // Replace the "seeds 1 → N" loop instruction with a single-seed target
      brief = brief.replace(
        /## Protocol — For Each Seed N \(1 → \d+\)/,
        `## Protocol — Rebuild Seed ${n} ONLY`
      );
      brief += `\n\n## REDO INSTRUCTIONS\n\nYou are rebuilding **seed ${n} only**. All other seeds are already done.\n${notes ? `\nReviewer notes: ${notes}\n` : ''}\nStart at Step 1 with N=${n}. Submit via seed/complete. When done, you are finished.\n`;

      const ts = Date.now();
      const tmpFile = `/tmp/redo_seed_${courseCode}_${n}_${ts}.md`;
      fs.writeFileSync(tmpFile, brief);

      const cmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      spawnInTerminal(ctx, cmd, `Redo S${n}`, courseCode);

      res.json({ ok: true, seed_number: n, phrases_deleted: phrasesDeleted||0, legos_deleted: legosDeleted||0, message: `Seed ${n} wiped and redo agent spawned` });
    } catch (err) {
      console.error('[REDO-SEED] Error:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // GET /build/seed-grid/:courseCode — Seed status grid for visualization
  // ===========================================================================
  router.get('/build/seed-grid/:courseCode', async (req, res) => {
    const { courseCode } = req.params;

    try {
      // Get course seed_count to limit grid
      const { data: courseData } = await ctx.supabase
        .from('courses')
        .select('seed_count')
        .eq('course_code', courseCode)
        .single();
      const maxSeed = courseData?.seed_count || 300;

      // Get seeds up to seed_count with their decomposed_at status
      const { data: seeds, error: seedError } = await ctx.supabase
        .from('course_seeds')
        .select('seed_number, decomposed_at')
        .eq('course_code', courseCode)
        .lte('seed_number', maxSeed)
        .order('seed_number');

      if (seedError) {
        return res.status(500).json({ ok: false, error: seedError.message });
      }

      // Get LEGO counts per seed (within range)
      const { data: legoCounts, error: legoError } = await ctx.supabase
        .from('course_legos')
        .select('seed_number')
        .eq('course_code', courseCode)
        .lte('seed_number', maxSeed);

      // Get phrase counts per seed (within range)
      const { data: phraseCounts, error: phraseError } = await ctx.supabase
        .from('course_practice_phrases')
        .select('seed_number')
        .eq('course_code', courseCode)
        .lte('seed_number', maxSeed);

      // Get draft seeds with validation status (parallel builds stage here before finalization)
      const { data: draftSeeds } = await ctx.supabase
        .from('course_seed_drafts')
        .select('seed_number, validation_status')
        .eq('course_code', courseCode)
        .lte('seed_number', maxSeed);

      const draftStatusMap = {};
      for (const d of draftSeeds || []) {
        draftStatusMap[d.seed_number] = d.validation_status || 'valid';
      }

      // Aggregate counts
      const legosBySeed = {};
      for (const l of legoCounts || []) {
        legosBySeed[l.seed_number] = (legosBySeed[l.seed_number] || 0) + 1;
      }

      const phrasesBySeed = {};
      for (const p of phraseCounts || []) {
        phrasesBySeed[p.seed_number] = (phrasesBySeed[p.seed_number] || 0) + 1;
      }

      // Build grid — statuses: complete, decomposed, drafted, collision, rework, building, empty
      let complete = 0, decomposed = 0, building = 0, empty = 0, drafted = 0, collision = 0;
      const grid = (seeds || []).map(s => {
        const legos = legosBySeed[s.seed_number] || 0;
        const phrases = phrasesBySeed[s.seed_number] || 0;
        const draftStatus = draftStatusMap[s.seed_number];
        let status;
        if (s.decomposed_at) {
          // Empty seeds (all LEGOs reused, no new phrases) are still complete
          status = 'complete';
          complete++;
        } else if (draftStatus === 'collision' || draftStatus === 'rework') {
          status = draftStatus;
          collision++;
        } else if (draftStatus === 'valid') {
          status = 'drafted';
          drafted++;
        } else if (legos > 0) {
          status = 'building';
          building++;
        } else {
          status = 'empty';
          empty++;
        }
        return { seed: s.seed_number, status, legos, phrases };
      });

      res.json({
        seeds: grid,
        total: grid.length,
        complete,
        decomposed,
        drafted,
        collision,
        building,
        empty
      });

    } catch (err) {
      console.error('[SEED-GRID] Error:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/translate/:courseCode — Spawn a translation agent for a course
  // ===========================================================================
  router.post('/build/translate/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.query.terminal || 'iTerm2';
      const dryRun = req.query.dry_run === 'true';

      // Check for active translate job
      const { data: activeJob } = await ctx.supabase
        .from('build_jobs')
        .select('id, status')
        .eq('course_code', courseCode)
        .eq('pass', 'translate')
        .in('status', ['running'])
        .maybeSingle();

      if (activeJob && !dryRun) {
        return res.status(409).json({ error: 'Translation already running', job_id: activeJob.id });
      }

      // Fetch brief from briefs API
      const briefResp = await fetch(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/translate`);
      if (!briefResp.ok) throw new Error(`Failed to fetch translate brief: ${briefResp.status}`);
      const brief = await briefResp.text();

      if (dryRun) {
        return res.json({ dry_run: true, brief });
      }

      // Write brief to temp file
      const tmpFile = `/tmp/translate_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      // Create build_jobs record
      let jobId = null;
      try {
        const { data: jobData, error: jobError } = await ctx.supabase
          .from('build_jobs')
          .insert({
            course_code: courseCode,
            pass: 'translate',
            status: 'running',
            current_seed: 0,
            seeds_completed: 0,
            total_seeds: 668,
            started_at: new Date().toISOString(),
            last_heartbeat: new Date().toISOString(),
            requested_by: 'dashboard',
            terminal: effectiveTerminal,
            agent_count: 1,
            respawn_count: 0,
            machine_name: ctx.MACHINE_NAME,
            build_mode: 'translate'
          })
          .select('id')
          .single();
        if (!jobError && jobData) jobId = jobData.id;
      } catch (e) {
        console.error('[TRANSLATE] Failed to create build_jobs record:', e.message);
      }

      // Spawn translation agent
      const claudeCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      console.log(`[TRANSLATE] Spawning translation agent for ${courseCode} in ${effectiveTerminal}`);
      spawnInTerminal(ctx, claudeCmd, 'Translate', courseCode);

      res.json({
        ok: true,
        course_code: courseCode,
        job_id: jobId,
        brief_file: tmpFile,
        message: `Translation agent spawned for ${courseCode}`
      });
    } catch (err) {
      console.error('[TRANSLATE] Error starting translation:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/golden/:courseCode — Spawn Creator + Checker agents for golden seed building
  // ===========================================================================
  router.post('/build/golden/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const targetSeeds = parseInt(req.query.target) || 50;
      const dryRun = req.query.dry_run === 'true';
      const terminal = req.query.terminal || 'iTerm2';
      const phase = req.query.phase || 'golden';

      if (!['calibration', 'golden'].includes(phase)) {
        return res.status(400).json({ error: 'phase must be "calibration" or "golden"' });
      }

      if (targetSeeds < 1 || targetSeeds > 50) {
        return res.status(400).json({ error: 'target must be between 1 and 50' });
      }

      // Check for active golden build
      const { data: activeJob } = await ctx.supabase
        .from('build_jobs')
        .select('id, status')
        .eq('course_code', courseCode)
        .eq('pass', 'golden')
        .in('status', ['running'])
        .maybeSingle();

      if (activeJob && !dryRun) {
        return res.status(409).json({ error: 'Golden build already running', job_id: activeJob.id });
      }

      const isCalibration = phase === 'calibration';
      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;
      const buildMode = isCalibration ? 'calibration' : 'golden';
      const port = ctx.config.PORT || 3471;
      const ts = Date.now();

      if (isCalibration) {
        // ── CALIBRATION: single Opus Creator (human-in-loop) ──
        const creatorResp = await fetch(`http://localhost:${port}/api/brief/${courseCode}/calibrate?target=${targetSeeds}`);
        if (!creatorResp.ok) throw new Error(`Failed to fetch calibrate brief: ${creatorResp.status}`);
        const creatorBrief = await creatorResp.text();

        if (dryRun) return res.json({ dry_run: true, phase, creator_brief: creatorBrief, target_seeds: targetSeeds });

        const creatorFile = `/tmp/golden_creator_${courseCode}_${ts}.md`;
        fs.writeFileSync(creatorFile, creatorBrief);

        let jobId = null;
        try {
          const { data: jobData, error: jobError } = await ctx.supabase.from('build_jobs').insert({
            course_code: courseCode, pass: 'golden', status: 'running',
            current_seed: 0, seeds_completed: 0, total_seeds: targetSeeds,
            started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
            requested_by: 'dashboard', terminal: effectiveTerminal,
            agent_count: 1, respawn_count: 0, machine_name: ctx.MACHINE_NAME, build_mode: 'calibration'
          }).select('id').single();
          if (!jobError && jobData) jobId = jobData.id;
        } catch (e) { console.error('[GOLDEN] Failed to create build_jobs record:', e.message); }

        const creatorCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${creatorFile})"`;
        console.log(`[GOLDEN] Spawning Calibration Creator for ${courseCode}`);
        spawnInTerminal(ctx, creatorCmd, 'Calibration Creator', courseCode);

        return res.json({ ok: true, course_code: courseCode, job_id: jobId, phase, target_seeds: targetSeeds,
          message: `Calibration build started — Creator agent (human-collaboration) spawned` });
      }

      // ── GOLDEN PHASE: parallel Sonnet Creators + 1 Opus Checker ──

      // Find remaining seeds
      const { data: completedSeeds } = await ctx.supabase
        .from('course_seeds').select('seed_number')
        .eq('course_code', courseCode).not('decomposed_at', 'is', null)
        .lte('seed_number', targetSeeds).order('seed_number');

      const completedSet = new Set((completedSeeds || []).map(s => s.seed_number));
      const remaining = [];
      for (let i = 1; i <= targetSeeds; i++) {
        if (!completedSet.has(i)) remaining.push(i);
      }

      if (remaining.length === 0) {
        return res.json({ ok: false, error: `All ${targetSeeds} seeds already complete` });
      }

      // Split remaining seeds into batches of ~5 for parallel Creators
      const SEEDS_PER_CREATOR = 5;
      const batches = [];
      for (let i = 0; i < remaining.length; i += SEEDS_PER_CREATOR) {
        batches.push(remaining.slice(i, i + SEEDS_PER_CREATOR));
      }

      if (dryRun) {
        return res.json({ dry_run: true, phase, remaining_seeds: remaining,
          creator_batches: batches.length, seeds_per_creator: SEEDS_PER_CREATOR,
          creator_model: 'sonnet', target_seeds: targetSeeds });
      }

      // Create build_jobs record
      let jobId = null;
      try {
        const { data: jobData, error: jobError } = await ctx.supabase.from('build_jobs').insert({
          course_code: courseCode, pass: 'golden', status: 'running',
          current_seed: remaining[0], seeds_completed: completedSet.size, total_seeds: targetSeeds,
          started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard', terminal: effectiveTerminal,
          agent_count: batches.length, respawn_count: 0,
          machine_name: ctx.MACHINE_NAME, build_mode: 'golden_parallel'
        }).select('id').single();
        if (!jobError && jobData) jobId = jobData.id;
      } catch (e) { console.error('[GOLDEN] Failed to create build_jobs record:', e.message); }

      // Spawn parallel Sonnet Creators — one per batch
      const creatorFiles = [];
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const seedList = batch.join(',');
        const briefResp = await fetch(`http://localhost:${port}/api/brief/${courseCode}/golden-creator?target=${targetSeeds}&seeds=${seedList}`);
        if (!briefResp.ok) throw new Error(`Failed to fetch creator brief for batch ${i + 1}: ${briefResp.status}`);
        const brief = await briefResp.text();

        const creatorFile = `/tmp/golden_creator_${courseCode}_batch${i + 1}_${ts}.md`;
        fs.writeFileSync(creatorFile, brief);
        creatorFiles.push(creatorFile);

        const creatorCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${creatorFile})"`;
        console.log(`[GOLDEN] Spawning Sonnet Creator ${i + 1}/${batches.length} for ${courseCode} — seeds ${batch[0]}-${batch[batch.length - 1]}`);
        spawnInTerminal(ctx, creatorCmd, `Creator ${i + 1}/${batches.length}`, courseCode);

        // Stagger spawns by 2 seconds to avoid iTerm race conditions
        if (i < batches.length - 1) await new Promise(resolve => setTimeout(resolve, 2000));
      }

      res.json({
        ok: true,
        course_code: courseCode,
        job_id: jobId,
        phase,
        target_seeds: targetSeeds,
        remaining_seeds: remaining.length,
        creator_batches: batches.length,
        creator_model: 'sonnet',
        message: `Golden build started — ${batches.length} Sonnet Creators spawned for ${remaining.length} remaining seeds (no checkers)`
      });
    } catch (err) {
      console.error('[GOLDEN] Error starting golden build:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/kill-all — Kill all Claude CLI agents and stop all running builds
  // ===========================================================================
  router.post('/build/kill-all', async (req, res) => {
    try {
      const { execSync } = require('child_process');

      // 1. Kill all Claude CLI agent processes
      let killedCount = 0;
      try {
        const pids = execSync('pgrep -f "claude --model" 2>/dev/null || true', { encoding: 'utf8' }).trim();
        if (pids) {
          killedCount = pids.split('\n').filter(l => l.trim()).length;
          execSync('pkill -f "claude --model" 2>/dev/null || true');
        }
      } catch (e) { /* no processes to kill */ }

      // 2. Mark all running build_jobs as stopped
      let stoppedJobs = 0;
      try {
        const { count } = await ctx.supabase
          .from('build_jobs')
          .update({ status: 'stopped', completed_at: new Date().toISOString() }, { count: 'exact' })
          .in('status', ['running', 'stalled']);
        stoppedJobs = count || 0;
      } catch (e) {
        console.error('[KILL-ALL] Failed to update build_jobs:', e.message);
      }

      // 3. Clear all in-memory state
      ctx.activeBuilds.clear();
      ctx.courseActivity.clear();
      ctx.agentHeartbeats.clear();

      console.log(`[KILL-ALL] Killed ${killedCount} agent processes, stopped ${stoppedJobs} build jobs`);

      res.json({
        ok: true,
        killed_processes: killedCount,
        stopped_jobs: stoppedJobs,
        message: `Killed ${killedCount} agent processes and stopped ${stoppedJobs} build jobs`
      });
    } catch (err) {
      console.error('[KILL-ALL] Error:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/pipeline/:courseCode — Start/resume the full automated pipeline
  // ===========================================================================
  router.post('/build/pipeline/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const result = await startPipeline(ctx, courseCode);
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error('[PIPELINE] Error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // GET /build/pipeline/:courseCode — Get pipeline status
  // ===========================================================================
  router.get('/build/pipeline/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const status = await getPipelineStatus(ctx.supabase, courseCode);
      res.json({ ok: true, ...status });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/pipeline/:courseCode/advance — Manually advance pipeline (e.g. after human gate)
  // ===========================================================================
  router.post('/build/pipeline/:courseCode/advance', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const force = req.query.force === 'true';
      const newStage = await advancePipeline(ctx, courseCode, { force });
      ctx.emitPipelineEvent(courseCode, 'pipeline:stage', { stage: newStage, progress: null });
      res.json({ ok: true, stage: newStage });
    } catch (err) {
      console.error('[PIPELINE] Advance error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // GET /build/pipeline/:courseCode/gates — Get current gate modes
  // ===========================================================================
  router.get('/build/pipeline/:courseCode/gates', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const { data: course, error } = await ctx.supabase
        .from('courses')
        .select('quality_rules')
        .eq('course_code', courseCode)
        .single();
      if (error) throw error;
      res.json({ ok: true, gates: getGateModes(course.quality_rules) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/pipeline/:courseCode/gates — Update gate modes
  // ===========================================================================
  router.post('/build/pipeline/:courseCode/gates', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const updates = req.body;

      // Validate
      for (const [stage, mode] of Object.entries(updates)) {
        if (!DEFAULT_HUMAN_GATES.includes(stage)) {
          return res.status(400).json({ ok: false, error: `Unknown gate stage: ${stage}. Valid stages: ${DEFAULT_HUMAN_GATES.join(', ')}` });
        }
        if (!['human', 'agent'].includes(mode)) {
          return res.status(400).json({ ok: false, error: `Invalid mode "${mode}" for ${stage}. Must be "human" or "agent"` });
        }
        if (stage === 'calibrate' && mode === 'agent') {
          return res.status(400).json({ ok: false, error: 'calibrate is always a human gate — cannot be set to agent' });
        }
      }

      // Merge into quality_rules.gate_modes
      const { data: course, error: fetchErr } = await ctx.supabase
        .from('courses')
        .select('quality_rules')
        .eq('course_code', courseCode)
        .single();
      if (fetchErr) throw fetchErr;

      const rules = course.quality_rules || {};
      const gateModes = { ...(rules.gate_modes || {}), ...updates };
      // Never allow calibrate to be agent
      delete gateModes.calibrate;

      const { error: updateErr } = await ctx.supabase
        .from('courses')
        .update({ quality_rules: { ...rules, gate_modes: gateModes } })
        .eq('course_code', courseCode);
      if (updateErr) throw updateErr;

      res.json({ ok: true, gates: getGateModes({ ...rules, gate_modes: gateModes }) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/detective/:courseCode — Spawn detective agent to diagnose pipeline
  // ===========================================================================
  router.post('/build/detective/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const { generateDetectiveBrief } = require('../briefs/detective.cjs');
      const brief = generateDetectiveBrief(courseCode);
      const tmpFile = `/tmp/detective-${courseCode}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const claudeCmd = `cd "${projectDir}" && claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`;

      spawnInTerminal(ctx, claudeCmd, `Detective ${courseCode}`, courseCode);
      res.json({ ok: true, message: `Detective agent spawned for ${courseCode}` });
    } catch (err) {
      console.error('[DETECTIVE] Error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/orchestrator/:courseCode — Spawn orchestrator agent
  // ===========================================================================
  router.post('/build/orchestrator/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;

      // Fetch brief
      const port = ctx.config.PORT || 3471;
      const briefResp = await fetch(`http://localhost:${port}/api/brief/${courseCode}/orchestrator`);
      if (!briefResp.ok) throw new Error(`Failed to fetch orchestrator brief: ${briefResp.status}`);
      const brief = await briefResp.text();

      // Write brief to /tmp
      const tmpFile = `/tmp/orchestrator-${courseCode}-${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      // Mark pipeline as running
      const { setPipelineStage } = require('../lib/pipeline.cjs');
      const { data: course } = await ctx.supabase
        .from('courses')
        .select('quality_rules')
        .eq('course_code', courseCode)
        .single();

      const rules = course?.quality_rules || {};
      await ctx.supabase
        .from('courses')
        .update({
          quality_rules: {
            ...rules,
            pipeline_running: true,
            pipeline_started_at: new Date().toISOString()
          }
        })
        .eq('course_code', courseCode);

      // Spawn
      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const claudeCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      spawnInTerminal(ctx, claudeCmd, `Orchestrator`, courseCode);

      ctx.emitPipelineEvent(courseCode, 'orchestrator:message', {
        checkpoint: null,
        message: 'Orchestrator agent spawned',
        metadata: { stage: 'startup' }
      });

      res.json({ ok: true, message: `Orchestrator spawned for ${courseCode}` });
    } catch (err) {
      console.error('[ORCHESTRATOR] Spawn error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/adhoc/:courseCode — Spawn ad-hoc agent with freeform prompt
  // ===========================================================================
  router.post('/build/adhoc/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const { prompt, model = 'sonnet' } = req.body || {};
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ ok: false, error: 'prompt is required' });
      }

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const port = ctx.config.PORT || 3471;
      const wrappedPrompt = [
        `# Ad-Hoc Task for course: ${courseCode}`,
        '',
        `Working directory: ${projectDir}`,
        `Course Builder API: http://localhost:${port}`,
        `Supabase client: services/supabase-client.cjs`,
        '',
        '## Task',
        '',
        prompt.trim()
      ].join('\n');

      const tmpFile = `/tmp/adhoc-${courseCode}-${Date.now()}.md`;
      fs.writeFileSync(tmpFile, wrappedPrompt);

      const claudeCmd = `cd "${projectDir}" && claude --model ${model} --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      spawnInTerminal(ctx, claudeCmd, `Ad-hoc`, courseCode);

      res.json({ ok: true, promptFile: tmpFile });
    } catch (err) {
      console.error('[ADHOC] Error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/decompose/:courseCode — Spawn single Opus decompose agent
  // ===========================================================================
  router.post('/build/decompose/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const dryRun = req.query.dry_run === 'true';
      const terminal = req.query.terminal || 'iTerm2';

      // Guard: no active decompose job
      const { data: activeJob } = await ctx.supabase
        .from('build_jobs')
        .select('id, status')
        .eq('course_code', courseCode)
        .eq('pass', 'decompose')
        .in('status', ['running'])
        .maybeSingle();

      if (activeJob && !dryRun) {
        return res.status(409).json({ error: 'Decompose agent already running', job_id: activeJob.id });
      }

      // Fetch brief
      const briefResp = await fetch(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/decompose`);
      if (!briefResp.ok) throw new Error(`Failed to fetch decompose brief: ${briefResp.status}`);
      const brief = await briefResp.text();

      if (dryRun) {
        return res.json({ dry_run: true, brief });
      }

      // Write brief to temp file
      const tmpFile = `/tmp/decompose_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      // Create build_jobs record
      let jobId = null;
      try {
        const { data: jobData, error: jobError } = await ctx.supabase
          .from('build_jobs')
          .insert({
            course_code: courseCode,
            pass: 'decompose',
            status: 'running',
            current_seed: 0,
            seeds_completed: 0,
            total_seeds: 668,
            started_at: new Date().toISOString(),
            last_heartbeat: new Date().toISOString(),
            requested_by: 'dashboard',
            terminal: effectiveTerminal,
            agent_count: 1,
            respawn_count: 0,
            machine_name: ctx.MACHINE_NAME,
            build_mode: 'decompose'
          })
          .select('id')
          .single();
        if (!jobError && jobData) jobId = jobData.id;
      } catch (e) {
        console.error('[DECOMPOSE] Failed to create build_jobs record:', e.message);
      }

      // Spawn Opus agent
      const claudeCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      console.log(`[DECOMPOSE] Spawning decompose agent for ${courseCode} in ${effectiveTerminal}`);
      spawnInTerminal(ctx, claudeCmd, 'Decompose', courseCode);

      res.json({
        ok: true,
        course_code: courseCode,
        job_id: jobId,
        brief_file: tmpFile,
        message: `Decompose agent spawned for ${courseCode}`
      });
    } catch (err) {
      console.error('[DECOMPOSE] Error starting decompose:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

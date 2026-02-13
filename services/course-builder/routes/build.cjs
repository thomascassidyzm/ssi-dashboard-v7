/**
 * Build management routes — start/stop/status/rebuild/seed-grid/translate/golden.
 *
 * Factory: receives ctx with supabase, activeBuilds, courseActivity,
 *          agentHeartbeats, courseVocabCache, config, SPAWN_MODE, etc.
 */

const { Router } = require('express');
const { getBuildProgress, startBuild, stopBuild, getBuildStatus } = require('../lib/build-manager.cjs');
const { spawnTranslationAgent, spawnGoldenBuildAgents, spawnParallelBuildAgent } = require('../lib/agent-spawner.cjs');

module.exports = function (ctx) {
  const router = Router();

  // ===========================================================================
  // POST /build/start/:courseCode — Start a parallel build with agent spawning
  // ===========================================================================
  router.post('/build/start/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { terminal = 'iTerm2', targetSeeds = 668 } = req.body || {};

    try {
      const spawnCallback = (cc, agentCount, term) =>
        spawnParallelBuildAgent(ctx, cc, agentCount, term);

      const result = await startBuild(ctx, courseCode, terminal, targetSeeds, spawnCallback);
      res.json(result);
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ===========================================================================
  // POST /build/stop/:courseCode — Stop an active build
  // ===========================================================================
  router.post('/build/stop/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const result = await stopBuild(ctx, courseCode);
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

      // Check for active build
      const { data: activeJob } = await ctx.supabase
        .from('build_jobs')
        .select('id, status')
        .eq('course_code', courseCode)
        .in('status', ['running'])
        .limit(1)
        .maybeSingle();

      if (activeJob) {
        return res.status(409).json({ ok: false, error: 'Build already running - stop it first' });
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

      // Build grid — statuses: complete, drafted, collision, rework, building, empty
      let complete = 0, building = 0, empty = 0, drafted = 0, collision = 0;
      const grid = (seeds || []).map(s => {
        const legos = legosBySeed[s.seed_number] || 0;
        const phrases = phrasesBySeed[s.seed_number] || 0;
        const draftStatus = draftStatusMap[s.seed_number];
        let status;
        if (s.decomposed_at) {
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

      const result = await spawnTranslationAgent(ctx, courseCode, terminal, dryRun);
      res.json(result);
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

      const result = await spawnGoldenBuildAgents(ctx, courseCode, targetSeeds, terminal, dryRun, phase);
      res.json(result);
    } catch (err) {
      console.error('[GOLDEN] Error starting golden build:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

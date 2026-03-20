/**
 * Build routes — translate, decompose, stop, status, seed-grid, rebuild (wipe only).
 * No auto-spawning. No checkpoints. No old pipeline stages.
 */

const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const { getBuildProgress, stopBuild, getBuildStatus } = require('../lib/build-manager.cjs');
const { spawnInTerminal } = require('../lib/agent-spawner.cjs');
const { bumpCourseVersion } = require('../../shared/course-version.cjs');

module.exports = function (ctx) {
  const router = Router();

  // Helper: append a shell-level job completion curl to any claude command.
  // Uses `;` so it fires regardless of how the Claude process exits.
  function withJobDone(cmd, jobId) {
    if (!jobId) return cmd;
    return `${cmd} ; curl -s -X POST "http://localhost:${ctx.config.PORT || 3471}/api/build/job-done/${jobId}" > /dev/null 2>&1`;
  }

  // POST /build/job-done/:jobId — Shell wrapper calls this when Claude process exits
  router.post('/build/job-done/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;
      const { data: job } = await ctx.supabase
        .from('build_jobs')
        .select('id, status, pass, course_code')
        .eq('id', jobId)
        .single();

      if (!job) return res.json({ ok: false, error: 'Job not found' });
      if (job.status !== 'running') return res.json({ ok: true, already: job.status });

      await ctx.supabase.from('build_jobs').update({
        status: 'complete',
        completed_at: new Date().toISOString(),
      }).eq('id', jobId);

      // If this was a final-pass job, set the flag so wizard knows review is done
      if (job.pass === 'final-pass' && job.course_code) {
        const { data: fpCourse } = await ctx.supabase.from('courses').select('quality_rules').eq('course_code', job.course_code).single();
        await ctx.supabase.from('courses').update({
          quality_rules: { ...(fpCourse?.quality_rules || {}), final_pass_completed: true }
        }).eq('course_code', job.course_code);
      }

      console.log(`[BUILD] JOB DONE (shell wrapper): ${jobId}`);
      res.json({ ok: true });
    } catch (err) {
      console.error(`[BUILD] job-done error:`, err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

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
  // Safety: requires explicit from_seed/to_seed, confirms large ranges,
  //         supports dry_run to preview impact before deleting.
  router.post('/build/rebuild/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { from_seed, to_seed, confirm, dry_run } = req.body || {};

    try {
      // SAFETY: require explicit range — no defaults that wipe everything
      if (from_seed == null || to_seed == null) {
        return res.status(400).json({
          ok: false,
          error: 'from_seed and to_seed are required (no defaults — prevents accidental full-course wipe)'
        });
      }

      if (from_seed < 1 || to_seed < from_seed) {
        return res.status(400).json({ ok: false, error: `Invalid range: ${from_seed}-${to_seed}` });
      }

      // Count what would be affected BEFORE deleting
      const { count: phraseCount } = await ctx.supabase
        .from('course_practice_phrases').select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .gte('seed_number', from_seed).lte('seed_number', to_seed);

      const { count: legoCount } = await ctx.supabase
        .from('course_legos').select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .gte('seed_number', from_seed).lte('seed_number', to_seed);

      const seedSpan = to_seed - from_seed + 1;
      const totalItems = (phraseCount || 0) + (legoCount || 0);

      // SAFETY: large-range guard — require explicit confirm for ranges > 10 seeds
      if (seedSpan > 10 && !confirm) {
        return res.status(400).json({
          ok: false,
          error: `Large range (${seedSpan} seeds) requires confirm: true`,
          preview: {
            seeds: seedSpan,
            phrases_to_delete: phraseCount || 0,
            legos_to_delete: legoCount || 0,
            total_items: totalItems,
            hint: 'Add "confirm": true to the request body to proceed'
          }
        });
      }

      // Dry run — return counts without deleting
      if (dry_run) {
        return res.json({
          ok: true,
          dry_run: true,
          seeds: seedSpan,
          phrases_to_delete: phraseCount || 0,
          legos_to_delete: legoCount || 0,
          total_items: totalItems
        });
      }

      // Execute the wipe
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

      await bumpCourseVersion(ctx.supabase, courseCode, 'minor');

      console.log(`[REBUILD] ${courseCode} seeds ${from_seed}-${to_seed}: deleted ${phrasesDeleted} phrases, ${legosDeleted} LEGOs, reset ${seedsReset} seeds`);

      res.json({
        ok: true,
        seeds_to_build: seedSpan,
        phrases_deleted: phrasesDeleted || 0,
        legos_deleted: legosDeleted || 0,
        seeds_reset: seedsReset || 0
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /build/redo/:courseCode — Wipe specific seeds + spawn redo agent
  router.post('/build/redo/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { seeds = [], notes = '' } = req.body || {};
    const terminal = req.query.terminal || 'iTerm2';

    try {
      if (!Array.isArray(seeds) || seeds.length === 0) {
        return res.status(400).json({ ok: false, error: 'seeds array required (e.g. [1, 4, 17])' });
      }

      const seedNumbers = seeds.map(Number).filter(n => n > 0).sort((a, b) => a - b);
      if (seedNumbers.length === 0) {
        return res.status(400).json({ ok: false, error: 'No valid seed numbers provided' });
      }

      // Wipe each seed (delete phrases + LEGOs, reset decomposed_at)
      let totalPhrasesDeleted = 0;
      let totalLegosDeleted = 0;
      let totalSeedsReset = 0;

      for (const seedNum of seedNumbers) {
        const { count: phrasesDeleted } = await ctx.supabase
          .from('course_practice_phrases').delete({ count: 'exact' })
          .eq('course_code', courseCode).eq('seed_number', seedNum);

        const { count: legosDeleted } = await ctx.supabase
          .from('course_legos').delete({ count: 'exact' })
          .eq('course_code', courseCode).eq('seed_number', seedNum);

        const { count: seedsReset } = await ctx.supabase
          .from('course_seeds').update({ decomposed_at: null, approved_at: null, flagged_at: null }, { count: 'exact' })
          .eq('course_code', courseCode).eq('seed_number', seedNum);

        totalPhrasesDeleted += phrasesDeleted || 0;
        totalLegosDeleted += legosDeleted || 0;
        totalSeedsReset += seedsReset || 0;
      }

      ctx.courseVocabCache.delete(courseCode);
      await bumpCourseVersion(ctx.supabase, courseCode, 'minor');

      // Clear final_pass_completed — rebuilt seeds need re-review
      const { data: redoCourse } = await ctx.supabase.from('courses').select('quality_rules').eq('course_code', courseCode).single();
      if (redoCourse?.quality_rules?.final_pass_completed) {
        await ctx.supabase.from('courses').update({
          quality_rules: { ...(redoCourse.quality_rules), final_pass_completed: false }
        }).eq('course_code', courseCode);
      }

      // Generate redo brief and spawn agent
      const seedsParam = seedNumbers.join(',');
      const notesParam = notes ? `&notes=${encodeURIComponent(notes)}` : '';
      const briefResp = await fetch(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/redo?seeds=${seedsParam}${notesParam}`);
      if (!briefResp.ok) throw new Error(`Failed to fetch redo brief: ${briefResp.status}`);
      const brief = await briefResp.text();

      const tmpFile = `/tmp/redo_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      const claudeCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      spawnInTerminal(ctx, claudeCmd, 'Redo', courseCode);

      // Post status to chat
      await ctx.supabase.from('orchestrator_messages').insert({
        course_code: courseCode,
        direction: 'agent_to_human',
        message: `Redo agent spawned for seed${seedNumbers.length > 1 ? 's' : ''} ${seedNumbers.join(', ')}. Wiped ${totalLegosDeleted} LEGOs, ${totalPhrasesDeleted} phrases.`,
        status: 'pending',
        metadata: { action: 'redo_spawned', seeds: seedNumbers }
      });

      res.json({
        ok: true,
        seeds: seedNumbers,
        phrases_deleted: totalPhrasesDeleted,
        legos_deleted: totalLegosDeleted,
        seeds_reset: totalSeedsReset,
        message: `Redo agent spawned for ${seedNumbers.length} seed(s)`
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
        .from('course_seeds').select('seed_number, decomposed_at, approved_at, flagged_at')
        .eq('course_code', courseCode).lte('seed_number', maxSeed).order('seed_number');

      const { data: legoCounts } = await ctx.supabase
        .from('course_legos').select('seed_number')
        .eq('course_code', courseCode).lte('seed_number', maxSeed);

      const { data: phraseCounts } = await ctx.supabase
        .from('course_practice_phrases').select('seed_number')
        .eq('course_code', courseCode).lte('seed_number', maxSeed);

      // Count USE phrases per seed:lego to detect under-threshold LEGOs
      const { data: usePhrasesRaw } = await ctx.supabase
        .from('course_practice_phrases').select('seed_number, lego_index')
        .eq('course_code', courseCode).eq('phrase_role', 'use').lte('seed_number', maxSeed);

      const usePerLego = {};
      for (const p of usePhrasesRaw || []) {
        const key = `${p.seed_number}:${p.lego_index}`;
        usePerLego[key] = (usePerLego[key] || 0) + 1;
      }

      // Find seeds with any new LEGO below 4 USE phrases
      const underThresholdSeeds = new Set();
      const newLegos = (legoCounts || []);
      // We need lego_index too — re-query with is_new filter
      const { data: newLegosDetailed } = await ctx.supabase
        .from('course_legos').select('seed_number, lego_index')
        .eq('course_code', courseCode).eq('is_new', true).lte('seed_number', maxSeed);
      for (const l of newLegosDetailed || []) {
        if (l.seed_number <= 3) continue; // seeds 1-3 excluded from backfill
        const key = `${l.seed_number}:${l.lego_index}`;
        if ((usePerLego[key] || 0) < 4) underThresholdSeeds.add(l.seed_number);
      }

      const legosBySeed = {};
      for (const l of legoCounts || []) legosBySeed[l.seed_number] = (legosBySeed[l.seed_number] || 0) + 1;

      const phrasesBySeed = {};
      for (const p of phraseCounts || []) phrasesBySeed[p.seed_number] = (phrasesBySeed[p.seed_number] || 0) + 1;

      let complete = 0, drafted = 0, building = 0, empty = 0, flagged = 0, underThreshold = 0;
      const grid = (seeds || []).map(s => {
        const legos = legosBySeed[s.seed_number] || 0;
        const phrases = phrasesBySeed[s.seed_number] || 0;
        let status;
        if (underThresholdSeeds.has(s.seed_number)) { status = 'under-threshold'; underThreshold++; }
        else if (s.flagged_at) { status = 'flagged'; flagged++; }
        else if (s.approved_at) { status = 'complete'; complete++; }
        else if (s.decomposed_at) { status = 'drafted'; drafted++; }
        else if (legos > 0) { status = 'building'; building++; }
        else { status = 'empty'; empty++; }
        return { seed: s.seed_number, status, legos, phrases };
      });

      res.json({ seeds: grid, total: grid.length, complete, drafted, building, empty, flagged, underThreshold });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /build/mass-approve/:courseCode — approve all decomposed, non-flagged seeds
  router.post('/build/mass-approve/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    try {
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase
        .from('course_seeds')
        .update({ approved_at: now })
        .eq('course_code', courseCode)
        .not('decomposed_at', 'is', null)
        .is('approved_at', null)
        .is('flagged_at', null)
        .select('seed_number');

      if (error) throw error;
      const count = data?.length || 0;

      // Mark final pass as completed in quality_rules (backward compat)
      const { data: course } = await ctx.supabase
        .from('courses').select('quality_rules').eq('course_code', courseCode).single();
      await ctx.supabase.from('courses').update({
        quality_rules: { ...(course?.quality_rules || {}), final_pass_completed: true }
      }).eq('course_code', courseCode);

      // Mark final-pass build_jobs row as complete
      const { data: existingJob } = await ctx.supabase
        .from('build_jobs')
        .select('id')
        .eq('course_code', courseCode)
        .eq('pass', 'final-pass')
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingJob && existingJob.length > 0) {
        await ctx.supabase
          .from('build_jobs')
          .update({ status: 'complete', completed_at: new Date().toISOString() })
          .eq('id', existingJob[0].id);
      } else {
        // Pre-migration course — insert a complete row
        await ctx.supabase
          .from('build_jobs')
          .insert({
            course_code: courseCode,
            pass: 'final-pass',
            status: 'complete',
            total_seeds: count,
            completed_at: new Date().toISOString()
          });
      }

      res.json({ ok: true, approved: count, message: `Approved ${count} seeds` });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /build/set-flags/:courseCode — flag specific seeds (e.g., after final pass deletions)
  router.post('/build/set-flags/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { seeds } = req.body; // array of seed numbers
    if (!Array.isArray(seeds) || seeds.length === 0) {
      return res.status(400).json({ error: 'seeds array required' });
    }
    try {
      const now = new Date().toISOString();
      const { data, error } = await ctx.supabase
        .from('course_seeds')
        .update({ flagged_at: now })
        .eq('course_code', courseCode)
        .in('seed_number', seeds)
        .select('seed_number');
      if (error) throw error;
      res.json({ ok: true, flagged: data?.length || 0, seeds: (data || []).map(s => s.seed_number) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /build/clear-flags/:courseCode — unflag seeds (e.g., after backfill completes)
  router.post('/build/clear-flags/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { seeds } = req.body; // array of seed numbers, or omit to clear all flags
    try {
      let query = ctx.supabase
        .from('course_seeds')
        .update({ flagged_at: null })
        .eq('course_code', courseCode)
        .not('flagged_at', 'is', null);
      if (Array.isArray(seeds) && seeds.length > 0) {
        query = query.in('seed_number', seeds);
      }
      const { data, error } = await query.select('seed_number');
      if (error) throw error;
      res.json({ ok: true, cleared: data?.length || 0, seeds: (data || []).map(s => s.seed_number) });
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

      // Initialize course seeds from canonical before spawning agent
      // (GET translate endpoint calls initializeCourseSeeds as side effect)
      const initResp = await fetch(`http://localhost:${ctx.config.PORT || 3471}/api/course/${courseCode}/translate?limit=1`);
      if (!initResp.ok) console.warn(`[Translate] Seed init returned ${initResp.status} — agent will retry`);

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

      const claudeCmd = withJobDone(`cd "${projectDir}" && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobData?.id);
      spawnInTerminal(ctx, claudeCmd, 'Translate', courseCode, effectiveTerminal);

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

      const claudeCmd = withJobDone(`cd "${projectDir}" && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobData?.id);
      spawnInTerminal(ctx, claudeCmd, 'Decompose', courseCode, effectiveTerminal);

      res.json({ ok: true, course_code: courseCode, job_id: jobData?.id, message: `Decompose agent spawned` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /build/team-start/:courseCode
  router.post('/build/team-start/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.body?.terminal || req.query.terminal || 'iTerm2';

      const { data: activeJob } = await ctx.supabase
        .from('build_jobs').select('id')
        .eq('course_code', courseCode).eq('pass', 'build-team').in('status', ['running']).maybeSingle();
      if (activeJob) return res.status(409).json({ error: 'Build Team already running' });

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      const briefResp = await fetch(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/build-team-orchestrator?terminal=${effectiveTerminal}`);
      if (!briefResp.ok) throw new Error(`Failed to fetch build-team brief: ${briefResp.status}`);
      const brief = await briefResp.text();

      const tmpFile = `/tmp/build-team_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

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

      const claudeCmd = withJobDone(`cd "${projectDir}" && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobData?.id);
      spawnInTerminal(ctx, claudeCmd, 'Build Team', courseCode, effectiveTerminal);

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

      const seeds = req.query.seeds || null; // comma-separated seed numbers, or null for all
      const seedList = seeds ? seeds.split(',').map(Number).filter(n => n > 0) : null;
      const agents = req.query.agents || (seedList && seedList.length <= 20 ? Math.min(seedList.length, 3) : 6);

      // Build query params for brief
      const briefParams = new URLSearchParams({ agents: String(agents) });
      if (seedList) briefParams.set('seeds', seeds);

      const briefResp = await fetch(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/final-pass-orchestrator?${briefParams}`);
      if (!briefResp.ok) throw new Error(`Failed to fetch final-pass-orchestrator brief: ${briefResp.status}`);
      const brief = await briefResp.text();

      const tmpFile = `/tmp/final-pass_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;
      const totalSeeds = seedList ? seedList.length : 300;

      const { data: jobData } = await ctx.supabase
        .from('build_jobs')
        .insert({
          course_code: courseCode, pass: 'final-pass', status: 'running',
          current_seed: 0, seeds_completed: 0, total_seeds: totalSeeds,
          started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard', terminal: effectiveTerminal,
          agent_count: parseInt(agents), respawn_count: 0, machine_name: ctx.MACHINE_NAME, build_mode: 'final-pass'
        })
        .select('id').single();

      const claudeCmd = withJobDone(`cd "${projectDir}" && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobData?.id);
      spawnInTerminal(ctx, claudeCmd, 'Final Pass', courseCode, effectiveTerminal);

      res.json({ ok: true, course_code: courseCode, job_id: jobData?.id, message: `Final Pass agent spawned` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /build/component-backfill/:courseCode — Spawn Opus orchestrator for M-LEGO component backfill
  router.post('/build/component-backfill/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.query.terminal || 'iTerm2';

      const { data: activeJob } = await ctx.supabase
        .from('build_jobs').select('id')
        .eq('course_code', courseCode).eq('pass', 'component-backfill').in('status', ['running']).maybeSingle();
      if (activeJob) return res.status(409).json({ error: 'Component backfill already running' });

      const briefResp = await fetch(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/component-backfill`);
      if (!briefResp.ok) throw new Error(`Failed to fetch component-backfill brief: ${briefResp.status}`);
      const brief = await briefResp.text();

      const tmpFile = `/tmp/component-backfill_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      const { data: jobData } = await ctx.supabase
        .from('build_jobs')
        .insert({
          course_code: courseCode, pass: 'component-backfill', status: 'running',
          current_seed: 0, seeds_completed: 0, total_seeds: 0,
          started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard', terminal: effectiveTerminal,
          agent_count: 1, respawn_count: 0, machine_name: ctx.MACHINE_NAME, build_mode: 'component-backfill'
        })
        .select('id').single();

      const claudeCmd = withJobDone(`cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobData?.id);
      spawnInTerminal(ctx, claudeCmd, 'Component Backfill', courseCode);

      res.json({ ok: true, course_code: courseCode, job_id: jobData?.id, message: 'Component backfill agent spawned' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /build/component-gaps/:courseCode — Quick count of M-LEGOs needing components
  router.get('/build/component-gaps/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const cjk = /^(zho|jpn|kor|cmn|tha|mya|lao|khm)/.test(courseCode);

      // Single query, filter in JS (PostgREST can't match JSONB empty arrays)
      const { data: allMLegos, error } = await ctx.supabase
        .from('course_legos')
        .select('known_text, target_text, components')
        .eq('course_code', courseCode)
        .eq('type', 'M')
        .eq('is_new', true);

      if (error) throw error;

      let nullCount = 0, emptyCount = 0, partialCount = 0;

      for (const l of (allMLegos || [])) {
        const comps = l.components;
        const kw = (l.known_text || '').trim().split(/\s+/).length;
        const tw = (l.target_text || '').trim().split(/\s+/).length;

        // Skip single-word targets (can't split further) unless CJK
        if (kw < 2) continue;
        if (!cjk && tw < 2) continue;

        if (comps === null || comps === undefined) {
          nullCount++;
        } else if (Array.isArray(comps) && comps.length === 0) {
          emptyCount++;
        } else if (Array.isArray(comps) && comps.length === 1 && kw >= 2) {
          // Single component: if its target is a substring of the LEGO target,
          // the residual is structural (e.g. Greek να, Spanish se) — not a gap.
          const compTarget = (comps[0].target || '').trim();
          const legoTarget = (l.target_text || '').trim();
          if (compTarget !== legoTarget && !legoTarget.includes(compTarget)) partialCount++;
        }
      }

      const totalGaps = nullCount + emptyCount + partialCount;

      res.json({
        course_code: courseCode,
        total_m_legos: (allMLegos || []).length,
        gaps: {
          null_components: nullCount,
          empty_components: emptyCount,
          partial_components: partialCount,
          total: totalGaps
        },
        complete: totalGaps === 0
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Phrase Backfill ──────────────────────────────────────────────────────
  //
  // POST /build/backfill-submit/:courseCode — Add USE phrases to existing LEGOs.
  // Unlike /v2/phrases which enforces minimums, this appends to existing phrases
  // and continues numbering from where existing phrases left off.
  //
  // POST /build/backfill-phrases/:courseCode — Spawn a backfill agent.
  // Finds under-threshold LEGOs and spawns a Sonnet agent to write missing USE phrases.

  const { makePhraseId, computeLegoPosition } = require('../lib/phrase-structure.cjs');
  const { normalizeForContainment } = require('../lib/text-normalization.cjs');

  router.post('/build/backfill-submit/:courseCode', async (req, res) => {
    try {
      const courseCode = req.params.courseCode;
      const { phrases } = req.body;

      if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
        return res.status(400).json({ error: 'phrases must be a non-empty array' });
      }

      const errors = [];
      let totalInserted = 0;

      for (const entry of phrases) {
        const { seed_number, lego_index, use = [] } = entry;
        const label = `S${String(seed_number).padStart(4, '0')}L${String(lego_index).padStart(2, '0')}`;

        if (seed_number <= 3) {
          errors.push({ entry: label, error: 'Seeds 1-3 excluded from backfill (insufficient prior vocab)' });
          continue;
        }

        if (!use.length) {
          errors.push({ entry: label, error: 'No USE phrases provided' });
          continue;
        }

        // Verify LEGO exists and is new
        const { data: lego, error: legoErr } = await ctx.supabase
          .from('course_legos')
          .select('known_text, target_text, type, is_new')
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number)
          .eq('lego_index', lego_index)
          .single();

        if (legoErr || !lego) {
          errors.push({ entry: label, error: 'LEGO not found' });
          continue;
        }
        if (!lego.is_new) {
          errors.push({ entry: label, error: 'LEGO is duplicate (is_new: false)' });
          continue;
        }

        // Check containment — each phrase must contain the LEGO target
        const legoTargetNorm = normalizeForContainment(lego.target_text);
        const containmentFails = use.filter(p => {
          const target = p.target_text || p.target || '';
          return !normalizeForContainment(target).includes(legoTargetNorm);
        });
        if (containmentFails.length > 0) {
          errors.push({ entry: label, error: `${containmentFails.length} phrase(s) don't contain LEGO target "${lego.target_text}"` });
          continue;
        }

        // Get max existing USE phrase number from IDs (not count — IDs may have gaps)
        const { data: existingUse } = await ctx.supabase
          .from('course_practice_phrases')
          .select('id')
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number)
          .eq('lego_index', lego_index)
          .eq('phrase_role', 'use');

        let maxUseNum = 0;
        for (const row of existingUse || []) {
          // ID format: {course_code}:S{NNNN}L{NN}U{NN}
          const match = row.id.match(/U(\d+)$/);
          if (match) maxUseNum = Math.max(maxUseNum, parseInt(match[1], 10));
        }

        // Get max position for this LEGO to continue from
        const { data: maxPosRow } = await ctx.supabase
          .from('course_practice_phrases')
          .select('position')
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number)
          .eq('lego_index', lego_index)
          .order('position', { ascending: false })
          .limit(1);

        const startUseNum = maxUseNum + 1;
        const startPosition = (maxPosRow?.[0]?.position || 0) + 1;

        // Build phrase rows
        const rows = use.map((p, i) => ({
          id: makePhraseId(courseCode, seed_number, lego_index, 'use', startUseNum + i),
          course_code: courseCode,
          seed_number,
          lego_index,
          position: startPosition + i,
          known_text: p.known_text || p.known,
          target_text: p.target_text || p.target,
          word_count: (p.target_text || p.target).length,
          lego_count: ((p.known_text || p.known).match(/\s+/g) || []).length + 1,
          phrase_role: 'use',
          connected_lego_ids: [],
          lego_position: computeLegoPosition(p.target_text || p.target, lego.target_text),
          metadata: {
            format: 'build_use',
            pipeline: 'backfill',
            score: p.score || p.target_score,
            target_score: p.target_score,
            scored_at: new Date().toISOString()
          },
          status: 'draft',
          version: 1
        }));

        const { error: insertErr } = await ctx.supabase
          .from('course_practice_phrases')
          .upsert(rows, { onConflict: 'id' });

        if (insertErr) {
          errors.push({ entry: label, error: `Insert failed: ${insertErr.message}` });
          continue;
        }
        totalInserted += rows.length;
      }

      console.log(`[BACKFILL] ${courseCode}: ${totalInserted} phrases inserted, ${errors.length} errors`);

      // Clear final_pass_completed — backfilled phrases need re-review
      if (totalInserted > 0) {
        ctx.supabase.from('courses').select('quality_rules').eq('course_code', courseCode).single()
          .then(({ data: bfCourse }) => {
            if (bfCourse?.quality_rules?.final_pass_completed) {
              return ctx.supabase.from('courses').update({
                quality_rules: { ...(bfCourse.quality_rules), final_pass_completed: false }
              }).eq('course_code', courseCode);
            }
          })
          .catch(err => console.error('[BACKFILL] Failed to clear final_pass_completed:', err.message));
      }

      // Update build_jobs with progress + activity log (fire-and-forget)
      if (totalInserted > 0) {
        const progressTimestamp = new Date().toISOString();
        const seedNums = [...new Set(phrases.map(p => p.seed_number))];
        const activityEntry = {
          at: progressTimestamp,
          seed: seedNums.length === 1 ? seedNums[0] : null,
          phrases: totalInserted,
          msg: seedNums.length === 1
            ? `Seed ${seedNums[0]}: backfilled ${totalInserted} phrases`
            : `Backfilled ${totalInserted} phrases across ${seedNums.length} seeds`
        };
        ctx.supabase.from('build_jobs')
          .select('id, metadata, seeds_completed')
          .eq('course_code', courseCode)
          .eq('status', 'running')
          .single()
          .then(({ data: jobRow }) => {
            if (!jobRow) return;
            const meta = jobRow.metadata || {};
            const log = Array.isArray(meta.activity_log) ? meta.activity_log : [];
            log.push(activityEntry);
            while (log.length > 20) log.shift();
            meta.activity_log = log;
            return ctx.supabase.from('build_jobs')
              .update({
                seeds_completed: (jobRow.seeds_completed || 0) + seedNums.length,
                last_heartbeat: progressTimestamp,
                last_progress_at: progressTimestamp,
                metadata: meta
              })
              .eq('id', jobRow.id);
          })
          .catch(err => console.error('[BACKFILL] build_jobs update failed:', err.message));
      }

      res.json({
        ok: true,
        course_code: courseCode,
        phrases_inserted: totalInserted,
        entries_processed: phrases.length,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /build/backfill-phrases/:courseCode — Spawn backfill agent
  router.post('/build/backfill-phrases/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const terminal = req.query.terminal || 'iTerm2';

    try {
      // Fetch brief
      const briefUrl = `http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/backfill-phrases`;
      const briefResp = await fetch(briefUrl);
      if (!briefResp.ok) throw new Error(`Failed to fetch backfill brief: ${briefResp.status}`);
      const brief = await briefResp.text();

      const tmpFile = `/tmp/backfill_phrases_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      // Create build_jobs row (clear any stale running backfill-phrases first)
      await ctx.supabase
        .from('build_jobs')
        .update({ status: 'stopped', completed_at: new Date().toISOString() })
        .eq('course_code', courseCode)
        .eq('pass', 'backfill-phrases')
        .in('status', ['pending', 'running', 'stalled']);

      const { data: jobRow, error: jobErr } = await ctx.supabase
        .from('build_jobs')
        .insert({
          course_code: courseCode,
          pass: 'backfill-phrases',
          status: 'running',
          started_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString(),
          machine_name: ctx.MACHINE_NAME || 'unknown'
        })
        .select('id')
        .single();

      if (jobErr) console.error('[BACKFILL] build_jobs insert failed:', jobErr.message);
      const jobId = jobRow?.id;

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      let claudeCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      claudeCmd = withJobDone(claudeCmd, jobId);
      spawnInTerminal(ctx, claudeCmd, 'Backfill', courseCode);

      await ctx.supabase.from('orchestrator_messages').insert({
        course_code: courseCode,
        direction: 'agent_to_human',
        message: `Backfill agent spawned — adding USE phrases to under-threshold LEGOs`,
        status: 'pending',
        metadata: { action: 'backfill_phrases_spawned' }
      });

      res.json({ ok: true, course_code: courseCode, job_id: jobId, message: 'Backfill agent spawned' });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
};

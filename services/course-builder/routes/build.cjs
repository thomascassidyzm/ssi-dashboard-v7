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
const { snapshotSeeds, listSnapshots, restoreSnapshot } = require('../lib/redo-snapshot.cjs');
const { emitProgress } = require('../../shared/emit-progress.cjs');

module.exports = function (ctx) {
  const router = Router();

  // Helper: fetch a brief, throw with actual error message on failure.
  async function fetchBrief(url) {
    const resp = await fetch(url);
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      throw new Error(body.error || `Brief generation failed (${resp.status})`);
    }
    return resp.text();
  }

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
      const passLabel = job.pass === 'final-pass' ? 'Final pass' : job.pass === 'pass_1' ? 'Translation' : 'Build';
      emitProgress(ctx.supabase, job.course_code, `${passLabel} job complete`, { phase: 'build', action: 'job-done', pass: job.pass, jobId });
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

      // SNAPSHOT BEFORE DELETE — same contract as /build/redo: one before-image
      // row per seed, written first; if it throws, nothing is deleted.
      const rangeSeeds = [];
      for (let n = Number(from_seed); n <= Number(to_seed); n++) rangeSeeds.push(n);
      const { batchId: rebuildBatchId } = await snapshotSeeds(ctx.supabase, courseCode, rangeSeeds, {
        reason: 'rebuild-range',
        notes: `rebuild ${from_seed}-${to_seed}`,
      });
      console.log(`[REBUILD] ${courseCode} snapshot batch ${rebuildBatchId}: ${rangeSeeds.length} seed(s) captured before delete`);

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
        seeds_reset: seedsReset || 0,
        snapshot_batch_id: rebuildBatchId
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

      // SNAPSHOT BEFORE DELETE. The old decomposition is the only record of what
      // the human is asking to be changed — it feeds the undo (POST
      // /build/redo-undo) and the "previous decomposition" section of the redo
      // brief. If this throws, nothing is deleted.
      const { batchId, snapshots } = await snapshotSeeds(ctx.supabase, courseCode, seedNumbers, {
        reason: 'redo',
        notes,
      });
      console.log(`[REDO] ${courseCode} snapshot batch ${batchId}: ${snapshots.length} seed(s) captured before delete`);

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
      const brief = await fetchBrief(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/redo?seeds=${seedsParam}${notesParam}`);

      const tmpFile = `/tmp/redo_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      // Opus (not sonnet): Indic/Sinhala scripts degrade under Sonnet (sonnet-indic-script-degradation).
      // unset ANTHROPIC_API_KEY + CLAUDECODE so the spawned agent uses the Max subscription
      // instead of hitting "Credit balance too low" and hanging (matches every other build route).
      const claudeCmd = `cd "${projectDir}" && unset ANTHROPIC_API_KEY && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      spawnInTerminal(ctx, claudeCmd, 'Redo', courseCode);

      // Post status to chat
      await ctx.supabase.from('orchestrator_messages').insert({
        course_code: courseCode,
        direction: 'agent_to_human',
        message: `Redo agent spawned for seed${seedNumbers.length > 1 ? 's' : ''} ${seedNumbers.join(', ')}. Wiped ${totalLegosDeleted} LEGOs, ${totalPhrasesDeleted} phrases — the previous decomposition is snapshotted and can be restored (undo seed ${seedNumbers[0]}).`,
        status: 'pending',
        metadata: { action: 'redo_spawned', seeds: seedNumbers, snapshot_batch_id: batchId }
      });

      res.json({
        ok: true,
        seeds: seedNumbers,
        phrases_deleted: totalPhrasesDeleted,
        legos_deleted: totalLegosDeleted,
        seeds_reset: totalSeedsReset,
        snapshot_batch_id: batchId,
        snapshots,
        message: `Redo agent spawned for ${seedNumbers.length} seed(s). Previous decomposition snapshotted — undo with POST /api/build/redo-undo/${courseCode}.`
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /build/redo-snapshots/:courseCode — what can be undone.
  //   ?seed=42 to scope to one seed, ?limit=N (default 50). Newest first.
  router.get('/build/redo-snapshots/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    try {
      const snapshots = await listSnapshots(ctx.supabase, courseCode, {
        seed: req.query.seed || null,
        limit: Math.min(Number(req.query.limit) || 50, 200),
      });
      res.json({ ok: true, course_code: courseCode, count: snapshots.length, snapshots });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /build/redo-undo/:courseCode — restore a seed's pre-redo decomposition.
  // Body: { seed: 42 }            → newest snapshot for that seed
  //       { snapshot_id: "uuid" } → that exact snapshot
  //       { dry_run: true }       → report only, change nothing
  //
  // Deletes whatever the redo produced for the seed and re-inserts the
  // snapshotted LEGOs/phrases verbatim (same ids, same audio pointers), then
  // restores the seed's decomposed/approved/flagged stamps.
  router.post('/build/redo-undo/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { seed, snapshot_id, dry_run = false } = req.body || {};

    try {
      if (!seed && !snapshot_id) {
        return res.status(400).json({ ok: false, error: 'seed or snapshot_id required' });
      }

      const result = await restoreSnapshot(ctx.supabase, {
        courseCode,
        seedNumber: seed,
        snapshotId: snapshot_id,
        dryRun: !!dry_run,
        restoredBy: req.get('x-agent-role') || 'dashboard',
      });

      if (dry_run) return res.json({ ok: true, ...result });

      ctx.courseVocabCache.delete(courseCode);
      await bumpCourseVersion(ctx.supabase, courseCode, 'minor');

      console.log(`[REDO-UNDO] ${courseCode} seed ${result.seed_number}: restored ${result.restored.legos} LEGOs / ${result.restored.phrases} phrases from snapshot ${result.snapshot_id}`);

      await ctx.supabase.from('orchestrator_messages').insert({
        course_code: courseCode,
        direction: 'agent_to_human',
        message: `Undo applied to seed ${result.seed_number} — restored the pre-redo decomposition (${result.restored.legos} LEGOs, ${result.restored.phrases} phrases), replacing ${result.deleted.legos} LEGOs / ${result.deleted.phrases} phrases.`,
        status: 'pending',
        metadata: { action: 'redo_undo', seed_number: result.seed_number, snapshot_id: result.snapshot_id }
      });

      res.json({ ok: true, ...result });
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
      // Optional model override (default opus). Whitelist to safe values.
      const model = ['opus', 'sonnet', 'haiku', 'fable'].includes(String(req.query.model)) ? req.query.model : 'opus';

      // Initialize course seeds from canonical before spawning agent
      // (GET translate endpoint calls initializeCourseSeeds as side effect)
      const initResp = await fetch(`http://localhost:${ctx.config.PORT || 3471}/api/course/${courseCode}/translate?limit=1`);
      if (!initResp.ok) console.warn(`[Translate] Seed init returned ${initResp.status} — agent will retry`);

      const brief = await fetchBrief(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/translate`);

      const tmpFile = `/tmp/translate_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      let jobId;
      try {
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
        jobId = jobData?.id;
      } catch (e) {
        console.warn('[Translate] build_jobs insert failed (Supabase unreachable?) — spawning anyway:', e.message);
      }

      const claudeCmd = withJobDone(`cd "${projectDir}" && unset ANTHROPIC_API_KEY && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model ${model} --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobId);
      spawnInTerminal(ctx, claudeCmd, 'Translate', courseCode, effectiveTerminal);

      try {
        await ctx.supabase.from('orchestrator_messages').insert({
          course_code: courseCode,
          direction: 'agent_to_human',
          message: `Translation agent spawned — translating seeds`,
          status: 'pending',
          metadata: { action: 'translate_spawned' }
        });
      } catch (e) { /* non-critical */ }

      res.json({ ok: true, course_code: courseCode, job_id: jobId, message: `Translation agent spawned` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /build/decompose/:courseCode
  router.post('/build/decompose/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.query.terminal || 'iTerm2';



      const brief = await fetchBrief(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/decompose`);

      const tmpFile = `/tmp/decompose_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      let jobId;
      try {
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
        jobId = jobData?.id;
      } catch (e) {
        console.warn('[Decompose] build_jobs insert failed:', e.message);
      }

      const claudeCmd = withJobDone(`cd "${projectDir}" && unset ANTHROPIC_API_KEY && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobId);
      spawnInTerminal(ctx, claudeCmd, 'Decompose', courseCode, effectiveTerminal);

      res.json({ ok: true, course_code: courseCode, job_id: jobId, message: `Decompose agent spawned` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /build/team-start/:courseCode
  router.post('/build/team-start/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.body?.terminal || req.query.terminal || 'iTerm2';

      // Resolve the build target.
      // Priority: body.targetSeeds (the user's selection on the page) →
      // current courses.seed_count → 300.
      // If the body explicitly asked for a new size, persist it to courses.seed_count
      // so every downstream consumer (stats, briefs, phase8) stays in sync.
      const requestedTarget = Number.isFinite(Number(req.body?.targetSeeds))
        ? parseInt(req.body.targetSeeds, 10)
        : null;

      const { data: courseRow } = await ctx.supabase
        .from('courses')
        .select('seed_count')
        .eq('course_code', courseCode)
        .single();
      const currentSeedCount = courseRow?.seed_count || 300;

      const effectiveTargetSeeds = requestedTarget || currentSeedCount;

      if (requestedTarget && requestedTarget !== currentSeedCount) {
        const { error: updateErr } = await ctx.supabase
          .from('courses')
          .update({ seed_count: requestedTarget })
          .eq('course_code', courseCode);
        if (updateErr) {
          console.warn(`[BuildTeam] Failed to update courses.seed_count for ${courseCode}: ${updateErr.message}`);
        }
      }

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      const briefUrl = `http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/build-team-orchestrator?terminal=${effectiveTerminal}&target=${effectiveTargetSeeds}`;
      const brief = await fetchBrief(briefUrl);

      const tmpFile = `/tmp/build-team_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      let jobId;
      try {
        const { data: jobData } = await ctx.supabase
          .from('build_jobs')
          .insert({
            course_code: courseCode, pass: 'build-team', status: 'running',
            current_seed: 0, seeds_completed: 0, total_seeds: effectiveTargetSeeds,
            started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
            requested_by: 'dashboard', terminal: effectiveTerminal,
            agent_count: 1, respawn_count: 0, machine_name: ctx.MACHINE_NAME, build_mode: 'build-team'
          })
          .select('id').single();
        jobId = jobData?.id;
      } catch (e) {
        console.warn('[BuildTeam] build_jobs insert failed:', e.message);
      }

      const dryRun = req.body?.dryRun === true;

      if (!dryRun) {
        const claudeCmd = withJobDone(`cd "${projectDir}" && unset ANTHROPIC_API_KEY && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobId);
        spawnInTerminal(ctx, claudeCmd, 'Build Team', courseCode, effectiveTerminal);

        try {
          await ctx.supabase.from('orchestrator_messages').insert({
            course_code: courseCode,
            direction: 'agent_to_human',
            message: `Build team spawned — building seeds`,
            status: 'pending',
            metadata: { action: 'build_team_spawned' }
          });
        } catch (e) { /* non-critical */ }
      }

      res.json({
        ok: true,
        course_code: courseCode,
        job_id: jobId,
        message: dryRun ? `Build Team dry-run — agent NOT spawned` : `Build Team agent spawned`,
        target_seeds: effectiveTargetSeeds,
        brief_file: tmpFile,
        dry_run: dryRun
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /build/final-pass/:courseCode
  router.post('/build/final-pass/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.query.terminal || 'iTerm2';



      const seeds = req.query.seeds || null; // comma-separated seed numbers, or null for all
      const seedList = seeds ? seeds.split(',').map(Number).filter(n => n > 0) : null;
      const agents = req.query.agents || (seedList && seedList.length <= 20 ? Math.min(seedList.length, 3) : 6);

      // Build query params for brief
      const briefParams = new URLSearchParams({ agents: String(agents) });
      if (seedList) briefParams.set('seeds', seeds);

      const brief = await fetchBrief(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/final-pass-orchestrator?${briefParams}`);

      const tmpFile = `/tmp/final-pass_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;
      const totalSeeds = seedList ? seedList.length : 300;

      let jobId;
      try {
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
        jobId = jobData?.id;
      } catch (e) {
        console.warn('[FinalPass] build_jobs insert failed:', e.message);
      }

      const claudeCmd = withJobDone(`cd "${projectDir}" && unset ANTHROPIC_API_KEY && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobId);
      spawnInTerminal(ctx, claudeCmd, 'Final Pass', courseCode, effectiveTerminal);

      try {
        await ctx.supabase.from('orchestrator_messages').insert({
          course_code: courseCode,
          direction: 'agent_to_human',
          message: `Final pass agent spawned — reviewing ${totalSeeds} seed${totalSeeds !== 1 ? 's' : ''}`,
          status: 'pending',
          metadata: { action: 'final_pass_spawned' }
        });
      } catch (e) { /* non-critical */ }

      res.json({ ok: true, course_code: courseCode, job_id: jobId, message: `Final Pass agent spawned` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /build/category-llm/:courseCode
  // Spawn an Opus orchestrator that dispatches N Opus reviewers across seed batches.
  // Reviewers flag awkward / wrong-order / gender / translation-mismatch /
  // presentation-weird findings. Orchestrator verifies and decides action.
  // Default scope: seeds 1-150 (not full course).
  //   query: ?agents=N (default 6), ?seed_max=N (default 150), ?seeds=... , ?terminal=...
  router.post('/build/category-llm/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.query.terminal || 'iTerm2';
      const seeds = req.query.seeds || null;
      const seedList = seeds ? seeds.split(',').map(Number).filter(n => n > 0) : null;
      const seedMax = parseInt(req.query.seed_max) || 150;
      const agents = req.query.agents || (seedList && seedList.length <= 20 ? Math.min(seedList.length, 3) : 6);

      const mode = req.query.mode === 'lite' ? 'lite' : 'heavy';
      const briefParams = new URLSearchParams({ agents: String(agents) });
      if (seedList) briefParams.set('seeds', seeds);
      else briefParams.set('seed_max', String(seedMax));
      if (mode === 'lite') briefParams.set('mode', 'lite');

      const brief = await fetchBrief(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/category-llm-orchestrator?${briefParams}`);

      const tmpFile = `/tmp/category-llm_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;
      const totalSeeds = seedList ? seedList.length : seedMax;

      let jobId;
      try {
        const { data: jobData } = await ctx.supabase
          .from('build_jobs')
          .insert({
            course_code: courseCode, pass: 'category-llm', status: 'running',
            current_seed: 0, seeds_completed: 0, total_seeds: totalSeeds,
            started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
            requested_by: 'dashboard', terminal: effectiveTerminal,
            agent_count: parseInt(agents), respawn_count: 0, machine_name: ctx.MACHINE_NAME, build_mode: 'category-llm'
          })
          .select('id').single();
        jobId = jobData?.id;
      } catch (e) {
        console.warn('[CategoryLLM] build_jobs insert failed:', e.message);
      }

      const claudeCmd = withJobDone(`cd "${projectDir}" && unset ANTHROPIC_API_KEY && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobId);
      spawnInTerminal(ctx, claudeCmd, 'Category LLM', courseCode, effectiveTerminal);

      try {
        await ctx.supabase.from('orchestrator_messages').insert({
          course_code: courseCode,
          direction: 'agent_to_human',
          message: `Category LLM pre-check spawned — Opus orchestrator + ${agents} Opus reviewers across ${totalSeeds} seeds`,
          status: 'pending',
          metadata: { action: 'category_llm_spawned' }
        });
      } catch (e) { /* non-critical */ }

      res.json({ ok: true, course_code: courseCode, job_id: jobId, message: `Category LLM orchestrator spawned (seeds 1-${totalSeeds}, ${agents} reviewers)` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /build/learner-simulation/:courseCode
  // Spawn a single Opus agent that reads the course as a total beginner
  // and produces a final-final-pass report (no mutations). Runs after all
  // mechanical scans and specific-category LLM checks.
  //   query: ?max_seed=N   (default 150)
  //          ?terminal=iTerm2 | Terminal | headless   (default iTerm2)
  router.post('/build/learner-simulation/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.query.terminal || 'iTerm2';
      const maxSeed = parseInt(req.query.max_seed) || 150;

      const mode = req.query.mode === 'lite' ? 'lite' : 'heavy';
      const briefParams = new URLSearchParams({ max_seed: String(maxSeed) });
      if (mode === 'lite') briefParams.set('mode', 'lite');
      const brief = await fetchBrief(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/learner-simulation?${briefParams}`);

      const tmpFile = `/tmp/learner-simulation_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      let jobId;
      try {
        const { data: jobData } = await ctx.supabase
          .from('build_jobs')
          .insert({
            course_code: courseCode, pass: 'learner-simulation', status: 'running',
            current_seed: 0, seeds_completed: 0, total_seeds: maxSeed,
            started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
            requested_by: 'dashboard', terminal: effectiveTerminal,
            agent_count: 1, respawn_count: 0, machine_name: ctx.MACHINE_NAME, build_mode: 'learner-simulation'
          })
          .select('id').single();
        jobId = jobData?.id;
      } catch (e) {
        console.warn('[LearnerSim] build_jobs insert failed:', e.message);
      }

      // Opus agent — single thread, reads course sequentially, produces report.
      const claudeCmd = withJobDone(`cd "${projectDir}" && unset ANTHROPIC_API_KEY && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobId);
      spawnInTerminal(ctx, claudeCmd, 'Learner Simulation', courseCode, effectiveTerminal);

      try {
        await ctx.supabase.from('orchestrator_messages').insert({
          course_code: courseCode,
          direction: 'agent_to_human',
          message: `Learner simulation spawned — reading seeds 1-${maxSeed} as a total beginner`,
          status: 'pending',
          metadata: { action: 'learner_simulation_spawned' }
        });
      } catch (e) { /* non-critical */ }

      res.json({ ok: true, course_code: courseCode, job_id: jobId, message: `Learner simulation spawned (seeds 1-${maxSeed})` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /build/component-backfill/:courseCode — Spawn Opus orchestrator for M-LEGO component backfill
  router.post('/build/component-backfill/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.query.terminal || 'iTerm2';



      const brief = await fetchBrief(`http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/component-backfill`);

      const tmpFile = `/tmp/component-backfill_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      let jobId;
      try {
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
        jobId = jobData?.id;
      } catch (e) {
        console.warn('[ComponentBackfill] build_jobs insert failed:', e.message);
      }

      const claudeCmd = withJobDone(`cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobId);
      spawnInTerminal(ctx, claudeCmd, 'Component Backfill', courseCode);

      try {
        await ctx.supabase.from('orchestrator_messages').insert({
          course_code: courseCode,
          direction: 'agent_to_human',
          message: `Component backfill agent spawned — fixing M-LEGO components`,
          status: 'pending',
          metadata: { action: 'component_backfill_spawned' }
        });
      } catch (e) { /* non-critical */ }

      res.json({ ok: true, course_code: courseCode, job_id: jobId, message: 'Component backfill agent spawned' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /build/zut-collisions/:courseCode — Detect production-direction ZUT collisions
  // (one English prompt → multiple distinct Chinese answers, across the course's phrases).
  router.get('/build/zut-collisions/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const maxSeed = req.query.maxSeed ? parseInt(req.query.maxSeed, 10) : null;
      const nk = s => (s || '').toLowerCase().trim().replace(/[.?!,，。？！、]+$/, '');
      const nt = s => (s || '').replace(/[\s。，？！、.?!,]/g, '');
      let phrases = [], from = 0;
      while (true) {
        let q = ctx.supabase.from('course_practice_phrases')
          .select('known_text, target_text, seed_number')
          .eq('course_code', courseCode).neq('phrase_role', 'component');
        if (maxSeed) q = q.lte('seed_number', maxSeed);
        const { data, error } = await q.range(from, from + 999);
        if (error) throw error;
        if (!data || !data.length) break;
        phrases.push(...data);
        if (data.length < 1000) break;
        from += 1000;
      }
      const byK = new Map();
      for (const p of phrases) {
        const k = nk(p.known_text);
        if (!k || k.length < 2) continue;
        if (!byK.has(k)) byK.set(k, new Map());
        byK.get(k).set(nt(p.target_text), p.target_text);
      }
      const collisions = [];
      for (const [k, m] of byK) if (m.size >= 2) collisions.push({ known: k, n: m.size, targets: [...m.values()].slice(0, 4) });
      collisions.sort((a, b) => b.n - a.n);
      res.json({
        ok: true, course_code: courseCode, total_phrases: phrases.length,
        collisions: { total: collisions.length, items: collisions.slice(0, 60) },
        complete: collisions.length === 0,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /build/zut-resolve/:courseCode — Spawn agent to resolve ZUT collisions
  // (the native-speaker+methodologist at scale: consolidate / differentiate / standardise).
  router.post('/build/zut-resolve/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const terminal = req.query.terminal || 'iTerm2';
      const port = ctx.config.PORT || 3471;
      const brief = `# ZUT Collision Resolution — ${courseCode}

You are the native-speaker + methodologist that humans cannot be at 58-language scale. Resolve every production-direction collision so that ONE English prompt → exactly ONE target answer (Zero Uncertainty Test). The learner must never doubt which to say.

## 1. Detect
GET http://localhost:${port}/api/build/zut-collisions/${courseCode} — returns collisions (one English → ≥2 distinct target answers, with seed-level detail available in course_practice_phrases).

## 2. Resolve each (apply the methodology — see ralph-methodology.md + synonym-choice-architecture.md)
- **CONSOLIDATE** — variants are true synonyms → pick the canonical target (most beginner-confident / simplest / most-frequent). Rewrite the losing variants' target_text to it. ⚠ FIRST check the losing variant is not a *taught LEGO of its own seed* — if it is, you'd orphan that seed's lesson; differentiate by seed-context or escalate instead of silently consolidating.
- **DIFFERENTIATE** — genuinely different senses English conflates (know-fact 知道 vs know-person 认识) → keep both targets, rewrite each ENGLISH known_text to be specific so each maps uniquely. The disambiguator MUST be in the learner-facing English prompt, not a note.
- **STANDARDISE** — same words, structural variant (了/在/吗 optional) → pick the full natural form, rewrite the others.
- **Content-safety**: flag archaic/pejorative targets (don't teach them as neutral).
- **Cross-methodology**: never drop a deliberately-taught particle to "fix" a collision (re-gloss instead).

## 3. Verify before applying
For each resolution, confirm it actually achieves ZUT (especially DIFFERENTIATE: are the new English prompts distinct enough that a learner reliably produces the right target? If not, it FAILS — consolidate instead).

## 4. Apply
- DIFFERENTIATE = update course_practice_phrases.known_text (cheap, NO audio regen).
- CONSOLIDATE / STANDARDISE = update course_practice_phrases.target_text, then the changed Chinese needs audio regen (note which seeds for a follow-up scoped /generate).
Apply gloss-edits (DIFFERENTIATE) first. Re-run the detector to confirm the count drops. Report what you changed + any high-risk items you escalated.`;
      const tmpFile = `/tmp/zut-resolve_${courseCode}_${Date.now()}.md`;
      fs.writeFileSync(tmpFile, brief);
      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;
      let jobId;
      try {
        const { data: jobData } = await ctx.supabase.from('build_jobs').insert({
          course_code: courseCode, pass: 'zut-resolve', status: 'running',
          current_seed: 0, seeds_completed: 0, total_seeds: 0,
          started_at: new Date().toISOString(), last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard', terminal: effectiveTerminal,
          agent_count: 1, respawn_count: 0, machine_name: ctx.MACHINE_NAME, build_mode: 'zut-resolve'
        }).select('id').single();
        jobId = jobData?.id;
      } catch (e) { console.warn('[ZutResolve] build_jobs insert failed:', e.message); }
      const claudeCmd = withJobDone(`cd "${projectDir}" && unset CLAUDECODE && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`, jobId);
      spawnInTerminal(ctx, claudeCmd, 'ZUT Resolve', courseCode);
      try {
        await ctx.supabase.from('orchestrator_messages').insert({
          course_code: courseCode, direction: 'agent_to_human',
          message: 'ZUT resolution agent spawned — resolving collisions', status: 'pending',
          metadata: { action: 'zut_resolve_spawned' }
        });
      } catch (e) { /* non-critical */ }
      res.json({ ok: true, course_code: courseCode, job_id: jobId, message: 'ZUT resolution agent spawned' });
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

  const { makePhraseId, computeLegoPosition, partitionBareLegoPhrases } = require('../lib/phrase-structure.cjs');
  const { normalizeForContainment, checkSubstringContainment } = require('../lib/text-normalization.cjs');

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

        // A backfill exists to raise a LEGO above the phrase floor — the one
        // thing it must never do is top the count up with the LEGO itself.
        const bareBackfill = partitionBareLegoPhrases(use, lego.target_text).bare;
        if (bareBackfill.length > 0) {
          errors.push({ entry: label, error: `${bareBackfill.length} phrase(s) are the bare LEGO "${lego.target_text}" — backfill must add real practice, not a copy of the LEGO` });
          continue;
        }

        // Check containment — each phrase must contain the LEGO target
        const containmentFails = use.filter(p => {
          const target = p.target_text || p.target || '';
          return !checkSubstringContainment(lego.target_text, target, courseCode);
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

      // Clear flagged_at on backfilled seeds — the reason for flagging (under-threshold) is resolved
      if (totalInserted > 0) {
        const backfilledSeeds = [...new Set(phrases.map(p => p.seed_number))];
        ctx.supabase.from('course_seeds')
          .update({ flagged_at: null })
          .eq('course_code', courseCode)
          .in('seed_number', backfilledSeeds)
          .not('flagged_at', 'is', null)
          .then(({ error: flagErr }) => {
            if (flagErr) console.error('[BACKFILL] Failed to clear flags:', flagErr.message);
            else console.log(`[BACKFILL] Cleared flags on seeds: ${backfilledSeeds.join(', ')}`);
          });
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
      // Fetch brief (forward query params like min_use / seeds to the brief generator)
      const briefQuery = new URLSearchParams(req.query).toString();
      const briefUrl = `http://localhost:${ctx.config.PORT || 3471}/api/brief/${courseCode}/backfill-phrases${briefQuery ? '?' + briefQuery : ''}`;
      const brief = await fetchBrief(briefUrl);

      // Parse seed count from brief text ("in **N seeds**")
      const seedMatch = brief.match(/in\s+\*\*(\d+)\s+seed/);
      const underThresholdCount = seedMatch ? parseInt(seedMatch[1]) : 1;

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
          current_seed: 0,
          seeds_completed: 0,
          total_seeds: underThresholdCount || 1,
          started_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard',
          machine_name: ctx.MACHINE_NAME || 'unknown'
        })
        .select('id')
        .single();

      if (jobErr) console.error('[BACKFILL] build_jobs insert failed:', jobErr.message);
      const jobId = jobRow?.id;

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const effectiveTerminal = ctx.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      const bfModel = ['opus', 'sonnet', 'fable', 'haiku'].includes(req.query.model) ? req.query.model : 'sonnet';
      let claudeCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model ${bfModel} --dangerously-skip-permissions "$(cat ${tmpFile})"`;
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

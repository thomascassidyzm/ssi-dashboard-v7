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

      await bumpCourseVersion(ctx.supabase, courseCode, 'minor');

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

      const legosBySeed = {};
      for (const l of legoCounts || []) legosBySeed[l.seed_number] = (legosBySeed[l.seed_number] || 0) + 1;

      const phrasesBySeed = {};
      for (const p of phraseCounts || []) phrasesBySeed[p.seed_number] = (phrasesBySeed[p.seed_number] || 0) + 1;

      let complete = 0, drafted = 0, building = 0, empty = 0, flagged = 0;
      const grid = (seeds || []).map(s => {
        const legos = legosBySeed[s.seed_number] || 0;
        const phrases = phrasesBySeed[s.seed_number] || 0;
        let status;
        if (s.flagged_at) { status = 'flagged'; flagged++; }
        else if (s.approved_at) { status = 'complete'; complete++; }
        else if (s.decomposed_at) { status = 'drafted'; drafted++; }
        else if (legos > 0) { status = 'building'; building++; }
        else { status = 'empty'; empty++; }
        return { seed: s.seed_number, status, legos, phrases };
      });

      res.json({ seeds: grid, total: grid.length, complete, drafted, building, empty, flagged });
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

      const claudeCmd = `cd "${projectDir}" && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model opus --dangerously-skip-permissions "$(cat ${tmpFile})"`;
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
      const cjk = /^(zho|jpn|kor|cmn)/.test(courseCode);

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
          partialCount++;
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

  return router;
};

/**
 * Checkpoint QA management routes.
 *
 * Provides endpoints for checkpoint summaries, approval, configuration,
 * and automated QA scoring with drift detection.
 *
 * Mounted at /api/checkpoint by the main app — paths here omit that prefix.
 */

const { Router } = require('express');
const { CHECKPOINT_SEEDS, QA_DRIFT_THRESHOLD, getCheckpointStatus, getCheckpointConfig, approveCheckpoint, isQAPending } = require('../lib/checkpoint.cjs');
const { getRunningAgentCount } = require('../lib/agent-spawner.cjs');

module.exports = function (ctx) {
  const router = Router();

  // ===========================================================================
  // GET /checkpoint/summary/:courseCode — checkpoint summary for QA
  // ===========================================================================
  router.get('/checkpoint/summary/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const checkpoint = await getCheckpointStatus(ctx, courseCode);

    // Get completed seeds count (decomposed, including empty seeds)
    const { count: completedSeeds } = await ctx.supabase
      .from('course_seeds')
      .select('*', { count: 'exact', head: true })
      .eq('course_code', courseCode)
      .not('decomposed_at', 'is', null);

    // Get LEGO and phrase counts
    const { count: legoCount } = await ctx.supabase
      .from('course_legos')
      .select('id', { count: 'exact', head: true })
      .eq('course_code', courseCode);

    const { count: phraseCount } = await ctx.supabase
      .from('course_practice_phrases')
      .select('id', { count: 'exact', head: true })
      .eq('course_code', courseCode);

    // Get USE phrases with scores (sample ~50 for QA)
    // phrase_role: 'component'/'build' = BUILD, 'use' = USE (spaced repetition)
    const { data: usePhrases } = await ctx.supabase
      .from('course_practice_phrases')
      .select('id, seed_number, lego_index, known_text, target_text, phrase_role, metadata')
      .eq('course_code', courseCode)
      .eq('phrase_role', 'use')
      .order('seed_number', { ascending: true })
      .limit(100);  // Get 100, then sample

    // Sample ~50 evenly distributed
    const sampleSize = Math.min(50, usePhrases?.length || 0);
    const step = Math.max(1, Math.floor((usePhrases?.length || 1) / sampleSize));
    const sampledPhrases = [];
    for (let i = 0; i < (usePhrases?.length || 0) && sampledPhrases.length < sampleSize; i += step) {
      const p = usePhrases[i];
      sampledPhrases.push({
        id: p.id,
        seed: p.seed_number,
        lego: p.lego_index,
        known: p.known_text,
        target: p.target_text,
        agent_score: p.metadata?.score || null,
        scored_at: p.metadata?.scored_at || null
      });
    }

    // Calculate score distribution
    const allScores = (usePhrases || [])
      .map(p => p.metadata?.score)
      .filter(s => typeof s === 'number');
    const scoreDistribution = {};
    for (let s = 1; s <= 9; s++) {
      scoreDistribution[s] = allScores.filter(score => score === s).length;
    }
    const avgScore = allScores.length > 0
      ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
      : null;

    res.json({
      course_code: courseCode,
      checkpoint: {
        checkpoint_seeds: checkpoint.checkpoint_seeds,
        next_checkpoint: checkpoint.next_checkpoint,
        checkpoints: checkpoint.checkpoints,
        drift_history: checkpoint.drift_history,
        calibration_feedback: checkpoint.calibration_feedback
      },
      summary: {
        seeds_complete: completedSeeds || 0,
        total_legos: legoCount || 0,
        total_phrases: phraseCount || 0,
        use_phrases_count: usePhrases?.length || 0,
        avg_score: avgScore,
        score_distribution: scoreDistribution
      },
      sample_for_qa: {
        count: sampledPhrases.length,
        phrases: sampledPhrases,
        instructions: [
          'QA agent should independently re-score each phrase (5-9)',
          'Gate 1: QA avg must be >= 7.0 (absolute quality)',
          'Gate 2: USE phrases must outscore BUILD phrases',
          'Gate 3: Check for vocabulary violations (words not yet introduced)',
          'Gate 4: Compare QA scores vs agent scores for drift',
          'If any gate fails, REJECT - do not approve'
        ]
      },
      actions: checkpoint.next_checkpoint === null
        ? { status: 'ALL_APPROVED', message: 'All checkpoints approved, build can continue to completion' }
        : {
            status: 'AWAITING_APPROVAL',
            approve_url: `POST /api/checkpoint/approve/${courseCode}?seed=${checkpoint.next_checkpoint}`,
            message: `Run QA review, then approve checkpoint at seed ${checkpoint.next_checkpoint}`
          }
    });
  });

  // ===========================================================================
  // POST /checkpoint/approve/:courseCode — approve checkpoint to unblock build
  // ===========================================================================
  router.post('/checkpoint/approve/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { approved_by = 'human', qa_report = null } = req.body || {};

    const currentStatus = await getCheckpointStatus(ctx, courseCode);

    // Determine which checkpoint to approve
    let checkpointSeed = req.query.seed ? parseInt(req.query.seed, 10) : currentStatus.next_checkpoint;

    if (!checkpointSeed || !CHECKPOINT_SEEDS.includes(checkpointSeed)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid checkpoint seed',
        valid_checkpoints: CHECKPOINT_SEEDS,
        next_checkpoint: currentStatus.next_checkpoint
      });
    }

    // Check if already approved
    if (currentStatus.checkpoints[checkpointSeed]?.approved) {
      return res.json({
        ok: true,
        status: 'ALREADY_APPROVED',
        course_code: courseCode,
        checkpoint_seed: checkpointSeed,
        approved_at: currentStatus.checkpoints[checkpointSeed].approvedAt,
        approved_by: currentStatus.checkpoints[checkpointSeed].approvedBy
      });
    }

    // Get checkpoint config for threshold comparison
    const config = await getCheckpointConfig(ctx, courseCode, checkpointSeed);

    // Extract QA metrics from report (if provided)
    const qaQuality = qa_report?.quality_gates?.gate_1_absolute_quality?.qa_avg_score
                   || qa_report?.qa_avg_score
                   || null;
    const qaDrift = qa_report?.quality_gates?.gate_4_drift?.drift
                 || qa_report?.drift
                 || null;

    // Determine approval status based on thresholds
    let finalStatus = 'approved';
    let rejectionReason = null;

    if (qa_report && qaQuality !== null && qaDrift !== null) {
      // QA report provided - check against thresholds
      const qualityPass = qaQuality >= config.min_quality_score;
      const driftPass = qaDrift <= config.max_drift_rate;

      if (!qualityPass || !driftPass) {
        finalStatus = 'pending_human';
        rejectionReason = [];
        if (!qualityPass) {
          rejectionReason.push(`Quality ${qaQuality.toFixed(2)} < threshold ${config.min_quality_score}`);
        }
        if (!driftPass) {
          rejectionReason.push(`Drift ${qaDrift.toFixed(2)} > threshold ${config.max_drift_rate}`);
        }
        rejectionReason = rejectionReason.join('; ');

        console.log(`[CHECKPOINT] QA FLAGGED for human review: ${rejectionReason}`);
      } else {
        console.log(`[CHECKPOINT] QA PASSED: quality=${qaQuality.toFixed(2)} (>=${config.min_quality_score}), drift=${qaDrift.toFixed(2)} (<=${config.max_drift_rate})`);
      }
    } else if (approved_by === 'human') {
      // Human override - always approve
      finalStatus = 'approved';
      console.log(`[CHECKPOINT] Human override - approving without QA check`);
    }

    // Record the checkpoint result
    await approveCheckpoint(ctx, courseCode, checkpointSeed, approved_by, qa_report, finalStatus);

    // If flagged for human review, return early without spawning agent
    if (finalStatus === 'pending_human') {
      return res.json({
        ok: true,
        status: 'FLAGGED_FOR_HUMAN',
        course_code: courseCode,
        checkpoint_seed: checkpointSeed,
        checkpoint_number: CHECKPOINT_SEEDS.indexOf(checkpointSeed) + 1,
        reason: rejectionReason,
        qa_metrics: { quality: qaQuality, drift: qaDrift },
        thresholds: { min_quality: config.min_quality_score, max_drift: config.max_drift_rate },
        message: 'QA check outside tolerance - flagged for human review',
        action: 'Human must review and manually approve via POST /api/checkpoint/approve with approved_by=human'
      });
    }

    // Log QA report if provided
    if (qa_report) {
      console.log(`[CHECKPOINT] QA report for ${courseCode} seed ${checkpointSeed}:`, JSON.stringify(qa_report, null, 2));
    }

    // AUTO-SPAWN FRESH AGENT after checkpoint approval (Ralph loop pattern)
    // Fresh spawn ensures: full methodology prompt + latest build_lessons + no context rot
    // CRITICAL: Only spawn if no agent is already running (prevents duplicate agents)
    const build = ctx.activeBuilds.get(courseCode);
    const runningAgents = getRunningAgentCount();
    let didSpawn = false;

    if (build) {
      if (runningAgents > 0) {
        console.log(`[CHECKPOINT] Skipping spawn - ${runningAgents} agent(s) already running for ${courseCode}`);
        build.status = 'checkpoint_approved';
        build.lastProgressTime = Date.now();
      } else {
        console.log(`[CHECKPOINT] Spawning fresh agent for ${courseCode} after checkpoint ${checkpointSeed} approval`);

        // Kill existing tracked agent if any (shouldn't happen since runningAgents is 0)
        if (build.agent) {
          try { process.kill(build.agent.pid, 'SIGTERM'); } catch (e) {}
          build.agent = null;
        }

        // NO AUTO-SPAWN: Dashboard controls agent spawning
        // Just update status - dashboard will spawn agent when ready
        build.status = 'checkpoint_approved';
        build.lastProgressTime = Date.now();
        console.log(`[CHECKPOINT] ${courseCode}: Checkpoint approved, ready for agent spawn from dashboard`);
      }
    }

    // Get updated status
    const newStatus = await getCheckpointStatus(ctx, courseCode);

    res.json({
      ok: true,
      status: 'APPROVED',
      course_code: courseCode,
      checkpoint_seed: checkpointSeed,
      checkpoint_number: CHECKPOINT_SEEDS.indexOf(checkpointSeed) + 1,
      message: `Checkpoint ${checkpointSeed} approved. ${newStatus.next_checkpoint ? 'Next checkpoint at seed ' + newStatus.next_checkpoint : 'All checkpoints complete!'}`,
      approved_by,
      approved_at: new Date().toISOString(),
      calibration_feedback: newStatus.calibration_feedback,
      next_checkpoint: newStatus.next_checkpoint,
      auto_spawn: didSpawn,
      agents_running: runningAgents,
      next_action: didSpawn ? 'Fresh agent spawned automatically' : (runningAgents > 0 ? `Agent already running (${runningAgents} active)` : `Start build with POST /api/build/start/${courseCode}`)
    });
  });

  // ===========================================================================
  // GET /checkpoint/status/:courseCode — get checkpoint status
  // ===========================================================================
  router.get('/checkpoint/status/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const status = await getCheckpointStatus(ctx, courseCode);

    // Count approved checkpoints
    const approvedCount = Object.values(status.checkpoints).filter(cp => cp.approved).length;

    res.json({
      course_code: courseCode,
      checkpoint_enabled: CHECKPOINT_SEEDS.length > 0,
      checkpoint_seeds: CHECKPOINT_SEEDS,
      ...status,
      summary: {
        total_checkpoints: CHECKPOINT_SEEDS.length,
        approved_count: approvedCount,
        all_approved: status.next_checkpoint === null
      },
      message: status.next_checkpoint === null
        ? `All ${CHECKPOINT_SEEDS.length} checkpoints approved`
        : `Checkpoint ${status.next_checkpoint} awaiting approval (${approvedCount}/${CHECKPOINT_SEEDS.length} complete)`
    });
  });

  // ===========================================================================
  // GET /checkpoint/config/:courseCode — get checkpoint config for course
  // ===========================================================================
  router.get('/checkpoint/config/:courseCode', async (req, res) => {
    const { courseCode } = req.params;

    // Get course-specific config
    const { data: courseConfig } = await ctx.supabase
      .from('course_checkpoint_config')
      .select('checkpoint_seed, review_mode, min_quality_score, max_drift_rate')
      .eq('course_code', courseCode)
      .order('checkpoint_seed');

    // Get default config
    const { data: defaultConfig } = await ctx.supabase
      .from('course_checkpoint_config')
      .select('checkpoint_seed, review_mode, min_quality_score, max_drift_rate')
      .eq('course_code', '_default')
      .order('checkpoint_seed');

    // Merge: course-specific overrides defaults
    const configMap = {};
    for (const cfg of (defaultConfig || [])) {
      configMap[cfg.checkpoint_seed] = { ...cfg, source: '_default' };
    }
    for (const cfg of (courseConfig || [])) {
      configMap[cfg.checkpoint_seed] = { ...cfg, source: courseCode };
    }

    res.json({
      course_code: courseCode,
      checkpoint_seeds: CHECKPOINT_SEEDS,
      config: CHECKPOINT_SEEDS.map(seed => configMap[seed] || {
        checkpoint_seed: seed,
        review_mode: 'human',
        min_quality_score: 7.0,
        max_drift_rate: 0.20,
        source: 'fallback'
      }),
      usage: {
        human: 'Build stops, waits for human approval',
        auto: 'QA agent auto-approves if gates pass',
        auto_with_flag: 'Auto-approve but flag for later human spot-check'
      }
    });
  });

  // ===========================================================================
  // PUT /checkpoint/config/:courseCode — update checkpoint config
  // ===========================================================================
  router.put('/checkpoint/config/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { checkpoint_seed, review_mode, min_quality_score, max_drift_rate } = req.body;

    if (!checkpoint_seed || !CHECKPOINT_SEEDS.includes(checkpoint_seed)) {
      return res.status(400).json({
        error: 'Invalid checkpoint_seed',
        valid_seeds: CHECKPOINT_SEEDS
      });
    }

    if (!review_mode || !['human', 'auto', 'auto_with_flag'].includes(review_mode)) {
      return res.status(400).json({
        error: 'Invalid review_mode',
        valid_modes: ['human', 'auto', 'auto_with_flag']
      });
    }

    const { error } = await ctx.supabase
      .from('course_checkpoint_config')
      .upsert({
        course_code: courseCode,
        checkpoint_seed,
        review_mode,
        min_quality_score: min_quality_score || 7.0,
        max_drift_rate: max_drift_rate || 0.20,
        updated_at: new Date().toISOString()
      }, { onConflict: 'course_code,checkpoint_seed' });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    console.log(`[CONFIG] Updated ${courseCode} checkpoint ${checkpoint_seed} -> ${review_mode}`);

    res.json({
      ok: true,
      course_code: courseCode,
      checkpoint_seed,
      review_mode,
      message: `Checkpoint ${checkpoint_seed} now uses '${review_mode}' review mode`
    });
  });

  // ===========================================================================
  // AUTOMATED CHECKPOINT QA ENDPOINTS
  // ===========================================================================

  // ===========================================================================
  // GET /checkpoint/qa-sample/:courseCode — get sample phrases for QA scoring
  // ===========================================================================
  router.get('/checkpoint/qa-sample/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { reveal_scores = 'false', checkpoint } = req.query;

    try {
      // Get pending QA job info or use query param
      const qaJob = ctx.pendingQAJobs.get(courseCode);
      const checkpointSeed = checkpoint ? parseInt(checkpoint, 10)
        : (qaJob?.checkpoint_seed || CHECKPOINT_SEEDS[0]);

      // Find the previous checkpoint seed (range start)
      const checkpointIndex = CHECKPOINT_SEEDS.indexOf(checkpointSeed);
      const rangeStart = checkpointIndex > 0 ? CHECKPOINT_SEEDS[checkpointIndex - 1] + 1 : 1;
      const rangeEnd = checkpointSeed;

      // Get USE phrases from this checkpoint range (seed_number is a direct column)
      const { data: phrases, error } = await ctx.supabase
        .from('course_practice_phrases')
        .select('id, seed_number, lego_index, known_text, target_text, metadata')
        .eq('course_code', courseCode)
        .eq('phrase_role', 'use')
        .gte('seed_number', rangeStart)
        .lte('seed_number', rangeEnd)
        .order('seed_number', { ascending: true })
        .limit(100);

      if (error) throw error;

      const inRangePhrases = phrases || [];

      // Randomly sample ~20 phrases
      const shuffled = inRangePhrases.sort(() => 0.5 - Math.random());
      const sample = shuffled.slice(0, 20);

      // Calculate agent's average score for comparison
      const agentScores = sample.map(p => p.metadata?.score).filter(s => typeof s === 'number');
      const agentAvg = agentScores.length > 0
        ? (agentScores.reduce((a, b) => a + b, 0) / agentScores.length).toFixed(2)
        : null;

      // Format response
      const formattedSample = sample.map(p => ({
        phrase_id: p.id,
        known: p.known_text,
        target: p.target_text,
        seed: p.seed_number,
        lego: p.lego_index,
        // Only reveal agent score if requested (QA should score first)
        agent_score: reveal_scores === 'true' ? p.metadata?.score : '[HIDDEN - score first]'
      }));

      res.json({
        ok: true,
        course_code: courseCode,
        checkpoint_seed: checkpointSeed,
        checkpoint_number: checkpointIndex + 1,
        range: { start: rangeStart, end: rangeEnd },
        sample_size: sample.length,
        agent_avg: reveal_scores === 'true' ? agentAvg : '[HIDDEN]',
        drift_threshold: QA_DRIFT_THRESHOLD,
        phrases: formattedSample,
        instructions: [
          'Score each phrase 5-9 based on quality (see ralph-methodology.md)',
          'Do NOT look at agent scores until after you score',
          `POST results to /api/checkpoint/qa-result/${courseCode}`,
          `Auto-approve if |your_avg - agent_avg| <= ${QA_DRIFT_THRESHOLD}`
        ]
      });
    } catch (err) {
      console.error(`[QA SAMPLE] Error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // POST /checkpoint/qa-result/:courseCode — submit QA scoring results
  // ===========================================================================
  router.post('/checkpoint/qa-result/:courseCode', async (req, res) => {
    const { courseCode } = req.params;
    const { checkpoint_seed, scores, overall_assessment, recommendation } = req.body;

    try {
      if (!scores || !Array.isArray(scores) || scores.length === 0) {
        return res.status(400).json({ error: 'Missing scores array' });
      }

      // Get the QA job info
      const qaJob = ctx.pendingQAJobs.get(courseCode);
      const actualCheckpointSeed = checkpoint_seed || qaJob?.checkpoint_seed;

      if (!actualCheckpointSeed) {
        return res.status(400).json({ error: 'No checkpoint_seed provided and no pending QA job' });
      }

      // Calculate QA average
      const qaScores = scores.map(s => s.qa_score).filter(s => typeof s === 'number');
      const qaAvg = qaScores.reduce((a, b) => a + b, 0) / qaScores.length;

      // Get agent scores for the same phrases
      const phraseIds = scores.map(s => s.phrase_id);
      const { data: agentPhrases } = await ctx.supabase
        .from('course_practice_phrases')
        .select('id, metadata')
        .in('id', phraseIds);

      const agentScores = (agentPhrases || [])
        .map(p => p.metadata?.score)
        .filter(s => typeof s === 'number');
      const agentAvg = agentScores.length > 0
        ? agentScores.reduce((a, b) => a + b, 0) / agentScores.length
        : qaAvg; // Fallback if no agent scores

      // Calculate drift
      const drift = Math.abs(qaAvg - agentAvg);
      const driftOK = drift <= QA_DRIFT_THRESHOLD;

      console.log(`[QA RESULT] ${courseCode} checkpoint ${actualCheckpointSeed}:`);
      console.log(`  QA avg: ${qaAvg.toFixed(2)}, Agent avg: ${agentAvg.toFixed(2)}, Drift: ${drift.toFixed(2)}`);
      console.log(`  Drift ${driftOK ? '<=' : '>'} ${QA_DRIFT_THRESHOLD} -> ${driftOK ? 'AUTO-APPROVE' : 'FLAG FOR HUMAN'}`);

      // Build QA report
      const qaReport = {
        qa_timestamp: new Date().toISOString(),
        checkpoint_seed: actualCheckpointSeed,
        sample_size: scores.length,
        quality_gates: {
          gate_1_absolute_quality: {
            qa_avg_score: qaAvg,
            threshold: 7.0,
            status: qaAvg >= 7.0 ? 'PASS' : 'FAIL'
          },
          gate_4_drift: {
            avg_agent_score: agentAvg,
            avg_qa_score: qaAvg,
            drift: drift,
            drift_rate: `${(drift * 100 / agentAvg).toFixed(1)}%`,
            threshold: QA_DRIFT_THRESHOLD,
            status: driftOK ? 'PASS' : 'FAIL'
          }
        },
        overall_assessment,
        recommendation: driftOK ? 'approve' : 'flag_human',
        scored_phrases: scores
      };

      // Clear pending QA job
      ctx.pendingQAJobs.delete(courseCode);

      // Determine final action
      if (driftOK && qaAvg >= 7.0) {
        // Auto-approve
        await approveCheckpoint(ctx, courseCode, actualCheckpointSeed, 'qa_agent', qaReport, 'approved');

        res.json({
          ok: true,
          status: 'AUTO_APPROVED',
          course_code: courseCode,
          checkpoint_seed: actualCheckpointSeed,
          qa_avg: qaAvg.toFixed(2),
          agent_avg: agentAvg.toFixed(2),
          drift: drift.toFixed(2),
          drift_threshold: QA_DRIFT_THRESHOLD,
          message: `Checkpoint ${actualCheckpointSeed} auto-approved. Drift ${drift.toFixed(2)} <= ${QA_DRIFT_THRESHOLD}. Build agent can continue.`,
          next_action: 'Build agent will automatically continue to next seed'
        });
      } else {
        // Flag for human review
        const reason = qaAvg < 7.0
          ? `Quality too low (${qaAvg.toFixed(2)} < 7.0)`
          : `Drift too high (${drift.toFixed(2)} > ${QA_DRIFT_THRESHOLD})`;

        await approveCheckpoint(ctx, courseCode, actualCheckpointSeed, 'qa_agent', qaReport, 'pending_human');

        res.json({
          ok: true,
          status: 'FLAGGED_FOR_HUMAN',
          course_code: courseCode,
          checkpoint_seed: actualCheckpointSeed,
          qa_avg: qaAvg.toFixed(2),
          agent_avg: agentAvg.toFixed(2),
          drift: drift.toFixed(2),
          drift_threshold: QA_DRIFT_THRESHOLD,
          reason,
          message: `Checkpoint ${actualCheckpointSeed} flagged for human review. ${reason}`,
          next_action: 'Human must approve at POST /api/checkpoint/approve/' + courseCode
        });
      }
    } catch (err) {
      console.error(`[QA RESULT] Error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // GET /checkpoint/qa-status/:courseCode — check if QA is pending
  // ===========================================================================
  router.get('/checkpoint/qa-status/:courseCode', (req, res) => {
    const { courseCode } = req.params;
    const job = ctx.pendingQAJobs.get(courseCode);

    res.json({
      course_code: courseCode,
      qa_pending: !!job && job.status === 'running',
      job: job || null
    });
  });

  return router;
};

/**
 * Golden seed management routes.
 *
 * Endpoints:
 *   GET  /golden/seed-status/:courseCode/:seedNumber
 *   GET  /golden/status/:courseCode
 *   POST /golden/finalize/:courseCode
 */

const { Router } = require('express');
const { getGoldenSeedCount } = require('../lib/language-config.cjs');

module.exports = function(ctx) {
  const router = Router();

  // ---------------------------------------------------------------------------
  // GET /golden/seed-status/:courseCode/:seedNumber
  // Coordination primitive for golden seed builder.
  // Both Creator and Checker agents poll this to know the current state of a seed.
  // Returns status: "empty" | "submitted" | "checking" | "flagged" | "approved" | "escalated"
  // ---------------------------------------------------------------------------
  router.get('/golden/seed-status/:courseCode/:seedNumber', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const seedNumber = parseInt(req.params.seedNumber);
      if (!seedNumber || seedNumber < 1) {
        return res.status(400).json({ error: 'Invalid seed number' });
      }

      // Count phrases for this seed
      const { count: phrasesCount, error: phrasesErr } = await ctx.supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('seed_number', seedNumber);
      if (phrasesErr) throw phrasesErr;

      // Count checked phrases (qa_checked is TIMESTAMPTZ, not boolean)
      const { count: checkedCount, error: checkedErr } = await ctx.supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('seed_number', seedNumber)
        .not('qa_checked', 'is', null);
      if (checkedErr) throw checkedErr;

      // Get open flags for this seed
      const { data: openFlags, error: flagErr } = await ctx.supabase
        .from('course_qa_flags')
        .select('id, check_type, severity, issue, details, phrase_id')
        .eq('course_code', courseCode)
        .eq('seed_number', seedNumber)
        .eq('status', 'open');
      if (flagErr) throw flagErr;

      // Count resolved flags to derive round number
      const { count: resolvedFlagCount, error: resolvedErr } = await ctx.supabase
        .from('course_qa_flags')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('seed_number', seedNumber)
        .in('status', ['resolved', 'ignored', 'false_positive']);
      if (resolvedErr) throw resolvedErr;

      // Derive round: each revision cycle creates flags then resolves them
      // Round 1 = initial submission, round increments with each flag+rebuild cycle
      const totalFlagCycles = openFlags.length > 0
        ? Math.ceil((resolvedFlagCount + 1) / Math.max(1, openFlags.length))
        : (resolvedFlagCount > 0 ? Math.ceil(resolvedFlagCount / 3) + 1 : 1);
      const round = Math.max(1, totalFlagCycles);

      const uncheckedCount = (phrasesCount || 0) - (checkedCount || 0);

      // Derive status
      let status;
      if (!phrasesCount || phrasesCount === 0) {
        status = 'empty';
      } else if (openFlags && openFlags.length > 0) {
        status = round >= 3 ? 'escalated' : 'flagged';
      } else if (checkedCount === phrasesCount) {
        status = 'approved';
      } else if (checkedCount > 0) {
        status = 'checking';
      } else {
        status = 'submitted';
      }

      res.json({
        seed_number: seedNumber,
        status,
        round,
        phrases_count: phrasesCount || 0,
        flags: (openFlags || []).map(f => ({
          id: f.id,
          check_type: f.check_type,
          severity: f.severity,
          issue: f.issue,
          details: f.details,
          phrase_id: f.phrase_id
        })),
        checked_count: checkedCount || 0,
        unchecked_count: uncheckedCount
      });
    } catch (err) {
      console.error('[GOLDEN] Error getting seed status:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /golden/status/:courseCode
  // Batch status for all golden seeds.
  // Returns status array for seeds 1-N (where N = golden_seed_count or target param)
  // ---------------------------------------------------------------------------
  router.get('/golden/status/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const targetSeeds = parseInt(req.query.target) || 50;

      // Fetch course info for golden seed count
      const { data: courseInfo } = await ctx.supabase
        .from('courses')
        .select('quality_rules')
        .eq('course_code', courseCode)
        .single();

      const goldenCount = getGoldenSeedCount(courseInfo);
      const effectiveTarget = Math.min(targetSeeds, goldenCount);

      // Batch fetch: all phrases counts grouped by seed
      const { data: phraseCounts, error: pcErr } = await ctx.supabase
        .from('course_practice_phrases')
        .select('seed_number, qa_checked')
        .eq('course_code', courseCode)
        .gte('seed_number', 1)
        .lte('seed_number', effectiveTarget);
      if (pcErr) throw pcErr;

      // Batch fetch: all open flags for these seeds
      const { data: allFlags, error: afErr } = await ctx.supabase
        .from('course_qa_flags')
        .select('seed_number, status')
        .eq('course_code', courseCode)
        .gte('seed_number', 1)
        .lte('seed_number', effectiveTarget);
      if (afErr) throw afErr;

      // Aggregate per seed
      const seedMap = {};
      for (let i = 1; i <= effectiveTarget; i++) {
        seedMap[i] = { total: 0, checked: 0, open_flags: 0, resolved_flags: 0 };
      }

      for (const p of (phraseCounts || [])) {
        if (!seedMap[p.seed_number]) seedMap[p.seed_number] = { total: 0, checked: 0, open_flags: 0, resolved_flags: 0 };
        seedMap[p.seed_number].total++;
        if (p.qa_checked) seedMap[p.seed_number].checked++;
      }

      for (const f of (allFlags || [])) {
        if (!seedMap[f.seed_number]) continue;
        if (f.status === 'open') seedMap[f.seed_number].open_flags++;
        else seedMap[f.seed_number].resolved_flags++;
      }

      const seeds = [];
      let approvedCount = 0;
      let flaggedCount = 0;
      let escalatedCount = 0;

      for (let i = 1; i <= effectiveTarget; i++) {
        const s = seedMap[i];
        const round = s.resolved_flags > 0 ? Math.ceil(s.resolved_flags / 3) + 1 : 1;

        let status;
        if (s.total === 0) status = 'empty';
        else if (s.open_flags > 0) status = round >= 3 ? 'escalated' : 'flagged';
        else if (s.checked === s.total) status = 'approved';
        else if (s.checked > 0) status = 'checking';
        else status = 'submitted';

        if (status === 'approved') approvedCount++;
        if (status === 'flagged') flaggedCount++;
        if (status === 'escalated') escalatedCount++;

        seeds.push({ seed_number: i, status, phrases: s.total, checked: s.checked, flags: s.open_flags, round });
      }

      res.json({
        course_code: courseCode,
        target_seeds: effectiveTarget,
        golden_seed_count: goldenCount,
        summary: { approved: approvedCount, flagged: flaggedCount, escalated: escalatedCount, total: effectiveTarget },
        seeds
      });
    } catch (err) {
      console.error('[GOLDEN] Error getting batch status:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /golden/finalize/:courseCode
  // Auto-submit approved golden seeds as calibration data.
  // Called by Creator agent after all seeds approved, or by dashboard "Approve" button.
  // Query/body params:
  //   target_seeds - Number of seeds to finalize (default: 50)
  // ---------------------------------------------------------------------------
  router.post('/golden/finalize/:courseCode', async (req, res) => {
    try {
      const { courseCode } = req.params;
      const targetSeeds = parseInt(req.body?.target_seeds || req.query.target_seeds) || 50;

      // Fetch all LEGOs and phrases for seeds 1-targetSeeds
      const { data: legos, error: legoErr } = await ctx.supabase
        .from('course_legos')
        .select('seed_number, lego_index, type, known_text, target_text, components')
        .eq('course_code', courseCode)
        .gte('seed_number', 1)
        .lte('seed_number', targetSeeds)
        .order('seed_number')
        .order('lego_index');
      if (legoErr) throw legoErr;

      const { data: seeds, error: seedErr } = await ctx.supabase
        .from('course_seeds')
        .select('seed_number, known_text, target_text')
        .eq('course_code', courseCode)
        .gte('seed_number', 1)
        .lte('seed_number', targetSeeds)
        .order('seed_number');
      if (seedErr) throw seedErr;

      if (!legos || legos.length === 0) {
        return res.status(400).json({ error: 'No LEGOs found for golden seeds' });
      }

      // Build calibration format
      const goldenDecompositions = [];
      const seedMap = new Map();
      for (const s of (seeds || [])) seedMap.set(s.seed_number, s);

      const legosBySeed = {};
      for (const l of legos) {
        if (!legosBySeed[l.seed_number]) legosBySeed[l.seed_number] = [];
        legosBySeed[l.seed_number].push(l);
      }

      for (let n = 1; n <= targetSeeds; n++) {
        const seed = seedMap.get(n);
        const seedLegos = legosBySeed[n];
        if (!seed || !seedLegos) continue;

        goldenDecompositions.push({
          seed_number: n,
          known_text: seed.known_text,
          target_text: seed.target_text,
          legos: seedLegos.map(l => {
            const entry = { type: l.type, known: l.known_text, target: l.target_text };
            if (l.components && l.components.length > 0) entry.components = l.components;
            return entry;
          })
        });
      }

      // Submit to calibration endpoint logic (inline to avoid circular HTTP call)
      const { data: courseData, error: courseErr } = await ctx.supabase
        .from('courses')
        .select('quality_rules')
        .eq('course_code', courseCode)
        .single();
      if (courseErr) throw courseErr;

      const existingRules = courseData.quality_rules || {};
      const existingGolden = existingRules.golden_decompositions || [];

      // Merge by seed_number
      const mergedMap = new Map();
      for (const g of existingGolden) mergedMap.set(g.seed_number, g);
      for (const g of goldenDecompositions) mergedMap.set(g.seed_number, g);
      const merged = [...mergedMap.values()].sort((a, b) => a.seed_number - b.seed_number);

      const updatedRules = {
        ...existingRules,
        golden_decompositions: merged,
        golden_seed_count: targetSeeds,
        calibrated_at: new Date().toISOString(),
        calibrated_by: 'golden_builder'
      };

      const { error: updateErr } = await ctx.supabase
        .from('courses')
        .update({ quality_rules: updatedRules })
        .eq('course_code', courseCode);
      if (updateErr) throw updateErr;

      // Mark golden build job as complete
      await ctx.supabase
        .from('build_jobs')
        .update({ status: 'complete', completed_at: new Date().toISOString() })
        .eq('course_code', courseCode)
        .eq('pass', 'golden')
        .eq('status', 'running');

      console.log(`[GOLDEN] Finalized ${goldenDecompositions.length} golden seeds as calibration for ${courseCode}`);

      res.json({
        success: true,
        course_code: courseCode,
        seeds_finalized: goldenDecompositions.length,
        golden_seed_count: targetSeeds,
        total_legos: legos.length,
        message: `${goldenDecompositions.length} golden seeds saved as calibration data. Course is ready for Pass 2.`
      });
    } catch (err) {
      console.error('[GOLDEN] Error finalizing golden seeds:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

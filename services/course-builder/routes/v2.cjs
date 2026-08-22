/**
 * V2 Pipeline Routes — Decompose -> Finalize -> Phrases -> Validate -> QA
 *
 * Staged building pipeline extracted from course-builder-api.cjs monolith.
 * All routes are mounted under /v2 by the parent router.
 *
 * Factory pattern: module.exports = function(ctx) { ... }
 * ctx provides: supabase, courseVocabCache, config, helpers (getBuildProgress, etc.)
 */

const { Router } = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { claudeConfigExport } = require('../../shared/claude-config.cjs');

const { isChinese, getGoldenSeedCount } = require('../lib/language-config.cjs');
const { normalizeForZUT, normalizeForStorage, normalizeForContainment, extractVocab } = require('../lib/text-normalization.cjs');
const { makePhraseId, computePhraseRole, computeLegoPosition, usesBuildUseFormat, checkBuildUsePhrases, generateBuildupPhrases, isBareLegoPhrase, partitionBareLegoPhrases } = require('../lib/phrase-structure.cjs');
const { loadCourseVocab, loadTranslationVocab, addToCourseVocab, invalidateVocabCache } = require('../lib/vocab-cache.cjs');
const { checkTiling, checkVocabViolations, formatDecompositionPatterns } = require('../lib/validation.cjs');
const { getBuildProgress, startBuildManager } = require('../lib/build-manager.cjs');
const { fetchGoldenSeedExamples } = require('../lib/agent-spawner.cjs');
const { emitProgress } = require('../../shared/emit-progress.cjs');
const { decoratePhrasesWithDecomposition } = require('../../phrase-decomposition-writer.cjs');

// ---------------------------------------------------------------------------
// Validation-sweep helpers (extracted from the /v2/validate loop so the sweep
// can be run over a prefix-skipped range — see POST /v2/validate fromSeed).
//
// These are intentionally pure (no closure over ctx) so the prefix-skip path
// can be proven equivalent to the full walk for fromSeed=0.
// ---------------------------------------------------------------------------

// Add a seed's vocab contribution (its LEGO targets + M-LEGO component targets)
// to a cumulative vocab Set. Adding is idempotent for a Set.
function accumulate(seedLegos, cumulativeVocab, chinese) {
  for (const l of seedLegos) {
    extractVocab(l.target_text, chinese).forEach(v => cumulativeVocab.add(v));
    if (l.type === 'M' && l.components) {
      for (const c of l.components) {
        extractVocab(c.target, chinese).forEach(v => cumulativeVocab.add(v));
      }
    }
  }
}

// Run all per-seed checks (tiling, containment, phrase counts, vocab violations)
// for a single seed against the cumulative vocab from PRIOR seeds.
//
// Ordering preserved from the original loop: tiling is checked against prior-seed
// vocab only; the per-LEGO vocab check sees prior + this seed's own vocab. We build
// that superset locally (vocabWithSeed) rather than mutating the caller's set
// mid-seed, so the caller still controls accumulation order.
function runSeedChecks(seed, seedLegos, phrasesByLegoKey, cumulativeVocab, courseCode, chinese) {
  const issues = [];

  // 1. Tiling check — against vocab from prior seeds only
  const tilingLegos = seedLegos.map(l => ({ target: l.target_text, type: l.type, components: l.components }));
  const tilingResult = checkTiling(seed.target_text, tilingLegos, courseCode, cumulativeVocab);
  if (!tilingResult.valid) {
    issues.push(`Tiling: ${tilingResult.message}`);
  }

  // Vocab available to this seed's phrases = prior seeds + this seed's own legos.
  const vocabWithSeed = new Set(cumulativeVocab);
  accumulate(seedLegos, vocabWithSeed, chinese);

  // 2. Per-LEGO checks
  for (const lego of seedLegos) {
    if (!lego.is_new) continue; // Skip duplicates

    const legoKey = `${lego.seed_number}:${lego.lego_index}`;
    const legoPhrases = phrasesByLegoKey[legoKey] || [];
    const legoLabel = `L${lego.lego_index}`;

    // Containment check
    const legoTargetNorm = normalizeForContainment(lego.target_text);
    const buildUsePhrases = legoPhrases.filter(p => p.phrase_role === 'build' || p.phrase_role === 'use');
    const containmentFails = buildUsePhrases.filter(p =>
      !normalizeForContainment(p.target_text).includes(legoTargetNorm)
    );
    if (containmentFails.length > 0) {
      issues.push(`${legoLabel}: ${containmentFails.length} phrase(s) fail containment`);
    }

    // Phrase count check
    const buildPhrases = legoPhrases.filter(p => p.phrase_role === 'build');
    const usePhrases = legoPhrases.filter(p => p.phrase_role === 'use');

    const legoForCheck = {
      idx: lego.lego_index,
      type: lego.type,
      known: lego.known_text,
      target: lego.target_text,
      build: buildPhrases.map(p => ({ known: p.known_text, target: p.target_text })),
      use: usePhrases.map(p => ({ known: p.known_text, target: p.target_text }))
    };
    const countCheck = checkBuildUsePhrases(legoForCheck, courseCode, lego.seed_number);
    if (!countCheck.valid) {
      issues.push(`${legoLabel}: ${countCheck.error}`);
    }

    // Vocab check on phrases (against prior + this seed's vocab)
    const phraseTargets = buildUsePhrases.map(p => ({ target: p.target_text }));
    const vocabViolations = checkVocabViolations(phraseTargets, vocabWithSeed, courseCode);
    if (vocabViolations.length > 0) {
      issues.push(`${legoLabel}: vocab violations in ${vocabViolations.length} phrase(s)`);
    }
  }

  return issues;
}

module.exports = function(ctx) {
  const router = Router();

  // ---------------------------------------------------------------------------
  // POST /v2/decompose — Submit LEGOs only (no phrases) as a draft.
  //
  // Accepts JSON with seed_number, known_text, target_text, and legos array.
  // Validates: canonical seed lookup, tiling, duplicate seed detection.
  // Skips: ZUT (checked globally at finalize), phrase counts, vocab violations.
  // Stores in course_seed_drafts with validation_status: 'valid' (stage: 'decomposed' in notes).
  // ---------------------------------------------------------------------------
  router.post('/v2/decompose', async (req, res) => {
    try {
      const body = req.body;
      const courseCode = body.course_code;
      const seedNumber = body.seed_number;

      if (!courseCode || !seedNumber) {
        return res.status(400).json({ error: 'Missing course_code or seed_number' });
      }

      const legos = body.legos || [];
      if (legos.length === 0) {
        return res.status(400).json({ error: 'No LEGOs provided' });
      }

      // 1. Canonical seed lookup
      const { data: canonicalSeed, error: seedErr } = await ctx.supabase
        .from('course_seeds')
        .select('seed_number, known_text, target_text')
        .eq('course_code', courseCode)
        .eq('seed_number', seedNumber)
        .single();

      if (seedErr || !canonicalSeed) {
        return res.status(404).json({ error: `Seed ${seedNumber} not found for ${courseCode}` });
      }

      // 2. Translation mismatch protection
      const knownText = body.known_text || canonicalSeed.known_text;
      const targetText = body.target_text || canonicalSeed.target_text;

      if (body.known_text && normalizeForZUT(body.known_text) !== normalizeForZUT(canonicalSeed.known_text)) {
        return res.status(400).json({
          error: `known_text mismatch: submitted "${body.known_text}" but canonical is "${canonicalSeed.known_text}"`
        });
      }
      if (body.target_text && normalizeForZUT(body.target_text) !== normalizeForZUT(canonicalSeed.target_text)) {
        return res.status(400).json({
          error: `target_text mismatch: submitted "${body.target_text}" but canonical is "${canonicalSeed.target_text}"`
        });
      }

      // 3. Duplicate seed check — skip if already fully decomposed
      const { data: existingSeed } = await ctx.supabase
        .from('course_seeds')
        .select('decomposed_at')
        .eq('course_code', courseCode)
        .eq('seed_number', seedNumber)
        .single();

      if (existingSeed?.decomposed_at) {
        return res.status(409).json({
          error: `Seed ${seedNumber} already decomposed at ${existingSeed.decomposed_at}`,
          hint: 'Delete existing decomposition first if you want to rebuild.'
        });
      }

      // 4. Tiling check — seed target must be constructable from LEGO targets + prior vocab
      const vocabSet = await loadTranslationVocab(ctx, courseCode, seedNumber);
      const tilingLegos = legos.map(l => ({
        target: l.target_text || l.target,
        type: l.type,
        components: l.components
      }));
      const tilingResult = checkTiling(targetText, tilingLegos, courseCode, vocabSet);
      if (!tilingResult.valid) {
        return res.status(400).json({
          error: 'TILING_FAILED',
          message: tilingResult.message,
          untiled: tilingResult.untiled
        });
      }

      // 5. Validate LEGO structure
      for (let i = 0; i < legos.length; i++) {
        const l = legos[i];
        if (!l.type || !['A', 'M'].includes(l.type)) {
          return res.status(400).json({ error: `LEGO ${i + 1}: type must be 'A' or 'M'` });
        }
        const known = l.known_text || l.known;
        const target = l.target_text || l.target;
        if (!known || !target) {
          return res.status(400).json({ error: `LEGO ${i + 1}: missing known or target text` });
        }
        if (l.type === 'M' && (!l.components || l.components.length === 0)) {
          return res.status(400).json({ error: `LEGO ${i + 1}: M-type LEGOs must have components` });
        }
      }

      // 6. Store as draft with validation_status: 'valid' (stage: 'decomposed' in notes)
      const submissionData = {
        legos: legos.map((l, i) => ({
          idx: l.idx || i + 1,
          type: l.type,
          known: l.known_text || l.known,
          target: l.target_text || l.target,
          components: l.components || null
        }))
      };

      const { error: draftErr } = await ctx.supabase
        .from('course_seed_drafts')
        .upsert({
          course_code: courseCode,
          seed_number: seedNumber,
          known_text: knownText,
          target_text: targetText,
          submission_data: submissionData,
          validation_status: 'valid',
          validation_notes: { submitted_at: new Date().toISOString(), lego_count: legos.length, stage: 'decomposed' },
          updated_at: new Date().toISOString()
        }, { onConflict: 'course_code,seed_number' });

      if (draftErr) throw new Error(`Draft save failed: ${draftErr.message}`);

      console.log(`[V2] Decompose draft saved: ${courseCode} seed ${seedNumber} (${legos.length} LEGOs)`);

      res.json({
        ok: true,
        course_code: courseCode,
        seed_number: seedNumber,
        legos: legos.length,
        status: 'decomposed',
        message: `Draft saved with ${legos.length} LEGOs. Call /api/v2/decompose/finalize/${courseCode} when all drafts are ready.`
      });

    } catch (err) {
      console.error('[V2] Decompose error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /v2/decompose/finalize/:courseCode — Finalize decompose drafts.
  //
  // Promotes LEGOs to course_legos WITHOUT generating phrases.
  // Runs global collision detection across all drafts + baseline.
  // On collision (409): returns collision map with fix instructions.
  // On success (200): LEGOs are live, collision-free, ready for phrase generation.
  // ---------------------------------------------------------------------------
  router.post('/v2/decompose/finalize/:courseCode', async (req, res) => {
    try {
      const courseCode = req.params.courseCode;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`V2 DECOMPOSE FINALIZE: ${courseCode}`);
      console.log(`${'='.repeat(60)}`);

      // STEP 1: Load all decomposed drafts in seed order
      const { data: drafts, error: draftErr } = await ctx.supabase
        .from('course_seed_drafts')
        .select('*')
        .eq('course_code', courseCode)
        .eq('validation_status', 'valid')
        .order('seed_number');

      if (draftErr) throw new Error(`Failed to load drafts: ${draftErr.message}`);

      if (!drafts || drafts.length === 0) {
        return res.status(400).json({
          error: 'No decompose drafts found',
          course_code: courseCode,
          hint: 'Submit LEGOs with POST /api/v2/decompose first.'
        });
      }
      console.log(`  Drafts loaded: ${drafts.length}`);

      const draftedSeedNumbers = new Set(drafts.map(d => d.seed_number));

      // STEP 2: Load baseline — existing LEGOs ONLY from seeds without drafts
      const { data: existingLegos, error: legoErr } = await ctx.supabase
        .from('course_legos')
        .select('known_text, target_text, seed_number, lego_index, is_new')
        .eq('course_code', courseCode)
        .order('seed_number')
        .order('lego_index');

      if (legoErr) throw new Error(`Failed to load existing LEGOs: ${legoErr.message}`);

      const knownLegoMap = new Map();
      for (const lego of existingLegos || []) {
        if (draftedSeedNumbers.has(lego.seed_number)) continue;
        const normKey = normalizeForZUT(lego.known_text);
        if (lego.is_new && !knownLegoMap.has(normKey)) {
          knownLegoMap.set(normKey, {
            target_text: lego.target_text,
            known_text: lego.known_text,
            seed_number: lego.seed_number,
            lego_index: lego.lego_index
          });
        }
      }
      console.log(`  Baseline: ${knownLegoMap.size} unique LEGOs from non-drafted seeds`);

      // STEP 3: Process drafts — dedup + collision detection
      const collisions = [];
      const dedupResults = new Map();
      const emptySeedNumbers = [];
      let totalDeduplicated = 0;

      for (const draft of drafts) {
        const draftLegos = draft.submission_data?.legos || [];
        const legoStatuses = new Map();
        let newCount = 0;

        for (const lego of draftLegos) {
          const normKey = normalizeForZUT(lego.known);
          const existing = knownLegoMap.get(normKey);

          if (existing) {
            const existingTarget = normalizeForStorage(existing.target_text);
            const newTarget = normalizeForStorage(lego.target);

            if (existingTarget === newTarget) {
              legoStatuses.set(lego.idx, 'duplicate');
              totalDeduplicated++;
            } else {
              collisions.push({
                seed_number: draft.seed_number,
                lego_known: lego.known,
                lego_target: lego.target,
                lego_idx: lego.idx,
                conflicts_with: {
                  target_text: existing.target_text,
                  seed_number: existing.seed_number,
                  lego_index: existing.lego_index
                }
              });
              legoStatuses.set(lego.idx, 'collision');
            }
          } else {
            legoStatuses.set(lego.idx, 'new');
            knownLegoMap.set(normKey, {
              target_text: lego.target,
              known_text: lego.known,
              seed_number: draft.seed_number,
              lego_index: lego.idx
            });
            newCount++;
          }
        }

        dedupResults.set(draft.seed_number, legoStatuses);

        if (newCount === 0 && draftLegos.length > 0 && collisions.filter(c => c.seed_number === draft.seed_number).length === 0) {
          emptySeedNumbers.push(draft.seed_number);
        }
      }

      console.log(`  Dedup: ${totalDeduplicated} duplicate LEGOs`);
      console.log(`  Collisions: ${collisions.length}`);
      console.log(`  Empty seeds: ${emptySeedNumbers.length}`);

      // STEP 4: Collision check — abort if any
      const chinese = isChinese(courseCode);

      if (collisions.length > 0) {
        const collidingSeeds = [...new Set(collisions.map(c => c.seed_number))];
        for (const seedNum of collidingSeeds) {
          const seedCollisions = collisions.filter(c => c.seed_number === seedNum);
          await ctx.supabase
            .from('course_seed_drafts')
            .update({
              validation_status: 'collision',
              validation_notes: { collisions: seedCollisions, detected_at: new Date().toISOString() },
              updated_at: new Date().toISOString()
            })
            .eq('course_code', courseCode)
            .eq('seed_number', seedNum);
        }

        console.log(`✗ V2 FINALIZE ABORTED: ${collisions.length} collision(s) in ${collidingSeeds.length} seed(s)`);

        // Build fix instructions
        const draftMap = new Map(drafts.map(d => [d.seed_number, d]));
        const fixBatches = [];
        for (let i = 0; i < collidingSeeds.length; i += 5) {
          const batchSeeds = collidingSeeds.slice(i, i + 5);

          const seedSections = await Promise.all(batchSeeds.map(async seedNum => {
            const draft = draftMap.get(seedNum);
            const seedCollisions = collisions.filter(c => c.seed_number === seedNum);
            const draftJson = JSON.stringify(draft.submission_data, null, 2);
            const vocabSet = await loadTranslationVocab(ctx, courseCode, seedNum);
            const vocabStr = [...vocabSet].sort().join(chinese ? '' : ', ');

            const collisionNotes = seedCollisions.map(c =>
              `- LEGO L${c.lego_idx} "${c.lego_known}" → "${c.lego_target}" COLLIDES with seed ${c.conflicts_with.seed_number} which already has "${c.lego_known}" → "${c.conflicts_with.target_text}"\n  FIX: Merge L${c.lego_idx} with an adjacent LEGO to create a bigger M-LEGO whose English known text is different.`
            ).join('\n');

            return `### Seed ${seedNum}\n\n**Collisions:**\n${collisionNotes}\n\n**Available vocab:**\n${vocabStr}\n\n**Current draft:**\n\`\`\`json\n${draftJson}\n\`\`\``;
          }));

          fixBatches.push({
            seeds: batchSeeds,
            prompt: `Fix ZUT collisions for course ${courseCode}. Merge the colliding LEGO with an adjacent LEGO to create a bigger M-LEGO. Resubmit via POST /api/v2/decompose.\n\n${seedSections.join('\n\n')}`
          });
        }

        return res.status(409).json({
          error: 'COLLISIONS_DETECTED',
          message: `${collisions.length} LEGO collision(s) found — cannot finalize until resolved`,
          collisions,
          colliding_seeds: collidingSeeds,
          fix_instructions: fixBatches
        });
      }

      // STEP 5: Clean up old LEGOs/phrases for drafted seeds, then write LEGOs only (NO phrases)
      const draftSeedList = [...draftedSeedNumbers];
      if (draftSeedList.length > 0) {
        const { error: delPhraseErr } = await ctx.supabase
          .from('course_practice_phrases')
          .delete()
          .eq('course_code', courseCode)
          .in('seed_number', draftSeedList);
        if (delPhraseErr) console.warn(`  Warning: phrase cleanup: ${delPhraseErr.message}`);

        const { error: delLegoErr } = await ctx.supabase
          .from('course_legos')
          .delete()
          .eq('course_code', courseCode)
          .in('seed_number', draftSeedList);
        if (delLegoErr) console.warn(`  Warning: LEGO cleanup: ${delLegoErr.message}`);

        console.log(`  Cleaned old LEGOs/phrases for ${draftSeedList.length} drafted seeds`);
      }

      let seedsWritten = 0;
      let legosIntroduced = 0;

      for (const draft of drafts) {
        const draftLegos = draft.submission_data?.legos || [];
        const legoStatuses = dedupResults.get(draft.seed_number);
        let skippedDuplicates = 0;

        // 5a. Upsert course_seeds with decomposed_at
        const { error: seedError } = await ctx.supabase
          .from('course_seeds')
          .upsert({
            course_code: courseCode,
            seed_number: draft.seed_number,
            known_text: draft.known_text,
            target_text: draft.target_text,
            status: 'released',
            decomposed_at: new Date().toISOString(),
            version: 1
          }, { onConflict: 'course_code,seed_number' });

        if (seedError) throw new Error(`Seed ${draft.seed_number} insert failed: ${seedError.message}`);

        // 5b. Insert LEGOs ONLY (no phrases — that's the v2 phrase stage)
        for (const lego of draftLegos) {
          const legoStatus = legoStatuses?.get(lego.idx) || 'new';
          const isDuplicate = legoStatus === 'duplicate';

          const { error: legoError } = await ctx.supabase
            .from('course_legos')
            .upsert({
              course_code: courseCode,
              seed_number: draft.seed_number,
              lego_index: lego.idx,
              type: lego.type || 'A',
              is_new: !isDuplicate,
              known_text: lego.known,
              target_text: lego.target,
              components: lego.components || null,
              status: 'draft',
              version: 1
            }, { onConflict: 'course_code,seed_number,lego_index' });

          if (legoError) throw new Error(`LEGO insert failed: ${legoError.message}`);

          if (isDuplicate) {
            skippedDuplicates++;
          } else {
            legosIntroduced++;
          }
        }

        // 5c. Handle empty seeds — attach seed sentence as USE phrase to highest-indexed introducing LEGO
        if (emptySeedNumbers.includes(draft.seed_number)) {
          const { data: allNewLegos } = await ctx.supabase
            .from('course_legos')
            .select('seed_number, lego_index, target_text')
            .eq('course_code', courseCode)
            .eq('is_new', true)
            .lt('seed_number', draft.seed_number)
            .order('seed_number');

          const wordIntroducedBy = {};
          for (const l of (allNewLegos || [])) {
            const words = extractVocab(l.target_text, chinese);
            for (const w of words) {
              if (!wordIntroducedBy[w]) {
                wordIntroducedBy[w] = { seed_number: l.seed_number, lego_index: l.lego_index, target_text: l.target_text };
              }
            }
          }

          const seedWords = extractVocab(draft.target_text, chinese);
          let bestSeedNum = -1, bestLegoIdx = -1, bestLegoTarget = null;

          for (const w of seedWords) {
            const intro = wordIntroducedBy[w];
            if (!intro) continue;
            if (intro.seed_number > bestSeedNum || (intro.seed_number === bestSeedNum && intro.lego_index > bestLegoIdx)) {
              bestSeedNum = intro.seed_number;
              bestLegoIdx = intro.lego_index;
              bestLegoTarget = intro.target_text;
            }
          }

          if (bestSeedNum >= 0 && isBareLegoPhrase(draft.target_text, bestLegoTarget)) {
            console.log(`  Empty seed ${draft.seed_number} skipped — its sentence IS the LEGO "${bestLegoTarget}", which the learner already meets at debut`);
          } else if (bestSeedNum >= 0) {
            const { data: existingPhrases } = await ctx.supabase
              .from('course_practice_phrases')
              .select('position, phrase_role')
              .eq('course_code', courseCode)
              .eq('seed_number', bestSeedNum)
              .eq('lego_index', bestLegoIdx);

            const maxPos = existingPhrases?.reduce((max, p) => Math.max(max, p.position), 0) || 0;
            const existingUseCount = existingPhrases?.filter(p => p.phrase_role === 'use').length || 0;

            const usePhraseRow = {
              id: makePhraseId(courseCode, bestSeedNum, bestLegoIdx, 'use', existingUseCount + 1),
              course_code: courseCode,
              seed_number: bestSeedNum,
              lego_index: bestLegoIdx,
              position: maxPos + 1,
              known_text: draft.known_text,
              target_text: draft.target_text,
              word_count: draft.target_text.length,
              lego_count: (draft.known_text.match(/\s+/g) || []).length + 1,
              phrase_role: 'use',
              connected_lego_ids: [],
              lego_position: computeLegoPosition(draft.target_text, bestLegoTarget),
              metadata: { format: 'build_use', source: 'seed_sentence', source_seed: draft.seed_number, score: 8 },
              status: 'draft',
              version: 1
            };
            await ctx.supabase.from('course_practice_phrases').insert(usePhraseRow);
            // Build-time phrase decomposition. Non-blocking — see writer module.
            await decoratePhrasesWithDecomposition(ctx.supabase, [usePhraseRow]);
            console.log(`  Empty seed ${draft.seed_number} -> USE phrase for S${String(bestSeedNum).padStart(4,'0')}L${String(bestLegoIdx).padStart(2,'0')}`);
          }
        }

        seedsWritten++;
        if (seedsWritten % 50 === 0) {
          console.log(`  Progress: ${seedsWritten}/${drafts.length} seeds written`);
        }
      }

      // STEP 6: Cleanup drafts
      const { error: deleteError } = await ctx.supabase
        .from('course_seed_drafts')
        .delete()
        .eq('course_code', courseCode);
      if (deleteError) console.warn(`  Draft cleanup failed: ${deleteError.message}`);

      // Invalidate vocab cache
      invalidateVocabCache(ctx, courseCode);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`V2 DECOMPOSE FINALIZE COMPLETE: ${courseCode}`);
      console.log(`  Seeds: ${seedsWritten}`);
      console.log(`  LEGOs introduced: ${legosIntroduced}`);
      console.log(`  LEGOs deduplicated: ${totalDeduplicated}`);
      console.log(`  Empty seeds: ${emptySeedNumbers.length}`);
      console.log(`  Phrases: 0 (v2 — phrases are a separate stage)`);
      console.log(`${'='.repeat(60)}\n`);

      res.json({
        ok: true,
        status: 'FINALIZED',
        pipeline: 'v2',
        course_code: courseCode,
        seeds_written: seedsWritten,
        legos_introduced: legosIntroduced,
        legos_deduplicated: totalDeduplicated,
        empty_seeds: emptySeedNumbers.length,
        empty_seed_numbers: emptySeedNumbers.length > 0 ? emptySeedNumbers : undefined,
        phrases_written: 0,
        collisions: 0,
        next_step: `POST /api/v2/phrases/${courseCode} — generate phrases for finalized LEGOs`
      });

    } catch (err) {
      console.error('V2 Decompose finalize error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /v2/phrases/:courseCode — Submit phrases for LEGOs already in course_legos.
  //
  // Accepts JSON with phrases array. Each entry has seed_number, lego_index, build[], use[].
  // Validates: LEGO exists, phrase counts, vocab violations, containment.
  // Writes directly to course_practice_phrases (LEGOs already finalized, no staging needed).
  // ---------------------------------------------------------------------------
  router.post('/v2/phrases/:courseCode', async (req, res) => {
    try {
      const courseCode = req.params.courseCode;
      const { phrases } = req.body;

      if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
        return res.status(400).json({ error: 'phrases must be a non-empty array' });
      }

      const chinese = isChinese(courseCode);
      const errors = [];
      let totalInserted = 0;

      // Cache vocab per seed_number to avoid repeated DB queries within a batch
      const vocabBySeed = new Map();

      for (const entry of phrases) {
        const { seed_number, lego_index, build = [], use = [] } = entry;
        const entryLabel = `S${String(seed_number).padStart(4, '0')}L${String(lego_index).padStart(2, '0')}`;

        // 1. Verify LEGO exists in course_legos
        const { data: lego, error: legoErr } = await ctx.supabase
          .from('course_legos')
          .select('known_text, target_text, type, components, is_new')
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number)
          .eq('lego_index', lego_index)
          .single();

        if (legoErr || !lego) {
          errors.push({ entry: entryLabel, error: 'LEGO not found in course_legos' });
          continue;
        }

        // Skip duplicate LEGOs (is_new: false) — they don't get their own phrases
        if (!lego.is_new) {
          errors.push({ entry: entryLabel, error: 'LEGO is a duplicate (is_new: false) — skip phrase generation' });
          continue;
        }

        // 2. Check BUILD/USE phrase counts
        const legoForCheck = {
          idx: lego_index,
          type: lego.type,
          known: lego.known_text,
          target: lego.target_text,
          build: build.map(p => ({ known: p.known_text || p.known, target: p.target_text || p.target })),
          use: use.map(p => ({
            known: p.known_text || p.known,
            target: p.target_text || p.target,
            known_score: p.known_score,
            target_score: p.target_score
          }))
        };

        const countCheck = checkBuildUsePhrases(legoForCheck, courseCode, seed_number);
        if (!countCheck.valid) {
          errors.push({ entry: entryLabel, error: `Phrase count: ${countCheck.error}` });
          continue;
        }

        // 3. Check vocab violations — scoped to vocabulary available at this seed
        // Load vocab for this seed (cached per-seed within request to avoid redundant queries)
        if (!vocabBySeed.has(seed_number)) {
          // loadTranslationVocab uses .lt (strictly less than) — prior seeds only
          const seedVocab = await loadTranslationVocab(ctx, courseCode, seed_number);
          // Add current seed's LEGOs (already finalized in course_legos)
          const { data: currentSeedLegos } = await ctx.supabase
            .from('course_legos')
            .select('target_text, type, components')
            .eq('course_code', courseCode)
            .eq('seed_number', seed_number);
          for (const l of currentSeedLegos || []) {
            extractVocab(l.target_text, chinese).forEach(v => seedVocab.add(v));
            if (l.type === 'M' && l.components) {
              for (const c of l.components) {
                extractVocab(c.target, chinese).forEach(v => seedVocab.add(v));
              }
            }
          }
          vocabBySeed.set(seed_number, seedVocab);
        }
        const vocabSet = vocabBySeed.get(seed_number);

        const allPhrases = [
          ...build.map(p => ({ target: p.target_text || p.target })),
          ...use.map(p => ({ target: p.target_text || p.target }))
        ];
        const vocabViolations = checkVocabViolations(allPhrases, vocabSet, courseCode);
        if (vocabViolations.length > 0) {
          errors.push({
            entry: entryLabel,
            error: `Vocab violations: ${vocabViolations.map(v => `"${v.phrase}" uses unknown: ${v.unknown}`).join('; ')}`
          });
          continue;
        }

        // 3b. Reject bare-LEGO phrases — a phrase that IS the LEGO pads the
        // count without practising anything (phrase-structure.cjs).
        const bareSubmitted = [
          ...partitionBareLegoPhrases(build, lego.target_text).bare,
          ...partitionBareLegoPhrases(use, lego.target_text).bare,
        ];
        if (bareSubmitted.length > 0) {
          errors.push({
            entry: entryLabel,
            error: `${bareSubmitted.length} phrase(s) are the bare LEGO "${lego.target_text}" — the learner already meets it at intro and debut. A BUILD/USE phrase uses the LEGO IN a phrase with already-introduced vocabulary.`,
          });
          continue;
        }

        // 4. Check LEGO containment — phrase target must contain LEGO target
        const legoTargetNorm = normalizeForContainment(lego.target_text);
        const containmentFails = allPhrases.filter(p =>
          !normalizeForContainment(p.target).includes(legoTargetNorm)
        );
        if (containmentFails.length > 0) {
          errors.push({
            entry: entryLabel,
            error: `Containment: ${containmentFails.length} phrase(s) don't contain LEGO target "${lego.target_text}"`
          });
          continue;
        }

        // 5. Generate phrase rows — M-LEGO build-up + build + use
        let allPhraseRows = [];
        let practiceStartPosition = 1;
        let roleCounts = { component: 0, build: 0, use: 0 };

        // M-TYPE BUILD-UP (auto-generated)
        if (lego.type === 'M' && lego.components && lego.components.length > 0) {
          const buildupResult = generateBuildupPhrases(
            { seed: seed_number, idx: lego_index, known: lego.known_text, target: lego.target_text, components: lego.components },
            courseCode
          );
          allPhraseRows = [...buildupResult.buildupPhrases];
          practiceStartPosition = buildupResult.startPosition;
          roleCounts = { ...buildupResult.roleCounts };
        }

        // BUILD phrases
        const buildRows = build.map((p, i) => {
          roleCounts.build++;
          return {
            id: makePhraseId(courseCode, seed_number, lego_index, 'build', roleCounts.build),
            course_code: courseCode,
            seed_number: seed_number,
            lego_index: lego_index,
            position: practiceStartPosition + i,
            known_text: p.known_text || p.known,
            target_text: p.target_text || p.target,
            word_count: (p.target_text || p.target).length,
            lego_count: ((p.known_text || p.known).match(/\s+/g) || []).length + 1,
            phrase_role: 'build',
            connected_lego_ids: [],
            lego_position: computeLegoPosition(p.target_text || p.target, lego.target_text),
            metadata: { format: 'build_use', pipeline: 'v2' },
            status: 'draft',
            version: 1
          };
        });

        // USE phrases
        const useRows = use.map((p, i) => {
          roleCounts.use++;
          return {
            id: makePhraseId(courseCode, seed_number, lego_index, 'use', roleCounts.use),
            course_code: courseCode,
            seed_number: seed_number,
            lego_index: lego_index,
            position: practiceStartPosition + build.length + i,
            known_text: p.known_text || p.known,
            target_text: p.target_text || p.target,
            word_count: (p.target_text || p.target).length,
            lego_count: ((p.known_text || p.known).match(/\s+/g) || []).length + 1,
            phrase_role: 'use',
            connected_lego_ids: [],
            lego_position: computeLegoPosition(p.target_text || p.target, lego.target_text),
            metadata: {
              format: 'build_use',
              pipeline: 'v2',
              score: p.score || p.target_score,
              known_score: p.known_score,
              target_score: p.target_score,
              scored_at: new Date().toISOString()
            },
            status: 'draft',
            version: 1
          };
        });

        allPhraseRows = [...allPhraseRows, ...buildRows, ...useRows];

        // 6. Insert phrases
        if (allPhraseRows.length > 0) {
          const { error: phraseError } = await ctx.supabase
            .from('course_practice_phrases')
            .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });

          if (phraseError) {
            errors.push({ entry: entryLabel, error: `Insert failed: ${phraseError.message}` });
            continue;
          }
          totalInserted += allPhraseRows.length;

          // Build-time phrase decomposition (PHRASE_DECOMPOSITION_SPEC.md).
          // Non-blocking — failures log + skip, decomposition stays NULL so
          // the runtime fallback handles rendering.
          await decoratePhrasesWithDecomposition(ctx.supabase, allPhraseRows);
        }

        // Invalidate course-wide vocab cache since new phrases were added
        invalidateVocabCache(ctx, courseCode);
      }

      console.log(`[V2] Phrases: ${courseCode} — ${totalInserted} phrases inserted, ${errors.length} errors`);

      res.json({
        ok: true,
        course_code: courseCode,
        phrases_inserted: totalInserted,
        entries_processed: phrases.length,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (err) {
      console.error('[V2] Phrases error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /v2/phrases/progress/:courseCode — Phrase generation progress.
  //
  // Returns count of LEGOs with phrases vs total LEGOs needing phrases.
  // ---------------------------------------------------------------------------
  router.get('/v2/phrases/progress/:courseCode', async (req, res) => {
    try {
      const courseCode = req.params.courseCode;

      // Count total is_new LEGOs (these need phrases)
      const { count: totalLegos, error: legoErr } = await ctx.supabase
        .from('course_legos')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('is_new', true);

      if (legoErr) throw new Error(legoErr.message);

      // Count LEGOs that have at least one phrase
      const { data: legosWithPhrases, error: phraseErr } = await ctx.supabase
        .from('course_practice_phrases')
        .select('seed_number, lego_index')
        .eq('course_code', courseCode);

      if (phraseErr) throw new Error(phraseErr.message);

      const uniqueLegosWithPhrases = new Set(
        (legosWithPhrases || []).map(p => `${p.seed_number}:${p.lego_index}`)
      );

      // Also get is_new LEGOs for cross-reference
      const { data: newLegos } = await ctx.supabase
        .from('course_legos')
        .select('seed_number, lego_index')
        .eq('course_code', courseCode)
        .eq('is_new', true);

      const newLegoKeys = new Set((newLegos || []).map(l => `${l.seed_number}:${l.lego_index}`));
      const completedLegos = [...newLegoKeys].filter(k => uniqueLegosWithPhrases.has(k)).length;

      res.json({
        course_code: courseCode,
        total: totalLegos || 0,
        completed: completedLegos,
        remaining: (totalLegos || 0) - completedLegos,
        percent: totalLegos > 0 ? Math.round((completedLegos / totalLegos) * 100) : 0
      });

    } catch (err) {
      console.error('[V2] Phrase progress error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /v2/validate/:courseCode — Deterministic validation sweep.
  //
  // No model calls. Checks tiling, containment, phrase counts, vocab violations.
  // Returns pass/fail per seed with details.
  // ---------------------------------------------------------------------------
  router.post('/v2/validate/:courseCode', async (req, res) => {
    try {
      const courseCode = req.params.courseCode;
      const chinese = isChinese(courseCode);

      // Optional scoped sweep: only re-check seeds at/after fromSeed. Seeds before
      // it are provably unaffected by an edit at fromSeed, so we accumulate their
      // vocab (to keep the cumulative set correct) but skip their checks.
      // fromSeed = 0/undefined => full-course sweep (default, unchanged behaviour).
      const fromSeed = Number(req.body?.fromSeed) || 0;

      console.log(`[V2] Validate: ${courseCode}${fromSeed ? ` (fromSeed=${fromSeed})` : ''}`);

      // Load all seeds with decomposed_at
      const { data: seeds, error: seedErr } = await ctx.supabase
        .from('course_seeds')
        .select('seed_number, known_text, target_text')
        .eq('course_code', courseCode)
        .not('decomposed_at', 'is', null)
        .order('seed_number');

      if (seedErr) throw new Error(seedErr.message);

      // Load all LEGOs
      const { data: allLegos, error: legoErr } = await ctx.supabase
        .from('course_legos')
        .select('seed_number, lego_index, known_text, target_text, type, components, is_new')
        .eq('course_code', courseCode)
        .order('seed_number')
        .order('lego_index');

      if (legoErr) throw new Error(legoErr.message);

      // Load all phrases
      const { data: allPhrases, error: phraseErr } = await ctx.supabase
        .from('course_practice_phrases')
        .select('seed_number, lego_index, known_text, target_text, phrase_role')
        .eq('course_code', courseCode);

      if (phraseErr) throw new Error(phraseErr.message);

      // Index LEGOs and phrases by seed
      const legosBySeed = {};
      for (const l of allLegos || []) {
        if (!legosBySeed[l.seed_number]) legosBySeed[l.seed_number] = [];
        legosBySeed[l.seed_number].push(l);
      }

      const phrasesByLegoKey = {};
      for (const p of allPhrases || []) {
        const key = `${p.seed_number}:${p.lego_index}`;
        if (!phrasesByLegoKey[key]) phrasesByLegoKey[key] = [];
        phrasesByLegoKey[key].push(p);
      }

      // Optional in-memory override: substitute one seed's proposed LEGOs/phrases
      // (and target) BEFORE the sweep, so a caller can validate a *simulated*
      // post-edit state without mutating the DB (edit-cascade dry run). The
      // downstream blast radius this produces is exact, because downstream seeds'
      // own rows are unchanged — only the cumulative vocab from this seed shifts.
      const override = req.body?.override;
      let seedList = seeds || [];
      if (override && override.seed_number != null) {
        const ovSeed = Number(override.seed_number);
        if (Array.isArray(override.legos)) {
          legosBySeed[ovSeed] = override.legos.map(l => ({
            seed_number: ovSeed,
            lego_index: l.lego_index,
            known_text: l.known_text,
            target_text: l.target_text,
            type: l.type,
            components: l.components || null,
            is_new: l.is_new !== false,
          }));
        }
        // Replace this seed's phrases (drop existing keys, apply provided ones).
        for (const key of Object.keys(phrasesByLegoKey)) {
          if (key.startsWith(`${ovSeed}:`)) delete phrasesByLegoKey[key];
        }
        if (override.phrases && typeof override.phrases === 'object') {
          for (const [key, arr] of Object.entries(override.phrases)) {
            phrasesByLegoKey[key] = arr;
          }
        }
        // Update (or inject) the seed row so tiling uses the new target.
        seedList = seedList.map(s => s.seed_number === ovSeed
          ? { ...s, target_text: override.target_text || s.target_text }
          : s);
        if (!seedList.some(s => s.seed_number === ovSeed)) {
          seedList = [...seedList, {
            seed_number: ovSeed,
            known_text: override.known_text || '',
            target_text: override.target_text || '',
          }].sort((a, b) => a.seed_number - b.seed_number);
        }
      }

      // Build cumulative vocab as we walk seeds in order
      const cumulativeVocab = new Set();

      const failures = [];
      let seedsPassed = 0;
      let seedsSkipped = 0;

      for (const seed of seedList) {
        const seedLegos = legosBySeed[seed.seed_number] || [];

        // Prefix seeds (before fromSeed) are provably unaffected: accumulate their
        // vocab to keep the cumulative set correct, but skip their checks.
        if (fromSeed && seed.seed_number < fromSeed) {
          accumulate(seedLegos, cumulativeVocab, chinese);
          seedsSkipped++;
          continue;
        }

        const issues = runSeedChecks(seed, seedLegos, phrasesByLegoKey, cumulativeVocab, courseCode, chinese);

        // Preserve tile-then-add order: check this seed, then add its vocab for the next.
        accumulate(seedLegos, cumulativeVocab, chinese);

        if (issues.length > 0) {
          failures.push({ seed: seed.seed_number, issues });
        } else {
          seedsPassed++;
        }
      }

      const seedsChecked = seedList.length - seedsSkipped;
      const valid = failures.length === 0;
      console.log(`[V2] Validate ${courseCode}: ${seedsPassed}/${seedsChecked} passed, ${failures.length} failed${fromSeed ? ` (${seedsSkipped} skipped before seed ${fromSeed})` : ''}`);

      res.json({
        valid,
        course_code: courseCode,
        seeds_checked: seedsChecked,
        seeds_passed: seedsPassed,
        seeds_failed: failures.length,
        scope: fromSeed ? { fromSeed, seedsSkipped } : 'full',
        failures: failures.length > 0 ? failures : undefined
      });

    } catch (err) {
      console.error('[V2] Validate error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /v2/qa/scan/:courseCode — Spawn Haiku agents to scan phrases.
  //
  // Uses the same QA infrastructure but flags only (no fixing).
  // Lightweight scan with Haiku for cheap volume.
  // ---------------------------------------------------------------------------
  router.post('/v2/qa/scan/:courseCode', async (req, res) => {
    try {
      const courseCode = req.params.courseCode;
      const { terminal = 'iTerm2' } = req.body || {};

      const { data: course } = await ctx.supabase
        .from('courses')
        .select('course_code, display_name, seed_count, quality_rules')
        .eq('course_code', courseCode)
        .single();

      if (!course) return res.status(404).json({ error: `Course ${courseCode} not found` });

      const { count: uncheckedCount } = await ctx.supabase
        .from('course_practice_phrases')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .is('qa_checked', null);

      if (!uncheckedCount || uncheckedCount === 0) {
        return res.json({ ok: false, message: 'All phrases already QA checked' });
      }

      const goldenCount = getGoldenSeedCount(course);
      const totalSeeds = course.seed_count || 300;

      // Build batches for Haiku QA agents
      const seedRange = { from: goldenCount + 1, to: totalSeeds };
      const totalToCheck = seedRange.to - seedRange.from + 1;
      const NUM_BATCHES = Math.min(ctx.config.MAX_PARALLEL_AGENTS, Math.ceil(totalToCheck / ctx.config.SEEDS_PER_AGENT));
      const batchSize = Math.ceil(totalToCheck / NUM_BATCHES);

      const batches = [];
      for (let i = 0; i < NUM_BATCHES; i++) {
        const start = seedRange.from + i * batchSize;
        const end = Math.min(start + batchSize - 1, seedRange.to);
        if (start <= seedRange.to) {
          batches.push({ start, end });
        }
      }

      // TODO: generateV2QAScanBrief is defined locally in the monolith brief-generators section.
      // When brief generators are extracted to their own module, import from there.
      const brief = generateV2QAScanBrief({ courseCode, batches, courseInfo: course });
      const tmpFile = `/tmp/claude_v2_qa_scan_${courseCode}_${Date.now()}.txt`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const claudeCmd = `cd "${projectDir}" && unset CLAUDECODE && ${claudeConfigExport()} && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      const effectiveTerminal = ctx.config.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      if (effectiveTerminal === 'headless') {
        const logsDir = path.join(projectDir, 'logs');
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
        const logFile = `${logsDir}/v2-qa-scan-${courseCode}.log`;
        const out = fs.openSync(logFile, 'a');
        const err = fs.openSync(logFile, 'a');
        const agent = spawn('bash', ['-c', claudeCmd], { detached: true, stdio: ['ignore', out, err] });
        agent.unref();
      } else {
        const escapedCmd = claudeCmd.replace(/"/g, '\\"');
        const osascript = `tell application "iTerm"\n  activate\n  set newWindow to (create window with default profile)\n  tell current session of newWindow\n    write text "${escapedCmd}"\n  end tell\nend tell`;
        spawn('osascript', ['-e', osascript], { stdio: 'pipe', detached: true });
      }

      res.json({
        ok: true,
        mode: 'v2_qa_scan',
        course_code: courseCode,
        batches: batches.length,
        unchecked_phrases: uncheckedCount,
        message: `QA scan coordinator spawned — ${batches.length} Haiku sub-agents will scan ${uncheckedCount} phrases`
      });

    } catch (err) {
      console.error('[V2] QA scan error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /v2/qa/fix/:courseCode — Spawn Opus agent to repair flagged phrases.
  // ---------------------------------------------------------------------------
  router.post('/v2/qa/fix/:courseCode', async (req, res) => {
    try {
      const courseCode = req.params.courseCode;
      const { terminal = 'iTerm2' } = req.body || {};

      const { data: course } = await ctx.supabase
        .from('courses')
        .select('course_code, display_name, seed_count, quality_rules')
        .eq('course_code', courseCode)
        .single();

      if (!course) return res.status(404).json({ error: `Course ${courseCode} not found` });

      // Count open flags
      const { count: flagCount } = await ctx.supabase
        .from('course_qa_flags')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('status', 'open');

      if (!flagCount || flagCount === 0) {
        return res.json({ ok: false, message: 'No open QA flags to fix' });
      }

      const brief = generateV2QAFixBrief({ courseCode, courseInfo: course });
      const tmpFile = `/tmp/claude_v2_qa_fix_${courseCode}_${Date.now()}.txt`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const claudeCmd = `cd "${projectDir}" && unset CLAUDECODE && ${claudeConfigExport()} && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      const effectiveTerminal = ctx.config.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      if (effectiveTerminal === 'headless') {
        const logsDir = path.join(projectDir, 'logs');
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
        const logFile = `${logsDir}/v2-qa-fix-${courseCode}.log`;
        const out = fs.openSync(logFile, 'a');
        const err = fs.openSync(logFile, 'a');
        const agent = spawn('bash', ['-c', claudeCmd], { detached: true, stdio: ['ignore', out, err] });
        agent.unref();
      } else {
        const escapedCmd = claudeCmd.replace(/"/g, '\\"');
        const osascript = `tell application "iTerm"\n  activate\n  set newWindow to (create window with default profile)\n  tell current session of newWindow\n    write text "${escapedCmd}"\n  end tell\nend tell`;
        spawn('osascript', ['-e', osascript], { stdio: 'pipe', detached: true });
      }

      res.json({
        ok: true,
        mode: 'v2_qa_fix',
        course_code: courseCode,
        open_flags: flagCount,
        message: `QA fix agent spawned — Opus will repair ${flagCount} flagged phrases`
      });

    } catch (err) {
      console.error('[V2] QA fix error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // POST /v2/build/start/:courseCode — Launch v2 pipeline coordinator.
  //
  // Spawns an Opus coordinator that orchestrates all v2 stages:
  // 1. Decompose (Sonnet sub-agents)
  // 2. Finalize (collision detection)
  // 3. Phrases (Haiku sub-agents)
  // 4. Validate (deterministic)
  // 5. QA (Haiku scan + Opus fix)
  // ---------------------------------------------------------------------------
  router.post('/v2/build/start/:courseCode', async (req, res) => {
    try {
      const courseCode = req.params.courseCode;
      const { terminal = 'iTerm2', targetSeeds } = req.body || {};
      const fromStage = req.query.from_stage || req.body?.from_stage || null;

      const { data: course } = await ctx.supabase
        .from('courses')
        .select('course_code, display_name, seed_count, quality_rules')
        .eq('course_code', courseCode)
        .single();

      if (!course) return res.status(404).json({ ok: false, error: `Course ${courseCode} not found` });

      const goldenCount = getGoldenSeedCount(course);
      const effectiveTarget = targetSeeds || course.seed_count || 300;

      // Check build progress — skip if resuming from a specific stage
      const progress = await getBuildProgress(ctx, courseCode);
      if (!fromStage && progress.completed >= effectiveTarget) {
        return res.json({ ok: false, error: `Target reached (${progress.completed}/${effectiveTarget} seeds). Use ?from_stage=phrases to resume phrase generation.` });
      }

      // Check for existing running build
      const { data: existingJob } = await ctx.supabase
        .from('build_jobs')
        .select('id, status')
        .eq('course_code', courseCode)
        .eq('status', 'running')
        .limit(1)
        .maybeSingle();

      if (existingJob) {
        return res.status(409).json({ ok: false, error: 'Build already running — wait or stop it first' });
      }

      // Create build job
      const { data: jobData, error: jobErr } = await ctx.supabase
        .from('build_jobs')
        .insert({
          course_code: courseCode,
          pass: 'v2_pipeline',
          status: 'running',
          current_seed: progress.completed,
          seeds_completed: progress.completed,
          total_seeds: effectiveTarget,
          started_at: new Date().toISOString(),
          last_heartbeat: new Date().toISOString(),
          requested_by: 'dashboard_v2',
          terminal,
          agent_count: 0,
          respawn_count: 0,
          machine_name: ctx.config.MACHINE_NAME,
          build_mode: 'v2_pipeline'
        })
        .select('id')
        .single();

      if (jobErr) return res.status(500).json({ ok: false, error: `Failed to create build job: ${jobErr.message}` });

      emitProgress(ctx.supabase, courseCode, `Build pipeline started: seeds ${progress.completed + 1}–${effectiveTarget} (${effectiveTarget - progress.completed} to build)`, { phase: 'build', action: 'pipeline-start', from: progress.completed + 1, to: effectiveTarget });

      // Generate and spawn v2 coordinator
      const goldenSeedMarkdown = await fetchGoldenSeedExamples(ctx, courseCode,
        Array.from({ length: Math.min(5, goldenCount) }, (_, i) => i + 1)
      );

      // Pre-compute LEGO batches for phrase stage so coordinator doesn't have to query
      let precomputedLegoBatches = null;
      if (fromStage === 'phrases') {
        // Fetch all new LEGOs needing phrases
        const { data: newLegos } = await ctx.supabase
          .from('course_legos')
          .select('seed_number, lego_index, type, known_text, target_text')
          .eq('course_code', courseCode)
          .eq('is_new', true)
          .gte('seed_number', goldenCount + 1)
          .order('seed_number')
          .order('lego_index');

        // Find which already have phrases
        const { data: existingPhrases } = await ctx.supabase
          .from('course_practice_phrases')
          .select('seed_number, lego_index')
          .eq('course_code', courseCode)
          .gte('seed_number', goldenCount + 1);

        const done = new Set((existingPhrases || []).map(p => `${p.seed_number}:${p.lego_index}`));
        const remaining = (newLegos || []).filter(l => !done.has(`${l.seed_number}:${l.lego_index}`));

        // Build batches of ~10 LEGOs each
        const batchSize = 10;
        precomputedLegoBatches = [];
        for (let i = 0; i < remaining.length; i += batchSize) {
          const batch = remaining.slice(i, i + batchSize);
          precomputedLegoBatches.push(batch.map(l => ({
            seed: l.seed_number,
            idx: l.lego_index,
            type: l.type,
            known: l.known_text,
            target: l.target_text
          })));
        }
        console.log(`[V2] Pre-computed ${precomputedLegoBatches.length} phrase batches (${remaining.length} LEGOs remaining)`);
      }

      const brief = generateV2CoordinatorBrief({
        courseCode, course, goldenCount, effectiveTarget, goldenSeedMarkdown, fromStage,
        precomputedLegoBatches
      });

      const tmpFile = `/tmp/claude_v2_coordinator_${courseCode}_${Date.now()}.txt`;
      fs.writeFileSync(tmpFile, brief);

      const projectDir = path.resolve(__dirname, '..', '..', '..');
      const claudeCmd = `cd "${projectDir}" && unset CLAUDECODE && ${claudeConfigExport()} && CLAUDE_CODE_MAX_OUTPUT_TOKENS=128000 claude --model sonnet --dangerously-skip-permissions "$(cat ${tmpFile})"`;
      const effectiveTerminal = ctx.config.SPAWN_MODE === 'headless' ? 'headless' : terminal;

      if (effectiveTerminal === 'headless') {
        const logsDir = path.join(projectDir, 'logs');
        if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
        const logFile = `${logsDir}/v2-coordinator-${courseCode}.log`;
        const out = fs.openSync(logFile, 'a');
        const err = fs.openSync(logFile, 'a');
        const agent = spawn('bash', ['-c', claudeCmd], { detached: true, stdio: ['ignore', out, err] });
        agent.unref();
      } else {
        const escapedCmd = claudeCmd.replace(/"/g, '\\"');
        const osascript = `tell application "iTerm"\n  activate\n  set newWindow to (create window with default profile)\n  tell current session of newWindow\n    set name to "V2 Coordinator: ${courseCode}"\n    write text "${escapedCmd}"\n  end tell\nend tell`;
        spawn('osascript', ['-e', osascript], { stdio: 'pipe', detached: true });
      }

      // Update job with agent count
      await ctx.supabase.from('build_jobs').update({ agent_count: 1 }).eq('id', jobData.id);

      startBuildManager(ctx);

      ctx.emitPipelineEvent(courseCode, 'pipeline:stage', { stage: fromStage || 'decompose', progress: null });

      res.json({
        ok: true,
        course_code: courseCode,
        job_id: jobData.id,
        pipeline: 'v2',
        golden_count: goldenCount,
        target_seeds: effectiveTarget,
        progress,
        message: 'V2 pipeline coordinator spawned — Decompose -> Finalize -> Phrases -> Validate -> QA'
      });

    } catch (err) {
      console.error('[V2] Build start error:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // GET /v2/build/status/:courseCode — V2 pipeline status.
  //
  // Returns decompose progress, collision count, phrase progress, validation result.
  // ---------------------------------------------------------------------------
  router.get('/v2/build/status/:courseCode', async (req, res) => {
    try {
      const courseCode = req.params.courseCode;
      const { data: course } = await ctx.supabase
        .from('courses')
        .select('seed_count, quality_rules')
        .eq('course_code', courseCode)
        .single();

      if (!course) return res.status(404).json({ error: `Course ${courseCode} not found` });

      const goldenCount = getGoldenSeedCount(course);
      const totalSeeds = course.seed_count || 300;
      const seedRange = { from: goldenCount + 1, to: totalSeeds };
      const totalInRange = seedRange.to - seedRange.from + 1;

      // Decompose progress: drafts with status 'valid'
      const { count: draftCount } = await ctx.supabase
        .from('course_seed_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('validation_status', 'valid');

      // Collision count
      const { count: collisionCount } = await ctx.supabase
        .from('course_seed_drafts')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('validation_status', 'collision');

      // Finalized LEGOs (seeds with decomposed_at in range)
      const { count: finalizedSeeds } = await ctx.supabase
        .from('course_seeds')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .not('decomposed_at', 'is', null)
        .gte('seed_number', seedRange.from)
        .lte('seed_number', seedRange.to);

      // Phrase progress
      const { count: totalNewLegos } = await ctx.supabase
        .from('course_legos')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('is_new', true)
        .gte('seed_number', seedRange.from);

      const { data: phraseLegos } = await ctx.supabase
        .from('course_practice_phrases')
        .select('seed_number, lego_index')
        .eq('course_code', courseCode)
        .gte('seed_number', seedRange.from);

      const uniquePhraseLegos = new Set((phraseLegos || []).map(p => `${p.seed_number}:${p.lego_index}`));

      // Build job status
      const { data: buildJob } = await ctx.supabase
        .from('build_jobs')
        .select('id, status, build_mode, started_at')
        .eq('course_code', courseCode)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Determine pipeline phase
      let phase = 'idle';
      if (buildJob?.status === 'running') {
        if ((draftCount || 0) < totalInRange && (finalizedSeeds || 0) < totalInRange) {
          phase = 'decompose';
        } else if ((collisionCount || 0) > 0) {
          phase = 'collisions';
        } else if ((finalizedSeeds || 0) >= totalInRange && uniquePhraseLegos.size < (totalNewLegos || 0)) {
          phase = 'phrases';
        } else if (uniquePhraseLegos.size >= (totalNewLegos || 0)) {
          phase = 'validate';
        }
      } else if ((finalizedSeeds || 0) >= totalInRange && uniquePhraseLegos.size >= (totalNewLegos || 0)) {
        phase = 'complete';
      }

      res.json({
        course_code: courseCode,
        pipeline: 'v2',
        phase,
        active: buildJob?.status === 'running',
        build_mode: buildJob?.build_mode,
        seed_range: seedRange,
        total_seeds_in_range: totalInRange,
        decompose: {
          drafts: draftCount || 0,
          collisions: collisionCount || 0,
          finalized: finalizedSeeds || 0,
          target: totalInRange
        },
        phrases: {
          legos_with_phrases: uniquePhraseLegos.size,
          total_legos: totalNewLegos || 0,
          percent: (totalNewLegos || 0) > 0 ? Math.round((uniquePhraseLegos.size / totalNewLegos) * 100) : 0
        }
      });

    } catch (err) {
      console.error('[V2] Build status error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // V2 BRIEF GENERATORS (co-located with routes that use them)
  // ===========================================================================

  /**
   * Generate the v2 decompose brief for Sonnet sub-agents.
   * LEGOs only — no phrase generation.
   */
  function generateV2DecomposeBrief({ courseCode, batches, goldenSeedMarkdown, lessons, courseInfo }) {
    const patternsSection = formatDecompositionPatterns(goldenSeedMarkdown || []);
    const goldenCount = getGoldenSeedCount(courseInfo);

    const lessonsSection = lessons && lessons.length > 0
      ? `\n## Lessons from QA\n${lessons.map(l =>
          `- ${l.lesson}${l.example_wrong ? ` (wrong: ${l.example_wrong})` : ''}${l.example_right ? ` (right: ${l.example_right})` : ''}`
        ).join('\n')}`
      : '';

    const seedList = batches.flatMap(b => b.seeds || []);
    const firstSeed = seedList.length > 0 ? seedList[0] : goldenCount + 1;
    const lastSeed = seedList.length > 0 ? seedList[seedList.length - 1] : courseInfo?.seed_count || 300;

    return `# V2 Decompose Coordinator — ${courseCode}

You are the coordinator. Decompose seeds ${firstSeed}-${lastSeed} into LEGOs ONLY (no phrases).

## Architecture
- Spawn sub-agents (~10 seeds each) via Task tool. ALL in a SINGLE message for parallel execution.
- Sub-agents submit LEGOs as drafts: POST http://localhost:3471/api/v2/decompose (JSON)
- Monitor: GET http://localhost:3471/api/course/${courseCode}/drafts (poll every 60s)
- When all drafts in: POST http://localhost:3471/api/v2/decompose/finalize/${courseCode}
- If finalize returns 409 with collisions: fix them yourself (merge colliding LEGOs into bigger M-LEGOs). Resubmit via POST /api/v2/decompose.
- If clean: report success. Phrases are a SEPARATE stage.

## CRITICAL: LEGOs ONLY — No Phrases
You are decomposing seeds into LEGOs ONLY. Do NOT generate BUILD or USE phrases.
Focus entirely on structural decomposition: which words become A-LEGOs, which chunks become M-LEGOs, what order maximises combination richness.

## Sub-Agent Prompt Template

Give each sub-agent this prompt (replace {SEED_LIST} with their seed numbers):

---BEGIN SUB-AGENT PROMPT---
You are decomposing course content for ${courseCode}. Your seeds: {SEED_LIST}

## API
- Seeds: GET http://localhost:3471/api/seeds/${courseCode}
- Vocab: GET http://localhost:3471/api/vocab/${courseCode}?seed=N
- Submit: POST http://localhost:3471/api/v2/decompose (JSON)

## Your Job
Break each seed into LEGOs (teaching chunks). NO PHRASES — just LEGOs.

**A-LEGO** = single word, zero ambiguity.
**M-LEGO** = multi-word bundle. Groups words that would be ambiguous alone. Must have components array.

Submit JSON:
\`\`\`json
{
  "course_code": "${courseCode}",
  "seed_number": N,
  "legos": [
    { "idx": 1, "type": "A", "known_text": "...", "target_text": "..." },
    { "idx": 2, "type": "M", "known_text": "...", "target_text": "...",
      "components": [{ "known": "...", "target": "..." }] }
  ]
}
\`\`\`

## LEGO Decomposition Patterns — Study These
${patternsSection}
${lessonsSection}

If rejected, read the error, fix, retry. Never ask questions.
---END SUB-AGENT PROMPT---

- subagent_type: "general-purpose", model: "sonnet", run_in_background: true

## AUTONOMY
You are running unattended. NEVER ask questions. Fix errors. Respawn failed agents. Keep going until finalize succeeds.
`;
  }

  /**
   * Generate the v2 collision fix brief for Sonnet agents.
   */
  function generateV2CollisionFixBrief({ courseCode, fixInstructions }) {
    return `# V2 Collision Fix — ${courseCode}

Fix ZUT collisions. The finalize response contains the affected seeds, current drafts, and available vocab.

## The fix in 4 steps
1. Find the colliding LEGO (marked in collision notes)
2. Pick an adjacent LEGO to merge with — whichever makes a natural combined phrase
3. Replace the two LEGOs with one M-LEGO: known = combined English, target = combined target, components = the two originals
4. Re-index remaining LEGOs sequentially (1, 2, 3...)
5. Resubmit: POST http://localhost:3471/api/v2/decompose

## Seeds to fix

${fixInstructions.map(batch => batch.prompt).join('\n\n')}

## AUTONOMY: Fix every seed. If rejected, read the error, fix, retry. Never ask questions.`;
  }

  /**
   * Generate the v2 phrase brief for Sonnet sub-agents.
   */
  function generateV2PhraseBrief({ courseCode, legoBatches, goldenSeedMarkdown, courseInfo }) {
    const goldenCount = getGoldenSeedCount(courseInfo);

    // Extract golden phrase examples
    const phraseExamples = (goldenSeedMarkdown || []).slice(0, 3).map(seed => {
      const legoExample = seed.legos?.[0];
      if (!legoExample) return '';
      return `Seed ${seed.seed_number}, "${seed.target_text}":
  LEGO: "${legoExample.known}" -> "${legoExample.target}"
  BUILD: ${(legoExample.build || []).slice(0, 2).map(p => `"${p.known}" -> "${p.target}"`).join(', ')}
  USE: ${(legoExample.use || []).slice(0, 3).map(p => `"${p.known}" -> "${p.target}" (score: ${p.score || 7})`).join(', ')}`;
    }).filter(Boolean).join('\n\n');

    return `# V2 Phrase Generator Coordinator — ${courseCode}

You are the coordinator. Generate BUILD and USE phrases for all finalized LEGOs.

## Architecture
- Spawn sub-agents (~10 LEGOs each) via Task tool. ALL in a SINGLE message.
- Sub-agents submit phrases: POST http://localhost:3471/api/v2/phrases/${courseCode}
- Monitor: GET http://localhost:3471/api/v2/phrases/progress/${courseCode} (poll every 60s)
- When all done: POST http://localhost:3471/api/v2/validate/${courseCode}

## Sub-Agent Prompt Template

---BEGIN SUB-AGENT PROMPT---
You are generating phrases for ${courseCode}. Your LEGOs: {LEGO_LIST}

## API
- Vocab: GET http://localhost:3471/api/vocab/${courseCode}?seed=N
- Submit: POST http://localhost:3471/api/v2/phrases/${courseCode} (JSON)

## Your Job
Generate BUILD and USE phrases for each LEGO.

**BUILD** (3+): new LEGO + prior vocabulary. Fragments OK.
**USE** (8+): natural complete sentences. Scored 5-9.

Submit JSON:
\`\`\`json
{
  "phrases": [
    {
      "seed_number": N,
      "lego_index": L,
      "build": [
        { "known": "speak German", "target": "Deutsch sprechen" }
      ],
      "use": [
        { "known": "I want to speak German", "target": "Ich m\\u00f6chte Deutsch sprechen", "known_score": 7, "target_score": 8 }
      ]
    }
  ]
}
\`\`\`

## Golden Phrase Examples
${phraseExamples}

Overgenerate — aim for 5 BUILD and 12 USE per LEGO. The server validates vocabulary, containment, and counts.
If rejected, read the error, fix, retry. Never ask questions.
---END SUB-AGENT PROMPT---

- subagent_type: "general-purpose", model: "sonnet", run_in_background: true

## AUTONOMY
You are running unattended. Fix errors. Respawn failed agents. Keep going until validate passes.
`;
  }

  /**
   * Generate v2 QA scan brief — Haiku agents flag issues.
   */
  function generateV2QAScanBrief({ courseCode, batches, courseInfo }) {
    const batchList = batches.map((b, i) =>
      `Batch ${i + 1}: seeds ${b.start}-${b.end}`
    ).join('\n');

    return `# V2 QA Scan Coordinator — ${courseCode}

Spawn sub-agents to scan all phrases for grammar, naturalness, and speakability.
Flag issues — do NOT fix them.

## Batch Assignments
${batchList}

## Sub-Agent Prompt Template

---BEGIN SUB-AGENT PROMPT---
You are scanning phrases for quality issues in ${courseCode}. Your seeds: {SEED_RANGE}

## API
- Fetch phrases: GET http://localhost:3471/api/qa/unchecked/${courseCode}?seed_min={MIN}&seed_max={MAX}&limit=1000
- Flag issues: POST http://localhost:3471/api/qa/bulk-flag
- Mark checked: POST http://localhost:3471/api/qa/mark-checked

## Check each phrase for:
1. **Grammar**: Is the target grammatically correct?
2. **Naturalness**: Would a native speaker actually say this?
3. **LEGO form**: Is the LEGO used in its exact form (no conjugation)?
4. **Speakability**: Can a learner produce this without reading?
5. **Score accuracy**: Does the score match the quality?

Flag format:
\`\`\`json
{
  "flags": [
    {
      "course_code": "${courseCode}",
      "phrase_id": "...",
      "seed_number": N,
      "check_type": "grammar|naturalness|vocabulary",
      "severity": "error|warning",
      "issue": "Description of the problem"
    }
  ]
}
\`\`\`

After checking all phrases, mark them as checked.
---END SUB-AGENT PROMPT---

- subagent_type: "general-purpose", model: "haiku", run_in_background: true

## AUTONOMY
You are running unattended. Fix errors. Respawn failed agents.
`;
  }

  /**
   * Generate v2 QA fix brief — Opus agent repairs flagged phrases.
   */
  function generateV2QAFixBrief({ courseCode, courseInfo }) {
    return `# V2 QA Fix — ${courseCode}

Repair flagged phrases. You are an Opus agent — use your methodology awareness to fix issues properly.

## API
- Get flags: GET http://localhost:3471/api/qa/flags/${courseCode}?status=open
- Get phrase context: GET http://localhost:3471/api/vocab/${courseCode}?seed=N
- Replace phrase: DELETE the old phrase + submit replacement via POST /api/v2/phrases/${courseCode}
- Resolve flag: POST http://localhost:3471/api/qa/flag/{flagId}/resolve

## Strategy
After deleting flagged phrases, if any LEGO has < 4 USE phrases, rebuild the whole seed's phrases.
>= 4 USE is fine — LEGOs get reused in later seeds' phrases (recombination = real spaced repetition).

For each flag:
1. Read the issue description
2. Fetch the LEGO context (seed, vocab)
3. Generate a corrected phrase that preserves LEGO containment and vocabulary constraints
4. Submit the replacement
5. Resolve the flag

## AUTONOMY
You are running unattended. Never ask questions. Fix every flag.
`;
  }

  /**
   * Generate v2 coordinator brief — orchestrates the full pipeline.
   */
  function generateV2CoordinatorBrief({ courseCode, course, goldenCount, effectiveTarget, goldenSeedMarkdown, fromStage, precomputedLegoBatches }) {
    const seedRange = `${goldenCount + 1}-${effectiveTarget}`;
    const seedsNeeded = effectiveTarget - goldenCount;

    // Get pattern-diverse golden seed examples for brief
    const patternsSection = formatDecompositionPatterns(goldenSeedMarkdown || []);

    const stageOrder = ['decompose', 'finalize', 'phrases', 'validate', 'qa'];
    const startIdx = fromStage ? stageOrder.indexOf(fromStage) : 0;
    const resumeNote = fromStage ? `\n**RESUMING from stage: ${fromStage.toUpperCase()}** — Stages 1-${startIdx} are already complete. Skip straight to Stage ${startIdx + 1}.\n` : '';

    return `# V2 Pipeline Coordinator — ${courseCode}

You orchestrate the v2 staged pipeline for seeds ${seedRange} (${seedsNeeded} seeds).
${resumeNote}
## Pipeline Stages
${startIdx <= 0 ? `
### Stage 1: DECOMPOSE (Sonnet sub-agents)
Spawn ~${Math.ceil(seedsNeeded / ctx.config.SEEDS_PER_AGENT)} Sonnet sub-agents, ~${ctx.config.SEEDS_PER_AGENT} seeds each.
Each submits LEGOs only: POST http://localhost:3471/api/v2/decompose
Monitor: GET http://localhost:3471/api/course/${courseCode}/drafts
` : '### Stage 1: DECOMPOSE — ✅ ALREADY COMPLETE'}
${startIdx <= 1 ? `
### Stage 2: FINALIZE
When all drafts in: POST http://localhost:3471/api/v2/decompose/finalize/${courseCode}
If 409 (collisions): fix them (merge colliding LEGOs into bigger M-LEGOs), resubmit, re-finalize.
Loop until clean (200).
` : '### Stage 2: FINALIZE — ✅ ALREADY COMPLETE'}
${startIdx <= 2 ? (precomputedLegoBatches ? `
### Stage 3: GENERATE PHRASES (Sonnet sub-agents)

**${precomputedLegoBatches.length} batches pre-computed. Spawn ALL sub-agents in a SINGLE message.**

Each submits phrases: POST http://localhost:3471/api/v2/phrases/${courseCode}
Monitor: GET http://localhost:3471/api/v2/phrases/progress/${courseCode} (poll every 90s)

## BATCH ASSIGNMENTS (ready to spawn — DO NOT query the database)

${precomputedLegoBatches.map((batch, i) => {
  const legoList = batch.map(l => `S${l.seed}L${l.idx}(${l.type}): "${l.known}" → "${l.target}"`).join('\n    ');
  return `**Agent ${i + 1}** (${batch.length} LEGOs):\n    ${legoList}`;
}).join('\n\n')}
` : `
### Stage 3: GENERATE PHRASES (Sonnet sub-agents)
Fetch finalized LEGOs: query course_legos where is_new=true and seed_number >= ${goldenCount + 1}
Spawn ~${Math.ceil(seedsNeeded / 5)} Sonnet sub-agents, ~10 LEGOs each.
Each submits phrases: POST http://localhost:3471/api/v2/phrases/${courseCode}
Monitor: GET http://localhost:3471/api/v2/phrases/progress/${courseCode}
`) : '### Stage 3: GENERATE PHRASES — ✅ ALREADY COMPLETE'}
${startIdx <= 3 ? `
### Stage 4: VALIDATE
POST http://localhost:3471/api/v2/validate/${courseCode}
If failures: spawn targeted fix agents to repair, then re-validate.
` : '### Stage 4: VALIDATE — ✅ ALREADY COMPLETE'}
${startIdx <= 4 ? `
### Stage 5: QA
POST http://localhost:3471/api/v2/qa/scan/${courseCode} — Haiku flags
Wait for scan to complete (poll /api/qa/summary/${courseCode})
If flags > 0: POST http://localhost:3471/api/v2/qa/fix/${courseCode} — Opus repairs
` : '### Stage 5: QA — ✅ ALREADY COMPLETE'}

## LEGO Decomposition Patterns
${patternsSection}

## Sub-Agent Instructions

### For DECOMPOSE sub-agents (Sonnet):
\`\`\`
subagent_type: "general-purpose", model: "sonnet", run_in_background: true
\`\`\`
Prompt: Decompose seeds {SEED_LIST} into LEGOs only. POST /api/v2/decompose.
Seeds: GET http://localhost:3471/api/seeds/${courseCode}
Vocab: GET http://localhost:3471/api/vocab/${courseCode}?seed=N

### For PHRASE sub-agents (Sonnet):
\`\`\`
subagent_type: "general-purpose", model: "sonnet", run_in_background: true
\`\`\`

**Sub-agent prompt template** (replace {LEGO_LIST} with the batch assignment above, and {GOLDEN_EXAMPLES} with the golden examples below):

---BEGIN SUB-AGENT PROMPT---
You are a world-class language teacher generating practice phrases for ${courseCode}.

Your LEGOs:
{LEGO_LIST}

## What You're Building
**BUILD phrases (5+):** Short fragments — the new LEGO combined with known vocab. Don't need to be full sentences.
**USE phrases (15+):** Complete, natural sentences a real person would say. Must average 12+ syllables. Scored 5-9.

## Rules (server enforces — violations = rejection)
1. **Containment**: Every phrase target MUST contain the LEGO's target text as an exact substring
2. **Vocabulary**: Every word in the target must be in learner's vocab. Check: GET http://localhost:3471/api/vocab/${courseCode}?seed=N (returns comma-separated — split on commas)
3. **Grammar**: Must be grammatically correct. No fragments for USE phrases.
4. **Naturalness**: Would a native speaker actually say this?

## API
- Check vocab BEFORE writing phrases: GET http://localhost:3471/api/vocab/${courseCode}?seed=N
- Submit: POST http://localhost:3471/api/v2/phrases/${courseCode} (JSON body)

## JSON Format
\\\`\\\`\\\`json
{
  "phrases": [
    {
      "seed_number": N,
      "lego_index": L,
      "build": [{ "known": "...", "target": "..." }],
      "use": [{ "known": "...", "target": "...", "known_score": 7, "target_score": 8 }]
    }
  ]
}
\\\`\\\`\\\`

## Scoring
- **known_score**: How common is the known text? 5=everyday, 7=moderate, 9=advanced
- **target_score**: How complex is the target? 5=short (4-6 words), 7=medium (7-10), 9=long (11+)
- Aim for a MIX — don't make everything a 7

## Workflow
1. For EACH LEGO: fetch vocab for that seed number first
2. Write BUILD phrases (5+)
3. Write USE phrases (15+) — OVERGENERATE. Full natural sentences only.
4. Submit the batch
5. If rejected: read the error, fix the specific issue, resubmit

Never ask questions. Fix errors and retry.
---END SUB-AGENT PROMPT---

## Golden Phrase Examples (include in each sub-agent prompt as {GOLDEN_EXAMPLES})
${patternsSection}

## Heartbeat
Ping the build job: POST http://localhost:3471/api/activity/${courseCode}/ping every 5 minutes.

## AUTONOMY
You are running unattended. NEVER ask questions. Fix errors. Respawn failed agents. Keep going until all stages complete.
`;
  }

  return router;
};

// Exposed for unit testing the scoped-validation sweep (Delta A). Not used by
// the running service, which only consumes the factory default export above.
module.exports._test = { accumulate, runSeedChecks };

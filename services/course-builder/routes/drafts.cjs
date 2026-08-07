/**
 * Parallel draft management routes — GET /course/:code/drafts, POST /course/:code/finalize.
 * Extracted from course-builder-api.cjs monolith.
 */

const { Router } = require('express');
const { isChinese } = require('../lib/language-config.cjs');
const { normalizePhrase, normalizeForZUT, normalizeForStorage, normalizeForContainment, extractVocab } = require('../lib/text-normalization.cjs');
const { makePhraseId, computePhraseRole, computeLegoPosition, usesBuildUseFormat, generateBuildupPhrases, partitionBareLegoPhrases } = require('../lib/phrase-structure.cjs');
const { loadTranslationVocab, invalidateVocabCache } = require('../lib/vocab-cache.cjs');

module.exports = function(ctx) {
  const router = Router();

  // ===========================================================================
  // GET /course/:code/drafts - List draft status summary
  // ===========================================================================
  router.get('/course/:code/drafts', async (req, res) => {
    try {
      const courseCode = req.params.code;
      const statusFilter = req.query.status; // optional: 'valid', 'collision', 'rework'

      let query = ctx.supabase
        .from('course_seed_drafts')
        .select('seed_number, validation_status, validation_notes, created_at, updated_at')
        .eq('course_code', courseCode)
        .order('seed_number');

      if (statusFilter) {
        query = query.eq('validation_status', statusFilter);
      }

      const { data: drafts, error } = await query;
      if (error) throw error;

      const statusCounts = { valid: 0, collision: 0, rework: 0 };
      for (const d of drafts || []) {
        statusCounts[d.validation_status] = (statusCounts[d.validation_status] || 0) + 1;
      }

      res.json({
        course_code: courseCode,
        total_drafts: drafts?.length || 0,
        ...statusCounts,
        drafts: drafts || []
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // POST /course/:code/finalize - Process all drafts into live tables
  //
  // Steps:
  // 1. Load all drafts in seed order
  // 2. Load baseline LEGOs ONLY from non-drafted seeds (avoids stale dedup matches)
  // 3. Process: dedup (same known+target), detect collisions (same known, diff target)
  // 4. If collisions -> report, don't write
  // 5. Clean old LEGOs/phrases for drafted seeds, then write fresh + cleanup drafts
  // ===========================================================================
  router.post('/course/:code/finalize', async (req, res) => {
    try {
      const courseCode = req.params.code;
      console.log(`\n${'='.repeat(60)}`);
      console.log(`FINALIZE: ${courseCode}`);
      console.log(`${'='.repeat(60)}`);

      // =====================================================================
      // STEP 1: Load all drafts in seed order
      // =====================================================================
      const { data: drafts, error: draftErr } = await ctx.supabase
        .from('course_seed_drafts')
        .select('*')
        .eq('course_code', courseCode)
        .order('seed_number');

      if (draftErr) throw new Error(`Failed to load drafts: ${draftErr.message}`);

      if (!drafts || drafts.length === 0) {
        return res.status(400).json({
          error: 'No drafts found',
          course_code: courseCode,
          hint: 'Submit seeds with ?draft=true first, then finalize.'
        });
      }
      console.log(`  Drafts loaded: ${drafts.length}`);

      // Build set of seed numbers that have drafts (these will be replaced)
      const draftedSeedNumbers = new Set(drafts.map(d => d.seed_number));

      // =====================================================================
      // STEP 2: Load baseline -- existing LEGOs ONLY from seeds without drafts
      //         (Seeds with drafts will be overwritten, so their old LEGOs
      //          must not pollute the baseline or inflate dedup counts)
      // =====================================================================
      const { data: existingLegos, error: legoErr } = await ctx.supabase
        .from('course_legos')
        .select('known_text, target_text, seed_number, lego_index, is_new')
        .eq('course_code', courseCode)
        .order('seed_number')
        .order('lego_index');

      if (legoErr) throw new Error(`Failed to load existing LEGOs: ${legoErr.message}`);

      // Build known->target map from existing is_new LEGOs (normalized for ZUT comparison)
      // IMPORTANT: Skip LEGOs from seeds that have drafts -- those are stale and will be replaced
      const knownLegoMap = new Map(); // normalizeForZUT(known_text) -> { target_text, known_text, seed_number, lego_index }
      for (const lego of existingLegos || []) {
        if (draftedSeedNumbers.has(lego.seed_number)) continue; // Skip -- draft will replace this
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

      // =====================================================================
      // STEP 3: Process drafts in seed order -- dedup + collision detection
      // =====================================================================
      const collisions = [];
      const dedupResults = new Map(); // seed_number -> Map<lego_idx, 'new'|'duplicate'>
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
            // Same known text exists (ZUT-normalized match)
            // IMPORTANT: Compare targets with normalizeForStorage (preserves diacritics)
            // normalizeForZUT strips diacritics, which would merge genuinely different words:
            // e.g., French "a" (to) vs "a" (has), Italian "e" (is) vs "e" (and)
            const existingTarget = normalizeForStorage(existing.target_text);
            const newTarget = normalizeForStorage(lego.target);

            if (existingTarget === newTarget) {
              // DUPLICATE: Same known + same target -> mark for dedup
              legoStatuses.set(lego.idx, 'duplicate');
              totalDeduplicated++;
            } else {
              // COLLISION: Same known + different target
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
            // NEW LEGO: No match found
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

        // Empty seed: all LEGOs are duplicates
        if (newCount === 0 && draftLegos.length > 0 && collisions.filter(c => c.seed_number === draft.seed_number).length === 0) {
          emptySeedNumbers.push(draft.seed_number);
        }
      }

      console.log(`  Dedup: ${totalDeduplicated} duplicate LEGOs`);
      console.log(`  Collisions: ${collisions.length}`);
      console.log(`  Empty seeds: ${emptySeedNumbers.length}`);

      // =====================================================================
      // STEP 4: Collision check -- abort if any
      // =====================================================================
      const chinese = isChinese(courseCode);

      if (collisions.length > 0) {
        // Update colliding drafts in DB
        const collidingSeeds = [...new Set(collisions.map(c => c.seed_number))];
        for (const seedNum of collidingSeeds) {
          const seedCollisions = collisions.filter(c => c.seed_number === seedNum);
          await ctx.supabase
            .from('course_seed_drafts')
            .update({
              validation_status: 'collision',
              validation_notes: {
                collisions: seedCollisions,
                detected_at: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            })
            .eq('course_code', courseCode)
            .eq('seed_number', seedNum);
        }

        console.log(`\u2717 FINALIZE ABORTED: ${collisions.length} collision(s) in ${collidingSeeds.length} seed(s)`);

        // Build ready-to-use fix instructions, grouped into batches of ~5 seeds
        const draftMap = new Map(drafts.map(d => [d.seed_number, d]));
        const fixBatches = [];
        for (let i = 0; i < collidingSeeds.length; i += 5) {
          const batchSeeds = collidingSeeds.slice(i, i + 5);

          const seedSections = await Promise.all(batchSeeds.map(async seedNum => {
            const draft = draftMap.get(seedNum);
            const seedCollisions = collisions.filter(c => c.seed_number === seedNum);
            const draftJson = JSON.stringify(draft.submission_data, null, 2);

            // Fetch available vocab for this seed so the coordinator doesn't need to
            const vocabSet = await loadTranslationVocab(ctx, courseCode, seedNum);
            const vocabStr = [...vocabSet].sort().join(chinese ? '' : ', ');

            const collisionNotes = seedCollisions.map(c =>
              `- LEGO L${c.lego_idx} "${c.lego_known}" \u2192 "${c.lego_target}" COLLIDES with seed ${c.conflicts_with.seed_number} which already has "${c.lego_known}" \u2192 "${c.conflicts_with.target_text}"\n  FIX: Merge L${c.lego_idx} with an adjacent LEGO to create a bigger M-LEGO whose English known text is different.`
            ).join('\n');

            return `### Seed ${seedNum}

**Collisions:**
${collisionNotes}

**Available vocab (all words the learner knows by this seed):**
${vocabStr}

**Current draft (your starting point):**
\`\`\`json
${draftJson}
\`\`\``;
          }));

          fixBatches.push({
            seeds: batchSeeds,
            prompt: `You are fixing ZUT collisions for course ${courseCode}.

**IMPORTANT: Everything you need is below \u2014 the draft JSON, collision notes, and available vocab for each seed. Do NOT query Supabase, call other endpoints, or search for anything. Just read this data and fix the seeds.**

Each seed below has a LEGO whose English "known" text clashes with another seed's LEGO (same known, different target). The fix is mechanical: merge the colliding LEGO with an adjacent LEGO from the same seed to create a bigger M-LEGO with a different (longer) English known text. Leave all other LEGOs and their phrases exactly as they are.

## The fix in 4 steps
1. Find the colliding LEGO (marked below)
2. Pick an adjacent LEGO from the same seed to merge with \u2014 choose whichever makes a natural phrase
3. Replace the two LEGOs with one M-LEGO: known = combined English, target = combined target, components = the two original LEGOs
4. Write BUILD phrases (min 3: merged LEGO + prior vocab, fragments OK) and USE phrases (min 8: complete natural sentences containing the merged LEGO target as exact substring) for the new M-LEGO. The available vocab is listed per seed below \u2014 use ONLY these words in phrases.

Re-index the remaining LEGOs so idx values are sequential (1, 2, 3...). Do NOT touch other LEGOs or their phrases.

## Seeds to fix

${seedSections.join('\n\n')}

## Submitting
Submit each fixed seed: curl -s -X POST "http://localhost:3471/api/seed/complete?draft=true" -H "Content-Type: application/json" --data-binary @/tmp/seed{N}.json

## AUTONOMY: You are running unattended. NEVER ask questions. Fix every seed. If rejected, read the error, fix, retry.`
          });
        }

        return res.status(409).json({
          error: 'COLLISIONS_DETECTED',
          message: `${collisions.length} LEGO collision(s) found \u2014 cannot finalize until resolved`,
          collisions,
          colliding_seeds: collidingSeeds,
          fix_instructions: fixBatches
        });
      }

      // =====================================================================
      // STEP 5: Clean up old LEGOs/phrases for drafted seeds, then write fresh
      // =====================================================================
      // Delete old LEGOs and phrases for ALL drafted seeds before writing.
      // This prevents orphan LEGOs from prior builds with different decompositions.
      const draftSeedList = [...draftedSeedNumbers];
      if (draftSeedList.length > 0) {
        // Delete phrases first (FK dependency)
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
      let phrasesWritten = 0;

      for (const draft of drafts) {
        const draftLegos = draft.submission_data?.legos || [];
        const legoStatuses = dedupResults.get(draft.seed_number);
        const isEmptySeed = emptySeedNumbers.includes(draft.seed_number);
        const seedId = `S${String(draft.seed_number).padStart(4, '0')}`;

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

        // 5b. Insert LEGOs and phrases
        let seedPhraseCount = 0;
        let skippedDuplicates = 0;

        for (const lego of draftLegos) {
          const legoStatus = legoStatuses?.get(lego.idx) || 'new';
          const isDuplicate = legoStatus === 'duplicate';

          // Upsert LEGO
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
            continue;
          }

          legosIntroduced++;

          // Generate phrases (same logic as INSERT PHASE in seed/complete)
          let allPhraseRows = [];
          let practiceStartPosition = 1;
          let roleCounts = { component: 0, build: 0, use: 0 };

          // M-TYPE BUILD-UP
          if (lego.type === 'M' && lego.components && lego.components.length > 0) {
            const buildupResult = generateBuildupPhrases(
              { seed: draft.seed_number, idx: lego.idx, known: lego.known, target: lego.target, components: lego.components },
              courseCode
            );
            allPhraseRows = [...buildupResult.buildupPhrases];
            practiceStartPosition = buildupResult.startPosition;
            roleCounts = { ...buildupResult.roleCounts };
          }

          // BUILD/USE format
          if (usesBuildUseFormat(lego)) {
            // A phrase that IS the LEGO is padding, never practice — drop it
            // before it reaches a row (phrase-structure.cjs isBareLegoPhrase).
            const buildSplit = partitionBareLegoPhrases(lego.build || [], lego.target);
            const useSplit = partitionBareLegoPhrases(lego.use || [], lego.target);
            const droppedBare = buildSplit.bare.length + useSplit.bare.length;
            if (droppedBare > 0) {
              console.log(`  ⚠ S${draft.seed_number}L${lego.idx}: dropped ${droppedBare} bare-LEGO phrase(s) ("${lego.target}")`);
            }
            const buildPhrases = buildSplit.kept;
            const usePhrases = useSplit.kept;

            const buildRows = buildPhrases.map((p, i) => {
              roleCounts.build++;
              return {
                id: makePhraseId(courseCode, draft.seed_number, lego.idx, 'build', roleCounts.build),
                course_code: courseCode,
                seed_number: draft.seed_number,
                lego_index: lego.idx,
                position: practiceStartPosition + i,
                known_text: p.known,
                target_text: p.target,
                word_count: p.target.length,
                lego_count: (p.known.match(/\s+/g) || []).length + 1,
                phrase_role: 'build',
                connected_lego_ids: [],
                lego_position: computeLegoPosition(p.target, lego.target),
                metadata: { format: 'build_use' },
                status: 'draft',
                version: 1
              };
            });

            const useRows = usePhrases.map((p, i) => {
              roleCounts.use++;
              return {
                id: makePhraseId(courseCode, draft.seed_number, lego.idx, 'use', roleCounts.use),
                course_code: courseCode,
                seed_number: draft.seed_number,
                lego_index: lego.idx,
                position: practiceStartPosition + buildPhrases.length + i,
                known_text: p.known,
                target_text: p.target,
                word_count: p.target.length,
                lego_count: (p.known.match(/\s+/g) || []).length + 1,
                phrase_role: 'use',
                connected_lego_ids: [],
                lego_position: computeLegoPosition(p.target, lego.target),
                metadata: {
                  format: 'build_use',
                  score: p.score,
                  scored_at: new Date().toISOString()
                },
                status: 'draft',
                version: 1
              };
            });

            allPhraseRows = [...allPhraseRows, ...buildRows, ...useRows];

          } else if (lego.phrases && lego.phrases.length > 0) {
            // Legacy format
            const legacyBare = partitionBareLegoPhrases(lego.phrases, lego.target);
            if (legacyBare.bare.length > 0) {
              console.log(`  ⚠ S${draft.seed_number}L${lego.idx}: dropped ${legacyBare.bare.length} bare-LEGO phrase(s) ("${lego.target}")`);
            }
            const buildupNormalized = new Set(allPhraseRows.map(p => normalizePhrase(p.target_text)));
            const seenNormalized = new Set();
            const dedupedPhrases = legacyBare.kept.filter(p => {
              const norm = normalizePhrase(p.target);
              if (buildupNormalized.has(norm) || seenNormalized.has(norm)) return false;
              seenNormalized.add(norm);
              return true;
            });

            const sorted = [...dedupedPhrases].sort((a, b) => a.target.length - b.target.length);
            const practicePhrases = sorted.map((p, i) => {
              const position = practiceStartPosition + i;
              const role = computePhraseRole(position);
              roleCounts[role] = (roleCounts[role] || 0) + 1;
              return {
                id: makePhraseId(courseCode, draft.seed_number, lego.idx, role, roleCounts[role]),
                course_code: courseCode,
                seed_number: draft.seed_number,
                lego_index: lego.idx,
                position,
                known_text: p.known,
                target_text: p.target,
                word_count: p.target.length,
                lego_count: (p.known.match(/\s+/g) || []).length + 1,
                phrase_role: role,
                connected_lego_ids: [],
                lego_position: computeLegoPosition(p.target, lego.target),
                metadata: p.score ? { score: p.score } : {},
                status: 'draft',
                version: 1
              };
            });

            allPhraseRows = [...allPhraseRows, ...practicePhrases];
          }

          // Insert phrases
          if (allPhraseRows.length > 0) {
            const { error: phraseError } = await ctx.supabase
              .from('course_practice_phrases')
              .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });

            if (phraseError) throw new Error(`Phrase insert failed: ${phraseError.message}`);
            seedPhraseCount += allPhraseRows.length;
          }
        }

        // 5c. Handle empty seeds (all LEGOs are duplicates)
        if (isEmptySeed) {
          // Get all is_new=true LEGOs from earlier seeds to build word->LEGO map
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
          let bestSeedNum = -1;
          let bestLegoIdx = -1;
          let bestLegoTarget = null;

          for (const w of seedWords) {
            const intro = wordIntroducedBy[w];
            if (!intro) continue;
            if (intro.seed_number > bestSeedNum ||
                (intro.seed_number === bestSeedNum && intro.lego_index > bestLegoIdx)) {
              bestSeedNum = intro.seed_number;
              bestLegoIdx = intro.lego_index;
              bestLegoTarget = intro.target_text;
            }
          }

          if (bestSeedNum >= 0) {
            // Find max position and existing USE count for deterministic ID
            const { data: existingPhrases } = await ctx.supabase
              .from('course_practice_phrases')
              .select('position, phrase_role')
              .eq('course_code', courseCode)
              .eq('seed_number', bestSeedNum)
              .eq('lego_index', bestLegoIdx);

            const maxPos = existingPhrases?.reduce((max, p) => Math.max(max, p.position), 0) || 0;
            const existingUseCount = existingPhrases?.filter(p => p.phrase_role === 'use').length || 0;

            const { error: seedPhraseError } = await ctx.supabase
              .from('course_practice_phrases')
              .insert({
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
                metadata: {
                  format: 'build_use',
                  source: 'seed_sentence',
                  source_seed: draft.seed_number,
                  score: 8
                },
                status: 'draft',
                version: 1
              });

            if (seedPhraseError) {
              console.warn(`  \u26a0 Empty seed ${draft.seed_number}: Could not add USE phrase: ${seedPhraseError.message}`);
            } else {
              seedPhraseCount++;
              console.log(`  \u2713 Empty seed ${draft.seed_number} \u2192 USE phrase for S${String(bestSeedNum).padStart(4,'0')}L${String(bestLegoIdx).padStart(2,'0')}`);
            }
          }
        }

        phrasesWritten += seedPhraseCount;
        seedsWritten++;

        if (seedsWritten % 50 === 0) {
          console.log(`  Progress: ${seedsWritten}/${drafts.length} seeds written`);
        }
      }

      // =====================================================================
      // STEP 6: Cleanup drafts + report
      // =====================================================================
      const { error: deleteError } = await ctx.supabase
        .from('course_seed_drafts')
        .delete()
        .eq('course_code', courseCode);

      if (deleteError) {
        console.warn(`  \u26a0 Draft cleanup failed: ${deleteError.message}`);
      }

      // Invalidate vocab cache since we just wrote a bunch of LEGOs
      invalidateVocabCache(ctx, courseCode);

      console.log(`\n${'='.repeat(60)}`);
      console.log(`\u2713 FINALIZE COMPLETE: ${courseCode}`);
      console.log(`  Seeds: ${seedsWritten}`);
      console.log(`  LEGOs introduced: ${legosIntroduced}`);
      console.log(`  LEGOs deduplicated: ${totalDeduplicated}`);
      console.log(`  Empty seeds: ${emptySeedNumbers.length}`);
      console.log(`  Phrases: ${phrasesWritten}`);
      console.log(`${'='.repeat(60)}\n`);

      res.json({
        ok: true,
        status: 'FINALIZED',
        course_code: courseCode,
        seeds_written: seedsWritten,
        legos_introduced: legosIntroduced,
        legos_deduplicated: totalDeduplicated,
        empty_seeds: emptySeedNumbers.length,
        empty_seed_numbers: emptySeedNumbers.length > 0 ? emptySeedNumbers : undefined,
        phrases_written: phrasesWritten,
        collisions: 0
      });

    } catch (err) {
      console.error('Finalize error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

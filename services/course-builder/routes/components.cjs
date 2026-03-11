/**
 * M-LEGO component backfill routes.
 *
 * GET  /course/:courseCode/components/gaps     — M-LEGOs missing components
 * POST /course/:courseCode/components/backfill — Write components + rebuild phrases
 *
 * Factory: receives ctx ({ supabase, config }).
 */

const { Router } = require('express');
const { isChinese } = require('../lib/language-config.cjs');
const { generateBuildupPhrases, makePhraseId } = require('../lib/phrase-structure.cjs');
const { invalidateVocabCache } = require('../lib/vocab-cache.cjs');
const { bumpCourseVersion } = require('../../shared/course-version.cjs');

module.exports = function (ctx) {
  const router = Router();

  // ─── GET gaps ────────────────────────────────────────────────────────

  router.get('/course/:courseCode/components/gaps', async (req, res) => {
    const { courseCode } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);
    const offset = parseInt(req.query.offset) || 0;
    const includePartial = req.query.include_partial === 'true';
    const cjk = isChinese(courseCode);

    try {
      // Single query: fetch ALL M-LEGOs for this course, filter in JS
      // (.eq('components', '[]') doesn't work for JSONB empty arrays in PostgREST)
      const { data: allMLegos, error: legoErr } = await ctx.supabase
        .from('course_legos')
        .select('seed_number, lego_index, known_text, target_text, components')
        .eq('course_code', courseCode)
        .eq('type', 'M')
        .eq('is_new', true)
        .order('seed_number')
        .order('lego_index');

      if (legoErr) {
        return res.status(500).json({ error: legoErr.message });
      }

      // Filter to M-LEGOs that need components:
      // - null components
      // - empty array []
      // - if include_partial: single-component M-LEGOs with multi-word known_text
      const filtered = (allMLegos || []).filter(l => {
        const comps = l.components;
        const isNull = comps === null || comps === undefined;
        const isEmpty = Array.isArray(comps) && comps.length === 0;
        const isPartial = includePartial && Array.isArray(comps) && comps.length === 1 &&
          (l.known_text || '').trim().split(/\s+/).length >= 2;

        if (!isNull && !isEmpty && !isPartial) return false;

        // Multi-word filter: known_text must have ≥2 words
        const knownWords = (l.known_text || '').trim().split(/\s+/).length;
        if (knownWords < 2) return false;
        if (!cjk) {
          const targetWords = (l.target_text || '').trim().split(/\s+/).length;
          if (targetWords < 2) return false;
        }
        return true;
      });

      const totalGaps = filtered.length;
      const page = filtered.slice(offset, offset + limit);

      // Collect seed numbers we need context for
      const seedNumbers = [...new Set(page.map(l => l.seed_number))];

      // Fetch seed sentences for context
      const { data: seeds } = await ctx.supabase
        .from('course_seeds')
        .select('seed_number, known_text, target_text')
        .eq('course_code', courseCode)
        .in('seed_number', seedNumbers);

      const seedMap = new Map((seeds || []).map(s => [s.seed_number, s]));

      const gaps = page.map(l => {
        const seed = seedMap.get(l.seed_number) || {};
        return {
          seed_number: l.seed_number,
          lego_index: l.lego_index,
          known_text: l.known_text,
          target_text: l.target_text,
          seed_known: seed.known_text || null,
          seed_target: seed.target_text || null,
        };
      });

      return res.json({
        course_code: courseCode,
        total_gaps: totalGaps,
        returned: gaps.length,
        offset,
        gaps,
      });
    } catch (err) {
      console.error('[Components] gaps error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── POST backfill ──────────────────────────────────────────────────

  router.post('/course/:courseCode/components/backfill', async (req, res) => {
    const { courseCode } = req.params;
    const { legos } = req.body || {};

    if (!Array.isArray(legos) || legos.length === 0) {
      return res.status(400).json({ error: 'Request body must include a non-empty "legos" array' });
    }

    const results = [];
    const errors = [];

    for (const item of legos) {
      const { seed_number, lego_index, components } = item;
      const label = `S${seed_number}L${lego_index}`;

      try {
        if (!Array.isArray(components) || components.length === 0) {
          throw new Error('components must be a non-empty array');
        }

        // 1. Fetch existing LEGO row — verify exists, has no components
        const { data: lego, error: legoErr } = await ctx.supabase
          .from('course_legos')
          .select('*')
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number)
          .eq('lego_index', lego_index)
          .single();

        if (legoErr || !lego) {
          throw new Error(`LEGO ${label} not found`);
        }
        if (lego.components && Array.isArray(lego.components) && lego.components.length > 0) {
          // Allow overwrite via ?force=true query param
          if (!req.query.force) {
            throw new Error(`LEGO ${label} already has components (use ?force=true to overwrite)`);
          }
        }

        // 2. Fetch existing practice phrases for this LEGO (sorted by position)
        const { data: existingPhrases, error: phraseErr } = await ctx.supabase
          .from('course_practice_phrases')
          .select('*')
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number)
          .eq('lego_index', lego_index)
          .order('position');

        if (phraseErr) {
          throw new Error(`Failed to fetch phrases for ${label}: ${phraseErr.message}`);
        }

        // 3. Delete all existing phrase rows for this LEGO
        const { error: delErr } = await ctx.supabase
          .from('course_practice_phrases')
          .delete()
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number)
          .eq('lego_index', lego_index);

        if (delErr) {
          throw new Error(`Failed to delete phrases for ${label}: ${delErr.message}`);
        }

        // 4. Update course_legos.components JSONB
        const { error: updateErr } = await ctx.supabase
          .from('course_legos')
          .update({ components })
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number)
          .eq('lego_index', lego_index);

        if (updateErr) {
          throw new Error(`Failed to update components for ${label}: ${updateErr.message}`);
        }

        // 5. Generate buildup phrases (C01, C02... + B01 debut)
        const legoObj = {
          seed: seed_number,
          idx: lego_index,
          known: lego.known_text,
          target: lego.target_text,
          target_roman: lego.target_text_roman || null,
          components,
        };
        const { buildupPhrases, roleCounts } = generateBuildupPhrases(legoObj, courseCode);

        // Add required timestamps to buildup phrases
        const now = new Date().toISOString();
        for (const bp of buildupPhrases) {
          bp.created_at = now;
          bp.updated_at = now;
        }

        // 6. Re-insert old practice phrases with shifted positions and regenerated IDs
        //    Skip the old B01 (lego debut) — it's now regenerated by generateBuildupPhrases
        const oldNonDebut = (existingPhrases || []).filter(p => {
          // The old debut phrase has metadata.buildup === 'lego' or is position 1 with role 'build'
          if (p.metadata && p.metadata.buildup === 'lego') return false;
          // Also skip any old component rows (shouldn't exist, but just in case)
          if (p.phrase_role === 'component') return false;
          return true;
        });

        const shiftedPhrases = oldNonDebut.map((p, i) => {
          // Determine role for the shifted phrase
          const role = p.phrase_role || 'build';
          if (role === 'build') roleCounts.build++;
          else if (role === 'use') roleCounts.use++;

          const newId = makePhraseId(courseCode, seed_number, lego_index, role,
            role === 'build' ? roleCounts.build : roleCounts.use);

          return {
            ...p,
            id: newId,
            position: buildupPhrases.length + i + 1,
            updated_at: now,
            // Audio is keyed by phrase ID — clear stale references
            known_audio_id: null,
            target1_audio_id: null,
            target2_audio_id: null,
            target1_duration_ms: null,
            target2_duration_ms: null,
          };
        });

        // 7. Upsert all phrase rows in one batch
        const allPhrases = [...buildupPhrases, ...shiftedPhrases];

        if (allPhrases.length > 0) {
          const { error: insertErr } = await ctx.supabase
            .from('course_practice_phrases')
            .upsert(allPhrases, { onConflict: 'id' });

          if (insertErr) {
            throw new Error(`Failed to insert phrases for ${label}: ${insertErr.message}`);
          }
        }

        results.push({
          lego: label,
          components_added: components.length,
          buildup_phrases: buildupPhrases.length,
          shifted_phrases: shiftedPhrases.length,
          total_phrases: allPhrases.length,
        });
      } catch (err) {
        errors.push({ lego: label, error: err.message });
      }
    }

    // Bump version + invalidate cache after batch
    if (results.length > 0) {
      await bumpCourseVersion(ctx.supabase, courseCode, 'patch');
      invalidateVocabCache(ctx, courseCode);
    }

    return res.json({
      course_code: courseCode,
      processed: results.length,
      failed: errors.length,
      results,
      errors,
    });
  });

  return router;
};

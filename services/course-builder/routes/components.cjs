/**
 * M-LEGO component backfill routes.
 *
 * GET  /course/:courseCode/components/gaps     — M-LEGOs missing components
 * POST /course/:courseCode/components/backfill — Write components JSONB + component phrases only
 *
 * Factory: receives ctx ({ supabase, config }).
 */

const { Router } = require('express');
const { isChinese } = require('../lib/language-config.cjs');
const { getMeaningfulComponents, makePhraseId, computeLegoPosition } = require('../lib/phrase-structure.cjs');
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
          (l.known_text || '').trim().split(/\s+/).length >= 2 &&
          !(l.target_text || '').trim().includes((comps[0].target || '').trim());

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

        // Verify LEGO exists
        const { data: lego, error: legoErr } = await ctx.supabase
          .from('course_legos')
          .select('seed_number, lego_index, known_text, target_text, components')
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number)
          .eq('lego_index', lego_index)
          .single();

        if (legoErr || !lego) {
          throw new Error(`LEGO ${label} not found`);
        }
        if (lego.components && Array.isArray(lego.components) && lego.components.length > 0) {
          if (!req.query.force) {
            throw new Error(`LEGO ${label} already has components (use ?force=true to overwrite)`);
          }
        }

        // 1. Update the components JSONB
        const { error: updateErr } = await ctx.supabase
          .from('course_legos')
          .update({ components })
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number)
          .eq('lego_index', lego_index);

        if (updateErr) {
          throw new Error(`Failed to update components for ${label}: ${updateErr.message}`);
        }

        // 2. Delete ONLY existing component phrases — never touch build/use
        const { error: delErr } = await ctx.supabase
          .from('course_practice_phrases')
          .delete()
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number)
          .eq('lego_index', lego_index)
          .eq('phrase_role', 'component');

        if (delErr) {
          throw new Error(`Failed to delete old component phrases for ${label}: ${delErr.message}`);
        }

        // 3. Create new component phrase rows
        const meaningful = getMeaningfulComponents(components, lego.target_text);
        const componentCount = meaningful.length;

        // 3a. Shift existing build/use phrases to make room for components.
        // Components occupy positions 1..N. LEGO debut (B01) should be at N+1.
        // Remaining build/use phrases follow at N+2, N+3, ...
        // This runs even when componentCount is 0 (a ?force=true call that MERGES
        // components away): the old component rows have just been deleted, so
        // without the renormalisation build/use would keep their old positions and
        // leave positions 1..oldCount empty. Harmless to ordering, but it makes a
        // merged LEGO's phrase run start at 3 while every other LEGO starts at 1.
        {
          // Fetch existing build/use phrases ordered by position
          const { data: existingPhrases, error: fetchErr } = await ctx.supabase
            .from('course_practice_phrases')
            .select('id, position')
            .eq('course_code', courseCode)
            .eq('seed_number', seed_number)
            .eq('lego_index', lego_index)
            .in('phrase_role', ['build', 'use'])
            .order('position');

          if (fetchErr) {
            throw new Error(`Failed to fetch existing phrases for ${label}: ${fetchErr.message}`);
          }

          if (existingPhrases && existingPhrases.length > 0) {
            // Assign new positions: first build/use gets componentCount+1, next gets componentCount+2, etc.
            // Use a large temporary offset to avoid intermediate collisions, then set final positions.
            const tempOffset = 10000;
            for (const p of existingPhrases) {
              const { error: shiftErr } = await ctx.supabase
                .from('course_practice_phrases')
                .update({ position: p.position + tempOffset })
                .eq('id', p.id);
              if (shiftErr) {
                throw new Error(`Failed to shift phrase ${p.id} for ${label}: ${shiftErr.message}`);
              }
            }
            // Now set final positions
            for (let i = 0; i < existingPhrases.length; i++) {
              const { error: finalErr } = await ctx.supabase
                .from('course_practice_phrases')
                .update({ position: componentCount + 1 + i })
                .eq('id', existingPhrases[i].id);
              if (finalErr) {
                throw new Error(`Failed to finalize position for ${existingPhrases[i].id}: ${finalErr.message}`);
              }
            }
          }
        }

        const now = new Date().toISOString();
        const componentPhrases = meaningful.map((comp, i) => ({
          id: makePhraseId(courseCode, seed_number, lego_index, 'component', i + 1),
          course_code: courseCode,
          seed_number,
          lego_index,
          position: i + 1,
          known_text: comp.known,
          target_text: comp.target,
          target_text_roman: comp.target_roman || null,
          word_count: comp.target.length,
          lego_count: 1,
          phrase_role: 'component',
          introduce: comp.introduce !== false,
          connected_lego_ids: [],
          lego_position: computeLegoPosition(comp.target, comp.target),
          metadata: { buildup: 'component', component_index: i },
          status: 'draft',
          version: 1,
          created_at: now,
          updated_at: now,
        }));

        if (componentPhrases.length > 0) {
          const { error: insertErr } = await ctx.supabase
            .from('course_practice_phrases')
            .upsert(componentPhrases, { onConflict: 'id' });

          if (insertErr) {
            throw new Error(`Failed to insert component phrases for ${label}: ${insertErr.message}`);
          }
        }

        results.push({
          lego: label,
          components_set: components.length,
          component_phrases: componentPhrases.length,
        });
      } catch (err) {
        errors.push({ lego: label, error: err.message });
      }
    }

    if (results.length > 0) {
      await bumpCourseVersion(ctx.supabase, courseCode, 'patch');
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

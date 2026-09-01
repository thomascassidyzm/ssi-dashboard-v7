/**
 * Seed translation route — lightweight path for courses where target content already exists.
 *
 * POST /api/seed/translate  — Provide known-language translations for existing target LEGOs + phrases
 *
 * Used when canonical target_legos + target_phrases already exist for a target language,
 * so the agent only needs to provide known-language translations (no decomposition needed).
 */

const { Router } = require('express');
const { getTargetLang, isChinese, checkLegoSyllables } = require('../lib/language-config.cjs');
const { normalizeForContainment, stripBookendPunctuation } = require('../lib/text-normalization.cjs');
const { makePhraseId, computeLegoPosition } = require('../lib/phrase-structure.cjs');
const { checkLegoConflict } = require('../lib/validation.cjs');
const { courseFamily } = require('../lib/course-family.cjs');   // sector-helix §5b: ZUT is family-wide
const { recordActivity } = require('../lib/activity-tracker.cjs');
const { bumpCourseVersion } = require('../../shared/course-version.cjs');

module.exports = function createSeedTranslateRoutes(ctx) {
  const router = Router();

  router.post('/seed/translate', async (req, res) => {
    try {
      const course_code = req.query.course || req.query.course_code || req.body.course_code;
      if (!course_code) {
        return res.status(400).json({ error: 'course_code required (query param or body)' });
      }

      const { seed_number, known_text, lego_translations, phrase_translations } = req.body;

      if (!seed_number || !known_text || !lego_translations || !phrase_translations) {
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['seed_number', 'known_text', 'lego_translations', 'phrase_translations'],
        });
      }

      const targetLang = getTargetLang(course_code);
      const seedId = `S${String(seed_number).padStart(4, '0')}`;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`SEED TRANSLATE: ${seedId} (${course_code})`);
      console.log(`  known: "${known_text}"`);
      console.log(`${'='.repeat(60)}`);

      // ── Verify target LEGOs exist ──
      const { data: targetLegos, error: tlError } = await ctx.supabase
        .from('target_legos')
        .select('id, lego_index, type, target_text, components')
        .eq('target_lang', targetLang)
        .eq('seed_number', seed_number)
        .order('lego_index');

      if (tlError) throw new Error(`target_legos lookup failed: ${tlError.message}`);
      if (!targetLegos || targetLegos.length === 0) {
        return res.status(400).json({
          error: 'No canonical target LEGOs found for this seed',
          target_lang: targetLang,
          seed_number,
          hint: 'Target LEGOs must be created first (via /api/seed/complete on the first course for this target language, or batch import).',
        });
      }

      // Build lookup maps
      const targetLegoMap = new Map(targetLegos.map(tl => [tl.id, tl]));
      const legoTransMap = new Map(lego_translations.map(lt => [lt.target_lego_id, lt]));
      const phraseTransMap = new Map(phrase_translations.map(pt => [pt.target_phrase_id, pt]));

      // Verify all target LEGOs have translations
      const missingLegoTranslations = targetLegos.filter(tl => !legoTransMap.has(tl.id));
      if (missingLegoTranslations.length > 0) {
        return res.status(400).json({
          error: 'Missing translations for target LEGOs',
          missing: missingLegoTranslations.map(tl => ({ id: tl.id, target_text: tl.target_text })),
          hint: 'Every target LEGO must have a known-language translation in lego_translations[].',
        });
      }

      // ── Verify target phrases exist ──
      const { data: targetPhrases, error: tpError } = await ctx.supabase
        .from('target_phrases')
        .select('id, lego_index, position, target_text, phrase_role, word_count, connected_lego_ids, lego_position, metadata')
        .eq('target_lang', targetLang)
        .eq('seed_number', seed_number)
        .order('lego_index')
        .order('position');

      if (tpError) throw new Error(`target_phrases lookup failed: ${tpError.message}`);

      // Not all phrases need translations (components/buildup are auto-derived), but check user-provided ones exist
      const unknownPhraseIds = phrase_translations
        .filter(pt => !targetPhrases.find(tp => tp.id === pt.target_phrase_id))
        .map(pt => pt.target_phrase_id);

      if (unknownPhraseIds.length > 0) {
        return res.status(400).json({
          error: 'Unknown target_phrase_ids',
          unknown: unknownPhraseIds.slice(0, 10),
          hint: 'These phrase IDs do not exist in target_phrases for this seed.',
        });
      }

      // ── ZUT validation on known side ──
      const zutViolations = [];
      for (const lt of lego_translations) {
        const targetLego = targetLegoMap.get(lt.target_lego_id);
        if (!targetLego) continue;

        const conflictResult = await checkLegoConflict(
          ctx.supabase, course_code, lt.known_text, targetLego.target_text, seed_number,
          { family: await courseFamily(ctx.supabase, course_code) }
        );

        if (conflictResult.conflict === 'zut') {
          zutViolations.push({
            target_lego_id: lt.target_lego_id,
            known: lt.known_text,
            target: targetLego.target_text,
            existing: conflictResult.existing,
            suggestions: conflictResult.suggestions,
          });
        }
      }

      if (zutViolations.length > 0) {
        return res.status(400).json({
          error: 'ZUT violations on known-language side',
          violations: zutViolations,
          hint: 'Same known text maps to different targets. Upchunk or use synonyms.',
        });
      }

      // ── Get canonical seed text ──
      const { data: targetSeedText } = await ctx.supabase
        .from('target_seed_texts')
        .select('target_text')
        .eq('target_lang', targetLang)
        .eq('seed_number', seed_number)
        .single();

      const target_text = targetSeedText?.target_text;
      if (!target_text) {
        return res.status(400).json({
          error: 'No canonical target seed text found',
          target_lang: targetLang,
          seed_number,
          hint: 'target_seed_texts must be populated for this language/seed.',
        });
      }

      // ── INSERT PHASE ──

      // One event for the seed's whole translation — seed, legos and phrases carry its id.
      const eventId = req.contentEdit
        ? await req.contentEdit.record({
            scope: {
              seed_numbers: [seed_number],
              lego_ids: targetLegos.map(tl => `${seedId}L${String(tl.lego_index).padStart(2, '0')}`),
            },
          })
        : null;

      // 1. Upsert course_seeds
      const { error: seedError } = await ctx.supabase
        .from('course_seeds')
        .upsert({
          course_code,
          seed_number,
          known_text,
          target_text,
          status: 'released',
          decomposed_at: new Date().toISOString(),
          version: 1,
          last_edit_event_id: eventId,
        }, { onConflict: 'course_code,seed_number' });

      if (seedError) throw new Error(`Seed insert failed: ${seedError.message}`);

      // 2. Insert course_legos (with target_lego_id FK)
      let totalPhrases = 0;
      const duplicateLegos = [];

      for (const targetLego of targetLegos) {
        const lt = legoTransMap.get(targetLego.id);
        const knownText = lt.known_text;

        // Check for duplicates
        const conflictResult = await checkLegoConflict(
          ctx.supabase, course_code, knownText, targetLego.target_text, seed_number,
          { family: await courseFamily(ctx.supabase, course_code) }
        );
        const isDuplicate = conflictResult.conflict === 'duplicate';
        if (isDuplicate) {
          duplicateLegos.push(targetLego.id);
        }

        // Translate components if M-type. Match each component to its
        // translation BY TARGET TEXT, never by array index: the translator
        // returns entries keyed to the target chunk they gloss, and nothing
        // guarantees it preserves the source array's order. Index-pasting
        // silently inverts every pair where the two orders disagree — which
        // is precisely what a word-order-divergent pair does. The phrase-row
        // path 30 lines below already matches by target_text; this is the
        // same lookup.
        //
        // Fallback when no translation matches: leave `known` as the source
        // course's gloss rather than substituting the TARGET string, which
        // would put target-language text in the known-language field.
        let components = targetLego.components;
        if (components && lt.component_translations) {
          components = components.map((comp) => {
            const match = lt.component_translations.find(
              (c) => c?.target_text === comp.target
            );
            return match?.known_text ? { ...comp, known: match.known_text } : { ...comp };
          });
        }

        const { error: legoError } = await ctx.supabase
          .from('course_legos')
          .upsert({
            course_code,
            seed_number,
            lego_index: targetLego.lego_index,
            type: targetLego.type,
            is_new: !isDuplicate,
            known_text: knownText,
            target_text: targetLego.target_text,
            components,
            target_lego_id: targetLego.id,
            status: 'draft',
            version: 1,
            last_edit_event_id: eventId,
          }, { onConflict: 'course_code,seed_number,lego_index' });

        if (legoError) throw new Error(`LEGO insert failed: ${legoError.message}`);

        // 3. Insert course_practice_phrases (with target_phrase_id FK)
        if (!isDuplicate) {
          const legoPhrases = targetPhrases.filter(tp => tp.lego_index === targetLego.lego_index);
          const phraseRows = [];

          for (const tp of legoPhrases) {
            const pt = phraseTransMap.get(tp.id);
            // For component/buildup phrases, derive known_text from LEGO translation
            const phraseKnown = pt?.known_text ||
              (tp.phrase_role === 'component' ? (lt.component_translations?.find(c => c.target_text === tp.target_text)?.known_text || tp.target_text) : knownText);

            phraseRows.push({
              id: makePhraseId(course_code, seed_number, targetLego.lego_index, tp.phrase_role,
                legoPhrases.filter(p => p.phrase_role === tp.phrase_role && p.position <= tp.position).length),
              course_code,
              seed_number,
              lego_index: targetLego.lego_index,
              position: tp.position,
              known_text: phraseKnown,
              target_text: tp.target_text,
              word_count: tp.word_count,
              phrase_role: tp.phrase_role,
              connected_lego_ids: tp.connected_lego_ids || [],
              lego_position: tp.lego_position,
              metadata: tp.metadata || {},
              target_phrase_id: tp.id,
              status: 'draft',
              version: 1,
              last_edit_event_id: eventId,
            });
          }

          if (phraseRows.length > 0) {
            const { error: phraseError } = await ctx.supabase
              .from('course_practice_phrases')
              .upsert(phraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });
            if (phraseError) throw new Error(`Phrase insert failed: ${phraseError.message}`);
            totalPhrases += phraseRows.length;
          }
        }

        const legoId = `${seedId}L${String(targetLego.lego_index).padStart(2, '0')}`;
        const dupInfo = isDuplicate ? ' (duplicate, no phrases)' : '';
        console.log(`  ${legoId}: ${knownText} → ${targetLego.target_text}${dupInfo}`);
      }

      console.log(`\n✓ ${seedId} TRANSLATED`);
      console.log(`  LEGOs: ${targetLegos.length} (${duplicateLegos.length} duplicates)`);
      console.log(`  Phrases: ${totalPhrases}`);
      console.log(`${'='.repeat(60)}\n`);

      ctx.emitPipelineEvent(course_code, 'seed:complete', {
        seed_number, legos_count: targetLegos.length, phrases_count: totalPhrases,
      });

      await bumpCourseVersion(ctx.supabase, course_code, 'minor');

      // Find next incomplete seed
      const { data: allSeeds } = await ctx.supabase
        .from('course_seeds')
        .select('seed_number, known_text, decomposed_at')
        .eq('course_code', course_code)
        .gt('seed_number', seed_number)
        .order('seed_number')
        .limit(5);

      const nextSeed = allSeeds?.find(s => !s.decomposed_at);

      res.json({
        ok: true,
        seed: seedId,
        status: 'TRANSLATED',
        action: 'PROCEED TO NEXT SEED',
        known_text,
        target_text,
        legos: targetLegos.length,
        duplicates_skipped: duplicateLegos.length,
        phrases: totalPhrases,
        next_seed: nextSeed ? {
          instruction: 'TRANSLATE THIS SEED NOW',
          seed_number: nextSeed.seed_number,
          known_text: nextSeed.known_text,
        } : {
          instruction: 'ALL SEEDS COMPLETE',
        },
      });

    } catch (err) {
      console.error('Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};

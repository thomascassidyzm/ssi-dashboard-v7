/**
 * Edit Cascade — safe scoped re-translation of a seed (edit-cascade Delta B).
 *
 * Use case (from Tom, 2026-06-21): a seed's TARGET-language translation isn't
 * quite right. We revise ONLY the target text — the canonical/known side never
 * changes — which necessarily means a fresh LEGO breakdown for that seed, fresh
 * phrases, fresh intros, and fresh audio for the changed items. Everything is
 * scoped to the edited seed; we never rebuild the whole course.
 *
 * Guiding model (see docs/specs/edit-cascade-spec.md):
 *   - Case 1 (vocab-preserving): the new breakdown contributes the same vocab
 *     units (LEGO targets + M-components) as the old one. Downstream phrases that
 *     tiled before still tile → blast radius = the edited seed only.
 *   - Case 2 (vocab-changing): a vocab unit was added/removed/altered → some
 *     downstream phrases may no longer tile. Blast radius = edited seed + the
 *     downstream phrases the scoped sweep (/v2/validate fromSeed) flags.
 *
 * Flow:
 *   1. snapshot the seed's current target/decomposed_at + LEGOs + phrases
 *   2. discriminate Case 1 vs Case 2 from old-vs-new vocab contribution
 *   3. update target_text (keep known_text), reset decomposed_at, delete old
 *      LEGOs/phrases (deleting drops the audio pointers → new rows are null-audio)
 *   4. re-insert the new breakdown via the existing /seed/complete gate path
 *      (atomic; on failure we ROLL BACK to the snapshot — a bad edit must never
 *      destroy the existing decomposition)
 *   5. regenerate intros + the now-missing audio, scoped to this seed only
 *   6. scoped re-validation → blast-radius report
 *
 * Route: POST /course/:courseCode/edit-cascade (mounted under /api).
 */

const { Router } = require('express');

const { isChinese } = require('../lib/language-config.cjs');
const { extractVocab } = require('../lib/text-normalization.cjs');

const SELF_URL = process.env.COURSE_BUILDER_SELF_URL
  || `http://localhost:${process.env.COURSE_BUILDER_PORT || 3471}`;
const PHASE8_URL = process.env.PHASE8_URL || 'http://localhost:3465';

// Vocab units a seed contributes: each LEGO target + every M-LEGO component
// target, normalized exactly as the validator does (extractVocab). Returned as a
// Set so Case 1/2 is a pure set-equality test.
function computeSeedVocab(legos, chinese) {
  const set = new Set();
  for (const l of legos || []) {
    const target = l.target_text || l.target;
    if (target) extractVocab(target, chinese).forEach(v => set.add(v));
    const type = l.type;
    const components = l.components;
    if (type === 'M' && Array.isArray(components)) {
      for (const c of components) {
        const ct = c.target || c.target_text;
        if (ct) extractVocab(ct, chinese).forEach(v => set.add(v));
      }
    }
  }
  return set;
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

// Map a proposed breakdown (the /seed/complete lego shape, with build/use or
// phrases) into the in-memory `override` the /v2/validate sweep accepts, so a dry
// run can validate the simulated post-edit state without touching the DB.
function buildValidateOverride(seedNumber, newTarget, knownText, legos) {
  const ovLegos = [];
  const phrases = {};
  for (let i = 0; i < legos.length; i++) {
    const l = legos[i];
    const idx = l.idx || l.lego_index || i + 1;
    ovLegos.push({
      lego_index: idx,
      known_text: l.known_text || l.known,
      target_text: l.target_text || l.target,
      type: l.type,
      components: l.components || null,
      is_new: true,
    });
    // Collect this lego's build/use (or legacy phrases[]) as validate-shape rows.
    const buildArr = l.build || [];
    const useArr = l.use || [];
    const legacy = (!l.build && !l.use && Array.isArray(l.phrases)) ? l.phrases : [];
    const rows = [
      ...buildArr.map(p => ({ phrase_role: 'build', known_text: p.known_text || p.known, target_text: p.target_text || p.target })),
      ...useArr.map(p => ({ phrase_role: 'use', known_text: p.known_text || p.known, target_text: p.target_text || p.target })),
      ...legacy.map(p => ({ phrase_role: 'build', known_text: p.known_text || p.known, target_text: p.target_text || p.target })),
    ];
    if (rows.length) phrases[`${seedNumber}:${idx}`] = rows;
  }
  return { seed_number: Number(seedNumber), target_text: newTarget, known_text: knownText, legos: ovLegos, phrases };
}

// A lower-bound estimate of the audio that the cascade would (re)generate for the
// edited seed: 3 voice clips (known/target1/target2) per provided phrase, plus one
// presentation per LEGO. The real number is slightly higher (M-LEGO build-up
// phrases are auto-generated), hence "≈".
function estimateAudio(legos) {
  let phraseCount = 0;
  for (const l of legos) {
    phraseCount += (l.build?.length || 0) + (l.use?.length || 0)
      + ((!l.build && !l.use && Array.isArray(l.phrases)) ? l.phrases.length : 0);
  }
  return {
    legos: legos.length,
    phrasesProvided: phraseCount,
    approxClips: phraseCount * 3 + legos.length,
    note: '≈ 3 clips/phrase (known/target1/target2) + 1 presentation/LEGO; M-LEGO build-up adds a few more.',
  };
}

async function postJson(url, body, { timeoutMs = 600000, headers = {} } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let json = null;
    try { json = await resp.json(); } catch { /* non-JSON body */ }
    return { ok: resp.ok, status: resp.status, json };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = function(ctx) {
  const router = Router();

  router.post('/course/:courseCode/edit-cascade', async (req, res) => {
    const courseCode = req.params.courseCode;
    const chinese = isChinese(courseCode);
    const {
      seed_number,
      target_text: newTarget,
      legos,
      autoDecompose = false,
      generateAudio = true,
      dryRun = false,
    } = req.body || {};

    if (!seed_number) {
      return res.status(400).json({ error: 'seed_number is required' });
    }
    if (!newTarget || !String(newTarget).trim()) {
      return res.status(400).json({ error: 'target_text (the revised translation) is required' });
    }

    try {
      // ── Load the canonical seed (known side is immutable here) ─────────────
      const { data: seed, error: seedErr } = await ctx.supabase
        .from('course_seeds')
        .select('seed_number, known_text, target_text, decomposed_at')
        .eq('course_code', courseCode)
        .eq('seed_number', seed_number)
        .single();

      if (seedErr || !seed) {
        return res.status(404).json({ error: `Seed ${seed_number} not found for ${courseCode}` });
      }

      // ── Auto-decompose path: caller wants the pipeline to produce the new ──
      // breakdown. We update the target and hand back a re-decomposition brief;
      // an agent (or the editor) then resubmits to this endpoint WITH `legos`.
      // (We deliberately do NOT delete the old decomposition until a valid new
      // breakdown is in hand, so the seed is never left broken.)
      if (!Array.isArray(legos) || legos.length === 0) {
        if (!autoDecompose) {
          return res.status(400).json({
            error: 'Provide `legos` (a ready breakdown) or set `autoDecompose: true`.',
            hint: 'A new target text needs a new LEGO breakdown. Supply it, or request a brief.',
          });
        }
        // Dry run on the auto-decompose path: report intent without mutating.
        if (dryRun) {
          return res.json({
            ok: true,
            mode: 'dry-run',
            sub_mode: 'auto-decompose',
            seed_number,
            target_updated: false,
            message: `DRY RUN — would set target to "${newTarget}" and request a re-decomposition `
              + `(known side unchanged: "${seed.known_text}"). No write performed.`,
          });
        }
        // The target-only half of the edit is still an edit: attribute it before
        // the write, and stamp the seed row with the event it belongs to.
        const briefEventId = req.contentEdit
          ? await req.contentEdit.record({
            scope: { seed_numbers: [Number(seed_number)] },
            detail: { before: { target_text: seed.target_text }, after: { target_text: newTarget } },
          })
          : null;

        await ctx.supabase
          .from('course_seeds')
          .update({ target_text: newTarget, last_edit_event_id: briefEventId })
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number);

        return res.json({
          ok: true,
          mode: 'auto-decompose',
          seed_number,
          target_updated: true,
          next_action: 'decompose',
          message: `Target updated. Re-decompose seed ${seed_number} ("${newTarget}") into LEGOs + phrases `
            + `(known side unchanged: "${seed.known_text}") and resubmit to `
            + `POST /api/course/${courseCode}/edit-cascade with the new \`legos\`.`,
          seed: { seed_number, known_text: seed.known_text, target_text: newTarget },
        });
      }

      // ── Snapshot the current state (for rollback + Case 1/2 discrimination) ─
      const [{ data: oldLegos }, { data: oldPhrases }] = await Promise.all([
        ctx.supabase.from('course_legos').select('*').eq('course_code', courseCode).eq('seed_number', seed_number),
        ctx.supabase.from('course_practice_phrases').select('*').eq('course_code', courseCode).eq('seed_number', seed_number),
      ]);

      const oldVocab = computeSeedVocab(oldLegos || [], chinese);
      const newVocab = computeSeedVocab(legos, chinese);
      const vocabPreserving = setsEqual(oldVocab, newVocab);
      const editCase = vocabPreserving ? 'vocab-preserving' : 'vocab-changing';

      // ── Dry run: report the full plan with ZERO mutation and ZERO TTS ──────
      // Validates a simulated post-edit state via the /v2/validate `override`, so
      // the downstream blast radius is exact without writing anything.
      if (dryRun) {
        const removed = [...oldVocab].filter(v => !newVocab.has(v));
        const added = [...newVocab].filter(v => !oldVocab.has(v));

        const override = buildValidateOverride(seed_number, newTarget, seed.known_text, legos);
        const validation = await postJson(`${SELF_URL}/api/v2/validate/${courseCode}`, {
          fromSeed: Number(seed_number),
          override,
        });

        let failures = (validation.ok && validation.json?.failures) || [];
        if (vocabPreserving) failures = failures.filter(f => f.seed === Number(seed_number));

        return res.json({
          ok: true,
          mode: 'dry-run',
          seed_number,
          case: editCase,
          vocabDelta: { added, removed, unchanged: removed.length === 0 && added.length === 0 },
          wouldDelete: { legos: (oldLegos || []).length, phrases: (oldPhrases || []).length },
          wouldGenerateAudio: generateAudio ? estimateAudio(legos) : { skipped: true },
          blastRadius: {
            fromSeed: Number(seed_number),
            failures,
            downstreamAffected: failures.some(f => f.seed !== Number(seed_number)),
            note: validation.ok
              ? (vocabPreserving
                ? 'Case 1 (vocab-preserving): downstream provably unaffected; only the edited seed simulated.'
                : 'Case 2 (vocab-changing): includes downstream phrases that would no longer tile.')
              : `Validation sweep unavailable (status ${validation.status}).`,
          },
          message: `DRY RUN — nothing changed. ${editCase}; would delete ${(oldLegos || []).length} LEGO(s)/${(oldPhrases || []).length} phrase(s) and regenerate audio for the new breakdown. `
            + `${failures.length ? `${failures.length} seed(s) would need attention.` : 'No downstream breakage predicted.'}`,
        });
      }

      const snapshot = {
        target_text: seed.target_text,
        decomposed_at: seed.decomposed_at,
        legos: oldLegos || [],
        phrases: oldPhrases || [],
      };

      // ── Restore helper (best-effort transactional rollback) ────────────────
      const restore = async () => {
        await ctx.supabase.from('course_practice_phrases').delete().eq('course_code', courseCode).eq('seed_number', seed_number);
        await ctx.supabase.from('course_legos').delete().eq('course_code', courseCode).eq('seed_number', seed_number);
        if (snapshot.legos.length) await ctx.supabase.from('course_legos').insert(snapshot.legos);
        if (snapshot.phrases.length) await ctx.supabase.from('course_practice_phrases').insert(snapshot.phrases);
        await ctx.supabase
          .from('course_seeds')
          .update({ target_text: snapshot.target_text, decomposed_at: snapshot.decomposed_at })
          .eq('course_code', courseCode)
          .eq('seed_number', seed_number);
      };

      // ── Apply: new target, clear decomposition, delete old LEGOs/phrases ───
      // Deleting drops the audio_id pointers, so the re-inserted rows are
      // null-audio and the audio step below picks them up (spec §2d).
      // Attribute the whole cascade — seed, the LEGOs/phrases it destroys, and the
      // re-inserted breakdown — to one event, recorded before the first write.
      const eventId = req.contentEdit
        ? await req.contentEdit.record({
          scope: {
            seed_numbers: [Number(seed_number)],
            lego_ids: (oldLegos || []).map(l => l.lego_id).filter(Boolean),
            phrase_ids: (oldPhrases || []).map(p => p.id).filter(Boolean),
          },
          detail: { before: { target_text: seed.target_text }, after: { target_text: newTarget } },
        })
        : null;

      const { error: updErr } = await ctx.supabase
        .from('course_seeds')
        .update({ target_text: newTarget, decomposed_at: null, last_edit_event_id: eventId })
        .eq('course_code', courseCode)
        .eq('seed_number', seed_number);
      if (updErr) throw new Error(`Failed to update seed target: ${updErr.message}`);

      await ctx.supabase.from('course_practice_phrases').delete().eq('course_code', courseCode).eq('seed_number', seed_number);
      await ctx.supabase.from('course_legos').delete().eq('course_code', courseCode).eq('seed_number', seed_number);

      // ── Re-insert the new breakdown through the existing gate path ──────────
      // /seed/complete runs tiling/ZUT/vocab/count gates atomically, assigns
      // deterministic phrase IDs, builds M-LEGO build-ups, and sets decomposed_at.
      // The inner hop is itself a gated content write. Forward the caller's own
      // bearer token so a human proofreader's re-insert attributes to them, not to
      // an anonymous loopback caller; x-service-name is the fallback for agent
      // callers that arrive without one.
      const submit = await postJson(`${SELF_URL}/api/seed/complete`, {
        course_code: courseCode,
        seed_number,
        known_text: seed.known_text,   // canonical known side — unchanged
        target_text: newTarget,
        legos,
      }, {
        headers: {
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
          'x-service-name': 'edit-cascade',
          ...(eventId ? { 'x-content-edit-event': eventId } : {}),
        },
      });

      if (!submit.ok) {
        await restore();
        return res.status(422).json({
          error: 'New breakdown failed validation — original decomposition restored.',
          case: editCase,
          gate_errors: submit.json || { status: submit.status },
        });
      }

      // Guard: if a parallel build forced draft mode, /seed/complete won't have
      // populated course_legos. Detect that and roll back rather than leave the
      // seed empty.
      const { count: insertedLegoCount } = await ctx.supabase
        .from('course_legos')
        .select('*', { count: 'exact', head: true })
        .eq('course_code', courseCode)
        .eq('seed_number', seed_number);

      if (!insertedLegoCount) {
        await restore();
        return res.status(409).json({
          error: 'Breakdown was not committed (drafts may be in progress for this course) — original restored.',
          case: editCase,
          submit_result: submit.json,
        });
      }

      // ── Audio: regenerate intros + fill the now-missing audio, seed-scoped ──
      let audio = { generated: false };
      if (generateAudio) {
        audio = { generated: true, presentations: null, generate: null, errors: [] };

        // 1. Presentation text + audio for the new LEGOs. /regenerate-presentations
        //    only processes LEGOs MISSING presentation audio, so after re-insert
        //    that is exactly this seed's new LEGOs — naturally scoped.
        const pres = await postJson(`${PHASE8_URL}/regenerate-presentations/${courseCode}`, {
          dryRun: false,
          regenerateAudio: true,
        });
        audio.presentations = pres.ok ? pres.json : { error: pres.json || pres.status };
        if (!pres.ok) audio.errors.push('presentations');

        // 2. Known/target1/target2 missing audio, scoped to this seed.
        //    /generate only fills NULL-audio rows; seeds:[N] restricts to the edit.
        const gen = await postJson(`${PHASE8_URL}/generate/${courseCode}`, {
          seeds: [Number(seed_number)],
        });
        audio.generate = gen.ok ? gen.json : { error: gen.json || gen.status };
        if (!gen.ok) audio.errors.push('generate');
      }

      // ── Scoped re-validation → blast-radius report ─────────────────────────
      const validation = await postJson(`${SELF_URL}/api/v2/validate/${courseCode}`, {
        fromSeed: Number(seed_number),
      });
      let blastRadius = { fromSeed: Number(seed_number), failures: [], note: null };
      if (validation.ok && validation.json) {
        let failures = validation.json.failures || [];
        if (vocabPreserving) {
          // Case 1: downstream is provably unaffected by this edit, so any
          // downstream failures are pre-existing — report only the edited seed.
          failures = failures.filter(f => f.seed === Number(seed_number));
          blastRadius.note = 'Case 1 (vocab-preserving): downstream provably unaffected; only the edited seed is reported.';
        } else {
          blastRadius.note = 'Case 2 (vocab-changing): includes downstream phrases that may no longer tile.';
        }
        blastRadius.failures = failures;
        blastRadius.downstreamAffected = failures.some(f => f.seed !== Number(seed_number));
      } else {
        blastRadius.note = `Validation sweep unavailable (status ${validation.status}).`;
      }

      ctx.emitPipelineEvent?.(courseCode, 'edit-cascade', { seed_number, case: editCase });

      return res.json({
        ok: true,
        mode: 'cascade',
        seed_number,
        case: editCase,
        decomposition: { legos: submit.json?.legos ?? insertedLegoCount, result: submit.json },
        audio,
        blastRadius,
        message: `Seed ${seed_number} re-translated (${editCase}). `
          + `${blastRadius.failures.length ? `${blastRadius.failures.length} seed(s) need attention.` : 'No new validation failures.'}`,
      });

    } catch (err) {
      console.error('[edit-cascade] error:', err);
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
};

module.exports._test = { computeSeedVocab, setsEqual, buildValidateOverride, estimateAudio };

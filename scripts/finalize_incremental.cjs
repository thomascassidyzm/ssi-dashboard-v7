/**
 * Incremental finalization for jpn_for_eng
 * Processes drafts one seed at a time with retry logic.
 * Skips seeds that already have LEGOs+phrases in the DB.
 *
 * This replaces the bulk /finalize endpoint which keeps timing out.
 */
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSE = 'jpn_for_eng';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function normalizeForStorage(text) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function normalizeForZUT(text) {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function extractVocab(text, chinese = false) {
  if (chinese) return [...text].filter(c => c.trim());
  // Japanese: character-based
  return [...text].filter(c => c.trim() && c !== '、' && c !== '。' && c !== '？' && c !== '！');
}

function computeLegoPosition(phraseTarget, legoTarget) {
  if (!phraseTarget || !legoTarget) return null;
  const phrase = phraseTarget.trim();
  const lego = legoTarget.trim();
  const index = phrase.indexOf(lego);
  if (index === -1) return null;
  const phraseLength = phrase.length;
  const legoLength = lego.length;
  const legoEndIndex = index + legoLength;
  const startPercent = index / phraseLength;
  const endPercent = legoEndIndex / phraseLength;
  const centerPercent = (startPercent + endPercent) / 2;
  if (centerPercent < 0.33) return 'start';
  if (centerPercent > 0.67) return 'end';
  return 'middle';
}

function makePhraseId(courseCode, seedNum, legoIdx, role, roleSeq) {
  const roleChar = role === 'component' ? 'C' : role === 'build' ? 'B' : 'U';
  return `${courseCode}:S${String(seedNum).padStart(4, '0')}L${String(legoIdx).padStart(2, '0')}${roleChar}${String(roleSeq).padStart(2, '0')}`;
}

function usesBuildUseFormat(lego) {
  return (lego.build && lego.build.length > 0) || (lego.use && lego.use.length > 0);
}

function generateBuildupPhrases(lego, courseCode) {
  const phrases = [];
  let roleCounts = { component: 0, build: 0, use: 0 };

  if (!lego.components || lego.components.length === 0) {
    return { buildupPhrases: [], startPosition: 1, roleCounts };
  }

  // Component phrases
  for (const comp of lego.components) {
    roleCounts.component++;
    phrases.push({
      id: makePhraseId(courseCode, lego.seed, lego.idx, 'component', roleCounts.component),
      course_code: courseCode,
      seed_number: lego.seed,
      lego_index: lego.idx,
      position: phrases.length + 1,
      known_text: comp.known,
      target_text: comp.target,
      word_count: comp.target.length,
      lego_count: (comp.known.match(/\s+/g) || []).length + 1,
      phrase_role: 'component',
      connected_lego_ids: [],
      lego_position: computeLegoPosition(comp.target, lego.target),
      metadata: { format: 'build_use' },
      status: 'draft',
      version: 1
    });
  }

  // LEGO debut
  roleCounts.build++;
  phrases.push({
    id: makePhraseId(courseCode, lego.seed, lego.idx, 'build', roleCounts.build),
    course_code: courseCode,
    seed_number: lego.seed,
    lego_index: lego.idx,
    position: phrases.length + 1,
    known_text: lego.known,
    target_text: lego.target,
    word_count: lego.target.length,
    lego_count: (lego.known.match(/\s+/g) || []).length + 1,
    phrase_role: 'build',
    connected_lego_ids: [],
    lego_position: 'middle',
    metadata: { format: 'build_use', is_debut: true },
    status: 'draft',
    version: 1
  });

  return { buildupPhrases: phrases, startPosition: phrases.length + 1, roleCounts };
}

async function retryOp(fn, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      console.log(`    Retry ${attempt}/${MAX_RETRIES} for ${label}: ${err.message}`);
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
}

async function main() {
  console.log('=== Incremental Finalization ===');
  console.log(`Course: ${COURSE}\n`);

  // 1. Load all drafts
  const { data: drafts, error: draftErr } = await supabase
    .from('course_seed_drafts')
    .select('*')
    .eq('course_code', COURSE)
    .order('seed_number');

  if (draftErr) { console.log('Failed to load drafts:', draftErr.message); return; }
  console.log(`Drafts: ${drafts.length}`);

  // 2. Check which seeds already have LEGOs
  const { data: existingLegoRows } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, known_text, target_text, is_new')
    .eq('course_code', COURSE)
    .order('seed_number')
    .order('lego_index');

  const seedsWithLegos = new Set((existingLegoRows || []).map(l => l.seed_number));

  // 3. Check which seeds already have phrases
  const { data: existingPhraseRows } = await supabase
    .from('course_practice_phrases')
    .select('seed_number')
    .eq('course_code', COURSE)
    .gte('seed_number', 51);

  const seedsWithPhrases = new Set((existingPhraseRows || []).map(p => p.seed_number));

  // 4. Build the known LEGO map from ALL existing LEGOs (for dedup/collision checking)
  const knownLegoMap = new Map();
  for (const lego of (existingLegoRows || [])) {
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

  // 5. Process each draft
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const draft of drafts) {
    const sn = draft.seed_number;
    const draftLegos = draft.submission_data?.legos || [];

    // Skip seeds that are already fully finalized (have both LEGOs and phrases)
    if (seedsWithLegos.has(sn) && seedsWithPhrases.has(sn)) {
      skipped++;
      continue;
    }

    // If seed has LEGOs but no phrases (partially written), delete LEGOs and rewrite
    if (seedsWithLegos.has(sn)) {
      await retryOp(async () => {
        const { error } = await supabase
          .from('course_practice_phrases')
          .delete()
          .eq('course_code', COURSE)
          .eq('seed_number', sn);
        if (error) throw new Error(error.message);
      }, `delete phrases S${sn}`);

      await retryOp(async () => {
        const { error } = await supabase
          .from('course_legos')
          .delete()
          .eq('course_code', COURSE)
          .eq('seed_number', sn);
        if (error) throw new Error(error.message);
      }, `delete legos S${sn}`);
    }

    try {
      // Determine dedup status for each LEGO
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
          } else {
            // Collision - shouldn't happen since we already fixed them
            console.log(`  COLLISION S${sn} L${lego.idx}: "${lego.known}" -> "${lego.target}" vs "${existing.target_text}"`);
            legoStatuses.set(lego.idx, 'new'); // treat as new anyway
            newCount++;
          }
        } else {
          legoStatuses.set(lego.idx, 'new');
          knownLegoMap.set(normKey, {
            target_text: lego.target,
            known_text: lego.known,
            seed_number: sn,
            lego_index: lego.idx
          });
          newCount++;
        }
      }

      const isEmptySeed = newCount === 0 && draftLegos.length > 0;

      // Upsert seed
      await retryOp(async () => {
        const { error } = await supabase
          .from('course_seeds')
          .upsert({
            course_code: COURSE,
            seed_number: sn,
            known_text: draft.known_text,
            target_text: draft.target_text,
            status: 'released',
            decomposed_at: new Date().toISOString(),
            version: 1
          }, { onConflict: 'course_code,seed_number' });
        if (error) throw new Error(error.message);
      }, `upsert seed S${sn}`);

      // Process LEGOs
      let seedPhraseCount = 0;

      for (const lego of draftLegos) {
        const isDuplicate = legoStatuses.get(lego.idx) === 'duplicate';

        // Upsert LEGO
        await retryOp(async () => {
          const { error } = await supabase
            .from('course_legos')
            .upsert({
              course_code: COURSE,
              seed_number: sn,
              lego_index: lego.idx,
              type: lego.type || 'A',
              is_new: !isDuplicate,
              known_text: lego.known,
              target_text: lego.target,
              components: lego.components || null,
              status: 'draft',
              version: 1
            }, { onConflict: 'course_code,seed_number,lego_index' });
          if (error) throw new Error(error.message);
        }, `upsert lego S${sn}L${lego.idx}`);

        if (isDuplicate) continue;

        // Generate phrases
        let allPhraseRows = [];
        let practiceStartPosition = 1;
        let roleCounts = { component: 0, build: 0, use: 0 };

        // M-TYPE BUILD-UP
        if (lego.type === 'M' && lego.components && lego.components.length > 0) {
          const buildupResult = generateBuildupPhrases(
            { seed: sn, idx: lego.idx, known: lego.known, target: lego.target, components: lego.components },
            COURSE
          );
          allPhraseRows = [...buildupResult.buildupPhrases];
          practiceStartPosition = buildupResult.startPosition;
          roleCounts = { ...buildupResult.roleCounts };
        }

        // BUILD/USE format
        if (usesBuildUseFormat(lego)) {
          const buildPhrases = lego.build || [];
          const usePhrases = lego.use || [];

          const buildRows = buildPhrases.map((p, i) => {
            roleCounts.build++;
            return {
              id: makePhraseId(COURSE, sn, lego.idx, 'build', roleCounts.build),
              course_code: COURSE,
              seed_number: sn,
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
              id: makePhraseId(COURSE, sn, lego.idx, 'use', roleCounts.use),
              course_code: COURSE,
              seed_number: sn,
              lego_index: lego.idx,
              position: practiceStartPosition + buildPhrases.length + i,
              known_text: p.known,
              target_text: p.target,
              word_count: p.target.length,
              lego_count: (p.known.match(/\s+/g) || []).length + 1,
              phrase_role: 'use',
              connected_lego_ids: [],
              lego_position: computeLegoPosition(p.target, lego.target),
              metadata: { format: 'build_use', score: p.score, scored_at: new Date().toISOString() },
              status: 'draft',
              version: 1
            };
          });

          allPhraseRows = [...allPhraseRows, ...buildRows, ...useRows];
        }

        // Insert phrases
        if (allPhraseRows.length > 0) {
          await retryOp(async () => {
            const { error } = await supabase
              .from('course_practice_phrases')
              .upsert(allPhraseRows, { onConflict: 'course_code,seed_number,lego_index,position' });
            if (error) throw new Error(error.message);
          }, `insert phrases S${sn}L${lego.idx}`);
          seedPhraseCount += allPhraseRows.length;
        }
      }

      // Handle empty seeds (all LEGOs are duplicates)
      if (isEmptySeed) {
        const { data: allNewLegos } = await supabase
          .from('course_legos')
          .select('seed_number, lego_index, target_text')
          .eq('course_code', COURSE)
          .eq('is_new', true)
          .lt('seed_number', sn)
          .order('seed_number');

        const wordIntroducedBy = {};
        for (const l of (allNewLegos || [])) {
          const words = extractVocab(l.target_text);
          for (const w of words) {
            if (!wordIntroducedBy[w]) {
              wordIntroducedBy[w] = { seed_number: l.seed_number, lego_index: l.lego_index, target_text: l.target_text };
            }
          }
        }

        const seedWords = extractVocab(draft.target_text);
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

        if (bestSeedNum >= 0) {
          const { data: existingPhrases } = await supabase
            .from('course_practice_phrases')
            .select('position, phrase_role')
            .eq('course_code', COURSE)
            .eq('seed_number', bestSeedNum)
            .eq('lego_index', bestLegoIdx);

          const maxPos = existingPhrases?.reduce((max, p) => Math.max(max, p.position), 0) || 0;
          const existingUseCount = existingPhrases?.filter(p => p.phrase_role === 'use').length || 0;

          await retryOp(async () => {
            const { error } = await supabase
              .from('course_practice_phrases')
              .insert({
                id: makePhraseId(COURSE, bestSeedNum, bestLegoIdx, 'use', existingUseCount + 1),
                course_code: COURSE,
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
                metadata: { format: 'build_use', source: 'seed_sentence', source_seed: sn, score: 8 },
                status: 'draft',
                version: 1
              });
            if (error) throw new Error(error.message);
          }, `empty seed USE S${sn}`);
          seedPhraseCount++;
        }
      }

      processed++;
      const status = isEmptySeed ? '(empty)' : `${draftLegos.length}L ${seedPhraseCount}P`;
      if (processed % 10 === 0 || sn >= 290) {
        console.log(`  S${sn}: OK ${status} [${processed + skipped}/${drafts.length}]`);
      }

    } catch (err) {
      console.log(`  S${sn}: FAILED - ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Processed: ${processed}`);
  console.log(`Skipped (already done): ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (failed === 0) {
    // Clean up drafts
    console.log('\nCleaning up drafts...');
    const { error: delErr } = await supabase
      .from('course_seed_drafts')
      .delete()
      .eq('course_code', COURSE);
    if (delErr) {
      console.log(`Draft cleanup error: ${delErr.message}`);
    } else {
      console.log('All drafts deleted. Finalization complete!');
    }
  } else {
    console.log(`\n${failed} seeds failed. Fix and re-run.`);
  }
}

main().catch(err => console.error('Fatal:', err.message));

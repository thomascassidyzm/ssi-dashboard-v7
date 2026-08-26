#!/usr/bin/env node
/**
 * Forward-reference gate for PROPOSED practice phrases (2026-08-26).
 *
 * Why this exists: three opus workers each authored a dozen replacement BUILD
 * phrases for spa_for_eng, self-checked them against a 90-LEGO SAMPLE of prior
 * vocabulary, and each independently believed a word was already taught when it
 * was not. "habríamos" went into a phrase at seed 600; it is introduced at seed
 * 612. "en la oficina" went into a phrase at seed 184; the bundled chunk arrives
 * at seed 511. Five of thirty-five phrases failed this way.
 *
 * That is not carelessness — it is structural. A phrase author cannot hold 1,475
 * LEGOs and their introduction order in their head, and a sample of the prior
 * inventory cannot tell you that a word you recognise arrives LATER. Only a
 * replay of the real introduction order against the real DB can. So replay it.
 *
 * This runs the SAME DP-tiling gate the live /api/seed/complete submit path runs
 * (checkVocabViolations, validation.cjs), against vocabulary scoped strictly
 * before each phrase's own (seed_number, lego_index) — plus the containment and
 * bare-LEGO checks, because a proposed repair that reintroduces the very defect
 * it repairs is worth catching in the same pass.
 *
 * READ-ONLY. It never writes a row. Its output is a verdict per phrase.
 *
 * Usage:
 *   node tools/course-optimization/check-repair-phrases.cjs <course_code> <proposals.json>
 *   node tools/course-optimization/check-repair-phrases.cjs spa_for_eng docs/spa-bare-lego-repair-sample-2026-08-26.json --json
 *
 * proposals.json: an array of objects carrying at least
 *   { seed_number, lego_index, new_target }   (new_known and lego_id optional)
 * Entries with skipped:true are reported as SKIPPED and not checked.
 *
 * Exit code 1 if any phrase fails, so it can gate a generation loop.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');
const { extractVocab, checkWordContainment, normalizeForContainment } = require('../../services/course-builder/lib/text-normalization.cjs');
const { isBareLegoPhrase } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { isChinese } = require('../../services/course-builder/lib/language-config.cjs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

/** Every LEGO in the course, in introduction order. Paginated: PostgREST caps at 1000. */
async function loadLegos(courseCode) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text, type, components, is_new')
      .eq('course_code', courseCode)
      .order('seed_number')
      .order('lego_index')
      .range(offset, offset + 999);
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/**
 * The vocabulary a phrase at (seed, idx) is allowed to tile from: every LEGO
 * introduced STRICTLY earlier, plus its own LEGO, plus components of both.
 *
 * This mirrors what the live gate does, and the "strictly earlier" is the whole
 * point — a set built from the course's full inventory would pass every forward
 * reference silently, which is exactly the failure mode being closed.
 */
function vocabBefore(legos, seedNumber, legoIndex, chinese) {
  const vocab = new Set();
  for (const l of legos) {
    const earlier = l.seed_number < seedNumber
      || (l.seed_number === seedNumber && l.lego_index <= legoIndex);
    if (!earlier) break;                       // legos are already in order
    vocab.add(l.target_text);
    for (const c of l.components || []) if (c && c.target) vocab.add(c.target);
  }
  return vocab;
}

async function main() {
  const [courseCode, proposalsPath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const asJson = process.argv.includes('--json');
  if (!courseCode || !proposalsPath) {
    console.error('Usage: check-repair-phrases.cjs <course_code> <proposals.json> [--json]');
    process.exit(2);
  }

  const chinese = isChinese(courseCode);
  const legos = await loadLegos(courseCode);
  const byKey = new Map(legos.map(l => [`${l.seed_number}:${l.lego_index}`, l]));
  const proposals = JSON.parse(fs.readFileSync(proposalsPath, 'utf8'));

  const results = [];
  for (const p of proposals) {
    const key = `${p.seed_number}:${p.lego_index}`;
    const label = p.lego_id || `S${String(p.seed_number).padStart(4, '0')}L${String(p.lego_index).padStart(2, '0')}`;
    if (p.skipped) { results.push({ label, verdict: 'SKIPPED', reason: p.skip_reason || null }); continue; }

    const lego = byKey.get(key);
    if (!lego) { results.push({ label, verdict: 'FAIL', checks: ['lego_not_found'], detail: `no LEGO at ${key}` }); continue; }

    const target = p.new_target;
    const failures = [];

    // 1. Containment — the phrase must actually contain the LEGO it introduces.
    const contains = chinese
      ? normalizeForContainment(target).includes(normalizeForContainment(lego.target_text))
      : checkWordContainment(lego.target_text, target);
    if (!contains) failures.push({ check: 'containment', detail: `does not contain LEGO target "${lego.target_text}"` });

    // 2. Bare LEGO — a repair that restates the LEGO is the defect, not the fix.
    if (isBareLegoPhrase(target, lego.target_text)) {
      failures.push({ check: 'bare_lego', detail: 'the proposed phrase IS the bare LEGO' });
    }

    // 3. Forward reference / untaught vocabulary — the one the authors could not
    //    do for themselves. Same DP tiling the live submit gate runs.
    const vocab = vocabBefore(legos, p.seed_number, p.lego_index, chinese);
    const violations = checkVocabViolations([{ target }], vocab, courseCode);
    for (const v of violations) {
      // checkVocabViolations reports the UNCOVERED SPAN, not a single word — the
      // stretch of the phrase its DP tiling could not lay taught chunks over. Walk
      // that span word by word, because the two diagnoses need different fixes and
      // reporting the span whole would mislabel both:
      //   "taught, but LATER"  → reorder or pick another partner (a forward reference)
      //   "never taught"       → the word does not exist in this course at all
      // "habríamos" is the worked example: reported inside a longer span, present
      // in the course at S612L01, and 12 seeds too early for a phrase at seed 600.
      // Calling that "never taught" would send someone hunting for a typo.
      const spans = Array.isArray(v.unknown) ? v.unknown : [v.unknown];
      const parts = [];
      for (const span of spans) {
        for (const word of normalizeForContainment(String(span)).split(' ').filter(Boolean)) {
          const later = legos.find(l => {
            const chunk = normalizeForContainment(l.target_text);
            return chunk === word || chunk.split(' ').includes(word);
          });
          if (later && (later.seed_number > p.seed_number
              || (later.seed_number === p.seed_number && later.lego_index > p.lego_index))) {
            parts.push(`"${word}" — taught at S${later.seed_number}L${later.lego_index}, AFTER this phrase`);
          } else if (!later) {
            parts.push(`"${word}" — never taught anywhere in this course`);
          }
          // A word that IS taught earlier still lands in an uncovered span when the
          // SPAN is untileable as a whole: the words exist, the chunk boundary does
          // not. Reported below as the span itself rather than blamed on a word.
        }
      }
      failures.push({
        check: 'forward_reference',
        detail: parts.length
          ? parts.join('; ')
          : `"${spans.join(' / ')}" — every word is taught earlier, but this exact span cannot be tiled from taught chunks (a chunk-boundary break, not a missing word)`,
      });
    }

    results.push(failures.length
      ? { label, verdict: 'FAIL', target, checks: failures }
      : { label, verdict: 'PASS', target });
  }

  if (asJson) { console.log(JSON.stringify(results, null, 1)); }
  else {
    for (const r of results) {
      if (r.verdict === 'PASS') console.log(`✓ ${r.label}`);
      else if (r.verdict === 'SKIPPED') console.log(`- ${r.label}  SKIPPED${r.reason ? ` (${r.reason})` : ''}`);
      else {
        console.log(`✗ ${r.label}  "${r.target || ''}"`);
        for (const c of r.checks || []) console.log(`    ${c.check || c}: ${c.detail || ''}`);
      }
    }
  }
  const failed = results.filter(r => r.verdict === 'FAIL').length;
  const passed = results.filter(r => r.verdict === 'PASS').length;
  const skipped = results.filter(r => r.verdict === 'SKIPPED').length;
  console.error(`\n${passed} pass, ${failed} fail, ${skipped} skipped (of ${results.length})`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });

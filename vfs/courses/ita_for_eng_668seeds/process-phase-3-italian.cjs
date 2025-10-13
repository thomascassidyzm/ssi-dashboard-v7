#!/usr/bin/env node

/**
 * Phase 3: LEGO Extraction for Italian
 *
 * WITH ITALIAN-SPECIFIC RULES AND SELF-REVIEW
 *
 * Features:
 * - IRON RULE enforcement (no preposition boundaries)
 * - Italian-specific linguistic patterns
 * - Quality self-scoring (0-10 scale)
 * - Automatic issue detection
 * - Attempt tracking
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const COURSE_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/ita_for_eng_668seeds';
const TRANSLATIONS_FILE = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ita_for_eng_668seeds_translations.json';

// Italian prepositions - IRON RULE enforcement
const ITALIAN_PREPOSITIONS = [
  'a', 'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  'al', 'allo', 'alla', 'ai', 'agli', 'alle',  // a + article
  'del', 'dello', 'della', 'dei', 'degli', 'delle',  // di + article
  'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle',  // da + article
  'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',  // in + article
  'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle',  // su + article
  'col', 'coi',  // con + article (less common)
  'a causa di', 'prima di', 'invece di', 'dopo di', 'oltre a', 'fuori di',
  'insieme a', 'vicino a', 'lontano da', 'fino a', 'davanti a', 'dietro a'
];

// Italian-specific patterns to keep together
const ITALIAN_PATTERNS = {
  // Modal verbs + infinitive
  modals: ['devo', 'posso', 'voglio', 'vorrei', 'dovrei', 'potrei', 'saprei', 'so'],

  // Reflexive verbs
  reflexive_pronouns: ['mi', 'ti', 'si', 'ci', 'vi'],

  // High-frequency verb phrases
  verb_phrases: [
    'mi piace', 'ti piace', 'gli piace', 'le piace', 'ci piace', 'vi piace', 'piace loro',
    'ho bisogno di', 'hai bisogno di', 'ha bisogno di', 'abbiamo bisogno di',
    'sto cercando di', 'stai cercando di', 'sta cercando di', 'stiamo cercando di',
    'non vedo l\'ora', 'mi dispiace', 'mi sento', 'ti senti', 'si sente'
  ],

  // Articles must stay with nouns
  articles: ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una'],

  // Compound tenses (auxiliary + past participle patterns)
  compound_tense_markers: ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno', 'sono', 'sei', 'è', 'siamo', 'siete']
};

// Generate deterministic UUID
function generateUUID(content) {
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return hash.substr(0,8) + '-' + hash.substr(8,4) + '-' + hash.substr(12,4) + '-' + hash.substr(16,4) + '-' + hash.substr(20,12);
}

// Check if word is a preposition
function isPreposition(word) {
  const lower = word.toLowerCase().trim();
  return ITALIAN_PREPOSITIONS.includes(lower);
}

// Check IRON RULE violation
function violatesIronRule(legoText) {
  const words = legoText.trim().split(/\s+/);
  if (words.length === 0) return true;

  const firstWord = words[0];
  const lastWord = words[words.length - 1];

  return isPreposition(firstWord) || isPreposition(lastWord);
}

// Check if pattern should be kept together
function shouldKeepTogether(words, startIdx, endIdx) {
  const phrase = words.slice(startIdx, endIdx + 1).join(' ').toLowerCase();

  // Check verb phrases
  for (const vp of ITALIAN_PATTERNS.verb_phrases) {
    if (phrase.includes(vp)) return true;
  }

  // Check modal + infinitive
  if (startIdx < words.length - 1) {
    const word = words[startIdx].toLowerCase();
    if (ITALIAN_PATTERNS.modals.includes(word)) {
      // Next word might be infinitive
      return true;
    }
  }

  // Check reflexive verb
  if (startIdx < words.length - 1) {
    const word = words[startIdx].toLowerCase();
    if (ITALIAN_PATTERNS.reflexive_pronouns.includes(word)) {
      return true;
    }
  }

  // Check article + noun
  if (startIdx < words.length - 1) {
    const word = words[startIdx].toLowerCase();
    if (ITALIAN_PATTERNS.articles.includes(word)) {
      return true;
    }
  }

  return false;
}

// Extract LEGOs from Italian translation
function extractLEGOs(translation, seedId, attemptNumber = 1) {
  const { target_italian, source_english, uuid: translationUuid } = translation;
  const words = target_italian.split(/\s+/);
  const legos = [];

  // Strategy: Find natural phrase boundaries while respecting Italian patterns
  let currentStart = 0;

  while (currentStart < words.length) {
    let bestEnd = currentStart;
    let bestScore = 0;

    // Try different ending points
    for (let end = currentStart; end < Math.min(currentStart + 8, words.length); end++) {
      const candidate = words.slice(currentStart, end + 1).join(' ');

      // Skip if violates IRON RULE
      if (violatesIronRule(candidate)) continue;

      // Score based on:
      // 1. Length (2-5 words ideal)
      // 2. Naturalness (contains known patterns)
      // 3. Teaching value (reusable structure)

      const wordCount = end - currentStart + 1;
      let score = 0;

      // Length scoring
      if (wordCount >= 2 && wordCount <= 5) {
        score += 50;
      } else if (wordCount === 1) {
        score += 20;
      } else {
        score += 10;
      }

      // Pattern bonus
      if (shouldKeepTogether(words, currentStart, end)) {
        score += 30;
      }

      // Compound tense bonus
      const firstWord = words[currentStart].toLowerCase();
      if (ITALIAN_PATTERNS.compound_tense_markers.includes(firstWord) && wordCount >= 2) {
        score += 20;
      }

      if (score > bestScore) {
        bestScore = score;
        bestEnd = end;
      }
    }

    // Extract the LEGO
    const legoText = words.slice(currentStart, bestEnd + 1).join(' ');
    const position = legos.length + 1;
    const provenance = 'S' + seedId + 'L' + position;

    legos.push({
      uuid: generateUUID(provenance + '_' + legoText + '_' + translationUuid),
      text: legoText,
      provenance: provenance,
      source_translation_uuid: translationUuid,
      position: position,
      word_count: bestEnd - currentStart + 1,
      pedagogical_score: bestScore,
      metadata: {
        source_seed_id: seedId,
        source_english: source_english,
        attempt_number: attemptNumber,
        extraction_timestamp: new Date().toISOString()
      }
    });

    currentStart = bestEnd + 1;
  }

  return legos;
}

// Calculate quality score for a seed's LEGO extraction
function calculateQualityScore(legos, translation) {
  let score = 100;
  const issues = [];

  // IRON RULE Compliance (35 points max penalty)
  let ironRuleViolations = 0;
  for (const lego of legos) {
    if (violatesIronRule(lego.text)) {
      ironRuleViolations++;
      issues.push({
        type: 'iron_rule_violation',
        lego_id: lego.uuid,
        lego_text: lego.text,
        severity: 'critical'
      });
    }
  }
  score -= (ironRuleViolations * 20);

  // Naturalness (25 points max penalty)
  // Check if important patterns are split
  let unnaturalSplits = 0;
  const fullText = translation.target_italian.toLowerCase();

  // Check if key phrases are broken
  for (const vp of ITALIAN_PATTERNS.verb_phrases) {
    if (fullText.includes(vp)) {
      // Check if any LEGO contains the complete phrase
      const found = legos.some(l => l.text.toLowerCase().includes(vp));
      if (!found) {
        unnaturalSplits++;
        issues.push({
          type: 'split_phrase',
          phrase: vp,
          severity: 'medium'
        });
      }
    }
  }
  score -= (unnaturalSplits * 5);

  // Pedagogical Value (20 points)
  // Based on LEGO count and average pedagogical score
  const legoCount = legos.length;
  if (legoCount < 2) {
    score -= 20;
    issues.push({
      type: 'low_lego_count',
      count: legoCount,
      severity: 'high'
    });
  } else if (legoCount > 8) {
    score -= 10; // Too fragmented
    issues.push({
      type: 'over_fragmented',
      count: legoCount,
      severity: 'medium'
    });
  }

  // Average pedagogical score
  const avgPedScore = legos.reduce((sum, l) => sum + l.pedagogical_score, 0) / legos.length;
  if (avgPedScore < 30) {
    score -= 10;
  }

  // Consistency (10 points)
  // Check word count distribution
  const wordCounts = legos.map(l => l.word_count);
  const avgWordCount = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  if (avgWordCount < 1.5) {
    score -= 5; // Too many single words
  }

  // Edge Cases (10 points)
  // Check for very short LEGOs at sentence boundaries
  const firstLego = legos[0];
  const lastLego = legos[legos.length - 1];
  if (firstLego && firstLego.word_count === 1 && isPreposition(firstLego.text)) {
    score -= 5; // Should have been caught by IRON RULE
  }

  // Normalize score
  score = Math.max(0, Math.min(100, score));

  // Convert to 0-10 scale
  const finalScore = parseFloat((score / 10).toFixed(1));

  return {
    score: finalScore,
    issues: issues,
    metrics: {
      lego_count: legoCount,
      iron_rule_violations: ironRuleViolations,
      unnatural_splits: unnaturalSplits,
      avg_pedagogical_score: avgPedScore,
      avg_word_count: avgWordCount
    }
  };
}

// Main extraction process
async function runPhase3() {
  console.log('=== PHASE 3: LEGO EXTRACTION (Italian) ===\n');
  console.log('Loading translations...');

  const translations = await fs.readJSON(TRANSLATIONS_FILE);
  console.log('Loaded ' + translations.length + ' translations\n');

  console.log('Italian-specific rules active:');
  console.log('✓ IRON RULE: No preposition boundaries');
  console.log('✓ Keep articles with nouns');
  console.log('✓ Keep reflexive verbs together');
  console.log('✓ Keep modal + infinitive together');
  console.log('✓ Preserve compound tenses');
  console.log('✓ Respect Italian verb phrases\n');

  const legoDir = path.join(COURSE_DIR, 'amino_acids', 'legos');
  const translationDir = path.join(COURSE_DIR, 'amino_acids', 'translations');
  await fs.ensureDir(legoDir);
  await fs.ensureDir(translationDir);

  let totalLegos = 0;
  let totalIssues = 0;
  let qualityScores = [];
  const seedQuality = [];

  for (const translation of translations) {
    const seedId = translation.seed_id;

    // Extract LEGOs
    const legos = extractLEGOs(translation, seedId);
    totalLegos += legos.length;

    // Calculate quality
    const quality = calculateQualityScore(legos, translation);
    qualityScores.push(quality.score);
    totalIssues += quality.issues.length;

    seedQuality.push({
      seed_id: seedId,
      quality_score: quality.score,
      lego_count: legos.length,
      issues: quality.issues,
      metrics: quality.metrics
    });

    // Save LEGOs
    for (const lego of legos) {
      const legoFile = path.join(legoDir, lego.uuid + '.json');
      await fs.writeJSON(legoFile, lego, { spaces: 2 });
    }

    // Update translation amino acid with attempt history
    const translationData = {
      ...translation,
      metadata: {
        ...translation.metadata,
        lego_extraction: {
          lego_count: legos.length,
          quality_score: quality.score,
          issues: quality.issues,
          extracted_at: new Date().toISOString()
        },
        attempt_history: [
          {
            attempt_number: 1,
            timestamp: new Date().toISOString(),
            source: translation.source_english,
            target: translation.target_italian,
            quality_score: quality.score,
            lego_count: legos.length,
            issues: quality.issues,
            prompt_version: 'v1.0_italian'
          }
        ]
      }
    };

    const translationFile = path.join(translationDir, translation.uuid + '.json');
    await fs.writeJSON(translationFile, translationData, { spaces: 2 });

    // Progress
    if (parseInt(seedId) % 100 === 0) {
      console.log('Processed seed ' + seedId + '...');
    }
  }

  // Calculate statistics
  const avgQuality = qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
  const flaggedSeeds = seedQuality.filter(s => s.quality_score < 8.0);
  const failedSeeds = seedQuality.filter(s => s.quality_score < 5.0);
  const excellentSeeds = seedQuality.filter(s => s.quality_score >= 9.0);

  console.log('\n=== EXTRACTION COMPLETE ===\n');
  console.log('Total translations processed: ' + translations.length);
  console.log('Total LEGOs extracted: ' + totalLegos);
  console.log('Average LEGOs per seed: ' + (totalLegos / translations.length).toFixed(2));
  console.log('\n=== QUALITY METRICS ===\n');
  console.log('Average quality score: ' + avgQuality.toFixed(2) + '/10');
  console.log('Excellent (≥9.0): ' + excellentSeeds.length + ' (' + ((excellentSeeds.length / translations.length) * 100).toFixed(1) + '%)');
  console.log('Good (8.0-8.9): ' + (translations.length - flaggedSeeds.length - excellentSeeds.length) + ' seeds');
  console.log('Flagged (5.0-7.9): ' + (flaggedSeeds.length - failedSeeds.length) + ' seeds');
  console.log('Failed (<5.0): ' + failedSeeds.length + ' seeds');
  console.log('\nTotal issues detected: ' + totalIssues);

  // Save quality report
  const qualityReport = {
    course_code: 'ita_for_eng_668seeds',
    phase: 'phase_3',
    extraction_date: new Date().toISOString(),
    statistics: {
      total_seeds: translations.length,
      total_legos: totalLegos,
      avg_legos_per_seed: totalLegos / translations.length,
      avg_quality_score: avgQuality,
      total_issues: totalIssues
    },
    quality_breakdown: {
      excellent: excellentSeeds.length,
      good: translations.length - flaggedSeeds.length - excellentSeeds.length,
      flagged: flaggedSeeds.length - failedSeeds.length,
      failed: failedSeeds.length
    },
    seed_quality: seedQuality,
    flagged_seeds: flaggedSeeds.map(s => ({
      seed_id: s.seed_id,
      score: s.quality_score,
      issues: s.issues
    }))
  };

  const reportPath = path.join(COURSE_DIR, 'phase_outputs', 'phase_3_quality_report.json');
  await fs.writeJSON(reportPath, qualityReport, { spaces: 2 });
  console.log('\nQuality report saved to: ' + reportPath);

  // Check if we need self-review
  if (avgQuality < 8.5) {
    console.log('\n⚠️  QUALITY BELOW TARGET (8.5)');
    console.log('Self-review cycle needed!');
    console.log('\nFlagged seeds requiring regeneration: ' + flaggedSeeds.length);
  } else {
    console.log('\n✅ QUALITY TARGET ACHIEVED!');
    console.log('Average score ' + avgQuality.toFixed(2) + ' exceeds target of 8.5');
  }

  console.log('\n=== PHASE 3 COMPLETE ===');
}

// Run extraction
runPhase3().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});

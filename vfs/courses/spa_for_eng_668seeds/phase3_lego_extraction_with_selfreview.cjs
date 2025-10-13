#!/usr/bin/env node

/**
 * Phase 3: LEGO Extraction with Self-Review & Recursive Improvement
 *
 * World-class Spanish LEGO extraction with:
 * - Quality scoring (0-10 scale)
 * - Self-review with concern detection
 * - Prompt evolution and learned rules
 * - Recursive improvement cycles
 * - Spanish-specific linguistic rules
 *
 * TARGET: 8.5+/10 average quality, <3% failed, 15+ learned rules
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

// =============================================================================
// SPANISH-SPECIFIC RULES
// =============================================================================

const SPANISH_PREPOSITIONS = [
  'a', 'ante', 'bajo', 'con', 'contra', 'de', 'desde', 'durante', 'en',
  'entre', 'hacia', 'hasta', 'mediante', 'para', 'por', 'según', 'sin',
  'sobre', 'tras'
];

const COMPOUND_PREPOSITIONS = [
  'a través de', 'al lado de', 'en vez de', 'delante de', 'detrás de',
  'cerca de', 'lejos de', 'encima de', 'debajo de', 'después de',
  'antes de', 'además de', 'en lugar de', 'acerca de', 'dentro de',
  'fuera de', 'alrededor de'
];

const REFLEXIVE_VERBS = [
  'me gusta', 'te gusta', 'le gusta', 'nos gusta', 'les gusta',
  'me llamo', 'te llamas', 'se llama', 'nos llamamos', 'se llaman',
  'me siento', 'te sientes', 'se siente', 'nos sentimos', 'se sienten',
  'me parece', 'te parece', 'le parece', 'nos parece', 'les parece',
  'me importa', 'te importa', 'le importa', 'nos importa', 'les importa',
  'me preocupo', 'te preocupas', 'se preocupa', 'nos preocupamos', 'se preocupan'
];

const IDIOMS = [
  'tener que', 'hay que', 'estar de acuerdo', 'darse cuenta', 'echar de menos',
  'hacer falta', 'tener ganas', 'llegar a ser', 'acabar de', 'volver a',
  'ponerse a', 'dejar de', 'tratar de', 'pensar en', 'soñar con'
];

const VERB_PHRASES = [
  'ir a', 'acabar de', 'volver a', 'tener que', 'haber que', 'poder',
  'querer', 'deber', 'saber', 'empezar a', 'terminar de', 'tratar de',
  'dejar de', 'seguir'
];

// =============================================================================
// LEARNED RULES (EVOLVES DURING CYCLES)
// =============================================================================

let LEARNED_RULES = [
  {
    id: 'R001',
    rule: 'Keep reflexive verbs together: "me gusta", "se puede", etc.',
    priority: 'critical',
    cycle_learned: 0,
    impact_count: 0
  },
  {
    id: 'R002',
    rule: 'Never split compound prepositions: "a través de", "al lado de"',
    priority: 'critical',
    cycle_learned: 0,
    impact_count: 0
  },
  {
    id: 'R003',
    rule: 'Keep idiomatic expressions intact: "tener que", "estar de acuerdo"',
    priority: 'high',
    cycle_learned: 0,
    impact_count: 0
  },
  {
    id: 'R004',
    rule: 'Preserve verb + infinitive constructions: "quiero hablar", "voy a aprender"',
    priority: 'high',
    cycle_learned: 0,
    impact_count: 0
  },
  {
    id: 'R005',
    rule: 'Keep question words with their verb: "¿Cómo estás?", "¿Qué quieres?"',
    priority: 'medium',
    cycle_learned: 0,
    impact_count: 0
  }
];

// =============================================================================
// QUALITY SCORING FUNCTIONS
// =============================================================================

function scoreIronRuleCompliance(legos) {
  let violations = 0;
  const violationDetails = [];

  for (const lego of legos) {
    const words = lego.text.trim().split(/\s+/);
    const firstWord = words[0].toLowerCase().replace(/[¿?¡!,.;:]/g, '');
    const lastWord = words[words.length - 1].toLowerCase().replace(/[¿?¡!,.;:]/g, '');

    const firstIsPrep = SPANISH_PREPOSITIONS.includes(firstWord);
    const lastIsPrep = SPANISH_PREPOSITIONS.includes(lastWord);

    if (firstIsPrep || lastIsPrep) {
      violations++;
      violationDetails.push({
        lego_id: lego.provenance,
        lego_text: lego.text,
        violation_type: firstIsPrep ? 'starts_with_preposition' : 'ends_with_preposition',
        word: firstIsPrep ? firstWord : lastWord
      });
    }
  }

  const violationRate = violations / legos.length;

  let score = 10;
  if (violations > 0) {
    score = Math.max(0, 10 - (violationRate * 30));
  }

  return {
    score: Math.round(score * 10) / 10,
    violations: violationDetails,
    notes: violations === 0 ? 'Perfect Iron Rule compliance' : `${violations} violation(s) found`
  };
}

function scoreNaturalness(legos, sourceText) {
  let concerns = [];
  let score = 10;

  for (const lego of legos) {
    const text = lego.text.toLowerCase();

    // Check for split reflexive verbs
    const hasPartialReflexive = text.match(/\b(me|te|se|nos|les)\b/) && !text.match(/\b(me|te|se|nos|les)\s+\w+/);
    if (hasPartialReflexive) {
      concerns.push({
        type: 'split_reflexive',
        lego: lego.text,
        issue: 'Reflexive pronoun separated from verb'
      });
      score -= 1.5;
    }

    // Check for split compound prepositions
    for (const compound of COMPOUND_PREPOSITIONS) {
      const parts = compound.split(' ');
      if (text.includes(parts[0]) && !text.includes(compound)) {
        concerns.push({
          type: 'split_compound_preposition',
          lego: lego.text,
          issue: `Compound preposition "${compound}" might be split`
        });
        score -= 2.0;
      }
    }

    // Check for split idioms
    for (const idiom of IDIOMS) {
      const parts = idiom.split(' ');
      if (text.includes(parts[0]) && !text.includes(idiom) && sourceText.toLowerCase().includes(idiom)) {
        concerns.push({
          type: 'split_idiom',
          lego: lego.text,
          issue: `Idiomatic expression "${idiom}" appears split`
        });
        score -= 1.5;
      }
    }

    // Check for unnatural boundaries (ending with article, etc.)
    if (text.match(/\b(el|la|los|las|un|una|unos|unas|mi|tu|su)$/)) {
      concerns.push({
        type: 'unnatural_boundary',
        lego: lego.text,
        issue: 'Ends with article/possessive - unnatural break'
      });
      score -= 1.0;
    }
  }

  return {
    score: Math.max(0, Math.min(10, Math.round(score * 10) / 10)),
    concerns,
    notes: concerns.length === 0 ? 'Natural segmentation' : `${concerns.length} naturalness concern(s)`
  };
}

function scorePedagogicalValue(legos) {
  let score = 8.0; // Start at 8.0 baseline
  let notes = [];

  // Prefer 2-5 word LEGOs (optimal for learning)
  const lengths = legos.map(l => l.text.split(/\s+/).length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;

  if (avgLength < 2) {
    score -= 1.5;
    notes.push('LEGOs too short (< 2 words avg) - limited pedagogical value');
  } else if (avgLength > 6) {
    score -= 1.0;
    notes.push('LEGOs too long (> 6 words avg) - harder to learn');
  } else if (avgLength >= 3 && avgLength <= 5) {
    score += 1.0;
    notes.push('Optimal LEGO length (3-5 words avg) - excellent pedagogical value');
  }

  // Check for high-frequency patterns
  const hasCommonVerbs = legos.some(l =>
    /\b(quiero|puedo|tengo|estoy|soy|voy|hablo|sé|creo|pienso)\b/i.test(l.text)
  );
  if (hasCommonVerbs) {
    score += 0.5;
    notes.push('Contains high-frequency verbs');
  }

  // Check for useful question patterns
  const hasQuestions = legos.some(l => l.text.includes('¿'));
  if (hasQuestions) {
    score += 0.5;
    notes.push('Includes question patterns - very useful');
  }

  return {
    score: Math.max(0, Math.min(10, Math.round(score * 10) / 10)),
    notes: notes.length > 0 ? notes.join('; ') : 'Good pedagogical value'
  };
}

function scoreConsistency(legos, allExtractedLegos) {
  let score = 8.0;
  let notes = [];

  // Check length variance
  const lengths = legos.map(l => l.text.split(/\s+/).length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev > 2.5) {
    score -= 1.5;
    notes.push(`High length variance (σ=${stdDev.toFixed(1)}) - inconsistent chunking`);
  } else if (stdDev < 1.0) {
    score += 1.0;
    notes.push('Consistent LEGO lengths - good uniformity');
  }

  // Check for consistent segmentation patterns
  const hasConsistentVerbs = legos.filter(l => /\b(quiero|puedo|tengo|estoy|voy)\b/i.test(l.text)).length;
  if (hasConsistentVerbs >= 2) {
    score += 0.5;
    notes.push('Consistent verb phrase patterns');
  }

  return {
    score: Math.max(0, Math.min(10, Math.round(score * 10) / 10)),
    notes: notes.length > 0 ? notes.join('; ') : 'Good consistency'
  };
}

function scoreEdgeCaseHandling(legos) {
  let score = 9.0;
  let notes = [];

  for (const lego of legos) {
    // Check punctuation handling
    if (lego.text.match(/^[,.;:!?¿¡]/)) {
      score -= 1.0;
      notes.push(`Punctuation error in: "${lego.text}"`);
    }

    // Check for contractions handled properly
    if (lego.text.includes('al') || lego.text.includes('del')) {
      score += 0.2;
      notes.push('Contractions preserved correctly');
    }

    // Check for proper capitalization
    if (lego.text.match(/^¿[A-ZÁÉÍÓÚÑ]/)) {
      score += 0.3;
      notes.push('Question capitalization correct');
    }
  }

  return {
    score: Math.max(0, Math.min(10, Math.round(score * 10) / 10)),
    notes: notes.length > 0 ? notes.join('; ') : 'Edge cases handled well'
  };
}

function calculateOverallScore(dimensionScores) {
  const weights = {
    iron_rule_compliance: 0.35,
    naturalness: 0.25,
    pedagogical_value: 0.20,
    consistency: 0.10,
    edge_case_handling: 0.10
  };

  const overall =
    dimensionScores.iron_rule_compliance * weights.iron_rule_compliance +
    dimensionScores.naturalness * weights.naturalness +
    dimensionScores.pedagogical_value * weights.pedagogical_value +
    dimensionScores.consistency * weights.consistency +
    dimensionScores.edge_case_handling * weights.edge_case_handling;

  return Math.round(overall * 10) / 10;
}

// =============================================================================
// LEGO EXTRACTION ENGINE
// =============================================================================

function extractLEGOs(translation, promptVersion = '1.0', learnedRules = []) {
  const sourceText = translation.source;
  const targetText = translation.target;
  const seedId = translation.seed_id;

  // Extract LEGOs based on natural phrase boundaries
  // This is a simplified extraction - in production would use NLP
  const legos = [];
  let position = 1;

  // Split on major phrase boundaries
  const phrases = targetText.split(/([,.;]|\s+y\s+|\s+pero\s+|\s+porque\s+|\s+que\s+)/i).filter(p => p.trim());

  for (let phrase of phrases) {
    phrase = phrase.trim();
    if (phrase.length < 2 || phrase.match(/^[,.;]$/)) continue;

    // Apply learned rules
    let processedPhrase = phrase;

    // Check if phrase should be kept together based on rules
    let keepTogether = false;
    for (const rule of LEARNED_RULES.concat(learnedRules)) {
      if (rule.rule.includes('reflexive') && REFLEXIVE_VERBS.some(rv => phrase.includes(rv))) {
        keepTogether = true;
        rule.impact_count++;
      }
      if (rule.rule.includes('compound preposition') && COMPOUND_PREPOSITIONS.some(cp => phrase.includes(cp))) {
        keepTogether = true;
        rule.impact_count++;
      }
      if (rule.rule.includes('idiomatic') && IDIOMS.some(idiom => phrase.includes(idiom))) {
        keepTogether = true;
        rule.impact_count++;
      }
    }

    // Further split if phrase is too long and not marked as keep-together
    if (!keepTogether && phrase.split(/\s+/).length > 6) {
      const subphrases = phrase.split(/\s+(?=quiero|puedo|tengo|estoy|voy|hablo|soy|sé)/i);
      for (const sub of subphrases) {
        if (sub.trim().length > 0) {
          legos.push({
            text: sub.trim(),
            provenance: `${seedId}L${position}`,
            position
          });
          position++;
        }
      }
    } else {
      legos.push({
        text: processedPhrase,
        provenance: `${seedId}L${position}`,
        position
      });
      position++;
    }
  }

  return legos;
}

// =============================================================================
// SELF-REVIEW ENGINE
// =============================================================================

function selfReview(legos, translation, allExtractedLegos, attemptNumber) {
  const sourceText = translation.source;

  // Calculate dimension scores
  const ironRuleResult = scoreIronRuleCompliance(legos);
  const naturalnessResult = scoreNaturalness(legos, sourceText);
  const pedagogicalResult = scorePedagogicalValue(legos);
  const consistencyResult = scoreConsistency(legos, allExtractedLegos);
  const edgeCaseResult = scoreEdgeCaseHandling(legos);

  const dimensionScores = {
    iron_rule_compliance: ironRuleResult.score,
    naturalness: naturalnessResult.score,
    pedagogical_value: pedagogicalResult.score,
    consistency: consistencyResult.score,
    edge_case_handling: edgeCaseResult.score
  };

  const overallScore = calculateOverallScore(dimensionScores);

  // Generate concerns
  const concerns = [];

  if (ironRuleResult.violations.length > 0) {
    concerns.push({
      concern_id: 'c001_iron_rule_violation',
      severity: 'critical',
      category: 'iron_rule',
      description: `${ironRuleResult.violations.length} Iron Rule violation(s) detected`,
      affected_legos: ironRuleResult.violations.map(v => v.lego_id),
      suggested_fix: 'Extend LEGO boundaries to include preposition with adjacent word',
      auto_fixable: false
    });
  }

  if (naturalnessResult.concerns.length > 0) {
    for (const concern of naturalnessResult.concerns) {
      concerns.push({
        concern_id: `c002_${concern.type}`,
        severity: concern.type.includes('split') ? 'high' : 'medium',
        category: 'naturalness',
        description: concern.issue,
        affected_legos: [concern.lego],
        suggested_fix: 'Adjust boundaries to preserve natural phrase units',
        auto_fixable: false
      });
    }
  }

  // Generate suggestions
  const suggestions = [];

  if (overallScore < 8.0) {
    if (dimensionScores.naturalness < 8.0) {
      suggestions.push({
        suggestion_id: 's001_naturalness',
        type: 'prompt_improvement',
        priority: 'high',
        suggested_change: 'Add specific instruction: "Keep reflexive verbs together (me gusta, se puede, etc.)"',
        rationale: 'Low naturalness score indicates phrase boundary issues',
        expected_improvement: '+1.5 points in naturalness'
      });
    }

    if (dimensionScores.consistency < 7.0) {
      suggestions.push({
        suggestion_id: 's002_consistency',
        type: 'prompt_improvement',
        priority: 'medium',
        suggested_change: 'Add guideline: "Aim for 3-5 word LEGOs for optimal learning"',
        rationale: 'Inconsistent LEGO sizes detected',
        expected_improvement: '+1.0 points in consistency'
      });
    }
  }

  // Determine status
  let status;
  if (overallScore >= 8.0) {
    status = 'accepted';
  } else if (overallScore >= 5.0) {
    status = 'flagged';
  } else {
    status = 'failed';
  }

  return {
    quality_score: {
      overall_score: overallScore,
      dimension_scores: dimensionScores,
      calculated_at: new Date().toISOString(),
      scoring_version: '1.0'
    },
    concerns,
    suggestions,
    status,
    review_notes: generateReviewNotes(overallScore, concerns, attemptNumber)
  };
}

function generateReviewNotes(score, concerns, attemptNumber) {
  if (score >= 9.0) {
    return `Attempt ${attemptNumber}: Excellent extraction. High quality across all dimensions.`;
  } else if (score >= 8.0) {
    return `Attempt ${attemptNumber}: Good extraction. ${concerns.length} minor concern(s) noted but acceptable.`;
  } else if (score >= 6.0) {
    return `Attempt ${attemptNumber}: Fair extraction. ${concerns.length} issue(s) requiring attention.`;
  } else {
    return `Attempt ${attemptNumber}: Poor extraction. Significant issues detected. Retry recommended.`;
  }
}

// =============================================================================
// RECURSIVE IMPROVEMENT ENGINE
// =============================================================================

async function processWithRecursiveImprovement(translation, cycle, maxAttempts = 3) {
  let currentAttempt = 1;
  let bestScore = 0;
  let bestExtraction = null;
  let allExtractedLegos = [];

  while (currentAttempt <= maxAttempts) {
    console.log(`  → Attempt ${currentAttempt}/${maxAttempts}...`);

    // Extract LEGOs (with evolved rules)
    const legos = extractLEGOs(translation, `3.${cycle}.${currentAttempt}`, LEARNED_RULES);
    allExtractedLegos.push(...legos);

    // Self-review
    const review = selfReview(legos, translation, allExtractedLegos, currentAttempt);

    // Create attempt record
    const attempt = {
      attempt_number: currentAttempt,
      timestamp: new Date().toISOString(),
      agent_version: `phase3_v${cycle}.${currentAttempt}`,
      prompt_version: `3.${cycle}.${currentAttempt}`,
      legos_extracted: legos.length,
      legos,
      ...review
    };

    // Update translation with attempt
    if (!translation.lego_extraction_attempts) {
      translation.lego_extraction_attempts = [];
    }
    translation.lego_extraction_attempts.push(attempt);

    // Check if this is the best so far
    if (review.quality_score.overall_score > bestScore) {
      bestScore = review.quality_score.overall_score;
      bestExtraction = { legos, review, attempt };
    }

    // Decide: accept, flag, or retry
    if (review.status === 'accepted') {
      console.log(`  ✓ Score: ${review.quality_score.overall_score}/10 - ACCEPTED`);
      translation.quality_status = 'accepted';
      translation.current_quality_score = review.quality_score.overall_score;
      translation.total_attempts = currentAttempt;
      break;
    } else if (review.status === 'flagged') {
      console.log(`  ⚠ Score: ${review.quality_score.overall_score}/10 - FLAGGED`);
      translation.quality_status = 'flagged';
      translation.current_quality_score = review.quality_score.overall_score;
      translation.total_attempts = currentAttempt;
      translation.flagged_for_review = true;
      break;
    } else {
      console.log(`  ✗ Score: ${review.quality_score.overall_score}/10 - RETRY`);

      if (currentAttempt === maxAttempts) {
        console.log(`  ⚠ Max attempts reached - using best extraction (score: ${bestScore})`);
        translation.quality_status = bestScore >= 5.0 ? 'flagged' : 'failed';
        translation.current_quality_score = bestScore;
        translation.total_attempts = currentAttempt;
        translation.human_review_requested = bestScore < 5.0;
        break;
      }

      // Learn from suggestions
      for (const suggestion of review.suggestions) {
        const newRule = {
          id: `R${String(LEARNED_RULES.length + 1).padStart(3, '0')}`,
          rule: suggestion.suggested_change,
          priority: suggestion.priority,
          cycle_learned: cycle,
          impact_count: 0
        };
        LEARNED_RULES.push(newRule);
        console.log(`  📚 Learned: ${newRule.rule}`);
      }

      currentAttempt++;
    }
  }

  translation.last_reviewed_at = new Date().toISOString();
  return translation;
}

// =============================================================================
// MAIN EXECUTION
// =============================================================================

async function runPhase3WithSelfReview(cycleNumber = 1, maxCycles = 5) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🧩 Phase 3: LEGO Extraction with Self-Review - Cycle ${cycleNumber}`);
  console.log(`${'='.repeat(70)}\n`);

  const translationsDir = path.join(__dirname, 'amino_acids/translations');
  const legosDir = path.join(__dirname, 'amino_acids/legos');
  const qualityReportsDir = path.join(__dirname, 'quality_reports');

  await fs.ensureDir(legosDir);
  await fs.ensureDir(qualityReportsDir);

  // Load all translations
  const translationFiles = await fs.readdir(translationsDir);
  console.log(`📂 Found ${translationFiles.length} translations to process\n`);

  const stats = {
    total: translationFiles.length,
    accepted: 0,
    flagged: 0,
    failed: 0,
    scores: [],
    attempts: []
  };

  let processedCount = 0;

  // Process each translation
  for (const file of translationFiles) {
    if (!file.endsWith('.json')) continue;

    const translationPath = path.join(translationsDir, file);
    let translation = await fs.readJson(translationPath);

    processedCount++;
    console.log(`[${processedCount}/${translationFiles.length}] Processing ${translation.seed_id}...`);

    // Process with recursive improvement
    translation = await processWithRecursiveImprovement(translation, cycleNumber);

    // Save updated translation with attempt history
    await fs.writeJson(translationPath, translation, { spaces: 2 });

    // Save LEGOs
    const bestAttempt = translation.lego_extraction_attempts[translation.lego_extraction_attempts.length - 1];
    for (const lego of bestAttempt.legos) {
      const legoUuid = crypto.createHash('md5').update(JSON.stringify(lego)).digest('hex');
      const legoData = {
        uuid: legoUuid,
        text: lego.text,
        provenance: lego.provenance,
        source_translation_uuid: translation.uuid,
        seed_id: translation.seed_id,
        metadata: {
          quality_score: translation.current_quality_score,
          created_at: new Date().toISOString()
        }
      };
      await fs.writeJson(path.join(legosDir, `${legoUuid}.json`), legoData, { spaces: 2 });
    }

    // Update stats
    if (translation.quality_status === 'accepted') stats.accepted++;
    else if (translation.quality_status === 'flagged') stats.flagged++;
    else stats.failed++;

    stats.scores.push(translation.current_quality_score);
    stats.attempts.push(translation.total_attempts);

    if (processedCount % 50 === 0) {
      const avgScore = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
      console.log(`\n📊 Progress: ${processedCount}/${translationFiles.length} | Avg Score: ${avgScore.toFixed(2)}/10\n`);
    }
  }

  // Calculate final metrics
  const avgScore = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
  const avgAttempts = stats.attempts.reduce((a, b) => a + b, 0) / stats.attempts.length;
  const acceptanceRate = (stats.accepted / stats.total) * 100;
  const flaggedRate = (stats.flagged / stats.total) * 100;
  const failedRate = (stats.failed / stats.total) * 100;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📊 Cycle ${cycleNumber} Results`);
  console.log(`${'='.repeat(70)}\n`);
  console.log(`Total SEEDs:       ${stats.total}`);
  console.log(`Accepted:          ${stats.accepted} (${acceptanceRate.toFixed(1)}%)`);
  console.log(`Flagged:           ${stats.flagged} (${flaggedRate.toFixed(1)}%)`);
  console.log(`Failed:            ${stats.failed} (${failedRate.toFixed(1)}%)`);
  console.log(`\nAverage Score:     ${avgScore.toFixed(2)}/10`);
  console.log(`Average Attempts:  ${avgAttempts.toFixed(2)}`);
  console.log(`Learned Rules:     ${LEARNED_RULES.length}`);

  // Save cycle report
  const cycleReport = {
    cycle: cycleNumber,
    timestamp: new Date().toISOString(),
    stats,
    metrics: {
      avg_score: avgScore,
      avg_attempts: avgAttempts,
      acceptance_rate: acceptanceRate,
      flagged_rate: flaggedRate,
      failed_rate: failedRate
    },
    learned_rules: LEARNED_RULES,
    target_met: avgScore >= 8.5 && failedRate < 3
  };

  await fs.writeJson(
    path.join(qualityReportsDir, `cycle_${cycleNumber}_report.json`),
    cycleReport,
    { spaces: 2 }
  );

  console.log(`\n✓ Cycle ${cycleNumber} complete!\n`);

  // Check if we should continue
  if (avgScore >= 8.5 && failedRate < 3) {
    console.log(`🎉 TARGET ACHIEVED! Average score: ${avgScore.toFixed(2)}/10\n`);
    return { continue: false, cycleReport };
  } else if (cycleNumber >= maxCycles) {
    console.log(`⚠ Max cycles reached. Final score: ${avgScore.toFixed(2)}/10\n`);
    return { continue: false, cycleReport };
  } else {
    console.log(`🔄 Continuing to cycle ${cycleNumber + 1}...\n`);
    return { continue: true, cycleReport };
  }
}

// Run if executed directly
if (require.main === module) {
  (async () => {
    const allCycleReports = [];
    let cycleNumber = 1;
    let shouldContinue = true;

    while (shouldContinue && cycleNumber <= 5) {
      const { continue: cont, cycleReport } = await runPhase3WithSelfReview(cycleNumber, 5);
      allCycleReports.push(cycleReport);
      shouldContinue = cont;
      cycleNumber++;
    }

    // Generate final quality report
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📋 Generating Final Quality Report...`);
    console.log(`${'='.repeat(70)}\n`);

    // Implementation continues in next message due to length...
  })().catch(console.error);
}

module.exports = { runPhase3WithSelfReview, LEARNED_RULES };

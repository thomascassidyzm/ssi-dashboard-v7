#!/usr/bin/env node

/**
 * Self-Review Cycle for Italian Course
 *
 * Regenerates flagged seeds with improved extraction rules
 */

const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');

const COURSE_DIR = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/ita_for_eng_668seeds';
const TRANSLATIONS_FILE = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ita_for_eng_668seeds_translations.json';

// Enhanced Italian prepositions list
const ITALIAN_PREPOSITIONS = [
  // Simple prepositions
  'a', 'di', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',

  // Preposition + article contractions (a + article)
  'al', 'allo', 'alla', 'ai', 'agli', 'alle',

  // di + article
  'del', 'dello', 'della', 'dei', 'degli', 'delle',

  // da + article
  'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle',

  // in + article
  'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',

  // su + article
  'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle',

  // con + article (less common)
  'col', 'coi',

  // Compound prepositions
  'a causa di', 'prima di', 'invece di', 'dopo di', 'oltre a',
  'insieme a', 'vicino a', 'lontano da', 'fino a', 'davanti a'
];

// Improved pattern recognition
const ITALIAN_PATTERNS = {
  // Essential verb phrases that must stay together
  essential_phrases: [
    'mi piace', 'ti piace', 'gli piace', 'le piace', 'ci piace', 'vi piace',
    'ho bisogno di', 'hai bisogno di', 'ha bisogno di', 'abbiamo bisogno di',
    'sto cercando di', 'stai cercando di', 'sta cercando di',
    'non vedo l\'ora', 'non vedo l ora',
    'mi dispiace', 'mi sento', 'ti senti', 'si sente',
    'sono d\'accordo', 'sono d accordo',
    'ho dimenticato', 'mi chiedo', 'ti chiedo'
  ],

  // Modal verbs
  modals: ['devo', 'posso', 'voglio', 'vorrei', 'dovrei', 'potrei', 'so', 'saprei'],

  // Reflexive markers
  reflexive: ['mi', 'ti', 'si', 'ci', 'vi'],

  // Articles
  articles: ['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'l\''],

  // Auxiliary verbs for compound tenses
  auxiliary: ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno', 'sono', 'sei', 'è', 'siamo', 'siete']
};

function generateUUID(content) {
  const hash = crypto.createHash('md5').update(content).digest('hex');
  return hash.substr(0,8) + '-' + hash.substr(8,4) + '-' + hash.substr(12,4) + '-' + hash.substr(16,4) + '-' + hash.substr(20,12);
}

function isPreposition(word) {
  const lower = word.toLowerCase().trim().replace(/[.,!?;:]$/, '');
  return ITALIAN_PREPOSITIONS.includes(lower);
}

function violatesIronRule(legoText) {
  if (!legoText || legoText.trim().length === 0) return true;

  const words = legoText.trim().split(/\s+/);
  if (words.length === 0) return true;

  const firstWord = words[0].replace(/[.,!?;:]$/, '');
  const lastWord = words[words.length - 1].replace(/[.,!?;:]$/, '');

  const firstIsPrep = isPreposition(firstWord);
  const lastIsPrep = isPreposition(lastWord);

  return firstIsPrep || lastIsPrep;
}

// Improved LEGO extraction with learned rules
function extractLEGOsImproved(translation, seedId, attemptNumber) {
  const { target_italian } = translation;
  const text = target_italian.toLowerCase();

  // First, identify essential phrases that must not be split
  const protectedRanges = [];

  for (const phrase of ITALIAN_PATTERNS.essential_phrases) {
    let idx = 0;
    while ((idx = text.indexOf(phrase, idx)) !== -1) {
      protectedRanges.push({
        start: idx,
        end: idx + phrase.length,
        phrase: phrase
      });
      idx += phrase.length;
    }
  }

  // Sort ranges by start position
  protectedRanges.sort((a, b) => a.start - b.start);

  // Now extract LEGOs respecting protected ranges
  const words = target_italian.split(/\s+/);
  const legos = [];
  let currentPos = 0;
  let wordIndex = 0;

  while (wordIndex < words.length) {
    // Check if we're at a protected range
    let protectedRange = null;
    for (const range of protectedRanges) {
      if (currentPos >= range.start && currentPos < range.end) {
        protectedRange = range;
        break;
      }
    }

    if (protectedRange) {
      // Extract the protected phrase as one LEGO
      const phraseWords = protectedRange.phrase.split(/\s+/);
      const legoText = words.slice(wordIndex, wordIndex + phraseWords.length).join(' ');

      if (legoText && !violatesIronRule(legoText)) {
        const position = legos.length + 1;
        legos.push({
          uuid: generateUUID('S' + seedId + 'L' + position + '_' + legoText),
          text: legoText,
          provenance: 'S' + seedId + 'L' + position,
          source_translation_uuid: translation.uuid,
          position: position,
          word_count: phraseWords.length,
          pedagogical_score: 90, // Protected phrases have high value
          protected: true,
          metadata: {
            source_seed_id: seedId,
            attempt_number: attemptNumber
          }
        });
      }

      wordIndex += phraseWords.length;
      currentPos += protectedRange.phrase.length + 1;
    } else {
      // Regular extraction logic
      let bestEnd = wordIndex;
      let bestScore = 0;

      for (let end = wordIndex; end < Math.min(wordIndex + 6, words.length); end++) {
        const candidate = words.slice(wordIndex, end + 1).join(' ');

        // Skip if violates IRON RULE
        if (violatesIronRule(candidate)) continue;

        const wordCount = end - wordIndex + 1;
        let score = 0;

        // Length scoring (2-4 words ideal)
        if (wordCount >= 2 && wordCount <= 4) {
          score += 60;
        } else if (wordCount === 1) {
          score += 30;
        } else {
          score += 20;
        }

        // Pattern bonuses
        const candidateLower = candidate.toLowerCase();

        // Modal + infinitive
        if (ITALIAN_PATTERNS.modals.includes(words[wordIndex].toLowerCase()) && wordCount >= 2) {
          score += 25;
        }

        // Article + noun
        if (ITALIAN_PATTERNS.articles.includes(words[wordIndex].toLowerCase()) && wordCount >= 2) {
          score += 20;
        }

        // Reflexive verb
        if (ITALIAN_PATTERNS.reflexive.includes(words[wordIndex].toLowerCase()) && wordCount >= 2) {
          score += 25;
        }

        // Compound tense (auxiliary + past participle)
        if (ITALIAN_PATTERNS.auxiliary.includes(words[wordIndex].toLowerCase()) && wordCount >= 2) {
          score += 20;
        }

        if (score > bestScore) {
          bestScore = score;
          bestEnd = end;
        }
      }

      // Extract the LEGO
      const legoText = words.slice(wordIndex, bestEnd + 1).join(' ');

      if (legoText && !violatesIronRule(legoText)) {
        const position = legos.length + 1;
        legos.push({
          uuid: generateUUID('S' + seedId + 'L' + position + '_' + legoText + '_v2'),
          text: legoText,
          provenance: 'S' + seedId + 'L' + position,
          source_translation_uuid: translation.uuid,
          position: position,
          word_count: bestEnd - wordIndex + 1,
          pedagogical_score: bestScore,
          protected: false,
          metadata: {
            source_seed_id: seedId,
            attempt_number: attemptNumber
          }
        });
      }

      wordIndex = bestEnd + 1;
      currentPos += legoText.length + 1;
    }
  }

  return legos;
}

function calculateQualityScore(legos, translation) {
  let score = 100;
  const issues = [];

  // IRON RULE (35 points)
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

  // Naturalness (25 points)
  let splitPhrases = 0;
  const fullText = translation.target_italian.toLowerCase();

  for (const phrase of ITALIAN_PATTERNS.essential_phrases) {
    if (fullText.includes(phrase)) {
      const found = legos.some(l => l.text.toLowerCase().includes(phrase));
      if (!found) {
        splitPhrases++;
        issues.push({
          type: 'split_phrase',
          phrase: phrase,
          severity: 'medium'
        });
      }
    }
  }
  score -= (splitPhrases * 5);

  // Pedagogical Value (20 points)
  const legoCount = legos.length;
  if (legoCount < 2) {
    score -= 20;
    issues.push({ type: 'low_lego_count', count: legoCount, severity: 'high' });
  } else if (legoCount > 8) {
    score -= 10;
    issues.push({ type: 'over_fragmented', count: legoCount, severity: 'medium' });
  }

  // Consistency & Edge Cases (20 points)
  const avgPedScore = legos.reduce((sum, l) => sum + l.pedagogical_score, 0) / (legos.length || 1);
  if (avgPedScore < 40) score -= 10;

  const avgWordCount = legos.reduce((sum, l) => sum + l.word_count, 0) / (legos.length || 1);
  if (avgWordCount < 1.8) score -= 10;

  score = Math.max(0, Math.min(100, score));
  const finalScore = parseFloat((score / 10).toFixed(1));

  return {
    score: finalScore,
    issues: issues,
    metrics: {
      lego_count: legoCount,
      iron_rule_violations: ironRuleViolations,
      split_phrases: splitPhrases,
      avg_pedagogical_score: avgPedScore,
      avg_word_count: avgWordCount
    }
  };
}

async function runSelfReviewCycle(cycleNumber) {
  console.log('=== SELF-REVIEW CYCLE ' + cycleNumber + ' ===\n');

  // Load quality report from previous cycle
  const reportPath = path.join(COURSE_DIR, 'phase_outputs', 'phase_3_quality_report.json');
  const report = await fs.readJSON(reportPath);

  // Get flagged seeds
  const flaggedSeeds = report.flagged_seeds.filter(s => s.score < 8.0);
  console.log('Flagged seeds to regenerate: ' + flaggedSeeds.length);

  if (flaggedSeeds.length === 0) {
    console.log('No flagged seeds! Cycle complete.');
    return { improved: 0, totalFlagged: 0, newAvg: report.statistics.avg_quality_score };
  }

  // Load all translations
  const allTranslations = await fs.readJSON(TRANSLATIONS_FILE);
  const translationsMap = {};
  allTranslations.forEach(t => {
    translationsMap[t.seed_id] = t;
  });

  // Regenerate flagged seeds
  let improved = 0;
  const translationDir = path.join(COURSE_DIR, 'amino_acids', 'translations');
  const legoDir = path.join(COURSE_DIR, 'amino_acids', 'legos');

  for (const flagged of flaggedSeeds) {
    const seedId = flagged.seed_id;
    const translation = translationsMap[seedId];

    if (!translation) continue;

    // Load existing translation amino acid for attempt history
    const translationFile = path.join(translationDir, translation.uuid + '.json');
    const existingData = await fs.readJSON(translationFile);

    const attemptNumber = (existingData.metadata.attempt_history || []).length + 1;

    // Re-extract with improved rules
    const newLegos = extractLEGOsImproved(translation, seedId, attemptNumber);
    const newQuality = calculateQualityScore(newLegos, translation);

    // Check if improved
    const oldScore = flagged.score;
    const improvement = newQuality.score - oldScore;

    if (improvement >= 0.5) {
      improved++;

      // Delete old LEGOs
      const oldLegos = await fs.readdir(legoDir);
      for (const file of oldLegos) {
        const lego = await fs.readJSON(path.join(legoDir, file));
        if (lego.metadata && lego.metadata.source_seed_id === seedId) {
          await fs.remove(path.join(legoDir, file));
        }
      }

      // Save new LEGOs
      for (const lego of newLegos) {
        await fs.writeJSON(path.join(legoDir, lego.uuid + '.json'), lego, { spaces: 2 });
      }

      // Update translation with attempt history
      const attemptHistory = existingData.metadata.attempt_history || [];
      attemptHistory.push({
        attempt_number: attemptNumber,
        timestamp: new Date().toISOString(),
        quality_score: newQuality.score,
        lego_count: newLegos.length,
        issues: newQuality.issues,
        improvement: improvement,
        prompt_version: 'v1.' + cycleNumber + '_italian'
      });

      existingData.metadata.attempt_history = attemptHistory;
      existingData.metadata.lego_extraction = {
        lego_count: newLegos.length,
        quality_score: newQuality.score,
        issues: newQuality.issues,
        extracted_at: new Date().toISOString()
      };

      await fs.writeJSON(translationFile, existingData, { spaces: 2 });

      console.log('Seed ' + seedId + ': ' + oldScore.toFixed(1) + ' → ' + newQuality.score.toFixed(1) + ' (✓)');
    } else {
      console.log('Seed ' + seedId + ': ' + oldScore.toFixed(1) + ' → ' + newQuality.score.toFixed(1) + ' (no improvement)');
    }
  }

  console.log('\nCycle ' + cycleNumber + ' complete: ' + improved + '/' + flaggedSeeds.length + ' seeds improved');

  // Recalculate overall quality
  const allSeeds = [];
  const translationFiles = await fs.readdir(translationDir);
  for (const file of translationFiles) {
    const data = await fs.readJSON(path.join(translationDir, file));
    if (data.metadata && data.metadata.lego_extraction) {
      allSeeds.push(data.metadata.lego_extraction.quality_score);
    }
  }

  const newAvg = allSeeds.reduce((a, b) => a + b, 0) / allSeeds.length;
  console.log('New average quality: ' + newAvg.toFixed(2) + '/10\n');

  return { improved, totalFlagged: flaggedSeeds.length, newAvg };
}

async function runAllCycles() {
  console.log('=== STARTING SELF-REVIEW CYCLES ===\n');

  const results = [];
  let currentAvg = 0;

  for (let cycle = 1; cycle <= 5; cycle++) {
    const result = await runSelfReviewCycle(cycle);
    results.push(result);
    currentAvg = result.newAvg;

    // Stop if target achieved
    if (currentAvg >= 8.5 && result.totalFlagged < 40) {
      console.log('✅ TARGET ACHIEVED after cycle ' + cycle);
      break;
    }

    // Stop if no improvement
    if (result.improved === 0 && cycle > 1) {
      console.log('No more improvements possible. Stopping.');
      break;
    }
  }

  console.log('\n=== SELF-REVIEW COMPLETE ===');
  console.log('Final average quality: ' + currentAvg.toFixed(2) + '/10');

  // Save cycle results
  const resultsPath = path.join(COURSE_DIR, 'prompt_evolution', 'cycle_results.json');
  await fs.writeJSON(resultsPath, { results, final_avg: currentAvg }, { spaces: 2 });
}

runAllCycles().catch(console.error);

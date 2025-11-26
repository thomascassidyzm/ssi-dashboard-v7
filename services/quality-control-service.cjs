/**
 * Quality Control Service
 *
 * Analyzes generated audio samples and flags those requiring human review.
 * Detects potential issues like:
 * - Very short words that may have AI artifacts
 * - Unusual durations
 * - Abnormal speech rates
 * - Special characters that may cause pronunciation issues
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Severity levels for flagged issues
 */
const SEVERITY = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

/**
 * Flag type definitions
 */
const FLAG_TYPES = {
  SINGLE_WORD: 'SINGLE_WORD',
  GENERATION_FAILED: 'GENERATION_FAILED'
};

/**
 * Thresholds for quality checks
 */
const THRESHOLDS = {
  maxFlagged: 50  // Maximum samples to flag for review
};

/**
 * CJK language codes (Chinese, Japanese, Korean)
 * These languages use character-based writing systems (no clear word boundaries)
 */
const CJK_LANGUAGES = ['cmn', 'yue', 'jpn', 'kor', 'zh', 'ja', 'ko'];

/**
 * Check if language is CJK (character-based)
 *
 * @param {string} language - Language code
 * @returns {boolean} True if CJK language
 */
function isCJKLanguage(language) {
  return CJK_LANGUAGES.includes(language);
}

/**
 * Analyze samples and flag those needing human review
 *
 * Keep this simple - only flag things we can reliably detect:
 * - Single-word phrases (TTS often has issues with isolated words)
 * - Failed generations
 *
 * For non-CJK languages: Flag ANY single-word phrase, prioritize by character count (shortest first)
 * For CJK languages: Flag single-character only (no clear word boundaries)
 *
 * Sorted by shortest first - so you can review shortest and stop when
 * they get consistently better.
 *
 * @param {Array} generationResults - Array of generation result objects
 * @param {Object} durations - Map of uuid -> duration in seconds
 * @returns {Array} Array of flagged samples with details (sorted shortest first)
 */
function flagSamplesForReview(generationResults, durations) {
  const flagged = [];

  for (const result of generationResults) {
    const flags = [];

    // Flag 1: Failed generations
    if (!result.success) {
      flags.push({
        type: FLAG_TYPES.GENERATION_FAILED,
        severity: SEVERITY.HIGH,
        reason: `Generation failed: ${result.error || 'Unknown error'}`
      });
    }

    // Flag 2: Single-word phrases (TTS issues common with isolated words)
    if (result.success && result.text) {
      const isCJK = isCJKLanguage(result.language);
      const text = result.text.trim();
      const wordCount = text.split(/\s+/).length;
      const charCount = text.length;

      let shouldFlag = false;

      if (isCJK) {
        // CJK: Only flag single-character (no clear word boundaries)
        shouldFlag = charCount === 1;
      } else {
        // Non-CJK: Flag ALL single-word phrases
        shouldFlag = wordCount === 1;
      }

      if (shouldFlag) {
        flags.push({
          type: FLAG_TYPES.SINGLE_WORD,
          severity: SEVERITY.HIGH,
          reason: isCJK
            ? `Single character "${text}" - TTS often produces artifacts`
            : `Single word "${text}" (${charCount} chars) - TTS often produces artifacts for isolated words`
        });
      }
    }

    // If any flags were raised, add to flagged list
    if (flags.length > 0) {
      const duration = durations[result.uuid];
      const text = result.text.trim();
      const wordCount = text.split(/\s+/).length;
      const charCount = text.length;

      flagged.push({
        uuid: result.uuid,
        text: result.text,
        role: result.role,
        cadence: result.cadence,
        language: result.language,
        duration,
        wordCount,
        charCount,
        flags,
        highestSeverity: getHighestSeverity(flags),
        flagCount: flags.length
      });
    }
  }

  // Sort by severity (high first), then by character count (SHORTEST first)
  // This allows reviewing shortest samples and stopping when they get consistently better
  flagged.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.highestSeverity] - severityOrder[a.highestSeverity];

    if (severityDiff !== 0) return severityDiff;

    // Same severity - sort by shortest first
    return a.charCount - b.charCount;
  });

  // Limit to top N samples
  return flagged.slice(0, THRESHOLDS.maxFlagged);
}

/**
 * Get highest severity level from a list of flags
 *
 * @param {Array} flags - Array of flag objects with severity property
 * @returns {string} Highest severity ('high', 'medium', or 'low')
 */
function getHighestSeverity(flags) {
  if (flags.some(f => f.severity === SEVERITY.HIGH)) return SEVERITY.HIGH;
  if (flags.some(f => f.severity === SEVERITY.MEDIUM)) return SEVERITY.MEDIUM;
  return SEVERITY.LOW;
}

/**
 * Generate quality control report in JSON and Markdown formats
 *
 * @param {Array} flaggedSamples - Array of flagged samples from flagSamplesForReview()
 * @param {string} outputPath - Path to save JSON report (MD will be adjacent)
 * @param {string} s3Bucket - S3 bucket name for generating URLs
 * @returns {Object} Object with jsonPath and mdPath
 */
function generateQCReport(flaggedSamples, outputPath, s3Bucket = 'ssi-audio-stage') {
  // Ensure output directory exists
  fs.ensureDirSync(path.dirname(outputPath));

  // Create JSON report
  const report = {
    generated_at: new Date().toISOString(),
    total_flagged: flaggedSamples.length,
    by_severity: {
      high: flaggedSamples.filter(s => s.highestSeverity === SEVERITY.HIGH).length,
      medium: flaggedSamples.filter(s => s.highestSeverity === SEVERITY.MEDIUM).length,
      low: flaggedSamples.filter(s => s.highestSeverity === SEVERITY.LOW).length
    },
    by_flag_type: countByFlagType(flaggedSamples),
    samples: flaggedSamples.map(s => ({
      uuid: s.uuid,
      text: s.text,
      role: s.role,
      cadence: s.cadence,
      language: s.language,
      duration: s.duration,
      word_count: s.wordCount,
      char_count: s.charCount,
      s3_url: `https://${s3Bucket}.s3.amazonaws.com/mastered/${s.uuid}.mp3`,
      highest_severity: s.highestSeverity,
      flags: s.flags
    }))
  };

  fs.writeJsonSync(outputPath, report, { spaces: 2 });

  // Create human-readable Markdown report
  const mdLines = [];
  mdLines.push('# Quality Control Review Report');
  mdLines.push('');
  mdLines.push(`**Generated**: ${new Date().toISOString()}`);
  mdLines.push('');
  mdLines.push('## Summary');
  mdLines.push('');
  mdLines.push(`Total samples flagged for review: **${report.total_flagged}**`);
  mdLines.push('');
  mdLines.push('### By Severity');
  mdLines.push(`- 🔴 High priority: **${report.by_severity.high}**`);
  mdLines.push(`- 🟡 Medium priority: **${report.by_severity.medium}**`);
  mdLines.push(`- 🟢 Low priority: **${report.by_severity.low}**`);
  mdLines.push('');
  mdLines.push('### By Flag Type');
  for (const [flagType, count] of Object.entries(report.by_flag_type)) {
    mdLines.push(`- ${flagType}: ${count}`);
  }
  mdLines.push('');
  mdLines.push('---');
  mdLines.push('');
  mdLines.push('## Flagged Samples');
  mdLines.push('');

  for (let i = 0; i < report.samples.length; i++) {
    const sample = report.samples[i];
    const severityIcon = {
      high: '🔴',
      medium: '🟡',
      low: '🟢'
    }[sample.highest_severity];

    mdLines.push(`### ${i + 1}. ${severityIcon} "${sample.text}"`);
    mdLines.push('');
    mdLines.push('**Details**:');
    mdLines.push(`- UUID: \`${sample.uuid}\``);
    mdLines.push(`- Role: ${sample.role}`);
    mdLines.push(`- Cadence: ${sample.cadence}`);
    mdLines.push(`- Language: ${sample.language}`);
    mdLines.push(`- Duration: ${sample.duration?.toFixed(2)}s`);
    mdLines.push(`- Words: ${sample.word_count} | Characters: ${sample.char_count}`);
    mdLines.push(`- Listen: [🔊 Play on S3](${sample.s3_url})`);
    mdLines.push('');
    mdLines.push('**Flags**:');

    for (const flag of sample.flags) {
      const icon = {
        high: '🔴',
        medium: '🟡',
        low: '🟢'
      }[flag.severity];

      mdLines.push(`- ${icon} **[${flag.severity.toUpperCase()}]** ${flag.type}`);
      mdLines.push(`  - ${flag.reason}`);
    }

    mdLines.push('');
    mdLines.push('---');
    mdLines.push('');
  }

  // Add instructions at the end
  mdLines.push('## Review Instructions');
  mdLines.push('');
  mdLines.push('**Listen to flagged samples** (start with shortest words first):');
  mdLines.push('1. Click S3 links above to listen to each sample');
  mdLines.push('2. Focus on HIGH priority samples first');
  mdLines.push('3. Check for AI artifacts (breathing, laughter, weird sounds)');
  mdLines.push('');
  mdLines.push('**For samples needing regeneration:**');
  mdLines.push('');
  mdLines.push('See: `docs/REGENERATION_STRATEGY.md` for detailed strategies');
  mdLines.push('');
  mdLines.push('Quick options:');
  mdLines.push('- **Automatic retry** (try 2-3 times):');
  mdLines.push('  ```bash');
  mdLines.push('  node scripts/phase8-audio-generation.cjs <course_code> --regenerate UUID1,UUID2,...');
  mdLines.push('  ```');
  mdLines.push('');
  mdLines.push('- **Manual generation** (last resort for persistent issues):');
  mdLines.push('  1. Generate via Azure Speech Studio web interface');
  mdLines.push('  2. Process with: `node scripts/process-audio.cjs`');
  mdLines.push('  3. Import with: `node scripts/import-manual-samples.cjs`');
  mdLines.push('');
  mdLines.push('**Tips:**');
  mdLines.push('- Samples are sorted shortest first - review in order');
  mdLines.push('- Stop when quality becomes consistently acceptable');
  mdLines.push('- Consider accepting minor artifacts for rare/non-critical words');
  mdLines.push('- Don\'t regenerate more than 5 times per sample');
  mdLines.push('');

  const mdPath = outputPath.replace(/\.json$/, '.md');
  fs.writeFileSync(mdPath, mdLines.join('\n'));

  console.log(`✓ Quality control reports generated:`);
  console.log(`  JSON: ${outputPath}`);
  console.log(`  Markdown: ${mdPath}`);

  return { jsonPath: outputPath, mdPath };
}

/**
 * Count samples by flag type
 *
 * @param {Array} flaggedSamples - Array of flagged samples
 * @returns {Object} Map of flag type to count
 */
function countByFlagType(flaggedSamples) {
  const counts = {};

  for (const sample of flaggedSamples) {
    for (const flag of sample.flags) {
      counts[flag.type] = (counts[flag.type] || 0) + 1;
    }
  }

  return counts;
}

/**
 * Filter generation results to only successful samples for QC
 *
 * @param {Array} generationResults - All generation results
 * @returns {Array} Only successful results
 */
function filterSuccessfulResults(generationResults) {
  return generationResults.filter(r => r.success);
}

/**
 * Get summary statistics for QC analysis
 *
 * @param {Array} flaggedSamples - Flagged samples
 * @param {Array} allResults - All generation results
 * @returns {Object} Summary statistics
 */
function getQCSummary(flaggedSamples, allResults) {
  const successful = filterSuccessfulResults(allResults);

  return {
    totalSamples: allResults.length,
    successfulSamples: successful.length,
    failedSamples: allResults.length - successful.length,
    flaggedCount: flaggedSamples.length,
    flaggedPercentage: ((flaggedSamples.length / successful.length) * 100).toFixed(1),
    bySeverity: {
      high: flaggedSamples.filter(s => s.highestSeverity === SEVERITY.HIGH).length,
      medium: flaggedSamples.filter(s => s.highestSeverity === SEVERITY.MEDIUM).length,
      low: flaggedSamples.filter(s => s.highestSeverity === SEVERITY.LOW).length
    }
  };
}

module.exports = {
  flagSamplesForReview,
  generateQCReport,
  getHighestSeverity,
  getQCSummary,
  filterSuccessfulResults,
  isCJKLanguage,
  SEVERITY,
  FLAG_TYPES,
  THRESHOLDS,
  CJK_LANGUAGES
};

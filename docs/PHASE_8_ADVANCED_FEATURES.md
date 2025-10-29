# Phase 8: Advanced Features Design

## Overview

This document outlines the design for advanced Phase 8 features:
1. **Automated Voice Selection** for new languages
2. **Quality Control Flagging** for human review
3. **Comprehensive Error Handling** throughout the pipeline

---

## 1. INTERACTIVE VOICE SELECTION FOR NEW LANGUAGES

### Problem

When generating a course for a new language (e.g., German) where we haven't chosen voices yet, the system should:
- Discover available voices for that language
- Show user the options with quality scores
- Let user (with Claude Code's help) choose the best voices
- Generate sample clips for preview if needed
- Save choices to voice registry

### Implementation Strategy

Voice selection is interactive, NOT automatic. When the Phase 8 script encounters a course with no voice assignments, it errors and instructs the user to ask Claude Code for help. Claude Code then runs the voice discovery functions and helps the user make informed choices.

#### A. Voice Discovery Service

```javascript
// services/voice-discovery-service.cjs

/**
 * Discover available Azure voices for a language
 */
async function discoverAzureVoices(languageCode) {
  // Azure Speech API: GET /cognitiveservices/voices/list
  const response = await fetch(
    `https://${AZURE_REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
    {
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY
      }
    }
  );

  const allVoices = await response.json();

  // Filter by language
  const languageVoices = allVoices.filter(v =>
    v.Locale.startsWith(languageCode) ||
    v.LocaleName.toLowerCase().includes(languageCode)
  );

  return languageVoices.map(v => ({
    id: v.ShortName,
    name: v.LocalName,
    gender: v.Gender,
    locale: v.Locale,
    styles: v.StyleList || [],
    provider: 'azure',
    quality: calculateVoiceQuality(v) // See below
  }));
}

/**
 * Calculate voice quality score based on available features
 */
function calculateVoiceQuality(azureVoice) {
  let score = 50; // Base score

  // Neural voices are higher quality
  if (azureVoice.VoiceType === 'Neural') score += 30;

  // More style options = more versatile
  score += (azureVoice.StyleList?.length || 0) * 5;

  // Multilingual voices get bonus
  if (azureVoice.SecondaryLocaleList?.length > 0) score += 10;

  return Math.min(100, score);
}

/**
 * Select best voices based on criteria
 */
function selectBestVoices(voices, count = 2) {
  // Criteria (in order of priority):
  // 1. Neural voices preferred
  // 2. Diverse genders (1 male, 1 female if possible)
  // 3. Highest quality score
  // 4. No overlapping locale variants

  const neural = voices.filter(v => v.quality >= 70);
  const sorted = neural.sort((a, b) => b.quality - a.quality);

  const selected = [];

  // Try to get one of each gender
  const female = sorted.find(v => v.gender === 'Female');
  const male = sorted.find(v => v.gender === 'Male');

  if (female) selected.push(female);
  if (male && selected.length < count) selected.push(male);

  // Fill remaining slots with highest quality
  while (selected.length < count && sorted.length > 0) {
    const next = sorted.shift();
    if (!selected.includes(next)) {
      selected.push(next);
    }
  }

  return selected;
}
```

#### B. Sample Clip Generation

```javascript
/**
 * Generate sample clips for voice evaluation
 */
async function generateVoiceSamples(voiceId, language, sampleTexts) {
  const SAMPLE_DIR = path.join(__dirname, '../temp/voice_samples');
  await fs.ensureDir(SAMPLE_DIR);

  const samples = [];

  for (let i = 0; i < sampleTexts.length; i++) {
    const outputPath = path.join(SAMPLE_DIR, `${voiceId}_sample${i + 1}.mp3`);

    await azureTTS.generateAudioWithRetry(
      sampleTexts[i],
      voiceId,
      outputPath,
      1.0 // Natural speed
    );

    samples.push({
      text: sampleTexts[i],
      path: outputPath,
      url: `file://${outputPath}` // Can be opened in browser/player
    });
  }

  return samples;
}

/**
 * Get sample sentences for a language
 */
function getSampleSentences(languageCode, count = 5) {
  const samples = {
    'de': [
      'Guten Tag, wie geht es Ihnen?',
      'Ich möchte Deutsch lernen.',
      'Das ist sehr interessant.',
      'Können Sie das wiederholen?',
      'Vielen Dank für Ihre Hilfe.'
    ],
    'fr': [
      'Bonjour, comment allez-vous?',
      'Je veux apprendre le français.',
      'C\'est très intéressant.',
      'Pouvez-vous répéter?',
      'Merci beaucoup pour votre aide.'
    ],
    'es': [
      'Hola, ¿cómo estás?',
      'Quiero aprender español.',
      'Esto es muy interesante.',
      '¿Puedes repetir eso?',
      'Muchas gracias por tu ayuda.'
    ]
    // ... more languages
  };

  return samples[languageCode] || samples['en'];
}
```

#### C. Claude Code Assisted Voice Selection

The workflow:

1. **User runs Phase 8 script** for a course with no voice assignments
2. **Script errors** with message: "Ask Claude Code to help you discover and select voices"
3. **User asks Claude Code**: "Help me select voices for German course"
4. **Claude Code runs** `discoverAndAssignVoices()` function to list available voices
5. **User reviews** the top recommendations and all available voices
6. **User decides** which voices to use (or asks Claude Code to generate sample clips)
7. **Claude Code updates** `voices.json` with the user's choices
8. **User re-runs** Phase 8 script - now succeeds with configured voices

Example interaction:

```
User: "Help me select voices for deu_for_eng_30seeds"

Claude Code: [Runs discoverAndAssignVoices('deu_for_eng_30seeds', 'deu', 'eng')]

Output:
TOP RECOMMENDED VOICES:
----------------------------------------
1. Katja (de-DE-KatjaNeural)
   Gender: Female
   Locale: de-DE
   Quality Score: 85/100
   Reason: Highest quality, Neural voice

2. Conrad (de-DE-ConradNeural)
   Gender: Male
   Locale: de-DE
   Quality Score: 85/100
   Reason: Male for variety, Neural voice

ALL AVAILABLE VOICES:
[... full list ...]

Claude Code: "I recommend Katja and Conrad based on quality and gender diversity.
Would you like me to generate sample clips to preview these voices before
configuring them?"

User: "Yes please"

Claude Code: [Generates sample clips using voiceDiscovery.generateVoiceSamples()]

User: [Listens to samples] "Sounds good, use those"

Claude Code: [Updates voices.json with the assignments]
```

---

## 2. QUALITY CONTROL FLAGGING

### Problem

Some generated clips may have quality issues:
- Very short words (1-2 chars) have genuine TTS artifacts (laughter, breathing, weird sounds)
- Failed generations need to be reviewed

Keep it simple - only flag things we can reliably detect. Don't try to analyze speech rates, durations, or other complex metrics.

### Implementation

```javascript
// services/quality-control-service.cjs

/**
 * Analyze samples and flag those needing human review
 *
 * Keep this SIMPLE - only flag objectively detectable issues:
 * - Failed generations
 * - Very short words (1-2 chars) that have genuine TTS problems
 */
function flagSamplesForReview(generationResults, durations) {
  const flagged = [];

  for (const result of generationResults) {
    const { sample } = result;
    const flags = [];

    // Flag 1: Failed generations
    if (!result.success) {
      flags.push({
        type: 'GENERATION_FAILED',
        severity: 'high',
        reason: `Generation failed: ${result.error || 'Unknown error'}`
      });
    }

    // Flag 2: Very short words (1-2 characters only)
    // These genuinely have TTS issues - artifacts, breathing, etc.
    if (result.success) {
      const wordCount = sample.text.split(/\s+/).length;
      const charCount = sample.text.length;

      if (wordCount === 1 && charCount <= 2) {
        flags.push({
          type: 'VERY_SHORT_WORD',
          severity: 'high',
          reason: `Single word with only ${charCount} char(s) - TTS produces artifacts`
        });
      }
    }

    if (flags.length > 0) {
      const duration = durations[sample.uuid];
      flagged.push({
        uuid: sample.uuid,
        text: sample.text,
        role: sample.role,
        duration,
        flags,
        highestSeverity: getHighestSeverity(flags)
      });
    }
  }

  // Sort by severity, then by shortest words first
  flagged.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    const severityDiff = severityOrder[b.highestSeverity] - severityOrder[a.highestSeverity];
    if (severityDiff !== 0) return severityDiff;
    return a.text.length - b.text.length;
  });

  return flagged.slice(0, 20);
}

function getHighestSeverity(flags) {
  if (flags.some(f => f.severity === 'high')) return 'high';
  return 'low';
}

/**
 * Generate quality control report
 */
function generateQCReport(flaggedSamples, outputPath) {
  const report = {
    generated_at: new Date().toISOString(),
    total_flagged: flaggedSamples.length,
    by_severity: {
      high: flaggedSamples.filter(s => s.highestSeverity === 'high').length,
      medium: flaggedSamples.filter(s => s.highestSeverity === 'medium').length,
      low: flaggedSamples.filter(s => s.highestSeverity === 'low').length
    },
    samples: flaggedSamples.map(s => ({
      uuid: s.uuid,
      text: s.text,
      role: s.role,
      duration: s.duration,
      s3_url: `https://ssi-audio-stage.s3.amazonaws.com/mastered/${s.uuid}.mp3`,
      flags: s.flags
    }))
  };

  fs.writeJsonSync(outputPath, report, { spaces: 2 });

  // Also create human-readable markdown
  const mdLines = [];
  mdLines.push('# Quality Control Review');
  mdLines.push('');
  mdLines.push(`Total samples flagged: ${report.total_flagged}`);
  mdLines.push(`- High priority: ${report.by_severity.high}`);
  mdLines.push(`- Medium priority: ${report.by_severity.medium}`);
  mdLines.push(`- Low priority: ${report.by_severity.low}`);
  mdLines.push('');
  mdLines.push('---');
  mdLines.push('');

  for (const sample of report.samples) {
    mdLines.push(`## ${sample.text}`);
    mdLines.push('');
    mdLines.push(`- **UUID**: \`${sample.uuid}\``);
    mdLines.push(`- **Role**: ${sample.role}`);
    mdLines.push(`- **Duration**: ${sample.duration?.toFixed(2)}s`);
    mdLines.push(`- **Listen**: [${sample.s3_url}](${sample.s3_url})`);
    mdLines.push('');
    mdLines.push('**Flags**:');
    for (const flag of sample.flags) {
      mdLines.push(`- [${flag.severity.toUpperCase()}] ${flag.type}: ${flag.reason}`);
    }
    mdLines.push('');
    mdLines.push('---');
    mdLines.push('');
  }

  const mdPath = outputPath.replace('.json', '.md');
  fs.writeFileSync(mdPath, mdLines.join('\n'));

  return { jsonPath: outputPath, mdPath };
}
```

---

## 3. COMPREHENSIVE ERROR HANDLING

### Error Categories

1. **API Errors**
   - Rate limiting
   - Authentication failures
   - Service outages
   - Network timeouts

2. **Content Filter Rejections**
   - Text flagged as inappropriate
   - Unsupported characters
   - Language detection failures

3. **Processing Errors**
   - Audio corruption
   - ffmpeg failures
   - sox failures

4. **S3 Errors**
   - Upload failures
   - Download failures
   - Permission issues

### Implementation Strategy

```javascript
// services/error-handler-service.cjs

const ERROR_STRATEGIES = {
  // Retry with exponential backoff
  RETRY: 'retry',

  // Skip and continue
  SKIP: 'skip',

  // Use fallback method
  FALLBACK: 'fallback',

  // Abort entire operation
  ABORT: 'abort'
};

/**
 * Classify error and determine strategy
 */
function classifyError(error, context) {
  const errorPatterns = {
    // Transient errors - retry
    'ECONNRESET': ERROR_STRATEGIES.RETRY,
    'ETIMEDOUT': ERROR_STRATEGIES.RETRY,
    'rate limit': ERROR_STRATEGIES.RETRY,
    '429': ERROR_STRATEGIES.RETRY,
    '503': ERROR_STRATEGIES.RETRY,

    // Content issues - skip
    'content policy': ERROR_STRATEGIES.SKIP,
    'inappropriate': ERROR_STRATEGIES.SKIP,
    'unsupported': ERROR_STRATEGIES.SKIP,

    // Auth issues - abort
    '401': ERROR_STRATEGIES.ABORT,
    '403': ERROR_STRATEGIES.ABORT,
    'invalid key': ERROR_STRATEGIES.ABORT,

    // Processing errors - fallback
    'ffmpeg': ERROR_STRATEGIES.FALLBACK,
    'sox': ERROR_STRATEGIES.FALLBACK,
  };

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || error.status;

  for (const [pattern, strategy] of Object.entries(errorPatterns)) {
    if (errorMessage.includes(pattern.toLowerCase()) ||
        errorCode?.toString() === pattern) {
      return {
        strategy,
        pattern,
        retryable: strategy === ERROR_STRATEGIES.RETRY
      };
    }
  }

  // Default: retry once for unknown errors
  return {
    strategy: ERROR_STRATEGIES.RETRY,
    pattern: 'unknown',
    retryable: true
  };
}

/**
 * Execute with error handling
 */
async function executeWithErrorHandling(operation, options = {}) {
  const {
    maxRetries = 3,
    backoffMs = 1000,
    context = {},
    onError = null
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const classification = classifyError(error, context);

      console.warn(`Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      console.warn(`Strategy: ${classification.strategy}`);

      if (classification.strategy === ERROR_STRATEGIES.ABORT) {
        throw new Error(`Aborting: ${error.message}`);
      }

      if (classification.strategy === ERROR_STRATEGIES.SKIP) {
        console.warn(`Skipping due to: ${error.message}`);
        return { skipped: true, reason: error.message };
      }

      if (attempt < maxRetries && classification.retryable) {
        const delay = backoffMs * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }

      // If we get here, all retries exhausted
      if (onError) {
        return onError(error, context);
      }

      throw error;
    }
  }

  throw lastError;
}

/**
 * Log errors for analysis
 */
function logError(error, context) {
  const errorLog = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message,
      code: error.code,
      stack: error.stack
    },
    context
  };

  const logPath = path.join(__dirname, '../logs/phase8-errors.jsonl');
  fs.appendFileSync(logPath, JSON.stringify(errorLog) + '\n');
}
```

### Integration into Main Pipeline

```javascript
// In phase8-audio-generation.cjs

async function generateAudioFile(sample, voiceDetails, outputPath) {
  return await executeWithErrorHandling(
    async () => {
      // Actual generation logic
      await azureTTS.generateAudioWithRetry(...);
    },
    {
      maxRetries: 3,
      context: {
        sample: sample.text,
        voice: voiceDetails.provider_id,
        role: sample.role
      },
      onError: (error) => {
        // Log and mark as failed
        logError(error, { sample, voiceDetails });
        return {
          success: false,
          error: error.message,
          sample
        };
      }
    }
  );
}
```

---

## Integration Checklist

- [x] Implement voice discovery service
- [x] Create sample clip generation
- [x] Implement simple quality control flagging (failed + very short words)
- [x] Generate QC reports after audio generation
- [x] Integrate comprehensive error handling
- [x] Add error logging and analysis
- [x] Document voice selection process (Claude Code assisted)
- [ ] Test with new language (German, French, etc.)
- [ ] Create example workflow documentation

---

## Usage Examples

### New Course Setup

```bash
# Try to run Phase 8 for new course
node scripts/phase8-audio-generation.cjs deu_for_eng_30seeds --plan

# Error: "No voice assignments found. Ask Claude Code to help you discover voices."

# User asks Claude Code: "Help me select voices for deu_for_eng_30seeds"
# Claude Code discovers voices, shows recommendations, helps user choose
# Claude Code updates voices.json with user's choices

# Now run Phase 8 again - works!
node scripts/phase8-audio-generation.cjs deu_for_eng_30seeds --plan
```

### Quality Control

```bash
# After audio generation
# Check: vfs/courses/deu_for_eng_30seeds/quality_control_report.json
# Review flagged samples in browser/audio player
# Regenerate specific samples if needed
```

This is the foundation for a fully automated, high-quality audio generation pipeline! 🎯

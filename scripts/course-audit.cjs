#!/usr/bin/env node
/**
 * Course Audit Agent - "Destroyer of Worlds"
 *
 * Ruthlessly audits SSi language courses for quality issues.
 *
 * Usage:
 *   node scripts/course-audit.cjs spa_for_eng
 *   node scripts/course-audit.cjs spa_for_eng --severity critical
 *   node scripts/course-audit.cjs spa_for_eng --seed-range 1-50
 */

const { supabase, isInitialized } = require('../services/supabase-client.cjs');

// Syllable counting (language-aware)
const SYLLABLE_RATIOS = {
  zh: 1.0,   // Chinese: 1 char ≈ 1 syllable
  ja: 1.5,   // Japanese: 1.5 chars ≈ 1 syllable (hiragana/katakana)
  ko: 1.2,   // Korean: 1.2 chars ≈ 1 syllable
  en: 3.8,   // English: ~3.8 chars ≈ 1 syllable
  es: 3.2,   // Spanish
  fr: 3.5,   // French
  de: 3.0,   // German
  pt: 3.2,   // Portuguese
  it: 3.0,   // Italian
  cy: 3.0,   // Welsh
  default: 3.0
};

function estimateSyllables(text, lang) {
  const ratio = SYLLABLE_RATIOS[lang] || SYLLABLE_RATIOS.default;
  return Math.ceil(text.length / ratio);
}

function getSyllableTier(syllables) {
  if (syllables <= 5) return 'SHORT';
  if (syllables <= 9) return 'MEDIUM';
  return 'LONG';
}

// Tier requirements by seed range
function getTierRequirements(seedNumber) {
  if (seedNumber <= 5) return { SHORT: 0, MEDIUM: 0, LONG: 0 };
  if (seedNumber <= 20) return { SHORT: 1, MEDIUM: 1, LONG: 2 };
  return { SHORT: 2, MEDIUM: 2, LONG: 3 };
}

// Bullshit component detector
const BULLSHIT_PATTERNS = [
  /marker/i,
  /particle/i,
  /tense/i,
  /conjugat/i,
  /suffix/i,
  /prefix/i,
  /aspect/i,
  /inflection/i,
  /grammatical/i,
  /first person/i,
  /second person/i,
  /third person/i,
  /singular/i,
  /plural/i,
  /past tense/i,
  /present tense/i,
  /future tense/i,
  /progressive/i,
  /perfective/i,
  /imperfective/i,
];

function isBullshitComponent(knownText) {
  const text = knownText.toLowerCase();
  // Check for grammar explanation patterns
  for (const pattern of BULLSHIT_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  // Too long = probably an explanation
  if (text.split(/\s+/).length > 4) return true;
  return false;
}

class CourseAuditor {
  constructor(courseCode, options = {}) {
    this.courseCode = courseCode;
    this.seedRange = options.seedRange || null; // {min, max}
    this.issues = {
      critical: [],
      high: [],
      medium: []
    };
    this.stats = {
      seeds: 0,
      legos: 0,
      phrases: 0
    };
  }

  async loadCourseData() {
    console.log(`Loading course data for ${this.courseCode}...`);

    // Get course info
    const { data: course } = await supabase
      .from('courses')
      .select('*')
      .eq('course_code', this.courseCode)
      .single();

    if (!course) {
      throw new Error(`Course ${this.courseCode} not found`);
    }
    this.course = course;

    // Get seeds (with optional range filter)
    let seedQuery = supabase
      .from('course_seeds')
      .select('*')
      .eq('course_code', this.courseCode);
    if (this.seedRange) {
      seedQuery = seedQuery.gte('seed_number', this.seedRange.min).lte('seed_number', this.seedRange.max);
    }
    const { data: seeds } = await seedQuery.order('seed_number');
    this.seeds = seeds || [];
    this.stats.seeds = this.seeds.length;

    // Get LEGOs (with optional range filter)
    let legoQuery = supabase
      .from('course_legos')
      .select('*')
      .eq('course_code', this.courseCode);
    if (this.seedRange) {
      legoQuery = legoQuery.gte('seed_number', this.seedRange.min).lte('seed_number', this.seedRange.max);
    }
    const { data: legos } = await legoQuery.order('seed_number').order('lego_index');
    this.legos = legos || [];
    this.stats.legos = this.legos.length;

    // Get practice phrases (with optional range filter)
    let phraseQuery = supabase
      .from('course_practice_phrases')
      .select('*')
      .eq('course_code', this.courseCode);
    if (this.seedRange) {
      phraseQuery = phraseQuery.gte('seed_number', this.seedRange.min).lte('seed_number', this.seedRange.max);
    }
    const { data: phrases } = await phraseQuery.order('seed_number').order('lego_index').order('position');
    this.phrases = phrases || [];
    this.stats.phrases = this.phrases.length;

    // Build vocabulary timeline (what's available at each point)
    this.buildVocabTimeline();

    console.log(`Loaded: ${this.stats.seeds} seeds, ${this.stats.legos} LEGOs, ${this.stats.phrases} phrases`);
  }

  buildVocabTimeline() {
    // For each seed/lego position, track what vocabulary is available
    this.vocabAtPoint = new Map(); // "S{seed}L{lego}" -> Set of target words

    let availableVocab = new Set();

    for (const lego of this.legos) {
      const key = `S${lego.seed_number}L${lego.lego_index}`;

      // Store what's available BEFORE this LEGO
      this.vocabAtPoint.set(key, new Set(availableVocab));

      // Add this LEGO's vocabulary
      availableVocab.add(lego.target_text.toLowerCase().trim());

      // Add components if M-type
      if (lego.type === 'M' && lego.components) {
        const components = typeof lego.components === 'string'
          ? JSON.parse(lego.components)
          : lego.components;
        for (const comp of components) {
          if (comp.target) {
            availableVocab.add(comp.target.toLowerCase().trim());
          }
        }
      }
    }
  }

  // Check 1: Vocabulary Violations
  checkVocabularyViolations() {
    console.log('Checking vocabulary violations...');

    for (const phrase of this.phrases) {
      const key = `S${phrase.seed_number}L${phrase.lego_index}`;
      const availableVocab = this.vocabAtPoint.get(key);

      if (!availableVocab) continue;

      // Get the current LEGO (it's being introduced, so its vocab IS available)
      const currentLego = this.legos.find(
        l => l.seed_number === phrase.seed_number && l.lego_index === phrase.lego_index
      );
      if (!currentLego) continue;

      // Check if phrase uses words not in available vocab
      // This is a simplified check - a full check would tokenize properly
      const targetWords = phrase.target_text.toLowerCase().split(/\s+/);

      for (const word of targetWords) {
        if (word.length < 2) continue; // Skip short particles

        // Check if this word appears in any available vocab
        let found = false;
        for (const vocab of availableVocab) {
          if (vocab.includes(word) || word.includes(vocab)) {
            found = true;
            break;
          }
        }
        // Also check current LEGO
        if (currentLego.target_text.toLowerCase().includes(word)) {
          found = true;
        }

        // For Chinese/Japanese, do character-level check
        if (['zh', 'ja'].includes(this.course.target_lang)) {
          for (const char of word) {
            for (const vocab of availableVocab) {
              if (vocab.includes(char)) {
                found = true;
                break;
              }
            }
          }
        }
      }
    }
  }

  // Check 2: Tiling Failures
  checkTilingFailures() {
    console.log('Checking tiling failures...');

    for (const seed of this.seeds) {
      const seedLegos = this.legos.filter(l => l.seed_number === seed.seed_number);

      if (seedLegos.length === 0) {
        this.issues.critical.push({
          type: 'TILING_FAILURE',
          seed: seed.seed_number,
          message: `Seed has no LEGOs`,
          known: seed.known_text,
          target: seed.target_text
        });
        continue;
      }

      // Collect all LEGO targets and components
      const availablePieces = new Set();
      for (const lego of seedLegos) {
        availablePieces.add(lego.target_text.toLowerCase().trim());
        if (lego.components) {
          const components = typeof lego.components === 'string'
            ? JSON.parse(lego.components)
            : lego.components;
          for (const comp of components) {
            if (comp.target) {
              availablePieces.add(comp.target.toLowerCase().trim());
            }
          }
        }
      }

      // For Chinese/Japanese, check character coverage
      if (['zh', 'ja'].includes(this.course.target_lang)) {
        const seedChars = new Set(seed.target_text.replace(/\s+/g, '').split(''));
        const availableChars = new Set();
        for (const piece of availablePieces) {
          for (const char of piece) {
            availableChars.add(char);
          }
        }

        const missingChars = [...seedChars].filter(c => !availableChars.has(c));
        if (missingChars.length > 0) {
          this.issues.critical.push({
            type: 'TILING_FAILURE',
            seed: seed.seed_number,
            message: `Missing characters: ${missingChars.join(', ')}`,
            known: seed.known_text,
            target: seed.target_text
          });
        }
      }
    }
  }

  // Check 3: Component Sins
  checkComponentSins() {
    console.log('Checking component sins...');

    for (const lego of this.legos) {
      if (lego.type !== 'M') continue;

      const components = typeof lego.components === 'string'
        ? JSON.parse(lego.components || '[]')
        : (lego.components || []);

      // M-LEGO with no components
      if (components.length === 0) {
        // Check if target is long enough to need components
        const targetLen = lego.target_text.length;
        if (targetLen >= 4 || (this.course.target_lang === 'zh' && targetLen >= 2)) {
          this.issues.critical.push({
            type: 'MISSING_COMPONENTS',
            seed: lego.seed_number,
            lego: lego.lego_index,
            message: `M-LEGO has no components`,
            known: lego.known_text,
            target: lego.target_text
          });
        }
      }

      // Check for bullshit components
      for (const comp of components) {
        if (isBullshitComponent(comp.known)) {
          this.issues.critical.push({
            type: 'BULLSHIT_COMPONENT',
            seed: lego.seed_number,
            lego: lego.lego_index,
            message: `Grammatical explanation instead of real word`,
            component_known: comp.known,
            component_target: comp.target,
            lego_known: lego.known_text
          });
        }
      }
    }
  }

  // Check 4: Phrase Tier Failures
  checkPhraseTierFailures() {
    console.log('Checking phrase tier failures...');

    // Group phrases by LEGO
    const phrasesByLego = new Map();
    for (const phrase of this.phrases) {
      const key = `S${phrase.seed_number}L${phrase.lego_index}`;
      if (!phrasesByLego.has(key)) {
        phrasesByLego.set(key, []);
      }
      phrasesByLego.get(key).push(phrase);
    }

    for (const [key, phrases] of phrasesByLego) {
      const match = key.match(/S(\d+)L(\d+)/);
      const seedNumber = parseInt(match[1]);
      const legoIndex = parseInt(match[2]);

      const requirements = getTierRequirements(seedNumber);
      if (requirements.SHORT === 0) continue; // Skip early seeds

      // Count tiers (skip position 0 = component)
      const tiers = { SHORT: 0, MEDIUM: 0, LONG: 0 };
      for (const phrase of phrases) {
        if (phrase.position === 0) continue; // Component
        const syllables = estimateSyllables(phrase.target_text, this.course.target_lang);
        const tier = getSyllableTier(syllables);
        tiers[tier]++;
      }

      // Check requirements
      const missing = [];
      if (tiers.SHORT < requirements.SHORT) missing.push(`SHORT: ${tiers.SHORT}/${requirements.SHORT}`);
      if (tiers.MEDIUM < requirements.MEDIUM) missing.push(`MEDIUM: ${tiers.MEDIUM}/${requirements.MEDIUM}`);
      if (tiers.LONG < requirements.LONG) missing.push(`LONG: ${tiers.LONG}/${requirements.LONG}`);

      if (missing.length > 0) {
        this.issues.high.push({
          type: 'PHRASE_TIER_FAILURE',
          seed: seedNumber,
          lego: legoIndex,
          message: `Missing phrase tiers: ${missing.join(', ')}`,
          tiers: tiers
        });
      }
    }
  }

  // Check 5: Build-up Gaps
  checkBuildupGaps() {
    console.log('Checking build-up gaps...');

    // Group phrases by LEGO
    const phrasesByLego = new Map();
    for (const phrase of this.phrases) {
      const key = `S${phrase.seed_number}L${phrase.lego_index}`;
      if (!phrasesByLego.has(key)) {
        phrasesByLego.set(key, []);
      }
      phrasesByLego.get(key).push(phrase);
    }

    for (const [key, phrases] of phrasesByLego) {
      const match = key.match(/S(\d+)L(\d+)/);
      const seedNumber = parseInt(match[1]);

      if (seedNumber <= 5) continue; // Skip early seeds

      // Sort by position and get syllable counts
      const sorted = phrases
        .filter(p => p.position > 0) // Skip components
        .sort((a, b) => a.position - b.position);

      const syllableCounts = sorted.map(p =>
        estimateSyllables(p.target_text, this.course.target_lang)
      );

      // Check for gaps (jumps > 5 syllables)
      for (let i = 1; i < syllableCounts.length; i++) {
        const gap = syllableCounts[i] - syllableCounts[i - 1];
        if (gap > 5) {
          this.issues.medium.push({
            type: 'BUILDUP_GAP',
            seed: seedNumber,
            lego: parseInt(match[2]),
            message: `Gap of ${gap} syllables between positions ${i} and ${i + 1}`,
            syllables: syllableCounts
          });
          break; // One report per LEGO
        }
      }

      // Check for missing middle range (no 5-10 syllable phrases)
      const hasMiddle = syllableCounts.some(s => s >= 5 && s <= 10);
      if (!hasMiddle && syllableCounts.length >= 5) {
        this.issues.medium.push({
          type: 'MISSING_MIDDLE_RANGE',
          seed: seedNumber,
          lego: parseInt(match[2]),
          message: `No phrases in 5-10 syllable middle range`,
          syllables: syllableCounts
        });
      }
    }
  }

  // Check 9: ZUT Violations (Zero Uncertainty Translation)
  // CRITICAL: Same known text MUST always map to same target
  // EXCEPTION: M-LEGO components (position 0) are one-time structure reveals
  checkZUTViolations() {
    console.log('Checking ZUT violations (same known → different target)...');

    // Collect all M-LEGO component texts (these are exempt from ZUT)
    const componentTexts = new Set();
    for (const lego of this.legos) {
      if (lego.type === 'M' && lego.components) {
        const components = typeof lego.components === 'string'
          ? JSON.parse(lego.components)
          : lego.components;
        for (const comp of components) {
          if (comp.known) {
            componentTexts.add(comp.known.toLowerCase().trim());
          }
        }
      }
    }

    // Track known→target mappings (EXCLUDING components at position 0)
    const knownToTargets = new Map();

    for (const phrase of this.phrases) {
      // Skip component positions (position 0) - these show M-LEGO internals once
      if (phrase.position === 0) continue;

      const known = phrase.known_text.toLowerCase().trim();
      const target = phrase.target_text.toLowerCase().trim();
      const location = `S${phrase.seed_number}:L${phrase.lego_index}:P${phrase.position}`;

      if (!knownToTargets.has(known)) {
        knownToTargets.set(known, []);
      }
      knownToTargets.get(known).push({ target, location, type: 'phrase' });
    }

    // Also add LEGOs (these are NEVER exempt - LEGOs must be consistent)
    for (const lego of this.legos) {
      const known = lego.known_text.toLowerCase().trim();
      const target = lego.target_text.toLowerCase().trim();
      const location = `S${lego.seed_number}:L${lego.lego_index}:LEGO`;

      if (!knownToTargets.has(known)) {
        knownToTargets.set(known, []);
      }
      knownToTargets.get(known).push({ target, location, type: 'lego' });
    }

    // Find ZUT violations (same known, different targets)
    for (const [known, entries] of knownToTargets) {
      const uniqueTargets = new Set(entries.map(e => e.target));
      if (uniqueTargets.size <= 1) continue;

      // This is a ZUT VIOLATION - same prompt, different answers = learner confusion
      const targets = [...uniqueTargets];
      const firstEntry = entries.find(e => e.target === targets[0]);
      const secondEntry = entries.find(e => e.target === targets[1]);

      // Check if this known text ALSO appears as a component (partial exemption)
      const isAlsoComponent = componentTexts.has(known);

      this.issues.critical.push({
        type: 'ZUT_VIOLATION',
        message: isAlsoComponent
          ? `ZUT violation (also used as M-LEGO component - check if component usage is the only variant)`
          : `ZUT VIOLATION: Same prompt has ${uniqueTargets.size} different translations!`,
        known: known,
        location1: firstEntry?.location,
        target1: targets[0],
        location2: secondEntry?.location,
        target2: targets[1],
        all_targets: targets.slice(0, 5), // Show up to 5 variants
        is_also_component: isAlsoComponent
      });
    }
  }

  // Check 8: Production Uncertainty
  checkProductionUncertainty() {
    console.log('Checking production uncertainty...');

    // Group LEGOs by similar known_text
    const conceptVariants = new Map();

    for (const lego of this.legos) {
      // Extract base concept (e.g., "speak" from "I want to speak")
      const words = lego.known_text.toLowerCase().split(/\s+/);
      const lastWord = words[words.length - 1];

      // Track verb roots
      if (words.some(w => ['to', 'want', 'can', 'will', 'going'].includes(w))) {
        const verb = words.find(w => !['to', 'i', 'want', 'can', 'will', 'am', 'going', 'a', 'the'].includes(w));
        if (verb) {
          if (!conceptVariants.has(verb)) {
            conceptVariants.set(verb, []);
          }
          conceptVariants.get(verb).push({
            seed: lego.seed_number,
            known: lego.known_text,
            target: lego.target_text
          });
        }
      }
    }

    // Flag concepts with too many variants in first 50 seeds
    for (const [concept, variants] of conceptVariants) {
      const earlyVariants = variants.filter(v => v.seed <= 50);
      if (earlyVariants.length >= 4) {
        this.issues.high.push({
          type: 'PRODUCTION_UNCERTAINTY',
          message: `${earlyVariants.length} variants of "${concept}" in first 50 seeds`,
          concept: concept,
          variants: earlyVariants.map(v => ({
            seed: v.seed,
            known: v.known,
            target: v.target
          }))
        });
      }
    }
  }

  async runAudit() {
    await this.loadCourseData();

    // Run all checks
    this.checkTilingFailures();
    this.checkComponentSins();
    this.checkZUTViolations();  // CRITICAL: Same known must always → same target
    this.checkPhraseTierFailures();
    this.checkBuildupGaps();
    this.checkProductionUncertainty();
    // Note: Vocabulary violations and semantic issues need more sophisticated analysis

    return this.generateReport();
  }

  generateReport() {
    const totalIssues = this.issues.critical.length + this.issues.high.length + this.issues.medium.length;
    // Score relative to course size (issues per 100 phrases)
    const issueRate = (this.issues.critical.length * 5 + this.issues.high.length * 2 + this.issues.medium.length * 0.5) / Math.max(1, this.stats.phrases / 100);
    const score = Math.max(0, Math.round(100 - issueRate * 5));

    let report = `# Course Audit Report: ${this.courseCode}\n\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Total Seeds: ${this.stats.seeds} | Total LEGOs: ${this.stats.legos} | Total Phrases: ${this.stats.phrases}\n\n`;

    report += `## Executive Summary\n\n`;
    report += `- **Critical Issues**: ${this.issues.critical.length}\n`;
    report += `- **High Priority**: ${this.issues.high.length}\n`;
    report += `- **Medium Priority**: ${this.issues.medium.length}\n`;
    report += `- **Overall Quality Score**: ${score}/100\n\n`;

    if (score >= 90) {
      report += `Status: Production ready\n\n`;
    } else if (score >= 80) {
      report += `Status: Minor polish needed\n\n`;
    } else if (score >= 70) {
      report += `Status: Significant issues, review before release\n\n`;
    } else if (score >= 60) {
      report += `Status: Major rework needed\n\n`;
    } else {
      report += `Status: Course needs fundamental redesign\n\n`;
    }

    // Critical Issues
    if (this.issues.critical.length > 0) {
      report += `## Critical Issues (Fix Immediately)\n\n`;
      for (const issue of this.issues.critical) {
        report += `### ${issue.type}\n`;
        report += `- **Seed**: ${issue.seed || 'N/A'}`;
        if (issue.lego) report += ` | **LEGO**: ${issue.lego}`;
        report += `\n`;
        report += `- **Message**: ${issue.message}\n`;
        if (issue.known) report += `- **Known**: "${issue.known}"\n`;
        if (issue.target) report += `- **Target**: ${issue.target}\n`;
        if (issue.component_known) report += `- **Component**: "${issue.component_known}" → "${issue.component_target}"\n`;
        if (issue.all_targets) {
          report += `- **Translations**: ${issue.all_targets.map(t => `"${t}"`).join(' vs ')}\n`;
          if (issue.location1) report += `- **First at**: ${issue.location1}\n`;
          if (issue.location2) report += `- **Also at**: ${issue.location2}\n`;
        }
        report += `\n`;
      }
    }

    // High Priority Issues
    if (this.issues.high.length > 0) {
      report += `## High Priority Issues\n\n`;
      for (const issue of this.issues.high) {
        report += `### ${issue.type}\n`;
        if (issue.seed) report += `- **Seed**: ${issue.seed}`;
        if (issue.lego) report += ` | **LEGO**: ${issue.lego}`;
        if (issue.seed || issue.lego) report += `\n`;
        report += `- **Message**: ${issue.message}\n`;
        if (issue.tiers) report += `- **Current tiers**: SHORT=${issue.tiers.SHORT}, MEDIUM=${issue.tiers.MEDIUM}, LONG=${issue.tiers.LONG}\n`;
        if (issue.variants) {
          report += `- **Variants**:\n`;
          for (const v of issue.variants.slice(0, 5)) {
            report += `  - S${v.seed}: "${v.known}" → "${v.target}"\n`;
          }
        }
        report += `\n`;
      }
    }

    // Medium Priority Issues
    if (this.issues.medium.length > 0) {
      report += `## Medium Priority Issues\n\n`;
      for (const issue of this.issues.medium.slice(0, 20)) { // Limit to first 20
        report += `### ${issue.type}\n`;
        if (issue.seed) report += `- **Seed**: ${issue.seed}`;
        if (issue.lego) report += ` | **LEGO**: ${issue.lego}`;
        if (issue.seed || issue.lego) report += `\n`;
        report += `- **Message**: ${issue.message}\n`;
        if (issue.known) report += `- **Known**: "${issue.known}"\n`;
        if (issue.location1) report += `- **Location 1**: ${issue.location1} = "${issue.target1}"\n`;
        if (issue.location2) report += `- **Location 2**: ${issue.location2} = "${issue.target2}"\n`;
        report += `\n`;
      }
      if (this.issues.medium.length > 20) {
        report += `\n*... and ${this.issues.medium.length - 20} more medium issues*\n\n`;
      }
    }

    if (totalIssues === 0) {
      report += `## No Issues Found\n\nCourse passes all automated checks. Consider running semantic review for translation quality.\n`;
    }

    return report;
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  let i = 0;
  while (i < args.length) {
    if (args[i] === '--seed-range' && args[i + 1]) {
      const [min, max] = args[i + 1].split('-').map(Number);
      options.seedRange = { min, max };
      i += 2;
    } else if (!args[i].startsWith('--')) {
      options.courseCode = args[i];
      i++;
    } else {
      i++;
    }
  }
  return options;
}

// Main
async function main() {
  const args = parseArgs();
  const courseCode = args.courseCode;

  if (!courseCode) {
    console.error('Usage: node scripts/course-audit.cjs <course_code> [options]');
    console.error('Example: node scripts/course-audit.cjs spa_for_eng');
    console.error('         node scripts/course-audit.cjs spa_for_eng --seed-range 1-250');
    process.exit(1);
  }

  if (!isInitialized()) {
    console.error('Supabase not initialized. Check SUPABASE_URL and SUPABASE_SERVICE_KEY.');
    process.exit(1);
  }

  try {
    const auditor = new CourseAuditor(courseCode, { seedRange: args.seedRange });
    if (args.seedRange) {
      console.log(`Auditing seeds ${args.seedRange.min}-${args.seedRange.max}`);
    }
    const report = await auditor.runAudit();
    console.log('\n' + report);

    // Write report to file
    const fs = require('fs');
    const reportPath = `./audit-${courseCode}-${Date.now()}.md`;
    fs.writeFileSync(reportPath, report);
    console.log(`\nReport saved to: ${reportPath}`);

  } catch (err) {
    console.error('Audit failed:', err.message);
    process.exit(1);
  }
}

main();

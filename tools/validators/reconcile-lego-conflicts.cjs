#!/usr/bin/env node

/**
 * LEGO Conflict Reconciliation Engine
 *
 * Analyzes lego_pairs.json for conflicts (same KNOWN → different TARGETs)
 * and suggests resolutions following Zero Ambiguity / LUT principles:
 *
 * 1. Capitalization conflicts → auto-normalize
 * 2. ±Article conflicts → keep simpler, upchunk context
 * 3. ±Preposition conflicts → keep base form, upchunk triggering verb
 * 4. Different verbs → both valid, differentiate KNOWN
 *
 * Usage:
 *   node tools/validators/reconcile-lego-conflicts.cjs <course_code>
 *   node tools/validators/reconcile-lego-conflicts.cjs ita_for_eng_test
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE_CODE = process.argv[2];
if (!COURSE_CODE) {
  console.error('Usage: node reconcile-lego-conflicts.cjs <course_code>');
  process.exit(1);
}

const VFS_ROOT = process.env.VFS_ROOT || path.join(__dirname, '../../public/vfs/courses');
const LEGO_FILE = path.join(VFS_ROOT, COURSE_CODE, 'lego_pairs.json');

// Italian prepositions that commonly attach to infinitives
const ITALIAN_PREPS = ['a', 'di', 'da', 'per', 'in'];
const ITALIAN_ARTICLES = ['il', 'lo', 'la', 'i', 'gli', 'le', "l'"];

/**
 * Classify conflict type
 */
function classifyConflict(targets) {
  const normalized = targets.map(t => t.toLowerCase().trim());

  // Check if only capitalization differs
  if (new Set(normalized).size === 1) {
    return { type: 'CAPITALIZATION', auto: true, resolution: 'normalize' };
  }

  // Check for ±preposition pattern
  for (const prep of ITALIAN_PREPS) {
    const withPrep = targets.find(t => t.toLowerCase().startsWith(prep + ' '));
    const withoutPrep = targets.find(t => !t.toLowerCase().startsWith(prep + ' '));
    if (withPrep && withoutPrep) {
      return {
        type: 'PREPOSITION',
        auto: false,
        resolution: 'upchunk',
        simpler: withoutPrep,
        complex: withPrep,
        prep
      };
    }
  }

  // Check for ±article pattern
  for (const art of ITALIAN_ARTICLES) {
    const withArt = targets.find(t => t.toLowerCase().startsWith(art + ' ') || t.toLowerCase().startsWith(art));
    const withoutArt = targets.find(t => !t.toLowerCase().startsWith(art + ' ') && !t.toLowerCase().startsWith(art));
    if (withArt && withoutArt && withArt !== withoutArt) {
      return {
        type: 'ARTICLE',
        auto: false,
        resolution: 'upchunk',
        simpler: withoutArt,
        complex: withArt,
        article: art
      };
    }
  }

  // Check for reflexive variant (-mi, -ti, -si, -ci, -vi endings)
  const reflexiveEndings = ['mi', 'ti', 'si', 'ci', 'vi'];
  for (const ending of reflexiveEndings) {
    const reflexive = targets.find(t => t.toLowerCase().endsWith(ending));
    const base = targets.find(t => !t.toLowerCase().endsWith(ending));
    if (reflexive && base) {
      return {
        type: 'REFLEXIVE',
        auto: false,
        resolution: 'differentiate',
        base,
        reflexive
      };
    }
  }

  // Different semantic choices
  return {
    type: 'SEMANTIC',
    auto: false,
    resolution: 'differentiate',
    variants: targets
  };
}

/**
 * Find context where a LEGO appears
 */
function findContext(seeds, known, target) {
  for (const seed of seeds) {
    for (const lego of seed.legos || []) {
      if (lego.lego.known.toLowerCase() === known && lego.lego.target === target) {
        return {
          seedId: seed.seed_id,
          seedPair: seed.seed_pair,
          lego
        };
      }
    }
  }
  return null;
}

async function main() {
  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║           LEGO CONFLICT RECONCILIATION ENGINE                  ║`);
  console.log(`╠════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Course: ${COURSE_CODE.padEnd(53)}║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝\n`);

  // Load lego_pairs.json
  if (!await fs.pathExists(LEGO_FILE)) {
    console.error(`File not found: ${LEGO_FILE}`);
    process.exit(1);
  }

  const data = await fs.readJson(LEGO_FILE);
  const seeds = data.seeds || [];

  // Collect all LEGOs grouped by KNOWN
  const knownToTargets = new Map();
  const knownToLegos = new Map();
  let totalLegos = 0;
  let aTypeCount = 0;
  let mTypeCount = 0;

  for (const seed of seeds) {
    for (const lego of seed.legos || []) {
      totalLegos++;
      if (lego.type === 'M') mTypeCount++;
      else aTypeCount++;

      const known = lego.lego.known.toLowerCase().trim();

      if (!knownToTargets.has(known)) {
        knownToTargets.set(known, new Set());
        knownToLegos.set(known, []);
      }
      knownToTargets.get(known).add(lego.lego.target);
      knownToLegos.get(known).push({ seed, lego });
    }
  }

  // Find conflicts
  const conflicts = [];
  for (const [known, targets] of knownToTargets) {
    if (targets.size > 1) {
      conflicts.push({
        known,
        targets: Array.from(targets),
        occurrences: knownToLegos.get(known)
      });
    }
  }

  // Statistics
  console.log(`=== STATISTICS ===`);
  console.log(`Total LEGOs: ${totalLegos}`);
  console.log(`  A-type: ${aTypeCount}`);
  console.log(`  M-type: ${mTypeCount}`);
  console.log(`Unique KNOWN values: ${knownToTargets.size}`);
  console.log(`Conflicts found: ${conflicts.length}`);
  console.log(`Conflict rate: ${(conflicts.length / knownToTargets.size * 100).toFixed(1)}%\n`);

  if (conflicts.length === 0) {
    console.log('No conflicts found! All LEGOs have unique KNOWN→TARGET mappings.');
    return;
  }

  // Analyze and categorize conflicts
  const categorized = {
    CAPITALIZATION: [],
    PREPOSITION: [],
    ARTICLE: [],
    REFLEXIVE: [],
    SEMANTIC: []
  };

  for (const conflict of conflicts) {
    const classification = classifyConflict(conflict.targets);
    conflict.classification = classification;
    categorized[classification.type].push(conflict);
  }

  // Report by category
  console.log(`=== CONFLICT ANALYSIS ===\n`);

  // Capitalization (auto-resolve)
  if (categorized.CAPITALIZATION.length > 0) {
    console.log(`📝 CAPITALIZATION CONFLICTS (${categorized.CAPITALIZATION.length}) - Auto-resolvable`);
    console.log(`   Resolution: Normalize to lowercase\n`);
    for (const c of categorized.CAPITALIZATION) {
      console.log(`   "${c.known}" → ${c.targets.join(' / ')}`);
    }
    console.log();
  }

  // Preposition
  if (categorized.PREPOSITION.length > 0) {
    console.log(`🔗 PREPOSITION CONFLICTS (${categorized.PREPOSITION.length}) - Upchunk required`);
    console.log(`   Resolution: Keep base form, upchunk context requiring preposition\n`);
    for (const c of categorized.PREPOSITION) {
      const cls = c.classification;
      console.log(`   "${c.known}"`);
      console.log(`     ✓ Keep: "${cls.simpler}" (base A-type)`);
      console.log(`     ↑ Upchunk: "${cls.complex}" → Include triggering verb as M-type`);

      // Find the context where the preposition version appears
      const context = findContext(seeds, c.known, cls.complex);
      if (context) {
        console.log(`       Context: "${context.seedPair[1]}" → "${context.seedPair[0]}"`);
        console.log(`       Suggested M-type: Find the verb that requires "${cls.prep}"`);
      }
      console.log();
    }
  }

  // Article
  if (categorized.ARTICLE.length > 0) {
    console.log(`📰 ARTICLE CONFLICTS (${categorized.ARTICLE.length}) - Upchunk required`);
    console.log(`   Resolution: Keep simpler, upchunk context requiring article\n`);
    for (const c of categorized.ARTICLE) {
      const cls = c.classification;
      console.log(`   "${c.known}"`);
      console.log(`     ✓ Keep: "${cls.simpler}" (without article)`);
      console.log(`     ↑ Upchunk: "${cls.complex}" → Include context requiring article`);
      console.log();
    }
  }

  // Reflexive
  if (categorized.REFLEXIVE.length > 0) {
    console.log(`🔄 REFLEXIVE CONFLICTS (${categorized.REFLEXIVE.length}) - Differentiate KNOWN`);
    console.log(`   Resolution: Both valid, use different KNOWN phrases\n`);
    for (const c of categorized.REFLEXIVE) {
      const cls = c.classification;
      console.log(`   "${c.known}"`);
      console.log(`     Option A: "${c.known}" → "${cls.base}" (transitive)`);
      console.log(`     Option B: "${c.known} (reflexive)" → "${cls.reflexive}" (reflexive)`);
      console.log();
    }
  }

  // Semantic
  if (categorized.SEMANTIC.length > 0) {
    console.log(`🎯 SEMANTIC CONFLICTS (${categorized.SEMANTIC.length}) - Manual review`);
    console.log(`   Resolution: Different meanings, may both be valid\n`);
    for (const c of categorized.SEMANTIC) {
      console.log(`   "${c.known}" → ${c.targets.join(' / ')}`);
      // Show contexts
      for (const target of c.targets) {
        const context = findContext(seeds, c.known, target);
        if (context) {
          console.log(`     "${target}" in: "${context.seedPair[1]}"`);
        }
      }
      console.log();
    }
  }

  // Summary
  console.log(`=== SUMMARY ===`);
  console.log(`Auto-resolvable: ${categorized.CAPITALIZATION.length}`);
  console.log(`Needs upchunking: ${categorized.PREPOSITION.length + categorized.ARTICLE.length}`);
  console.log(`Needs differentiation: ${categorized.REFLEXIVE.length}`);
  console.log(`Needs manual review: ${categorized.SEMANTIC.length}`);

  // Calculate impact
  const upchunkCount = categorized.PREPOSITION.length + categorized.ARTICLE.length;
  console.log(`\n📈 LATTICE IMPACT`);
  console.log(`Upchunking ${upchunkCount} conflicts will create ${upchunkCount} new M-types`);
  console.log(`This enriches the learning lattice and improves recombination opportunities.`);
}

main().catch(console.error);

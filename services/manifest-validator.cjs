/**
 * Manifest Validator Service
 *
 * Comprehensive validation of course manifest structure and sample coverage.
 * Ported from popty-bach 01_clean_up_course.py to ensure manifest integrity.
 *
 * Validates:
 * - Empty seeds (seeds with no introduction items)
 * - Duplicate nodes (in seeds, intro items, practice nodes)
 * - Duplicate seed sentences (by canonical and known/target text)
 * - Duplicate introduction items
 * - Sample coverage (all text has corresponding samples)
 * - Orphaned samples (samples not used anywhere)
 */

/**
 * Extract tagged examples from presentation/explanation text
 * Handles tags like {target1}, {target2}, {source} with quoted text
 *
 * Pattern: {tag}"text" or {tag}'text'
 * Example: {target1}"Voglio" becomes ("target1", "Voglio")
 */
function extractQuotedExamplesFromExplanation(explanation) {
  if (!explanation) return [];

  // Pattern matches: {tag}["']text["'] followed by space/punctuation/end
  // Uses backreference \2 to match same quote type
  const pattern = /\{(\w+(?:-\w+)?)\}[\s]*([\'\"])(.*?)\2(?=[\s,.;:!?)]|$)/g;

  const results = [];
  let match;

  while ((match = pattern.exec(explanation)) !== null) {
    const tag = match[1];      // e.g., "target1"
    const text = match[3];     // e.g., "Voglio"
    results.push({ tag, text });
  }

  return results;
}

/**
 * Create unique key for a node based on text content
 */
function nodeKey(node) {
  if (!node || !node.known || !node.target) return null;
  return `${node.known.text}|||${node.target.text}`;
}

/**
 * Find seeds with no introduction items
 */
function findEmptySeeds(manifest) {
  const emptySeeds = [];

  for (const slice of manifest.slices || []) {
    for (const seed of slice.seeds || []) {
      if (!seed.introductionItems || seed.introductionItems.length === 0) {
        emptySeeds.push({
          seedId: seed.id,
          knownText: seed.node?.known?.text,
          targetText: seed.node?.target?.text
        });
      }
    }
  }

  return emptySeeds;
}

/**
 * Find duplicate nodes across the entire manifest
 * Checks:
 * - Duplicate intro items (same intro item appears multiple times)
 * - Practice nodes that duplicate seeds
 * - Practice nodes that duplicate intro items
 * - Practice nodes that duplicate earlier practice nodes
 */
function findDuplicateNodes(manifest) {
  const duplicates = [];

  // Collect all seed nodes
  const seedNodes = new Map(); // key -> { node, seedId }

  // Collect ALL intro items (for checking against practice nodes)
  const allIntroItems = new Map(); // key -> { node, introId, seedId }

  // Track intro items we've seen (for detecting duplicate intros)
  const introItemsSeen = new Map(); // key -> { node, introId, seedId }

  // Track all practice nodes we've seen
  const allNodesSeen = new Map(); // key -> { node, location }

  // First pass: Collect all seeds and intro items
  for (const slice of manifest.slices || []) {
    for (const seed of slice.seeds || []) {
      if (seed.node) {
        const key = nodeKey(seed.node);
        if (key) {
          seedNodes.set(key, {
            node: seed.node,
            seedId: seed.id
          });
        }
      }

      for (const item of seed.introductionItems || []) {
        if (item.node) {
          const key = nodeKey(item.node);
          if (key) {
            allIntroItems.set(key, {
              node: item.node,
              introId: item.id,
              seedId: seed.id
            });
          }
        }
      }
    }
  }

  // Second pass: Check for duplicates
  for (const slice of manifest.slices || []) {
    for (const seed of slice.seeds || []) {
      for (const item of seed.introductionItems || []) {
        if (item.node) {
          const key = nodeKey(item.node);
          if (key) {
            // Check if this intro item is a duplicate of an EARLIER intro item
            if (introItemsSeen.has(key)) {
              const original = introItemsSeen.get(key);
              duplicates.push({
                type: 'duplicate_intro_item',
                original: {
                  id: original.introId,
                  seedId: original.seedId,
                  text: original.node
                },
                duplicate: {
                  id: item.id,
                  seedId: seed.id,
                  text: item.node
                },
                message: `Introduction item ${item.id} in seed ${seed.id} is duplicate of earlier intro item ${original.introId} in seed ${original.seedId}`
              });
            }
            introItemsSeen.set(key, {
              node: item.node,
              introId: item.id,
              seedId: seed.id
            });
            allNodesSeen.set(key, {
              node: item.node,
              location: `intro item ${item.id}`
            });
          }
        }

        // Check practice nodes array
        for (const node of item.nodes || []) {
          const key = nodeKey(node);
          if (!key) continue;

          // Practice node is duplicate if it matches:
          // 1. ANY seed node
          if (seedNodes.has(key)) {
            const original = seedNodes.get(key);
            duplicates.push({
              type: 'node_duplicates_seed',
              original: {
                id: original.seedId,
                type: 'seed',
                text: original.node
              },
              duplicate: {
                id: node.id,
                introId: item.id,
                seedId: seed.id,
                text: node
              },
              message: `Practice node in intro item ${item.id} (seed ${seed.id}) duplicates seed ${original.seedId}`
            });
          }
          // 2. ANY intro item (past, present, or future)
          else if (allIntroItems.has(key)) {
            const original = allIntroItems.get(key);
            duplicates.push({
              type: 'node_duplicates_intro',
              original: {
                id: original.introId,
                seedId: original.seedId,
                type: 'intro_item',
                text: original.node
              },
              duplicate: {
                id: node.id,
                introId: item.id,
                seedId: seed.id,
                text: node
              },
              message: `Practice node in intro item ${item.id} (seed ${seed.id}) duplicates intro item ${original.introId} (seed ${original.seedId})`
            });
          }
          // 3. Any earlier practice node
          else if (allNodesSeen.has(key)) {
            const original = allNodesSeen.get(key);
            duplicates.push({
              type: 'node_duplicates_node',
              original: {
                location: original.location,
                text: original.node
              },
              duplicate: {
                id: node.id,
                introId: item.id,
                seedId: seed.id,
                text: node
              },
              message: `Practice node in intro item ${item.id} (seed ${seed.id}) duplicates earlier practice node in ${original.location}`
            });
          } else {
            allNodesSeen.set(key, {
              node: node,
              location: `intro item ${item.id} (seed ${seed.id})`
            });
          }
        }
      }
    }
  }

  return duplicates;
}

/**
 * Find duplicate seed sentences
 * Checks both canonical text and known/target text combinations
 */
function findDuplicateSeedSentences(manifest) {
  const duplicates = [];

  // Track by canonical text
  const seedsByCanonical = new Map(); // canonical -> { seed, index }

  // Track by known/target text
  const seedsByText = new Map(); // key -> { seed, index }

  let seedIndex = 0;
  for (const slice of manifest.slices || []) {
    for (const seed of slice.seeds || []) {
      // Check canonical duplicates
      const canonical = seed.seedSentence?.canonical;
      if (canonical) {
        if (seedsByCanonical.has(canonical)) {
          const original = seedsByCanonical.get(canonical);
          duplicates.push({
            type: 'duplicate_seed_canonical',
            original: {
              id: original.seed.id,
              index: original.index,
              canonical: canonical
            },
            duplicate: {
              id: seed.id,
              index: seedIndex,
              canonical: canonical
            },
            message: `Seed ${seed.id} (index ${seedIndex}) has duplicate CANONICAL text with seed ${original.seed.id} (index ${original.index}): "${canonical}"`
          });
        } else {
          seedsByCanonical.set(canonical, { seed, index: seedIndex });
        }
      }

      // Check known/target text duplicates
      if (seed.node) {
        const key = nodeKey(seed.node);
        if (key) {
          if (seedsByText.has(key)) {
            const original = seedsByText.get(key);

            // Check if already reported as canonical duplicate
            const alreadyReported = duplicates.some(
              d => d.type === 'duplicate_seed_canonical' &&
                   d.original.id === original.seed.id &&
                   d.duplicate.id === seed.id
            );

            if (!alreadyReported) {
              duplicates.push({
                type: 'duplicate_seed_text',
                original: {
                  id: original.seed.id,
                  index: original.index,
                  knownText: original.seed.node.known.text,
                  targetText: original.seed.node.target.text,
                  canonical: original.seed.seedSentence?.canonical
                },
                duplicate: {
                  id: seed.id,
                  index: seedIndex,
                  knownText: seed.node.known.text,
                  targetText: seed.node.target.text,
                  canonical: seed.seedSentence?.canonical
                },
                message: `Seed ${seed.id} (index ${seedIndex}) has duplicate KNOWN/TARGET text with seed ${original.seed.id} (index ${original.index}): "${seed.node.known.text}" / "${seed.node.target.text}"`
              });
            }
          } else {
            seedsByText.set(key, { seed, index: seedIndex });
          }
        }
      }

      seedIndex++;
    }
  }

  return duplicates;
}

/**
 * Find duplicate introduction items
 * Same intro item (known/target text) appears in multiple places
 */
function findDuplicateIntroItems(manifest) {
  const duplicates = [];

  const introItemsByText = new Map(); // key -> { item, seedId }

  for (const slice of manifest.slices || []) {
    for (const seed of slice.seeds || []) {
      for (const item of seed.introductionItems || []) {
        if (item.node) {
          const key = nodeKey(item.node);
          if (key) {
            if (introItemsByText.has(key)) {
              const original = introItemsByText.get(key);
              duplicates.push({
                type: 'duplicate_intro_item',
                original: {
                  id: original.item.id,
                  seedId: original.seedId,
                  knownText: original.item.node.known.text,
                  targetText: original.item.node.target.text
                },
                duplicate: {
                  id: item.id,
                  seedId: seed.id,
                  knownText: item.node.known.text,
                  targetText: item.node.target.text
                },
                message: `Intro item ${item.id} in seed ${seed.id} is duplicate of intro item ${original.item.id} in seed ${original.seedId}`
              });
            } else {
              introItemsByText.set(key, { item, seedId: seed.id });
            }
          }
        }
      }
    }
  }

  return duplicates;
}

/**
 * Sample Validator
 * Walks manifest and builds set of expected samples,
 * then compares against actual samples in manifest.samples
 */
class SampleValidator {
  constructor(manifest) {
    this.manifest = manifest;
    this.expectedSamples = new Set(); // Set of "text|||role"
  }

  addExpectedSample(text, role) {
    if (!text || !role) return;
    this.expectedSamples.add(`${text}|||${role}`);
  }

  processExplanation(explanation) {
    if (!explanation) return;

    const examples = extractQuotedExamplesFromExplanation(explanation);
    for (const { tag, text } of examples) {
      // Map tag to role
      if (tag === 'target1' || tag === 'target2') {
        this.addExpectedSample(text, tag);
      } else if (tag === 'source') {
        this.addExpectedSample(text, 'source');
      } else {
        // Unknown tag, default to target1
        this.addExpectedSample(text, 'target1');
      }
    }
  }

  validateNode(node) {
    if (!node) return;

    const knownText = node.known?.text;
    const targetText = node.target?.text;

    if (knownText) {
      this.addExpectedSample(knownText, 'source');
    }

    if (targetText) {
      this.addExpectedSample(targetText, 'target1');
      this.addExpectedSample(targetText, 'target2');
    }
  }

  validatePresentation(presentation) {
    if (!presentation) return;

    // Presentation text itself needs a sample
    this.addExpectedSample(presentation, 'presentation');

    // Process any tagged examples in the presentation
    this.processExplanation(presentation);
  }

  validateEncouragements(slice) {
    // NOTE: Encouragements are NOT validated for sample coverage here
    // They are added dynamically by the encouragement service after Phase A/B
    // when checking if they already exist in the MAR
    //
    // The encouragements remain in the manifest (pooledEncouragements/orderedEncouragements arrays)
    // but do NOT have sample placeholders until the encouragement service processes them
  }

  validate() {
    for (const slice of this.manifest.slices || []) {
      // Validate encouragements
      this.validateEncouragements(slice);

      // Validate seeds and their contents
      for (const seed of slice.seeds || []) {
        // Seed node
        this.validateNode(seed.node);

        // Introduction items
        for (const item of seed.introductionItems || []) {
          // Item node
          this.validateNode(item.node);

          // Presentation
          this.validatePresentation(item.presentation);

          // Practice nodes
          for (const node of item.nodes || []) {
            this.validateNode(node);
          }
        }
      }
    }

    return this.expectedSamples;
  }
}

/**
 * Find orphaned and missing samples
 * Orphaned: In manifest.samples but not used in content
 * Missing: Expected from content but not in manifest.samples
 */
function findSampleIssues(manifest) {
  const validator = new SampleValidator(manifest);
  const expectedSamples = validator.validate();

  // Collect actual samples from manifest
  const actualSamples = new Set();
  const samplesWithMissingRole = [];

  for (const slice of manifest.slices || []) {
    const samples = slice.samples || {};
    for (const [text, sampleList] of Object.entries(samples)) {
      for (const sample of sampleList) {
        const role = sample.role;
        if (!role) {
          samplesWithMissingRole.push({ text, sample });
          continue;
        }
        actualSamples.add(`${text}|||${role}`);
      }
    }
  }

  // Find orphaned samples (in manifest but not expected)
  const orphanedSamples = [];
  for (const key of actualSamples) {
    if (!expectedSamples.has(key)) {
      const [text, role] = key.split('|||');
      orphanedSamples.push({ text, role });
    }
  }

  // Find missing samples (expected but not in manifest)
  const missingSamples = [];
  for (const key of expectedSamples) {
    if (!actualSamples.has(key)) {
      const [text, role] = key.split('|||');
      missingSamples.push({ text, role });
    }
  }

  return {
    orphanedSamples,
    missingSamples,
    samplesWithMissingRole,
    stats: {
      totalExpected: expectedSamples.size,
      totalActual: actualSamples.size,
      orphanedCount: orphanedSamples.length,
      missingCount: missingSamples.length,
      missingRoleCount: samplesWithMissingRole.length
    }
  };
}

/**
 * Main validation function
 * Runs all validation checks and returns comprehensive report
 */
function validateManifest(manifest) {
  const report = {
    valid: true,
    errors: [],
    warnings: [],
    checks: {}
  };

  // 1. Check for empty seeds
  const emptySeeds = findEmptySeeds(manifest);
  report.checks.emptySeeds = {
    found: emptySeeds.length,
    details: emptySeeds
  };
  if (emptySeeds.length > 0) {
    report.valid = false;
    report.errors.push({
      type: 'empty_seeds',
      count: emptySeeds.length,
      message: `Found ${emptySeeds.length} seeds with no introduction items`,
      details: emptySeeds
    });
  }

  // 2. Check for duplicate nodes
  const duplicateNodes = findDuplicateNodes(manifest);
  report.checks.duplicateNodes = {
    found: duplicateNodes.length,
    details: duplicateNodes
  };
  if (duplicateNodes.length > 0) {
    report.valid = false;
    report.errors.push({
      type: 'duplicate_nodes',
      count: duplicateNodes.length,
      message: `Found ${duplicateNodes.length} duplicate nodes`,
      details: duplicateNodes
    });
  }

  // 3. Check for duplicate seed sentences
  const duplicateSeeds = findDuplicateSeedSentences(manifest);
  report.checks.duplicateSeeds = {
    found: duplicateSeeds.length,
    details: duplicateSeeds
  };
  if (duplicateSeeds.length > 0) {
    report.valid = false;
    report.errors.push({
      type: 'duplicate_seeds',
      count: duplicateSeeds.length,
      message: `Found ${duplicateSeeds.length} duplicate seed sentences`,
      details: duplicateSeeds
    });
  }

  // 4. Check for duplicate introduction items
  const duplicateIntros = findDuplicateIntroItems(manifest);
  report.checks.duplicateIntros = {
    found: duplicateIntros.length,
    details: duplicateIntros
  };
  if (duplicateIntros.length > 0) {
    report.valid = false;
    report.errors.push({
      type: 'duplicate_intro_items',
      count: duplicateIntros.length,
      message: `Found ${duplicateIntros.length} duplicate introduction items`,
      details: duplicateIntros
    });
  }

  // 5. Check sample coverage
  const sampleIssues = findSampleIssues(manifest);
  report.checks.sampleCoverage = sampleIssues;

  if (sampleIssues.missingSamples.length > 0) {
    report.valid = false;
    report.errors.push({
      type: 'missing_samples',
      count: sampleIssues.missingSamples.length,
      message: `Found ${sampleIssues.missingSamples.length} missing sample placeholders`,
      details: sampleIssues.missingSamples
    });
  }

  if (sampleIssues.orphanedSamples.length > 0) {
    report.warnings.push({
      type: 'orphaned_samples',
      count: sampleIssues.orphanedSamples.length,
      message: `Found ${sampleIssues.orphanedSamples.length} orphaned samples (in manifest but not used)`,
      details: sampleIssues.orphanedSamples
    });
  }

  if (sampleIssues.samplesWithMissingRole.length > 0) {
    report.valid = false;
    report.errors.push({
      type: 'missing_role',
      count: sampleIssues.samplesWithMissingRole.length,
      message: `Found ${sampleIssues.samplesWithMissingRole.length} samples with missing role`,
      details: sampleIssues.samplesWithMissingRole
    });
  }

  return report;
}

/**
 * Format validation report for display
 */
function formatValidationReport(report) {
  const lines = [];

  lines.push('='.repeat(60));
  lines.push('Manifest Validation Report');
  lines.push('='.repeat(60));
  lines.push('');

  if (report.valid) {
    lines.push('✅ All validation checks passed!');
    lines.push('');
  } else {
    lines.push('❌ Validation failed - issues found');
    lines.push('');
  }

  // Summary
  lines.push('SUMMARY:');
  lines.push(`  Empty seeds: ${report.checks.emptySeeds.found}`);
  lines.push(`  Duplicate nodes: ${report.checks.duplicateNodes.found}`);
  lines.push(`  Duplicate seeds: ${report.checks.duplicateSeeds.found}`);
  lines.push(`  Duplicate intro items: ${report.checks.duplicateIntros.found}`);
  lines.push(`  Missing samples: ${report.checks.sampleCoverage.stats.missingCount}`);
  lines.push(`  Orphaned samples: ${report.checks.sampleCoverage.stats.orphanedCount}`);
  lines.push('');

  // Errors
  if (report.errors.length > 0) {
    lines.push('ERRORS:');
    for (const error of report.errors) {
      lines.push(`  ❌ ${error.message}`);

      // Show first few details
      if (error.type === 'empty_seeds' && error.details.length > 0) {
        for (const seed of error.details.slice(0, 5)) {
          lines.push(`     - Seed ${seed.seedId}: "${seed.knownText}"`);
        }
        if (error.details.length > 5) {
          lines.push(`     ... and ${error.details.length - 5} more`);
        }
      }

      if (error.type === 'duplicate_nodes' && error.details.length > 0) {
        for (const dup of error.details.slice(0, 5)) {
          lines.push(`     - ${dup.message}`);
        }
        if (error.details.length > 5) {
          lines.push(`     ... and ${error.details.length - 5} more`);
        }
      }

      if (error.type === 'duplicate_seeds' && error.details.length > 0) {
        for (const dup of error.details.slice(0, 5)) {
          lines.push(`     - ${dup.message}`);
        }
        if (error.details.length > 5) {
          lines.push(`     ... and ${error.details.length - 5} more`);
        }
      }

      if (error.type === 'duplicate_intro_items' && error.details.length > 0) {
        for (const dup of error.details.slice(0, 5)) {
          lines.push(`     - ${dup.message}`);
        }
        if (error.details.length > 5) {
          lines.push(`     ... and ${error.details.length - 5} more`);
        }
      }

      if (error.type === 'missing_samples' && error.details.length > 0) {
        for (const sample of error.details.slice(0, 5)) {
          lines.push(`     - "${sample.text}" (role: ${sample.role})`);
        }
        if (error.details.length > 5) {
          lines.push(`     ... and ${error.details.length - 5} more`);
        }
      }

      lines.push('');
    }
  }

  // Warnings
  if (report.warnings.length > 0) {
    lines.push('WARNINGS:');
    for (const warning of report.warnings) {
      lines.push(`  ⚠️  ${warning.message}`);

      if (warning.type === 'orphaned_samples' && warning.details.length > 0) {
        for (const sample of warning.details.slice(0, 5)) {
          lines.push(`     - "${sample.text}" (role: ${sample.role})`);
        }
        if (warning.details.length > 5) {
          lines.push(`     ... and ${warning.details.length - 5} more`);
        }
      }

      lines.push('');
    }
  }

  lines.push('='.repeat(60));

  return lines.join('\n');
}

module.exports = {
  validateManifest,
  formatValidationReport,
  findEmptySeeds,
  findDuplicateNodes,
  findDuplicateSeedSentences,
  findDuplicateIntroItems,
  findSampleIssues
};

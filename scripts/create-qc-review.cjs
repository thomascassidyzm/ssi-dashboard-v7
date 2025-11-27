#!/usr/bin/env node

/**
 * Create QC Review Directory
 *
 * Copies flagged samples from QC report to a review directory with descriptive names
 * for easy listening and verification.
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Create QC review directory from QC report
 *
 * @param {string} courseCode - Course code (e.g., 'spa_for_eng_TEST')
 * @param {string} qcReportPath - Path to qc_report_raw.json
 * @param {string} audioSourceDir - Directory containing the audio files (UUIDs)
 */
async function createQCReviewDirectory(courseCode, qcReportPath, audioSourceDir) {
  console.log('\n=== Creating QC Review Directory ===\n');

  // Read QC report
  const qcReport = await fs.readJson(qcReportPath);
  const flaggedSamples = qcReport.samples || [];

  if (flaggedSamples.length === 0) {
    console.log('✅ No samples flagged for QC. Skipping review directory creation.\n');
    return null;
  }

  // Create review directory
  const reviewDir = path.join(path.dirname(qcReportPath), 'qc_review');
  await fs.ensureDir(reviewDir);

  // Create subdirectories by role
  const roles = ['target1', 'target2', 'source', 'presentation'];
  for (const role of roles) {
    await fs.ensureDir(path.join(reviewDir, role));
  }

  // Create README
  const readme = `QC REVIEW FOR ${courseCode}
${'='.repeat(60)}

Total flagged: ${qcReport.total_flagged} samples
Generated at: ${new Date(qcReport.generated_at).toLocaleString()}

Severity breakdown:
  High priority: ${qcReport.by_severity.high || 0}
  Medium priority: ${qcReport.by_severity.medium || 0}
  Low priority: ${qcReport.by_severity.low || 0}

Flag types:
${Object.entries(qcReport.by_flag_type).map(([type, count]) => `  ${type}: ${count}`).join('\n')}

DIRECTORY STRUCTURE:
  target1/    - Spanish (slow) - Female voice
  target2/    - Spanish (slow) - Male voice
  source/     - English (natural) - Aran voice
  presentation/ - English (natural) - Aran voice

REVIEW PROCESS:
1. Listen to each sample in order
2. Note any that sound unnatural or have artifacts
3. Copy the UUID from the filename for any bad samples
4. Use Claude Code to regenerate specific UUIDs

FILENAME FORMAT:
  [priority]_[text]_[UUID].mp3

Example:
  high_quiero_E4362F8E-AAA6-5F2D-8001-972F1A1A97C7.mp3
`;

  await fs.writeFile(path.join(reviewDir, 'README.txt'), readme);

  // Copy samples with descriptive names
  let copiedCount = 0;
  const copiedByRole = {};

  // Determine base temp directory (for hierarchical structure)
  const tempBase = path.resolve(audioSourceDir, '..');

  for (const sample of flaggedSamples) {
    const { uuid, text, role, cadence, highest_severity } = sample;

    // Sanitize text for filename (remove special chars, spaces)
    const sanitizedText = text
      .toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30); // Limit length

    // Build filename
    const filename = `${highest_severity}_${sanitizedText}_${uuid}.mp3`;
    const destFile = path.join(reviewDir, role, filename);

    // Try hierarchical path first: temp/{courseCode}/{role}/{cadence}/{uuid}.mp3
    const hierarchicalPath = path.join(tempBase, courseCode, role, cadence || 'natural', `${uuid}.mp3`);
    // Fall back to legacy flat path: temp/audio/{uuid}.mp3
    const legacyPath = path.join(audioSourceDir, `${uuid}.mp3`);

    // Find the source file
    let sourceFile = null;
    if (await fs.pathExists(hierarchicalPath)) {
      sourceFile = hierarchicalPath;
    } else if (await fs.pathExists(legacyPath)) {
      sourceFile = legacyPath;
    }

    // Copy file
    if (sourceFile) {
      await fs.copy(sourceFile, destFile);
      copiedCount++;
      copiedByRole[role] = (copiedByRole[role] || 0) + 1;
    } else {
      console.warn(`⚠️  Source file not found: ${uuid}.mp3 (tried hierarchical and legacy paths)`);
    }
  }

  console.log(`✓ Created QC review directory: ${reviewDir}`);
  console.log(`✓ Copied ${copiedCount} flagged samples:\n`);

  for (const [role, count] of Object.entries(copiedByRole)) {
    console.log(`  ${role}: ${count} samples`);
  }

  console.log(`\nℹ️  Review samples in: ${reviewDir}`);
  console.log(`ℹ️  Read instructions: ${path.join(reviewDir, 'README.txt')}\n`);

  return reviewDir;
}

// CLI usage
if (require.main === module) {
  const courseCode = process.argv[2];
  const qcReportPath = process.argv[3];
  const audioSourceDir = process.argv[4];

  if (!courseCode || !qcReportPath || !audioSourceDir) {
    console.error('Usage: node create-qc-review.cjs <courseCode> <qcReportPath> <audioSourceDir>');
    console.error('Example: node create-qc-review.cjs spa_for_eng_TEST vfs/courses/spa_for_eng_TEST/qc_report_raw.json temp/audio');
    process.exit(1);
  }

  createQCReviewDirectory(courseCode, qcReportPath, audioSourceDir)
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Error creating QC review directory:', err);
      process.exit(1);
    });
}

module.exports = { createQCReviewDirectory };

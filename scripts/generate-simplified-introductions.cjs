#!/usr/bin/env node

/**
 * Generate Simplified Introductions
 *
 * Creates a new introductions.json with the simplified format:
 * - Simple template text (no {target1} tags)
 * - Separate target_text field for TTS
 *
 * Input: lego_pairs.json (SSoT)
 * Output: introductions_v2.json
 */

const fs = require('fs-extra');
const path = require('path');

const COURSE = process.argv[2] || 'cmn_for_eng';
const VFS_BASE = path.join(__dirname, '../public/vfs/courses', COURSE);

// Language display names
const LANGUAGE_NAMES = {
  'cmn': 'Chinese',
  'spa': 'Spanish',
  'ita': 'Italian',
  'fra': 'French',
  'deu': 'German',
  'eng': 'English'
};

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log(' GENERATE SIMPLIFIED INTRODUCTIONS');
  console.log(' Course: ' + COURSE);
  console.log('═'.repeat(70));

  try {
    // Load lego_pairs.json (SSoT)
    const legoPairsPath = path.join(VFS_BASE, 'lego_pairs.json');
    const legoPairs = await fs.readJson(legoPairsPath);

    console.log(`\nLoaded lego_pairs.json: ${legoPairs.seeds.length} seeds`);

    // Extract target language from course code (e.g., cmn_for_eng -> cmn)
    const targetLang = COURSE.split('_')[0];
    const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;

    console.log(`Target language: ${targetLangName}`);

    // Build new introductions
    const introductions = {
      version: '2.0.0',
      format: 'simplified',
      course: COURSE,
      target: targetLang,
      known: 'eng',
      generated: new Date().toISOString(),
      presentations: {}
    };

    let atomicCount = 0;
    let molecularCount = 0;

    for (const seed of legoPairs.seeds) {
      const seedSentence = seed.seed_pair.known;

      for (const lego of seed.legos) {
        const legoId = lego.id;
        const knownText = lego.lego.known;
        const targetText = lego.lego.target;
        const legoType = lego.type;

        // Simple template: "The Chinese for '{known}', as in '{seed}', is:"
        const introText = `The ${targetLangName} for '${knownText}', as in '${seedSentence}', is:`;

        introductions.presentations[legoId] = {
          text: introText,
          target_text: targetText,
          type: legoType
        };

        // Also include components for M-type LEGOs (for reference/optional use)
        if (legoType === 'M' && lego.components) {
          introductions.presentations[legoId].components = lego.components.map(c => ({
            known: c.known,
            target: c.target
          }));
        }

        if (legoType === 'A') atomicCount++;
        else molecularCount++;
      }
    }

    const totalCount = Object.keys(introductions.presentations).length;

    console.log(`\nGenerated ${totalCount} introductions:`);
    console.log(`  - Atomic (A): ${atomicCount}`);
    console.log(`  - Molecular (M): ${molecularCount}`);

    // Write output
    const outputPath = path.join(VFS_BASE, 'introductions_v2.json');
    await fs.writeJson(outputPath, introductions, { spaces: 2 });
    console.log(`\nSaved to: ${outputPath}`);

    // Show examples
    console.log('\n' + '-'.repeat(70));
    console.log('EXAMPLES:');
    console.log('-'.repeat(70));

    // Show first atomic example
    const firstAtomic = Object.entries(introductions.presentations)
      .find(([id, data]) => data.type === 'A');
    if (firstAtomic) {
      console.log(`\n[${firstAtomic[0]}] Atomic:`);
      console.log(`  text: "${firstAtomic[1].text}"`);
      console.log(`  target_text: "${firstAtomic[1].target_text}"`);
    }

    // Show first molecular example
    const firstMolecular = Object.entries(introductions.presentations)
      .find(([id, data]) => data.type === 'M');
    if (firstMolecular) {
      console.log(`\n[${firstMolecular[0]}] Molecular:`);
      console.log(`  text: "${firstMolecular[1].text}"`);
      console.log(`  target_text: "${firstMolecular[1].target_text}"`);
      if (firstMolecular[1].components) {
        console.log(`  components: ${firstMolecular[1].components.map(c => `${c.known}=${c.target}`).join(', ')}`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log(' COMPLETE');
    console.log('═'.repeat(70));
    console.log('\nAudio generation for each introduction:');
    console.log('  1. TTS the "text" field with English voice');
    console.log('  2. TTS "target_text" with target1 voice');
    console.log('  3. 1 second pause');
    console.log('  4. TTS "target_text" with target2 voice');
    console.log('  5. Concatenate all segments\n');

  } catch (error) {
    console.error('\nError:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

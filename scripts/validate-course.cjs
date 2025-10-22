#!/usr/bin/env node

/**
 * Course Output Validator
 *
 * Validates all phase outputs against canonical JSON schemas
 * Usage: node scripts/validate-course.cjs <course_code>
 */

const fs = require('fs-extra');
const path = require('path');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true });

// Load schemas
const SCHEMAS = {
  phase1: require('../schemas/phase1-seed_pairs.json'),
  phase3: require('../schemas/phase3-lego_pairs.json'),
  phase5: require('../schemas/phase5-lego_baskets.json')
};

// Compile validators
const validators = {
  phase1: ajv.compile(SCHEMAS.phase1),
  phase3: ajv.compile(SCHEMAS.phase3),
  phase5: ajv.compile(SCHEMAS.phase5)
};

async function validateCourse(courseCode) {
  const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);

  console.log(`\n🔍 Validating course: ${courseCode}`);
  console.log(`📁 Directory: ${courseDir}\n`);

  const results = {
    valid: true,
    errors: []
  };

  // Check Phase 1: seed_pairs.json
  const translationsPath = path.join(courseDir, 'seed_pairs.json');
  if (await fs.pathExists(translationsPath)) {
    const data = await fs.readJson(translationsPath);
    const valid = validators.phase1(data);

    if (!valid) {
      results.valid = false;
      results.errors.push({
        phase: 'Phase 1',
        file: 'seed_pairs.json',
        errors: validators.phase1.errors
      });
      console.log(`❌ Phase 1 (seed_pairs.json): INVALID`);
      console.log(JSON.stringify(validators.phase1.errors, null, 2));
    } else {
      console.log(`✅ Phase 1 (seed_pairs.json): Valid`);
      console.log(`   ${Object.keys(data.translations || {}).length} translations`);
    }
  } else {
    console.log(`⚠️  Phase 1 (seed_pairs.json): Not found`);
  }

  // Check Phase 3: lego_pairs.json
  const legosPath = path.join(courseDir, 'lego_pairs.json');
  if (await fs.pathExists(legosPath)) {
    const data = await fs.readJson(legosPath);
    const valid = validators.phase3(data);

    if (!valid) {
      results.valid = false;
      results.errors.push({
        phase: 'Phase 3',
        file: 'lego_pairs.json',
        errors: validators.phase3.errors
      });
      console.log(`❌ Phase 3 (lego_pairs.json): INVALID`);
      console.log(JSON.stringify(validators.phase3.errors, null, 2));
    } else {
      console.log(`✅ Phase 3 (lego_pairs.json): Valid`);
      console.log(`   ${data.seeds?.length || 0} seed breakdowns`);
    }
  } else {
    console.log(`⚠️  Phase 3 (lego_pairs.json): Not found`);
  }

  // Check Phase 5: lego_baskets.json
  const basketsPath = path.join(courseDir, 'lego_baskets.json');
  if (await fs.pathExists(basketsPath)) {
    const data = await fs.readJson(basketsPath);
    const valid = validators.phase5(data);

    if (!valid) {
      results.valid = false;
      results.errors.push({
        phase: 'Phase 5',
        file: 'lego_baskets.json',
        errors: validators.phase5.errors
      });
      console.log(`❌ Phase 5 (lego_baskets.json): INVALID`);
      console.log(JSON.stringify(validators.phase5.errors, null, 2));
    } else {
      console.log(`✅ Phase 5 (lego_baskets.json): Valid`);
      console.log(`   ${Object.keys(data.baskets || {}).length} baskets`);
    }
  } else {
    console.log(`⚠️  Phase 5 (lego_baskets.json): Not found`);
  }

  console.log(`\n${results.valid ? '✅ COURSE VALID' : '❌ COURSE INVALID'}\n`);

  return results;
}

// Run if called directly
if (require.main === module) {
  const courseCode = process.argv[2];

  if (!courseCode) {
    console.error('Usage: node scripts/validate-course.cjs <course_code>');
    console.error('Example: node scripts/validate-course.cjs spa_for_eng_30seeds');
    process.exit(1);
  }

  validateCourse(courseCode)
    .then(results => {
      process.exit(results.valid ? 0 : 1);
    })
    .catch(err => {
      console.error('Validation error:', err);
      process.exit(1);
    });
}

module.exports = { validateCourse };

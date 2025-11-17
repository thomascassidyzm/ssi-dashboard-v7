#!/usr/bin/env node

/**
 * Compare Generation 0 vs Generation 1
 *
 * Purpose: Measure improvement from fine-tuning, prove self-healing
 *
 * Compares:
 * - Quality scores
 * - FCFS violations
 * - Specific error patterns
 * - Self-healing verification
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

/**
 * Load baseline (Generation 0)
 */
function loadGeneration0() {
  const baselinePath = path.join(__dirname, 'generation-0-baseline.json');
  return JSON.parse(fs.readFileSync(baselinePath, 'utf-8'));
}

/**
 * Load Generation 1 results (if exists)
 */
function loadGeneration1() {
  const gen1Path = path.join(__dirname, 'generation-1-results.json');

  if (!fs.existsSync(gen1Path)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(gen1Path, 'utf-8'));
}

/**
 * Calculate improvement metrics
 */
function calculateImprovement(gen0, gen1) {
  const qualityImprovement = gen1.overall_metrics.average_quality_score - gen0.overall_metrics.average_quality_score;
  const qualityImprovementPercent = (qualityImprovement / gen0.overall_metrics.average_quality_score) * 100;

  const fcfsReduction = gen0.overall_metrics.critical_issues - gen1.overall_metrics.critical_issues;
  const fcfsReductionPercent = (fcfsReduction / gen0.overall_metrics.critical_issues) * 100;

  return {
    quality: {
      gen0: gen0.overall_metrics.average_quality_score,
      gen1: gen1.overall_metrics.average_quality_score,
      improvement: qualityImprovement,
      improvement_percent: qualityImprovementPercent
    },
    fcfs_violations: {
      gen0: gen0.overall_metrics.critical_issues,
      gen1: gen1.overall_metrics.critical_issues,
      reduction: fcfsReduction,
      reduction_percent: fcfsReductionPercent
    },
    total_issues: {
      gen0: gen0.overall_metrics.total_issues,
      gen1: gen1.overall_metrics.total_issues,
      reduction: gen0.overall_metrics.total_issues - gen1.overall_metrics.total_issues
    }
  };
}

/**
 * Check self-healing for specific patterns
 */
function checkSelfHealing(gen0, gen1) {
  const patterns = {
    to_meet: {
      name: '"to meet" FCFS pattern',
      gen0_count: 0,
      gen1_count: 0,
      courses_affected_gen0: [],
      courses_affected_gen1: [],
      healed: false
    },
    to_remember: {
      name: '"to remember" FCFS pattern',
      gen0_count: 0,
      gen1_count: 0,
      courses_affected_gen0: [],
      courses_affected_gen1: [],
      healed: false
    },
    to_go: {
      name: '"to go" FCFS pattern',
      gen0_count: 0,
      gen1_count: 0,
      courses_affected_gen0: [],
      courses_affected_gen1: [],
      healed: false
    }
  };

  // Count Gen 0 occurrences
  for (const course of gen0.by_course) {
    for (const violation of course.fcfs_violations || []) {
      if (violation.known_chunk.toLowerCase().includes('to meet')) {
        patterns.to_meet.gen0_count++;
        if (!patterns.to_meet.courses_affected_gen0.includes(course.course_name)) {
          patterns.to_meet.courses_affected_gen0.push(course.course_name);
        }
      }
      if (violation.known_chunk.toLowerCase().includes('to remember')) {
        patterns.to_remember.gen0_count++;
        if (!patterns.to_remember.courses_affected_gen0.includes(course.course_name)) {
          patterns.to_remember.courses_affected_gen0.push(course.course_name);
        }
      }
      if (violation.known_chunk.toLowerCase().includes('to go')) {
        patterns.to_go.gen0_count++;
        if (!patterns.to_go.courses_affected_gen0.includes(course.course_name)) {
          patterns.to_go.courses_affected_gen0.push(course.course_name);
        }
      }
    }
  }

  // Count Gen 1 occurrences
  for (const course of gen1.by_course) {
    for (const violation of course.fcfs_violations || []) {
      if (violation.known_chunk.toLowerCase().includes('to meet')) {
        patterns.to_meet.gen1_count++;
        if (!patterns.to_meet.courses_affected_gen1.includes(course.course_name)) {
          patterns.to_meet.courses_affected_gen1.push(course.course_name);
        }
      }
      if (violation.known_chunk.toLowerCase().includes('to remember')) {
        patterns.to_remember.gen1_count++;
        if (!patterns.to_remember.courses_affected_gen1.includes(course.course_name)) {
          patterns.to_remember.courses_affected_gen1.push(course.course_name);
        }
      }
      if (violation.known_chunk.toLowerCase().includes('to go')) {
        patterns.to_go.gen1_count++;
        if (!patterns.to_go.courses_affected_gen1.includes(course.course_name)) {
          patterns.to_go.courses_affected_gen1.push(course.course_name);
        }
      }
    }
  }

  // Check if healed
  for (const pattern of Object.values(patterns)) {
    pattern.healed = pattern.gen0_count > 0 && pattern.gen1_count === 0;
  }

  return patterns;
}

/**
 * Generate comparison report
 */
function generateReport(gen0, gen1, improvement, selfHealing) {
  console.log('\n' + '═'.repeat(80));
  console.log(`${colors.bold}${colors.cyan}GENERATION 0 vs GENERATION 1 COMPARISON${colors.reset}`);
  console.log('═'.repeat(80));

  // Model info
  console.log(`\n${colors.magenta}MODELS${colors.reset}`);
  console.log(`  Gen 0: ${gen0.model}`);
  console.log(`  Gen 1: ${gen1.model}`);

  // Overall metrics
  console.log(`\n${colors.magenta}OVERALL QUALITY${colors.reset}`);
  console.log(`  Gen 0: ${gen0.overall_metrics.average_quality_score.toFixed(1)}%`);
  console.log(`  Gen 1: ${gen1.overall_metrics.average_quality_score.toFixed(1)}%`);

  const qualityColor = improvement.quality.improvement > 0 ? colors.green : colors.red;
  console.log(`  ${qualityColor}Improvement: +${improvement.quality.improvement.toFixed(1)}% (${improvement.quality.improvement_percent.toFixed(1)}% relative)${colors.reset}`);

  // FCFS violations
  console.log(`\n${colors.magenta}FCFS VIOLATIONS (Critical Issues)${colors.reset}`);
  console.log(`  Gen 0: ${gen0.overall_metrics.critical_issues}`);
  console.log(`  Gen 1: ${gen1.overall_metrics.critical_issues}`);

  const fcfsColor = improvement.fcfs_violations.reduction > 0 ? colors.green : colors.red;
  console.log(`  ${fcfsColor}Reduction: -${improvement.fcfs_violations.reduction} (-${improvement.fcfs_violations.reduction_percent.toFixed(1)}%)${colors.reset}`);

  // Total issues
  console.log(`\n${colors.magenta}TOTAL ISSUES${colors.reset}`);
  console.log(`  Gen 0: ${gen0.overall_metrics.total_issues}`);
  console.log(`  Gen 1: ${gen1.overall_metrics.total_issues}`);
  console.log(`  ${colors.green}Reduction: -${improvement.total_issues.reduction}${colors.reset}`);

  // Self-healing verification
  console.log(`\n${colors.magenta}SELF-HEALING VERIFICATION${colors.reset}`);
  console.log(`${colors.cyan}Did the model learn from corrections?${colors.reset}\n`);

  for (const [key, pattern] of Object.entries(selfHealing)) {
    const status = pattern.healed ? `${colors.green}✅ HEALED${colors.reset}` :
                   pattern.gen1_count < pattern.gen0_count ? `${colors.yellow}⚠️  IMPROVED${colors.reset}` :
                   `${colors.red}❌ NOT HEALED${colors.reset}`;

    console.log(`  ${pattern.name}:`);
    console.log(`    Gen 0: ${pattern.gen0_count} violations in ${pattern.courses_affected_gen0.length} courses`);
    console.log(`    Gen 1: ${pattern.gen1_count} violations in ${pattern.courses_affected_gen1.length} courses`);
    console.log(`    Status: ${status}`);

    if (pattern.healed) {
      console.log(`    ${colors.green}🎯 Model learned this pattern - error doesn't recur!${colors.reset}`);
    } else if (pattern.gen1_count < pattern.gen0_count) {
      console.log(`    ${colors.yellow}📈 Partial improvement - ${pattern.gen0_count - pattern.gen1_count} fewer violations${colors.reset}`);
    }
    console.log();
  }

  // Course-by-course
  console.log(`${colors.magenta}COURSE-BY-COURSE COMPARISON${colors.reset}\n`);

  for (let i = 0; i < gen0.by_course.length; i++) {
    const course0 = gen0.by_course[i];
    const course1 = gen1.by_course.find(c => c.course_name === course0.course_name);

    if (!course1) continue;

    const qImprove = course1.quality_score - course0.quality_score;
    const fcfsImprove = course0.issues.critical - course1.issues.critical;

    const qColor = qImprove > 0 ? colors.green : qImprove < 0 ? colors.red : colors.gray;
    const fcfsColor = fcfsImprove > 0 ? colors.green : fcfsImprove < 0 ? colors.red : colors.gray;

    console.log(`  ${course0.course_name}:`);
    console.log(`    Quality: ${course0.quality_score.toFixed(1)}% → ${course1.quality_score.toFixed(1)}% ${qColor}(${qImprove > 0 ? '+' : ''}${qImprove.toFixed(1)}%)${colors.reset}`);
    console.log(`    FCFS: ${course0.issues.critical} → ${course1.issues.critical} ${fcfsColor}(${fcfsImprove > 0 ? '-' : '+'}${Math.abs(fcfsImprove)})${colors.reset}`);
  }

  // Success criteria
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`${colors.bold}${colors.cyan}SUCCESS CRITERIA${colors.reset}\n`);

  const criteria = [
    {
      name: 'Quality improves by ≥10%',
      target: 10,
      actual: improvement.quality.improvement,
      met: improvement.quality.improvement >= 10
    },
    {
      name: 'Quality reaches 90%+',
      target: 90,
      actual: gen1.overall_metrics.average_quality_score,
      met: gen1.overall_metrics.average_quality_score >= 90
    },
    {
      name: 'FCFS violations reduce by ≥50%',
      target: 50,
      actual: improvement.fcfs_violations.reduction_percent,
      met: improvement.fcfs_violations.reduction_percent >= 50
    },
    {
      name: 'At least 2 patterns healed',
      target: 2,
      actual: Object.values(selfHealing).filter(p => p.healed).length,
      met: Object.values(selfHealing).filter(p => p.healed).length >= 2
    }
  ];

  for (const criterion of criteria) {
    const status = criterion.met ? `${colors.green}✅ MET${colors.reset}` : `${colors.red}❌ NOT MET${colors.reset}`;
    console.log(`  ${status}  ${criterion.name}`);
    console.log(`         Target: ${criterion.target} | Actual: ${criterion.actual.toFixed(1)}`);
  }

  const allMet = criteria.every(c => c.met);

  console.log(`\n${'═'.repeat(80)}`);
  if (allMet) {
    console.log(`${colors.green}${colors.bold}🎉 ALL SUCCESS CRITERIA MET!${colors.reset}`);
    console.log(`${colors.green}Recursive up-regulation PROVEN ✅${colors.reset}`);
  } else {
    const metCount = criteria.filter(c => c.met).length;
    console.log(`${colors.yellow}${metCount}/${criteria.length} success criteria met${colors.reset}`);
    console.log(`${colors.yellow}Recursive up-regulation PARTIALLY proven${colors.reset}`);
  }
  console.log(`${'═'.repeat(80)}\n`);

  return {
    improvement,
    self_healing: selfHealing,
    success_criteria: criteria,
    all_criteria_met: allMet
  };
}

/**
 * Main execution
 */
function main() {
  console.log(`\n${colors.cyan}Loading Generation 0 baseline...${colors.reset}`);
  const gen0 = loadGeneration0();

  console.log(`${colors.cyan}Loading Generation 1 results...${colors.reset}`);
  const gen1 = loadGeneration1();

  if (!gen1) {
    console.log(`\n${colors.yellow}⚠️  Generation 1 results not found.${colors.reset}`);
    console.log(`\nTo generate Gen 1 results:`);
    console.log(`  1. Fine-tune model completes`);
    console.log(`  2. Run validation on Gen 1 outputs`);
    console.log(`  3. Save results to: ${path.join(__dirname, 'generation-1-results.json')}\n`);
    console.log(`Expected format: Same as generation-0-baseline.json\n`);
    return;
  }

  // Calculate improvements
  const improvement = calculateImprovement(gen0, gen1);

  // Check self-healing
  const selfHealing = checkSelfHealing(gen0, gen1);

  // Generate report
  const results = generateReport(gen0, gen1, improvement, selfHealing);

  // Save comparison results
  const outputPath = path.join(__dirname, 'generation-comparison.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    generation_0: {
      model: gen0.model,
      quality: gen0.overall_metrics.average_quality_score,
      fcfs_violations: gen0.overall_metrics.critical_issues
    },
    generation_1: {
      model: gen1.model,
      quality: gen1.overall_metrics.average_quality_score,
      fcfs_violations: gen1.overall_metrics.critical_issues
    },
    ...results
  }, null, 2));

  console.log(`💾 Comparison saved to: ${outputPath}\n`);
}

if (require.main === module) {
  main();
}

module.exports = { calculateImprovement, checkSelfHealing };

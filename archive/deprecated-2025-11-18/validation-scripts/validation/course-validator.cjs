/**
 * Course Validation Module
 *
 * Checks for missing components across all pipeline phases and provides
 * actionable insights for rerunning missing steps.
 */

const fs = require('fs');
const path = require('path');

/**
 * Expected components for each phase
 * Based on actual APML v8.1.0 specification
 */
const PHASE_REQUIREMENTS = {
  phase_1: {
    name: 'Phase 1: Seed Generation',
    files: ['seed_pairs.json'],
    directories: [],
    description: 'Core sentence pairs that form the foundation of the course'
  },
  phase_3: {
    name: 'Phase 3: LEGO Extraction',
    files: ['lego_pairs.json'],
    directories: [],
    description: 'Extracted LEGO patterns from seed sentences',
    requires: ['phase_1']
  },
  phase_5: {
    name: 'Phase 5: Basket Generation',
    files: ['lego_baskets.json'],
    directories: [],
    description: 'Practice baskets with e-phrases and d-phrases for each LEGO',
    requires: ['phase_3']
  },
  phase_6: {
    name: 'Phase 6: Introduction Generation',
    files: ['introductions.json'],
    directories: [],
    description: 'Known-only introduction phrases for each basket',
    requires: ['phase_5']
  },
  phase_7: {
    name: 'Phase 7: Scaffold Generation',
    files: [],
    directories: ['phase5_outputs', 'phase5_scaffolds'],
    description: 'Individual scaffold outputs for each seed',
    requires: ['phase_6'],
    optional: true  // May not exist for all courses
  }
};

/**
 * Validate a single course
 * @param {string} courseCode - Course code (e.g., 'spa_for_eng')
 * @param {string} vfsRoot - Root VFS directory path
 * @returns {Object} Validation results
 */
function validateCourse(courseCode, vfsRoot = 'public/vfs/courses') {
  const coursePath = path.join(vfsRoot, courseCode);

  if (!fs.existsSync(coursePath)) {
    return {
      courseCode,
      exists: false,
      error: 'Course directory does not exist'
    };
  }

  const results = {
    courseCode,
    exists: true,
    phases: {},
    missing: [],
    completedPhases: [],
    nextPhase: null,
    canProgress: false
  };

  // Check each phase
  for (const [phaseKey, requirements] of Object.entries(PHASE_REQUIREMENTS)) {
    const phaseResult = {
      name: requirements.name,
      description: requirements.description,
      required: true,
      files: {},
      directories: {},
      missing: [],
      complete: true
    };

    // Check required files
    for (const file of requirements.files) {
      const filePath = path.join(coursePath, file);
      const exists = fs.existsSync(filePath);
      phaseResult.files[file] = {
        exists,
        path: exists ? filePath : null,
        size: exists ? fs.statSync(filePath).size : 0
      };

      if (!exists) {
        phaseResult.missing.push({ type: 'file', name: file });
        phaseResult.complete = false;
      }
    }

    // Check required directories
    for (const dir of requirements.directories) {
      const dirPath = path.join(coursePath, dir);
      const exists = fs.existsSync(dirPath);

      let itemCount = 0;
      if (exists) {
        try {
          const items = fs.readdirSync(dirPath).filter(f => !f.startsWith('.'));
          itemCount = items.length;
        } catch (err) {
          itemCount = 0;
        }
      }

      phaseResult.directories[dir] = {
        exists,
        path: exists ? dirPath : null,
        itemCount
      };

      if (!exists) {
        phaseResult.missing.push({ type: 'directory', name: dir });
        phaseResult.complete = false;
      }
    }

    // Check prerequisites
    if (requirements.requires) {
      for (const requiredPhase of requirements.requires) {
        if (results.phases[requiredPhase] && !results.phases[requiredPhase].complete) {
          phaseResult.blockedBy = phaseResult.blockedBy || [];
          phaseResult.blockedBy.push(requiredPhase);
        }
      }
    }

    results.phases[phaseKey] = phaseResult;

    // Track completion
    if (phaseResult.complete) {
      results.completedPhases.push(phaseKey);
    } else {
      results.missing.push({
        phase: phaseKey,
        name: requirements.name,
        items: phaseResult.missing
      });
    }
  }

  // Determine next actionable phase
  const phaseOrder = ['phase_1', 'phase_3', 'phase_5', 'phase_6', 'phase_7'];
  for (const phase of phaseOrder) {
    if (!results.phases[phase].complete && !results.phases[phase].blockedBy) {
      results.nextPhase = phase;
      results.canProgress = true;
      break;
    }
  }

  return results;
}

/**
 * Validate all courses in VFS
 * @param {string} vfsRoot - Root VFS directory path
 * @returns {Object} Validation results for all courses
 */
function validateAllCourses(vfsRoot = 'public/vfs/courses') {
  const results = {
    timestamp: new Date().toISOString(),
    courses: {}
  };

  if (!fs.existsSync(vfsRoot)) {
    return {
      error: 'VFS root does not exist',
      path: vfsRoot
    };
  }

  const courses = fs.readdirSync(vfsRoot)
    .filter(f => {
      const stat = fs.statSync(path.join(vfsRoot, f));
      return stat.isDirectory() && f !== 'archive';
    });

  for (const courseCode of courses) {
    results.courses[courseCode] = validateCourse(courseCode, vfsRoot);
  }

  return results;
}

/**
 * Get actionable recommendations for a course
 * @param {Object} validation - Course validation results
 * @returns {Array} List of actionable recommendations
 */
function getRecommendations(validation) {
  const recommendations = [];

  if (!validation.exists) {
    return [{
      priority: 'critical',
      action: 'create_course',
      message: `Course directory does not exist: ${validation.courseCode}`
    }];
  }

  if (validation.nextPhase) {
    const phase = validation.phases[validation.nextPhase];
    recommendations.push({
      priority: 'high',
      action: `run_${validation.nextPhase}`,
      phase: validation.nextPhase,
      name: phase.name,
      description: phase.description,
      missing: phase.missing,
      message: `Ready to run: ${phase.name}`
    });
  }

  // Check for blocked phases
  for (const [phaseKey, phase] of Object.entries(validation.phases)) {
    if (phase.blockedBy && phase.blockedBy.length > 0) {
      recommendations.push({
        priority: 'info',
        action: 'blocked',
        phase: phaseKey,
        name: phase.name,
        blockedBy: phase.blockedBy,
        message: `${phase.name} is blocked by: ${phase.blockedBy.join(', ')}`
      });
    }
  }

  return recommendations;
}

/**
 * Generate a summary report for a course
 * @param {string} courseCode - Course code
 * @param {string} vfsRoot - Root VFS directory path
 * @returns {Object} Summary report
 */
function generateReport(courseCode, vfsRoot = 'public/vfs/courses') {
  const validation = validateCourse(courseCode, vfsRoot);
  const recommendations = getRecommendations(validation);

  return {
    courseCode,
    timestamp: new Date().toISOString(),
    exists: validation.exists,
    completedPhases: validation.completedPhases,
    nextPhase: validation.nextPhase,
    canProgress: validation.canProgress,
    summary: {
      total_phases: Object.keys(PHASE_REQUIREMENTS).length,
      completed: validation.completedPhases.length,
      missing: validation.missing.length,
      progress_percentage: Math.round(
        (validation.completedPhases.length / Object.keys(PHASE_REQUIREMENTS).length) * 100
      )
    },
    validation,
    recommendations
  };
}

module.exports = {
  PHASE_REQUIREMENTS,
  validateCourse,
  validateAllCourses,
  getRecommendations,
  generateReport
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\n📊 Validating all courses...\n');
    const results = validateAllCourses();
    console.log(JSON.stringify(results, null, 2));
  } else {
    const courseCode = args[0];
    console.log(`\n📊 Validating course: ${courseCode}\n`);
    const report = generateReport(courseCode);
    console.log(JSON.stringify(report, null, 2));
  }
}

#!/usr/bin/env node

/**
 * Launch Course Generation
 *
 * Triggers actual course generation via automation_server.cjs API
 * Runs Italian → Spanish → French sequentially with self-improvement
 */

const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const API_BASE = 'http://localhost:3456';

const COURSES = [
  { target: 'ita', known: 'eng', name: 'Italian for English speakers' },
  { target: 'spa', known: 'eng', name: 'Spanish for English speakers' },
  { target: 'fra', known: 'eng', name: 'French for English speakers' }
];

console.log('\n🚀 Launching Recursive Course Generation');
console.log('═'.repeat(80));
console.log('Courses to generate:');
COURSES.forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.name}`);
});
console.log('═'.repeat(80));
console.log('\n⚠️  IMPORTANT: Make sure automation_server.cjs is running on port 3456');
console.log('   Start with: node automation_server.cjs\n');

async function launchCourse(course, index) {
  const courseNum = index + 1;
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📚 LAUNCHING COURSE ${courseNum}/${COURSES.length}: ${course.name}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const response = await axios.post(`${API_BASE}/api/courses/generate`, {
      target: course.target,
      known: course.known,
      seeds: 668
    });

    console.log(`✅ Course generation started!`);
    console.log(`   Course Code: ${response.data.courseCode}`);
    console.log(`   Status: ${response.data.status.status}`);
    console.log(`   Phase: ${response.data.status.phase}\n`);

    console.log(`🔄 Monitoring progress...`);
    await monitorProgress(response.data.courseCode);

    console.log(`\n✅ ${course.name} COMPLETE!\n`);

    return { success: true, courseCode: response.data.courseCode };

  } catch (error) {
    console.error(`\n❌ Error launching ${course.name}:`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${error.response.data.error || error.message}`);
    } else {
      console.error(`   ${error.message}`);
    }

    if (error.code === 'ECONNREFUSED') {
      console.error(`\n⚠️  automation_server.cjs is not running!`);
      console.error(`   Start it with: node automation_server.cjs\n`);
      process.exit(1);
    }

    return { success: false, error: error.message };
  }
}

async function monitorProgress(courseCode) {
  let lastPhase = '';
  let attempts = 0;
  const maxAttempts = 1800; // 1 hour max (2s intervals)

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${API_BASE}/api/courses/${courseCode}/status`);
      const status = response.data;

      if (status.phase !== lastPhase) {
        console.log(`   📍 ${status.phase} (${status.progress}%)`);
        lastPhase = status.phase;
      }

      if (status.status === 'completed') {
        return true;
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'Course generation failed');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

    } catch (error) {
      if (error.response?.status === 404) {
        // Course not found yet, wait
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;
      } else {
        throw error;
      }
    }
  }

  throw new Error('Timeout: Course generation took too long');
}

async function main() {
  console.log('🔍 Checking automation server...\n');

  try {
    await axios.get(`${API_BASE}/api/health`);
    console.log('✅ Automation server is running!\n');
  } catch (error) {
    console.error('❌ Cannot connect to automation server!');
    console.error('   Make sure it\'s running: node automation_server.cjs\n');
    process.exit(1);
  }

  const results = [];

  for (let i = 0; i < COURSES.length; i++) {
    const result = await launchCourse(COURSES[i], i);
    results.push({ ...COURSES[i], ...result });

    if (!result.success) {
      console.error(`\n⛔ Stopping due to failure in ${COURSES[i].name}\n`);
      break;
    }

    // Pause between courses for human review
    if (i < COURSES.length - 1) {
      console.log('\n⏸️  Pausing for improvement review...');
      console.log('   Review results and proposed improvements');
      console.log('   Press any key to continue to next course...\n');

      // In production, this would wait for user input
      // For automated run, we'll just continue
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Final summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('🎉 COURSE GENERATION COMPLETE!');
  console.log(`${'='.repeat(80)}\n`);

  results.forEach((r, i) => {
    const status = r.success ? '✅' : '❌';
    console.log(`${status} Course ${i + 1}: ${r.name} ${r.success ? `(${r.courseCode})` : `(${r.error})`}`);
  });

  const successCount = results.filter(r => r.success).length;
  console.log(`\n📊 Final: ${successCount}/${COURSES.length} courses generated successfully\n`);
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

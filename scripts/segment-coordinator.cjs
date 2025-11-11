#!/usr/bin/env node
const fs = require('fs-extra');
const path = require('path');

/**
 * Segment Coordinator
 *
 * Manages segmentation of large courses into 100-seed chunks for parallel processing.
 * Handles segment creation, progress tracking, and aggregate reporting.
 */

/**
 * Calculate segments for a course
 *
 * @param {number} startSeed - First seed number (e.g., 1)
 * @param {number} endSeed - Last seed number (e.g., 668)
 * @param {number} segmentSize - Size of each segment (default: 100)
 * @returns {Array} Array of segment objects
 */
function calculateSegments(startSeed, endSeed, segmentSize = 100) {
  const segments = [];
  let currentStart = startSeed;

  while (currentStart <= endSeed) {
    const currentEnd = Math.min(currentStart + segmentSize - 1, endSeed);
    const count = currentEnd - currentStart + 1;

    segments.push({
      id: `s${String(currentStart).padStart(4, '0')}-${String(currentEnd).padStart(4, '0')}`,
      start: currentStart,
      end: currentEnd,
      count: count,
      status: 'pending',
      progress: 0,
      phases_completed: [],
      current_phase: null
    });

    currentStart = currentEnd + 1;
  }

  return segments;
}

/**
 * Create segment directory structure
 *
 * @param {string} courseDir - Course directory path
 * @param {Array} segments - Segment array from calculateSegments()
 * @param {string} courseCode - Course code (e.g., "spa_for_eng")
 * @param {string} parentJobId - Parent job ID for tracking
 */
async function createSegmentStructure(courseDir, segments, courseCode, parentJobId) {
  const segmentsDir = path.join(courseDir, 'segments');
  await fs.ensureDir(segmentsDir);

  console.log(`📁 Creating ${segments.length} segment directories...\n`);

  for (const segment of segments) {
    const segmentDir = path.join(segmentsDir, segment.id);
    await fs.ensureDir(segmentDir);
    await fs.ensureDir(path.join(segmentDir, 'phase5_scaffolds'));
    await fs.ensureDir(path.join(segmentDir, 'phase5_outputs'));

    // Write segment metadata
    const metadata = {
      segment_id: segment.id,
      course_code: courseCode,
      parent_job_id: parentJobId,
      seed_range: {
        start: segment.start,
        end: segment.end,
        count: segment.count
      },
      phases_completed: [],
      current_phase: null,
      status: 'pending',
      progress: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await fs.writeJson(
      path.join(segmentDir, '_segment_metadata.json'),
      metadata,
      { spaces: 2 }
    );

    console.log(`✅ ${segment.id}: ${segment.count} seeds`);
  }

  console.log(`\n📊 Segment structure created in: ${segmentsDir}`);
}

/**
 * Update segment progress
 *
 * @param {string} courseDir - Course directory path
 * @param {string} segmentId - Segment ID (e.g., "s0001-0100")
 * @param {number} phase - Phase number (1-6)
 * @param {string} status - Status: 'pending', 'in_progress', 'completed', 'failed'
 * @param {number} progress - Progress percentage (0-100)
 */
async function updateSegmentProgress(courseDir, segmentId, phase, status, progress = null) {
  const metadataPath = path.join(
    courseDir,
    'segments',
    segmentId,
    '_segment_metadata.json'
  );

  if (!await fs.pathExists(metadataPath)) {
    throw new Error(`Segment metadata not found: ${metadataPath}`);
  }

  const metadata = await fs.readJson(metadataPath);

  // Update phases_completed
  if (status === 'completed' && phase && !metadata.phases_completed.includes(phase)) {
    metadata.phases_completed.push(phase);
    metadata.phases_completed.sort((a, b) => a - b);
  }

  metadata.current_phase = phase;
  metadata.status = status;

  if (progress !== null) {
    metadata.progress = progress;
  }

  metadata.updated_at = new Date().toISOString();

  await fs.writeJson(metadataPath, metadata, { spaces: 2 });

  return metadata;
}

/**
 * Get aggregate progress across all segments
 *
 * @param {string} courseDir - Course directory path
 * @param {Array} segments - Segment array
 * @returns {Object} Aggregate progress data
 */
async function getAggregateProgress(courseDir, segments) {
  const segmentStatuses = [];
  let completedSegments = 0;
  let inProgressSegments = 0;
  let pendingSegments = 0;
  let failedSegments = 0;

  for (const segment of segments) {
    const metadataPath = path.join(
      courseDir,
      'segments',
      segment.id,
      '_segment_metadata.json'
    );

    if (await fs.pathExists(metadataPath)) {
      const metadata = await fs.readJson(metadataPath);

      segmentStatuses.push({
        id: segment.id,
        status: metadata.status,
        progress: metadata.progress,
        current_phase: metadata.current_phase,
        phases_completed: metadata.phases_completed
      });

      if (metadata.status === 'completed') completedSegments++;
      else if (metadata.status === 'in_progress') inProgressSegments++;
      else if (metadata.status === 'failed') failedSegments++;
      else pendingSegments++;
    } else {
      // Metadata doesn't exist yet
      segmentStatuses.push({
        id: segment.id,
        status: 'pending',
        progress: 0,
        current_phase: null,
        phases_completed: []
      });
      pendingSegments++;
    }
  }

  const totalSegments = segments.length;
  const overallPercent = Math.round((completedSegments / totalSegments) * 100);

  return {
    total_segments: totalSegments,
    completed: completedSegments,
    in_progress: inProgressSegments,
    pending: pendingSegments,
    failed: failedSegments,
    overall_percent: overallPercent,
    segments: segmentStatuses
  };
}

/**
 * Create course metadata file
 *
 * @param {string} courseDir - Course directory path
 * @param {string} courseCode - Course code
 * @param {number} totalSeeds - Total number of seeds
 * @param {number} startSeed - First seed number
 * @param {number} endSeed - Last seed number
 * @param {Array} segments - Segment array
 * @param {string} parentJobId - Parent job ID
 */
async function createCourseMetadata(courseDir, courseCode, totalSeeds, startSeed, endSeed, segments, parentJobId) {
  const metadata = {
    course_code: courseCode,
    parent_job_id: parentJobId,
    total_seeds: totalSeeds,
    seed_range: {
      start: startSeed,
      end: endSeed
    },
    segmentation: {
      enabled: true,
      segment_size: 100,
      total_segments: segments.length,
      segments: segments.map(s => ({
        id: s.id,
        start: s.start,
        end: s.end,
        count: s.count,
        status: 'pending',
        phases_completed: []
      }))
    },
    aggregate_progress: {
      segments_completed: 0,
      segments_in_progress: 0,
      segments_pending: segments.length,
      segments_failed: 0,
      overall_percent: 0
    },
    current_phase: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const metadataPath = path.join(courseDir, '_course_metadata.json');
  await fs.writeJson(metadataPath, metadata, { spaces: 2 });

  console.log(`\n📝 Course metadata created: ${metadataPath}`);
  return metadata;
}

/**
 * Update course metadata with current aggregate progress
 *
 * @param {string} courseDir - Course directory path
 * @param {number} currentPhase - Current phase being processed
 */
async function updateCourseMetadata(courseDir, currentPhase = null) {
  const metadataPath = path.join(courseDir, '_course_metadata.json');

  if (!await fs.pathExists(metadataPath)) {
    throw new Error(`Course metadata not found: ${metadataPath}`);
  }

  const metadata = await fs.readJson(metadataPath);
  const aggregateProgress = await getAggregateProgress(
    courseDir,
    metadata.segmentation.segments
  );

  metadata.aggregate_progress = {
    segments_completed: aggregateProgress.completed,
    segments_in_progress: aggregateProgress.in_progress,
    segments_pending: aggregateProgress.pending,
    segments_failed: aggregateProgress.failed,
    overall_percent: aggregateProgress.overall_percent
  };

  // Update segment statuses in metadata
  metadata.segmentation.segments = aggregateProgress.segments.map(s => {
    const original = metadata.segmentation.segments.find(seg => seg.id === s.id);
    return {
      ...original,
      status: s.status,
      phases_completed: s.phases_completed
    };
  });

  if (currentPhase !== null) {
    metadata.current_phase = currentPhase;
  }

  metadata.updated_at = new Date().toISOString();

  await fs.writeJson(metadataPath, metadata, { spaces: 2 });

  return metadata;
}

/**
 * Print segment status report
 *
 * @param {string} courseDir - Course directory path
 */
async function printSegmentReport(courseDir) {
  const metadataPath = path.join(courseDir, '_course_metadata.json');

  if (!await fs.pathExists(metadataPath)) {
    console.error('❌ Course metadata not found');
    return;
  }

  const metadata = await fs.readJson(metadataPath);
  const progress = await getAggregateProgress(courseDir, metadata.segmentation.segments);

  console.log('\n' + '='.repeat(60));
  console.log(`📊 SEGMENT STATUS REPORT`);
  console.log('='.repeat(60));
  console.log(`Course: ${metadata.course_code}`);
  console.log(`Seeds: ${metadata.seed_range.start}-${metadata.seed_range.end} (${metadata.total_seeds} total)`);
  console.log(`Segments: ${progress.total_segments}`);
  console.log(`Progress: ${progress.overall_percent}% (${progress.completed}/${progress.total_segments} complete)`);
  console.log('');

  progress.segments.forEach(segment => {
    const statusIcon = segment.status === 'completed' ? '✅' :
                       segment.status === 'in_progress' ? '⏳' :
                       segment.status === 'failed' ? '❌' : '⬜';

    const bar = '█'.repeat(Math.floor(segment.progress / 5)) +
                '░'.repeat(20 - Math.floor(segment.progress / 5));

    const phaseInfo = segment.current_phase ?
      `Phase ${segment.current_phase}` :
      segment.status === 'completed' ? 'Complete' : 'Pending';

    console.log(`${statusIcon} ${segment.id}  [${bar}] ${segment.progress}% (${phaseInfo})`);
  });

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Completed: ${progress.completed}`);
  console.log(`⏳ In Progress: ${progress.in_progress}`);
  console.log(`⬜ Pending: ${progress.pending}`);
  if (progress.failed > 0) {
    console.log(`❌ Failed: ${progress.failed}`);
  }
  console.log('='.repeat(60) + '\n');
}

/**
 * CLI Interface
 */
async function main() {
  const command = process.argv[2];
  const courseDir = process.argv[3];

  if (!command || !courseDir) {
    console.log('Usage: node segment-coordinator.cjs <command> <course_dir> [args...]');
    console.log('');
    console.log('Commands:');
    console.log('  create <course_dir> <course_code> <start> <end> <job_id>');
    console.log('  update <course_dir> <segment_id> <phase> <status> [progress]');
    console.log('  report <course_dir>');
    console.log('  progress <course_dir>');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'create': {
        const courseCode = process.argv[4];
        const startSeed = parseInt(process.argv[5]);
        const endSeed = parseInt(process.argv[6]);
        const jobId = process.argv[7];

        const segments = calculateSegments(startSeed, endSeed);
        await createSegmentStructure(courseDir, segments, courseCode, jobId);
        await createCourseMetadata(courseDir, courseCode, endSeed - startSeed + 1, startSeed, endSeed, segments, jobId);
        console.log(`\n✅ Created ${segments.length} segments for ${courseCode}`);
        break;
      }

      case 'update': {
        const segmentId = process.argv[4];
        const phase = parseInt(process.argv[5]);
        const status = process.argv[6];
        const progress = process.argv[7] ? parseInt(process.argv[7]) : null;

        await updateSegmentProgress(courseDir, segmentId, phase, status, progress);
        await updateCourseMetadata(courseDir, phase);
        console.log(`✅ Updated ${segmentId}: Phase ${phase}, Status: ${status}`);
        break;
      }

      case 'report': {
        await printSegmentReport(courseDir);
        break;
      }

      case 'progress': {
        const metadata = await fs.readJson(path.join(courseDir, '_course_metadata.json'));
        const progress = await getAggregateProgress(courseDir, metadata.segmentation.segments);
        console.log(JSON.stringify(progress, null, 2));
        break;
      }

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use as module
module.exports = {
  calculateSegments,
  createSegmentStructure,
  updateSegmentProgress,
  getAggregateProgress,
  createCourseMetadata,
  updateCourseMetadata,
  printSegmentReport
};

// Run CLI if executed directly
if (require.main === module) {
  main();
}

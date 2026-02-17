#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkBuildStatus() {
  const courseCode = 'bre_for_fra';

  // Check for active or recent build jobs
  const { data: jobs, error } = await supabase
    .from('build_jobs')
    .select('*')
    .eq('course_code', courseCode)
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`\nBuild Jobs for ${courseCode}:\n`);

  if (!jobs || jobs.length === 0) {
    console.log('No build jobs found.');
    console.log('\nConclusion: Build complete or never started via build_jobs table.');
    return;
  }

  jobs.forEach((job, i) => {
    console.log(`Job ${i + 1}:`);
    console.log(`  Pass: ${job.pass}`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Seeds: ${job.seeds_completed}/${job.total_seeds}`);
    console.log(`  Created: ${job.created_at}`);
    console.log(`  Started: ${job.started_at || 'N/A'}`);
    console.log(`  Completed: ${job.completed_at || 'N/A'}`);
    console.log(`  Last heartbeat: ${job.last_heartbeat || 'N/A'}`);
    console.log('');
  });

  const latestJob = jobs[0];
  console.log('\nConclusion:');
  if (latestJob.status === 'running') {
    console.log('✓ Build is ACTIVE - new USE phrases may appear');
  } else if (latestJob.status === 'complete') {
    console.log('✓ Build is COMPLETE - no new phrases expected');
  } else {
    console.log(`✓ Build is ${latestJob.status.toUpperCase()} - monitoring may not be needed`);
  }
}

checkBuildStatus();

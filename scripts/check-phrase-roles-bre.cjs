#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkPhraseRoles() {
  const courseCode = 'bre_for_fra';

  // Get role distribution
  const { data: phrases, error } = await supabase
    .from('course_practice_phrases')
    .select('phrase_role, qa_checked')
    .eq('course_code', courseCode);

  if (error) {
    console.error('Error:', error);
    return;
  }

  // Count by role and checked status
  const stats = {};
  phrases.forEach(p => {
    const role = p.phrase_role;
    if (!stats[role]) {
      stats[role] = { total: 0, checked: 0, unchecked: 0 };
    }
    stats[role].total++;
    if (p.qa_checked) {
      stats[role].checked++;
    } else {
      stats[role].unchecked++;
    }
  });

  console.log('\nPhrase Role Distribution for bre_for_fra:\n');
  console.log('Role         | Total   | Checked | Unchecked');
  console.log('-------------|---------|---------|----------');

  Object.keys(stats).sort().forEach(role => {
    const s = stats[role];
    console.log(
      `${role.padEnd(12)} | ${String(s.total).padStart(7)} | ${String(s.checked).padStart(7)} | ${String(s.unchecked).padStart(9)}`
    );
  });

  console.log('\nConclusion:');
  if (stats.use && stats.use.unchecked > 0) {
    console.log(`✓ ${stats.use.unchecked} USE phrases need checking`);
  } else if (stats.use && stats.use.unchecked === 0) {
    console.log('✓ All USE phrases have been checked');
  } else {
    console.log('⚠ No USE phrases exist yet - course may still be building');
  }
}

checkPhraseRoles();

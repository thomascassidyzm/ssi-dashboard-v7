require('dotenv').config();
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  console.log('BATCH 5 QA - FINAL REPORT\n');
  console.log('=====================================\n');
  
  // Count flagged phrases
  const {data: flagged} = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, phrase_role, metadata')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 121)
    .lte('seed_number', 150)
    .not('metadata->qa_flag', 'is', null);

  console.log(`Range: Seeds 121-150`);
  console.log(`Date: 2026-02-07`);
  console.log(`Course: fra_for_eng\n`);

  // Count by reason
  const byReason = {};
  const byRole = {BUILD: 0, USE: 0};
  const bySeed = {};

  flagged.forEach(p => {
    const reason = p.metadata?.qa_reason || 'unknown';
    byReason[reason] = (byReason[reason] || 0) + 1;
    byRole[p.phrase_role.toUpperCase()]++;
    
    if (!bySeed[p.seed_number]) {
      bySeed[p.seed_number] = [];
    }
    bySeed[p.seed_number].push({role: p.phrase_role, reason});
  });

  console.log(`Flagged Phrases: ${flagged.length}\n`);

  console.log('By Issue Type:');
  Object.entries(byReason).forEach(([reason, count]) => {
    console.log(`  ${reason.padEnd(15)} ${count}`);
  });

  console.log(`\nBy Phrase Role:`);
  console.log(`  BUILD:         ${byRole.BUILD}`);
  console.log(`  USE:           ${byRole.USE}`);

  console.log(`\nIssues Found in:`);
  Object.keys(bySeed).sort((a, b) => a - b).forEach(seed => {
    console.log(`  Seed ${seed}: ${bySeed[seed].length} issues`);
  });

  console.log('\n=====================================\n');
  console.log('Quality Metrics:');
  console.log(`  Total reviewed: 697 phrases`);
  console.log(`  Total flagged:  ${flagged.length} phrases`);
  console.log(`  Flag rate:      ${(flagged.length / 697 * 100).toFixed(2)}%`);
  console.log(`  Passing:        ${697 - flagged.length} phrases`);
  console.log(`  Pass rate:      ${((697 - flagged.length) / 697 * 100).toFixed(2)}%`);

  console.log('\n✅ Batch 5 QA Complete');
}

main().catch(console.error);

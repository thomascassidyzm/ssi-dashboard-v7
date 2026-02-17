require('dotenv').config({path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // Get all phrases for seeds 11-300
  const {data: phrases, error} = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, phrase_role')
    .eq('course_code', 'ita_for_eng')
    .gte('seed_number', 11)
    .lte('seed_number', 300)
    .in('phrase_role', ['build', 'use', 'component']);
  
  if (error) { console.error(error); return; }
  
  // Group by seed+lego
  const legos = {};
  phrases.forEach(p => {
    const key = `S${p.seed_number}L${p.lego_index}`;
    if (!legos[key]) legos[key] = {seed: p.seed_number, lego: p.lego_index, build: 0, use: 0, component: 0};
    if (p.phrase_role === 'build') legos[key].build++;
    else if (p.phrase_role === 'use') legos[key].use++;
    else if (p.phrase_role === 'component') legos[key].component++;
  });
  
  // Check thresholds: >=8 BUILD+USE total, >=5 USE
  let shortUse = 0;
  let shortTotal = 0;
  let ok = 0;
  const problems = [];
  
  Object.entries(legos).forEach(([key, l]) => {
    const totalBU = l.build + l.use;
    const useCount = l.use;
    const isShortUse = useCount < 5;
    const isShortTotal = totalBU < 8;
    
    if (isShortUse || isShortTotal) {
      problems.push({key, ...l, totalBU, needUse: Math.max(0, 5 - useCount), needTotal: Math.max(0, 8 - totalBU)});
    } else {
      ok++;
    }
  });
  
  // Sort by seed then lego
  problems.sort((a, b) => a.seed - b.seed || a.lego - b.lego);
  
  console.log(`Total LEGOs (S11-300): ${Object.keys(legos).length}`);
  console.log(`OK (>=8 B+U, >=5 USE): ${ok}`);
  console.log(`Short: ${problems.length}`);
  console.log(`\nShort LEGOs:`);
  console.log('LEGO          | Build | Use | Comp | B+U Total | Need USE | Need Total');
  console.log('-'.repeat(75));
  problems.forEach(p => {
    console.log(`${p.key.padEnd(14)}| ${String(p.build).padEnd(6)}| ${String(p.use).padEnd(4)}| ${String(p.component).padEnd(5)}| ${String(p.totalBU).padEnd(10)}| ${String(p.needUse).padEnd(9)}| ${p.needTotal}`);
  });
  
  // Summary of how many new USE phrases needed
  const totalNeedUse = problems.reduce((s, p) => s + Math.max(p.needUse, p.needTotal - p.build), 0);
  console.log(`\nTotal new USE phrases needed (approx): ${totalNeedUse}`);
}
main();

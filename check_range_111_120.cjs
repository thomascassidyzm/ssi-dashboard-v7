require('dotenv').config();
const { supabase } = require('./services/supabase-client.cjs');

async function checkRange() {
  // Get seeds 111-120
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', 'deu_for_eng')
    .gte('seed_number', 111)
    .lte('seed_number', 120)
    .order('seed_number');
  
  // Get LEGOs in this range
  const { data: legos } = await supabase
    .from('course_legos')
    .select('seed_number')
    .eq('course_code', 'deu_for_eng')
    .gte('seed_number', 111)
    .lte('seed_number', 120);
  
  const withLegos = new Set(legos.map(l => l.seed_number));
  
  console.log('Seeds 111-120 status:\n');
  seeds.forEach(s => {
    const status = withLegos.has(s.seed_number) ? '✓ HAS LEGOs' : '✗ NEEDS LEGOs';
    console.log(`S${s.seed_number}: ${status}`);
    console.log(`  "${s.known_text}"`);
    console.log(`  "${s.target_text}"\n`);
  });
  
  const missing = seeds.filter(s => !withLegos.has(s.seed_number));
  console.log(`\nSummary: ${missing.length} seeds need LEGOs: ${missing.map(s => s.seed_number).join(', ')}`);
}

checkRange();

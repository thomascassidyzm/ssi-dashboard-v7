require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, metadata')
    .eq('course_code', 'eng_for_jpn')
    .eq('phrase_role', 'use');
  
  if (error) { console.log('Error:', error); return; }
  
  const garbage = [];
  
  data.forEach(p => {
    const en = p.target_text;
    
    // Specific garbage patterns
    if (/today now|now today/i.test(en)) garbage.push({ ...p, reason: 'today-now' });
    else if (/yesterday now|now yesterday/i.test(en)) garbage.push({ ...p, reason: 'yesterday-now' });
    else if (/better than now(?!\s*and)/i.test(en)) garbage.push({ ...p, reason: 'better-than-now' });
    else if (/at the moment today/i.test(en)) garbage.push({ ...p, reason: 'moment-today' });
    // Check for multiple time words jammed together
    else if (/\b(today|now|yesterday|later|tomorrow)\b.*\b(today|now|yesterday|later|tomorrow)\b.*\b(today|now|yesterday|later|tomorrow)\b/i.test(en)) {
      garbage.push({ ...p, reason: 'triple-time' });
    }
  });
  
  console.log('GARBAGE PATTERNS: ' + garbage.length + ' phrases\n');
  
  const byReason = {};
  garbage.forEach(p => {
    if (!byReason[p.reason]) byReason[p.reason] = [];
    byReason[p.reason].push(p);
  });
  
  Object.keys(byReason).forEach(reason => {
    console.log(reason.toUpperCase() + ' (' + byReason[reason].length + '):');
    byReason[reason].slice(0, 3).forEach(p => {
      console.log('  S' + p.seed_number + ': "' + p.target_text + '"');
    });
    console.log();
  });
  
  console.log('IDs to delete (' + garbage.length + '):');
  console.log(JSON.stringify(garbage.map(p => p.id)));
}
main();

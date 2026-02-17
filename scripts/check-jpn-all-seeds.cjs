require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // Get all USE phrases for eng_for_jpn
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, metadata')
    .eq('course_code', 'eng_for_jpn')
    .eq('phrase_role', 'use')
    .order('seed_number')
    .order('lego_index')
    .order('position');
  
  if (error) { console.log('Error:', error); return; }
  
  // Group by seed
  const seeds = {};
  data.forEach(p => {
    if (!seeds[p.seed_number]) seeds[p.seed_number] = [];
    seeds[p.seed_number].push(p);
  });
  
  const seedNums = Object.keys(seeds).map(Number).sort((a,b) => a-b);
  
  for (const seedNum of seedNums) {
    const phrases = seeds[seedNum];
    const flagged = [];
    
    phrases.forEach(p => {
      const known = p.known_text;
      const target = p.target_text;
      const issues = [];
      
      // Placeholder
      if (known.includes('〜') || target.includes('〜')) {
        issues.push('placeholder');
      }
      
      // Dropped adverbs
      if ((known.includes('とても') || known.includes('本当に')) && 
          !target.toLowerCase().includes('really') && 
          !target.toLowerCase().includes('very')) {
        issues.push('dropped-adverb');
      }
      
      // Unnatural Japanese
      if (known.includes('ことがしたい')) {
        issues.push('unnatural-jpn');
      }
      
      // Incomplete sentences
      if (/how to say\.$/i.test(target)) {
        issues.push('incomplete');
      }
      if (/to say to you\.$/i.test(target)) {
        issues.push('awkward-english');
      }
      
      // Sentence fragments (lowercase start in target)
      if (/^[a-z]/.test(target) && !target.startsWith('to ')) {
        issues.push('fragment');
      }
      
      // Stuttering/repetition
      if (/(\b\w+),\s*\1\b/i.test(known) || /(\b\w+),\s*\1\b/i.test(target)) {
        issues.push('stuttering');
      }
      
      if (issues.length > 0) {
        flagged.push({ ...p, issues: issues.join(', ') });
      }
    });
    
    console.log('='.repeat(60));
    console.log('SEED ' + seedNum + ': ' + phrases.length + ' USE phrases');
    
    if (flagged.length > 0) {
      console.log('⚠️  ' + flagged.length + ' issues found:');
      flagged.forEach(p => {
        console.log('  L' + p.lego_index + ' [' + (p.metadata?.score || '?') + '] ' + p.issues);
        console.log('    "' + p.known_text + '"');
        console.log('    "' + p.target_text + '"');
        console.log('    ID: ' + p.id);
      });
    } else {
      console.log('✓ Clean');
    }
    console.log();
  }
}
main();

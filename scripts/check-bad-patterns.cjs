require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCourse(courseCode) {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, metadata')
    .eq('course_code', courseCode)
    .eq('phrase_role', 'use')
    .lte('seed_number', 10)  // Check early seeds
    .order('seed_number')
    .order('lego_index')
    .order('position');
  
  if (error) { console.log('Error:', error); return []; }
  
  const flagged = [];
  
  data.forEach(p => {
    const known = p.known_text;
    const target = p.target_text;
    const issues = [];
    
    // Check for stuttering (repeated words with comma)
    if (/(\b\w+),\s*\1\b/i.test(known) || /(\b\w+),\s*\1\b/i.test(target)) {
      issues.push('stuttering');
    }
    
    // Check for doubling (phrase repeated)
    if (/^(.+),\s*\1\.?$/i.test(known) || /^(.+),\s*\1\.?$/i.test(target)) {
      issues.push('doubling');
    }
    
    // Check for question mark with "I want?" pattern (bad English)
    if (/^I want\?$/i.test(target) || /^I want to\?$/i.test(target)) {
      issues.push('bad-english-question');
    }
    
    // Check for placeholder characters
    if (known.includes('〜') || target.includes('〜')) {
      issues.push('placeholder');
    }
    
    if (issues.length > 0) {
      flagged.push({
        id: p.id,
        seed: p.seed_number,
        lego: p.lego_index,
        known: p.known_text,
        target: p.target_text,
        score: p.metadata?.score,
        issues: issues.join(', ')
      });
    }
  });
  
  return flagged;
}

async function main() {
  const courses = ['eng_for_por', 'eng_for_jpn', 'ara_for_eng'];
  
  for (const course of courses) {
    console.log('\n' + '='.repeat(60));
    console.log('COURSE:', course);
    console.log('='.repeat(60));
    
    const flagged = await checkCourse(course);
    
    if (flagged.length === 0) {
      console.log('No bad patterns found in seeds 1-10');
    } else {
      console.log('Found', flagged.length, 'problematic phrases:\n');
      flagged.forEach(p => {
        console.log('S' + p.seed + '/L' + p.lego + ' [' + p.score + '] ' + p.issues);
        console.log('  "' + p.known + '" / "' + p.target + '"');
        console.log('  ID:', p.id);
        console.log();
      });
    }
  }
}
main();

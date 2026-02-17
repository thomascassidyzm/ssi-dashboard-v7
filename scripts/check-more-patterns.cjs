require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCourse(courseCode) {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, metadata')
    .eq('course_code', courseCode)
    .eq('phrase_role', 'use')
    .lte('seed_number', 10)
    .order('seed_number')
    .order('lego_index');
  
  if (error) { console.log('Error:', error); return []; }
  
  const flagged = [];
  
  data.forEach(p => {
    const known = p.known_text;
    const target = p.target_text;
    const issues = [];
    
    // Incomplete "how to say" without object
    if (/how to say\.$/i.test(target) || /how to say\?$/i.test(target)) {
      issues.push('incomplete-say');
    }
    
    // "I want?" or similar bad question forms
    if (/^I (want|speak|say)\?$/i.test(target)) {
      issues.push('bad-question');
    }
    
    // Japanese: とても/本当に dropped (known has it, target doesn't have "really/very")
    if (courseCode === 'eng_for_jpn') {
      if ((known.includes('とても') || known.includes('本当に')) && 
          !target.toLowerCase().includes('really') && 
          !target.toLowerCase().includes('very')) {
        issues.push('dropped-adverb');
      }
      // Unnatural Japanese construction
      if (known.includes('ことがしたい')) {
        issues.push('unnatural-japanese');
      }
    }
    
    // Portuguese: "o máximo possível" mistranslated as "as often as possible"
    if (courseCode === 'eng_for_por') {
      if (known.includes('o máximo possível') && target.includes('as often as possible')) {
        issues.push('mistranslation-maximo');
      }
    }
    
    // Placeholder characters
    if (known.includes('〜') || target.includes('〜')) {
      issues.push('placeholder');
    }
    
    // Stuttering
    if (/(\b\w+),\s*\1\b/i.test(known) || /(\b\w+),\s*\1\b/i.test(target)) {
      issues.push('stuttering');
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
      console.log('No issues found in seeds 1-10');
    } else {
      console.log('Found', flagged.length, 'problematic phrases:\n');
      flagged.forEach(p => {
        console.log('S' + p.seed + '/L' + p.lego + ' [' + p.score + '] ' + p.issues);
        console.log('  "' + p.known + '"');
        console.log('  "' + p.target + '"');
        console.log('  ID:', p.id);
        console.log();
      });
    }
  }
}
main();

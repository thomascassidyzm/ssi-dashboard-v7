require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, lego_index, known_text, target_text, metadata')
    .eq('course_code', 'eng_for_jpn')
    .eq('phrase_role', 'use')
    .order('seed_number')
    .order('lego_index');
  
  if (error) { console.log('Error:', error); return; }
  
  console.log('Checking', data.length, 'USE phrases for issues...\n');
  
  const issues = [];
  
  data.forEach(p => {
    const jp = p.known_text;
    const en = p.target_text;
    const found = [];
    
    // 1. Placeholder characters
    if (jp.includes('〜') || en.includes('〜')) found.push('placeholder');
    
    // 2. Incomplete "how to say/speak" at end
    if (/how to (say|speak)\.?$/i.test(en)) found.push('incomplete');
    
    // 3. Fragment (lowercase start, not a continuation)
    if (/^[a-z]/.test(en) && !/^(to |with |for |in |at |on |about )/.test(en)) {
      found.push('fragment');
    }
    
    // 4. Tense mismatch: "now" with past tense
    if (/\b(was|were|had)\b.*\bnow\b/i.test(en) || /\bnow\b.*\b(was|were|had)\b/i.test(en)) {
      found.push('tense-mismatch');
    }
    
    // 5. Awkward "say to you" without object
    if (/trying to say to you\.?$/i.test(en)) found.push('awkward-say');
    
    // 6. Double spaces
    if (en.includes('  ') || jp.includes('  ')) found.push('double-space');
    
    // 7. Missing final punctuation (should end with . ? or particle)
    if (!/[.?!。？]$/.test(en) && en.length > 10) found.push('no-punctuation');
    
    // 8. Unnatural repetition within sentence
    const words = en.toLowerCase().split(/\s+/);
    const consecutive = words.some((w, i) => i > 0 && w === words[i-1] && w.length > 2);
    if (consecutive) found.push('word-repetition');
    
    // 9. Japanese has とても/本当に but English lacks intensity
    if ((jp.includes('とても') || jp.includes('本当に')) && 
        !/(very|really|truly|quite|so |much|sure)/i.test(en)) {
      // Check if it's actually a question context (本当に = "Are you sure")
      if (!jp.includes('本当に') || !en.includes('sure')) {
        found.push('intensity-dropped');
      }
    }
    
    // 10. Weird character issues
    if (/[^\x00-\x7F\u3000-\u9FFF\uFF00-\uFFEF]/.test(jp) && 
        !/[\u3000-\u9FFF\uFF00-\uFFEF]/.test(jp)) {
      found.push('weird-chars');
    }
    
    if (found.length > 0) {
      issues.push({
        seed: p.seed_number,
        lego: p.lego_index,
        score: p.metadata?.score,
        jp, en,
        id: p.id,
        issues: found
      });
    }
  });
  
  // Group by issue type
  const byIssue = {};
  issues.forEach(i => {
    i.issues.forEach(issue => {
      if (!byIssue[issue]) byIssue[issue] = [];
      byIssue[issue].push(i);
    });
  });
  
  console.log('ISSUES FOUND:\n');
  Object.keys(byIssue).sort().forEach(issue => {
    const items = byIssue[issue];
    console.log('='.repeat(60));
    console.log(issue.toUpperCase() + ': ' + items.length + ' phrases');
    console.log('='.repeat(60));
    items.slice(0, 5).forEach(i => {
      console.log('  S' + i.seed + '/L' + i.lego + ' [' + (i.score||'?') + ']');
      console.log('    JP: ' + i.jp);
      console.log('    EN: ' + i.en);
    });
    if (items.length > 5) console.log('  ... and ' + (items.length - 5) + ' more');
    console.log();
  });
  
  console.log('\nSUMMARY:');
  console.log('Total USE phrases:', data.length);
  console.log('Phrases with issues:', issues.length);
  console.log('Clean phrases:', data.length - issues.length);
}
main();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function audit() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, target_text')
    .eq('course_code', 'eng_for_deu')
    .eq('phrase_role', 'use');
  
  if (error) { console.error(error); return; }
  
  console.log(`Auditing ${data.length} USE phrases...\n`);
  
  const issues = [];
  
  for (const p of data) {
    const t = p.target_text;
    
    // Subject-verb agreement (he/she/it + base form)
    if (/\b(he|she|it) (help|know|want|like|think|feel|see|say|do|go|come|work|learn|need|make|get|take|give|look|find|try|ask|tell|start|stop)\b/i.test(t)) {
      if (!t.includes("doesn't") && !t.includes("does ") && !t.includes("did ")) {
        issues.push({...p, type: 'subj-verb', text: t});
      }
    }
    
    // Ending with preposition + period (incomplete)
    if (/\b(with|for|at|about|from)\.$/.test(t)) {
      issues.push({...p, type: 'dangling-prep', text: t});
    }
    
    // 'not so X than' (should be 'not as X as')
    if (/not so \w+ than/i.test(t)) {
      issues.push({...p, type: 'bad-comparative', text: t});
    }
    
    // Double words
    if (/\b(\w+) \1\b/i.test(t) && !/\b(very very|so so)\b/i.test(t)) {
      const match = t.match(/\b(\w+) \1\b/i);
      if (match && match[1].length > 2) {
        issues.push({...p, type: 'double-word', text: t});
      }
    }
    
    // 'I have get' pattern
    if (/I have get/i.test(t)) {
      issues.push({...p, type: 'broken-tense', text: t});
    }
    
    // ending with 'what is.' (incomplete)
    if (/what is\.$/i.test(t)) {
      issues.push({...p, type: 'incomplete', text: t});
    }
    
    // 'excited about that' followed by verb (missing article/pronoun)
    if (/excited about that (I|we|you|he|she|they)/i.test(t)) {
      issues.push({...p, type: 'missing-word', text: t});
    }
  }
  
  if (issues.length === 0) {
    console.log('No issues found!');
  } else {
    issues.forEach(i => {
      console.log(`S${i.seed_number}L${i.lego_index} [${i.type}]: ${i.text}`);
    });
    console.log(`\nTotal issues: ${issues.length}`);
  }
}

audit();

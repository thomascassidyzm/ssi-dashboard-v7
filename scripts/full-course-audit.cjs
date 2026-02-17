const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fullAudit() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index, target_text')
    .eq('course_code', 'eng_for_deu')
    .eq('phrase_role', 'use')
    .order('seed_number');
  
  if (error) { console.error(error); return; }
  
  console.log(`Full audit of ${data.length} USE phrases across all seeds...\n`);
  
  const issues = [];
  
  for (const p of data) {
    const t = p.target_text;
    
    // 1. Subject-verb agreement: he/she/it + base form (excluding negatives)
    const svMatch = t.match(/\b(he|she|it) (help|know|want|like|think|feel|see|say|do|go|come|work|learn|need|make|get|take|give|look|find|try|ask|tell|start|stop|have|has)\b/i);
    if (svMatch) {
      const verb = svMatch[2].toLowerCase();
      // Check it's not negated or in a question context
      if (!t.includes("doesn't") && !t.includes("does ") && !t.includes("did ") && !t.includes("Does ")) {
        // Exclude 'it do' when it's 'you do it' pattern
        if (!(verb === 'do' && /you do it/i.test(t))) {
          issues.push({s: p.seed_number, l: p.lego_index, type: 'subj-verb', text: t});
        }
      }
    }
    
    // 2. Incomplete sentences ending with preposition (excluding phrasal verbs)
    if (/\b(with|for|at|about|from)\.$/.test(t)) {
      // Exclude known phrasal verbs
      if (!/looking for\.|asking for\.|waiting for\.|caring for\./i.test(t)) {
        issues.push({s: p.seed_number, l: p.lego_index, type: 'dangling-prep', text: t});
      }
    }
    
    // 3. Bad comparatives
    if (/not so \w+ than/i.test(t)) {
      issues.push({s: p.seed_number, l: p.lego_index, type: 'bad-comparative', text: t});
    }
    
    // 4. Broken tense patterns
    if (/I have get|I has get|have went|has went/i.test(t)) {
      issues.push({s: p.seed_number, l: p.lego_index, type: 'broken-tense', text: t});
    }
    
    // 5. Reflexive errors
    if (/I ask me\b/i.test(t)) {
      issues.push({s: p.seed_number, l: p.lego_index, type: 'reflexive', text: t});
    }
    
    // 6. Missing objects after 'about' before conjunctions
    if (/about (and|but|or|that|when|if) /i.test(t) && !/about that\./i.test(t)) {
      issues.push({s: p.seed_number, l: p.lego_index, type: 'missing-obj', text: t});
    }
    
    // 7. 'it help' without s
    if (/\bit help\b/i.test(t) && !/doesn't help|does help|did help/i.test(t)) {
      issues.push({s: p.seed_number, l: p.lego_index, type: 'it-help', text: t});
    }
    
    // 8. Truly incomplete (ending with 'what is.' or similar)
    if (/(what|who|where|when|why|how) (is|are|was|were)\.$/.test(t)) {
      issues.push({s: p.seed_number, l: p.lego_index, type: 'incomplete', text: t});
    }
    
    // 9. good vs well after 'do it'
    if (/do it good\b/i.test(t)) {
      issues.push({s: p.seed_number, l: p.lego_index, type: 'good-well', text: t});
    }
  }
  
  // Group by seed range
  const ranges = {};
  issues.forEach(i => {
    const range = Math.floor(i.s / 20) * 20;
    const key = `${range}-${range+19}`;
    if (!ranges[key]) ranges[key] = [];
    ranges[key].push(i);
  });
  
  console.log('Issues by seed range:');
  Object.keys(ranges).sort((a,b) => parseInt(a) - parseInt(b)).forEach(r => {
    console.log(`\n=== Seeds ${r} (${ranges[r].length} issues) ===`);
    ranges[r].forEach(i => {
      console.log(`S${i.s}L${i.l} [${i.type}]: ${i.text}`);
    });
  });
  
  console.log(`\n\nTOTAL ISSUES REMAINING: ${issues.length}`);
}

fullAudit();

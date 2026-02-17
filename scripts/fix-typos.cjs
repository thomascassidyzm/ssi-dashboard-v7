const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixTypos() {
  // Fix "surrpise" -> "surprise"
  const { data: surrpriseData, error: err1 } = await supabase
    .from('course_practice_phrases')
    .select('id, target_text')
    .eq('course_code', 'eng_for_deu')
    .ilike('target_text', '%surrpise%');
  
  if (err1) { console.error(err1); return; }
  
  console.log(`Fixing ${surrpriseData.length} "surrpise" typos...`);
  
  for (const row of surrpriseData) {
    const fixed = row.target_text.replace(/surrpise/gi, 'surprise');
    await supabase
      .from('course_practice_phrases')
      .update({ target_text: fixed })
      .eq('id', row.id);
  }
  
  console.log('Done with surrpise fixes');
  
  // Check for other common typos
  const typoPatterns = [
    ['teh', 'the'],
    ['hte', 'the'],
    ['taht', 'that'],
    ['waht', 'what'],
    ['becuase', 'because'],
    ['beacuse', 'because'],
    ['langauge', 'language'],
    ['languag ', 'language '],
    ['diffrent', 'different'],
    ['intresting', 'interesting'],
    ['togehter', 'together'],
    ['togther', 'together'],
  ];
  
  for (const [typo, correct] of typoPatterns) {
    const { data } = await supabase
      .from('course_practice_phrases')
      .select('id, target_text')
      .eq('course_code', 'eng_for_deu')
      .ilike('target_text', `%${typo}%`);
    
    if (data && data.length > 0) {
      console.log(`Found ${data.length} instances of "${typo}"`);
      for (const row of data) {
        const regex = new RegExp(typo, 'gi');
        const fixed = row.target_text.replace(regex, correct);
        await supabase
          .from('course_practice_phrases')
          .update({ target_text: fixed })
          .eq('id', row.id);
      }
    }
  }
  
  console.log('\nTypo check complete!');
}

fixTypos();

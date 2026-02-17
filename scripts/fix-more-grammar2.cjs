const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const fixes = [
  ["I ask me how it's going for you.", 
   "I ask myself how it's going for you."],
  
  ["I'm excited about and I want to see more.", 
   "I'm excited about it and I want to see more."],
];

async function applyFixes() {
  console.log(`Applying ${fixes.length} additional fixes...`);
  
  for (const [oldText, newText] of fixes) {
    const { data, error } = await supabase
      .from('course_practice_phrases')
      .update({ target_text: newText })
      .eq('course_code', 'eng_for_deu')
      .eq('target_text', oldText);
    
    if (error) {
      console.error(`ERROR:`, error.message);
    } else {
      console.log(`FIXED: "${oldText}" → "${newText}"`);
    }
  }
}

applyFixes();

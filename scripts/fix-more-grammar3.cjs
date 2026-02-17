const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const fixes = [
  ["It is fun to be with them together.", 
   "It is fun to be together with them."],
  
  ["It is good that it's so good for me.", 
   "It is wonderful that it's working so well for me."],
  
  ["It's more important that you understand than that you do it good.", 
   "It's more important that you understand than that you do it well."],
  
  ["I try to be good not to be perfect.", 
   "I try to be good, not perfect."],
];

async function applyFixes() {
  console.log(`Applying ${fixes.length} fixes...`);
  
  for (const [oldText, newText] of fixes) {
    const { data, error } = await supabase
      .from('course_practice_phrases')
      .update({ target_text: newText })
      .eq('course_code', 'eng_for_deu')
      .eq('target_text', oldText);
    
    if (error) {
      console.error(`ERROR:`, error.message);
    } else {
      console.log(`FIXED: "${oldText.substring(0, 40)}..." → "${newText.substring(0, 40)}..."`);
    }
  }
}

applyFixes();

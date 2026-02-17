const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const fixes = [
  // Subject-verb: "before she start"
  ["She wants to read the story carefully before she start.", 
   "She wants to read the story carefully before she starts."],
  
  ["She was thinking carefully before she start to learn.", 
   "She was thinking carefully before she started to learn."],
  
  ["She wants to read everything before she start to speak.", 
   "She wants to read everything before she starts to speak."],
  
  // Missing word: "excited about that we" should be "excited that we"
  ["I'm excited about that we can do that.", 
   "I'm excited that we can do that."],
   
  // Double-check the comparative one
  ["That is not so good than I felt when we were here.", 
   "That is not as good as I felt when we were here."],
];

async function applyFixes() {
  console.log(`Applying ${fixes.length} final fixes...`);
  
  for (const [oldText, newText] of fixes) {
    const { data, error } = await supabase
      .from('course_practice_phrases')
      .update({ target_text: newText })
      .eq('course_code', 'eng_for_deu')
      .eq('target_text', oldText);
    
    if (error) {
      console.error(`ERROR:`, error.message);
    } else {
      console.log(`FIXED: "${oldText.substring(0, 45)}..."`);
    }
  }
}

applyFixes();

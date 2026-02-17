const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const fixes = [
  // Subject-verb agreement fixes
  ["She is tired, but she wants to learn English before she go.", 
   "She is tired, but she wants to learn English before she goes."],
  
  ["He feel okay, but he doesn't want to interrupt the story.", 
   "He feels okay, but he doesn't want to interrupt the story."],
  
  ["She feel okay, but she doesn't want to read this morning.", 
   "She feels okay, but she doesn't want to read this morning."],
  
  ["He is starting to feel better because he learn at the moment.", 
   "He is starting to feel better because he is learning at the moment."],
  
  ["He feel better at the moment than last month.", 
   "He feels better at the moment than last month."],
  
  ["He wanted to speak with me last night before he go.", 
   "He wanted to speak with me last night before he went."],
  
  ["She was thinking about it, and she feel better.", 
   "She was thinking about it, and she feels better."],
  
  ["He think that it's a good thing to speak English.", 
   "He thinks that it's a good thing to speak English."],
  
  ["He doesn't worry if he need to improve.", 
   "He doesn't worry if he needs to improve."],
  
  ["He think that it's okay to make mistakes.", 
   "He thinks that it's okay to make mistakes."],
  
  ["I think that she feel a little tired this morning.", 
   "I think that she feels a little tired this morning."],
];

async function applyFixes() {
  console.log(`Applying ${fixes.length} additional grammar fixes...`);
  
  for (const [oldText, newText] of fixes) {
    const { data, error } = await supabase
      .from('course_practice_phrases')
      .update({ target_text: newText })
      .eq('course_code', 'eng_for_deu')
      .eq('target_text', oldText);
    
    if (error) {
      console.error(`ERROR fixing "${oldText.substring(0,40)}...":`, error.message);
    } else {
      console.log(`FIXED: "${oldText.substring(0, 50)}..."`);
    }
  }
  
  console.log('\nDone!');
}

applyFixes();

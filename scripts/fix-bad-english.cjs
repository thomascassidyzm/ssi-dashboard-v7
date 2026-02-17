const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Fixes: old target_text -> new target_text
const fixes = [
  // S128L1 - subject-verb agreement
  ["You're like my friend who like to help me.", "You're like my friend who likes to help me."],
  
  // S131L4 - broken grammar
  ["I have many thinking going around when I learn.", "I have many thoughts going around when I learn."],
  
  // S132L2 - comparative structure
  ["That is not so good than what she was saying.", "That is not as good as what she was saying."],
  
  // S133L1 - incomplete sentences
  ["You get to know someone when you have time with.", "You get to know someone when you have time with them."],
  ["You get to know someone better when you work with.", "You get to know someone better when you work with them."],
  ["I have get to know someone who is very good.", "I got to know someone who is very good."],
  
  // S134L2 - incomplete
  ["You can learn a lot when you work with.", "You can learn a lot when you work with them."],
  
  // S134L3 - subject-verb agreement
  ["He help me when I work at something difficult.", "He helps me when I work at something difficult."],
  
  // S135L3 - comparative structure
  ["I believe that it's so good as you say.", "I believe that it's as good as you say."],
  
  // S136L2 - subject-verb agreement
  ["You can ask her what she know about it.", "You can ask her what she knows about it."],
  
  // S137L2 - subject-verb agreement (multiple)
  ["It help to talk often with other people.", "It helps to talk often with other people."],
  ["I want to talk often because it help me to learn.", "I want to talk often because it helps me to learn."],
  
  // S137L3 - subject-verb agreement
  ["It help me to know that I must not be perfect.", "It helps me to know that I don't have to be perfect."],
];

async function applyFixes() {
  console.log(`Applying ${fixes.length} grammar fixes...`);
  
  for (const [oldText, newText] of fixes) {
    const { data, error } = await supabase
      .from('course_practice_phrases')
      .update({ target_text: newText })
      .eq('course_code', 'eng_for_deu')
      .eq('target_text', oldText);
    
    if (error) {
      console.error(`ERROR fixing "${oldText}":`, error.message);
    } else {
      console.log(`FIXED: "${oldText.substring(0, 40)}..." → "${newText.substring(0, 40)}..."`);
    }
  }
  
  console.log('\nDone!');
}

applyFixes();

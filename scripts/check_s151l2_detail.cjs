require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkPhrases() {
  const { data, error } = await supabase
    .from('course_practice_phrases')
    .select('id, phrase_role, known_text, target_text')
    .eq('course_code', 'deu_for_eng')
    .eq('seed_number', 151)
    .eq('lego_index', 2)
    .order('phrase_role', { ascending: true })
    .order('id', { ascending: true });
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Total phrases: ${data.length}`);
    const build = data.filter(p => p.phrase_role === 'build');
    const use = data.filter(p => p.phrase_role === 'use');
    console.log(`BUILD: ${build.length}, USE: ${use.length}`);
    console.log('\nBUILD phrases:');
    build.forEach(p => console.log(`- ${p.id}: "${p.target_text}"`));
    console.log('\nUSE phrases:');
    use.forEach(p => console.log(`- ${p.id}: "${p.target_text}"`));
  }
}

checkPhrases();

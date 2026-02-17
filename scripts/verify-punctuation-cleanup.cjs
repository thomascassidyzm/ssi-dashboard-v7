/**
 * Verify punctuation cleanup was successful
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function isPunctOnly(text) {
  if (!text) return true;
  const trimmed = text.trim();
  if (!trimmed) return true;
  return /^[.,;:!?。、？！；：…—–\-()[\]{}「」『』（）【】؟،؛־\s]+$/.test(trimmed);
}

async function main() {
  // Verify no punctuation LEGOs remain
  const { data: legos } = await supabase
    .from('course_legos')
    .select('lego_id, known_text, target_text')
    .eq('course_code', 'jpn_for_eng');

  const punctLegos = legos.filter(l => isPunctOnly(l.known_text) || isPunctOnly(l.target_text));
  console.log('Remaining punctuation-only LEGOs:', punctLegos.length);

  // Verify no punctuation phrases remain
  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('id, known_text, target_text')
    .eq('course_code', 'jpn_for_eng');

  const punctPhrases = phrases.filter(p => isPunctOnly(p.known_text) || isPunctOnly(p.target_text));
  console.log('Remaining punctuation-only phrases:', punctPhrases.length);

  console.log('');
  console.log('Total LEGOs:', legos.length);
  console.log('Total phrases:', phrases.length);

  if (punctLegos.length > 0 || punctPhrases.length > 0) {
    console.log('');
    console.log('WARNING: Some punctuation-only items still remain!');
    if (punctLegos.length > 0) {
      console.log('Punctuation LEGOs:', punctLegos);
    }
    if (punctPhrases.length > 0) {
      console.log('Punctuation phrases:', punctPhrases);
    }
  } else {
    console.log('');
    console.log('SUCCESS: All punctuation-only items have been removed!');
  }
}

main().catch(console.error);

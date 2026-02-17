const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  const { data: newLegos } = await supabase
    .from('course_legos')
    .select('seed_number, lego_index, lego_type, known, target, components')
    .eq('course_code', 'ara_for_eng')
    .eq('is_new', true)
    .order('seed_number')
    .order('lego_index');

  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', 'ara_for_eng');

  const withPhrases = new Set((phrases || []).map(p => p.seed_number + ':' + p.lego_index));

  const remaining = (newLegos || []).filter(l => !withPhrases.has(l.seed_number + ':' + l.lego_index));

  const lines = remaining.map(l => {
    let line = 'S' + l.seed_number + 'L' + l.lego_index + ' [' + l.lego_type + '] "' + l.known + '" → ' + l.target;
    if (l.lego_type === 'M' && l.components) {
      const comps = typeof l.components === 'string' ? JSON.parse(l.components) : l.components;
      line += ' COMPONENTS:' + JSON.stringify(comps);
    }
    return line;
  });

  require('fs').writeFileSync('/tmp/ara_remaining_legos.txt', lines.join('\n'));
  console.log('Total remaining: ' + remaining.length);
  console.log('A-type: ' + remaining.filter(l => l.lego_type === 'A').length);
  console.log('M-type: ' + remaining.filter(l => l.lego_type === 'M').length);
}
main().catch(console.error);

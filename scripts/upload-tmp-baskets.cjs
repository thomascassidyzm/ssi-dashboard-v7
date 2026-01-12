require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function uploadMissing() {
  // Get missing LEGOs
  const { data: newLegos } = await supabase
    .from('course_legos')
    .select('lego_id')
    .eq('course_code', 'zho_for_eng')
    .eq('is_new', true);

  const { data: phrases } = await supabase
    .from('course_practice_phrases')
    .select('seed_number, lego_index')
    .eq('course_code', 'zho_for_eng');

  const legosWithPhrases = new Set((phrases || []).map(p =>
    'S' + String(p.seed_number).padStart(4, '0') + 'L' + String(p.lego_index).padStart(2, '0')
  ));

  const missingSet = new Set((newLegos || [])
    .filter(l => !legosWithPhrases.has(l.lego_id))
    .map(l => l.lego_id));

  console.log('Missing LEGOs:', missingSet.size);

  // Find basket files in /tmp
  const files = fs.readdirSync('/tmp').filter(f => f.endsWith('.json'));
  let uploaded = 0;
  let found = 0;

  for (const file of files) {
    try {
      const content = JSON.parse(fs.readFileSync(path.join('/tmp', file), 'utf8'));
      if (content.course && content.legoId && Array.isArray(content.phrases)) {
        const legoId = content.legoId.toUpperCase();
        if (missingSet.has(legoId)) {
          found++;
          console.log('Found basket for missing LEGO:', legoId, `(${content.phrases.length} phrases)`);
          // Upload via fetch
          const result = await fetch('http://localhost:3459/upload-basket', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(content)
          });
          const json = await result.json();
          if (json.success) {
            console.log('  ✅ Uploaded:', legoId);
            uploaded++;
          } else {
            console.log('  ❌ Failed:', json.error);
          }
        }
      }
    } catch (e) {
      // Not a valid basket file, skip
    }
  }

  console.log('\nFound', found, 'basket files for missing LEGOs');
  console.log('Uploaded', uploaded, 'baskets from /tmp');
}

uploadMissing().catch(console.error);

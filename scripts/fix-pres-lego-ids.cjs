const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fix() {
  // Get all LEGOs
  const { data: legos } = await supabase
    .from('course_legos')
    .select('lego_id, known_text')
    .eq('course_code', 'fra_for_eng');
  
  // Get presentations without lego_id (or with different lego_id)
  const { data: presentations } = await supabase
    .from('course_audio')
    .select('id, text, lego_id')
    .eq('course_code', 'fra_for_eng')
    .eq('role', 'presentation');
  
  // Build known_text -> lego_id map (use first match if duplicates)
  const knownToLego = new Map();
  for (const lego of legos || []) {
    const key = lego.known_text.toLowerCase().trim();
    if (!knownToLego.has(key)) {
      knownToLego.set(key, lego.lego_id);
    }
  }
  
  // Find presentations that need lego_id update
  const updates = [];
  for (const pres of presentations || []) {
    // Extract known_text from presentation text
    // Format: "The French for 'KNOWN_TEXT', as in ..."
    const match = pres.text.match(/for '([^']+)'[,\.]/);
    if (match) {
      const knownText = match[1].toLowerCase().trim();
      const expectedLegoId = knownToLego.get(knownText);
      
      if (expectedLegoId && pres.lego_id !== expectedLegoId) {
        updates.push({
          id: pres.id,
          currentLegoId: pres.lego_id,
          expectedLegoId,
          knownText
        });
      }
    }
  }
  
  console.log(`Found ${updates.length} presentations needing lego_id update`);
  
  if (updates.length > 0) {
    console.log('\nSample updates (first 5):');
    for (const u of updates.slice(0, 5)) {
      console.log(`  ${u.knownText}: ${u.currentLegoId || 'null'} -> ${u.expectedLegoId}`);
    }
    
    // Apply updates
    console.log('\nApplying updates...');
    let updated = 0;
    for (const u of updates) {
      const { error } = await supabase
        .from('course_audio')
        .update({ lego_id: u.expectedLegoId })
        .eq('id', u.id);
      
      if (!error) updated++;
    }
    console.log(`Updated ${updated} records`);
  }
}

fix();

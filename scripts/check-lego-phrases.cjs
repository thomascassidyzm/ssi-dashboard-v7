const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkLegoPhrases() {
  const courseId = 'zho_for_eng';

  // Get all LEGOs from lego_cycles
  const { data: legos } = await supabase
    .from('lego_cycles')
    .select('lego_id, seed_number, lego_index, known_text, target_text')
    .eq('course_code', courseId)
    .order('seed_number')
    .order('lego_index');

  // Get practice phrases per LEGO
  const { data: phrases } = await supabase
    .from('practice_cycles')
    .select('lego_id, position, target_text')
    .eq('course_code', courseId)
    .gte('position', 2); // Practice phrases only

  // Group phrases by lego_id
  const phrasesByLego = new Map();
  for (const p of (phrases || [])) {
    if (!phrasesByLego.has(p.lego_id)) {
      phrasesByLego.set(p.lego_id, []);
    }
    phrasesByLego.get(p.lego_id).push(p);
  }

  console.log('LEGO phrase counts for', courseId);
  console.log('═'.repeat(70));
  console.log('Index | LEGO ID    | Target         | Debut | Eternal');
  console.log('─'.repeat(70));

  let idx = 1;
  for (const lego of (legos || [])) {
    const legoPhrases = phrasesByLego.get(lego.lego_id) || [];
    const debutCount = legoPhrases.filter(p => p.position >= 2 && p.position <= 8).length;
    const eternalCount = legoPhrases.filter(p => p.position >= 2).length; // Currently same query

    const warning = debutCount === 0 ? '⚠️ NO PHRASES' : '';
    console.log(
      String(idx).padStart(5) + ' |',
      lego.lego_id.padEnd(10) + ' |',
      (lego.target_text || '').substring(0, 14).padEnd(14) + ' |',
      String(debutCount).padStart(5) + ' |',
      String(eternalCount).padStart(7),
      warning
    );
    idx++;
  }

  // Summary
  const legosWithNoPhrases = [...phrasesByLego.entries()].filter(([id, p]) => p.length === 0).length;
  const legosNotInPhrases = (legos || []).filter(l => !phrasesByLego.has(l.lego_id));

  console.log('');
  console.log('Summary:');
  console.log('  Total LEGOs in lego_cycles:', legos?.length || 0);
  console.log('  LEGOs with practice phrases:', phrasesByLego.size);
  console.log('  LEGOs missing from practice_cycles:', legosNotInPhrases.length);
  if (legosNotInPhrases.length > 0) {
    console.log('  Missing LEGOs:', legosNotInPhrases.map(l => l.lego_id).join(', '));
  }
}

checkLegoPhrases();

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function analyzeOverlap() {
  const courseId = 'zho_for_eng';

  const { data } = await supabase
    .from('practice_cycles')
    .select('lego_id, target_text')
    .eq('course_code', courseId)
    .gte('position', 2);

  // Count how many LEGOs each phrase belongs to
  const textToLegos = new Map();
  for (const row of data) {
    if (!textToLegos.has(row.target_text)) {
      textToLegos.set(row.target_text, new Set());
    }
    textToLegos.get(row.target_text).add(row.lego_id);
  }

  // Distribution
  const distribution = {};
  for (const [text, legos] of textToLegos) {
    const count = legos.size;
    distribution[count] = (distribution[count] || 0) + 1;
  }

  console.log('Phrase overlap distribution:');
  console.log('═'.repeat(40));
  Object.entries(distribution).sort((a,b) => Number(a[0]) - Number(b[0])).forEach(([legoCount, phraseCount]) => {
    console.log('  Phrases in', legoCount, 'LEGO(s):', phraseCount);
  });

  // Show some examples of highly-shared phrases
  const highOverlap = [...textToLegos.entries()]
    .filter(([t, legos]) => legos.size >= 5)
    .slice(0, 10);

  if (highOverlap.length > 0) {
    console.log('');
    console.log('Examples of phrases in 5+ LEGOs:');
    highOverlap.forEach(([text, legos]) => {
      console.log('  "' + text + '" in', legos.size, 'LEGOs');
    });
  }

  // Total unique phrases
  console.log('');
  console.log('Total unique phrases:', textToLegos.size);
  console.log('Total practice_cycles rows:', data.length);
}

analyzeOverlap();

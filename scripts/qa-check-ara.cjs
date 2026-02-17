const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function getData() {
  // Get all phrases with scores for ara_for_eng
  const { data: phrases, error: pErr } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', 'ara_for_eng')
    .order('seed_number')
    .order('lego_index');

  if (pErr) { console.error('Phrase error:', pErr); return; }

  // Separate BUILD and USE phrases based on phrase_role
  // BUILD = 'build', 'component' (fragments for pattern locking)
  // USE = 'use', 'practice' (complete sentences for eternal rotation)
  const buildPhrases = phrases.filter(p =>
    p.phrase_role === 'build' ||
    p.phrase_role === 'component' ||
    (p.metadata && p.metadata.buildup === 'component')
  );
  const usePhrases = phrases.filter(p =>
    p.phrase_role === 'use' ||
    (p.phrase_role === 'practice' && !p.metadata?.buildup)
  );

  // Get all columns for reference
  const samplePhrase = phrases[0];
  const columns = Object.keys(samplePhrase);

  console.log(JSON.stringify({
    columns,
    total_phrases: phrases.length,
    build_count: buildPhrases.length,
    use_count: usePhrases.length,
    phrase_role_counts: phrases.reduce((acc, p) => { acc[p.phrase_role || 'null'] = (acc[p.phrase_role || 'null'] || 0) + 1; return acc; }, {}),
    build_sample: buildPhrases.slice(0, 10).map(p => ({seed: p.seed_number, known: p.known_text, target: p.target_text, role: p.phrase_role})),
    use_sample: usePhrases.slice(0, 10).map(p => ({seed: p.seed_number, known: p.known_text, target: p.target_text, role: p.phrase_role}))
  }, null, 2));
}

getData();

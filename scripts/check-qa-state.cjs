const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  // 1. Total QA flags for fra_for_eng
  const { count: flagCount } = await supabase
    .from('course_qa_flags')
    .select('*', { count: 'exact', head: true })
    .eq('course_code', 'fra_for_eng');
  console.log('Total QA flags for fra_for_eng:', flagCount);

  // 2. Get all fra_for_eng QA flags
  const { data: flags } = await supabase
    .from('course_qa_flags')
    .select('id, phrase_id, seed_number, check_type, severity, issue, created_at')
    .eq('course_code', 'fra_for_eng')
    .order('created_at', { ascending: false });
  console.log('\n=== ALL QA FLAGS for fra_for_eng ===');
  if (flags && flags.length > 0) {
    flags.forEach(f => console.log(JSON.stringify(f)));
  } else {
    console.log('No flags found');
  }

  // 3. Check seed metadata for seeds 11-100
  const { data: seeds } = await supabase
    .from('course_seeds')
    .select('seed_number, metadata')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 11)
    .lte('seed_number', 100)
    .order('seed_number');

  console.log('\n=== SEED METADATA (seeds 11-100) ===');
  if (seeds) {
    let withMeta = 0;
    let withQA = 0;
    for (const s of seeds) {
      if (s.metadata && Object.keys(s.metadata).length > 0) {
        withMeta++;
        const keys = Object.keys(s.metadata);
        const hasQA = keys.some(k => k.toLowerCase().includes('qa') || k.toLowerCase().includes('check'));
        if (hasQA) {
          withQA++;
          console.log('S' + s.seed_number + ' (QA):', JSON.stringify(s.metadata));
        } else if (s.seed_number <= 13 || s.seed_number >= 98) {
          console.log('S' + s.seed_number + ':', JSON.stringify(s.metadata));
        }
      }
    }
    console.log('Seeds with metadata: ' + withMeta + '/' + seeds.length);
    console.log('Seeds with QA metadata: ' + withQA + '/' + seeds.length);
  }

  // 4. Check phrase metadata for qa_checked markers
  const { data: phrasesQA } = await supabase
    .from('course_practice_phrases')
    .select('id, seed_number, metadata')
    .eq('course_code', 'fra_for_eng')
    .gte('seed_number', 11)
    .lte('seed_number', 100)
    .limit(2000);

  console.log('\n=== PHRASE METADATA CHECK ===');
  if (phrasesQA) {
    let total = phrasesQA.length;
    let withMeta = 0;
    let qaChecked = 0;
    let sampleMeta = null;
    for (const p of phrasesQA) {
      if (p.metadata && Object.keys(p.metadata).length > 0) {
        withMeta++;
        if (!sampleMeta) sampleMeta = { seed: p.seed_number, meta: p.metadata };
        const keys = Object.keys(p.metadata);
        if (keys.some(k => k.toLowerCase().includes('qa') || k.toLowerCase().includes('check'))) {
          qaChecked++;
        }
      }
    }
    console.log('Total phrases (seeds 11-100): ' + total);
    console.log('Phrases with any metadata: ' + withMeta);
    console.log('Phrases with QA metadata: ' + qaChecked);
    if (sampleMeta) console.log('Sample metadata:', JSON.stringify(sampleMeta));
  }

  // 5. Check the API endpoint for QA summary
  try {
    const resp = await fetch('http://localhost:3471/api/qa/summary/fra_for_eng');
    const data = await resp.json();
    console.log('\n=== QA SUMMARY API ===');
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.log('\n=== QA SUMMARY API ===');
    console.log('Error fetching:', e.message);
  }
}
main();

require('dotenv').config({path: '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env'});
const {createClient} = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function main() {
  let allLegos = [];
  for (let start = 11; start <= 300; start += 50) {
    const end = Math.min(start + 49, 300);
    const {data, error} = await supabase
      .from('course_legos')
      .select('seed_number, lego_index, known_text, target_text, type')
      .eq('course_code', 'ita_for_eng')
      .gte('seed_number', start).lte('seed_number', end)
      .order('seed_number').order('lego_index');
    if (error) { console.error(error); return; }
    allLegos = allLegos.concat(data || []);
  }
  console.log(`Fetched ${allLegos.length} LEGOs`);

  let allPhrases = [];
  for (let start = 11; start <= 300; start += 50) {
    const end = Math.min(start + 49, 300);
    const {data, error} = await supabase
      .from('course_practice_phrases')
      .select('seed_number, lego_index, phrase_role, known_text, target_text')
      .eq('course_code', 'ita_for_eng')
      .gte('seed_number', start).lte('seed_number', end)
      .in('phrase_role', ['build', 'use'])
      .order('seed_number').order('lego_index').order('position');
    if (error) { console.error(error); return; }
    allPhrases = allPhrases.concat(data || []);
  }
  console.log(`Fetched ${allPhrases.length} phrases`);

  const phraseMap = {};
  allPhrases.forEach(p => {
    const key = `S${p.seed_number}L${p.lego_index}`;
    if (!phraseMap[key]) phraseMap[key] = {build: [], use: []};
    phraseMap[key][p.phrase_role].push(p);
  });

  const shortLegos = [];
  allLegos.forEach(l => {
    const key = `S${l.seed_number}L${l.lego_index}`;
    const pp = phraseMap[key] || {build: [], use: []};
    const totalBU = pp.build.length + pp.use.length;
    const useCount = pp.use.length;
    if (totalBU < 8 || useCount < 5) {
      const need = Math.max(Math.max(0, 8 - totalBU), Math.max(0, 5 - useCount));
      shortLegos.push({
        key, seed: l.seed_number, lego: l.lego_index,
        type: l.type, known: l.known_text, target: l.target_text,
        buildCount: pp.build.length, useCount, totalBU, need,
        existingUse: pp.use.map(u => `${u.known_text} → ${u.target_text}`)
      });
    }
  });

  const fs = require('fs');
  fs.writeFileSync('/tmp/short-legos.json', JSON.stringify(shortLegos, null, 2));
  console.log(`\nShort LEGOs: ${shortLegos.length}`);
  console.log(`USE phrases needed: ${shortLegos.reduce((s, l) => s + l.need, 0)}`);
  
  const ranges = [[11,40],[41,70],[71,100],[101,160],[161,300]];
  ranges.forEach((r, i) => {
    const batch = shortLegos.filter(l => l.seed >= r[0] && l.seed <= r[1]);
    const need = batch.reduce((s, l) => s + l.need, 0);
    fs.writeFileSync(`/tmp/short-legos-batch${i+1}.json`, JSON.stringify(batch, null, 2));
    console.log(`Batch ${i+1} (S${r[0]}-${r[1]}): ${batch.length} LEGOs, ${need} phrases needed`);
  });
}
main();

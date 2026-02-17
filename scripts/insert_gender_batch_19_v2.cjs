require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const results = [
  { original: "Sim estou pronto para ir.", expanded_f: "Sim estou pronta para ir.", expanded_m: "Sim estou pronto para ir." },
  { original: "Sim estou pronto.", expanded_f: "Sim estou pronta.", expanded_m: "Sim estou pronto." },
  { original: "Sim, estou pronto para ir assim que quiseres.", expanded_f: "Sim, estou pronta para ir assim que quiseres.", expanded_m: "Sim, estou pronto para ir assim que quiseres." },
  { original: "Sinto-me bem, mas estou a começar a sentir-me cansado.", expanded_f: "Sinto-me bem, mas estou a começar a sentir-me cansada.", expanded_m: "Sinto-me bem, mas estou a começar a sentir-me cansado." },
  { original: "Sinto-me cansado esta manhã.", expanded_f: "Sinto-me cansada esta manhã.", expanded_m: "Sinto-me cansado esta manhã." },
  { original: "Sinto-me cansado esta tarde.", expanded_f: "Sinto-me cansada esta tarde.", expanded_m: "Sinto-me cansado esta tarde." },
  { original: "Sinto-me cansado hoje.", expanded_f: "Sinto-me cansada hoje.", expanded_m: "Sinto-me cansado hoje." },
  { original: "Sinto-me cansado mas quero falar português.", expanded_f: "Sinto-me cansada mas quero falar português.", expanded_m: "Sinto-me cansado mas quero falar português." },
  { original: "Sinto-me muito cansado.", expanded_f: "Sinto-me muito cansada.", expanded_m: "Sinto-me muito cansado." },
  { original: "Sinto-me um pouco cansado.", expanded_f: "Sinto-me um pouco cansada.", expanded_m: "Sinto-me um pouco cansado." }
];

async function insert() {
  const rows = results.map(r => ({
    course_code: 'por_for_eng',
    original_text: r.original,
    language: 'por',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  // Try regular insert (may skip duplicates if they exist)
  const { error, data } = await supabase
    .from('course_gender_expansions')
    .insert(rows);

  if (error) {
    console.error('Insert error:', error.message);
    if (error.code === '23505') {
      console.log('(Some rows may already exist - this is OK)');
    }
  } else {
    console.log(`✓ Inserted ${rows.length} rows`);
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Total processed: 201`);
  console.log(`Variants found: ${results.length}`);
  console.log(`Gender expansions: ${results.length}`);
}

insert().catch(console.error);

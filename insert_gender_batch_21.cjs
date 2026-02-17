require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const results = [
  { original: "Vou chegar atrasado hoje.", expanded_f: "Vou chegar atrasada hoje.", expanded_m: "Vou chegar atrasado hoje." },
  { original: "Vou chegar atrasado.", expanded_f: "Vou chegar atrasada.", expanded_m: "Vou chegar atrasado." },
  { original: "Vou estar pronto em menos de uma hora.", expanded_f: "Vou estar pronta em menos de uma hora.", expanded_m: "Vou estar pronto em menos de uma hora." },
  { original: "Vou sentir-me cansado hoje.", expanded_f: "Vou sentir-me cansada hoje.", expanded_m: "Vou sentir-me cansado hoje." }
];

async function insertGenderExpansions() {
  const rows = results.map(r => ({
    course_code: 'por_for_eng',
    original_text: r.original,
    language: 'por',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  // Insert in batches of 500
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase
      .from('course_gender_expansions')
      .insert(batch);

    if (error) {
      console.error('Insert error:', error.message);
      process.exit(1);
    }
  }

  console.log(`✓ Processed batch 21: ${results.length} gender expansions inserted`);
}

insertGenderExpansions();

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const results = [
  { original: "non perfetti", expanded_f: "non perfette", expanded_m: "non perfetti" },
  { original: "non posso cavarmela da solo", expanded_f: "non posso cavarmela da sola", expanded_m: "non posso cavarmela da solo" },
  { original: "non riesco a parlare quando sono stanco.", expanded_f: "non riesco a parlare quando sono stanca.", expanded_m: "non riesco a parlare quando sono stanco." },
  { original: "non sarò pronto fino a dopo stasera", expanded_f: "non sarò pronta fino a dopo stasera", expanded_m: "non sarò pronto fino a dopo stasera" },
  { original: "non so perché sono preoccupato che potrebbe essere difficile.", expanded_f: "non so perché sono preoccupata che potrebbe essere difficile.", expanded_m: "non so perché sono preoccupato che potrebbe essere difficile." },
  { original: "non sono sicuro", expanded_f: "non sono sicura", expanded_m: "non sono sicuro" },
  { original: "non sono sicuro adesso", expanded_f: "non sono sicura adesso", expanded_m: "non sono sicuro adesso" },
  { original: "non sono sicuro come", expanded_f: "non sono sicura come", expanded_m: "non sono sicuro come" },
  { original: "non sono sicuro cosa succederà", expanded_f: "non sono sicura cosa succederà", expanded_m: "non sono sicuro cosa succederà" },
  { original: "non sono sicuro di quando sarò pronto", expanded_f: "non sono sicura di quando sarò pronta", expanded_m: "non sono sicuro di quando sarò pronto" },
  { original: "non sono sicuro di quello che stiamo facendo", expanded_f: "non sono sicura di quello che stiamo facendo", expanded_m: "non sono sicuro di quello che stiamo facendo" },
  { original: "non sono sicuro qual è", expanded_f: "non sono sicura qual è", expanded_m: "non sono sicuro qual è" },
  { original: "non sono sicuro se", expanded_f: "non sono sicura se", expanded_m: "non sono sicuro se" },
  { original: "non voglio sembrare nervoso", expanded_f: "non voglio sembrare nervosa", expanded_m: "non voglio sembrare nervoso" },
  { original: "non voglio sembrare troppo occupato per aiutarti", expanded_f: "non voglio sembrare troppo occupata per aiutarti", expanded_m: "non voglio sembrare troppo occupato per aiutarti" }
];

(async () => {
  const rows = results.map(r => ({
    course_code: 'ita_for_eng',
    original_text: r.original,
    language: 'ita',
    expanded_f: r.expanded_f,
    expanded_m: r.expanded_m
  }));

  console.log(`Processing ${rows.length} gender expansions for ita_for_eng batch 22...`);

  // Insert without onConflict first to see if it works
  const { error } = await supabase.from('course_gender_expansions').insert(rows);
  if (error) {
    console.error(`Insert error:`, error.message);
  } else {
    console.log(`✓ Inserted ${rows.length} rows`);
  }

  console.log(`\n✅ SUMMARY`);
  console.log(`Total texts processed: 201`);
  console.log(`Texts with gender variants: ${results.length}`);
  console.log(`Texts needing no changes: ${201 - results.length}`);
})();

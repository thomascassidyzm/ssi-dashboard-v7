const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

async function inspect(courseCode, seedNumber) {
  const { data: seed } = await supabase
    .from("course_seeds")
    .select("*")
    .eq("course_code", courseCode)
    .eq("seed_number", seedNumber)
    .single();

  console.log(`=== SEED ${seedNumber} ===`);
  console.log("Known:", seed.known_text);
  console.log("Target:", seed.target_text);
  console.log();

  const { data: legos } = await supabase
    .from("course_legos")
    .select("*")
    .eq("course_code", courseCode)
    .eq("seed_number", seedNumber)
    .order("lego_index");

  console.log("=== LEGOs ===");
  for (const l of legos) {
    const comps = typeof l.components === "string" ? JSON.parse(l.components || "[]") : (l.components || []);
    console.log(`L${l.lego_index} [${l.type}] ${l.is_new ? "NEW" : "dup"}: "${l.known_text}" -> "${l.target_text}"`);
    if (comps.length > 0) {
      console.log("   Components:", comps.map(c => `"${c.known}" -> "${c.target}"`).join(", "));
    }
  }
  console.log();

  const { data: phrases } = await supabase
    .from("course_practice_phrases")
    .select("*")
    .eq("course_code", courseCode)
    .eq("seed_number", seedNumber)
    .order("lego_index")
    .order("position");

  console.log(`=== PHRASES (${phrases.length} total) ===`);
  let currentLego = null;
  for (const p of phrases) {
    if (p.lego_index !== currentLego) {
      currentLego = p.lego_index;
      console.log(`\n-- LEGO ${p.lego_index} phrases --`);
    }
    console.log(`  P${p.position}: "${p.known_text}" -> "${p.target_text}"`);
  }
}

const courseCode = process.argv[2] || "spa_for_eng";
const seedNumber = parseInt(process.argv[3] || "153", 10);
inspect(courseCode, seedNumber).catch(e => console.error(e));

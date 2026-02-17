const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSE = process.argv[2] || "fra_for_eng";
const MAX_SEED = parseInt(process.argv[3] || "10");

async function run() {
  const { data: seeds } = await supabase
    .from("course_seeds")
    .select("seed_number, known_text, target_text")
    .eq("course_code", COURSE)
    .lte("seed_number", MAX_SEED)
    .order("seed_number");

  for (const s of seeds) {
    console.log("Seed " + s.seed_number + ": " + JSON.stringify(s.known_text) + " → " + JSON.stringify(s.target_text));
  }

  const { data: legos } = await supabase
    .from("course_legos")
    .select("seed_number, lego_index, type, target_text, known_text, is_new")
    .eq("course_code", COURSE)
    .lte("seed_number", MAX_SEED)
    .order("seed_number")
    .order("lego_index");

  const { data: phrases } = await supabase
    .from("course_practice_phrases")
    .select("seed_number, lego_index, position, phrase_role, target_text, known_text")
    .eq("course_code", COURSE)
    .lte("seed_number", MAX_SEED)
    .order("seed_number")
    .order("lego_index")
    .order("position");

  let currentSeed = 0;
  for (const l of legos) {
    if (l.seed_number !== currentSeed) {
      currentSeed = l.seed_number;
      console.log("\n--- Seed " + currentSeed + " ---");
    }
    const lPhrases = phrases.filter(p => p.seed_number === l.seed_number && p.lego_index === l.lego_index);
    const roleCounts = {};
    lPhrases.forEach(p => { roleCounts[p.phrase_role] = (roleCounts[p.phrase_role] || 0) + 1; });
    console.log("  L" + l.lego_index + " [" + l.type + "] " + (l.is_new ? "NEW" : "DUP") + " " +
      JSON.stringify(l.target_text) + " → " + JSON.stringify(l.known_text) +
      " | phrases: " + lPhrases.length + " " + JSON.stringify(roleCounts));

    // Show all phrases
    for (const p of lPhrases) {
      console.log("    " + p.position + " [" + p.phrase_role + "] " + JSON.stringify(p.target_text) + " → " + JSON.stringify(p.known_text));
    }
  }
}
run().catch(e => console.error(e));

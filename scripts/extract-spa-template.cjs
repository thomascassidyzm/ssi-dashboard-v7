const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function extractTemplate() {
  console.log("Extracting spa_for_eng template (first 50 LEGOs)...\n");

  // Get first 50 LEGOs ordered by seed_number, lego_index
  const { data: legos, error: legoError } = await supabase
    .from("course_legos")
    .select("*")
    .eq("course_code", "spa_for_eng")
    .order("seed_number")
    .order("lego_index")
    .limit(50);

  if (legoError) {
    console.error("Error fetching LEGOs:", legoError);
    return;
  }

  console.log(`Found ${legos.length} LEGOs\n`);

  // Get the seed numbers covered
  const seedNumbers = [...new Set(legos.map(l => l.seed_number))];
  console.log(`Covering seeds: ${seedNumbers.join(", ")}\n`);

  // Get practice phrases for these LEGOs
  const { data: phrases, error: phraseError } = await supabase
    .from("course_practice_phrases")
    .select("*")
    .eq("course_code", "spa_for_eng")
    .in("seed_number", seedNumbers)
    .order("seed_number")
    .order("lego_index")
    .order("position");

  if (phraseError) {
    console.error("Error fetching phrases:", phraseError);
    return;
  }

  console.log(`Found ${phrases.length} practice phrases\n`);

  // Display LEGOs
  console.log("=== LEGOs (first 50) ===\n");
  legos.forEach(l => {
    const typeLabel = l.type === "A" ? "A" : `M[${l.components?.length || 0}]`;
    console.log(`S${String(l.seed_number).padStart(4, "0")}L${String(l.lego_index).padStart(2, "0")} [${typeLabel}]: "${l.known_text}" → "${l.target_text}"`);
  });

  console.log("\n=== Practice Phrases (by LEGO) ===\n");

  // Group phrases by seed_number + lego_index
  const phrasesByLego = {};
  phrases.forEach(p => {
    const key = `S${String(p.seed_number).padStart(4, "0")}L${String(p.lego_index).padStart(2, "0")}`;
    if (!phrasesByLego[key]) phrasesByLego[key] = [];
    phrasesByLego[key].push(p);
  });

  // Show phrases for first 20 LEGOs
  const legoKeys = Object.keys(phrasesByLego).slice(0, 20);
  legoKeys.forEach(key => {
    console.log(`${key}:`);
    phrasesByLego[key].forEach(p => {
      console.log(`  ${p.position}. "${p.known_text}" → "${p.target_text}"`);
    });
  });

  // Output JSON for agents
  const templateData = {
    legos: legos.map(l => ({
      seed_number: l.seed_number,
      lego_index: l.lego_index,
      type: l.type,
      is_new: l.is_new,
      known_text: l.known_text,
      target_text: l.target_text,
      components: l.components
    })),
    phrases: phrases.map(p => ({
      seed_number: p.seed_number,
      lego_index: p.lego_index,
      position: p.position,
      known_text: p.known_text,
      target_text: p.target_text,
      word_count: p.word_count,
      lego_count: p.lego_count
    }))
  };

  const fs = require("fs");
  fs.writeFileSync("scripts/spa_template.json", JSON.stringify(templateData, null, 2));
  console.log("\n\nTemplate exported to scripts/spa_template.json");
}

extractTemplate().catch(console.error);

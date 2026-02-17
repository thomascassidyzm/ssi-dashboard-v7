const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  for (const course of ["fra_for_eng", "nld_for_eng"]) {
    console.log("=== " + course + " ===");

    const { data: allLegos } = await supabase
      .from("course_legos")
      .select("seed_number, lego_index, is_new, known_text, target_text")
      .eq("course_code", course)
      .order("seed_number");

    const seedMap = {};
    for (const l of allLegos || []) {
      if (!seedMap[l.seed_number]) seedMap[l.seed_number] = [];
      seedMap[l.seed_number].push(l);
    }

    // Find seeds where ALL LEGOs are duplicates (is_new=false)
    const emptySeeds = [];
    for (const [seedNum, legos] of Object.entries(seedMap)) {
      if (legos.every(l => !l.is_new)) emptySeeds.push(parseInt(seedNum));
    }

    console.log("Seeds with ALL duplicate LEGOs:", emptySeeds.length);
    console.log("Seed numbers:", emptySeeds.slice(0, 25).join(", ") + (emptySeeds.length > 25 ? "..." : ""));

    // Show details for first 3 empty seeds
    for (const seedNum of emptySeeds.slice(0, 3)) {
      const legos = seedMap[seedNum];
      console.log("\n  Seed " + seedNum + ":");
      for (const l of legos) {
        console.log("    L" + l.lego_index + " [is_new=" + l.is_new + "] " + l.known_text + " -> " + l.target_text);
      }

      // Check phrases for this seed
      const { data: phrases } = await supabase
        .from("course_practice_phrases")
        .select("lego_index, position, known_text, target_text, phrase_role")
        .eq("course_code", course)
        .eq("seed_number", seedNum)
        .order("lego_index")
        .order("position");

      console.log("    Phrases: " + (phrases ? phrases.length : 0));
      for (const p of (phrases || []).slice(0, 8)) {
        console.log("      L" + p.lego_index + " pos" + p.position + " [" + p.phrase_role + "] " + p.known_text + " -> " + p.target_text);
      }
    }
    console.log();
  }
})();

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function samplePhraseQuality() {
  const courses = ["zho_for_eng", "deu_for_eng"];

  for (const course of courses) {
    console.log("\n" + "=".repeat(75));
    console.log("PHRASE QUALITY SAMPLE:", course);
    console.log("=".repeat(75));

    // Sample at different points in the course
    const sampleSeeds = [25, 50, 100, 150, 200, 250, 300, 350, 400];

    for (const seedNum of sampleSeeds) {
      const { data: seed } = await supabase
        .from("course_seeds")
        .select("known_text, target_text")
        .eq("course_code", course)
        .eq("seed_number", seedNum)
        .single();

      if (seed === null || seed.target_text === null || seed.target_text === "") continue;

      const { data: phrases } = await supabase
        .from("course_practice_phrases")
        .select("known_text, target_text, lego_index")
        .eq("course_code", course)
        .eq("seed_number", seedNum)
        .order("lego_index");

      if (phrases === null || phrases.length === 0) continue;

      console.log("\n--- Seed " + seedNum + ": \"" + seed.known_text.substring(0, 50) + "...\" ---");
      console.log("    Target: " + seed.target_text);
      console.log("    Total phrases: " + phrases.length);

      // Categorize by length
      const short = phrases.filter(p => p.known_text.split(" ").length <= 4);
      const medium = phrases.filter(p => {
        const words = p.known_text.split(" ").length;
        return words >= 5 && words <= 8;
      });
      const long = phrases.filter(p => p.known_text.split(" ").length >= 9);

      console.log("    Distribution: SHORT=" + short.length + " MEDIUM=" + medium.length + " LONG=" + long.length);

      // Sample 3 from each category
      console.log("\n    SHORT phrases:");
      short.slice(0, 4).forEach(p => {
        console.log("      \"" + p.known_text + "\" → \"" + p.target_text + "\"");
      });

      console.log("\n    MEDIUM phrases:");
      medium.slice(0, 4).forEach(p => {
        console.log("      \"" + p.known_text + "\" → \"" + p.target_text + "\"");
      });

      console.log("\n    LONG phrases:");
      long.slice(0, 4).forEach(p => {
        const known = p.known_text.length > 50 ? p.known_text.substring(0, 50) + "..." : p.known_text;
        const target = p.target_text.length > 40 ? p.target_text.substring(0, 40) + "..." : p.target_text;
        console.log("      \"" + known + "\" → \"" + target + "\"");
      });
    }
  }
}

samplePhraseQuality().catch(console.error);

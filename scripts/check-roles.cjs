const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  // Get BUILD phrases (sample of 20)
  const { data: buildPhrases, error: buildErr } = await supabase
    .from("course_practice_phrases")
    .select("known_text, target_text, seed_number, lego_index")
    .eq("course_code", "ara_for_eng")
    .eq("phrase_role", "build")
    .order("seed_number", { ascending: true })
    .limit(30);

  if (buildErr) {
    console.log("Error getting BUILD phrases:", buildErr.message);
    return;
  }

  console.log("=== BUILD PHRASES (sample of 30) ===");
  buildPhrases.forEach((p, i) => {
    console.log(`${i+1}. [S${p.seed_number}L${p.lego_index}] "${p.known_text}" → "${p.target_text}"`);
  });

  // Get vocabulary (LEGOs) up to seed 50
  const { data: legos, error: legoErr } = await supabase
    .from("course_legos")
    .select("seed_number, lego_index, known_text, target_text, type")
    .eq("course_code", "ara_for_eng")
    .lte("seed_number", 50)
    .order("seed_number", { ascending: true });

  if (legoErr) {
    console.log("Error getting LEGOs:", legoErr.message);
    return;
  }

  console.log("\n=== VOCABULARY (LEGOs up to seed 50) ===");
  console.log("Total LEGOs:", legos.length);

  // Build vocabulary set from target texts
  const vocabSet = new Set();
  legos.forEach(l => {
    // Add target text (this is what learners learn)
    if (l.target_text) {
      vocabSet.add(l.target_text);
    }
  });
  console.log("Unique target forms:", vocabSet.size);
  console.log("Sample vocabulary:", Array.from(vocabSet).slice(0, 20));
}

check();

require("dotenv").config();
const { getClient } = require("../services/supabase-client.cjs");
const supabase = getClient();

async function check() {
  // Check a few M-LEGOs for duplicate phrases
  const samples = [
    { seed: 2, lego: 1 },  // "I'm trying"
    { seed: 12, lego: 1 }, // "I wouldn't like"
    { seed: 27, lego: 2 }, // "taking too much time"
    { seed: 230, lego: 1 } // "forgot to"
  ];

  for (const s of samples) {
    const { data: phrases } = await supabase
      .from("course_practice_phrases")
      .select("position, known_text, target_text, metadata")
      .eq("course_code", "zho_for_eng")
      .eq("seed_number", s.seed)
      .eq("lego_index", s.lego)
      .order("position")
      .limit(10);

    console.log(`\n=== S${s.seed}L${s.lego} ===`);
    phrases?.forEach(p => {
      const meta = p.metadata?.buildup ? ` [${p.metadata.buildup}]` : "";
      console.log(`  ${p.position}. "${p.known_text}" → "${p.target_text}"${meta}`);
    });

    // Check for duplicates
    const targets = phrases?.map(p => p.target_text) || [];
    const seen = new Set();
    const dupes = [];
    for (const t of targets) {
      if (seen.has(t)) dupes.push(t);
      seen.add(t);
    }
    if (dupes.length > 0) {
      console.log(`  ⚠️ DUPLICATES IN DB: ${dupes.join(", ")}`);
    }
  }
}

check();

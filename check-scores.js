const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const { data: phrases } = await supabase
    .from("course_practice_phrases")
    .select("seed_number, known_text, role, metadata")
    .eq("course_code", "deu_for_eng")
    .gte("seed_number", 27)
    .order("seed_number", { ascending: true })
    .limit(15);

  if (phrases && phrases.length > 0) {
    console.log("Phrases from S27+ (should have scores after fix):");
    phrases.forEach(p => {
      const score = p.metadata && p.metadata.score;
      const scoreStr = score !== undefined ? score : "-";
      console.log("  S" + String(p.seed_number).padStart(2) + " | " + (p.known_text || "").substring(0, 35).padEnd(35) + " | " + p.role.padEnd(16) + " | score=" + scoreStr);
    });
  }
}
check();

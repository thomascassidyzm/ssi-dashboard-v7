const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function getPhrases() {
  const { data, error } = await supabase
    .from("course_practice_phrases")
    .select("id, target_text, target_syllable_count")
    .eq("course_code", "en-cy-north")
    .is("target_syllable_count", null);

  if (error) {
    console.log("Error:", error.message);
    return;
  }

  // Dedupe by target_text
  const phraseMap = new Map();
  for (const row of data) {
    if (!phraseMap.has(row.target_text)) {
      phraseMap.set(row.target_text, []);
    }
    phraseMap.get(row.target_text).push(row.id);
  }

  // Output as JSON for processing
  const output = [];
  for (const [phrase, ids] of phraseMap) {
    output.push({ phrase, ids });
  }
  
  console.log(JSON.stringify(output, null, 2));
}

getPhrases().catch(console.error);

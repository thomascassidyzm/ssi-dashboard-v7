require('dotenv').config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

(async () => {
  const { data, error } = await supabase
    .from("course_seeds")
    .select("seed_number, known_text, target_text")
    .eq("course_code", "ita_for_eng")
    .gte("seed_number", 156)
    .lte("seed_number", 184)
    .order("seed_number");

  if (error) {
    console.error("Error:", error);
    process.exit(1);
  }

  data.forEach((seed) => {
    console.log(`\n## Seed ${seed.seed_number}`);
    console.log(`Known: ${seed.known_text}`);
    console.log(`Target: ${seed.target_text}`);
  });
})();

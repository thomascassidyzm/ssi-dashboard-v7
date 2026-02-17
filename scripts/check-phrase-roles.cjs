const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Find LEGOs with USE phrases
  const { data, error } = await supabase
    .from("practice_cycles")
    .select("lego_id")
    .eq("course_code", "fra_for_eng")
    .eq("phrase_role", "use")
    .limit(50);

  if (error) { console.error(error); return; }

  // Count occurrences
  const counts = {};
  data.forEach(row => {
    counts[row.lego_id] = (counts[row.lego_id] || 0) + 1;
  });

  console.log("LEGOs with USE phrases (first 50 rows):");
  Object.entries(counts).sort().slice(0, 20).forEach(([lego, count]) => {
    console.log("  " + lego + ": " + count + " USE phrases");
  });
})();

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkCoverage() {
  let total = 0;
  let withCount = 0;
  let page = 0;
  const PAGE_SIZE = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("practice_cycles")
      .select("target_syllable_count")
      .eq("course_code", "en-cy-north")
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.log("Error:", error.message);
      break;
    }
    if (!data || data.length === 0) break;

    total += data.length;
    withCount += data.filter(r => r.target_syllable_count !== null).length;
    page++;
    console.log(`  Page ${page}: ${data.length} rows`);
  }

  console.log("\npractice_cycles syllable coverage:");
  console.log("  Total rows:", total);
  console.log("  With syllable count:", withCount);
  console.log("  Without (null):", total - withCount);
  console.log("  Coverage:", ((withCount / total) * 100).toFixed(1) + "%");
}

checkCoverage().catch(console.error);

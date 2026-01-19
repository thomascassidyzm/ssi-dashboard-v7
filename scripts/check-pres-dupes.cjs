const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: pres } = await supabase
    .from("course_audio")
    .select("id, lego_id, created_at")
    .eq("course_code", "zho_for_eng")
    .eq("role", "presentation")
    .order("created_at", { ascending: false });

  console.log("Total presentations:", pres.length);

  const byLego = new Map();
  for (const p of pres) {
    if (!byLego.has(p.lego_id)) byLego.set(p.lego_id, []);
    byLego.get(p.lego_id).push(p);
  }

  console.log("Unique lego_ids:", byLego.size);

  const duplicates = [...byLego.entries()].filter(([_, list]) => list.length > 1);
  console.log("LEGOs with multiple presentations:", duplicates.length);

  const counts = {};
  for (const [_, list] of byLego) {
    counts[list.length] = (counts[list.length] || 0) + 1;
  }
  console.log("\nDistribution:");
  for (const [num, count] of Object.entries(counts).sort((a,b) => a[0]-b[0])) {
    console.log("  ", num, "presentation(s):", count, "LEGOs");
  }
})();

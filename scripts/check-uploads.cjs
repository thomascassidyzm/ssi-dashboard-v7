const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env" });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data, error } = await supabase
    .from("raw_seed_uploads")
    .select("id, agent_id, batch_id, status, error, created_at, payload")
    .eq("course_code", "zho_for_eng")
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Error:", error.message);
    return;
  }

  console.log("=== ALL UPLOADS (most recent first) ===");
  console.log("Total uploads:", data.length);

  data.slice(0, 15).forEach(row => {
    const seedIds = [];
    try {
      const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
      if (payload.seeds) {
        payload.seeds.forEach(s => seedIds.push(s.seed_id || s.seedId || "unknown"));
      }
    } catch(e) {}

    console.log({
      batch: row.batch_id,
      agent: row.agent_id,
      status: row.status,
      seeds: seedIds.join(",") || "parse error",
      created: row.created_at?.substring(11,19),
      error: row.error?.substring(0,80) || null
    });
  });

  const nonCompleted = data.filter(r => r.status !== "completed");
  if (nonCompleted.length > 0) {
    console.log("\n=== NON-COMPLETED ===");
    nonCompleted.forEach(r => console.log(r.batch_id, r.status, r.error));
  } else {
    console.log("\n=== All uploads marked completed ===");
  }

  // Check which seeds actually made it
  const allSeeds = new Set();
  data.forEach(row => {
    try {
      const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
      if (payload.seeds) {
        payload.seeds.forEach(s => allSeeds.add(s.seed_id || s.seedId));
      }
    } catch(e) {}
  });

  console.log("\n=== SEEDS IN UPLOADS ===");
  console.log("Unique seeds uploaded:", allSeeds.size);
  console.log("Seeds:", [...allSeeds].sort().join(", "));
})();

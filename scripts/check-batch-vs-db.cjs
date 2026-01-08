const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const batchDir = "./public/vfs/courses/zho_for_eng/phase1_batches";

(async () => {
  // Get seeds from batch files
  const batchSeeds = new Set();
  const files = fs.readdirSync(batchDir).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(batchDir, file)));
    for (const seed of data) {
      batchSeeds.add(seed.seed_id || seed.s);
    }
  }

  // Get seeds from database
  const { data: dbData } = await supabase
    .from("course_seeds")
    .select("seed_id")
    .eq("course_code", "zho_for_eng");
  const dbSeeds = new Set(dbData.map(s => s.seed_id));

  // Find difference
  const inBatchNotDb = [...batchSeeds].filter(s => !dbSeeds.has(s)).sort();
  const inDbNotBatch = [...dbSeeds].filter(s => !batchSeeds.has(s)).sort();

  console.log("Batch files:", batchSeeds.size);
  console.log("Database:", dbSeeds.size);
  console.log("\nIn batches but NOT in DB:", inBatchNotDb.length);
  console.log(inBatchNotDb.join(", "));
  console.log("\nIn DB but NOT in batches:", inDbNotBatch.length);
  console.log(inDbNotBatch.join(", ") || "none");
})();

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

require("dotenv").config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const batchDir = "./public/vfs/courses/zho_for_eng/phase1_batches";
const courseCode = "zho_for_eng";

async function importBatches() {
  const files = fs.readdirSync(batchDir).filter(f => f.endsWith(".json"));
  console.log("Found", files.length, "batch files");

  const { data: existing } = await supabase
    .from("course_seeds")
    .select("seed_id")
    .eq("course_code", courseCode);

  const existingIds = new Set((existing || []).map(s => s.seed_id));
  console.log("Existing in DB:", existingIds.size, "seeds");

  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(batchDir, file), "utf8"));
    const seeds = data.seeds || data;

    for (const seed of seeds) {
      const seedId = seed.seed_id || seed.seedId || seed.seed || seed.s;
      if (!seedId || existingIds.has(seedId)) {
        skipped++;
        continue;
      }

      const known = seed.known || seed.k;
      const target = seed.target || seed.t;
      const legos = seed.legos || seed.l || [];

      const { error: seedErr } = await supabase
        .from("course_seeds")
        .upsert({
          course_code: courseCode,
          seed_id: seedId,
          known_text: known,
          target_text: target
        }, { onConflict: "course_code,seed_id" });

      if (seedErr) {
        console.error("Seed error:", seedId, seedErr.message);
        continue;
      }

      for (const lego of legos) {
        const legoType = lego.type || lego.y || "A";
        const legoKnown = lego.known || lego.k;
        const legoTarget = lego.target || lego.t;
        const isNew = lego.new !== undefined ? lego.new : (lego.n !== undefined ? lego.n === 1 : true);

        await supabase
          .from("course_legos")
          .upsert({
            course_code: courseCode,
            seed_id: seedId,
            lego_type: legoType,
            known_text: legoKnown,
            target_text: legoTarget,
            is_new: isNew,
            source: "phase1_batch_import"
          }, { onConflict: "course_code,seed_id,known_text,target_text" });
      }

      imported++;
      existingIds.add(seedId);
    }
  }

  console.log("Imported:", imported, "seeds");
  console.log("Skipped:", skipped);

  const { count } = await supabase
    .from("course_seeds")
    .select("*", { count: "exact", head: true })
    .eq("course_code", courseCode);

  console.log("Total in DB now:", count);
}

importBatches().catch(console.error);

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  // Get all presentations sorted by newest first
  const { data: pres } = await supabase
    .from("course_audio")
    .select("id, lego_id, created_at")
    .eq("course_code", "zho_for_eng")
    .eq("role", "presentation")
    .order("created_at", { ascending: false });

  // Find newest presentation per LEGO
  const newestByLego = new Map();
  const toDelete = [];

  for (const p of pres) {
    if (!newestByLego.has(p.lego_id)) {
      newestByLego.set(p.lego_id, p.id);
    } else {
      toDelete.push(p.id);
    }
  }

  console.log("Keeping:", newestByLego.size, "presentations (newest per LEGO)");
  console.log("To delete:", toDelete.length, "older duplicates");

  // Step 1: Update lego_introductions to point to newest
  console.log("\nStep 1: Updating lego_introductions...");
  for (const [legoId, audioId] of newestByLego) {
    await supabase
      .from("lego_introductions")
      .update({ presentation_audio_id: audioId, audio_uuid: audioId })
      .eq("course_code", "zho_for_eng")
      .eq("lego_id", legoId);
  }
  console.log("  Updated", newestByLego.size, "references");

  // Step 2: Delete old presentations in batches
  console.log("\nStep 2: Deleting old presentations...");
  const batchSize = 50;
  let deleted = 0;
  let errors = 0;

  for (let i = 0; i < toDelete.length; i += batchSize) {
    const batch = toDelete.slice(i, i + batchSize);
    const { error } = await supabase
      .from("course_audio")
      .delete()
      .in("id", batch);

    if (error) {
      console.error("  Batch error:", error.message);
      errors++;
    } else {
      deleted += batch.length;
    }

    if ((i + batchSize) % 200 === 0) {
      console.log("  Progress:", Math.min(i + batchSize, toDelete.length), "/", toDelete.length);
    }
  }

  console.log("  Deleted:", deleted, "| Errors:", errors);

  // Verify
  const { count } = await supabase
    .from("course_audio")
    .select("*", { count: "exact", head: true })
    .eq("course_code", "zho_for_eng")
    .eq("role", "presentation");

  console.log("\nFinal count:", count, "presentations");
  console.log("Expected:", newestByLego.size);
  console.log(count === newestByLego.size ? "✓ Clean!" : "⚠ Mismatch");
})();

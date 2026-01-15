const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function exportLegos() {
  const { data, error } = await supabase
    .from("course_legos")
    .select("*")
    .eq("course_code", "zho_for_eng")
    .order("seed_number")
    .order("lego_index");

  if (error) {
    console.log("Error:", error);
    return;
  }

  const enriched = data.map(l => ({
    lego_id: l.lego_id,
    seed_number: l.seed_number,
    lego_index: l.lego_index,
    type: l.type,
    is_new: l.is_new,
    known_text: l.known_text,
    target_text: l.target_text,
    known_word_count: l.known_text.split(/\s+/).length,
    components: l.components,
    component_count: l.components ? l.components.length : 0
  }));

  fs.writeFileSync("zho_for_eng_legos_export.json", JSON.stringify(enriched, null, 2));
  console.log("Exported to zho_for_eng_legos_export.json");
  console.log("");
  console.log("=== SUMMARY ===");
  console.log("Total LEGOs:", enriched.length);
  console.log("A-type:", enriched.filter(l => l.type === "A").length);
  console.log("M-type:", enriched.filter(l => l.type === "M").length);
  console.log("NEW:", enriched.filter(l => l.is_new).length);
  console.log("Existing:", enriched.filter(l => !l.is_new).length);
  console.log("");
  console.log("M-types with components:", enriched.filter(l => l.type === "M" && l.component_count > 0).length);
  console.log("M-types WITHOUT components:", enriched.filter(l => l.type === "M" && l.component_count === 0).length);
}

exportLegos().catch(console.error);

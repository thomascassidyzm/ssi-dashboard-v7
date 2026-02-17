const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fillMissingSeeds() {
  const courseCode = "eng_for_por";

  const { data: existing } = await supabase
    .from("course_seeds")
    .select("seed_number")
    .eq("course_code", courseCode);

  const existingSet = new Set(existing.map(s => s.seed_number));
  console.log("Existing seeds:", existingSet.size);

  const { data: canonical } = await supabase
    .from("canonical_seeds")
    .select("seed_number, source_text")
    .order("seed_number");

  console.log("Canonical seeds:", canonical.length);

  const { data: translations } = await supabase
    .from("canonical_seed_translations")
    .select("seed_number, translated_text")
    .eq("language_code", "por");

  const transMap = new Map();
  if (translations) {
    translations.forEach(t => transMap.set(t.seed_number, t.translated_text));
  }
  console.log("Portuguese translations available:", transMap.size);

  const missing = canonical.filter(c => !existingSet.has(c.seed_number));
  console.log("Missing seeds:", missing.length);

  if (missing.length === 0) {
    console.log("No missing seeds");
    return;
  }

  // eng_for_por: target_text = canonical (English), known_text = Portuguese translation
  const toInsert = missing.map(c => ({
    course_code: courseCode,
    seed_number: c.seed_number,
    target_text: c.source_text.replace(/\{target\}/g, "Portuguese"),
    known_text: transMap.get(c.seed_number) || "",
    status: "draft"
  }));

  console.log("Inserting", toInsert.length, "seeds...");

  const { error } = await supabase
    .from("course_seeds")
    .insert(toInsert);

  if (error) {
    console.error("Insert error:", error);
    return;
  }

  const { data: final } = await supabase
    .from("course_seeds")
    .select("seed_number")
    .eq("course_code", courseCode);

  console.log("Final seed count:", final.length);
}

fillMissingSeeds();

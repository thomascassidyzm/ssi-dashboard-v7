const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function createCourseSeeds(courseCode, seedNumbers) {
  console.log(`Creating course_seeds for ${courseCode}...`);

  // Get Spanish seeds as template
  const { data: spaSeeds, error: spaErr } = await supabase
    .from("course_seeds")
    .select("*")
    .eq("course_code", "spa_for_eng")
    .in("seed_number", seedNumbers)
    .order("seed_number");

  if (spaErr) {
    console.error("Error fetching spa_for_eng seeds:", spaErr);
    return false;
  }

  // Map language replacements
  const langMap = {
    "fra_for_eng": { from: "Spanish", to: "French", fromTarget: "español", toTarget: "français" },
    "zho_for_eng": { from: "Spanish", to: "Chinese", fromTarget: "español", toTarget: "中文" },
    "deu_for_eng": { from: "Spanish", to: "German", fromTarget: "español", toTarget: "Deutsch" }
  };

  const mapping = langMap[courseCode];
  if (!mapping) {
    console.error("Unknown course code:", courseCode);
    return false;
  }

  // Create seed records (seed_id is auto-generated)
  const seedRecords = spaSeeds.map(s => ({
    course_code: courseCode,
    seed_number: s.seed_number,
    known_text: s.known_text.replace(new RegExp(mapping.from, "gi"), mapping.to),
    target_text: `[placeholder - ${courseCode} seed ${s.seed_number}]`,
    status: "draft",
    version: 1
  }));

  const { data: inserted, error: insertErr } = await supabase
    .from("course_seeds")
    .upsert(seedRecords, { onConflict: "course_code,seed_number" })
    .select();

  if (insertErr) {
    console.error("Error inserting seeds:", insertErr);
    return false;
  }

  console.log(`  Created/updated ${inserted.length} seeds`);
  return true;
}

async function importCourse(filename) {
  const data = JSON.parse(fs.readFileSync(filename, "utf8"));
  const courseCode = data.course_code;

  console.log(`\n=== Importing ${courseCode} ===`);
  console.log(`LEGOs: ${data.legos.length}, Phrases: ${data.phrases.length}`);

  // Get unique seed numbers from LEGOs
  const seedNumbers = [...new Set(data.legos.map(l => l.seed_number))];
  console.log(`Seeds covered: ${seedNumbers.join(", ")}`);

  // Create course_seeds first
  const seedsCreated = await createCourseSeeds(courseCode, seedNumbers);
  if (!seedsCreated) {
    console.error("Failed to create seeds, aborting");
    return false;
  }

  // Clear existing LEGOs and phrases
  console.log(`Clearing existing LEGOs and phrases for ${courseCode}...`);

  await supabase
    .from("course_practice_phrases")
    .delete()
    .eq("course_code", courseCode);

  await supabase
    .from("course_legos")
    .delete()
    .eq("course_code", courseCode);

  // Insert LEGOs - fix type: "B" -> "M"
  console.log(`Inserting ${data.legos.length} LEGOs...`);
  const legoRecords = data.legos.map(l => ({
    course_code: courseCode,
    seed_number: l.seed_number,
    lego_index: l.lego_index,
    type: (l.type === "B" ? "M" : l.type) || "A",  // Fix B -> M
    is_new: l.is_new !== undefined ? l.is_new : true,
    known_text: l.known_text,
    target_text: l.target_text,
    components: l.components || null
  }));

  const { data: insertedLegos, error: legoErr } = await supabase
    .from("course_legos")
    .insert(legoRecords)
    .select();

  if (legoErr) {
    console.error("Error inserting LEGOs:", legoErr);
    return false;
  }
  console.log(`  Inserted ${insertedLegos.length} LEGOs`);

  // Insert Phrases in batches
  console.log(`Inserting ${data.phrases.length} phrases...`);
  const phraseRecords = data.phrases.map(p => ({
    course_code: courseCode,
    seed_number: p.seed_number,
    lego_index: p.lego_index,
    position: p.position,
    known_text: p.known_text,
    target_text: p.target_text,
    word_count: p.word_count || p.known_text.split(/\s+/).length,
    lego_count: p.lego_count || p.lego_index  // Default to lego_index if not specified
  }));

  const batchSize = 100;
  let insertedCount = 0;

  for (let i = 0; i < phraseRecords.length; i += batchSize) {
    const batch = phraseRecords.slice(i, i + batchSize);
    const { data: inserted, error: phraseErr } = await supabase
      .from("course_practice_phrases")
      .insert(batch)
      .select();

    if (phraseErr) {
      console.error("Error inserting phrases:", phraseErr);
      return false;
    }
    insertedCount += inserted.length;
  }
  console.log(`  Inserted ${insertedCount} phrases`);

  console.log(`${courseCode} import complete!`);
  return true;
}

async function main() {
  console.log("=== Course Import to Supabase ===\n");

  const files = [
    "scripts/fra_course_output_fixed.json",
    "scripts/zho_course_output_fixed.json",
    "scripts/deu_course_output_fixed.json"
  ];

  for (const file of files) {
    if (fs.existsSync(file)) {
      const success = await importCourse(file);
      if (!success) {
        console.error(`Failed to import ${file}`);
      }
    } else {
      console.log(`File not found: ${file}`);
    }
  }

  console.log("\n=== Verifying Database ===");
  for (const code of ["fra_for_eng", "zho_for_eng", "deu_for_eng"]) {
    const { count: seedCount } = await supabase
      .from("course_seeds")
      .select("*", { count: "exact", head: true })
      .eq("course_code", code);

    const { count: legoCount } = await supabase
      .from("course_legos")
      .select("*", { count: "exact", head: true })
      .eq("course_code", code);

    const { count: phraseCount } = await supabase
      .from("course_practice_phrases")
      .select("*", { count: "exact", head: true })
      .eq("course_code", code);

    console.log(`${code}: ${seedCount} seeds, ${legoCount} LEGOs, ${phraseCount} phrases`);
  }
}

main().catch(console.error);

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function runMigration() {
  console.log("Adding target_syllable_count column to course_practice_phrases...");

  // We can't run raw SQL via supabase-js, so let's check if column exists
  // and provide instructions

  const { data, error } = await supabase
    .from("course_practice_phrases")
    .select("target_syllable_count")
    .limit(1);

  if (error && error.message.includes("does not exist")) {
    console.log("\nColumn does not exist yet. Run this SQL in Supabase dashboard:\n");
    console.log("ALTER TABLE course_practice_phrases");
    console.log("ADD COLUMN IF NOT EXISTS target_syllable_count INTEGER;");
    console.log("\nOr run: database/migrations/add_syllable_count.sql");
  } else if (error) {
    console.log("Error:", error.message);
  } else {
    console.log("Column already exists! Ready for backfill.");
  }
}

runMigration().catch(console.error);

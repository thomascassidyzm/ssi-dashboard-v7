#!/usr/bin/env node
require("dotenv").config();
const { supabase, isInitialized } = require("../services/supabase-client.cjs");

async function nukeCompletely(code) {
  if (!isInitialized()) {
    console.error("Supabase not init");
    process.exit(1);
  }

  console.log("Nuking course completely:", code);

  const tables = [
    ["course_practice_phrases", "course_code"],
    ["course_audio", "course_code"],
    ["course_legos", "course_code"],
    ["course_seeds", "course_code"],
    ["courses", "code"]
  ];

  for (const [table, col] of tables) {
    const { error, count } = await supabase.from(table).delete({ count: "exact" }).eq(col, code);
    console.log("  " + table + ":", error ? "ERROR - " + error.message : "deleted " + (count || 0));
  }
  console.log("Done - course completely removed");
}

const courseCode = process.argv[2];
if (!courseCode) {
  console.error("Usage: node scripts/nuke-course.cjs <course_code>");
  process.exit(1);
}

nukeCompletely(courseCode);

/**
 * Reset German and Portuguese courses for rebuild with Opus
 * - Deletes all LEGOs and phrases
 * - Clears target_text from seeds (keeps known_text)
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSES_TO_RESET = ["deu_for_eng", "por_for_eng"];

async function resetCourse(courseCode) {
  console.log("\n" + "=".repeat(60));
  console.log("RESETTING:", courseCode);
  console.log("=".repeat(60));

  // Get current stats
  const { count: seedCount } = await supabase
    .from("course_seeds")
    .select("*", { count: "exact", head: true })
    .eq("course_code", courseCode)
    .neq("target_text", "");

  const { count: legoCount } = await supabase
    .from("course_legos")
    .select("*", { count: "exact", head: true })
    .eq("course_code", courseCode);

  const { count: phraseCount } = await supabase
    .from("course_practice_phrases")
    .select("*", { count: "exact", head: true })
    .eq("course_code", courseCode);

  console.log("Current state:");
  console.log("  Completed seeds:", seedCount);
  console.log("  LEGOs:", legoCount);
  console.log("  Phrases:", phraseCount);

  // Delete phrases
  console.log("\nDeleting phrases...");
  const { error: phraseErr } = await supabase
    .from("course_practice_phrases")
    .delete()
    .eq("course_code", courseCode);

  if (phraseErr) {
    console.log("  ERROR:", phraseErr.message);
  } else {
    console.log("  Deleted", phraseCount, "phrases");
  }

  // Delete LEGOs
  console.log("Deleting LEGOs...");
  const { error: legoErr } = await supabase
    .from("course_legos")
    .delete()
    .eq("course_code", courseCode);

  if (legoErr) {
    console.log("  ERROR:", legoErr.message);
  } else {
    console.log("  Deleted", legoCount, "LEGOs");
  }

  // Clear target_text from all seeds
  console.log("Clearing target_text from seeds...");
  const { error: seedErr } = await supabase
    .from("course_seeds")
    .update({ target_text: "" })
    .eq("course_code", courseCode);

  if (seedErr) {
    console.log("  ERROR:", seedErr.message);
  } else {
    console.log("  Cleared target_text from all seeds");
  }

  // Verify
  const { count: newLegoCount } = await supabase
    .from("course_legos")
    .select("*", { count: "exact", head: true })
    .eq("course_code", courseCode);

  const { count: newPhraseCount } = await supabase
    .from("course_practice_phrases")
    .select("*", { count: "exact", head: true })
    .eq("course_code", courseCode);

  const { count: newSeedCount } = await supabase
    .from("course_seeds")
    .select("*", { count: "exact", head: true })
    .eq("course_code", courseCode)
    .neq("target_text", "");

  console.log("\nAfter reset:");
  console.log("  Seeds with target_text:", newSeedCount);
  console.log("  LEGOs:", newLegoCount);
  console.log("  Phrases:", newPhraseCount);

  if (newLegoCount === 0 && newPhraseCount === 0 && newSeedCount === 0) {
    console.log("\n✓ Course reset successfully - ready for Opus rebuild");
  } else {
    console.log("\n⚠️  Some data may remain - check manually");
  }
}

async function main() {
  console.log("SONNET COURSE RESET SCRIPT");
  console.log("Courses to reset:", COURSES_TO_RESET.join(", "));
  console.log("\nThis will DELETE all LEGOs and phrases and clear translations.");
  console.log("Known seed texts will be preserved.\n");

  for (const course of COURSES_TO_RESET) {
    await resetCourse(course);
  }

  console.log("\n" + "=".repeat(60));
  console.log("RESET COMPLETE");
  console.log("=".repeat(60));
  console.log("\nBoth courses are now ready for rebuild with Opus.");
  console.log("Launch Course Builder with Opus model for each course.");
}

main().catch(console.error);

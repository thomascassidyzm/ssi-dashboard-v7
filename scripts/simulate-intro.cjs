const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.env" });

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const courseId = "por_for_eng";
const audioBaseUrl = "https://ssi-audio-mastered.s3.eu-west-1.amazonaws.com";

async function simulate() {
  console.log("=== SIMULATING generateLearningScript ===");
  console.log("Course:", courseId);
  console.log("");

  // Step 1: Load LEGOs from lego_cycles
  console.log("1. Loading LEGOs from lego_cycles...");
  const { data: legoData, error: legoError } = await supabase
    .from("lego_cycles")
    .select("lego_id, seed_number, lego_index")
    .eq("course_code", courseId)
    .order("seed_number", { ascending: true })
    .order("lego_index", { ascending: true })
    .limit(10);

  if (legoError) {
    console.log("   Error:", legoError.message);
    return;
  }

  // Dedupe by lego_id
  const seenLegos = new Set();
  const uniqueLegos = legoData.filter(record => {
    if (seenLegos.has(record.lego_id)) return false;
    seenLegos.add(record.lego_id);
    return true;
  });

  const legoIds = uniqueLegos.map(l => l.lego_id);
  console.log("   Found", uniqueLegos.length, "unique LEGOs");
  console.log("   IDs:", legoIds.join(", "));
  console.log("");

  // Step 2: Query lego_introductions
  console.log("2. Querying lego_introductions...");
  const { data: introData } = await supabase
    .from("lego_introductions")
    .select("lego_id, audio_uuid, presentation_audio_id")
    .eq("course_code", courseId)
    .in("lego_id", legoIds);

  console.log("   Found:", introData ? introData.length : 0, "records");
  console.log("");

  // Step 3: Build introAudioMap from lego_introductions (will be empty)
  const introAudioMap = new Map();
  console.log("3. introAudioMap size after lego_introductions:", introAudioMap.size);
  console.log("");

  // Step 4: FALLBACK - Query course_audio for missing LEGOs
  const missingLegoIds = legoIds.filter(id => !introAudioMap.has(id));
  console.log("4. Fallback: Looking for", missingLegoIds.length, "missing intro audios");

  const { data: presentationAudio, error: presError } = await supabase
    .from("course_audio")
    .select("id, lego_id, s3_key")
    .eq("course_code", courseId)
    .eq("role", "presentation")
    .in("lego_id", missingLegoIds);

  if (presError) {
    console.log("   Error:", presError.message);
  } else {
    console.log("   Found:", presentationAudio ? presentationAudio.length : 0, "presentation audio records");
    if (presentationAudio && presentationAudio.length > 0) {
      for (const audio of presentationAudio) {
        if (audio.lego_id && audio.s3_key && !introAudioMap.has(audio.lego_id)) {
          introAudioMap.set(audio.lego_id, {
            id: audio.id,
            url: audioBaseUrl + "/" + audio.s3_key
          });
        }
      }
    }
  }
  console.log("");

  // Final state
  console.log("5. Final introAudioMap size:", introAudioMap.size);
  console.log("");

  // Check each LEGO
  console.log("6. Checking intro audio for each LEGO:");
  for (const legoId of legoIds) {
    const intro = introAudioMap.get(legoId);
    if (intro) {
      console.log("   " + legoId + ": " + intro.url.substring(0, 70) + "...");
    } else {
      console.log("   " + legoId + ": MISSING");
    }
  }
}

simulate().catch(console.error);

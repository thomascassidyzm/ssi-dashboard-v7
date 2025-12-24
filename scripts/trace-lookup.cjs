const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

async function trace() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const testPhrase = "dw i isio";
  const courseId = "cym_n_for_eng";

  console.log("Step 1: Looking up text:", testPhrase);
  const { data: texts } = await supabase
    .from("texts")
    .select("id, content")
    .in("content", [testPhrase]);
  console.log("  Found texts:", texts?.length || 0);
  if (!texts || texts.length === 0) return;
  const textId = texts[0].id;
  console.log("  text_id:", textId);

  console.log("\nStep 2: Looking up audio_files for text_id:", textId);
  const { data: audioFiles } = await supabase
    .from("audio_files")
    .select("id, text_id, voice_id")
    .eq("text_id", textId);
  console.log("  Found audio_files:", audioFiles?.length || 0);
  if (audioFiles) audioFiles.forEach(af => console.log("   ", af.id, "|", af.voice_id));
  if (!audioFiles || audioFiles.length === 0) return;

  const audioIds = audioFiles.map(af => af.id);
  console.log("\nStep 3: Looking up course_audio for these audio_ids");
  const { data: courseAudio } = await supabase
    .from("course_audio")
    .select("audio_id, role, course_code")
    .eq("course_code", courseId)
    .in("audio_id", audioIds);
  console.log("  Found course_audio:", courseAudio?.length || 0);
  if (courseAudio) courseAudio.forEach(ca => console.log("   ", ca.audio_id, "|", ca.role));
}

trace().catch(console.error);

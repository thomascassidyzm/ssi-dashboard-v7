const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: expansions } = await sb.from("course_gender_expansions")
    .select("original_text")
    .eq("course_code", "por_for_eng");

  console.log("Gender expansions:", expansions.length);
  let flagged = 0;
  let notFound = 0;

  for (const e of expansions) {
    for (const role of ["target1", "target2"]) {
      const { data: audio } = await sb.from("course_audio")
        .select("id")
        .eq("course_code", "por_for_eng")
        .eq("text", e.original_text)
        .eq("role", role)
        .limit(1);

      if (audio && audio.length > 0) {
        const { error } = await sb.from("audio_flags").upsert({
          audio_uuid: audio[0].id,
          course_code: "por_for_eng",
          status: "flagged",
          reason: "gender-expansion",
          flagged_by: "gender-prep",
          created_at: new Date().toISOString()
        }, { onConflict: "audio_uuid,course_code" });
        if (!error) flagged++;
      } else {
        notFound++;
      }
    }
  }
  console.log("Flagged:", flagged, "| Audio not found:", notFound);
})();

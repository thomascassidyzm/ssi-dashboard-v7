const fs = require("fs-extra");
const { generateLegacyUUID, generateSampleUUID } = require("../services/uuid-service.cjs");
const s3Index = fs.readJsonSync("temp/s3-audio-index.json");
const s3Set = new Set(s3Index.uuids);
const manifest = fs.readJsonSync("public/vfs/courses/cmn_for_eng/course_manifest.json");
const mar = fs.readJsonSync("temp/audio-index.json");

const VOICE_MAP = {
  target1: "azure_zh-CN-XiaoxiaoNeural",
  target2: "azure_zh-CN-YunxiNeural",
  source: "elevenlabs_FOIN928B9X0jwgJ95cLt",
  presentation: "elevenlabs_FOIN928B9X0jwgJ95cLt"
};

// Find samples that are NOT in MAR
const slice = manifest.slices[0];
let count = 0;

for (const [text, samples] of Object.entries(slice.samples)) {
  for (const sample of samples) {
    const { role, cadence } = sample;
    const language = sample.language || (role === "source" || role === "presentation" ? "eng" : "cmn");
    const marKey = `${language}|${text}|${role}|${cadence}`;

    if (!mar.samples[marKey]) {
      count++;
      if (count <= 5) {
        const voiceId = VOICE_MAP[role];
        const legacyUuid = generateLegacyUUID(text, language, role, cadence);
        const newUuid = voiceId ? generateSampleUUID(text, language, role, cadence, voiceId) : null;

        console.log(`\nMissing sample #${count}:`);
        console.log("  Text:", text.substring(0, 50));
        console.log("  Role:", role, "| Lang:", language, "| Cadence:", cadence);
        console.log("  MAR key:", marKey.substring(0, 60));
        console.log("  Legacy UUID:", legacyUuid, "| In S3:", s3Set.has(legacyUuid));
        if (newUuid) {
          console.log("  New UUID:", newUuid, "| In S3:", s3Set.has(newUuid));
        }
      }
    }
  }
}

console.log(`\nTotal missing: ${count}`);

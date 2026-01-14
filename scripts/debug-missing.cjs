const fs = require("fs-extra");
const path = require("path");
const { generateLegacyUUID, generateSampleUUID } = require("../services/uuid-service.cjs");

const VOICE_MAP = {
  target1: "azure_zh-CN-XiaoxiaoNeural",
  target2: "azure_zh-CN-YunxiNeural",
  source: "elevenlabs_FOIN928B9X0jwgJ95cLt",
  presentation: "elevenlabs_FOIN928B9X0jwgJ95cLt"
};

async function loadJsonFile(filePath, description) {
  const fullPath = path.resolve(filePath);
  try {
    console.log(`Loading ${description}...`);
    const startTime = Date.now();
    const data = await fs.readJson(fullPath);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  Loaded ${description} in ${elapsed}s`);
    return data;
  } catch (error) {
    if (error.code === "ENOENT") {
      console.error(`Error: File not found: ${fullPath}`);
    } else if (error instanceof SyntaxError) {
      console.error(`Error: Invalid JSON in ${fullPath}: ${error.message}`);
    } else {
      console.error(`Error loading ${description}: ${error.message}`);
    }
    process.exit(1);
  }
}

async function main() {
  // Load large JSON files in parallel for better performance
  const [s3Index, manifest, mar] = await Promise.all([
    loadJsonFile("temp/s3-audio-index.json", "S3 audio index (32MB)"),
    loadJsonFile("public/vfs/courses/cmn_for_eng/course_manifest.json", "course manifest"),
    loadJsonFile("temp/audio-index.json", "audio index (59MB)")
  ]);

  const s3Set = new Set(s3Index.uuids);
  console.log(`\nS3 index contains ${s3Set.size} UUIDs`);
  console.log(`MAR contains ${Object.keys(mar.samples).length} samples\n`);

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

          console.log(`Missing sample #${count}:`);
          console.log("  Text:", text.substring(0, 50));
          console.log("  Role:", role, "| Lang:", language, "| Cadence:", cadence);
          console.log("  MAR key:", marKey.substring(0, 60));
          console.log("  Legacy UUID:", legacyUuid, "| In S3:", s3Set.has(legacyUuid));
          if (newUuid) {
            console.log("  New UUID:", newUuid, "| In S3:", s3Set.has(newUuid));
          }
          console.log();
        }
      }
    }
  }

  console.log(`Total missing: ${count}`);
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});

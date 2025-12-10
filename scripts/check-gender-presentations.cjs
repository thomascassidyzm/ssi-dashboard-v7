const fs = require("fs");
const manifest = JSON.parse(fs.readFileSync("public/vfs/courses/spa_for_eng/course_manifest.json", "utf8"));

// First-person adjective patterns that need gender explanations
const firstPersonAdj = [
  "estoy seguro",
  "estoy preparado",
  "estoy listo",
  "estoy contento",
  "estoy ocupado",
  "estoy cansado",
  "estoy convencido",
  "estoy preocupado",
  "estoy entusiasmado",
  "estoy sorprendido",
  "estoy agradecido",
  "estoy equivocado"
];

const samples = manifest.slices?.[0]?.samples || {};
const found = [];

for (const slice of manifest.slices || []) {
  for (const seed of slice.seeds || []) {
    for (const item of seed.introduction_items || []) {
      if (item.presentation == null) continue;
      const introTarget = (item.node?.target?.text || "").toLowerCase();

      // Check if this is a first-person adjective intro
      for (const adj of firstPersonAdj) {
        if (introTarget === adj || introTarget.startsWith(adj + " ")) {
          const sampleEntry = samples[item.presentation];
          const presSample = sampleEntry?.find(s => s.role === "presentation");

          found.push({
            intro: item.node?.target?.text,
            english: item.node?.known?.text,
            presentation: item.presentation,
            uuid: presSample?.id || "NO UUID",
            seedId: seed.id
          });
          break;
        }
      }
    }
  }
}

// Dedupe by intro text
const unique = [];
const seen = new Set();
for (const f of found) {
  if (!seen.has(f.intro.toLowerCase())) {
    seen.add(f.intro.toLowerCase());
    unique.push(f);
  }
}

console.log("=== INTRO ITEMS NEEDING GENDER EXPLANATIONS ===\n");
console.log("Found " + unique.length + " unique first-person adjective intros:\n");

unique.forEach((f, i) => {
  console.log((i+1) + ". INTRO: \"" + f.intro + "\"");
  console.log("   ENGLISH: \"" + f.english + "\"");
  console.log("   UUID: " + f.uuid);
  console.log("   CURRENT: \"" + f.presentation.substring(0, 80) + "...\"");
  console.log();
});

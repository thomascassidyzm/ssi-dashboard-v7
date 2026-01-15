/**
 * Fix course tiling by adding missing bare verb LEGOs
 *
 * Problem: Agents created LEGOs like "I'm trying to" but phrases use bare verbs "speak"
 * Solution: Add missing bare verbs as new LEGOs
 */

const fs = require('fs');

// Missing LEGOs to add (known_text -> target_text per language)
const MISSING_LEGOS = {
  fra_for_eng: {
    "speak": "parler",
    "understand": "comprendre",
    "learn": "apprendre",
    "practise": "pratiquer",
    "practising": "pratiquer",
    "continue": "continuer",
    "say": "dire",
    "slowly": "lentement",
    "good": "bon",
    "work": "travailler",
    "travel": "voyager",
    "to France": "en France",
    "I can't": "je ne peux pas",  // Full phrase to avoid "I can" + "'t" split
    "yet": "encore",
    "to communicate": "communiquer",
    "in French": "en français",
    "with native speakers": "avec des locuteurs natifs"
  },
  deu_for_eng: {
    "speak": "sprechen",
    "understand": "verstehen",
    "speaking": "zu sprechen",
    "slowly": "langsam"
  },
  zho_for_eng: {
    "understand": "懂",
    "say": "说",
    "me": "我",
    "with me": "和我",
    "practise": "练习",
    "to practise": "练习",  // Adds the "to practise" form
    "speaking": "说话",
    "learn": "学",
    "learn how to": "学怎么",
    "more": "更多",
    "read": "读",
    "books": "书",
    "Chinese books": "中文书",
    "ask": "问",
    "a question": "一个问题",
    "this word": "这个词",
    "this": "这个",
    "listen to": "听",
    "music": "音乐",
    "every day": "每天",
    "words": "词"
  }
};

function fixCourse(filename) {
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const course = data.course_code;
  const missing = MISSING_LEGOS[course];

  if (!missing) {
    console.log(`No fixes defined for ${course}`);
    return;
  }

  console.log(`\n=== Fixing ${course} ===`);

  // Build existing LEGO lookup
  const existingLegos = new Set();
  data.legos.forEach(l => {
    existingLegos.add(l.known_text.toLowerCase());
  });

  // Find highest seed/lego indices to add new LEGOs after
  const maxSeed = Math.max(...data.legos.map(l => l.seed_number));

  // Add missing LEGOs
  let addedCount = 0;
  const newLegoSeed = maxSeed + 1; // Put all new LEGOs in a new seed
  let legoIndex = 1;

  for (const [known, target] of Object.entries(missing)) {
    if (!existingLegos.has(known.toLowerCase())) {
      data.legos.push({
        seed_number: newLegoSeed,
        lego_index: legoIndex++,
        type: "A",
        is_new: true,
        known_text: known,
        target_text: target,
        components: null
      });
      addedCount++;
      console.log(`  Added: "${known}" → "${target}"`);
    } else {
      console.log(`  Skipped (exists): "${known}"`);
    }
  }

  console.log(`Added ${addedCount} new LEGOs to seed ${newLegoSeed}`);

  // Save updated file
  const outFilename = filename.replace('.json', '_fixed.json');
  fs.writeFileSync(outFilename, JSON.stringify(data, null, 2));
  console.log(`Saved to: ${outFilename}`);

  return outFilename;
}

function verifyTiling(filename) {
  const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const course = data.course_code;

  // Build LEGO lookup
  const legoTexts = new Set();
  data.legos.forEach(l => {
    legoTexts.add(l.known_text.toLowerCase().replace(/['']/g, "'"));
  });

  let tilingFails = 0;

  data.phrases.forEach(p => {
    const phrase = p.known_text.toLowerCase().replace(/['']/g, "'");
    let remaining = phrase;

    const sortedLegos = Array.from(legoTexts).sort((a, b) => b.length - a.length);

    while (remaining.trim().length > 0) {
      let found = false;
      for (const lego of sortedLegos) {
        if (remaining.trim().startsWith(lego)) {
          remaining = remaining.slice(remaining.indexOf(lego) + lego.length).trim();
          found = true;
          break;
        }
      }
      if (!found) break;
    }

    if (remaining.trim().length > 0) {
      tilingFails++;
    }
  });

  console.log(`\n${course} tiling: ${data.phrases.length - tilingFails}/${data.phrases.length} pass (${Math.round((data.phrases.length - tilingFails)/data.phrases.length*100)}%)`);

  return tilingFails;
}

// Run fixes
console.log("=== Course Tiling Fix ===\n");

const files = [
  'scripts/fra_course_output.json',
  'scripts/deu_course_output.json',
  'scripts/zho_course_output.json'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    const fixed = fixCourse(file);
    if (fixed) {
      verifyTiling(fixed);
    }
  }
}

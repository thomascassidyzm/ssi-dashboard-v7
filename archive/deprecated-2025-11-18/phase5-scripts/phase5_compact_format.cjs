#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Phase 5: Compact Format Converter
 *
 * Converts pretty-printed JSON to compact format for easier visual scanning
 * - practice_phrases array on single line per phrase
 * - LEGOs more compact
 * - Easier to see all phrases at a glance
 */

const courseDir = process.argv[2];

if (!courseDir) {
  console.error('❌ Usage: node phase5_compact_format.cjs <course_directory>');
  process.exit(1);
}

const phase5Dir = path.join(courseDir, 'phase5_outputs');

console.log('📝 Converting Phase 5 Outputs to Compact Format');
console.log(`📁 Directory: ${phase5Dir}\n`);

const files = fs.readdirSync(phase5Dir)
  .filter(f => f.startsWith('seed_s') && f.endsWith('.json'))
  .sort();

let filesProcessed = 0;

files.forEach(file => {
  const filePath = path.join(phase5Dir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Custom compact serialization
  let output = '{\n';
  output += `  "version": "${data.version}",\n`;
  output += `  "seed_id": "${data.seed_id}",\n`;
  output += `  "generation_stage": "${data.generation_stage}",\n`;

  // seed_pair compact
  output += `  "seed_pair": {\n`;
  output += `    "target": "${data.seed_pair.target}",\n`;
  output += `    "known": "${data.seed_pair.known}"\n`;
  output += `  },\n`;

  // recent_seed_pairs compact
  output += `  "recent_seed_pairs": {\n`;
  const recentKeys = Object.keys(data.recent_seed_pairs);
  recentKeys.forEach((key, idx) => {
    const [target, known] = data.recent_seed_pairs[key];
    const comma = idx < recentKeys.length - 1 ? ',' : '';
    output += `    "${key}": ["${target}", "${known}"]${comma}\n`;
  });
  output += `  },\n`;

  // legos - compact format
  output += `  "legos": {\n`;
  const legoIds = Object.keys(data.legos);
  legoIds.forEach((legoId, legoIdx) => {
    const lego = data.legos[legoId];
    output += `    "${legoId}": {\n`;
    output += `      "lego": ["${lego.lego[0]}", "${lego.lego[1]}"],\n`;
    output += `      "type": "${lego.type}",\n`;

    // components if M-type
    if (lego.components) {
      output += `      "components": [\n`;
      lego.components.forEach((comp, idx) => {
        const comma = idx < lego.components.length - 1 ? ',' : '';
        output += `        ["${comp[0]}", "${comp[1]}"]${comma}\n`;
      });
      output += `      ],\n`;
    }

    // current_seed_legos_available compact
    output += `      "current_seed_legos_available": [`;
    if (lego.current_seed_legos_available.length === 0) {
      output += `],\n`;
    } else {
      output += `\n`;
      lego.current_seed_legos_available.forEach((avail, idx) => {
        const comma = idx < lego.current_seed_legos_available.length - 1 ? ',' : '';
        output += `        ["${avail[0]}", "${avail[1]}"]${comma}\n`;
      });
      output += `      ],\n`;
    }

    output += `      "is_final_lego": ${lego.is_final_lego},\n`;

    // practice_phrases - ONE LINE PER PHRASE (most compact for scanning)
    output += `      "practice_phrases": [\n`;
    lego.practice_phrases.forEach((phrase, idx) => {
      const comma = idx < lego.practice_phrases.length - 1 ? ',' : '';
      const [eng, spa, nullVal, wordCount] = phrase;
      output += `        ["${eng}", "${spa}", null, ${wordCount}]${comma}\n`;
    });
    output += `      ],\n`;

    // phrase_distribution
    const dist = lego.phrase_distribution;
    output += `      "phrase_distribution": {`;
    output += `"really_short_1_2": ${dist.really_short_1_2}, `;
    output += `"quite_short_3": ${dist.quite_short_3}, `;
    output += `"longer_4_5": ${dist.longer_4_5}, `;
    output += `"long_6_plus": ${dist.long_6_plus}`;
    output += `}\n`;

    const legoComma = legoIdx < legoIds.length - 1 ? ',' : '';
    output += `    }${legoComma}\n`;
  });
  output += `  }\n`;
  output += `}\n`;

  // Write back
  fs.writeFileSync(filePath, output);
  filesProcessed++;
  console.log(`✅ ${file}`);
});

console.log(`\n📊 Summary: ${filesProcessed} files reformatted to compact view\n`);

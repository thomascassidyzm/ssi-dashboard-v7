#!/usr/bin/env node
/**
 * Phase 2 Conflict Resolution for zho_for_eng
 *
 * This script:
 * 1. Reads conflict report and lego_pairs.json (compact format)
 * 2. Applies intelligent upchunking based on seed context
 * 3. Creates upchunk_resolutions.json
 * 4. Applies resolutions and LEGO reuse tracking
 * 5. Outputs final lego_pairs.json
 *
 * Compact format: s=seed_id, k=known, t=target, l=legos, y=type, n=new
 */

const fs = require('fs');
const path = require('path');

const COURSE_CODE = 'zho_for_eng';
const VFS_ROOT = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses';
const COURSE_DIR = path.join(VFS_ROOT, COURSE_CODE);

// Chinese-specific upchunking patterns based on language brief
const UPCHUNK_PATTERNS = {
  // "can" patterns - 会 (learned), 能 (physical), 可以 (permission)
  'can': {
    '会': 'can (learned skill)',
    '能': 'can',  // Keep canonical
    '可以': 'can (permission)'
  },
  // "want" patterns - 想 (want) vs 想要 (really want/need)
  'want': {
    '想': 'want',  // Keep canonical
    '想要': 'want (emphatic)'
  },
  // "help" patterns - 帮 (help), 帮忙 (help out), 帮助 (assist)
  'help': {
    '帮': 'help',  // Keep canonical
    '帮忙': 'help out',
    '帮助': 'help (assist)'
  },
  // "but" patterns - 但 (but) vs 但是 (however)
  'but': {
    '但': 'but',
    '但是': 'but'  // Same - first occurrence wins
  },
  // "more" patterns - 多 (many/more), 更多 (more of), 更 (even more)
  'more': {
    '多': 'more (quantity)',
    '更多': 'more',  // Keep canonical
    '更': 'more (comparative)'
  },
  // "when" patterns - 当 (when/while), 什么时候 (what time)
  'when': {
    '当': 'when (while)',
    '什么时候': 'when (what time)',
    '当...时候': 'when (at the time)'
  },
  // "to learn" patterns
  'to learn': {
    '学': 'to learn',  // Keep canonical
    '要学': 'to learn (wanting to)',
    '学习': 'to study'
  },
  // "something" patterns
  'something': {
    '东西': 'something',
    '什么事': 'something (matter)',
    '什么': 'something (what)',
    '一些东西': 'some things',
    '一些事情': 'some matters'
  },
  // "speak" patterns
  'speak': {
    '说': 'speak',  // Keep canonical
    '说话': 'speak (talk)'
  },
  // "remember" patterns
  'remember': {
    '记住': 'remember',  // Keep canonical
    '记得': 'remember (recall)'
  },
  // "go" patterns
  'go': {
    '走': 'go (leave)',
    '去': 'go'  // Keep canonical for "go to place"
  },
  // Common patterns
  'this': {
    '这': 'this',
    '这个': 'this'
  },
  'that': {
    '那': 'that',
    '那个': 'that'
  },
  'said': {
    '说': 'said',
    '说了': 'said (completed)'
  },
  'to say': {
    '说': 'to say',
    '说的': 'to say (what was said)'
  },
  'a little': {
    '一点': 'a little',
    '有点': 'a bit (somewhat)'
  },
  'learning': {
    '学': 'learning',
    '在学': 'learning (currently)',
    '学习': 'studying'
  },
  'better': {
    '更好': 'better',
    '好一点': 'a bit better'
  },
  'feel': {
    '感觉': 'feel',
    '觉得': 'feel (think)'
  },
  'know': {
    '知道': 'know',
    '认识': 'know (person)'
  },
  'i think': {
    '我觉得': 'I think',
    '我想': 'I think (suppose)'
  },
  'so': {
    '所以': 'so',
    '这么': 'so (this way)'
  },
  'to do': {
    '做': 'to do',
    '干': 'to do (colloquial)'
  },
  'very': {
    '很': 'very',
    '非常': 'very (much)'
  },
  'where': {
    '哪里': 'where',
    '哪儿': 'where (colloquial)'
  },
  'yes': {
    '是的': 'yes',
    '对': 'yes (correct)'
  },
  'think': {
    '觉得': 'think',
    '想': 'think (suppose)'
  },
  'someone': {
    '一个人': 'someone',
    '有人': 'someone (exists)'
  },
  'my': {
    '我的': 'my',
    '我': 'my (informal)'
  },
  'see': {
    '看到': 'see',
    '看': 'see (look)',
    '见': 'see (meet)'
  },
  'to speak': {
    '说': 'to speak',
    '说话': 'to speak (talk)'
  },
  'very well': {
    '很好': 'very well',
    '非常好': 'very good'
  },
  'wants': {
    '想': 'wants',
    '想要': 'wants (emphatic)'
  },
  'wanted': {
    '想': 'wanted',
    '想要': 'wanted (emphatic)'
  },
  'to meet': {
    '见面': 'to meet',
    '见': 'to meet (see)'
  },
  'dont want': {
    '不想': 'don\'t want',
    '不要': 'don\'t want (command)'
  },
  "don't want": {
    '不想': 'don\'t want',
    '不要': 'don\'t want (command)'
  },
  'about': {
    '关于': 'about',
    '大概': 'about (approximately)'
  },
  'how': {
    '怎么': 'how',
    '多么': 'how (exclamatory)'
  },
  'everything': {
    '一切': 'everything',
    '所有的东西': 'everything (all things)'
  },
  'interesting': {
    '有意思': 'interesting',
    '有趣': 'interesting (formal)'
  },
  'understand': {
    '理解': 'understand',
    '明白': 'understand (clear)',
    '懂': 'understand (grasp)'
  },
  'enough': {
    '足够': 'enough',
    '够': 'enough (short)'
  },
  'happy': {
    '高兴': 'happy',
    '开心': 'happy (cheerful)',
    '快乐': 'happy (joyful)'
  },
  'what you said': {
    '你说的话': 'what you said',
    '你说的': 'what you said (informal)'
  },
  'no': {
    '不': 'no',
    '没有': 'no (have not)'
  },
  'something else': {
    '别的事情': 'something else',
    '别的东西': 'something else (thing)'
  },
  'thing': {
    '东西': 'thing',
    '事情': 'thing (matter)'
  },
  'idea': {
    '主意': 'idea',
    '想法': 'idea (thought)'
  },
  'with you': {
    '跟你': 'with you',
    '和你': 'with you (formal)'
  },
  'often': {
    '常': 'often',
    '经常': 'often (frequently)'
  }
};

// Load files
console.log('=== PHASE 2 CONFLICT RESOLUTION FOR ZHO_FOR_ENG ===\n');

const conflictReportPath = path.join(COURSE_DIR, 'phase2_conflict_report.json');
const legoPairsPath = path.join(COURSE_DIR, 'lego_pairs.json');
const outputPath = path.join(COURSE_DIR, 'lego_pairs.json');
const resolutionsPath = path.join(COURSE_DIR, 'upchunk_resolutions.json');

const conflictReport = JSON.parse(fs.readFileSync(conflictReportPath, 'utf8'));
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// legoPairs is an array of seeds in compact format
const seeds = Array.isArray(legoPairs) ? legoPairs : (legoPairs.seeds || []);

console.log(`Loaded ${conflictReport.conflicts.length} conflicts`);
console.log(`Loaded ${seeds.length} seeds`);

// Build seed lookup for context (compact format: s=seed_id)
const seedLookup = new Map();
for (const seed of seeds) {
  seedLookup.set(seed.s, seed);
}

// Process conflicts and create resolutions
const resolutions = [];
const stats = {
  upchunked: 0,
  canonical: 0,
  skipped: 0
};

for (const conflict of conflictReport.conflicts) {
  const known = conflict.known;
  const targets = conflict.targets;

  console.log(`\n--- Processing "${known}" (${targets.length} targets) ---`);

  // Find the most common target - this becomes canonical
  targets.sort((a, b) => b.occurrences - a.occurrences);
  const canonical = targets[0];

  console.log(`  Canonical: "${canonical.target}" (${canonical.occurrences} occurrences)`);

  // Get upchunk patterns for this known word
  const patterns = UPCHUNK_PATTERNS[known.toLowerCase()];

  // Process each target variant
  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const isCanonical = i === 0;

    for (const seedId of target.seeds) {
      const seed = seedLookup.get(seedId);
      if (!seed) {
        console.log(`  Warning: Seed ${seedId} not found`);
        continue;
      }

      // Find the LEGO in this seed (compact format: l=legos, k=known, t=target)
      for (const lego of seed.l || []) {
        const legoKnown = lego.k || '';
        const legoTarget = lego.t || '';

        if (legoKnown.toLowerCase() === known.toLowerCase() && legoTarget === target.target) {
          if (isCanonical) {
            // First/canonical target - keep as-is
            stats.canonical++;
          } else {
            // Non-canonical target - needs upchunking
            let newKnown = legoKnown;

            if (patterns && patterns[target.target]) {
              // Use pattern-based upchunking
              newKnown = patterns[target.target];
              if (newKnown !== legoKnown) {
                console.log(`  Upchunk: "${legoKnown}" → "${newKnown}" in ${seedId}`);
              }
            } else {
              // Generic upchunking - add target variant indicator
              newKnown = `${legoKnown} (alt)`;
              console.log(`  Generic upchunk: "${legoKnown}" → "${newKnown}" in ${seedId}`);
            }

            if (newKnown !== legoKnown) {
              resolutions.push({
                seedId,
                original: {
                  known: legoKnown,
                  target: legoTarget
                },
                upchunked: {
                  known: newKnown,
                  target: legoTarget
                },
                reason: `Conflict resolution: "${known}" has ${targets.length} targets`
              });
              stats.upchunked++;
            } else {
              stats.skipped++;
            }
          }
          break;
        }
      }
    }
  }
}

console.log(`\n=== RESOLUTION SUMMARY ===`);
console.log(`  Canonical (kept): ${stats.canonical}`);
console.log(`  Upchunked: ${stats.upchunked}`);
console.log(`  Skipped (same): ${stats.skipped}`);

// Write resolutions file
fs.writeFileSync(resolutionsPath, JSON.stringify({
  courseCode: COURSE_CODE,
  timestamp: new Date().toISOString(),
  stats,
  resolutions
}, null, 2));
console.log(`\nWrote ${resolutionsPath}`);

// Apply resolutions to lego_pairs
console.log('\n=== APPLYING RESOLUTIONS ===');

let applied = 0;
for (const resolution of resolutions) {
  const seed = seedLookup.get(resolution.seedId);
  if (!seed) continue;

  for (const lego of seed.l || []) {
    const legoKnown = lego.k || '';
    const legoTarget = lego.t || '';

    if (legoKnown === resolution.original.known && legoTarget === resolution.original.target) {
      // Apply upchunk
      lego.k = resolution.upchunked.known;
      lego.upchunked = true;

      // Determine type - M if multi-word
      const words = resolution.upchunked.known.trim().split(/\s+/).length;
      lego.y = words >= 2 ? 'M' : 'A';

      applied++;
      break;
    }
  }
}

console.log(`Applied ${applied} upchunks`);

// Apply LEGO reuse tracking (first occurrence = new, subsequent = reuse)
console.log('\n=== APPLYING LEGO REUSE TRACKING ===');

const seenLegos = new Map();  // "known|target" → first occurrence info
let newCount = 0;
let reusedCount = 0;

for (const seed of seeds) {
  for (const lego of seed.l || []) {
    const legoKnown = (lego.k || '').toLowerCase().trim();
    const legoTarget = (lego.t || '').toLowerCase().trim();
    const key = `${legoKnown}|${legoTarget}`;

    if (seenLegos.has(key)) {
      // Reused LEGO
      lego.n = 0;  // n=0 means not new
      reusedCount++;
    } else {
      // New LEGO - first occurrence
      lego.n = 1;  // n=1 means new
      seenLegos.set(key, {
        seedId: seed.s
      });
      newCount++;
    }
  }
}

console.log(`  Unique LEGOs (n=1): ${newCount}`);
console.log(`  Reused LEGOs (n=0): ${reusedCount}`);

// Verify no remaining conflicts
console.log('\n=== VERIFICATION ===');

const remainingConflicts = new Map();
for (const seed of seeds) {
  for (const lego of seed.l || []) {
    const legoKnown = (lego.k || '').toLowerCase().trim();
    const legoTarget = lego.t || '';

    if (!remainingConflicts.has(legoKnown)) {
      remainingConflicts.set(legoKnown, new Set());
    }
    remainingConflicts.get(legoKnown).add(legoTarget);
  }
}

let conflictCount = 0;
const conflictList = [];
for (const [known, targets] of remainingConflicts) {
  if (targets.size > 1) {
    conflictCount++;
    conflictList.push({ known, targets: [...targets] });
  }
}

if (conflictCount === 0) {
  console.log('No remaining conflicts - ZUT passes!');
} else {
  console.log(`WARNING: ${conflictCount} conflicts remain`);
  for (const c of conflictList.slice(0, 15)) {
    console.log(`  "${c.known}" → ${c.targets.join(' | ')}`);
  }
}

// Write final lego_pairs.json
const output = {
  courseCode: COURSE_CODE,
  phase2: {
    timestamp: new Date().toISOString(),
    conflictsResolved: stats.upchunked,
    uniqueLegos: newCount,
    reusedLegos: reusedCount,
    remainingConflicts: conflictCount
  },
  seeds: seeds
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nWrote ${outputPath}`);

console.log('\n=== COMPLETE ===');
console.log(`Total unique LEGOs: ${newCount}`);
console.log(`Total reused LEGOs: ${reusedCount}`);
console.log(`Remaining conflicts: ${conflictCount}`);

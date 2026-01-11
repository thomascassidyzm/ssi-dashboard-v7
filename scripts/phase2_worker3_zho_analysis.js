#!/usr/bin/env node

// Phase 2 Worker 3: Conflict Analysis for zho_for_eng seeds S0031-S0045

const seedsData = {
  "courseCode": "zho_for_eng",
  "requested": 15,
  "found": 15,
  "seeds": [
    {"seed_id":"S0031","seed_pair":{"known":"You wanted to speak with me tonight.","target":"你想和我今晚说话"},"legos":[{"id":"S0031L01","type":"A","new":true,"lego":{"known":"you","target":"你"},"components":[]},{"id":"S0031L02","type":"A","new":true,"lego":{"known":"wanted","target":"想"},"components":[]},{"id":"S0031L03","type":"A","new":true,"lego":{"known":"to speak","target":"说话"},"components":[]},{"id":"S0031L04","type":"A","new":true,"lego":{"known":"with","target":"和"},"components":[]},{"id":"S0031L05","type":"A","new":true,"lego":{"known":"me","target":"我"},"components":[]},{"id":"S0031L06","type":"A","new":true,"lego":{"known":"tonight","target":"今晚"},"components":[]},{"id":"S0031L07","type":"M","new":false,"lego":{"known":"wanted to speak","target":"想说话"},"components":[{"known":"wanted","target":"想"},{"known":"to speak","target":"说话"}]},{"id":"S0031L08","type":"M","new":false,"lego":{"known":"with me","target":"和我"},"components":[{"known":"with","target":"和"},{"known":"me","target":"我"}]},{"id":"S0031L09","type":"M","new":true,"lego":{"known":"wanted to speak with me","target":"想和我说话"},"components":[{"known":"wanted to speak","target":"想说话"},{"known":"with me","target":"和我"}]}]},
    {"seed_id":"S0032","seed_pair":{"known":"Did you want to show me something?","target":"你想给我看什么吗?"},"legos":[{"id":"S0032L01","type":"A","new":true,"lego":{"known":"you","target":"你"},"components":[]},{"id":"S0032L02","type":"A","new":true,"lego":{"known":"want","target":"想"},"components":[]},{"id":"S0032L03","type":"A","new":true,"lego":{"known":"me","target":"我"},"components":[]},{"id":"S0032L04","type":"A","new":true,"lego":{"known":"something","target":"什么"},"components":[]},{"id":"S0032L05","type":"A","new":false,"lego":{"known":"to show me","target":"给我看"},"components":[]},{"id":"S0032L06","type":"M","new":false,"lego":{"known":"want to show me","target":"想给我看"},"components":[{"known":"want","target":"想"},{"known":"to show me","target":"给我看"}]},{"id":"S0032L07","type":"M","new":true,"lego":{"known":"want to show me something","target":"想给我看什么"},"components":[{"known":"want to show me","target":"想给我看"},{"known":"something","target":"什么"}]}]},
    {"seed_id":"S0033","seed_pair":{"known":"How long have you been learning Chinese?","target":"你学中文多久了?"},"legos":[{"id":"S0033L01","type":"A","new":true,"lego":{"known":"How long","target":"多久"},"components":[]},{"id":"S0033L02","type":"A","new":true,"lego":{"known":"you","target":"你"},"components":[]},{"id":"S0033L03","type":"A","new":true,"lego":{"known":"learning","target":"学"},"components":[]},{"id":"S0033L04","type":"A","new":true,"lego":{"known":"Chinese","target":"中文"},"components":[]},{"id":"S0033L05","type":"M","new":true,"lego":{"known":"How long have you been learning Chinese","target":"你学中文多久了"},"components":[{"known":"How long","target":"多久"},{"known":"you learning Chinese","target":"你学中文"}]}]},
    {"seed_id":"S0034","seed_pair":{"known":"He does not want to be quiet when other people are here.","target":"他不想在别人在这里时保持安静"},"legos":[{"id":"S0034L01","type":"A","new":true,"lego":{"known":"He","target":"他"},"components":[]},{"id":"S0034L02","type":"A","new":true,"lego":{"known":"does not want","target":"不想"},"components":[]},{"id":"S0034L03","type":"A","new":true,"lego":{"known":"to be quiet","target":"保持安静"},"components":[]},{"id":"S0034L04","type":"A","new":true,"lego":{"known":"other people","target":"别人"},"components":[]},{"id":"S0034L05","type":"A","new":true,"lego":{"known":"here","target":"这里"},"components":[]},{"id":"S0034L06","type":"M","new":false,"lego":{"known":"does not want to be quiet","target":"不想保持安静"},"components":[{"known":"does not want","target":"不想"},{"known":"to be quiet","target":"保持安静"}]},{"id":"S0034L07","type":"M","new":false,"lego":{"known":"when other people are here","target":"别人在这里时"},"components":[{"known":"other people","target":"别人"},{"known":"here","target":"这里"}]},{"id":"S0034L08","type":"M","new":true,"lego":{"known":"He does not want to be quiet when other people are here","target":"他不想在别人在这里时保持安静"},"components":[{"known":"He does not want to be quiet","target":"他不想保持安静"},{"known":"when other people are here","target":"别人在这里时"}]}]},
    {"seed_id":"S0035","seed_pair":{"known":"She does not want to read anything this afternoon.","target":"她今天下午不想读任何东西"},"legos":[{"id":"S0035L01","type":"A","new":true,"lego":{"known":"She","target":"她"},"components":[]},{"id":"S0035L02","type":"A","new":true,"lego":{"known":"does not want","target":"不想"},"components":[]},{"id":"S0035L03","type":"A","new":true,"lego":{"known":"to read","target":"读"},"components":[]},{"id":"S0035L04","type":"A","new":true,"lego":{"known":"anything","target":"任何东西"},"components":[]},{"id":"S0035L05","type":"A","new":true,"lego":{"known":"this afternoon","target":"今天下午"},"components":[]},{"id":"S0035L06","type":"M","new":false,"lego":{"known":"does not want to read","target":"不想读"},"components":[{"known":"does not want","target":"不想"},{"known":"to read","target":"读"}]},{"id":"S0035L07","type":"M","new":false,"lego":{"known":"does not want to read anything","target":"不想读任何东西"},"components":[{"known":"does not want to read","target":"不想读"},{"known":"anything","target":"任何东西"}]},{"id":"S0035L08","type":"M","new":true,"lego":{"known":"She does not want to read anything this afternoon","target":"她今天下午不想读任何东西"},"components":[{"known":"She does not want to read anything","target":"她不想读任何东西"},{"known":"this afternoon","target":"今天下午"}]}]},
    {"seed_id":"S0036","seed_pair":{"known":"We don't want to interrupt the story.","target":"我们不想打断故事。"},"legos":[{"id":"S0036L01","type":"A","new":true,"lego":{"known":"want","target":"想要"},"components":[]},{"id":"S0036L02","type":"M","new":true,"lego":{"known":"don't want","target":"不想要"},"components":[{"known":"want","target":"想要"}]},{"id":"S0036L03","type":"A","new":true,"lego":{"known":"interrupt","target":"打断"},"components":[]},{"id":"S0036L04","type":"A","new":true,"lego":{"known":"story","target":"故事"},"components":[]},{"id":"S0036L05","type":"A","new":true,"lego":{"known":"we","target":"我们"},"components":[]}]},
    {"seed_id":"S0037","seed_pair":{"known":"I started to think about it carefully last month.","target":"我上个月就开始仔细地想这件事了。"},"legos":[{"id":"S0037L01","type":"A","new":true,"lego":{"known":"I","target":"我"},"components":[]},{"id":"S0037L02","type":"A","new":true,"lego":{"known":"started","target":"开始"},"components":[]},{"id":"S0037L03","type":"A","new":true,"lego":{"known":"to think","target":"想"},"components":[]},{"id":"S0037L04","type":"M","new":true,"lego":{"known":"think about","target":"想到"},"components":[{"known":"to think","target":"想"}]},{"id":"S0037L05","type":"A","new":true,"lego":{"known":"carefully","target":"仔细地"},"components":[]},{"id":"S0037L06","type":"A","new":true,"lego":{"known":"last month","target":"上个月"},"components":[]}]},
    {"seed_id":"S0038","seed_pair":{"known":"I've been learning for about a week.","target":"我学习大约一周了。"},"legos":[{"id":"S0038L01","type":"A","new":true,"lego":{"known":"I","target":"我"},"components":[]},{"id":"S0038L02","type":"A","new":true,"lego":{"known":"learning","target":"学习"},"components":[]},{"id":"S0038L03","type":"M","new":true,"lego":{"known":"I've been learning","target":"我一直在学习"},"components":[{"known":"I","target":"我"},{"known":"learning","target":"学习"}]},{"id":"S0038L04","type":"A","new":true,"lego":{"known":"about","target":"大约"},"components":[]},{"id":"S0038L05","type":"A","new":true,"lego":{"known":"a week","target":"一周"},"components":[]}]},
    {"seed_id":"S0039","seed_pair":{"known":"But I'm a little tired this morning.","target":"但是我今天早上有点累。"},"legos":[{"id":"S0039L01","type":"A","new":true,"lego":{"known":"but","target":"但是"},"components":[]},{"id":"S0039L02","type":"A","new":true,"lego":{"known":"I","target":"我"},"components":[]},{"id":"S0039L03","type":"A","new":true,"lego":{"known":"tired","target":"累"},"components":[]},{"id":"S0039L04","type":"A","new":true,"lego":{"known":"a little","target":"有点"},"components":[]},{"id":"S0039L05","type":"M","new":true,"lego":{"known":"a little tired","target":"有点累"},"components":[{"known":"a little","target":"有点"},{"known":"tired","target":"累"}]},{"id":"S0039L06","type":"A","new":true,"lego":{"known":"this morning","target":"今天早上"},"components":[]}]},
    {"seed_id":"S0040","seed_pair":{"known":"How do you feel at the moment?","target":"你现在感觉怎样？"},"legos":[{"id":"S0040L01","type":"A","new":true,"lego":{"known":"how","target":"怎样"},"components":[]},{"id":"S0040L02","type":"A","new":true,"lego":{"known":"feel","target":"感觉"},"components":[]},{"id":"S0040L03","type":"A","new":true,"lego":{"known":"you","target":"你"},"components":[]},{"id":"S0040L04","type":"A","new":true,"lego":{"known":"at the moment","target":"现在"},"components":[]},{"id":"S0040L05","type":"M","new":true,"lego":{"known":"How do you feel","target":"你感觉怎样"},"components":[{"known":"feel","target":"感觉"},{"known":"how","target":"怎样"}]}]},
    {"seed_id":"S0041","seed_pair":{"known":"I feel okay, but I'm starting to feel tired.","target":"我觉得还好，但我开始觉得累了。"},"legos":[{"id":"S0041L01","type":"A","new":true,"lego":{"known":"I","target":"我"}},{"id":"S0041L02","type":"A","new":true,"lego":{"known":"feel","target":"觉得"}},{"id":"S0041L03","type":"A","new":true,"lego":{"known":"okay","target":"还好"}},{"id":"S0041L04","type":"A","new":true,"lego":{"known":"but","target":"但"}},{"id":"S0041L05","type":"A","new":true,"lego":{"known":"starting","target":"开始"}},{"id":"S0041L06","type":"A","new":true,"lego":{"known":"tired","target":"累"}}]},
    {"seed_id":"S0042","seed_pair":{"known":"I was starting to feel better than last night.","target":"我开始觉得比昨晚好了。"},"legos":[{"id":"S0042L01","type":"A","new":true,"lego":{"known":"I","target":"我"}},{"id":"S0042L02","type":"A","new":true,"lego":{"known":"was starting","target":"开始"}},{"id":"S0042L03","type":"A","new":true,"lego":{"known":"feel","target":"觉得"}},{"id":"S0042L04","type":"A","new":true,"lego":{"known":"last night","target":"昨晚"}},{"id":"S0042L05","type":"A","new":true,"lego":{"known":"better","target":"好"}},{"id":"S0042L06","type":"M","new":true,"lego":{"known":"better than last night","target":"比昨晚好"},"components":[{"known":"last night","target":"昨晚"},{"known":"better","target":"好"}]}]},
    {"seed_id":"S0043","seed_pair":{"known":"I wasn't thinking about how to answer.","target":"我没在想怎么回答。"},"legos":[{"id":"S0043L01","type":"A","new":true,"lego":{"known":"I","target":"我"}},{"id":"S0043L02","type":"A","new":true,"lego":{"known":"wasn't thinking","target":"没在想"}},{"id":"S0043L03","type":"A","new":true,"lego":{"known":"how to","target":"怎么"}},{"id":"S0043L04","type":"A","new":true,"lego":{"known":"answer","target":"回答"}}]},
    {"seed_id":"S0044","seed_pair":{"known":"Or if I need to improve.","target":"或者我需要提高。"},"legos":[{"id":"S0044L01","type":"A","new":true,"lego":{"known":"Or","target":"或者"}},{"id":"S0044L02","type":"A","new":true,"lego":{"known":"I","target":"我"}},{"id":"S0044L03","type":"A","new":true,"lego":{"known":"need to","target":"需要"}},{"id":"S0044L04","type":"A","new":true,"lego":{"known":"improve","target":"提高"}}]},
    {"seed_id":"S0045","seed_pair":{"known":"I don't need to know everything.","target":"我不需要知道一切。"},"legos":[{"id":"S0045L01","type":"A","new":true,"lego":{"known":"I","target":"我"}},{"id":"S0045L02","type":"A","new":true,"lego":{"known":"don't need to","target":"不需要"}},{"id":"S0045L03","type":"A","new":true,"lego":{"known":"know","target":"知道"}},{"id":"S0045L04","type":"A","new":true,"lego":{"known":"everything","target":"一切"}}]}
  ]
};

// Build a map of all LEGOs by KNOWN text
const legoMap = new Map();

seedsData.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    const known = lego.lego.known;
    const target = lego.lego.target;
    const key = known.toLowerCase().trim();

    if (!legoMap.has(key)) {
      legoMap.set(key, []);
    }

    legoMap.get(key).push({
      seedId: seed.seed_id,
      legoId: lego.id,
      type: lego.type,
      known: known,
      target: target,
      new: lego.new,
      components: lego.components || []
    });
  });
});

console.log('=== CONFLICT ANALYSIS ===\n');

// Find conflicts (same KNOWN → different TARGET)
const conflicts = [];
const exactDuplicates = [];

legoMap.forEach((instances, knownKey) => {
  // Group by target
  const targetGroups = new Map();
  instances.forEach(inst => {
    const targetKey = inst.target.trim();
    if (!targetGroups.has(targetKey)) {
      targetGroups.set(targetKey, []);
    }
    targetGroups.get(targetKey).push(inst);
  });

  // If multiple different targets, it's a conflict
  if (targetGroups.size > 1) {
    // Sort instances by seed order
    const sortedInstances = [...instances].sort((a, b) => {
      const seedNumA = parseInt(a.seedId.substring(1));
      const seedNumB = parseInt(b.seedId.substring(1));
      return seedNumA - seedNumB;
    });

    conflicts.push({
      known: instances[0].known,
      instances: sortedInstances
    });
  } else if (instances.length > 1) {
    // Exact duplicates (same known AND target)
    exactDuplicates.push({
      known: instances[0].known,
      target: instances[0].target,
      instances: instances.sort((a, b) => {
        const seedNumA = parseInt(a.seedId.substring(1));
        const seedNumB = parseInt(b.seedId.substring(1));
        return seedNumA - seedNumB;
      })
    });
  }
});

console.log(`Found ${conflicts.length} conflicts:\n`);

conflicts.forEach((conflict, idx) => {
  console.log(`${idx + 1}. "${conflict.known}" →`);
  conflict.instances.forEach(inst => {
    console.log(`   ${inst.seedId} (${inst.legoId}): "${inst.target}" [${inst.type}-type, new: ${inst.new}]`);
  });
  console.log();
});

console.log(`\n=== EXACT DUPLICATES (for reuse tracking) ===\n`);
console.log(`Found ${exactDuplicates.length} exact duplicate groups:\n`);

exactDuplicates.slice(0, 10).forEach((dup, idx) => {
  console.log(`${idx + 1}. "${dup.known}" → "${dup.target}" (${dup.instances.length} occurrences)`);
  dup.instances.forEach((inst, i) => {
    const status = i === 0 ? 'FIRST (new: true)' : `new: false, ref: ${dup.instances[0].legoId}`;
    console.log(`   ${inst.seedId} (${inst.legoId}): ${status}`);
  });
  console.log();
});

if (exactDuplicates.length > 10) {
  console.log(`... and ${exactDuplicates.length - 10} more duplicate groups\n`);
}

// Export for resolution processing
const analysisResults = {
  conflicts,
  exactDuplicates,
  summary: {
    totalConflicts: conflicts.length,
    totalDuplicateGroups: exactDuplicates.length
  }
};

console.log('\n=== SUMMARY ===');
console.log(`Total conflicts to resolve: ${conflicts.length}`);
console.log(`Total duplicate groups for reuse tracking: ${exactDuplicates.length}`);
console.log('\nNext step: Apply FCFS (First Come First Served) resolution');
console.log('- First occurrence WINS (keeps its target)');
console.log('- Later occurrences must UPCHUNK to disambiguate\n');

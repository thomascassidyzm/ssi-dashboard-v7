// Phase 2 Worker 1: Conflict Resolution for zho_for_eng S0151-S0165
// This script applies ZUT (Zero Uncertainty Test) and FCFS (First Come First Served) principles

const seedsData = {
  "courseCode": "zho_for_eng",
  "requested": 15,
  "found": 15,
  "seeds": [
    {
      "seed_id": "S0151",
      "seed_pair": {
        "known": "That wasn't what I was hoping would happen.",
        "target": "那不是我希望会发生的。"
      },
      "legos": [
        {
          "id": "S0151L01",
          "type": "M",
          "new": true,
          "lego": {
            "known": "That wasn't what I was hoping would happen.",
            "target": "那不是我希望会发生的。"
          },
          "components": [
            { "known": "wasn't", "target": "不是" },
            { "known": "I was hoping", "target": "我希望" },
            { "known": "would happen", "target": "会发生" }
          ]
        },
        {
          "id": "S0151L02",
          "type": "A",
          "new": false,
          "lego": { "known": "wasn't", "target": "不是" },
          "components": []
        },
        {
          "id": "S0151L03",
          "type": "A",
          "new": false,
          "lego": { "known": "I was hoping", "target": "我希望" },
          "components": []
        },
        {
          "id": "S0151L04",
          "type": "A",
          "new": false,
          "lego": { "known": "would happen", "target": "会发生" },
          "components": []
        }
      ]
    },
    {
      "seed_id": "S0152",
      "seed_pair": {
        "known": "I would have done it differently if I had known what you wanted.",
        "target": "如果我早知道你想要什么，我会做得不一样。"
      },
      "legos": [
        {
          "id": "S0152L01",
          "type": "M",
          "new": true,
          "lego": {
            "known": "I would have done it differently if I had known what you wanted.",
            "target": "如果我早知道你想要什么，我会做得不一样。"
          },
          "components": [
            { "known": "if I had known", "target": "如果我知道" },
            { "known": "what you wanted", "target": "你想要什么" },
            { "known": "I would have done it differently", "target": "我会做得不一样" }
          ]
        },
        {
          "id": "S0152L02",
          "type": "A",
          "new": false,
          "lego": { "known": "if I had known", "target": "如果我知道" },
          "components": []
        },
        {
          "id": "S0152L03",
          "type": "A",
          "new": false,
          "lego": { "known": "what you wanted", "target": "你想要什么" },
          "components": []
        },
        {
          "id": "S0152L04",
          "type": "A",
          "new": false,
          "lego": { "known": "I would have done it differently", "target": "我会做得不一样" },
          "components": []
        }
      ]
    },
    {
      "seed_id": "S0153",
      "seed_pair": {
        "known": "I wouldn't have said it in exactly the same way.",
        "target": "我说得不会完全一样。"
      },
      "legos": [
        {
          "id": "S0153L01",
          "type": "M",
          "new": true,
          "lego": {
            "known": "I wouldn't have said it in exactly the same way.",
            "target": "我说得不会完全一样。"
          },
          "components": [
            { "known": "I wouldn't have said it", "target": "我不会说" },
            { "known": "in exactly the same way", "target": "完全一样" }
          ]
        },
        {
          "id": "S0153L02",
          "type": "A",
          "new": false,
          "lego": { "known": "I wouldn't have said it", "target": "我不会说" },
          "components": []
        },
        {
          "id": "S0153L03",
          "type": "A",
          "new": false,
          "lego": { "known": "in exactly the same way", "target": "完全一样" },
          "components": []
        }
      ]
    },
    {
      "seed_id": "S0154",
      "seed_pair": {
        "known": "Where do you want to meet on Saturday night?",
        "target": "你想在周六晚上哪里见面？"
      },
      "legos": [
        {
          "id": "S0154L01",
          "type": "M",
          "new": true,
          "lego": {
            "known": "Where do you want to meet on Saturday night?",
            "target": "你想在周六晚上哪里见面？"
          },
          "components": [
            { "known": "Where", "target": "哪里" },
            { "known": "do you want to meet", "target": "你想见面" },
            { "known": "on Saturday night", "target": "在周六晚上" }
          ]
        },
        {
          "id": "S0154L02",
          "type": "A",
          "new": false,
          "lego": { "known": "Where", "target": "哪里" },
          "components": []
        },
        {
          "id": "S0154L03",
          "type": "A",
          "new": false,
          "lego": { "known": "do you want to meet", "target": "你想见面" },
          "components": []
        },
        {
          "id": "S0154L04",
          "type": "A",
          "new": false,
          "lego": { "known": "on Saturday night", "target": "在周六晚上" },
          "components": []
        }
      ]
    },
    {
      "seed_id": "S0155",
      "seed_pair": {
        "known": "I don't mind waiting for a few minutes tomorrow morning.",
        "target": "我不介意明天早上等一会儿。"
      },
      "legos": [
        {
          "id": "S0155L01",
          "type": "M",
          "new": true,
          "lego": {
            "known": "I don't mind waiting for a few minutes tomorrow morning.",
            "target": "我不介意明天早上等一会儿。"
          },
          "components": [
            { "known": "I don't mind", "target": "我不介意" },
            { "known": "waiting", "target": "等" },
            { "known": "for a few minutes", "target": "一会儿" },
            { "known": "tomorrow morning", "target": "明天早上" }
          ]
        },
        {
          "id": "S0155L02",
          "type": "A",
          "new": false,
          "lego": { "known": "I don't mind", "target": "我不介意" },
          "components": []
        },
        {
          "id": "S0155L03",
          "type": "A",
          "new": false,
          "lego": { "known": "waiting", "target": "等" },
          "components": []
        },
        {
          "id": "S0155L04",
          "type": "A",
          "new": false,
          "lego": { "known": "for a few minutes", "target": "一会儿" },
          "components": []
        },
        {
          "id": "S0155L05",
          "type": "A",
          "new": false,
          "lego": { "known": "tomorrow morning", "target": "明天早上" },
          "components": []
        }
      ]
    },
    {
      "seed_id": "S0156",
      "seed_pair": {
        "known": "Do you want to go to a restaurant tonight?",
        "target": "你今晚想去餐厅吗？"
      },
      "legos": [
        {
          "id": "S0156L01",
          "type": "A",
          "new": true,
          "lego": { "known": "you", "target": "你" }
        },
        {
          "id": "S0156L02",
          "type": "A",
          "new": true,
          "lego": { "known": "want to", "target": "想" }
        },
        {
          "id": "S0156L03",
          "type": "A",
          "new": true,
          "lego": { "known": "go", "target": "去" }
        },
        {
          "id": "S0156L04",
          "type": "A",
          "new": true,
          "lego": { "known": "restaurant", "target": "餐厅" }
        },
        {
          "id": "S0156L05",
          "type": "A",
          "new": true,
          "lego": { "known": "tonight", "target": "今晚" }
        },
        {
          "id": "S0156L06",
          "type": "M",
          "new": false,
          "lego": { "known": "go to a restaurant", "target": "去餐厅" },
          "components": [
            { "known": "go", "target": "去" },
            { "known": "restaurant", "target": "餐厅" }
          ]
        },
        {
          "id": "S0156L07",
          "type": "M",
          "new": true,
          "lego": { "known": "go to a restaurant tonight", "target": "今晚去餐厅" },
          "components": [
            { "known": "tonight", "target": "今晚" },
            { "known": "go to a restaurant", "target": "去餐厅" }
          ]
        }
      ]
    },
    {
      "seed_id": "S0157",
      "seed_pair": {
        "known": "I won't be able to be there next month.",
        "target": "我下个月不能在那里。"
      },
      "legos": [
        {
          "id": "S0157L01",
          "type": "A",
          "new": true,
          "lego": { "known": "I", "target": "我" }
        },
        {
          "id": "S0157L02",
          "type": "A",
          "new": true,
          "lego": { "known": "next month", "target": "下个月" }
        },
        {
          "id": "S0157L03",
          "type": "A",
          "new": true,
          "lego": { "known": "not", "target": "不" }
        },
        {
          "id": "S0157L04",
          "type": "A",
          "new": true,
          "lego": { "known": "at", "target": "在" }
        },
        {
          "id": "S0157L05",
          "type": "A",
          "new": false,
          "lego": { "known": "be able to", "target": "能" },
          "components": []
        },
        {
          "id": "S0157L06",
          "type": "A",
          "new": false,
          "lego": { "known": "there", "target": "那里" },
          "components": []
        },
        {
          "id": "S0157L07",
          "type": "M",
          "new": true,
          "lego": { "known": "won't be able to", "target": "不能" },
          "components": [
            { "known": "not", "target": "不" },
            { "known": "be able to", "target": "能" }
          ]
        },
        {
          "id": "S0157L08",
          "type": "M",
          "new": true,
          "lego": { "known": "be there", "target": "在那里" },
          "components": [
            { "known": "at", "target": "在" },
            { "known": "there", "target": "那里" }
          ]
        }
      ]
    },
    {
      "seed_id": "S0158",
      "seed_pair": {
        "known": "Let's talk about something else.",
        "target": "我们聊聊别的事情吧。"
      },
      "legos": [
        {
          "id": "S0158L01",
          "type": "A",
          "new": true,
          "lego": { "known": "we", "target": "我们" }
        },
        {
          "id": "S0158L02",
          "type": "A",
          "new": true,
          "lego": { "known": "something else", "target": "别的事情" }
        },
        {
          "id": "S0158L03",
          "type": "A",
          "new": false,
          "lego": { "known": "talk", "target": "聊聊" },
          "components": []
        },
        {
          "id": "S0158L04",
          "type": "M",
          "new": true,
          "lego": { "known": "let's talk", "target": "我们聊聊吧" },
          "components": [
            { "known": "we", "target": "我们" },
            { "known": "talk", "target": "聊聊" }
          ]
        }
      ]
    },
    {
      "seed_id": "S0159",
      "seed_pair": {
        "known": "That isn't what I'm trying to say.",
        "target": "那不是我想说的。"
      },
      "legos": [
        {
          "id": "S0159L01",
          "type": "A",
          "new": true,
          "lego": { "known": "that", "target": "那" }
        },
        {
          "id": "S0159L02",
          "type": "A",
          "new": true,
          "lego": { "known": "not", "target": "不" }
        },
        {
          "id": "S0159L03",
          "type": "A",
          "new": false,
          "lego": { "known": "is", "target": "是" },
          "components": []
        },
        {
          "id": "S0159L04",
          "type": "A",
          "new": true,
          "lego": { "known": "I", "target": "我" }
        },
        {
          "id": "S0159L05",
          "type": "A",
          "new": false,
          "lego": { "known": "say", "target": "说" },
          "components": []
        },
        {
          "id": "S0159L06",
          "type": "A",
          "new": false,
          "lego": { "known": "trying to", "target": "想" },
          "components": []
        },
        {
          "id": "S0159L07",
          "type": "M",
          "new": true,
          "lego": { "known": "is not", "target": "不是" },
          "components": [
            { "known": "not", "target": "不" },
            { "known": "is", "target": "是" }
          ]
        },
        {
          "id": "S0159L08",
          "type": "M",
          "new": false,
          "lego": { "known": "trying to say", "target": "想说" },
          "components": [
            { "known": "trying to", "target": "想" },
            { "known": "say", "target": "说" }
          ]
        },
        {
          "id": "S0159L09",
          "type": "M",
          "new": true,
          "lego": { "known": "what I'm trying to say", "target": "我想说的" },
          "components": [
            { "known": "I", "target": "我" },
            { "known": "trying to say", "target": "想说" }
          ]
        }
      ]
    },
    {
      "seed_id": "S0160",
      "seed_pair": {
        "known": "How do you say this word in Chinese?",
        "target": "这个词中文怎么说？"
      },
      "legos": [
        {
          "id": "S0160L01",
          "type": "A",
          "new": true,
          "lego": { "known": "this", "target": "这个" }
        },
        {
          "id": "S0160L02",
          "type": "A",
          "new": true,
          "lego": { "known": "word", "target": "词" }
        },
        {
          "id": "S0160L03",
          "type": "A",
          "new": true,
          "lego": { "known": "how", "target": "怎么" }
        },
        {
          "id": "S0160L04",
          "type": "A",
          "new": true,
          "lego": { "known": "say", "target": "说" }
        },
        {
          "id": "S0160L05",
          "type": "A",
          "new": false,
          "lego": { "known": "Chinese", "target": "中文" },
          "components": []
        },
        {
          "id": "S0160L06",
          "type": "A",
          "new": true,
          "lego": { "known": "in Chinese", "target": "中文" }
        }
      ]
    },
    {
      "seed_id": "S0161",
      "seed_pair": {
        "known": "Can you give me that book on Sunday morning?",
        "target": "星期天早上你能给我那本书吗？"
      },
      "legos": [
        {
          "id": "S0161L01",
          "type": "A",
          "new": true,
          "lego": { "known": "you", "target": "你" }
        },
        {
          "id": "S0161L02",
          "type": "A",
          "new": true,
          "lego": { "known": "can", "target": "能" }
        },
        {
          "id": "S0161L03",
          "type": "A",
          "new": true,
          "lego": { "known": "give", "target": "给" }
        },
        {
          "id": "S0161L04",
          "type": "A",
          "new": true,
          "lego": { "known": "me", "target": "我" }
        },
        {
          "id": "S0161L05",
          "type": "A",
          "new": true,
          "lego": { "known": "book", "target": "书" }
        },
        {
          "id": "S0161L06",
          "type": "A",
          "new": true,
          "lego": { "known": "Sunday", "target": "星期天" }
        },
        {
          "id": "S0161L07",
          "type": "A",
          "new": true,
          "lego": { "known": "morning", "target": "早上" }
        },
        {
          "id": "S0161L08",
          "type": "M",
          "new": true,
          "lego": { "known": "that book", "target": "那本书" },
          "components": [
            { "known": "that", "target": "那" },
            { "known": "book", "target": "书" }
          ]
        },
        {
          "id": "S0161L09",
          "type": "A",
          "new": true,
          "lego": { "known": "on Sunday morning", "target": "星期天早上" }
        }
      ]
    },
    {
      "seed_id": "S0162",
      "seed_pair": {
        "known": "What do you think about that?",
        "target": "你觉得那个怎么样？"
      },
      "legos": [
        {
          "id": "S0162L01",
          "type": "A",
          "new": true,
          "lego": { "known": "think", "target": "觉得" }
        },
        {
          "id": "S0162L02",
          "type": "A",
          "new": true,
          "lego": { "known": "that", "target": "那个" }
        }
      ]
    },
    {
      "seed_id": "S0163",
      "seed_pair": {
        "known": "I think that it's interesting.",
        "target": "我觉得它很有意思。"
      },
      "legos": [
        {
          "id": "S0163L01",
          "type": "A",
          "new": true,
          "lego": { "known": "I", "target": "我" }
        },
        {
          "id": "S0163L02",
          "type": "A",
          "new": true,
          "lego": { "known": "it", "target": "它" }
        },
        {
          "id": "S0163L03",
          "type": "A",
          "new": true,
          "lego": { "known": "interesting", "target": "有意思" }
        }
      ]
    },
    {
      "seed_id": "S0164",
      "seed_pair": {
        "known": "An interesting book",
        "target": "一本有意思的书"
      },
      "legos": [
        {
          "id": "S0164L01",
          "type": "M",
          "new": true,
          "lego": { "known": "an interesting book", "target": "一本有意思的书" },
          "components": [
            { "known": "interesting", "target": "有意思" },
            { "known": "book", "target": "书" }
          ]
        }
      ]
    },
    {
      "seed_id": "S0165",
      "seed_pair": {
        "known": "But I'm not sure if it's true.",
        "target": "但我不确定它是不是真的。"
      },
      "legos": [
        {
          "id": "S0165L01",
          "type": "A",
          "new": true,
          "lego": { "known": "but", "target": "但是" }
        },
        {
          "id": "S0165L02",
          "type": "A",
          "new": true,
          "lego": { "known": "not sure", "target": "不确定" }
        },
        {
          "id": "S0165L03",
          "type": "A",
          "new": true,
          "lego": { "known": "true", "target": "真的" }
        }
      ]
    }
  ]
};

// Analysis: Identify conflicts and reuse issues
console.log("=== PHASE 2 CONFLICT RESOLUTION ANALYSIS ===\n");

// Build a map of all KNOWN→TARGET mappings
const legoMap = new Map(); // key: known text, value: array of {target, seedId, legoId}

seedsData.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    const known = lego.lego.known;
    const target = lego.lego.target;

    if (!legoMap.has(known)) {
      legoMap.set(known, []);
    }

    legoMap.get(known).push({
      target,
      seedId: seed.seed_id,
      legoId: lego.id,
      type: lego.type,
      new: lego.new
    });
  });
});

// Find conflicts: same KNOWN → different TARGETs
console.log("CONFLICTS DETECTED:");
const conflicts = [];
legoMap.forEach((mappings, known) => {
  const uniqueTargets = [...new Set(mappings.map(m => m.target))];
  if (uniqueTargets.length > 1) {
    console.log(`\n❌ CONFLICT: "${known}"`);
    mappings.forEach(m => {
      console.log(`   ${m.seedId}: "${known}" → "${m.target}"`);
    });
    conflicts.push({ known, mappings });
  }
});

if (conflicts.length === 0) {
  console.log("✓ No conflicts detected!\n");
} else {
  console.log(`\nTotal conflicts: ${conflicts.length}\n`);
}

// Find reuse issues: exact duplicates across seeds
console.log("\n=== REUSE TRACKING ===\n");
const reuseIssues = [];
legoMap.forEach((mappings, known) => {
  if (mappings.length > 1) {
    const uniqueTargets = [...new Set(mappings.map(m => m.target))];
    if (uniqueTargets.length === 1) {
      // Same KNOWN → same TARGET across multiple seeds
      const firstOccurrence = mappings[0];
      const laterOccurrences = mappings.slice(1);

      laterOccurrences.forEach(occ => {
        if (occ.new === true) {
          console.log(`⚠️  REUSE ERROR: ${occ.seedId} ${occ.legoId}`);
          console.log(`   "${known}" → "${occ.target}" should be new: false, ref: ${firstOccurrence.legoId}`);
          reuseIssues.push({
            seedId: occ.seedId,
            legoId: occ.legoId,
            known,
            target: occ.target,
            shouldRef: firstOccurrence.legoId
          });
        }
      });
    }
  }
});

if (reuseIssues.length === 0) {
  console.log("✓ No reuse issues detected!\n");
} else {
  console.log(`\nTotal reuse issues: ${reuseIssues.length}\n`);
}

console.log("\n=== RESOLUTION PLAN ===\n");
console.log("1. CONFLICT: 'that' → '那' (S0159) vs '那个' (S0162)");
console.log("   Resolution: FCFS - S0159 wins, S0162 must upchunk");
console.log("   - S0159: Keep 'that' → '那' (new: true)");
console.log("   - S0162: Upchunk to M-type 'about that' → '那个怎么样'\n");

console.log("2. REUSE CORRECTIONS:");
reuseIssues.forEach(issue => {
  console.log(`   - ${issue.seedId}: "${issue.known}" should ref ${issue.shouldRef}`);
});

console.log("\n=== GENERATING CORRECTED OUTPUT ===\n");

// Apply corrections and generate output in v8 hybrid format
const correctedSeeds = [];

seedsData.seeds.forEach(seed => {
  const seedLegos = [];

  seed.legos.forEach(lego => {
    // Check if this LEGO needs reuse correction
    const reuseIssue = reuseIssues.find(issue => issue.legoId === lego.id);

    // Convert to v8 hybrid format: [type, new, {k,t}, components?, ref?]
    let legoArray;

    if (lego.type === "M") {
      // M-type: [type, new, {k,t}, components]
      legoArray = [
        lego.type,
        reuseIssue ? 0 : (lego.new ? 1 : 0),
        { k: lego.lego.known, t: lego.lego.target },
        lego.components.map(c => ({ k: c.known, t: c.target }))
      ];

      if (reuseIssue) {
        legoArray.push(reuseIssue.shouldRef);
      }
    } else {
      // A-type: [type, new, {k,t}, null, ref?]
      legoArray = [
        lego.type,
        reuseIssue ? 0 : (lego.new ? 1 : 0),
        { k: lego.lego.known, t: lego.lego.target },
        null
      ];

      if (reuseIssue) {
        legoArray.push(reuseIssue.shouldRef);
      }
    }

    seedLegos.push(legoArray);
  });

  // Special handling for S0162: add upchunked M-type for "that" conflict
  if (seed.seed_id === "S0162") {
    console.log("⚡ Applying conflict resolution to S0162...");
    // Update existing "that" A-type to new: false
    const thatLegoIndex = seedLegos.findIndex(l => l[2].k === "that");
    if (thatLegoIndex !== -1) {
      seedLegos[thatLegoIndex][1] = 0; // Set new to false (covered by M-type)
    }

    // Update existing "think" A-type to new: false
    const thinkLegoIndex = seedLegos.findIndex(l => l[2].k === "think");
    if (thinkLegoIndex !== -1) {
      seedLegos[thinkLegoIndex][1] = 0; // Set new to false (covered by M-type)
    }

    // Add M-type "about that" → "那个怎么样"
    seedLegos.push([
      "M",
      1,
      { k: "about that", t: "那个怎么样" },
      [
        { k: "that", t: "那个" }
      ]
    ]);
    console.log("   ✓ Added M-type: 'about that' → '那个怎么样'");
    console.log("   ✓ Marked A-types 'think' and 'that' as new: false\n");
  }

  correctedSeeds.push([
    seed.seed_id,
    { k: seed.seed_pair.known, t: seed.seed_pair.target },
    seedLegos
  ]);
});

const output = {
  course: "zho_for_eng",
  seeds: correctedSeeds
};

// Write output to file
const fs = require('fs');
const outputPath = '/home/user/ssi-dashboard-v7/scripts/phase2_worker1_output.json';
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

console.log(`✅ Output written to: ${outputPath}`);
console.log(`\nSeeds processed: ${correctedSeeds.length}`);
console.log(`Conflicts resolved: ${conflicts.length}`);
console.log(`Reuse corrections applied: ${reuseIssues.length}`);

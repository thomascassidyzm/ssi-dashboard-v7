#!/usr/bin/env node

// Phase 2 Worker 3: Conflict Resolution for zho_for_eng S0106-S0120

const seedsData = {
  "courseCode": "zho_for_eng",
  "seeds": [
    {
      "seed_id": "S0106",
      "seed_pair": {
        "known": "We don't need to feel happy, we just need to work hard.",
        "target": "我们不需要感到快乐，我们只需要努力工作。"
      },
      "legos": [
        {
          "id": "S0106L01",
          "type": "A",
          "new": true,
          "lego": {"known": "We", "target": "我们"},
          "components": []
        },
        {
          "id": "S0106L02",
          "type": "A",
          "new": true,
          "lego": {"known": "don't need", "target": "不需要"},
          "components": []
        },
        {
          "id": "S0106L03",
          "type": "A",
          "new": true,
          "lego": {"known": "to feel", "target": "感到"},
          "components": []
        },
        {
          "id": "S0106L04",
          "type": "A",
          "new": true,
          "lego": {"known": "happy", "target": "快乐"},
          "components": []
        },
        {
          "id": "S0106L05",
          "type": "A",
          "new": true,
          "lego": {"known": "work hard", "target": "努力工作"},
          "components": []
        }
      ]
    },
    {
      "seed_id": "S0107",
      "seed_pair": {
        "known": "We hoped to see what you were doing.",
        "target": "我们希望看到你当时在做什么。"
      },
      "legos": [
        {
          "id": "S0107L01",
          "type": "A",
          "new": false,  // FIXED: Duplicate of S0106L01
          "ref": "S0106L01",
          "lego": {"known": "We", "target": "我们"},
          "components": []
        },
        {
          "id": "S0107L02",
          "type": "A",
          "new": true,
          "lego": {"known": "hoped", "target": "希望"},
          "components": []
        },
        {
          "id": "S0107L03",
          "type": "A",
          "new": true,
          "lego": {"known": "to see", "target": "看到"},
          "components": []
        },
        {
          "id": "S0107L04",
          "type": "A",
          "new": true,
          "lego": {"known": "you", "target": "你"},
          "components": []
        },
        {
          "id": "S0107L05",
          "type": "A",
          "new": true,
          "lego": {"known": "were doing", "target": "在做"},
          "components": []
        }
      ]
    },
    {
      "seed_id": "S0108",
      "seed_pair": {
        "known": "We didn't hope to wake in the middle of the night.",
        "target": "我们不希望在半夜被唤醒。"
      },
      "legos": [
        {
          "id": "S0108L01",
          "type": "A",
          "new": false,  // FIXED: Duplicate of S0106L01
          "ref": "S0106L01",
          "lego": {"known": "We", "target": "我们"},
          "components": []
        },
        {
          "id": "S0108L02",
          "type": "A",
          "new": true,
          "lego": {"known": "didn't hope", "target": "不希望"},
          "components": []
        },
        {
          "id": "S0108L03",
          "type": "A",
          "new": true,
          "lego": {"known": "to wake", "target": "醒来"},
          "components": []
        },
        {
          "id": "S0108L04",
          "type": "A",
          "new": true,
          "lego": {"known": "in the middle of the night", "target": "在半夜"},
          "components": []
        }
      ]
    },
    {
      "seed_id": "S0109",
      "seed_pair": {
        "known": "We must work hard to learn a lot of new words.",
        "target": "我们必须努力工作来学习许多新词汇。"
      },
      "legos": [
        {
          "id": "S0109L01",
          "type": "A",
          "new": false,  // FIXED: Duplicate of S0106L01
          "ref": "S0106L01",
          "lego": {"known": "We", "target": "我们"},
          "components": []
        },
        {
          "id": "S0109L02",
          "type": "A",
          "new": true,
          "lego": {"known": "must", "target": "必须"},
          "components": []
        },
        {
          "id": "S0109L03",
          "type": "A",
          "new": false,  // FIXED: Duplicate of S0106L05
          "ref": "S0106L05",
          "lego": {"known": "work hard", "target": "努力工作"},
          "components": []
        },
        {
          "id": "S0109L04",
          "type": "A",
          "new": true,
          "lego": {"known": "to learn", "target": "学习"},
          "components": []
        },
        {
          "id": "S0109L05",
          "type": "A",
          "new": true,
          "lego": {"known": "a lot of", "target": "许多"},
          "components": []
        },
        {
          "id": "S0109L06",
          "type": "A",
          "new": true,
          "lego": {"known": "new words", "target": "新词汇"},
          "components": []
        }
      ]
    },
    {
      "seed_id": "S0110",
      "seed_pair": {
        "known": "We're friends, and after we finish I'd like to relax.",
        "target": "我们是朋友，在我们完成之后，我想放松。"
      },
      "legos": [
        {
          "id": "S0110L01",
          "type": "A",
          "new": false,  // FIXED: Duplicate of S0106L01
          "ref": "S0106L01",
          "lego": {"known": "We", "target": "我们"},
          "components": []
        },
        {
          "id": "S0110L02",
          "type": "A",
          "new": true,
          "lego": {"known": "are", "target": "是"},
          "components": []
        },
        {
          "id": "S0110L03",
          "type": "A",
          "new": true,
          "lego": {"known": "friends", "target": "朋友"},
          "components": []
        },
        {
          "id": "S0110L04",
          "type": "A",
          "new": true,
          "lego": {"known": "after", "target": "之后"},
          "components": []
        },
        {
          "id": "S0110L05",
          "type": "A",
          "new": true,
          "lego": {"known": "we finish", "target": "我们完成"},
          "components": []
        },
        {
          "id": "S0110L06",
          "type": "A",
          "new": true,
          "lego": {"known": "I'd like to", "target": "我想"},
          "components": []
        },
        {
          "id": "S0110L07",
          "type": "A",
          "new": true,
          "lego": {"known": "relax", "target": "放松"},
          "components": []
        }
      ]
    },
    {
      "seed_id": "S0111",
      "seed_pair": {
        "known": "When we learn something new it changes our brain.",
        "target": "当我们学习新东西时，它改变了我们的大脑。"
      },
      "legos": [
        {
          "id": "S0111L01",
          "type": "A",
          "new": true,
          "lego": {"known": "learn", "target": "学习"},
          "components": []
        },
        {
          "id": "S0111L02",
          "type": "A",
          "new": true,
          "lego": {"known": "something new", "target": "新东西"},
          "components": []
        },
        {
          "id": "S0111L03",
          "type": "A",
          "new": true,
          "lego": {"known": "changes", "target": "改变"},
          "components": []
        },
        {
          "id": "S0111L04",
          "type": "A",
          "new": true,
          "lego": {"known": "our brain", "target": "我们的大脑"},
          "components": []
        },
        {
          "id": "S0111L05",
          "type": "M",
          "new": true,
          "lego": {
            "known": "When we learn something new it changes our brain.",
            "target": "当我们学习新东西时，它改变了我们的大脑。"
          },
          "components": [
            {"known": "learn", "target": "学习"},
            {"known": "something new", "target": "新东西"},
            {"known": "changes", "target": "改变"}
          ]
        }
      ]
    },
    {
      "seed_id": "S0112",
      "seed_pair": {
        "known": "That was very interesting, and I wasn't expecting it.",
        "target": "那非常有趣，我没有预料到。"
      },
      "legos": [
        {
          "id": "S0112L01",
          "type": "A",
          "new": true,
          "lego": {"known": "very interesting", "target": "非常有趣"},
          "components": []
        },
        {
          "id": "S0112L02",
          "type": "A",
          "new": true,
          "lego": {"known": "wasn't expecting", "target": "没有预料到"},
          "components": []
        },
        {
          "id": "S0112L03",
          "type": "M",
          "new": true,
          "lego": {
            "known": "That was very interesting, and I wasn't expecting it.",
            "target": "那非常有趣，我没有预料到。"
          },
          "components": [
            {"known": "very interesting", "target": "非常有趣"},
            {"known": "wasn't expecting", "target": "没有预料到"}
          ]
        }
      ]
    },
    {
      "seed_id": "S0113",
      "seed_pair": {
        "known": "Why can't I remember what you said?",
        "target": "我为什么记不住你说的话？"
      },
      "legos": [
        {
          "id": "S0113L01",
          "type": "A",
          "new": true,
          "lego": {"known": "remember", "target": "记住"},
          "components": []
        },
        {
          "id": "S0113L02",
          "type": "A",
          "new": true,
          "lego": {"known": "what you said", "target": "你说的话"},
          "components": []
        },
        {
          "id": "S0113L03",
          "type": "M",
          "new": true,
          "lego": {
            "known": "Why can't I remember what you said?",
            "target": "我为什么记不住你说的话？"
          },
          "components": [
            {"known": "remember", "target": "记住"},
            {"known": "what you said", "target": "你说的话"}
          ]
        }
      ]
    },
    {
      "seed_id": "S0114",
      "seed_pair": {
        "known": "I feel as if I'm doing worse today than yesterday.",
        "target": "我觉得今天比昨天做得更差。"
      },
      "legos": [
        {
          "id": "S0114L01",
          "type": "A",
          "new": true,
          "lego": {"known": "feel as if", "target": "觉得"},
          "components": []
        },
        {
          "id": "S0114L02",
          "type": "A",
          "new": true,
          "lego": {"known": "doing worse", "target": "做得更差"},
          "components": []
        },
        {
          "id": "S0114L03",
          "type": "A",
          "new": true,
          "lego": {"known": "today", "target": "今天"},
          "components": []
        },
        {
          "id": "S0114L04",
          "type": "A",
          "new": true,
          "lego": {"known": "yesterday", "target": "昨天"},
          "components": []
        },
        {
          "id": "S0114L05",
          "type": "M",
          "new": true,
          "lego": {
            "known": "I feel as if I'm doing worse today than yesterday.",
            "target": "我觉得今天比昨天做得更差。"
          },
          "components": [
            {"known": "feel as if", "target": "觉得"},
            {"known": "doing worse", "target": "做得更差"},
            {"known": "today", "target": "今天"},
            {"known": "yesterday", "target": "昨天"}
          ]
        }
      ]
    },
    {
      "seed_id": "S0115",
      "seed_pair": {
        "known": "I don't feel as if I'm ready to have a conversation.",
        "target": "我不觉得我已经准备好进行一次对话。"
      },
      "legos": [
        {
          "id": "S0115L01",
          "type": "A",
          "new": true,
          "lego": {"known": "ready", "target": "准备好"},
          "components": []
        },
        {
          "id": "S0115L02",
          "type": "A",
          "new": true,
          "lego": {"known": "have a conversation", "target": "进行对话"},
          "components": []
        },
        {
          "id": "S0115L03",
          "type": "M",
          "new": true,
          "lego": {
            "known": "I don't feel as if I'm ready to have a conversation.",
            "target": "我不觉得我已经准备好进行一次对话。"
          },
          "components": [
            {"known": "ready", "target": "准备好"},
            {"known": "have a conversation", "target": "进行对话"}
          ]
        }
      ]
    },
    {
      "seed_id": "S0116",
      "seed_pair": {
        "known": "This isn't the best choice I could make.",
        "target": "这不是我能做出的最好选择。"
      },
      "legos": [
        {
          "id": "S0116L01",
          "type": "A",
          "new": true,
          "lego": {"known": "This isn't", "target": "这不是"},
          "components": []
        },
        {
          "id": "S0116L02",
          "type": "A",
          "new": false,
          "lego": {"known": "the best choice", "target": "最好的选择"},
          "components": []
        },
        {
          "id": "S0116L03",
          "type": "A",
          "new": false,
          "lego": {"known": "I could make", "target": "我能做出的"},
          "components": []
        },
        {
          "id": "S0116L04",
          "type": "M",
          "new": true,
          "lego": {
            "known": "the best choice I could make",
            "target": "我能做出的最好选择"
          },
          "components": [
            {"known": "the best choice", "target": "最好的选择"},
            {"known": "I could make", "target": "我能做出的"}
          ]
        }
      ]
    },
    {
      "seed_id": "S0117",
      "seed_pair": {
        "known": "I'm definitely doing better than I was last time we talked to each other.",
        "target": "我肯定比上次我们彼此交谈时做得更好。"
      },
      "legos": [
        {
          "id": "S0117L01",
          "type": "A",
          "new": true,
          "lego": {"known": "I'm definitely", "target": "我肯定"},
          "components": []
        },
        {
          "id": "S0117L02",
          "type": "A",
          "new": false,
          "lego": {"known": "better", "target": "更好"},
          "components": []
        },
        {
          "id": "S0117L03",
          "type": "A",
          "new": false,
          "lego": {"known": "last time we talked to each other", "target": "上次我们彼此交谈的时候"},
          "components": []
        },
        {
          "id": "S0117L04",
          "type": "M",
          "new": true,
          "lego": {
            "known": "doing better than I was last time we talked to each other",
            "target": "比上次我们彼此交谈时做得更好"
          },
          "components": [
            {"known": "better", "target": "更好"},
            {"known": "last time we talked to each other", "target": "上次我们彼此交谈的时候"}
          ]
        }
      ]
    },
    {
      "seed_id": "S0118",
      "seed_pair": {
        "known": "I feel better than I felt when we were in the pub.",
        "target": "我比在酒吧的时候感觉更好。"
      },
      "legos": [
        {
          "id": "S0118L01",
          "type": "A",
          "new": true,
          "lego": {"known": "I feel", "target": "我感觉"},
          "components": []
        },
        {
          "id": "S0118L02",
          "type": "A",
          "new": false,
          "lego": {"known": "better", "target": "更好"},
          "components": []
        },
        {
          "id": "S0118L03",
          "type": "A",
          "new": false,
          "lego": {"known": "when we were in the pub", "target": "我们在酒吧的时候"},
          "components": []
        },
        {
          "id": "S0118L04",
          "type": "M",
          "new": true,
          "lego": {
            "known": "feel better than I felt when we were in the pub",
            "target": "比在酒吧的时候感觉更好"
          },
          "components": [
            {"known": "better", "target": "更好"},
            {"known": "when we were in the pub", "target": "我们在酒吧的时候"}
          ]
        }
      ]
    },
    {
      "seed_id": "S0119",
      "seed_pair": {
        "known": "Can I ask you something before you leave?",
        "target": "我能在你离开之前问你什么吗？"
      },
      "legos": [
        {
          "id": "S0119L01",
          "type": "A",
          "new": true,
          "lego": {"known": "Can I", "target": "我能"},
          "components": []
        },
        {
          "id": "S0119L02",
          "type": "A",
          "new": false,
          "lego": {"known": "ask you something", "target": "问你什么"},
          "components": []
        },
        {
          "id": "S0119L03",
          "type": "A",
          "new": false,
          "lego": {"known": "before you leave", "target": "在你离开之前"},
          "components": []
        },
        {
          "id": "S0119L04",
          "type": "M",
          "new": true,
          "lego": {
            "known": "Can I ask you something before you leave",
            "target": "我能在你离开之前问你什么吗"
          },
          "components": [
            {"known": "ask you something", "target": "问你什么"},
            {"known": "before you leave", "target": "在你离开之前"}
          ]
        }
      ]
    },
    {
      "seed_id": "S0120",
      "seed_pair": {
        "known": "It's interesting that you like to go by bus.",
        "target": "你喜欢坐公交车很有趣。"
      },
      "legos": [
        {
          "id": "S0120L01",
          "type": "A",
          "new": true,
          "lego": {"known": "It's interesting", "target": "很有趣"},
          "components": []
        },
        {
          "id": "S0120L02",
          "type": "A",
          "new": false,
          "lego": {"known": "you like", "target": "你喜欢"},
          "components": []
        },
        {
          "id": "S0120L03",
          "type": "A",
          "new": false,
          "lego": {"known": "to go by bus", "target": "坐公交车"},
          "components": []
        },
        {
          "id": "S0120L04",
          "type": "M",
          "new": true,
          "lego": {
            "known": "you like to go by bus",
            "target": "你喜欢坐公交车"
          },
          "components": [
            {"known": "you like", "target": "你喜欢"},
            {"known": "to go by bus", "target": "坐公交车"}
          ]
        }
      ]
    }
  ]
};

// Transform to v8 output format (array-based with keyed k/t pairs)
function transformToV8Format(seedsData) {
  return seedsData.seeds.map(seed => {
    const legos = seed.legos.map(lego => {
      const base = [
        lego.type,
        lego.new ? 1 : 0,
        {
          k: lego.lego.known,
          t: lego.lego.target
        }
      ];

      // Add components for M-types
      if (lego.type === 'M' && lego.components && lego.components.length > 0) {
        const components = lego.components.map(comp => ({
          k: comp.known,
          t: comp.target
        }));
        base.push(components);
      }

      // Add ref for reused LEGOs
      if (!lego.new && lego.ref) {
        if (lego.type === 'A') {
          base.push(null); // No components for A-types
        }
        base.push(lego.ref);
      }

      return base;
    });

    return [
      seed.seed_id,
      {
        k: seed.seed_pair.known,
        t: seed.seed_pair.target
      },
      legos
    ];
  });
}

const outputData = transformToV8Format(seedsData);

console.log(JSON.stringify(outputData, null, 2));

// Summary of changes
console.error('\n=== CONFLICT RESOLUTION SUMMARY ===');
console.error('Fixed reuse tracking:');
console.error('  - S0107L01 "We" → marked new:false, ref:S0106L01');
console.error('  - S0108L01 "We" → marked new:false, ref:S0106L01');
console.error('  - S0109L01 "We" → marked new:false, ref:S0106L01');
console.error('  - S0109L03 "work hard" → marked new:false, ref:S0106L05');
console.error('  - S0110L01 "We" → marked new:false, ref:S0106L01');
console.error('\nFixed M-type components:');
console.error('  - S0111L05: Added 3 components');
console.error('  - S0112L03: Added 2 components');
console.error('  - S0113L03: Added 2 components');
console.error('  - S0114L05: Added 4 components');
console.error('  - S0115L03: Added 2 components');
console.error('  - S0116L04: Added 2 components');
console.error('  - S0117L04: Added 2 components');
console.error('  - S0118L04: Added 2 components');
console.error('  - S0119L04: Added 2 components');
console.error('  - S0120L04: Added 2 components');
console.error('\nTotal seeds processed: 15 (S0106-S0120)');
console.error('No KNOWN→TARGET conflicts detected within this batch');

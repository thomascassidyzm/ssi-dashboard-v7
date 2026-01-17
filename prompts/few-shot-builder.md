# Few-Shot Course Builder Prompt

You build Chinese course content. Follow these examples EXACTLY.

## API Endpoint
POST to: `http://localhost:3471/api/seed/complete`

## Example 1: M-LEGO Heavy Seed

**Input:** Seed 10 - "I'm not sure if I can remember the whole sentence."

**Your submission:**
```json
{
  "course_code": "zho_for_eng",
  "seed_number": 10,
  "known_text": "I'm not sure if I can remember the whole sentence.",
  "target_text": "我不确定我能不能记住整个句子。",
  "legos": [
    {
      "idx": 1,
      "type": "M",
      "known": "I am not sure",
      "target": "我不确定",
      "components": [
        {"known": "I", "target": "我"},
        {"known": "not", "target": "不"},
        {"known": "sure", "target": "确定"}
      ],
      "phrases": [
        {"known": "I", "target": "我"},
        {"known": "sure", "target": "确定"},
        {"known": "not", "target": "不"},
        {"known": "not sure", "target": "不确定"},
        {"known": "I am not sure", "target": "我不确定"},
        {"known": "I am not sure how", "target": "我不确定怎么"},
        {"known": "I am not sure how to speak", "target": "我不确定怎么说"},
        {"known": "I am not sure how to speak Chinese", "target": "我不确定怎么说中文"},
        {"known": "I am not sure how to try to explain in Chinese", "target": "我不确定怎么试着用中文解释"},
        {"known": "I am not sure how to explain what I mean", "target": "我不确定怎么解释我的意思"},
        {"known": "I am not sure how to speak a little Chinese with you", "target": "我不确定怎么和你说一点中文"}
      ]
    },
    {
      "idx": 2,
      "type": "M",
      "known": "if I can",
      "target": "我能不能",
      "components": [
        {"known": "I", "target": "我"},
        {"known": "can", "target": "能"}
      ],
      "phrases": [
        {"known": "can", "target": "能"},
        {"known": "I can", "target": "我能"},
        {"known": "I can speak", "target": "我能说"},
        {"known": "I can learn", "target": "我能学"},
        {"known": "if I can", "target": "我能不能"},
        {"known": "if I can remember", "target": "我能不能记住"},
        {"known": "if I can speak Chinese", "target": "我能不能说中文"},
        {"known": "I am not sure if I can", "target": "我不确定我能不能"},
        {"known": "I am not sure if I can speak", "target": "我不确定我能不能说"},
        {"known": "I am not sure if I can explain what I mean", "target": "我不确定我能不能解释我的意思"},
        {"known": "I am not sure if I can try to speak Chinese today", "target": "我不确定今天我能不能试着说中文"}
      ]
    },
    {
      "idx": 3,
      "type": "A",
      "known": "to remember",
      "target": "记住",
      "phrases": [
        {"known": "to remember", "target": "记住"},
        {"known": "I want to remember", "target": "我想记住"},
        {"known": "I can remember", "target": "我能记住"},
        {"known": "if I can remember", "target": "我能不能记住"},
        {"known": "I want to remember how to speak", "target": "我想记住怎么说"},
        {"known": "I am not sure if I can remember", "target": "我不确定我能不能记住"},
        {"known": "I want to remember how to speak Chinese", "target": "我想记住怎么说中文"},
        {"known": "I am trying to remember how to speak Chinese", "target": "我在试着记住怎么说中文"},
        {"known": "I am not sure if I can remember how to speak", "target": "我不确定我能不能记住怎么说"},
        {"known": "I want to remember how to speak Chinese with you", "target": "我想记住怎么和你说中文"}
      ]
    },
    {
      "idx": 4,
      "type": "M",
      "known": "the whole sentence",
      "target": "整个句子",
      "components": [
        {"known": "whole", "target": "整个"},
        {"known": "sentence", "target": "句子"}
      ],
      "phrases": [
        {"known": "whole", "target": "整个"},
        {"known": "sentence", "target": "句子"},
        {"known": "the whole sentence", "target": "整个句子"},
        {"known": "I want to remember the whole sentence", "target": "我想记住整个句子"},
        {"known": "I can remember the whole sentence", "target": "我能记住整个句子"},
        {"known": "if I can remember the whole sentence", "target": "我能不能记住整个句子"},
        {"known": "I am not sure if I can remember the whole sentence", "target": "我不确定我能不能记住整个句子"},
        {"known": "I am trying to remember the whole sentence", "target": "我在试着记住整个句子"},
        {"known": "I want to learn how to remember the whole sentence", "target": "我想学怎么记住整个句子"},
        {"known": "I am not sure if I can remember the whole sentence in Chinese", "target": "我不确定我能不能记住整个中文句子"}
      ]
    }
  ]
}
```

## Example 2: Mixed A/M-LEGO Seed

**Input:** Seed 3 - "how to speak as often as possible."

**Your submission:**
```json
{
  "course_code": "zho_for_eng",
  "seed_number": 3,
  "known_text": "how to speak as often as possible.",
  "target_text": "怎么尽量多说。",
  "legos": [
    {
      "idx": 1,
      "type": "A",
      "known": "how",
      "target": "怎么",
      "phrases": [
        {"known": "how", "target": "怎么"},
        {"known": "how to speak", "target": "怎么说"},
        {"known": "how to learn", "target": "怎么学"},
        {"known": "how to speak Chinese", "target": "怎么说中文"},
        {"known": "I want to learn how to speak", "target": "我想学怎么说"},
        {"known": "I want to learn how to speak Chinese", "target": "我想学怎么说中文"},
        {"known": "I am trying to learn how to speak", "target": "我在试着学怎么说"},
        {"known": "I am trying to learn how to speak Chinese", "target": "我在试着学怎么说中文"},
        {"known": "now I want to learn how to speak Chinese", "target": "我现在想学怎么说中文"}
      ]
    },
    {
      "idx": 2,
      "type": "M",
      "known": "as often as possible",
      "target": "尽量多",
      "components": [
        {"known": "as much as possible", "target": "尽量"},
        {"known": "often", "target": "多"}
      ],
      "phrases": [
        {"known": "often", "target": "多"},
        {"known": "as much as possible", "target": "尽量"},
        {"known": "as often as possible", "target": "尽量多"},
        {"known": "I want to speak as often as possible", "target": "我想尽量多说"},
        {"known": "I want to learn as often as possible", "target": "我想尽量多学"},
        {"known": "speak Chinese as often as possible", "target": "尽量多说中文"},
        {"known": "how to speak as often as possible", "target": "怎么尽量多说"},
        {"known": "I am trying to speak as often as possible", "target": "我在试着尽量多说"},
        {"known": "I want to speak Chinese as often as possible", "target": "我想尽量多说中文"},
        {"known": "I am trying to speak Chinese as often as possible", "target": "我在试着尽量多说中文"},
        {"known": "now I want to speak Chinese as often as possible", "target": "我现在想尽量多说中文"},
        {"known": "I am trying to learn how to speak as often as possible", "target": "我在试着学怎么尽量多说"}
      ]
    },
    {
      "idx": 3,
      "type": "A",
      "known": "to speak",
      "target": "说",
      "phrases": [
        {"known": "to speak", "target": "说"},
        {"known": "I want to speak", "target": "我想说"},
        {"known": "speak Chinese", "target": "说中文"},
        {"known": "I want to speak Chinese", "target": "我想说中文"},
        {"known": "how to speak", "target": "怎么说"},
        {"known": "I am trying to speak", "target": "我在试着说"},
        {"known": "I am trying to speak Chinese", "target": "我在试着说中文"},
        {"known": "speak as often as possible", "target": "尽量多说"},
        {"known": "I want to speak Chinese as often as possible", "target": "我想尽量多说中文"},
        {"known": "now I want to speak Chinese with you", "target": "我现在想和你说中文"}
      ]
    }
  ]
}
```

---

## Rules (in order of importance)

1. **M-LEGO components = REAL WORDS only**
   - `do → 做` then `done → 做了` (learner infers 了)
   - NEVER: `completed action marker → 了`

2. **Phrases build SHORT → LONG**
   - Start: component words (1-2 chars)
   - Middle: LEGO + 1-2 elements (3-6 chars)
   - End: full sentences (10+ chars)

3. **Use only available vocabulary**
   - Phrases can only use LEGOs from earlier seeds + current seed up to this LEGO

4. **10-12 phrases per LEGO** (after components)

5. **Particles (吗, 了, 的, etc.) are INFERRED, never taught**

---

## Your Task

1. Call `/api/resume/zho_for_eng` to get your next seed
2. Translate the seed naturally
3. Break into LEGOs (prefer M-LEGOs for multi-word chunks)
4. Generate 10-12 phrases per LEGO (SHORT → LONG)
5. POST to `/api/seed/complete`
6. If rejected, fix the specific error and retry
7. Repeat for 30 seeds, then say "BATCH COMPLETE"

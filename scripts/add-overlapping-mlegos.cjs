// Add overlapping M-LEGOs to zho_for_eng seeds 1-50
// These show Chinese word order patterns with natural English
const http = require('http');

async function addLego(lego) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(lego);
    const options = {
      hostname: 'localhost',
      port: 3471,
      path: '/api/lego',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          resolve({ status: res.statusCode, ...result });
        } catch {
          resolve({ status: res.statusCode, error: body });
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Max indices per seed (from earlier query)
const maxIndices = {
  1: 7, // Just added L07
  2: 2, 3: 3, 4: 5, 5: 5, 6: 4, 7: 5, 8: 5, 9: 5, 10: 6,
  11: 7, 12: 7, 13: 5, 14: 5, 15: 8, 16: 6, 17: 5, 18: 5, 19: 4, 20: 6,
  21: 5, 22: 5, 23: 7, 24: 3, 25: 9, 26: 7, 27: 7, 28: 6, 29: 5, 30: 6,
  31: 6, 32: 7, 33: 5, 34: 6, 35: 7, 36: 4, 37: 6, 38: 1, 39: 5, 40: 4,
  41: 7, 42: 7, 43: 5, 44: 5, 45: 4, 46: 5, 47: 6, 48: 4, 49: 8, 50: 5
};

// Overlapping M-LEGOs to add
// Pattern 1: Time before verb (time + subject + verb)
// Pattern 2: Prep phrase before verb (和X verb)
// Pattern 3: 得 complement (verb 得 result)
// Pattern 4: V-not-V questions (能不能, 要不要, etc.)

const mlegosToAdd = [
  // Seed 2: "I'm trying to learn" → "我在试着学"
  // Could add: "am trying to learn" → "在试着学" (already covers this pattern)

  // Seed 5: "I'm going to practise speaking with someone else" → "我要和别人练习说话"
  // Add: "practice with someone else" → "和别人练习"
  {
    seed: 5,
    idx: 6,
    type: "M",
    known: "practice with someone else",
    target: "和别人练习",
    components: [
      { known: "with someone else", target: "和别人" },
      { known: "practice", target: "练习" }
    ],
    phrases: [
      { known: "with someone else", target: "和别人" },
      { known: "practice", target: "练习" },
      { known: "practice with someone else", target: "和别人练习" },
      { known: "I want to practice with someone else", target: "我想和别人练习" },
      { known: "I'm going to practice with someone else", target: "我要和别人练习" },
      { known: "practice speaking with someone else", target: "和别人练习说话" }
    ]
  },

  // Seed 7: "I want to try as hard as I can today" → "我今天想尽量努力试"
  // Add: "today I want" → "我今天想" (time before verb)
  {
    seed: 7,
    idx: 6,
    type: "M",
    known: "today I want",
    target: "我今天想",
    components: [
      { known: "I", target: "我" },
      { known: "today", target: "今天" },
      { known: "want", target: "想" }
    ],
    phrases: [
      { known: "I", target: "我" },
      { known: "today", target: "今天" },
      { known: "want", target: "想" },
      { known: "today I want", target: "我今天想" },
      { known: "today I want to try", target: "我今天想试" },
      { known: "today I want to learn", target: "我今天想学" },
      { known: "today I want to speak", target: "我今天想说" },
      { known: "today I want to practice", target: "我今天想练习" }
    ]
  },

  // Seed 9: "I speak a little Chinese now" → "我现在说一点中文"
  // Add: "now I speak" → "我现在说" (time before verb)
  {
    seed: 9,
    idx: 6,
    type: "M",
    known: "now I speak",
    target: "我现在说",
    components: [
      { known: "I", target: "我" },
      { known: "now", target: "现在" },
      { known: "speak", target: "说" }
    ],
    phrases: [
      { known: "I", target: "我" },
      { known: "now", target: "现在" },
      { known: "speak", target: "说" },
      { known: "now I speak", target: "我现在说" },
      { known: "now I speak Chinese", target: "我现在说中文" },
      { known: "now I speak a little", target: "我现在说一点" },
      { known: "now I want to speak", target: "我现在想说" },
      { known: "now I am trying to speak", target: "我现在在试着说" }
    ]
  },

  // Seed 10: "I'm not sure if I can remember" → "我不确定我能不能记住"
  // Add: "can or not" → "能不能" (V-not-V question pattern)
  {
    seed: 10,
    idx: 7,
    type: "M",
    known: "can or not",
    target: "能不能",
    components: [
      { known: "can", target: "能" },
      { known: "not", target: "不" },
      { known: "can", target: "能" }
    ],
    phrases: [
      { known: "can", target: "能" },
      { known: "not", target: "不" },
      { known: "can or not", target: "能不能" },
      { known: "can or not remember", target: "能不能记住" },
      { known: "can you or not", target: "你能不能" },
      { known: "can I or not", target: "我能不能" },
      { known: "I'm not sure if I can", target: "我不确定我能不能" },
      { known: "can you or not speak", target: "你能不能说" }
    ]
  },

  // Seed 13: "You speak Chinese very well" → "你中文说得很好"
  // Add: "speak well" → "说得好" (得 complement)
  {
    seed: 13,
    idx: 6,
    type: "M",
    known: "speak well",
    target: "说得好",
    components: [
      { known: "speak", target: "说" },
      { known: "得", target: "得" },
      { known: "well", target: "好" }
    ],
    phrases: [
      { known: "speak", target: "说" },
      { known: "得", target: "得" },
      { known: "well", target: "好" },
      { known: "speak well", target: "说得好" },
      { known: "speak very well", target: "说得很好" },
      { known: "you speak well", target: "你说得好" },
      { known: "you speak very well", target: "你说得很好" },
      { known: "I want to speak well", target: "我想说得好" },
      { known: "speak Chinese well", target: "中文说得好" },
      { known: "he speaks very well", target: "他说得很好" }
    ]
  },

  // Seed 15: "I want you to speak Chinese with me tomorrow" → "我想让你明天和我说中文"
  // Add: "tomorrow speak with me" → "明天和我说" (time + prep before verb)
  {
    seed: 15,
    idx: 9,
    type: "M",
    known: "tomorrow speak with me",
    target: "明天和我说",
    components: [
      { known: "tomorrow", target: "明天" },
      { known: "with me", target: "和我" },
      { known: "speak", target: "说" }
    ],
    phrases: [
      { known: "tomorrow", target: "明天" },
      { known: "with me", target: "和我" },
      { known: "speak", target: "说" },
      { known: "tomorrow speak with me", target: "明天和我说" },
      { known: "tomorrow speak Chinese with me", target: "明天和我说中文" },
      { known: "I want you to tomorrow speak with me", target: "我想让你明天和我说" },
      { known: "speak with me tomorrow", target: "明天和我说" },
      { known: "practice with me tomorrow", target: "明天和我练习" },
      { known: "come speak with me tomorrow", target: "明天来和我说" },
      { known: "will you speak with me tomorrow", target: "你明天会和我说吗" }
    ]
  },

  // Seed 16: "He wants to come back with everyone else later on" → "他想以后和别人一起回来"
  // Add: "later come back together" → "以后一起回来" (time before verb)
  {
    seed: 16,
    idx: 7,
    type: "M",
    known: "later come back together",
    target: "以后一起回来",
    components: [
      { known: "later", target: "以后" },
      { known: "together", target: "一起" },
      { known: "come back", target: "回来" }
    ],
    phrases: [
      { known: "later", target: "以后" },
      { known: "together", target: "一起" },
      { known: "come back", target: "回来" },
      { known: "later come back together", target: "以后一起回来" },
      { known: "he wants to later come back", target: "他想以后回来" },
      { known: "we will later come back together", target: "我们以后一起回来" },
      { known: "I want to later come back", target: "我想以后回来" },
      { known: "later speak together", target: "以后一起说" },
      { known: "later practice together", target: "以后一起练习" },
      { known: "later meet together", target: "以后一起见面" }
    ]
  },

  // Seed 18: "We want to meet at six o'clock this evening" → "我们想今天晚上六点见面"
  // Add: "this evening at six o'clock meet" → "今天晚上六点见面" (time before verb)
  {
    seed: 18,
    idx: 6,
    type: "M",
    known: "this evening at six meet",
    target: "今天晚上六点见面",
    components: [
      { known: "today evening", target: "今天晚上" },
      { known: "six o'clock", target: "六点" },
      { known: "meet", target: "见面" }
    ],
    phrases: [
      { known: "today evening", target: "今天晚上" },
      { known: "six o'clock", target: "六点" },
      { known: "meet", target: "见面" },
      { known: "this evening at six meet", target: "今天晚上六点见面" },
      { known: "we want to this evening meet", target: "我们想今天晚上见面" },
      { known: "I want to this evening at six meet", target: "我想今天晚上六点见面" },
      { known: "can we this evening meet", target: "我们今天晚上能见面吗" },
      { known: "tomorrow evening meet", target: "明天晚上见面" },
      { known: "this evening speak", target: "今天晚上说" },
      { known: "this evening practice", target: "今天晚上练习" }
    ]
  },

  // Seed 20: "You want to learn his name quickly" → "你想快点学他的名字"
  // Add: "quickly learn" → "快点学" (manner before verb)
  {
    seed: 20,
    idx: 7,
    type: "M",
    known: "quickly learn",
    target: "快点学",
    components: [
      { known: "quickly", target: "快点" },
      { known: "learn", target: "学" }
    ],
    phrases: [
      { known: "quickly", target: "快点" },
      { known: "learn", target: "学" },
      { known: "quickly learn", target: "快点学" },
      { known: "I want to quickly learn", target: "我想快点学" },
      { known: "you want to quickly learn", target: "你想快点学" },
      { known: "quickly learn his name", target: "快点学他的名字" },
      { known: "quickly speak", target: "快点说" },
      { known: "quickly come back", target: "快点回来" },
      { known: "quickly start", target: "快点开始" },
      { known: "quickly finish", target: "快点完" }
    ]
  },

  // Seed 22: "Because I want to meet people who speak Chinese" → "因为我想见说中文的人"
  // Add: "meet people who speak Chinese" → "见说中文的人" (relative clause before noun)
  {
    seed: 22,
    idx: 6,
    type: "M",
    known: "meet Chinese-speaking people",
    target: "见说中文的人",
    components: [
      { known: "meet", target: "见" },
      { known: "Chinese-speaking", target: "说中文的" },
      { known: "people", target: "人" }
    ],
    phrases: [
      { known: "meet", target: "见" },
      { known: "Chinese-speaking", target: "说中文的" },
      { known: "people", target: "人" },
      { known: "meet Chinese-speaking people", target: "见说中文的人" },
      { known: "I want to meet Chinese-speaking people", target: "我想见说中文的人" },
      { known: "Chinese-speaking people", target: "说中文的人" },
      { known: "people who speak Chinese", target: "说中文的人" },
      { known: "I know Chinese-speaking people", target: "我知道说中文的人" },
      { known: "there are Chinese-speaking people here", target: "这里有说中文的人" },
      { known: "I like Chinese-speaking people", target: "我喜欢说中文的人" }
    ]
  },

  // Seed 25: "Are you going to help me before I have to go?" → "你会在我要走之前帮我吗"
  // Add: "before I go help me" → "在我走之前帮我" (time clause before verb)
  {
    seed: 25,
    idx: 10,
    type: "M",
    known: "before I go help me",
    target: "在我走之前帮我",
    components: [
      { known: "at/before", target: "在" },
      { known: "I go", target: "我走" },
      { known: "before", target: "之前" },
      { known: "help me", target: "帮我" }
    ],
    phrases: [
      { known: "at/before", target: "在" },
      { known: "I go", target: "我走" },
      { known: "before", target: "之前" },
      { known: "help me", target: "帮我" },
      { known: "before I go help me", target: "在我走之前帮我" },
      { known: "before I go", target: "在我走之前" },
      { known: "will you help me before I go", target: "你会在我走之前帮我吗" },
      { known: "before you go", target: "在你走之前" },
      { known: "before he comes back", target: "在他回来之前" },
      { known: "before tomorrow", target: "在明天之前" }
    ]
  },

  // Seed 27: "I don't like taking too much time to answer" → "我不喜欢花太多时间来回答"
  // Add: "spend time to answer" → "花时间来回答" (purpose clause)
  {
    seed: 27,
    idx: 8,
    type: "M",
    known: "spend time to answer",
    target: "花时间来回答",
    components: [
      { known: "spend", target: "花" },
      { known: "time", target: "时间" },
      { known: "to/in order to", target: "来" },
      { known: "answer", target: "回答" }
    ],
    phrases: [
      { known: "spend", target: "花" },
      { known: "time", target: "时间" },
      { known: "to/in order to", target: "来" },
      { known: "answer", target: "回答" },
      { known: "spend time to answer", target: "花时间来回答" },
      { known: "spend too much time", target: "花太多时间" },
      { known: "I don't like spending time to answer", target: "我不喜欢花时间来回答" },
      { known: "spend time to learn", target: "花时间来学" },
      { known: "spend time to practice", target: "花时间来练习" },
      { known: "spend time to explain", target: "花时间来解释" }
    ]
  },

  // Seed 29: "I'm looking forward to speaking better" → "我期待说得更好"
  // Add: "speak better" → "说得更好" (得 complement with comparison)
  {
    seed: 29,
    idx: 6,
    type: "M",
    known: "speak better",
    target: "说得更好",
    components: [
      { known: "speak", target: "说" },
      { known: "得", target: "得" },
      { known: "better", target: "更好" }
    ],
    phrases: [
      { known: "speak", target: "说" },
      { known: "得", target: "得" },
      { known: "better", target: "更好" },
      { known: "speak better", target: "说得更好" },
      { known: "I want to speak better", target: "我想说得更好" },
      { known: "I'm looking forward to speaking better", target: "我期待说得更好" },
      { known: "you speak better now", target: "你现在说得更好" },
      { known: "learn better", target: "学得更好" },
      { known: "remember better", target: "记得更好" },
      { known: "do better", target: "做得更好" }
    ]
  },

  // Seed 30: "I wanted to ask you something yesterday" → "我昨天想问你一些东西"
  // Add: "yesterday I wanted" → "我昨天想" (time before verb)
  {
    seed: 30,
    idx: 7,
    type: "M",
    known: "yesterday I wanted",
    target: "我昨天想",
    components: [
      { known: "I", target: "我" },
      { known: "yesterday", target: "昨天" },
      { known: "wanted", target: "想" }
    ],
    phrases: [
      { known: "I", target: "我" },
      { known: "yesterday", target: "昨天" },
      { known: "wanted", target: "想" },
      { known: "yesterday I wanted", target: "我昨天想" },
      { known: "yesterday I wanted to ask", target: "我昨天想问" },
      { known: "yesterday I wanted to speak", target: "我昨天想说" },
      { known: "yesterday I wanted to learn", target: "我昨天想学" },
      { known: "yesterday I wanted to meet", target: "我昨天想见面" },
      { known: "yesterday I spoke", target: "我昨天说了" },
      { known: "yesterday you wanted", target: "你昨天想" }
    ]
  },

  // Seed 33: "How long have you been learning Chinese?" → "你学中文学了多久了"
  // Add: "learn Chinese for how long" → "学中文学了多久" (duration pattern)
  {
    seed: 33,
    idx: 6,
    type: "M",
    known: "learn Chinese for how long",
    target: "学中文学了多久",
    components: [
      { known: "learn", target: "学" },
      { known: "Chinese", target: "中文" },
      { known: "learn (duration)", target: "学了" },
      { known: "how long", target: "多久" }
    ],
    phrases: [
      { known: "learn", target: "学" },
      { known: "Chinese", target: "中文" },
      { known: "learn (duration)", target: "学了" },
      { known: "how long", target: "多久" },
      { known: "learn Chinese for how long", target: "学中文学了多久" },
      { known: "you learn Chinese for how long", target: "你学中文学了多久" },
      { known: "I've been learning for how long", target: "我学了多久" },
      { known: "speak Chinese for how long", target: "说中文说了多久" },
      { known: "wait for how long", target: "等了多久" },
      { known: "practice for how long", target: "练习了多久" }
    ]
  },

  // Seed 35: "She doesn't want to read anything this afternoon" → "她今天下午不想读任何东西"
  // Add: "this afternoon don't want to" → "今天下午不想" (time before verb)
  {
    seed: 35,
    idx: 8,
    type: "M",
    known: "this afternoon don't want to",
    target: "今天下午不想",
    components: [
      { known: "this afternoon", target: "今天下午" },
      { known: "don't want", target: "不想" }
    ],
    phrases: [
      { known: "this afternoon", target: "今天下午" },
      { known: "don't want", target: "不想" },
      { known: "this afternoon don't want to", target: "今天下午不想" },
      { known: "she this afternoon doesn't want to read", target: "她今天下午不想读" },
      { known: "I this afternoon don't want to practice", target: "我今天下午不想练习" },
      { known: "this morning don't want to", target: "今天早上不想" },
      { known: "tonight don't want to", target: "今天晚上不想" },
      { known: "tomorrow afternoon", target: "明天下午" },
      { known: "this afternoon I want to", target: "今天下午我想" },
      { known: "this afternoon speak", target: "今天下午说" }
    ]
  },

  // Seed 37: "I started to think about it carefully last month" → "我上个月开始仔细想它"
  // Add: "last month started" → "上个月开始" (time before verb)
  {
    seed: 37,
    idx: 7,
    type: "M",
    known: "last month started",
    target: "上个月开始",
    components: [
      { known: "last month", target: "上个月" },
      { known: "started", target: "开始" }
    ],
    phrases: [
      { known: "last month", target: "上个月" },
      { known: "started", target: "开始" },
      { known: "last month started", target: "上个月开始" },
      { known: "I last month started to learn", target: "我上个月开始学" },
      { known: "I last month started to practice", target: "我上个月开始练习" },
      { known: "last month started to speak", target: "上个月开始说" },
      { known: "last week started", target: "上个星期开始" },
      { known: "last month I wanted", target: "上个月我想" },
      { known: "last month came back", target: "上个月回来了" },
      { known: "last month met", target: "上个月见面了" }
    ]
  },

  // Seed 38: "I've been learning for about a week" → "我学了大概一个星期"
  // Add: "learned for a week" → "学了一个星期" (duration complement)
  {
    seed: 38,
    idx: 2,
    type: "M",
    known: "learned for a week",
    target: "学了一个星期",
    components: [
      { known: "learned", target: "学了" },
      { known: "a week", target: "一个星期" }
    ],
    phrases: [
      { known: "learned", target: "学了" },
      { known: "a week", target: "一个星期" },
      { known: "learned for a week", target: "学了一个星期" },
      { known: "I've learned for a week", target: "我学了一个星期" },
      { known: "learned for about a week", target: "学了大概一个星期" },
      { known: "practiced for a week", target: "练习了一个星期" },
      { known: "waited for a week", target: "等了一个星期" },
      { known: "spoke for an hour", target: "说了一个小时" },
      { known: "learned for two weeks", target: "学了两个星期" },
      { known: "learned for a month", target: "学了一个月" }
    ]
  },

  // Seed 39: "But I'm a little tired this morning" → "但是我今天早上有点累"
  // Add: "this morning a little tired" → "今天早上有点累" (time + degree before adj)
  {
    seed: 39,
    idx: 6,
    type: "M",
    known: "this morning a little tired",
    target: "今天早上有点累",
    components: [
      { known: "this morning", target: "今天早上" },
      { known: "a little", target: "有点" },
      { known: "tired", target: "累" }
    ],
    phrases: [
      { known: "this morning", target: "今天早上" },
      { known: "a little", target: "有点" },
      { known: "tired", target: "累" },
      { known: "this morning a little tired", target: "今天早上有点累" },
      { known: "I'm this morning a little tired", target: "我今天早上有点累" },
      { known: "this afternoon a little tired", target: "今天下午有点累" },
      { known: "yesterday a little tired", target: "昨天有点累" },
      { known: "today a little tired", target: "今天有点累" },
      { known: "this morning I want", target: "今天早上我想" },
      { known: "this morning I spoke", target: "今天早上我说了" }
    ]
  },

  // Seed 40: "How do you feel at the moment?" → "你现在感觉怎么样"
  // Add: "now feel how" → "现在感觉怎么样" (time before verb + question)
  {
    seed: 40,
    idx: 5,
    type: "M",
    known: "now feel how",
    target: "现在感觉怎么样",
    components: [
      { known: "now", target: "现在" },
      { known: "feel", target: "感觉" },
      { known: "how", target: "怎么样" }
    ],
    phrases: [
      { known: "now", target: "现在" },
      { known: "feel", target: "感觉" },
      { known: "how", target: "怎么样" },
      { known: "now feel how", target: "现在感觉怎么样" },
      { known: "you now feel how", target: "你现在感觉怎么样" },
      { known: "I now feel okay", target: "我现在感觉还可以" },
      { known: "today feel how", target: "今天感觉怎么样" },
      { known: "this morning feel how", target: "今天早上感觉怎么样" },
      { known: "now think how", target: "现在想怎么样" },
      { known: "now speak how", target: "现在说得怎么样" }
    ]
  },

  // Seed 42: "I was starting to feel better than last night" → "我开始感觉比昨天晚上好了"
  // Add: "better than last night" → "比昨天晚上好" (comparison pattern)
  {
    seed: 42,
    idx: 8,
    type: "M",
    known: "better than last night",
    target: "比昨天晚上好",
    components: [
      { known: "than", target: "比" },
      { known: "last night", target: "昨天晚上" },
      { known: "better/good", target: "好" }
    ],
    phrases: [
      { known: "than", target: "比" },
      { known: "last night", target: "昨天晚上" },
      { known: "better/good", target: "好" },
      { known: "better than last night", target: "比昨天晚上好" },
      { known: "feel better than last night", target: "感觉比昨天晚上好" },
      { known: "I feel better than last night", target: "我感觉比昨天晚上好" },
      { known: "better than yesterday", target: "比昨天好" },
      { known: "better than before", target: "比以前好" },
      { known: "speak better than me", target: "说得比我好" },
      { known: "learn faster than me", target: "学得比我快" }
    ]
  },

  // Seed 44: "Or if I need to improve" → "或者如果我需要改进"
  // Add: "if I need" → "如果我需要" (conditional before verb)
  {
    seed: 44,
    idx: 6,
    type: "M",
    known: "if I need",
    target: "如果我需要",
    components: [
      { known: "if", target: "如果" },
      { known: "I", target: "我" },
      { known: "need", target: "需要" }
    ],
    phrases: [
      { known: "if", target: "如果" },
      { known: "I", target: "我" },
      { known: "need", target: "需要" },
      { known: "if I need", target: "如果我需要" },
      { known: "if I need to improve", target: "如果我需要改进" },
      { known: "if I need help", target: "如果我需要帮助" },
      { known: "if you need", target: "如果你需要" },
      { known: "if we need to practice", target: "如果我们需要练习" },
      { known: "if I want", target: "如果我想" },
      { known: "if you want to speak", target: "如果你想说" }
    ]
  },

  // Seed 46: "But I don't worry about making mistakes" → "但是我不担心犯错"
  // Add: "don't worry about" → "不担心" (negation + verb)
  {
    seed: 46,
    idx: 6,
    type: "M",
    known: "don't worry about",
    target: "不担心",
    components: [
      { known: "don't/not", target: "不" },
      { known: "worry", target: "担心" }
    ],
    phrases: [
      { known: "don't/not", target: "不" },
      { known: "worry", target: "担心" },
      { known: "don't worry about", target: "不担心" },
      { known: "I don't worry about", target: "我不担心" },
      { known: "don't worry about making mistakes", target: "不担心犯错" },
      { known: "don't worry about speaking", target: "不担心说" },
      { known: "don't worry about learning", target: "不担心学" },
      { known: "you don't need to worry", target: "你不需要担心" },
      { known: "I don't care about", target: "我不在乎" },
      { known: "don't worry about time", target: "不担心时间" }
    ]
  },

  // Seed 48: "I don't care about making mistakes" → "我不在乎犯错"
  // Add: "don't care about" → "不在乎" (negation + verb)
  {
    seed: 48,
    idx: 5,
    type: "M",
    known: "don't care about",
    target: "不在乎",
    components: [
      { known: "don't/not", target: "不" },
      { known: "care about", target: "在乎" }
    ],
    phrases: [
      { known: "don't/not", target: "不" },
      { known: "care about", target: "在乎" },
      { known: "don't care about", target: "不在乎" },
      { known: "I don't care about", target: "我不在乎" },
      { known: "don't care about making mistakes", target: "不在乎犯错" },
      { known: "don't care about what others think", target: "不在乎别人想什么" },
      { known: "don't care about time", target: "不在乎时间" },
      { known: "I really don't care", target: "我真的不在乎" },
      { known: "you don't care", target: "你不在乎" },
      { known: "he doesn't care", target: "他不在乎" }
    ]
  },

  // Seed 50: "I'm not trying to finish as quickly as possible" → "我不是想尽快完成"
  // Add: "finish as quickly as possible" → "尽快完成" (adverb before verb)
  {
    seed: 50,
    idx: 6,
    type: "M",
    known: "finish as quickly as possible",
    target: "尽快完成",
    components: [
      { known: "as quickly as possible", target: "尽快" },
      { known: "finish", target: "完成" }
    ],
    phrases: [
      { known: "as quickly as possible", target: "尽快" },
      { known: "finish", target: "完成" },
      { known: "finish as quickly as possible", target: "尽快完成" },
      { known: "I want to finish as quickly as possible", target: "我想尽快完成" },
      { known: "I'm not trying to finish as quickly as possible", target: "我不是想尽快完成" },
      { known: "learn as quickly as possible", target: "尽快学" },
      { known: "come back as quickly as possible", target: "尽快回来" },
      { known: "start as quickly as possible", target: "尽快开始" },
      { known: "answer as quickly as possible", target: "尽快回答" },
      { known: "help as quickly as possible", target: "尽快帮助" }
    ]
  }
];

async function main() {
  console.log(`Adding ${mlegosToAdd.length} overlapping M-LEGOs to zho_for_eng...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const mlego of mlegosToAdd) {
    const lego = {
      course_code: 'zho_for_eng',
      seed: mlego.seed,
      idx: mlego.idx,
      type: mlego.type,
      known: mlego.known,
      target: mlego.target,
      components: mlego.components,
      phrases: mlego.phrases
    };

    const result = await addLego(lego);

    if (result.ok) {
      console.log(`✓ S${String(mlego.seed).padStart(4,'0')}L${String(mlego.idx).padStart(2,'0')}: "${mlego.known}" → "${mlego.target}" (${result.phrases} phrases)`);
      successCount++;
    } else {
      console.log(`✗ S${String(mlego.seed).padStart(4,'0')}L${String(mlego.idx).padStart(2,'0')}: ${result.error || JSON.stringify(result)}`);
      failCount++;
    }

    // Small delay to avoid overwhelming the server
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nComplete: ${successCount} added, ${failCount} failed`);
}

main().catch(console.error);

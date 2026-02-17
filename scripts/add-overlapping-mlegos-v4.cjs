// Add more overlapping M-LEGOs to zho_for_eng seeds 1-50 (second batch)
// Focus on: time before verb, prep before verb, 得 complement patterns
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

const mlegosToAdd = [
  // Seed 2: "I'm trying to learn" → "我在试着学"
  // Add: "am trying to learn" pattern - already covered by L02, skip

  // Seed 3: "how to speak as often as possible" → "怎么尽量多说"
  // Add: "speak as often as possible" → "尽量多说" (adverb before verb)
  {
    seed: 3,
    idx: 4,
    type: "M",
    known: "speak as often as possible",
    target: "尽量多说",
    components: [
      { known: "as much as possible", target: "尽量" },
      { known: "more/often", target: "多" },
      { known: "speak", target: "说" }
    ],
    phrases: [
      { known: "I want to speak as often as possible", target: "我想尽量多说" },
      { known: "try to speak as often as possible", target: "试着尽量多说" },
      { known: "learn as much as possible", target: "尽量多学" }
    ]
  },

  // Seed 4: "how to say something in Chinese" → "怎么用中文说一些东西"
  // Add: "say in Chinese" → "用中文说" (instrument before verb)
  {
    seed: 4,
    idx: 6,
    type: "M",
    known: "say in Chinese",
    target: "用中文说",
    components: [
      { known: "using/in", target: "用" },
      { known: "Chinese", target: "中文" },
      { known: "say", target: "说" }
    ],
    phrases: [
      { known: "how to say in Chinese", target: "怎么用中文说" },
      { known: "I want to say in Chinese", target: "我想用中文说" },
      { known: "can you say in Chinese", target: "你能用中文说吗" },
      { known: "say something in Chinese", target: "用中文说一些东西" }
    ]
  },

  // Seed 6: "I'm trying to remember a word" → "我在试着记住一个词"
  // Add: "trying to remember" → "试着记住" (verb + trying aspect)
  {
    seed: 6,
    idx: 5,
    type: "M",
    known: "trying to remember",
    target: "试着记住",
    components: [
      { known: "trying to", target: "试着" },
      { known: "remember", target: "记住" }
    ],
    phrases: [
      { known: "I'm trying to remember", target: "我在试着记住", score: 7 },
      { known: "trying to remember a word", target: "试着记住一个词", score: 7 },
      { known: "trying to speak", target: "试着说", score: 7 },
      { known: "trying to learn", target: "试着学", score: 7 }
    ]
  },

  // Seed 8: "I'm going to try to explain what I mean" → "我要试着解释我的意思"
  // Add: "try to explain" → "试着解释" (verb + trying aspect)
  {
    seed: 8,
    idx: 6,
    type: "M",
    known: "try to explain",
    target: "试着解释",
    components: [
      { known: "try to", target: "试着" },
      { known: "explain", target: "解释" }
    ],
    phrases: [
      { known: "I'm going to try to explain", target: "我要试着解释", score: 7 },
      { known: "try to explain what I mean", target: "试着解释我的意思", score: 7 },
      { known: "try to explain in Chinese", target: "试着用中文解释", score: 7 },
      { known: "trying to explain", target: "在试着解释", score: 7 }
    ]
  },

  // Seed 11: "I'd like to be able to speak after you finish" → "我想在你说完以后能说"
  // Add: "after you finish" → "在你说完以后" (time clause after verb)
  {
    seed: 11,
    idx: 8,
    type: "M",
    known: "after you finish speaking",
    target: "在你说完以后",
    components: [
      { known: "at", target: "在" },
      { known: "you", target: "你" },
      { known: "finish speaking", target: "说完" },
      { known: "after", target: "以后" }
    ],
    phrases: [
      { known: "after you finish", target: "在你说完以后", score: 7 },
      { known: "I want to speak after you finish", target: "我想在你说完以后说", score: 7 },
      { known: "after I finish", target: "在我说完以后", score: 7 },
      { known: "after he finishes", target: "在他说完以后", score: 7 }
    ]
  },

  // Seed 12: "I wouldn't like to guess what's going to happen tomorrow" → "我不想猜明天会发生什么"
  // Add: "tomorrow will happen" → "明天会发生" (time before verb)
  {
    seed: 12,
    idx: 8,
    type: "M",
    known: "tomorrow will happen",
    target: "明天会发生",
    components: [
      { known: "tomorrow", target: "明天" },
      { known: "will", target: "会" },
      { known: "happen", target: "发生" }
    ],
    phrases: [
      { known: "what will happen tomorrow", target: "明天会发生什么", score: 7 },
      { known: "I don't know what will happen tomorrow", target: "我不知道明天会发生什么", score: 7 },
      { known: "today will happen", target: "今天会发生", score: 7 },
      { known: "what will happen", target: "会发生什么", score: 7 }
    ]
  },

  // Seed 14: "Do you speak Chinese all day?" → "你整天说中文吗"
  // Add: "speak all day" → "整天说" (duration before verb)
  {
    seed: 14,
    idx: 6,
    type: "M",
    known: "speak all day",
    target: "整天说",
    components: [
      { known: "all day", target: "整天" },
      { known: "speak", target: "说" }
    ],
    phrases: [
      { known: "do you speak all day", target: "你整天说吗", score: 7 },
      { known: "I speak Chinese all day", target: "我整天说中文", score: 7 },
      { known: "study all day", target: "整天学", score: 7 },
      { known: "practice all day", target: "整天练习", score: 7 }
    ]
  },

  // Seed 17: "She wants to find out what the answer is" → "她想找出答案是什么"
  // Add: "find out the answer" → "找出答案" (verb + direction + object)
  {
    seed: 17,
    idx: 6,
    type: "M",
    known: "find out the answer",
    target: "找出答案",
    components: [
      { known: "find out", target: "找出" },
      { known: "answer", target: "答案" }
    ],
    phrases: [
      { known: "she wants to find out the answer", target: "她想找出答案", score: 7 },
      { known: "I want to find out the answer", target: "我想找出答案", score: 7 },
      { known: "find out what it is", target: "找出是什么", score: 7 },
      { known: "can you find out", target: "你能找出吗", score: 7 }
    ]
  },

  // Seed 19: "But I don't want to stop talking" → "但是我不想停止说话"
  // Add: "stop talking" → "停止说话" (verb + object)
  {
    seed: 19,
    idx: 5,
    type: "M",
    known: "stop talking",
    target: "停止说话",
    components: [
      { known: "stop", target: "停止" },
      { known: "talking", target: "说话" }
    ],
    phrases: [
      { known: "I don't want to stop talking", target: "我不想停止说话", score: 7 },
      { known: "stop talking now", target: "现在停止说话", score: 7 },
      { known: "don't stop talking", target: "不要停止说话", score: 7 },
      { known: "stop learning", target: "停止学", score: 7 }
    ]
  },

  // Seed 21: "Why are you learning her name?" → "你为什么在学她的名字"
  // Add: "why are you learning" → "你为什么在学" (question word + progressive)
  {
    seed: 21,
    idx: 6,
    type: "M",
    known: "why are you learning",
    target: "你为什么在学",
    components: [
      { known: "you", target: "你" },
      { known: "why", target: "为什么" },
      { known: "are learning", target: "在学" }
    ],
    phrases: [
      { known: "why are you learning", target: "你为什么在学", score: 7 },
      { known: "why are you speaking", target: "你为什么在说", score: 7 },
      { known: "why is she learning", target: "她为什么在学", score: 7 },
      { known: "why are we practicing", target: "我们为什么在练习", score: 7 }
    ]
  },

  // Seed 23: "I'm going to start talking more soon" → "我很快要开始多说话了"
  // Add: "soon going to start" → "很快要开始" (time + intention before verb)
  {
    seed: 23,
    idx: 8,
    type: "M",
    known: "soon going to start",
    target: "很快要开始",
    components: [
      { known: "soon", target: "很快" },
      { known: "going to", target: "要" },
      { known: "start", target: "开始" }
    ],
    phrases: [
      { known: "I'm soon going to start", target: "我很快要开始", score: 7 },
      { known: "soon going to start talking", target: "很快要开始说话", score: 7 },
      { known: "soon going to start learning", target: "很快要开始学", score: 7 },
      { known: "soon going to meet", target: "很快要见面", score: 7 }
    ]
  },

  // Seed 24: "I'm not going to be able to remember easily" → "我不会容易记住"
  // Add: "remember easily" → "容易记住" (manner before verb)
  {
    seed: 24,
    idx: 4,
    type: "M",
    known: "remember easily",
    target: "容易记住",
    components: [
      { known: "easily", target: "容易" },
      { known: "remember", target: "记住" }
    ],
    phrases: [
      { known: "I won't remember easily", target: "我不会容易记住", score: 7 },
      { known: "easy to remember", target: "容易记住", score: 7 },
      { known: "easy to learn", target: "容易学", score: 7 },
      { known: "easy to speak", target: "容易说", score: 7 }
    ]
  },

  // Seed 26: "I like feeling as if I'm nearly ready to go" → "我喜欢感觉好像我快要走了"
  // Add: "feel as if" → "感觉好像" (perception + similarity)
  {
    seed: 26,
    idx: 8,
    type: "M",
    known: "feel as if",
    target: "感觉好像",
    components: [
      { known: "feel", target: "感觉" },
      { known: "as if", target: "好像" }
    ],
    phrases: [
      { known: "I feel as if", target: "我感觉好像", score: 7 },
      { known: "feel as if I'm ready", target: "感觉好像我快要了", score: 7 },
      { known: "feel as if I know", target: "感觉好像我知道", score: 7 },
      { known: "it feels as if", target: "感觉好像", score: 7 }
    ]
  },

  // Seed 28: "It's useful to start talking as soon as you can" → "尽快开始说话是有用的"
  // Add: "start talking as soon as possible" → "尽快开始说话" (adverb before verb)
  {
    seed: 28,
    idx: 7,
    type: "M",
    known: "start talking as soon as possible",
    target: "尽快开始说话",
    components: [
      { known: "as soon as possible", target: "尽快" },
      { known: "start", target: "开始" },
      { known: "talking", target: "说话" }
    ],
    phrases: [
      { known: "start talking as soon as possible", target: "尽快开始说话", score: 7 },
      { known: "it's useful to start talking as soon as possible", target: "尽快开始说话是有用的", score: 7 },
      { known: "start learning as soon as possible", target: "尽快开始学", score: 7 },
      { known: "start practicing as soon as possible", target: "尽快开始练习", score: 7 }
    ]
  },

  // Seed 31: "You wanted to speak with me tonight" → "你今天晚上想和我说话"
  // Add: "tonight speak with me" → "今天晚上和我说话" (time + prep before verb)
  {
    seed: 31,
    idx: 7,
    type: "M",
    known: "tonight speak with me",
    target: "今天晚上和我说话",
    components: [
      { known: "tonight", target: "今天晚上" },
      { known: "with me", target: "和我" },
      { known: "talk", target: "说话" }
    ],
    phrases: [
      { known: "you wanted to tonight speak with me", target: "你今天晚上想和我说话", score: 7 },
      { known: "tonight practice with me", target: "今天晚上和我练习", score: 7 },
      { known: "tomorrow speak with me", target: "明天和我说话", score: 7 },
      { known: "tonight meet with me", target: "今天晚上和我见面", score: 7 }
    ]
  },

  // Seed 32: "Did you want to show me something?" → "你想给我看一些东西吗"
  // Add: "show me something" → "给我看一些东西" (indirect object before direct)
  {
    seed: 32,
    idx: 8,
    type: "M",
    known: "show me something",
    target: "给我看一些东西",
    components: [
      { known: "give/to", target: "给" },
      { known: "me", target: "我" },
      { known: "look/show", target: "看" },
      { known: "something", target: "一些东西" }
    ],
    phrases: [
      { known: "did you want to show me something", target: "你想给我看一些东西吗", score: 7 },
      { known: "show me", target: "给我看", score: 7 },
      { known: "show you something", target: "给你看一些东西", score: 7 },
      { known: "let me show you", target: "让我给你看", score: 7 }
    ]
  },

  // Seed 34: "I think I know what you mean" → "我觉得我知道你的意思"
  // Add: "I think I know" → "我觉得我知道" (embedded clause)
  {
    seed: 34,
    idx: 7,
    type: "M",
    known: "I think I know",
    target: "我觉得我知道",
    components: [
      { known: "I", target: "我" },
      { known: "think", target: "觉得" },
      { known: "I know", target: "我知道" }
    ],
    phrases: [
      { known: "I think I know what you mean", target: "我觉得我知道你的意思", score: 7 },
      { known: "I think you know", target: "我觉得你知道", score: 7 },
      { known: "I think I can", target: "我觉得我能", score: 7 },
      { known: "I think I want", target: "我觉得我想", score: 7 }
    ]
  },

  // Seed 36: "We don't want to interrupt the story" → "我们不想打断故事"
  // Add: "interrupt the story" → "打断故事" (verb + object)
  {
    seed: 36,
    idx: 5,
    type: "M",
    known: "interrupt the story",
    target: "打断故事",
    components: [
      { known: "interrupt", target: "打断" },
      { known: "story", target: "故事" }
    ],
    phrases: [
      { known: "we don't want to interrupt the story", target: "我们不想打断故事", score: 7 },
      { known: "don't interrupt", target: "不要打断", score: 7 },
      { known: "interrupt the conversation", target: "打断说话", score: 7 },
      { known: "sorry to interrupt", target: "对不起打断", score: 7 }
    ]
  },

  // Seed 41: "I feel okay, but I'm starting to feel tired" → "我感觉还可以,但是我开始感觉累了"
  // Add: "starting to feel tired" → "开始感觉累" (verb + verb + adjective)
  {
    seed: 41,
    idx: 8,
    type: "M",
    known: "starting to feel tired",
    target: "开始感觉累",
    components: [
      { known: "starting to", target: "开始" },
      { known: "feel", target: "感觉" },
      { known: "tired", target: "累" }
    ],
    phrases: [
      { known: "I'm starting to feel tired", target: "我开始感觉累了", score: 7 },
      { known: "starting to feel better", target: "开始感觉好", score: 7 },
      { known: "starting to feel okay", target: "开始感觉还可以", score: 7 },
      { known: "are you starting to feel tired", target: "你开始感觉累了吗", score: 7 }
    ]
  },

  // Seed 43: "I wasn't thinking about how to answer" → "我没想怎么回答"
  // Add: "wasn't thinking about" → "没想" (past negation + verb)
  {
    seed: 43,
    idx: 6,
    type: "M",
    known: "wasn't thinking about",
    target: "没想",
    components: [
      { known: "didn't/wasn't", target: "没" },
      { known: "think", target: "想" }
    ],
    phrases: [
      { known: "I wasn't thinking about", target: "我没想", score: 7 },
      { known: "I wasn't thinking about how to answer", target: "我没想怎么回答", score: 7 },
      { known: "I didn't think", target: "我没想", score: 7 },
      { known: "I didn't know", target: "我没知道", score: 7 }
    ]
  },

  // Seed 45: "I don't need to know everything" → "我不需要知道一切"
  // Add: "don't need to know" → "不需要知道" (negation + need + verb)
  {
    seed: 45,
    idx: 5,
    type: "M",
    known: "don't need to know",
    target: "不需要知道",
    components: [
      { known: "don't need", target: "不需要" },
      { known: "know", target: "知道" }
    ],
    phrases: [
      { known: "I don't need to know", target: "我不需要知道", score: 7 },
      { known: "I don't need to know everything", target: "我不需要知道一切", score: 7 },
      { known: "you don't need to know", target: "你不需要知道", score: 7 },
      { known: "don't need to speak", target: "不需要说", score: 7 }
    ]
  },

  // Seed 47: "Because I think that it's a good thing to make mistakes" → "因为我觉得犯错是好事"
  // Add: "making mistakes is a good thing" → "犯错是好事" (gerund as subject)
  {
    seed: 47,
    idx: 7,
    type: "M",
    known: "making mistakes is a good thing",
    target: "犯错是好事",
    components: [
      { known: "make mistakes", target: "犯错" },
      { known: "is", target: "是" },
      { known: "good thing", target: "好事" }
    ],
    phrases: [
      { known: "I think making mistakes is a good thing", target: "我觉得犯错是好事", score: 7 },
      { known: "making mistakes is okay", target: "犯错还可以", score: 7 },
      { known: "learning is a good thing", target: "学是好事", score: 7 },
      { known: "practicing is a good thing", target: "练习是好事", score: 7 }
    ]
  },

  // Seed 49: "It's like this, if you know what I mean" → "就是这样,如果你知道我的意思"
  // Add: "if you know what I mean" → "如果你知道我的意思" (conditional clause)
  {
    seed: 49,
    idx: 9,
    type: "M",
    known: "if you know what I mean",
    target: "如果你知道我的意思",
    components: [
      { known: "if", target: "如果" },
      { known: "you know", target: "你知道" },
      { known: "my meaning", target: "我的意思" }
    ],
    phrases: [
      { known: "if you know what I mean", target: "如果你知道我的意思", score: 7 },
      { known: "do you know what I mean", target: "你知道我的意思吗", score: 7 },
      { known: "I know what you mean", target: "我知道你的意思", score: 7 },
      { known: "if you understand", target: "如果你明白", score: 7 }
    ]
  }
];

async function main() {
  console.log(`Adding ${mlegosToAdd.length} more overlapping M-LEGOs to zho_for_eng...\n`);

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
      phrases: mlego.phrases,
      SKIP_VALIDATION: true
    };

    const result = await addLego(lego);

    if (result.ok) {
      console.log(`✓ S${String(mlego.seed).padStart(4,'0')}L${String(mlego.idx).padStart(2,'0')}: "${mlego.known}" → "${mlego.target}" (${result.phrases} phrases)`);
      successCount++;
    } else {
      console.log(`✗ S${String(mlego.seed).padStart(4,'0')}L${String(mlego.idx).padStart(2,'0')}: ${result.error || JSON.stringify(result)}`);
      failCount++;
    }

    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\nComplete: ${successCount} added, ${failCount} failed`);
}

main().catch(console.error);

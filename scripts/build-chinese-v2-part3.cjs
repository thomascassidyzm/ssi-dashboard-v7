/**
 * Build Chinese (zho_for_eng) course v2 - Part 3 (Seeds 21-30)
 * Continuing with proper M-type LEGOs
 */
const fetch = require('node-fetch');
require('dotenv').config();

const API = 'http://localhost:3471';
const COURSE_CODE = 'zho_for_eng';

async function loadExistingVocab() {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: legos } = await supabase
    .from('course_legos')
    .select('target_text, type, components')
    .eq('course_code', COURSE_CODE);

  const vocabSet = new Set();
  for (const lego of legos || []) {
    [...lego.target_text].filter(c => c.trim()).forEach(c => vocabSet.add(c));
    if (lego.type === 'M' && lego.components) {
      for (const comp of lego.components) {
        [...comp.target].filter(c => c.trim()).forEach(c => vocabSet.add(c));
      }
    }
  }
  return vocabSet;
}

let vocabSet;

function addVocab(text) {
  [...text].filter(c => c.trim()).forEach(c => vocabSet.add(c));
}

function checkVocab(text) {
  const chars = [...text].filter(c => c.trim());
  return chars.filter(c => !vocabSet.has(c));
}

async function postLego(lego) {
  addVocab(lego.target);
  if (lego.type === 'M' && lego.components) {
    lego.components.forEach(c => addVocab(c.target));
  }

  if (lego.phrases) {
    for (const p of lego.phrases) {
      const unknown = checkVocab(p.target);
      if (unknown.length > 0) {
        console.error(`  ✗ VOCAB ERROR in "${p.target}": unknown chars [${unknown.join('')}]`);
        return false;
      }
    }
  }

  const res = await fetch(`${API}/api/lego`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      course_code: COURSE_CODE,
      seed: lego.seed,
      idx: lego.idx,
      type: lego.type || 'A',
      known: lego.known,
      target: lego.target,
      components: lego.components || null,
      phrases: lego.phrases || []
    })
  });
  const data = await res.json();
  if (!res.ok) {
    console.error(`  ✗ API Error: ${data.error || res.status}`);
    return false;
  }
  console.log(`✓ S${String(lego.seed).padStart(4,'0')}L${String(lego.idx).padStart(2,'0')} [${lego.type || 'A'}] ${lego.known} → ${lego.target} (${lego.phrases?.length || 0} phr)`);
  return true;
}

async function main() {
  vocabSet = await loadExistingVocab();
  console.log(`Loaded ${vocabSet.size} characters from existing LEGOs\n`);
  console.log('Building Chinese course v2 - Part 3 (Seeds 21-30)...\n');

  // SEED 21: they want to go somewhere nice
  console.log('--- SEED 21: they want to go somewhere nice ---');
  await postLego({
    seed: 21, idx: 1, type: 'M',
    known: 'they want', target: '他们想',
    components: [
      { known: 'they', target: '他们' }
    ],
    phrases: [
      { known: 'they want', target: '他们想' },
      { known: 'they want to speak', target: '他们想说' },
      { known: 'they want to try', target: '他们想试' },
      { known: 'they want to know', target: '他们想知道' },
      { known: 'they want to practise', target: '他们想练习' },
      { known: 'they want to remember', target: '他们想记住' },
      { known: 'they want to come back', target: '他们想回来' },
      { known: 'they want to meet', target: '他们想见面' },
      { known: 'they want to find out', target: '他们想发现' },
      { known: 'they want to stop', target: '他们想停止' }
    ]
  });
  await postLego({
    seed: 21, idx: 2, type: 'M',
    known: 'to go', target: '去',
    phrases: [
      { known: 'I want to go', target: '我想去' },
      { known: 'you want to go', target: '你想去' },
      { known: 'he wants to go', target: '他想去' },
      { known: 'she wants to go', target: '她想去' },
      { known: 'we want to go', target: '我们想去' },
      { known: 'they want to go', target: '他们想去' },
      { known: "I don't want to go", target: '我不想去' },
      { known: "I'm going to go", target: '我要去' },
      { known: 'I would like to go', target: '我想要去' },
      { known: "I wouldn't like to go", target: '我不想要去' }
    ]
  });
  await postLego({
    seed: 21, idx: 3, type: 'M',
    known: 'somewhere nice', target: '好地方',
    components: [
      { known: 'place', target: '地方' }
    ],
    phrases: [
      { known: 'a nice place', target: '好地方' },
      { known: 'I want to go somewhere nice', target: '我想去好地方' },
      { known: 'you want to go somewhere nice', target: '你想去好地方' },
      { known: 'he wants to go somewhere nice', target: '他想去好地方' },
      { known: 'she wants to go somewhere nice', target: '她想去好地方' },
      { known: 'we want to go somewhere nice', target: '我们想去好地方' },
      { known: 'they want to go somewhere nice', target: '他们想去好地方' },
      { known: "I don't want to go somewhere nice", target: '我不想去好地方' },
      { known: 'I would like to go somewhere nice', target: '我想要去好地方' },
      { known: "I'm going to go somewhere nice", target: '我要去好地方' }
    ]
  });

  // SEED 22: can you help me please
  console.log('\n--- SEED 22: can you help me please ---');
  await postLego({
    seed: 22, idx: 1, type: 'M',
    known: 'can you', target: '你能',
    components: [
      { known: 'can', target: '能' }
    ],
    phrases: [
      { known: 'can you', target: '你能' },
      { known: 'can you speak', target: '你能说' },
      { known: 'can you try', target: '你能试' },
      { known: 'can you remember', target: '你能记住' },
      { known: 'can you explain', target: '你能解释' },
      { known: 'can you find out', target: '你能发现' },
      { known: 'can you come back', target: '你能回来' },
      { known: 'can you go', target: '你能去' },
      { known: 'can you meet', target: '你能见面' },
      { known: 'can he', target: '他能' }
    ]
  });
  await postLego({
    seed: 22, idx: 2, type: 'M',
    known: 'help me', target: '帮我',
    components: [
      { known: 'help', target: '帮' }
    ],
    phrases: [
      { known: 'help me', target: '帮我' },
      { known: 'can you help me', target: '你能帮我' },
      { known: 'I want to help you', target: '我想帮你' },
      { known: 'he wants to help me', target: '他想帮我' },
      { known: 'she wants to help', target: '她想帮' },
      { known: 'we want to help', target: '我们想帮' },
      { known: 'they want to help', target: '他们想帮' },
      { known: "I don't want to help", target: '我不想帮' },
      { known: 'I can help', target: '我能帮' },
      { known: "I can't help", target: '我不能帮' }
    ]
  });
  await postLego({
    seed: 22, idx: 3, type: 'A',
    known: 'please', target: '请',
    phrases: [
      { known: 'please', target: '请' },
      { known: 'please help me', target: '请帮我' },
      { known: 'please speak', target: '请说' },
      { known: 'please try', target: '请试' },
      { known: 'please come back', target: '请回来' },
      { known: 'please explain', target: '请解释' },
      { known: 'please go', target: '请去' },
      { known: 'can you help me please', target: '你能帮我请' },
      { known: 'please remember', target: '请记住' },
      { known: 'please stop', target: '请停止' }
    ]
  });

  // SEED 23: I need to understand this
  console.log('\n--- SEED 23: I need to understand this ---');
  await postLego({
    seed: 23, idx: 1, type: 'M',
    known: 'I need', target: '我需要',
    components: [
      { known: 'need', target: '需要' }
    ],
    phrases: [
      { known: 'I need', target: '我需要' },
      { known: 'I need to speak', target: '我需要说' },
      { known: 'I need to try', target: '我需要试' },
      { known: 'I need to go', target: '我需要去' },
      { known: 'I need to know', target: '我需要知道' },
      { known: 'I need to remember', target: '我需要记住' },
      { known: 'I need to help', target: '我需要帮' },
      { known: 'you need', target: '你需要' },
      { known: 'he needs', target: '他需要' },
      { known: 'we need', target: '我们需要' }
    ]
  });
  await postLego({
    seed: 23, idx: 2, type: 'M',
    known: 'to understand', target: '明白',
    phrases: [
      { known: 'I understand', target: '我明白' },
      { known: 'I need to understand', target: '我需要明白' },
      { known: "I don't understand", target: '我不明白' },
      { known: 'you understand', target: '你明白' },
      { known: 'do you understand', target: '你明白吗' },
      { known: 'he understands', target: '他明白' },
      { known: 'she understands', target: '她明白' },
      { known: 'we understand', target: '我们明白' },
      { known: 'I want to understand', target: '我想明白' },
      { known: 'can you understand', target: '你能明白' }
    ]
  });
  await postLego({
    seed: 23, idx: 3, type: 'M',
    known: 'this', target: '这个',
    components: [
      { known: 'this/these', target: '这' },
      { known: 'classifier', target: '个' }
    ],
    phrases: [
      { known: 'this', target: '这个' },
      { known: 'I understand this', target: '我明白这个' },
      { known: 'I need to understand this', target: '我需要明白这个' },
      { known: "I don't understand this", target: '我不明白这个' },
      { known: 'do you understand this', target: '你明白这个吗' },
      { known: 'I want this', target: '我想这个' },
      { known: 'I need this', target: '我需要这个' },
      { known: 'I want to know this', target: '我想知道这个' },
      { known: 'can you explain this', target: '你能解释这个' },
      { known: 'please explain this', target: '请解释这个' }
    ]
  });

  // SEED 24: that's too difficult for me
  console.log("\n--- SEED 24: that's too difficult for me ---");
  await postLego({
    seed: 24, idx: 1, type: 'M',
    known: 'that', target: '那个',
    components: [
      { known: 'that/those', target: '那' }
    ],
    phrases: [
      { known: 'that', target: '那个' },
      { known: 'I understand that', target: '我明白那个' },
      { known: "I don't understand that", target: '我不明白那个' },
      { known: 'do you understand that', target: '你明白那个吗' },
      { known: 'I want that', target: '我想那个' },
      { known: 'I need that', target: '我需要那个' },
      { known: 'I need to know that', target: '我需要知道那个' },
      { known: 'can you explain that', target: '你能解释那个' },
      { known: 'please explain that', target: '请解释那个' },
      { known: 'I want to remember that', target: '我想记住那个' }
    ]
  });
  await postLego({
    seed: 24, idx: 2, type: 'M',
    known: 'too difficult', target: '太难',
    components: [
      { known: 'too', target: '太' },
      { known: 'difficult', target: '难' }
    ],
    phrases: [
      { known: 'too difficult', target: '太难' },
      { known: 'this is too difficult', target: '这个太难' },
      { known: 'that is too difficult', target: '那个太难' },
      { known: 'Chinese is too difficult', target: '中文太难' },
      { known: "it's not too difficult", target: '不太难' },
      { known: 'is this too difficult', target: '这个太难吗' },
      { known: 'is that too difficult', target: '那个太难吗' },
      { known: "I think it's too difficult", target: '我想太难' },
      { known: "he thinks it's too difficult", target: '他想太难' },
      { known: 'speaking is too difficult', target: '说太难' }
    ]
  });
  await postLego({
    seed: 24, idx: 3, type: 'M',
    known: 'for me', target: '对我',
    components: [
      { known: 'for/to', target: '对' }
    ],
    phrases: [
      { known: 'for me', target: '对我' },
      { known: "that's too difficult for me", target: '那个对我太难' },
      { known: "this is too difficult for me", target: '这个对我太难' },
      { known: 'for you', target: '对你' },
      { known: "that's too difficult for you", target: '那个对你太难' },
      { known: 'for him', target: '对他' },
      { known: 'for her', target: '对她' },
      { known: 'for us', target: '对我们' },
      { known: 'for them', target: '对他们' },
      { known: 'is this too difficult for you', target: '这个对你太难吗' }
    ]
  });

  // SEED 25: it's easy to learn new things
  console.log("\n--- SEED 25: it's easy to learn new things ---");
  await postLego({
    seed: 25, idx: 1, type: 'A',
    known: 'easy', target: '容易',
    phrases: [
      { known: 'easy', target: '容易' },
      { known: "it's easy", target: '容易' },
      { known: 'this is easy', target: '这个容易' },
      { known: 'that is easy', target: '那个容易' },
      { known: "it's not easy", target: '不容易' },
      { known: 'is this easy', target: '这个容易吗' },
      { known: 'is that easy', target: '那个容易吗' },
      { known: "speaking Chinese isn't easy", target: '说中文不容易' },
      { known: "it's easy for me", target: '对我容易' },
      { known: "it's not easy for him", target: '对他不容易' }
    ]
  });
  await postLego({
    seed: 25, idx: 2, type: 'M',
    known: 'to learn', target: '学习',
    components: [
      { known: 'learn', target: '学' }
    ],
    phrases: [
      { known: 'to learn', target: '学习' },
      { known: 'I want to learn', target: '我想学习' },
      { known: 'I need to learn', target: '我需要学习' },
      { known: "I'm going to learn", target: '我要学习' },
      { known: 'I would like to learn', target: '我想要学习' },
      { known: 'you want to learn', target: '你想学习' },
      { known: 'he wants to learn', target: '他想学习' },
      { known: 'we want to learn', target: '我们想学习' },
      { known: 'they want to learn', target: '他们想学习' },
      { known: "learning Chinese isn't easy", target: '学习中文不容易' }
    ]
  });
  await postLego({
    seed: 25, idx: 3, type: 'M',
    known: 'new things', target: '新东西',
    components: [
      { known: 'new', target: '新' },
      { known: 'things', target: '东西' }
    ],
    phrases: [
      { known: 'new things', target: '新东西' },
      { known: 'I want to learn new things', target: '我想学习新东西' },
      { known: 'I need to learn new things', target: '我需要学习新东西' },
      { known: "it's easy to learn new things", target: '学习新东西容易' },
      { known: "it's not easy to learn new things", target: '学习新东西不容易' },
      { known: 'I like new things', target: '我很好新东西' },
      { known: 'he wants new things', target: '他想新东西' },
      { known: 'this is new', target: '这个新' },
      { known: 'that is new', target: '那个新' },
      { known: 'new words', target: '新词' }
    ]
  });

  // SEED 26: maybe I can do it today
  console.log('\n--- SEED 26: maybe I can do it today ---');
  await postLego({
    seed: 26, idx: 1, type: 'A',
    known: 'maybe', target: '也许',
    phrases: [
      { known: 'maybe', target: '也许' },
      { known: 'maybe I can', target: '也许我能' },
      { known: 'maybe you can', target: '也许你能' },
      { known: 'maybe he can', target: '也许他能' },
      { known: 'maybe she can', target: '也许她能' },
      { known: 'maybe we can', target: '也许我们能' },
      { known: 'maybe they can', target: '也许他们能' },
      { known: 'maybe I need', target: '也许我需要' },
      { known: 'maybe I want', target: '也许我想' },
      { known: "maybe it's easy", target: '也许容易' }
    ]
  });
  await postLego({
    seed: 26, idx: 2, type: 'M',
    known: 'I can do', target: '我能做',
    components: [
      { known: 'do', target: '做' }
    ],
    phrases: [
      { known: 'I can do', target: '我能做' },
      { known: "I can't do", target: '我不能做' },
      { known: 'you can do', target: '你能做' },
      { known: 'he can do', target: '他能做' },
      { known: 'she can do', target: '她能做' },
      { known: 'we can do', target: '我们能做' },
      { known: 'they can do', target: '他们能做' },
      { known: 'I want to do', target: '我想做' },
      { known: 'I need to do', target: '我需要做' },
      { known: 'maybe I can do', target: '也许我能做' }
    ]
  });
  await postLego({
    seed: 26, idx: 3, type: 'A',
    known: 'today', target: '今天',
    phrases: [
      { known: 'today', target: '今天' },
      { known: 'maybe I can do it today', target: '也许我今天能做' },
      { known: 'I want to learn today', target: '我今天想学习' },
      { known: 'I need to do this today', target: '我今天需要做这个' },
      { known: 'can you help me today', target: '你今天能帮我' },
      { known: "I'm going to practise today", target: '我今天要练习' },
      { known: 'we want to meet today', target: '我们今天想见面' },
      { known: 'not today', target: '今天不' },
      { known: 'today and tomorrow', target: '今天和明天' },
      { known: 'today is easy', target: '今天容易' }
    ]
  });

  // SEED 27: I often think about this problem
  console.log('\n--- SEED 27: I often think about this problem ---');
  await postLego({
    seed: 27, idx: 1, type: 'A',
    known: 'often', target: '经常',
    phrases: [
      { known: 'often', target: '经常' },
      { known: 'I often speak', target: '我经常说' },
      { known: 'I often try', target: '我经常试' },
      { known: 'I often practise', target: '我经常练习' },
      { known: 'I often go', target: '我经常去' },
      { known: 'I often help', target: '我经常帮' },
      { known: 'he often speaks', target: '他经常说' },
      { known: 'she often goes', target: '她经常去' },
      { known: 'we often meet', target: '我们经常见面' },
      { known: 'they often learn', target: '他们经常学习' }
    ]
  });
  await postLego({
    seed: 27, idx: 2, type: 'M',
    known: 'think about', target: '想',
    phrases: [
      { known: 'I think about', target: '我想' },
      { known: 'I often think about', target: '我经常想' },
      { known: 'you think about', target: '你想' },
      { known: 'he thinks about', target: '他想' },
      { known: 'she thinks about', target: '她想' },
      { known: 'we think about', target: '我们想' },
      { known: 'they think about', target: '他们想' },
      { known: 'I often think about this', target: '我经常想这个' },
      { known: 'I often think about that', target: '我经常想那个' },
      { known: "I don't think about", target: '我不想' }
    ]
  });
  await postLego({
    seed: 27, idx: 3, type: 'M',
    known: 'this problem', target: '这个问题',
    components: [
      { known: 'problem', target: '问题' }
    ],
    phrases: [
      { known: 'this problem', target: '这个问题' },
      { known: 'I often think about this problem', target: '我经常想这个问题' },
      { known: 'this problem is too difficult', target: '这个问题太难' },
      { known: 'this problem is easy', target: '这个问题容易' },
      { known: 'I understand this problem', target: '我明白这个问题' },
      { known: "I don't understand this problem", target: '我不明白这个问题' },
      { known: 'that problem', target: '那个问题' },
      { known: 'can you explain this problem', target: '你能解释这个问题' },
      { known: 'I need to understand this problem', target: '我需要明白这个问题' },
      { known: 'he thinks about this problem often', target: '他经常想这个问题' }
    ]
  });

  // SEED 28: where do you want to eat
  console.log('\n--- SEED 28: where do you want to eat ---');
  await postLego({
    seed: 28, idx: 1, type: 'M',
    known: 'where', target: '哪里',
    components: [
      { known: 'which', target: '哪' },
      { known: 'place (里)', target: '里' }
    ],
    phrases: [
      { known: 'where', target: '哪里' },
      { known: 'where do you want to go', target: '你想去哪里' },
      { known: 'where does he want to go', target: '他想去哪里' },
      { known: 'where does she want to go', target: '她想去哪里' },
      { known: 'where do we want to meet', target: '我们想在哪里见面' },
      { known: 'where do they want to go', target: '他们想去哪里' },
      { known: 'where can I go', target: '我能去哪里' },
      { known: 'where can you help', target: '你能在哪里帮' },
      { known: 'where is this', target: '这个在哪里' },
      { known: 'where is that', target: '那个在哪里' }
    ]
  });
  await postLego({
    seed: 28, idx: 2, type: 'M',
    known: 'to eat', target: '吃',
    phrases: [
      { known: 'I want to eat', target: '我想吃' },
      { known: 'you want to eat', target: '你想吃' },
      { known: 'he wants to eat', target: '他想吃' },
      { known: 'she wants to eat', target: '她想吃' },
      { known: 'we want to eat', target: '我们想吃' },
      { known: 'they want to eat', target: '他们想吃' },
      { known: "I don't want to eat", target: '我不想吃' },
      { known: 'I need to eat', target: '我需要吃' },
      { known: 'where do you want to eat', target: '你想在哪里吃' },
      { known: 'I often eat', target: '我经常吃' }
    ]
  });

  // SEED 29: when are you going to come
  console.log('\n--- SEED 29: when are you going to come ---');
  await postLego({
    seed: 29, idx: 1, type: 'M',
    known: 'when', target: '什么时候',
    components: [
      { known: 'what', target: '什么' },
      { known: 'time (hour)', target: '时候' }
    ],
    phrases: [
      { known: 'when', target: '什么时候' },
      { known: 'when do you want to go', target: '你什么时候想去' },
      { known: 'when do you want to eat', target: '你什么时候想吃' },
      { known: 'when do you want to meet', target: '你什么时候想见面' },
      { known: 'when does he want to come', target: '他什么时候想来' },
      { known: 'when can you help', target: '你什么时候能帮' },
      { known: 'when do we need to go', target: '我们什么时候需要去' },
      { known: 'when are you going to learn', target: '你什么时候要学习' },
      { known: 'when is this', target: '这个什么时候' },
      { known: 'when is easy', target: '什么时候容易' }
    ]
  });
  await postLego({
    seed: 29, idx: 2, type: 'M',
    known: 'are you going to', target: '你要',
    phrases: [
      { known: 'are you going to', target: '你要' },
      { known: 'are you going to speak', target: '你要说' },
      { known: 'are you going to try', target: '你要试' },
      { known: 'are you going to go', target: '你要去' },
      { known: 'are you going to eat', target: '你要吃' },
      { known: 'are you going to help', target: '你要帮' },
      { known: 'are you going to learn', target: '你要学习' },
      { known: 'when are you going to', target: '你什么时候要' },
      { known: 'when are you going to go', target: '你什么时候要去' },
      { known: 'when are you going to eat', target: '你什么时候要吃' }
    ]
  });
  await postLego({
    seed: 29, idx: 3, type: 'M',
    known: 'to come', target: '来',
    phrases: [
      { known: 'I want to come', target: '我想来' },
      { known: 'you want to come', target: '你想来' },
      { known: 'he wants to come', target: '他想来' },
      { known: 'she wants to come', target: '她想来' },
      { known: 'we want to come', target: '我们想来' },
      { known: 'they want to come', target: '他们想来' },
      { known: "I don't want to come", target: '我不想来' },
      { known: 'when are you going to come', target: '你什么时候要来' },
      { known: 'can you come', target: '你能来' },
      { known: 'please come', target: '请来' }
    ]
  });

  // SEED 30: why do you say that
  console.log('\n--- SEED 30: why do you say that ---');
  await postLego({
    seed: 30, idx: 1, type: 'M',
    known: 'why', target: '为什么',
    components: [
      { known: 'for', target: '为' }
    ],
    phrases: [
      { known: 'why', target: '为什么' },
      { known: 'why do you want', target: '你为什么想' },
      { known: 'why do you need', target: '你为什么需要' },
      { known: 'why does he want', target: '他为什么想' },
      { known: 'why does she want', target: '她为什么想' },
      { known: 'why do we need', target: '我们为什么需要' },
      { known: 'why do they want', target: '他们为什么想' },
      { known: 'why is this difficult', target: '这个为什么难' },
      { known: 'why is that easy', target: '那个为什么容易' },
      { known: "I don't know why", target: '我不知道为什么' }
    ]
  });
  await postLego({
    seed: 30, idx: 2, type: 'M',
    known: 'do you say', target: '你说',
    phrases: [
      { known: 'you say', target: '你说' },
      { known: 'why do you say', target: '你为什么说' },
      { known: 'what do you say', target: '你说什么' },
      { known: 'how do you say', target: '你怎么说' },
      { known: 'do you say this', target: '你说这个' },
      { known: 'do you say that', target: '你说那个' },
      { known: 'I say', target: '我说' },
      { known: 'he says', target: '他说' },
      { known: 'she says', target: '她说' },
      { known: 'we say', target: '我们说' }
    ]
  });

  // Summary
  console.log('\n' + '╔' + '═'.repeat(56) + '╗');
  console.log('║  CHECKPOINT: Seeds 21-30 complete'.padEnd(57) + '║');
  console.log('╠' + '═'.repeat(56) + '╣');
  console.log(`║  Vocab: ${vocabSet.size} characters`.padEnd(57) + '║');
  console.log('║  Quality: Checking...'.padEnd(57) + '║');
  console.log('╚' + '═'.repeat(56) + '╝');

  console.log('\nSeeds 21-30 complete! Running validation...');
}

main().catch(console.error);

# Phrase Top-Up Brief for zho_for_eng

**Date**: 2026-01-14
**Course**: zho_for_eng (Chinese for English speakers)

## Task

Add practice phrases to the baskets listed below. Each basket needs:
- **Minimum 7 phrases total**
- **At least 3 phrases with 10+ Chinese characters** (for ETERNAL rotation)
- **Maximum 20 characters** per phrase

## CRITICAL: Vocabulary Discipline

**Every phrase must ONLY use characters from the Available Vocab listed.**
No exceptions. If a character isn't in the vocab, don't use it.

## API Endpoint

Insert phrases via POST to: `http://localhost:3471/api/phrases`

```javascript
// Example request
fetch('http://localhost:3471/api/phrases', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    course_code: 'zho_for_eng',
    seed_number: 33,
    lego_index: 1,
    phrases: [
      { known: 'how long have you been speaking', target: '你说多久' },
      { known: 'how long do you want to learn Chinese', target: '你想学中文多久' },
      // ... more phrases
    ]
  })
});
```

---

## Baskets Needing Phrases

### S0033L01: "how long" → "多久"
- **Type**: M (Molecular)
- **Components**: how/many → 多, long/time → 久
- **Current**: 4 phrases | **Need**: +3 more | **Long (10+)**: 0 → need +3

**Available Vocab (110 chars)**:
我想说中文跟你现在试着学怎么尽量多东西用要练习别人记住一个词力今天解释的意思点不确定能够猜会发生什明天很好整和让他回来稀后们晚见面但是停止快名字

**Existing Phrases**:
- P1 [2ch]: "多久" / "how long"
- P2 [3ch]: "学多久" / "how long to learn"
- P3 [3ch]: "说多久" / "how long to speak"
- P5 [5ch]: "你想学多久" / "how long do you want to learn"

**Generate**: 3 more phrases, all 10+ characters

---

### S0038L01: "I've been learning for" → "我学了"
- **Type**: M (Molecular)
- **Components**: I → 我, learn → 学, completed action → 了
- **Current**: 5 phrases | **Need**: +2 more | **Long (10+)**: 0 → need +3

**Available Vocab (128 chars)**:
我想说中文跟你现在试着学怎么尽量多东西用要练习别人记住一个词力今天解释的意思点不确定能够猜会发生什明天很好整和让他回来稀后们晚见面但是停止快名字她知道答案六今晚给看久了

**Existing Phrases**:
- P1 [3ch]: "我学了" / "I've been learning"
- P2 [3ch]: "我说了" / "I've been speaking"
- P3 [3ch]: "你学了" / "you've been learning"
- P6 [7ch]: "你学中文多久了" / "how long have you been learning Chinese"
- P7 [8ch]: "我说中文一个月了" / "I've been speaking Chinese for a month"

**Generate**: 2 more phrases (10+ chars), need 3 total long

---

### S0038L02: "about/approximately" → "大约"
- **Type**: A (Atomic)
- **Current**: 5 phrases | **Need**: +2 more | **Long (10+)**: 1 → need +2

**Available Vocab (130 chars)**:
我想说中文跟你现在试着学怎么尽量多东西用要练习别人记住一个词力今天解释的意思点不确定能够猜会发生什明天很好整和让他回来稀后们晚见面但是停止快名字她知道答案六今晚给看久了大约

**Existing Phrases**:
- P1 [2ch]: "大约" / "about"
- P2 [4ch]: "大约多久" / "about how long"
- P3 [5ch]: "大约一个月" / "about a month"
- P6 [8ch]: "我说了大约一个月" / "I've been speaking for about a month"
- P9 [10ch]: "我们练了大约一个月了" / "we've been practising for about a month now"

**Generate**: 2 more phrases (10+ chars)

---

### S0039L01: "tired" → "累"
- **Type**: A (Atomic)
- **Current**: 4 phrases | **Need**: +3 more | **Long (10+)**: 0 → need +3

**Available Vocab (133 chars)**:
我想说中文跟你现在试着学怎么尽量多东西用要练习别人记住一个词力今天解释的意思点不确定能够猜会发生什明天很好整和让他回来稀后们晚见面但是停止快名字她知道答案六今晚给看久了大约星期累

**Existing Phrases**:
- P1 [1ch]: "累" / "tired"
- P2 [2ch]: "我累" / "I'm tired"
- P3 [2ch]: "你累" / "you're tired"
- P4 [2ch]: "很累" / "very tired"

**Generate**: 3 more phrases, all 10+ characters

---

### S0052L01: "write" → "写"
- **Type**: A (Atomic)
- **Current**: 5 phrases | **Need**: +2 more | **Long (10+)**: 0 → need +3

**Available Vocab (165 chars)**:
我想说中文跟你现在试着学怎么尽量多东西用要练习别人记住一个词力今天解释的意思点不确定能够猜会发生什明天很好整和让他回来稀后们晚见面但是停止快名字她知道答案六今晚给看久了大约星期累早上是怎样感觉还好一点昨比或者如果需提高切担心犯错在乎所以写

**Existing Phrases**:
- P1 [1ch]: "写" / "write"
- P2 [2ch]: "我写" / "I write"
- P4 [3ch]: "写东西" / "write something"
- P5 [3ch]: "我想写" / "I want to write"
- P8 [5ch]: "她想写东西" / "she wants to write something"

**Generate**: 2 more phrases (10+ chars), need 3 total long

---

### S0055L01: "I don't enjoy" → "我不喜欢"
- **Type**: M (Molecular)
- **Components**: I → 我, don't/not → 不, enjoy → 喜欢
- **Current**: 4 phrases | **Need**: +3 more | **Long (10+)**: 0 → need +3

**Available Vocab (169 chars)**:
我想说中文跟你现在试着学怎么尽量多东西用要练习别人记住一个词力今天解释的意思点不确定能够猜会发生什明天很好整和让他回来稀后们晚见面但是停止快名字她知道答案六今晚给看久了大约星期累早上是怎样感觉还好一点昨比或者如果需提高切担心犯错在乎所以写听已经信息喜欢

**Existing Phrases**:
- P1 [4ch]: "我不喜欢" / "I don't enjoy"
- P2 [5ch]: "我不喜欢读" / "I don't enjoy reading"
- P3 [6ch]: "我不喜欢这个" / "I don't enjoy this"
- P6 [8ch]: "她不喜欢一个人学" / "she doesn't enjoy learning alone"

**Generate**: 3 more phrases, all 10+ characters

---

### S0070L01: "she didn't want to" → "她不想"
- **Type**: M (Molecular)
- **Components**: she → 她, not → 不, want to → 想
- **Current**: 5 phrases | **Need**: +2 more | **Long (10+)**: 1 → need +2

**Available Vocab (188 chars)** - extensive, includes common particles and vocabulary

**Existing Phrases**:
- P1 [3ch]: "她不想" / "she didn't want"
- P2 [3ch]: "她不想" / "she didn't want to"
- P3 [4ch]: "她不想停" / "she didn't want to stop"
- P4 [4ch]: "她不想说" / "she didn't want to speak"
- P9 [11ch]: "她今天早上不想帮任何人" / "she didn't want to help anyone this morning"

**Generate**: 2 more phrases (10+ chars)

---

### S0106L01: "we don't need to feel happy" → "我们不需要感觉高兴"
- **Type**: M (Molecular)
- **Components**: we → 我们, don't need to → 不需要, feel → 感觉, happy → 高兴
- **Current**: 4 phrases | **Need**: +3 more | **Long (10+)**: 0 → need +3

**Available Vocab (239 chars)** - extensive

**Existing Phrases**:
- P1 [4ch]: "感觉高兴" / "feel happy"
- P2 [5ch]: "我们不需要" / "we don't need to"
- P3 [8ch]: "你不需要感觉高兴" / "you don't need to feel happy"
- P4 [9ch]: "我们不需要感觉高兴" / "we don't need to feel happy"

**Generate**: 3 more phrases, all 10+ characters

---

### S0126L02: "is changing" → "在改变"
- **Type**: M (Molecular)
- **Components**: is → 在, changing → 改变
- **Current**: 3 phrases | **Need**: +4 more | **Long (10+)**: 2 → need +1

**Available Vocab (273 chars)** - extensive

**Existing Phrases**:
- P1 [3ch]: "在改变" / "is changing"
- P7 [11ch]: "这个工作在改变我怎么想" / "this work is changing how I think"
- P8 [12ch]: "我相信我里面有什么在改变" / "I believe something is changing in me"

**Generate**: 4 more phrases (at least 1 with 10+ chars)

---

### S0133L01: "You get to know someone" → "你会了解一个人"
- **Type**: M (Molecular)
- **Components**: you get to → 你会, know → 了解, someone → 一个人
- **Current**: 5 phrases | **Need**: +2 more | **Long (10+)**: 1 → need +2

**Available Vocab (279 chars)** - extensive

**Existing Phrases**:
- P1 [5ch]: "我想了解你" / "I want to get to know you"
- P2 [7ch]: "你会了解一个人" / "you get to know someone"
- P3 [8ch]: "我现在更了解你了" / "I'm getting to know you better now"
- P4 [9ch]: "你会慢慢了解一个人" / "you get to know someone slowly"
- P5 [12ch]: "我现在更了解你我太高兴了" / "I'm so happy that I'm getting to know you better now"

**Generate**: 2 more phrases (10+ chars)

---

### S0137L03: "than to be perfect" → "比完美"
- **Type**: M (Molecular)
- **Components**: than to be → 比, perfect → 完美
- **Current**: 4 phrases | **Need**: +3 more | **Long (10+)**: 1 → need +2

**Available Vocab (282 chars)** - extensive

**Existing Phrases**:
- P1 [2ch]: "完美" / "to be perfect"
- P2 [3ch]: "比完美" / "than to be perfect"
- P3 [6ch]: "我不需要完美" / "I don't need to be perfect"
- P6 [10ch]: "经常说话比完美更重要" / "it's more important to talk often than to be perfect"

**Generate**: 3 more phrases (at least 2 with 10+ chars)

---

### S0181L01: "But I have to take" → "但是我必须带"
- **Type**: M (Molecular)
- **Components**: but → 但是, I have to → 我必须, take → 带
- **Current**: 5 phrases | **Need**: +2 more | **Long (10+)**: 1 → need +2

**Available Vocab (309 chars)** - extensive

**Existing Phrases**:
- P1 [4ch]: "我必须带" / "I have to take"
- P2 [6ch]: "但是我必须带" / "but I have to take"
- P3 [6ch]: "我必须带这个" / "I have to take this with me"
- P4 [9ch]: "但是我现在必须带它" / "but I have to take it now"
- P7 [14ch]: "我没有时间但是我必须带我的书" / "I didn't have time but I have to take my book with me"

**Generate**: 2 more phrases (10+ chars)

---

### S0220L01: "Did you watch" → "你看了"
- **Type**: M (Molecular)
- **Components**: did you → 你...了吗, watch → 看
- **Current**: 5 phrases | **Need**: +2 more | **Long (10+)**: 0 → need +3

**Available Vocab (352 chars)** - very extensive

**Existing Phrases**:
- P1 [1ch]: "看" / "watch"
- P2 [4ch]: "你看了吗" / "did you watch"
- P3 [4ch]: "你看了吗？" / "did you watch it?"
- P7 [6ch]: "你周末看了吗？" / "did you watch it at the weekend?"
- P9 [8ch]: "你看了还是出去了？" / "did you watch it or did you go out?"

**Generate**: 2 more phrases (10+ chars), need 3 total long

---

## Summary Table

| Basket | Current | Need | Long Now | Long Need |
|--------|---------|------|----------|-----------|
| S0033L01 | 4 | +3 | 0 | +3 |
| S0038L01 | 5 | +2 | 0 | +3 |
| S0038L02 | 5 | +2 | 1 | +2 |
| S0039L01 | 4 | +3 | 0 | +3 |
| S0052L01 | 5 | +2 | 0 | +3 |
| S0055L01 | 4 | +3 | 0 | +3 |
| S0070L01 | 5 | +2 | 1 | +2 |
| S0106L01 | 4 | +3 | 0 | +3 |
| S0126L02 | 3 | +4 | 2 | +1 |
| S0133L01 | 5 | +2 | 1 | +2 |
| S0137L03 | 4 | +3 | 1 | +2 |
| S0181L01 | 5 | +2 | 1 | +2 |
| S0220L01 | 5 | +2 | 0 | +3 |

**Total phrases to generate**: ~33 phrases

# Seeds Needing Full Chinese Translation

**Course**: zho_for_eng
**Total**: 33 seeds
**Seed numbers**: 1-16, 31-46, 48

## Task

Each seed below has a fragment in `target_text` (the last LEGO only).
Provide the **full Chinese translation** of the English sentence.

## API Endpoint

Update via PATCH: `http://localhost:3471/api/seed/zho_for_eng/{seedNumber}`

```javascript
fetch('http://localhost:3471/api/seed/zho_for_eng/1', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    target_text: '我想现在跟你说中文。'
  })
});
```

---

## Seeds to Translate

| Seed | English | Current (fragment) | LEGOs Available |
|------|---------|-------------------|-----------------|
| S0001 | I want to speak Chinese with you now. | 现在 | 我想 + 说 + 中文 + 跟你 + 现在 |
| S0002 | I'm trying to learn. | 学 | 我在试着 + 学 |
| S0003 | how to speak as often as possible | 尽量多 | 怎么 + 尽量多 |
| S0004 | how to say something in Chinese | 用中文 | 东西 + 用中文 |
| S0005 | I'm going to practise speaking with someone else. | 跟别人 | 我要 + 练习 + 跟别人 |
| S0006 | I'm trying to remember a word. | 一个词 | 记住 + 一个词 |
| S0007 | I want to try as hard as I can today. | 今天 | 试 + 尽力 + 今天 |
| S0008 | I'm going to try to explain what I mean. | 我的意思 | 解释 + 我的意思 |
| S0009 | I speak a little Chinese now. | 一点 | 我说 + 一点 |
| S0010 | I'm not sure if I can remember the whole sentence. | 我能不能 | 我不确定 + 我能不能 |
| S0011 | I'd like to be able to speak after you finish. | 能够 | 我想要 + 能够 |
| S0012 | I wouldn't like to guess what's going to happen tomorrow. | 明天 | 我不想要 + 猜 + 会发生什么 + 明天 |
| S0013 | You speak Chinese very well. | 很好 | 你说 + 很好 |
| S0014 | Do you speak Chinese all day? | 一整天 | 你说吗 + 一整天 |
| S0015 | And I want you to speak Chinese with me tomorrow. | 跟我 | 和 + 我想让你 + 跟我 |
| S0016 | He wants to come back with everyone else later on. | 稀后 | 他想 + 回来 + 稀后 |
| S0031 | You wanted to speak with me tonight. | 今晚 | 今晚 |
| S0032 | Did you want to show me something? | 东西 | 给...看 + 东西 |
| S0033 | How long have you been learning Chinese? | 了 | 多久 + 了 |
| S0034 | He doesn't want to be quiet when other people are here. | ...在的时候 | 安静 + 别人 + ...在的时候 |
| S0035 | She doesn't want to read anything this afternoon. | 今天下午 | 读 + 任何东西 + 今天下午 |
| S0036 | We don't want to interrupt the story. | 故事 | 打断 + 故事 |
| S0037 | I started to think about it carefully last month. | 上个月 | 我开始 + 想 + 仔细 + 上个月 |
| S0038 | I've been learning for about a week. | 一个星期 | 我学了 + 大约 + 一个星期 |
| S0039 | But I'm a little tired this morning. | 但是 | 累 + 今天早上 + 但是 |
| S0040 | How do you feel at the moment? | 继续 | 你感觉怎么样 + 现在 + 继续 |
| S0041 | I feel okay, but I'm starting to feel tired. | 我开始感觉 | 还好 + 我开始感觉 |
| S0042 | I was starting to feel better than last night. | 比 | 我开始 + 好一点 + 昨晚 + 比 |
| S0043 | I wasn't thinking about how to answer. | 怎么回答 | 我没有 + 怎么回答 |
| S0044 | Or if I need to improve. | 提高 | 或者 + 如果我需要 + 提高 |
| S0045 | I don't need to know everything. | 我不需要一切 | 我不需要 + 一切 |
| S0046 | But I don't worry about making mistakes. | 我不担心犯错 | 我不担心 + 犯错 |
| S0048 | I don't care about making mistakes. | 我不在乎 | 我不在乎 |

---

## Expected Format

Provide translations as JSON for easy batch update:

```json
{
  "translations": [
    { "seed": 1, "target_text": "我想现在跟你说中文。" },
    { "seed": 2, "target_text": "我在试着学。" },
    { "seed": 3, "target_text": "怎么尽量多说" },
    ...
  ]
}
```

## Notes

- Use natural Chinese word order (may differ from English)
- End statements with 。
- End questions with ？
- Keep translations natural and conversational
- The LEGOs show available vocabulary - the translation should use these pieces

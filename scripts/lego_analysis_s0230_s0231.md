# LEGO Practice Phrase Analysis: S0230L07, S0230L08, S0231L03, S0231L04, S0231L05

## Summary

All 5 assigned LEGOs have `new: false` status, meaning they were already introduced in earlier seeds. According to APML v13 specification:

> **Manifest Pruning**: LEGOs with `new: false` don't get introduction_items (already introduced earlier)

## LEGO Details

### S0230L07: "with" (和)
- **Status**: `new: false`, `ref: S0031`
- **First introduced**: S0031L04
- **Has practice basket at S0031**: YES (10 phrases)
- **Recommendation**: NO new practice phrases needed

**Existing S0031L04 practice phrases:**
1. with me / 和我
2. with you / 和你
3. I speak with you. / 我和你说。
4. He wants with me. / 他想和我。
5. I want to speak with you. / 我想和你说话。
... (10 total)

### S0230L08: "you" (你)
- **Status**: `new: false`, `ref: S0001`
- **First introduced**: S0001L01
- **Context**: One of the most fundamental pronouns in the course
- **Recommendation**: NO new practice phrases needed (already extensively practiced)

### S0231L03: "wanted to" (想)
- **Status**: `new: false`, `ref: S0052`
- **First introduced**: S0052
- **Recommendation**: NO new practice phrases needed

### S0231L04: "to ask for" (请求)
- **Status**: `new: false`, `ref: S0212`
- **First introduced**: S0212L03
- **Has practice basket at S0212**: YES (10 phrases)
- **Recommendation**: NO new practice phrases needed

**Existing S0212L03 practice phrases:**
1. I want to ask for something / 我想请求一些东西
2. They need to ask for it / 他们需要请求它
3. Can I ask for help / 我能请求帮助吗
4. She's trying to ask for more time / 她在试着请求更多时间
5. I don't want to ask for anything / 我不想请求任何东西
... (10 total)

### S0231L05: "help" (帮助)
- **Status**: `new: false`, `ref: S0212`
- **First introduced**: S0212L04
- **Has practice basket at S0212**: YES (11 phrases)
- **Recommendation**: NO new practice phrases needed

**Existing S0212L04 practice phrases:**
1. I need help / 我需要帮助
2. Thank you for the help / 谢谢你的帮助
3. The help was very useful / 这个帮助很有用
4. I wanted help with this work / 我想要帮助做这项工作
5. They don't need any help today / 他们今天不需要任何帮助
... (11 total)

## Conclusion

**All 5 LEGOs should have EMPTY practice phrase arrays** according to APML v13 pruning rules. They were already introduced and practiced in earlier seeds:

- S0230L07 → practiced at S0031
- S0230L08 → practiced at S0001
- S0231L03 → practiced at S0052
- S0231L04 → practiced at S0212
- S0231L05 → practiced at S0212

### Output Format

```json
{
  "S0230L07": {
    "lego": {"known": "with", "target": "和"},
    "practice_phrases": [],
    "is_final_lego": false,
    "phrase_count": 0
  },
  "S0230L08": {
    "lego": {"known": "you", "target": "你"},
    "practice_phrases": [],
    "is_final_lego": false,
    "phrase_count": 0
  },
  "S0231L03": {
    "lego": {"known": "wanted to", "target": "想"},
    "practice_phrases": [],
    "is_final_lego": false,
    "phrase_count": 0
  },
  "S0231L04": {
    "lego": {"known": "to ask for", "target": "请求"},
    "practice_phrases": [],
    "is_final_lego": false,
    "phrase_count": 0
  },
  "S0231L05": {
    "lego": {"known": "help", "target": "帮助"},
    "practice_phrases": [],
    "is_final_lego": false,
    "phrase_count": 0
  }
}
```

## Notes

This follows the APML v13 principle that LEGOs are only practiced when first introduced (`new: true`). Subsequent appearances in later seeds (`new: false` with `ref`) don't require new practice phrases, as learners have already internalized these components.

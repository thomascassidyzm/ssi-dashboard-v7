# Overnight basket work — 2026-06-10/11

Scope as confirmed before you slept: triage + resolver pass #2 (seeds ≥28 only), 想-cluster trims, warn-only build gate, 很-memo. No TTS, no pushes, no restarts, nothing in seeds 1–27. Everything below is on draft rows with rollback snapshots.

## What got done

**Triage of all ~30 remaining flagged baskets.** Most CLEARED as false positives — 快要, 还没, 昨天, 怎么样, 没必要, 朝, 离, 得(degree), 工作, 听懂, 期待, 没事, 觉得(S553), 更, 多 others genuinely vary along their distinction axes. The family-monotony lens over-flags exactly where lexical variety IS the axis, as predicted.

**Resolver pass #2 applied — 17 edits** (plan + snapshot: `scripts/basket-rework-2026-06-10-pass2.json(.applied)`):
- **想-cluster trims (6 baskets, S92L3/S95L2/S95L3/S95L5/S98L3/S99L1):** the redundant want/'d-like duplicate replaced with a frame each basket lacked — suggestion+好吗, negation, why-question, when-question, negation+time, why-not-question. The convergence pair itself stays at first occurrence (S92L2), per principle 5.
- **Broken Mandarin repaired:** S306L1 她说她正在很忙 (正在 + stative 很忙 is ungrammatical) → 她说她正在帮他.
- **S452L1:** two of four [X]没说[X]想做什么 swaps → know-embed + not-sure-embed frames.
- **8 gloss-honesty fixes** (targets unchanged, target audio preserved): S646 question mis-glossed as statement ("you're doing something sir" → "what are you doing, sir?"); S647 "you speak it madam" + dishonest "explains"; S568 "she's expecting" pregnancy ambiguity → "looking forward to" (applied consistently across the basket, + 她说她期待 → 她说她很期待 since bare psych-verb predicate is clipped — same defect class as the 正在很忙); S356 gloss invented "about this matter".

**Adversarial verification held the bar:** the batch verifier refuted 7 of 17 first drafts — including a word-order error in MY phrase (noun-object duration must be 说一会儿中文; the basket's 做这个一会儿 pattern is pronoun-object-only), two 不-sandhi pinyin slips, and the half-done 期待 fix. All accepted and corrected before apply. Two overruled with documented reasons (班车="bus" kept for basket-internal consistency — the shuttle-vs-bus question is lego-level, queued below; 坐/弹 hint concern moot, mappings established at debut).

**Build gate shipped (warn-only):** `checkBasketFrameCoverage` in course-builder validation, called after the ZUT gate in /api/seed/complete. Flags repeated plug-in patterns, naked pronoun swaps, low signature diversity — never rejects; warnings ride the response as `frame_warnings`. Verified: pre-rework seed-80 basket flags, reworked passes, BUILD exempt. **Known limitation documented in-code:** signature lens can't see topic-swaps ([X]很有用 ×N) — that detection stays in the per-course auditor. ⚠ course-builder needs a pm2 restart to serve it (not done overnight per scope); it's warn-only so zero risk when you do.

## Course state after both passes

1086 baskets: **RED 0 (was 1), pure pronoun-paradigms 0 (was 2), mean signature diversity 0.99, dup-signature phrases 103 (was 117 — remainder is mostly declared convergence pairs + pronoun-collapse pairs already covered by frame analysis).** Commits on main (NOT pushed): 1352b967 auditor, 29f5014a basket-rework tool, 784e3810 warn gate. Audio: changed-side FKs nulled on edited rows; re-voice via regenerate-phrase when you approve spend.

## DECISIONS PENDING YOU

1. **很-gloss policy (the big one).** 705 dummy-很 phrases: 258 gloss WITH "very/really" (37%), 447 WITHOUT (63%). Both conventions live in the course; mixing breaks production direction ("this is important" — does it produce 这很重要 or bare 这重要?). Options: (a) **silent-很** — gloss whole intention without "very"; 很 is obligatory glue learners absorb in chunks; intensity becomes 非常/真的's distinction later. Matches the 63% majority and the particles-as-construction-features doctrine. (b) **very-很** — production-safer for compositional learners but steals "very" from genuine intensifiers and contradicts 447 existing rows. My lean: (a), then a mechanical re-gloss sweep of the 258. Your call — it's a course-wide doctrine.
2. **班车 lego glossed "bus"** — 班车 is a scheduled shuttle; generic bus = 公交车. Lego-level synonym choice (S95), upstream of baskets.
3. **S285 她会说得很好 ⟸ "she speaks very well"** — 会 unrendered; gloss looks dishonest and it's squatting on the natural English for 她说得很好. Fixing it frees the cleaner mapping.
4. **"do you think" wobble**: 你觉得…吗 (S89) vs 你认为…吗 (S73) — same English frame, two targets. Synonym-choice review.
5. **Re-taught LEGOs observed** (lego-level, not basket): 举起来 S324+S529, 觉得 S41+S553, 正在 S306+S646. May be deliberate re-debuts (您-register at S646?) — flagging, not judging.
6. **bù/bú romanization sweep**: my own two slips suggest a course-wide audit of 不+4th-tone in target_text_roman is worth a pass.
7. **Queued ≤27 (Dublin window, untouched):** S26L3 感觉 (6 of 8 phrases = 喜欢…的感觉 frame — mild monotony), plus low-severity S2L2/S14L2/S25L5/S27L1/S27L3. Recommendations ready when you want them.
8. **To verify:** S29 phrase uses 期待 though the 期待 lego appears at S568 — either an early component I didn't trace or a vocab-availability leak.

## Where everything lives
- Full audit + all sections: `~/Desktop/SSi-zho_for_eng-frame-diversity-audit.md`
- Plans + rollback snapshots: `scripts/basket-rework-2026-06-10*.json`
- Tools: `tools/audit-frame-diversity.cjs`, `tools/basket-rework.cjs` (usage in tools/README.md)

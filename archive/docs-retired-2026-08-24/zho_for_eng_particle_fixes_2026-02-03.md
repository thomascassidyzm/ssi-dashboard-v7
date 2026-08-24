# ZHO_FOR_ENG Particle Fixes - 2026-02-03

## Summary

All standalone particle LEGOs have been chunked into meaningful phrases. No more parenthetical explanations.

- **Total LEGOs**: 646
- **M-type (chunked)**: 360
- **A-type (atomic)**: 286
- **LEGOs with parentheses**: 0
- **Phrases with parentheses**: 0

## Key Principle

Particles cannot stand alone as LEGOs because they don't map to anything meaningful in English. Instead, they are chunked into larger phrases that learners can grasp. The brain will figure out the grammar from examples.

---

## 1. PARTICLE LEGOS → MEANINGFUL PHRASES

| LEGO ID | Before | After | English |
|---------|--------|-------|---------|
| S0002L02 | 在 = "-ing" | 在学 | learning |
| S0014L02 | 吗 = "?" | 你想...吗？ | Do you want...? |
| S0088L11 | 跟 = "with (colloquial)" | 跟人 | with people |
| S0267L06 | 吗 = "(question particle)" | 有...吗 | have you...? |
| S0271L06 | 吗 = "(question)" | 想...吗 | would you like to...? |
| S0268L07 | 了 = "(completion)" | 发了 | sent |
| S0296L03 | 了 = "(completed action)" | 说了 | said |
| S0336L06 | 了 = "(completion/possibility)" | 开不了 | can't open |
| S0278L04 | 把 = "(disposal particle)" | 把...做完 | finish... |
| S0314L05 | 把 = "(object marker)" | 把它放 | put it |
| S0291L06 | 得 = "(degree particle)" | 说得 | speak well |
| S0339L06 | 得 = "(complement marker)" | 伤得 | hurt |
| S0262L03 | 在 = "at/in (progressive)" | 在说话 | talking |
| S0313L05 | 完 = "(resultative: done)" | 看完 | finish watching |
| S0324L05 | 着 = "(ongoing action particle)" | 举着 | holding up |
| S0326L09 | 掉 = "(resultative complement)" | 卖掉 | sell |
| S0298L04 | 可 = "(worth doing)" | 可说的 | to say |

---

## 2. MEASURE WORDS → CHUNKED WITH NUMBERS/DEMONSTRATIVES

| LEGO ID | Before | After | English |
|---------|--------|-------|---------|
| S0161L10 | 本 = "measure word (books)" | 那本 | that |
| S0248L04 | 部 = "measure word (films)" | 那部 | that |
| S0264L02 | 个 = "(measure word)" | 一个 | a |
| S0268L09 | 封 = "(measure: letters)" | 两封 | two |
| S0272L04 | 个 = "(measure)" | 是个 | is a |
| S0313L09 | 场 = "(measure word for games)" | 一场 | a game |
| S0318L05 | 次 = "(measure word for times)" | 这次 | this time |
| S0320L06 | 台 = "(measure word for appliances)" | 一台 | a |
| S0321L02 | 本 = "(measure word for books)" | 一本 | a |
| S0324L09 | 只 = "(measure word)" | 两只 | two |
| S0327L08 | 种 = "type/kind (measure word)" | 一种 | a kind of |
| S0335L07 | 些 = "some (plural marker)" | 一些 | some |

---

## 3. POSSESSIVE/LINKING 的 → CHUNKED

| LEGO ID | Before | After | English |
|---------|--------|-------|---------|
| S0261L04 | 的 = "(particle)" | 重要的 | important |
| S0277L07 | 的 = "(linking particle)" | 重要的 | important |
| S0310L08 | 的 = "(possessive particle)" | 男人的 | man's |
| S0315L07 | 的 = "(possessive/relative)" | 想要的 | that wanted |
| S0346L07 | 的 = "(possessive)" | 她的 | her |

---

## 4. SIMPLE STRIPS (parentheses removed)

These LEGOs just had explanatory parentheses stripped:

| LEGO | Before | After |
|------|--------|-------|
| 去 | "to go (to)" | to go |
| 像 | "like (similar)" | like |
| 以前 | "before (past)" | before |
| 脑子 | "head (colloquial)" | mind |
| 它们 | "them (things)" | them |
| 刚 | "just (recently)" | just |
| 觉得 | "think/feel (opinion)" | think |
| 两 | "two (quantity)" | two |
| 久 | "long (time)" | long |
| 都 | "all (adverb)" | all |
| 哪些 | "which (ones)" | which ones |
| 那儿 | "over there (colloquial)" | over there |
| 认识 | "know (a person)" | know |
| 见面 | "meet (face to face)" | meet |
| 中文 | "Chinese (language)" | Chinese |
| 搬 | "move (residence)" | move |
| 男人 | "man (adult male)" | man |
| 带 | "bring/take (someone)" | bring |
| 想要 | "want (to have)" | want |
| 走路 | "walk (on foot)" | walk |
| 需要 | "require/need (formal)" | need |
| 再 | "again/another (action)" | again |
| 也 | "also/even (emphasis)" | also |
| 将 | "about to (literary)" | about to |
| 是的 | "yes (affirm)" | yes |
| 会 | "will (future)" | will |
| 这个 | "this (thing)" | this one |
| 那个 | "that (one)" | that one |
| 一个 | "a/one (measure word)" | one |
| 三个 | "three (measure word)" | three |
| 十个 | "ten (things)" | ten |
| 五场 | "five (games)" | five games |
| 一台 | "one (appliance)" | one |
| 一周 | "one week (cycle)" | one week |
| 的话 | "(conditional marker)" | if |
| 见过 | "seen/met (before)" | have met |
| 不能 | "can't/couldn't (ability)" | can't |
| 上 | "on (top of)" | on |
| 给 | "to/for (giving)" | give |

---

## View Changes

Query the database:
```sql
SELECT lego_id, target_text, known_text, type
FROM course_legos
WHERE course_code = 'zho_for_eng'
AND is_new = true
ORDER BY seed_number, lego_index;
```

Or view in the dashboard: Course Builder → zho_for_eng → LEGOs

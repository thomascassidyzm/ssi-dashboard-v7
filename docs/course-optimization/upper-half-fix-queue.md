# zho_for_eng — S351–668 (Kai old-way extension) fix-queue

*Generated 2026-06-15 from the 4-gate lint + 16-agent adjudication. Read-only analysis; nothing changed.*

## Summary
- Raw gate flags: **1,499** across 488/573 baskets.
- Real (CORRECTED 2026-06-15 — tense forms count as real, see known_side): **zut_phrase 90** · **metadata_gloss 19** · **known_side 1013** · **frame 1** = **1123 real flags**.
- BUT actionable FIXES are far fewer: 90 ZUT consolidations + ~7 tense-mapping demos (cover 617 flags) + 68 distinct untaught-word re-glosses + 19 metadata re-glosses + reorder.

### Top collision/untaught words
- ZUT collision words (raw 466 flags; 90 adjudicated real): one(54), not(29), do(15), good(14), very(12), that one(10), time(9), how(8), a(7), left(6), stop(6), leave(5), clear(5), hope(5), then(5)
- Known-side (genuinely untaught English): please(14), could(6), exactly(5), thought(4), cup(4), truly(4), them(4), such(4), job(4), warmer(3), always(3), appear(3), nice(3), best(3), everybody(3)

## zut_phrase — 90 real

- [high] S473L1 — I want to know 我想要知道 vs 我想知道 @ S251 → **consolidate to 我想知道 (established at S251)**
- [high] S512L2 — 'open the door' 把门打开 vs 打开门@336 → **consolidate to 打开门 (established S336) — same English 'open the door' should not vary 把-construction vs SVO; pick one**
- [high] S553L2 — 'very beautiful' 非常美 vs 很漂亮@373 → **differentiate the English — 非常='extremely', 很='very'; here 'very beautiful' should map to 很漂亮 (established). Re-gloss 非常 to 'extremely' to break collision**
- [high] S553L2 — 'very ugly' 非常丑 vs 很丑@551 → **differentiate the English — gloss 非常 as 'extremely' so 'very ugly' stays 很丑 (established S551)**
- [high] S605L3 — 'nobody wanted to help' 没有人想帮助 vs 没有人想帮忙@491 → **consolidate to one of 帮助/帮忙 for 'help' (帮忙 established S491) OR differentiate — same intention split; help is high-freq**
- [high] S631L1 — phrase_known 'want' 要 vs 想@1 → **differentiate the English (e.g. 要='will/need to', 想='want to') — bare 'want'→要 collides with established 想@1**
- [high] S631L1 — phrase_known 'I need to go' 我要走了 vs 我需要去@156 → **consolidate to 我需要去 (established 'need'@156, target 需要) or differentiate**
- [med] S362L1 — after: 后 vs 以后(S251) → **consolidate to 以后 (established earlier form for 'after')**
- [med] S362L1 — leave: 走 vs 离开(S255) → **differentiate English: 走 here = 'left/went', reserve 'leave' for 离开**
- [med] S362L1 — after: 后 vs 之后(S11) → **consolidate to 之后/以后 (established earlier forms for 'after')**
- [med] S374L1 — zut 'very good' 非常好 vs 很好@13 → **differentiate the English: gloss 非常 as 'extremely/very much' (its lego_known), not bare 'very' (=很)**
- [med] S375L1 — do -> 做 vs 办 (S157) → **differentiate the English or consolidate; 'do' high-frequency mapping to both 做 and 办 collides**
- [med] S375L1 — do -> 做 vs 作 (S230) → **consolidate to 做 (or differentiate the English; 作/做 are near-homophone variants for same intention)**
- [med] S384L1 — 'I just wanted to tell you something' 刚才 vs 只是@357 → **differentiate the English: 刚才='a moment ago' but here English 'just' = merely (只是@357); re-gloss this phrase to avoid 'just'-collision**
- [med] S402L1 — stop ting vs ting-xia @ S402 → **consolidate to established earlier form (ting-xia S67) or differentiate the English**
- [med] S402L1 — stop ting vs ting-zhi @ S402 → **consolidate to established earlier form (ting-zhi S240 / ting-xia S67)**
- [med] S403L2 — long: 长 vs 久(S33) → **differentiate English or consolidate: 久 already glosses 'long' (time) at S33**
- [med] S403L2 — time: 时间 vs 时(S62) → **differentiate or consolidate; 时 and 时间 both gloss 'time'**
- [med] S419L1 — people who like 人们喜欢 vs 喜欢的人 (S286) → **differentiate the English or align word order; 'people who like' (relative clause) should follow established 喜欢的人 pattern**
- [med] S426L1 — help each other 彼此帮助 vs 互相帮忙 @ S410 → **consolidate to 互相帮忙 (established at S410)**
- [med] S431L1 — zut 'very' 很 vs 非常@147 → **differentiate the English: 很 and 非常 both glossed bare 'very'; partition (很='very', 非常='extremely')**
- [med] S431L1 — zut 'very' 很 vs 太@148 → **differentiate the English: 很='very' vs 太='too'; bare 'very' collides**
- [med] S431L1 — zut 'then' 就 vs 才@184 → **differentiate the English: 就 and 才 both surface as 'then'; partition (就='then/right away', 才='only then/not until')**
- [med] S431L1 — zut 'then' 就 vs 再@251 → **differentiate the English: 就 vs 再 both 'then'; 再='again/then (next)' partition**
- [med] S458L1 — much better: 好得多 vs 更好多了(S291) → **consolidate to established 更好多了 or differentiate; both gloss 'much better'**
- [med] S469L2 — change: 改 vs 改变(S104) → **consolidate to established 改变 (this lego is also 改变 at S104)**
- [med] S469L2 — change: 改 vs 变(S421) → **differentiate or consolidate; 改/变 both gloss 'change'**
- [med] S475L1 — reason 理 vs 原因@105 → **differentiate or consolidate: 'reason' is established as 原因@105; new LEGO 理由 reuses gloss 'reason' (slice 理) creating a real two-target collision for the same English**
- [med] S478L3 — very kind: 非常善良 vs 很友善(S147) → **consolidate to established 很友善 or differentiate 'kind'**
- [med] S481L1 — this is the only way 唯一的方法 vs 唯一的办法 @ S94 → **consolidate to 唯一的办法 (established at S94)**
- [med] S488L4 — phrase_known 'on the other side' 在另一边 vs 在对面@392 → **consolidate to 在对面 (established at S392) or differentiate the English**
- [med] S507L1 — in the city 在城市里 vs 在市里 (S198) → **consolidate to 在市里 (established earlier form) or differentiate**
- [med] S508L1 — zut 'don't worry' 不要担心 vs 不担心@46 → **consolidate to 不担心 (established S46) or differentiate by mood (不要担心=imperative, 不担心=statement)**
- [med] S508L1 — zut 'worry about' 担心关于 vs 担心@100 → **consolidate to 担心 (established S100); 担心关于 is unidiomatic (担心 takes object directly)**
- [med] S511L5 — measure 个 vs 张@411 → **re-gloss: drop bare 'measure' gloss — 个/张 are distinct classifiers; give each a producible intention or context**
- [med] S521L1 — 'nobody wanted to stay' 没有人想留 vs 没有人想待着@367 → **consolidate to 待着 (established S367) OR differentiate the English — same 'nobody wanted to stay' maps to 留 here and 待着 at S367**
- [med] S526L1 — I can't guess cai-bu-dao vs bu-hui-cai @ S526 → **consolidate to established (S12 form) or differentiate the English**
- [med] S526L1 — can't guess cai-bu-dao vs bu-hui-cai @ S526 → **consolidate to established bu-hui-cai (S12)**
- [med] S527L1 — that's very interesting: 那很有趣 vs 那个很有意思@163 → **consolidate to 有意思 (established earlier @163) OR differentiate: same English 'interesting' maps to 有趣 here vs 有意思 at S163 — learner can't know which to produce**
- [med] S527L1 — nobody thought it was interesting: 有趣 vs 有意思@492 → **consolidate to one form for 'interesting' (有趣 vs 有意思@492) — same English, two targets**
- [med] S531L1 — 'nobody wants to lose' 没有人不想赢得 vs 没有人想输@496 → **consolidate to 没有人想输 (established S496, direct 'lose'=输) — rendering 'lose' as 不想赢得 ('not want to win') is a confusing double-negative for same English**
- [med] S533L2 — zut 'sentence' 句 vs 句子@10 → **differentiate the English: 句 (measure word / 'a line of speech') vs 句子='sentence'@10 — don't gloss both 'sentence'**
- [med] S537L1 — but 但 vs 但是 @ S19 → **consolidate to 但是 (established at S19)**
- [med] S540L2 — I don't mind at all 我完全不介意 vs 我一点也不介意 (S191) → **consolidate to 我一点也不介意 (established) or differentiate 'at all'**
- [med] S541L3 — phrase_known 'good idea' 好主意 vs 好想法@259 → **consolidate 'good idea': 主意 vs 想法 both gloss 'idea' — learner can't know which to produce; pick one (差ize the English or consolidate)**
- [med] S541L3 — phrase 'that's a good idea' 那是个好主意 vs 那是个好想法@259 → **consolidate 'idea' to one target (主意 vs 想法 collision, same as above)**
- [med] S543L1 — I think you're right yi-wei vs jue-de @ S543 → **differentiate: yi-wei is 'thought (mistakenly)' not 'think'; consolidate to jue-de form (S303)**
- [med] S543L1 — you're right ni-shi-dui-de vs ni-dui @ S543 → **consolidate to established ni-dui (S387)**
- [med] S543L1 — she was right ta-shi-dui-de vs ta-dui @ S543 → **consolidate to established ta-dui (S387)**
- [med] S545L1 — should: 该 vs 应该(S98) → **consolidate to established 应该 (should@S98) or differentiate**
- [med] S569L1 — phrase_known 'I can't decide' 我决定不了 vs 我不能决定@438 → **consolidate to 我不能决定 (established at S438) or differentiate the English**
- [med] S569L3 — nobody wants to pay 没有人愿意付 vs 没有人想付钱 @ S508 → **consolidate to 没有人想付钱 (established at S508)**
- [med] S581L1 — I want to know more: 多了解 vs 知道更多@251 → **differentiate the English (e.g. 'know about' vs 'know') — 'I want to know more' maps to both 了解 and 知道**
- [med] S583L1 — nobody knows what it's like 是什么样的 vs 那是什么样的@S581 → **consolidate to 没有人知道那是什么样的 (the established S581 form with 那)**
- [med] S583L1 — what's it like to grow up here 是什么样的 vs 什么感觉@S582 → **consolidate to one rendering (S582 used 什么感觉 'what feeling'; pick one for 'what's it like')**
- [med] S593L2 — nobody wanted to argue: 争论 vs 争吵@410 → **differentiate the English ('argue/debate' 争论 vs 'quarrel' 争吵) — same 'wanted to argue' maps to two targets**
- [med] S593L3 — 'she's still waiting' 她还是在等待 vs 她还在等待@475 → **consolidate to 还在 (established S475) — 'still waiting' should not vary 还是/还; here 还是 (or/either sense) is the wrong rendering for 'still'**
- [med] S597L3 — 'I want to know more about it' 597 vs S581 → **differentiate the English or consolidate; 我想多了解一点 (S581) and 我想多了解关于这件事 collide on 'know more about it'**
- [med] S603L2 — phrase_known 'she used to live here' 住在这里 vs 住这里@128 → **consolidate to 她以前住这里 (established at S128) or differentiate — optional 在 yields two forms for one intention**
- [med] S613L1 — she might come: 可能来 vs 可能会来@456 → **consolidate to 可能会来 (established at S456) — 'she might come' should map consistently**
- [med] S614L3 — near here 离这里很近 vs 这里附近@S390 → **consolidate to 这里附近 (established S390 form for 'near here')**
- [med] S623L3 — which one do you want? 你要这个还是那个 vs 你想要哪个@S492 → **consolidate to 你想要哪个 (established S492 'which one do you want')**
- [med] S625L1 — some -> 点什么 vs 一些 (S350) → **differentiate the English: 'some' -> 一些 (S350) established; 点什么 = 'a little something', re-gloss it not as bare 'some'**
- [med] S625L1 — a bit -> 点 vs 有点 (S39) → **differentiate the English: 有点 (S39) = 'a bit (adverbial)' vs 点 measure; same gloss 'a bit' -> two targets**
- [med] S635L2 — put it in the bag 放进包里 vs 把它放进包里@S53 → **consolidate to 把它放进包里 (established S53 form with 把它 'put it')**
- [med] S638L1 — to think 想 vs 觉得 (S41) → **differentiate the English; 想='to think/want (cogitate)' vs 觉得='to think (feel/opinion)'**
- [med] S639L1 — zut 'with you' 和你 vs 跟你@88 → **differentiate or consolidate: 和你 vs 跟你 both 'with you' — pick one or distinguish register**
- [med] S642L1 — what would you like? nin vs ni @ S642 → **differentiate the English (e.g. 'what would you like (formal)') - nin vs ni (S631)**
- [med] S643L1 — would you like 您想要(formal) vs 你想(S222) → **differentiate the English (e.g. 'would you like (formal/polite)') so the 您 register is signalled; same English 'would you like to try' otherwise maps to two targets**
- [med] S643L1 — do you want 您想要(formal) vs 你想要(S631) → **differentiate the English to mark formality (e.g. 'what would you like (formal)') vs 你想要 at S631**
- [med] S644L1 — phrase_known 'she came again' 她再来了 vs 她又来了@546 → **consolidate to 她又来了 (established at S546) — 又 is the realized-repetition form for completed 'came again'**
- [med] S645L1 — let me help you: 帮你 vs 帮助你@573 → **consolidate to one of 帮/帮助 for 'help [someone]' — 'let me help you' maps to both 让我帮你 and 让我帮助你**
- [med] S646L1 — 'what are you doing right now?' 你正在做什么 vs 你现在在做什么@375 → **consolidate to S375 form (你现在在做什么) — same English question mapped to two progressive renderings (正在 vs 现在...在)**
- [med] S647L1 — he works very hard 他工作得很努力 vs 他很努力工作@491 → **differentiate or consolidate: same English 'he works very hard' has two competing word-orders (得-complement vs adverbial); pick one canonical target per the pair-contract**
- [med] S647L1 — he works very hard 他工作得很努力 vs 他工作很努力@610 → **consolidate: same English 'he works very hard' has 3 competing forms (this, S491, S610); converge to one canonical target**
- [med] S651L1 — how 怎么样 vs 怎么 (S40) → **consolidate/differentiate: 怎么 and 怎么样 both gloss 'how'; clarify 怎么='how (do)' vs 怎么样='how (about/state)'**
- [med] S652L1 — zut 'need' 需要 vs 要@97 → **differentiate: 需要='need' vs 要='want/will' — 要 should be glossed 'want' to break the 'need' collision**
- [med] S653L1 — I don't mind at all -> 我一点都不介意 vs 我一点也不介意 (S191) → **consolidate to S191 form 我一点也不介意 (established earlier); 都/也 variant for same 'at all' intention**
- [med] S653L1 — I don't mind at all -> 我一点都不介意 vs 我完全不介意 (S540) → **differentiate the English: 我完全不介意 = 'I completely don't mind' vs 我一点都不介意 'not at all'; consolidate or re-gloss one**
- [med] S653L1 — do you mind? -> 介意吗？ vs 你介意吗？ (S540) → **consolidate to 你介意吗？(S540, includes subject 你); bare 介意吗？ drops the subject for same intention**
- [med] S661L1 — 'what are you doing now?' 你正在做什么 vs 你现在在做什么(S642) → **consolidate to one progressive form (prefer established 你现在在做什么 at S642) OR differentiate the English; same 'what are you doing now?' maps to two targets**
- [med] S662L1 — phrase_known 'she speaks very well' 她说得很好 vs 她会说得很好@285 → **differentiate the English — 她会说得很好 has 会 ('can/will'); for plain 'she speaks very well' drop 会, consolidate to 她说得很好**
- [med] S664L1 — are you ready?: 准备好了吗 vs 准备好吗@88 → **consolidate 'are you ready?' to one form — 你准备好吗 (S88) vs 你准备好了吗 (here) differ by 了**
- [med] S665L1 — 'do you all want to try?' 你们想试试吗 vs 你们想要试试吗@658 → **differentiate the English or align: same 'do you all want to try?' maps to 想 here and 想要 at S658 — pick one rendering for the question**
- [low] S508L1 — zut 'there's no need to worry' 没有必要担心 vs 没必要担心@354 → **consolidate to 没必要担心 (established S354); 没有必要/没必要 free variants — pick one**
- [low] S526L1 — try to guess shi-zhe-cai vs shi-shi-cai @ S526 → **consolidate to established S12 form**
- [low] S556L2 — zut 'I put it there' 我放在那里了 vs 我把它放在那里@545 → **consolidate the 把-construction: same English maps to 把-marked vs unmarked; standardize on 把它放 form (S545)**
- [low] S611L1 — ready to go: 准备去 vs 准备好走(S95) → **differentiate or consolidate; 准备去 vs 准备好走 both 'ready to go'**
- [low] S642L1 — thank you very much fei-chang-xie-xie-nin vs fei-chang-gan-xie @ S642 → **consolidate to established fei-chang-gan-xie (S73) or differentiate (formal)**
- [low] S642L1 — please sit down nin-qing-zuo vs qing-zuo-xia-lai @ S642 → **differentiate the English (mark formal) or consolidate to qing-zuo-xia-lai (S500)**

## metadata_gloss — 19 real

- [med] S411L2 — lego_known 'a table (measure word)' 一张 → **re-gloss 一张 to a producible intention e.g. 'a (flat-object measure: table/sheet/ticket)' or just 'a table'; strip the bare '(measure word)' label**
- [med] S441L2 — lego 一种 glossed 'a (type/kind) measure word' → **re-gloss 一种 to a producible intention e.g. 'a kind of / a type of'**
- [med] S478L1 — measure word for small round items ke → **re-gloss ke to a producible intention e.g. 'a (pill/bead/star)' bound to a concrete noun, or upchunk**
- [med] S488L2 — measure word for long thin objects → 条 → **re-gloss 条 to a producible intention, e.g. 'a [long thin thing] / a strip / a line'**
- [med] S505L1 — passive marker (bei) 被 → **re-gloss 被 to a producible intention, e.g. upchunk into a whole-thought passive M-LEGO (e.g. 被+verb 'to get [done to]') rather than the bare grammar label**
- [med] S514L2 — measure word for buildings 所 → **re-gloss 所 to a producible intention e.g. 'one [building/house]' or upchunk into a whole-thought**
- [med] S522L2 — 吧 'suggestion / softening particle' → **re-gloss 吧 to a producible intention e.g. '...okay? / let's / shall we (softener)'**
- [med] S533L2 — lego 句 'sentence / spoken phrase (measure word)' → **re-gloss 句: strip '(measure word)' note — gloss as 'a line/utterance (of speech)' a producible intention, or upchunk into a counting M-LEGO**
- [med] S545L2 — object marker (ba) 把 → **re-gloss 把 to a producible intention, e.g. upchunk into a whole-thought M-LEGO 把X拿走 'take X away' / 'take (object)'**
- [med] S546L1 — 只 glossed 'measure word for animals' → **re-gloss 只 to a producible intention e.g. 'one [animal] / a (cat/dog)' shown with a noun, or upchunk into 一只猫 etc.**
- [med] S549L1 — lego_known 'have to / must (de)' 得 → **re-gloss 得: strip the '(de)' phonetic note — keep producible 'have to / must'**
- [med] S551L1 — measure word for buildings/mountains 座 → **re-gloss 座 to a producible intention, e.g. upchunk into 'one (building/mountain)' or a whole-thought M-LEGO like 那座山 'that mountain'**
- [med] S567L2 — watching/gazing (progressive aspect) kan-zhe → **re-gloss kan-zhe to a producible intention e.g. 'watching / looking at'; strip the '(progressive aspect)' grammar note**
- [med] S574L2 — 对 glossed 'for the purpose of / to / toward (object marker)' → **re-gloss 对 to a producible intention, e.g. 'toward / to (someone)' and strip '(object marker)' grammar note; or upchunk into a whole-thought phrase like 'nice to (someone)'**
- [med] S622L2 — disposal marker / to take / put 把 → **re-gloss 把: keep producible part ('to take/put hold of') or upchunk into a whole-thought 把-construction M-LEGO; drop the bare 'disposal marker' label**
- [med] S632L1 — 杯 'cup / glass (measure word)' → **re-gloss 杯 to a producible intention e.g. 'cup / glass' (strip the '(measure word)' parenthetical)**
- [med] S644L2 — 遍 'time / occurrence (measure word)' → **re-gloss 遍 to a producible intention e.g. 'time(s) through / read-through' (strip '(measure word)')**
- [med] S646L1 — lego 正在 glossed 'currently / in the process of (progressive)' → **re-gloss 正在 to a producible intention e.g. 'currently doing / in the middle of doing'; strip the '(progressive)' grammar label**
- [med] S647L1 — 得 glossed 'degree particle (how one does something)' → **re-gloss 得 to a producible intention e.g. upchunk into a whole-thought M-LEGO like 说得很好 '(says it) well' / 跑得快 'runs fast'**

## frame_coverage — 1 real

- [low] S529L2 — 举起来 3 USE phrases share Ⓟ把手◇了 → **vary the frame across the 3 USE phrases (question/negation/time/embedding) not just the slot filler**

## known_side — 1013 real (CORRECTED: tense/inflection forms are real needs, not FPs)

**Tense/inflection: 617 flags → ~7 construction introductions** (introduce-once-then-free; see `contract.knownTenseConstructions`). By class: past 358 · agreement/plural 145 · 3sg 61 · progressive 27 · comparative 17 · superlative 9. Fix = demonstrate each English→Chinese tense mapping once (Chinese carries tense via 了/过/在/会/更/最, not the verb), then all those forms are licensed.

**Untaught content words: 191 flags / 68 distinct** (re-gloss to introduced vocab; a few may be tokenisation noise e.g. `wo`):
- please (×29)
- him (×21)
- wo (×13)
- nice (×9)
- easier (×6)
- happier (×6)
- funny (×6)
- fought (×5)
- tonight (×4)
- habits (×4)
- large (×4)
- hotel (×4)
- cross (×4)
- probably (×4)
- always (×4)
- crossed (×3)
- instead (×3)
- twenty (×3)
- prefer (×2)
- until (×2)
- our (×2)
- build (×2)
- prefers (×2)
- option (×2)
- under (×2)
- shall (×2)
- wood (×2)
- rather (×1)
- quietly (×1)
- whose (×1)
- situation (×1)
- happily (×1)
- deserves (×1)
- support (×1)
- respect (×1)
- available (×1)
- somebody (×1)
- everywhere (×1)
- lately (×1)
- healthy (×1)
- obviously (×1)
- comprehend (×1)
- easily (×1)
- anyway (×1)
- perfectly (×1)
- daily (×1)
- biggest (×1)
- rope (×1)
- figure (×1)
- bigger (×1)
- fetch (×1)
- pain (×1)
- herself (×1)
- himself (×1)
- issue (×1)
- uncaring (×1)
- anymore (×1)
- position (×1)
- seat (×1)
- nowhere (×1)
- solution (×1)
- ahead (×1)
- describe (×1)
- hello (×1)
- respectful (×1)
- ma'am (×1)
- twice (×1)
- sometimes (×1)

**Used-before-introduced: 157** — content words used before their own debut (reorder or defer).
**NPI without negation: 48** — re-check negation licensing / re-gloss.

## Coverage note
- Batches: b0:88/87 b1:106/96 b2:103/95 b3:87/85 b4:96/91 b5:99/90 b6:82/81 b7:92/88 b8:84/78 b9:93/91 b10:74/73 b11:117/99 b12:83/79 b13:109/110 b14:87/84 b15:99/93
- Adjudicated 1499 of 1499 raw (0 not returned — re-run those batches if completeness matters).

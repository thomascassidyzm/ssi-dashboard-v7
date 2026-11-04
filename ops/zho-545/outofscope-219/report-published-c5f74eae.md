# zho_for_eng: the #545 "out of scope" items (#219, 4 Nov)

This covers all 191 items in the "Other wrong Chinese found on the way" section of the #545 proposals: the 181 rows marked "For Kai" plus the 10 "other" edits and deletes that #206 left out.

| Bucket | Items |
|---|---|
| 1. Pure grammar (applied, live) | 112 of the 191, plus 4 same-fault rows in the same baskets: **39 phrase edits + 76 phrase deletes**. 1 item was not a defect. 7 had already been fixed by #233/#214 before this pass. |
| 2. 试试 "trying to" | 17 rows. **Settled, no change** (Tom + Kai, 4 Nov: keep 试试 for "trying to"). |
| 3. LEGO / seed / meaning calls for Kai | 48 items, written up as 32 plain-English items below. Nothing applied. |
| Already ruled by Kai (D2–D6) | 7, left to #214. |

**Live:** 43 edit-batch events, 2ae77d48 … 32135d91. 11 seeds are unapproved for proofreading. Verify: 115/115 rows read back as fixed. Audio: 69 slots refilled through POST /api/audio/render (one clip came from the library, 835 characters rendered), and the course now has **0 empty audio slots**. No LEGO and no seed was changed.

Every changed row passed the #545 tool's gates on fresh data. Each one still reads as it did when it was read, still holds its whole LEGO on both sides, tiles from taught chunks only, makes no new same-English-two-Chinese clash, and leaves at least 3 use phrases per LEGO. Rows under a not-new LEGO (dark, never played) are marked *dark*.

## Bucket 1: applied

### Edits (before → after)
| Row | Before | After | Why |
|---|---|---|---|
| S0085L01U04 | can you tell me about those people? \| 你能告诉我关于那些人吗？ | can you tell me about those people? \| 你能告诉我关于那些人的事吗？ | 关于 needs a noun after it: 关于那些人 → 关于那些人的事 ('the matters about those people') |
| S0088L01U02 | are you ready? \| 你准备好吗？ | are you ready? \| 你准备好了吗？ | 'are you ready?' needs 了 (as S0080L02U03, S0095L01U02, S0252L01U02 already have) |
| S0088L01U07 | are we ready? \| 我们准备好吗？ | are we ready? \| 我们准备好了吗？ | same: 'are we ready?' needs 了 |
| S0111L01U08 | I want to learn this new thing quickly \| 我想快学这新东西 | I want to learn this new thing quickly \| 我想尽快学这新东西 | 快学 is not idiomatic; 'quickly' is taught as 尽快 (S0020L02) |
| S0137L01U04 | she wants it to be perfect \| 她想那完美 | she wants it to be perfect \| 她想让它完美 | 她想那完美 'she wants that perfect' is ungrammatical; 想让它完美 = wants it to be perfect |
| S0156L01U14 | where did she go? \| 她去哪里？ | where did she go? \| 她去哪里了？ | past question 'where did she go?' needs 了, as U15 has |
| S0162L01B03 | what do you think about that \| 你觉得怎么样那个 | what do you think about that \| 那个你觉得怎么样 | object 那个 cannot follow 怎么样; it is fronted as the topic |
| S0252L01U05 | I need to be ready by tomorrow \| 我需要在明天准备好 | I need to be ready by tomorrow \| 我需要在明天之前准备好 | 在明天 says 'tomorrow', not 'by tomorrow'; 'by' = 之前 (taught S0249) |
| S0260L01U03 | I don't have the faintest idea what to do \| 我一点头绪都没有该做什么 | I don't have the faintest idea what to do \| 该做什么，我一点头绪都没有 | 'what to do' cannot trail after 都没有; it comes first |
| S0322L01U06 | he's reading the same book as me \| 他在读和我同一本书 | he's reading the same book as me \| 他和我在读同一本书 | 在读和我同一本书 is ungrammatical; 和我 goes before the verb |
| S0333L01B02 | spend time with you \| 和你花时间 | spend time with you \| 花时间和你在一起 | 和你花时间 is an English calque; Chinese shape is 花时间和…在一起 (as the seed itself) |
| S0333L01U01 | I want to spend time with you \| 我想和你花时间 | I want to spend time with you \| 我想花时间和你在一起 | same calque |
| S0333L01U06 | do you want to spend time with them? \| 你想和他们花时间吗 | do you want to spend time with them? \| 你想花时间和他们在一起吗 | same calque |
| S0381L01B04 | come with \| 跟一起走 | come with me \| 跟我一起走 | 跟…一起 needs a person in it; 跟一起走 is not Chinese |
| S0393L02U05 | do you know who was wearing green? \| 你知道谁在穿绿色吗？ | do you know who was wearing green? \| 你知道谁穿了绿色吗？ | 谁在穿 = who is putting on; 'was wearing' is 穿了 here (as S0393L03U06 谁穿了绿色衬衫; 着 untaught) |
| S0459L01U06 | that blue dress is pretty \| 那件蓝色的衣服很好看 | that blue dress is pretty \| 那件蓝色的连衣裙很好看 | 'dress' is taught as 连衣裙 (S0394L02); 衣服 = clothes |
| S0480L01U01 | I will go no matter what \| 不管什么我都会去 | I will go no matter what happens \| 不管发生什么我都会去 | 不管什么 needs a verb: 不管发生什么, as U04/U05 |
| S0480L01U03 | she came no matter what \| 不管什么她都来了 | she came no matter what happened \| 不管发生什么她都来了 | same |
| S0520L03U04 | nobody wants that to happen to them \| 没有人想这发生在身上 | nobody wants that to happen to them \| 没有人想这发生在自己身上 | 发生在身上 needs whose body: 在自己身上 (自己 taught S0516) |
| S0524L03U06 | I'll call you back later \| 我以后给你回电话 | I'll call you back later \| 我晚点给你回电话 | 以后 = 'some time in the future'; 'later (today)' is 晚点 (taught, S0239L01U11) |
| S0536L02U06 | I didn't think that was crazy \| 我不以为那是疯狂的 | I didn't think that was crazy \| 我不觉得那是疯狂的 | 以为 = 'wrongly believed'; plain 'think' is 觉得 (taught) |
| S0536L03U03 | I don't think it's a bad thing \| 我不以为那是坏事 | I don't think it's a bad thing \| 我不觉得那是坏事 | same 以为 fault |
| S0536L03U06 | she thinks it's a bad thing \| 她以为那是坏事 | she thinks it's a bad thing \| 她觉得那是坏事 | same 以为 fault (present 'thinks'), same basket |
| S0541L03U05 | I think that's a bad idea \| 我以为那是个坏主意 | I think that's a bad idea \| 我觉得那是个坏主意 | same 以为 fault |
| S0544L02U03 | I didn't think it was this hard \| 我没以为这么难 | I didn't think it was this hard \| 我没想到这么难 | 没以为 is ungrammatical; 'didn't think it was' = 没想到 (taught S0239L01U09) |
| S0551L03U04 | nobody thinks it's ugly \| 没有人以为那很丑 | nobody thinks it's ugly \| 没有人觉得那很丑 | same 以为 fault |
| S0551L03U05 | I think that's ugly \| 我以为那很丑 | I think that's ugly \| 我觉得那很丑 | same 以为 fault |
| S0614L01U06 | I live close to work \| 我住的地方离工作很近 | I live close to work \| 我住的地方离工作的地方很近 | 离 needs a place: 工作的地方, as S0614L03U03 |
| S0664L01U02 | I need to know if you're all ready \| 我需要知道你们准备好了吗 | I need to know if you're all ready \| 我需要知道你们准备好了没有 | 吗 cannot end an embedded question; …了没有 |
| S0224L01U02 | he's starting to learn now \| 他现在在开始学 | he's starting to learn now \| 他现在开始学了 | 在开始 'be in the middle of starting' is unnatural; 'he's starting to learn now' = 现在开始学了 (dark basket since #214 made S0224L01 not-new) |
| S0384L01U06 | I just wanted to tell you something \| 我刚才想告诉你一件事 | I wanted to tell you something a moment ago \| 我刚才想告诉你一件事 | English made to say what the Chinese says (刚才 = a moment ago); the old English is S0357L01U02 = 我只是想… (ZUT) |
| S0478L02B03 | a kind heart \| 很好的心 | a very good heart \| 很好的心 | English made to say what the Chinese says; 'a kind heart' is S0478L03 = 善良的心 (ZUT) |
| S0478L02U05 | you have a very kind heart \| 你有一颗很好的心 | you have a very good heart \| 你有一颗很好的心 | same |
| S0457L02B01 | field \| 领域 | area \| 领域 | bare 'field' = 场地 (S0353L01); this LEGO's own gloss is 'area' (ZUT) |
| S0549L02U03 | I want to stay calm \| 我想保持安静 | I want to keep quiet \| 我想保持安静 | English made to say what the Chinese says: 安静 = quiet, not calm |
| S0580L01U02 | I want to take her somewhere \| 我想带她去那个地方 | I want to take her to that place \| 我想带她去那个地方 | English made to say what the Chinese says: 那个地方 = that place, not somewhere |
| S0580L01U06 | I often want to take the children somewhere \| 我经常想带孩子们去那个地方 | I often want to take the children to that place \| 我经常想带孩子们去那个地方 | same |
| S0589L02U04 | nobody got the last seat \| 没有人拿到最后一个 | nobody got the last one \| 没有人拿到最后一个 | English made to say what the Chinese says: no 'seat' in it |
| S0606L01U06 | I knew this would happen sooner or later \| 我早知道这会发生 | I knew all along this would happen \| 我早知道这会发生 | English made to say what the Chinese says: 早知道 = knew all along, not 'sooner or later' |

### Deletes
Each of these has no fix that uses taught words and keeps the LEGO, so the row was removed. The LEGO keeps at least 3 use phrases.

| Row | Deleted | Why |
|---|---|---|
| S0224L01B03 | he's starting \| 他在开始 | 他在开始 is unnatural and 'he's starting' has no taught fix (dark basket) |
| S0094L02B04 | only this \| 唯一这个 | 唯一这个 is ungrammatical (唯一 needs 的 + noun); no taught fix keeps the LEGO |
| S0111L01U03 | can you tell me about this new thing? \| 你能告诉我关于这新东西吗？ | 告诉我关于这新东西 is ungrammatical; a fix (…的事) reads clumsily; 9 USE remain |
| S0148L01U04 | I'm not very good at this \| 我这个不太好 | 我这个不太好 is not Chinese for 'not very good at this'; needs untaught 擅长 |
| S0159L01U03 | I don't know what I'm trying to say \| 我不知道我想说的 | 我不知道我想说的 is ungrammatical (needs 什么), and 什么 would break the LEGO 我想说的 |
| S0159L01U07 | I'm not sure what I'm trying to say \| 我不确定我想说的 | same as U03 |
| S0195L01B03 | find the money \| 找钱 | 找钱 is the fixed phrase 'give change'; teaches the wrong sense |
| S0276L01U04 | let me think about this for a little while \| 让我想一会儿这个 | 让我想一会儿这个: object cannot follow the duration; no fix keeps the English |
| S0277L01U04 | unfortunately I have to go to a meeting \| 很遗憾我得去会议 | 去会议 is not Chinese (开会/参加会议 untaught here) |
| S0277L01U06 | I'm willing to come to the meeting \| 我愿意来会议 | 来会议: same |
| S0277L01U09 | we can go to the meeting \| 我们能去会议 | 去会议: same |
| S0285L01B03 | she speaks well \| 她会说得好 | 她会说得好 reads 'she will speak well' (会 + manner complement clash) |
| S0285L01B04 | she speaks very well \| 她会说得很好 | same |
| S0290L01B03 | if he knows the answer to this \| 他知不知道答案这个 | 答案这个 is ungrammatical |
| S0291L01B02 | much better \| 更好多了 | 更好多了 stacks 更 and 多了; 'much better' (好多了) would drop the LEGO 更好 |
| S0291L01U06 | she's much better at speaking Chinese than I am \| 她说中文比我更好多了 | same 更好多了 fault |
| S0300L01U03 | I think this seems good \| 我觉得这个显得很好 | 这个显得很好 is odd Chinese and the English is stilted |
| S0339L01B03 | very hurt \| 很伤 | 很伤 is not Chinese for 'very hurt' |
| S0351L01U08 | stay quiet \| 待着安静 | 待着安静 is not Chinese; also a bare imperative USE |
| S0376L01B03 | went somewhere \| 去了哪儿 | 去了哪儿 is the question 'where did … go', not 'went somewhere' |
| S0411L01U06 | I have four people in my family \| 我家庭有四人 | 我家庭有四人 is not Chinese (我家有四口人 drops the LEGO 四人) |
| S0412L01U04 | she worked hard to win \| 她努力工作来赢得 | 赢得 needs an object; unfinished sentence |
| S0420L01U04 | how old is that child? \| 那个孩子多大年纪？ | 多大年纪 is the respectful 'how old' for older people, wrong for a child |
| S0441L02B03 | one approach here \| 一种方法在这里 | 一种方法在这里: wrong word order |
| S0443L01U05 | I think the same \| 我觉得同样 | 我觉得同样 is not Chinese |
| S0455L04U03 | he was tired yet still went \| 他累了而还是去了 | 而还是 is ungrammatical |
| S0457L01B03 | part of this \| 这的一部分 | 这的一部分 is ungrammatical |
| S0457L01U04 | part of this is right \| 这的一部分是对的 | same 这的 fault |
| S0457L03U03 | what's the number of people? \| 人数量是多少？ | 人数量 is not Chinese |
| S0464L02U05 | he forgot even though I told him once \| 他忘了即使我告诉过他一次 | 即使 'even if' cannot follow the main clause like this |
| S0466L01U02 | she can't see over the wall \| 她看不过墙 | 看不过墙 is not Chinese |
| S0477L01U02 | she's on vacation \| 她在假期 | 她在假期 is not Chinese (在度假 drops the LEGO 假期) |
| S0481L01U04 | nobody else can do this, only her \| 没有人能做这个，唯一的是她 | 唯一的是她 is not natural Chinese (dark basket: LEGO not new) |
| S0485L02B03 | nothing makes me happier \| 没有什么比让我更开心的 | 比 left with nothing to compare (dark basket) |
| S0492L02B01 | interesting \| 意思 | 意思 alone = 'meaning', not 'interesting' |
| S0493L01B02 | what comes next \| 接下来什么 | 接下来什么 needs 是; the fixed form duplicates U01 |
| S0496L01U05 | nobody planned for this \| 没有人打算这个 | 打算 needs a verb after it |
| S0497L01B02 | that sounds like \| 听起来那个 | 听起来那个 is not Chinese |
| S0436L02U05 | she said the requirements are very clear \| 她说要求很明显 | 明显 = obvious, not clear; 清楚 untaught |
| S0502L03U01 | she made a left turn \| 她做了向左转 | 做了向左转 is ungrammatical; the fix would clash with B02 (dark basket) |
| S0505L01U05 | I was told about that \| 我被告诉了那个 | 被告诉了那个 is not natural Chinese (dark basket) |
| S0506L01B03 | long ago \| 很久之前多年前 | two phrases glued together |
| S0508L01B03 | worry about \| 担心关于 | 关于 cannot dangle after 担心 (dark basket) |
| S0520L02U05 | I want to be with my family \| 我想和家庭在一起 | 家庭 = household; 'be with my family' needs 家人 (dark basket) |
| S0522L03B02 | tell us the truth \| 告诉我们说实话 | 告诉我们说实话 stacks two verbs; 告诉我们实话 would drop the LEGO |
| S0522L04U04 | nobody wants to be stupid \| 没有人想很傻 | 想 cannot take 很傻 |
| S0532L01U06 | I can't win unless I try \| 除非我试，我不能赢得 | 赢得 needs an object |
| S0532L02U06 | unless you have good luck, you can't win \| 除非你运气好，你不能赢得 | same |
| S0535L01U03 | nobody keeps their promises \| 没有人答应过就做到 | garbled; does not say 'keep their promises' |
| S0535L03U04 | nobody wants to be wrong \| 没有人想错 | 想错 = think wrongly, not want to be wrong |
| S0539L01U05 | I thought so but she didn't \| 我以为是但是她不以为 | 不以为 fault, garbled (dark basket) |
| S0542L01U04 | nobody thinks about it whenever she leaves \| 没有人每当她离开就想 | word order broken |
| S0542L01U05 | whenever he makes a promise \| 每当他答应过 | 过 does not fit after 每当 |
| S0542L02U04 | nobody feels good about that \| 没有人感到好 | incomplete Chinese (dark basket) |
| S0546L04U04 | nobody came again \| 没有人又来了 | 又 does not combine with 没有人…了 |
| S0549L01U03 | nobody has to stay \| 没有人得留下 | 得 děi is not negated this way |
| S0549L01U07 | do it differently \| 做得不一样 | uses 得 de (complement marker), not the LEGO 得 děi 'have to' |
| S0549L01U08 | if I'd known I'd have done things differently \| 如果我知道，我会做得不一样 | same |
| S0549L01U09 | she does things differently \| 她做得不一样 | same |
| S0549L02B03 | stay here \| 保持在这里 | 保持 cannot take a place |
| S0549L02U05 | keep doing it \| 保持做这个 | 保持 cannot take a verb phrase |
| S0549L02U06 | she said to keep going \| 她说保持去做 | same |
| S0556L01U03 | nobody is quiet late at night \| 没有人深夜安静 | nonsensical |
| S0559L01U04 | she passed through the end \| 她穿过了尽头 | nonsense in both languages |
| S0561L01U04 | nobody drives fast \| 没有人开车很快 | needs the complement 开得很快 |
| S0563L03U03 | I can't wait longer \| 我不能更久地等 | 我不能更久地等 is ungrammatical; 我不能再等了 drops the LEGO 久 |
| S0566L01U05 | nobody thought carefully \| 没有人仔细想想 | 想想 is the 'think a bit' suggestion form, not a past tense |
| S0592L02U03 | nobody walked along \| 没有人沿着走 | 沿着 needs a place |
| S0597L03U04 | I want to know more about it \| 我想多了解关于这件事 | 关于-phrase cannot be the object like this (dark basket) |
| S0597L03U05 | she told me about it \| 她告诉了我关于这件事 | same |
| S0597L03U06 | what do you know about it? \| 你知道关于这件事什么？ | same |
| S0600L01U05 | you look so tired \| 你看起来有多累啊 | 有多累 = how tired, not so tired |
| S0602L01B02 | how it started \| 一开始是怎么 | Chinese and English do not match |
| S0615L04U03 | it takes courage to say that \| 说出那样的话需要勇敢 | 勇敢 is an adjective; 'courage' (勇气) would drop the LEGO |
| S0618L01B03 | I feel like it \| 感觉像这样 | 'I feel like it' means something else |
| S0644L01U03 | she came again \| 她再来了 | 再 is future 'again'; past is 又, which drops the LEGO (dark basket) |

**Already fixed by another job before this pass (no action):** S0516L01B02, S0520L01U03, S0520L01U05, S0603L01B03, S0622L03U05, S0627L01U04, S0633L01U06.

**Not a defect:** S0546L04U06 "she said she's both wrong and right | 她说她又错又对" says exactly that. The LEGO gloss behind it is item K32 below.

## Bucket 2: 试试 "trying to", settled, no change

These stay as they are, per the Tom + Kai ruling of 4 Nov.

- 2: I'm trying to learn | 我试试学习
- 6: I'm trying to remember a word | 我试试想起一个词
- 222: he's trying to tell me what he wants | 他在试试告诉我他想要什么
- 226: the man is trying to help me | 那个男人在试试帮我
- S0222L01B02: I'm trying | 我在试试
- S0222L01B03: he's trying | 他在试试
- S0222L01U01: I'm trying to read this book | 我在试试看这本书
- S0222L02U08: I'm trying to tell you | 我在试试告诉你
- S0222L03U05: he's trying to tell me what he wants | 他在试试告诉我他想要什么
- S0226L01U01: that man is trying to help me | 那个男人在试试帮我
- S0228L02U04: she's trying to speak | 她在试试说话
- S0229L01U01: that woman is trying to help me | 那个女人在试试帮我
- S0230L01U04: I'm trying to get to know him | 我在试试认识他
- S0230L02U02: that young woman is trying to help me | 那个年轻女人在试试帮我
- S0230L04U04: she's trying to work | 她在试试工作
- S0224L01U08: she's starting to try now | 她现在在开始试试
- S0348L01U04: I will try | 我将要试试

The same pattern runs through about 90 other rows, mostly seeds 2–35 (e.g. "I want to try to speak Chinese | 我想试试说中文"). They are covered by the same ruling, also no change.

## Already ruled by Kai (D2–D6), left to #214

- 21: already ruled by Kai (D2) — out of scope, left to #214
- S0030L01U05: already ruled by Kai (D3) — out of scope, left to #214
- S0039L02U02: already ruled by Kai (D4) — out of scope, left to #214
- S0049L01U05: already ruled by Kai (D5) — out of scope, left to #214
- S0056L01U08: already ruled by Kai (D6) — out of scope, left to #214
- S0058L02B03: already ruled by Kai (D6) — out of scope, left to #214
- S0069L01U09: already ruled by Kai (D6) — out of scope, left to #214

## Bucket 3: calls for Kai (LEGO, seed or meaning changes; nothing applied)

Ordered by learner impact: LEGOs that teach a wrong meaning first, then early seeds, then everything later. Each item gives the seed, the actual sentences and one recommendation.

**K1. Seed 121: the LEGO teaches the opposite word.** LEGO "unusual | 寻常". 寻常 (xúncháng) means *usual*. Every phrase under it already says 不寻常 (bù xúncháng, "unusual"), e.g. "this is unusual | 这很不寻常". *Recommend:* re-cut the LEGO to "unusual | 不寻常". The seed (你不喜欢用车，这很不寻常) already contains it (L26), and the LEGO stops teaching a false mapping (K16). The basket needs no change.

**K2. Seed 130: "because" is taught as 但是 ("but").** Seed "that was a surprise, because he's my friend | 那很意外，但是他是我的朋友". The Chinese says "…but he's my friend", which teaches 但是 = because against S0022's 因为. S0130L03U06 copies it. *Recommend:* change the seed's English to "that was a surprise, but he's my friend". The Chinese stays, nothing new is introduced, and it is the smallest fix (S15: the seed teaches something false).

**K3. Seed 101: the LEGO "course | 门".** 门 is the counter for languages and courses. It is never the word "course". The phrases use a bare 这门 / 那门 ("this one") with no noun, which isn't Chinese: "I'm learning this one right now | 我现在在学这门". The seed is 我很享受更多了解这门语言. *Recommend:* re-cut to "this language | 这门语言" (in the seed, L26), with "language | 语言" (S0101L04) moved ahead of it in build order (K47), and remake the 8 phrases as 这门语言 / 那门语言 (K40: a counter carries its noun).

**K4. Seed 73: the LEGO isn't in its seed.** LEGO "more to learn | 更多要学". The seed says 我还有很多要学 ("I still have a lot to learn"), and 更多要学 is neither in the seed nor natural. *Recommend:* re-cut to "got more to learn | 还有很多要学" (L26). In all 8 phrases 更多要学 becomes 很多要学, and they already carry 还有.

**K5. Seed 76: the seed's Chinese is ungrammatical.** "I'm very happy with how much I've learnt already | 我对自己已经学会的这么多很满意". 这么多 can't follow 的 like that. *Recommend:* make the seed 我对自己已经学了这么多很满意 (wǒ duì zìjǐ yǐjīng xué le zhème duō hěn mǎnyì). Its LEGOs 对 / 已经 / 满意 are all still in it.

**K6. Seed 103: the seed stacks 很多 and 更多.** "we're not trying to hear many more words | 我们不是想再听很多更多的词". *Recommend:* make it 我们不是想再听更多的词 (wǒmen bú shì xiǎng zài tīng gèng duō de cí). The LEGO 我们不是想 is untouched.

**K7. Seed 91: the LEGO isn't in its seed.** LEGO "to speak more quickly | 说得更快". The seed is "it's difficult to think quickly enough to answer in time | 很难想得够快，及时回答", which has no 说 and no 更. *Recommend:* re-cut to "think quickly enough | 想得够快" (L26) and rebuild its basket. The 11 phrases about "speaking more quickly" can only be re-pointed, not kept.

**K8. Seed 129: the LEGO isn't in its seed.** LEGO "so happy | 这么高兴". The seed is 我很高兴你做得这么好, where 很高兴 = "very happy" and 这么好 = "so well". 我这么高兴 as a plain statement is also unnatural ("I'm so happy | 我这么高兴"). *Recommend:* re-cut to "doing so well | 做得这么好" (in the seed). The happy part is already taught.

**K9. Seed 157: the LEGO "be able to | 办法".** 办法 means "way / means" and is already taught as "way | 办法" (S0094L01). Its basket glosses it three ways: be able to / way to / no way to. *Recommend:* re-cut to "no way to | 没办法" (in the seed: 下个月我没办法到那里). That ends one-English-two-Chinese for "won't be able to" (不能 vs 没办法), per ZUT/K2.

**K10. Seed 147: "very" taught twice.** LEGO "very nervous | 非常紧张". "Very" is 很, and 非常 is taught as "extremely" (S0125L01). U07 even reads "she was extremely nervous | 她非常紧张". *Recommend:* re-gloss the LEGO "extremely nervous | 非常紧张" and its phrases to match. The seed English becomes "she was extremely kind…". The seed Chinese 非常友善 already says that.

**K11. Seed 108: the seed's Chinese says something else.** "we didn't hope to wake in the middle of the night | 我们没希望半夜醒来". 没希望 = "hopeless / no hope", and the English is stilted too. *Recommend:* make it "we didn't want to wake in the middle of the night | 我们不想半夜醒来" (all taught words). It is a seed rewrite, so it's your call.

**K12. Seed 166: the seed's Chinese stacks negatives.** "my name is not very unusual | 我的名字并不太不寻常" (并不 + 太 + 不寻常). The LEGO "not very unusual | 并不太不寻常" follows it. *Recommend:* make it "my name is not very special | 我的名字并不太特别" only if 特别 is taught by 166. Otherwise keep the English and use 我的名字不算太特别. Needs your ruling, because the LEGO changes with it.

**K13. Seed 178: the 虽然/但是 order is backwards.** "I didn't have time, although I wanted to see you | 但是我没时间，虽然我想见你". Chinese pairs these as 虽然 A，但是 B. *Recommend:* swap both sides: "although I wanted to see you, I didn't have time | 虽然我想见你，但是我没时间". The LEGO 虽然 stays.

**K14. Seed 185: 工作地方 isn't a word.** "I think you left them at work | 我觉得你把它们落在工作地方了". *Recommend:* make it 我觉得你把它们落在工作的地方了 (one 的 added). It is a pure grammar fix, but it's a seed, so it's here.

**K15. Seeds 231 and 232: "old man" and "woman".** Seed 231 has LEGO "old man | 老男人", which sounds crude ("old geezer"). The course later teaches "an old man | 一个老人" (S0264L01). Seed 232 has LEGO "woman | 妇人", a second, old-fashioned word for "woman" after "woman | 女人" (S0229L01). That gives an exact clash: "do you know that woman? | 你认识那个女人吗？" (S0230L01U02) vs "…| 你认识那个妇人吗" (S0232L01U04). *Recommend:* for 232, merge S0232L01 into its neighbour "old woman | 老妇人" (never delete a LEGO, so merge) and remake its 4 phrases with 老妇人. For 231, re-cut to "old man | 老人" with the seed 我认识一个老人…. S0264L01 then becomes not-new.

**K16. "my mother" and "my father" have two answers each.** "my mother" is 我妈 (S0181L02B01) and also 我妈妈 (LEGO S0239L01). "my father" is 我爸爸 (S0240L01B02) and also 我父亲 (LEGO S0266L01, the formal word), e.g. "you must tell my father | 你必须告诉我爸爸" vs "do you know my father? | 你认识我父亲吗？". *Recommend:* keep 我妈妈 / 我爸爸 as the course's "my mother / my father". Make S0181L02B01 我妈妈, and re-cut S0266L01 to 我爸爸 with seed 266 他是我爸爸的老朋友. Both seeds read fine either way.

**K17. Seed 259: "good idea" has two answers.** "I think that's a good idea" is 我觉得这是个好主意 (S0123L01U02) but 我觉得那是个好想法 under LEGO "good idea | 好想法". *Recommend:* re-gloss the S0259 LEGO "good thought | 好想法" (想法 = thought / idea) so 主意 alone owns "idea", and adjust its 7 phrases' English.

**K18. Seed 285: "she speaks | 她会说" with manner phrases.** 会说 = "can speak (a language)". "she speaks Chinese very well | 她会说中文说得很好" and "I think she speaks very well | 我想她会说得很好" mix 会 with 说得很好 and read as "she will speak well". I've deleted the two builds with the same fault (bucket 1). Deleting these two USE rows would leave only 2. *Recommend:* delete U01 and U04 and add two plain replacements, e.g. "she speaks English | 她会说英文" if 英文 is taught, else "can she speak Chinese now? | 她现在会说中文吗？".

**K19. Seed 323: the LEGO target is 校.** LEGO "school | 校". 校 isn't a word on its own, and every phrase says 学校. *Recommend:* fix the LEGO target to 学校 (in the seed). It's a data slip, but it's a LEGO text change.

**K20. Seed 198: "the council" taught as 市 "city".** LEGO "the council | 市政府", but every phrase uses 市 alone as "city" (在市里, 市在哪里). 市在哪里 isn't natural, and "in the city" is later 在城市里 (S0302L01), so "she works in the city" gets two answers. *Recommend:* rebuild the basket around 市政府 ("she works for the council | 她在市政府工作", etc.), so 市 alone is never taught as "city".

**K21. Seed 221: 部 glossed as "part".** LEGO "part | 部". Here 部 is the counter for films (一部电影), so "I watched one part | 我看了一部" teaches a wrong meaning ("this part" is 这部分). *Recommend:* re-cut to "a film | 一部电影" (in the seed, after "film | 电影" in build order) and remake its phrases with 电影.

**K22. Counter-word LEGOs glossed as a noun or a grammar label.**
- Seed 336, "door | 扇": 扇 is the counter, and 门 is "door".
- Seed 411, "a table | 一张": the basket has both "a table | 一张" and "a table | 一张桌子".
- Seed 488, "measure word for long, thin objects | 条": its phrases teach "that line | 那条" and "a yellow rope | 一条黄色的", and "don't cross that line | 不要过那条" nearly clashes with "don't cross the line | 不要过那条线".
- Seed 546, "measure word for animals | 只".

*Recommend* (K40/L11, the counter carries its noun): "that door | 那扇门", "a table | 一张桌子", "that line | 那条线" (merge with S0488L03 "line"), "that dog | 那只狗". Each is in its seed, and the phrases follow.

**K23. Seed 337: the LEGO isn't in its seed.** LEGO "to like to play | 喜欢玩". The seed is "do you think he can keep playing? | 你觉得他还能继续玩吗？", which has no 喜欢. *Recommend:* re-cut to "keep playing | 继续玩" (in the seed) and rebuild the 7 phrases. Under your to-rule this is not a "to [verb]" LEGO.

**K24. Later seeds whose Chinese doesn't match or isn't grammatical.**
- 461: "a shop where I can buy some postcards | 我想买明信片的商店". 想 = "want". *Recommend* 我能买一些明信片的商店.
- 464: "I told her my room number once… | 我告诉过她我的房间号码一次…". *Recommend* 我告诉过她一次我的房间号码，但是她忘了 (the 一次 goes before a long object).
- 479: "it's the least I could do | 这是我至少能做的事" is a word-for-word calque. The natural 起码 is untaught. *Recommend* keeping it, unless you want the LEGO re-cut.
- 483: "…but it's not meant to be easy | 但是也不是应该容易的" is ungrammatical. *Recommend* 但是本来就不应该容易 (本来 is taught at S0484, so check the order).
- 563: the Chinese adds 没有你的帮助 ("without your help"), and its LEGO "help | 帮助" depends on it. *Recommend:* change the English to "without your help I wouldn't have been able to keep going any longer".
- 565: the Chinese adds 如果是我选的 ("if it had been my choice"). *Recommend:* add it to the English.
- 596: the Chinese 然后闭上眼睛一会儿 lacks "I need to". *Recommend* 然后我需要闭上眼睛一会儿.

**K25. Seed 455: "and so | 而" is glossed three ways.** B01 is "and yet", the LEGO is "and so", and U02 is "quiet yet happy". U06 "they were tired so they left | 他们累了而离开了" is shaky without 因为. I deleted the clearly broken U03. Deleting U06 too would leave only 3 USE. *Recommend:* gloss the LEGO by what the seed does ("because … and so | 因为…而", K42) and delete U06.

**K26. Grammar-label LEGO glosses (L11).** S0505L01 "passive marker bei | 被" and S0522L02 "suggestion | 吧". The 吧 basket glosses it as shall we / let's / okay? / is it okay?. *Recommend:* gloss by the seed's chunk ("get left behind | 被落下" already exists as L02, so merge; "let's … | …吧"). Low impact: S0505L01 is not new.

**K27. Baskets that don't hold their LEGO (P17).** S0514L02 "that perfect house | 那所完美的房子": its basket teaches 所 as "a building". S0625L01 "to drink something | 喝点什么": its basket is about 一点 "a bit". S0618L01 "it doesn't feel like | 感觉不像": U02–U06 use only 感觉. S0627L01 "your coffee is ready | 你的咖啡好了". *Recommend:* rebuild each basket around its own LEGO. This is new phrase-writing, not a fix, which is why it isn't in bucket 1.

**K28. Seed 593: "however | 不管".** 不管 means "no matter", and the seed is "however much I argued…". It also clashes with S0480L01 "whatever | 不管". *Recommend:* re-cut to "however much | 不管…怎么" or "no matter how | 不管怎么" (in the seed).

**K29. Seed 597: "to suspect | 怀疑" also means "to doubt".** The basket has both: "she doubts it | 她怀疑这个" and "I suspect she's right | 我怀疑她是对的" (many readers hear "I doubt she's right"). *Recommend:* keep the "suspect" sense the seed uses. Delete or re-English U02, U04, U05 and U07 so 怀疑 is never "doubt" here.

**K30. Seed 631: "would like | 要".** The basket uses 要 as "need" ("I need to go | 我要走了", "we need to start | 我们要开始了") and as "going to", which makes "need" = 要 clash with 需要. *Recommend:* keep the LEGO's "want / would like" sense and re-English those rows to "I'm going to go" / "we're going to start", or delete them.

**K31. Seed 95: "bus | 班车" is still bare.** After #214, seed 95 ("are you ready to go home on the next bus? | 你准备好坐下一班车回家了吗？") has S0095L02 "bus | 班车" and S0095L03 "the next bus | 下一班车". On its own, 班车 is a shuttle or company bus, and "bus" is taught as 公交车 ("go by bus | 坐公交车", S0120L01). So "take the bus" has two answers. *Recommend:* merge S0095L02 into S0095L03 "the next bus | 下一班车" (K40: the counter 班 needs its 下一), and re-point L02's phrases to "the next bus".


**K32. Seed 546: "also | 又".** In the seed (那只狗又脏又湿), 又…又 means "both … and". The basket glosses 又 as "again" (B01, U01 "she came again | 她又来了"), "both...and" (B02) and "the dog is dirty and" (U05). *Recommend:* re-cut to "both dirty and wet | 又脏又湿" (in the seed, K42) and keep the "again" rows out of this basket.

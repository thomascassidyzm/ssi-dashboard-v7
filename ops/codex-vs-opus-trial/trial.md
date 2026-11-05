# Popty v4 phrase baskets — Opus vs Codex, 10 LEGOs

Both models got the same prompt, the same admitted list, the same gates (#435's strict admitted-list gates plus the course builder's own v2/v3 gates) and the same one-retry rule, through `generate-v4 --provider`. LEGOs were picked with fixed seed 438: 5 from jpn_for_eng and 5 from kor_for_eng, all new LEGOs at seed 21 or later. Nothing was written to the database.

**Read the baskets, not the table.** The numbers say which baskets cleared the gates. They do not say which sounds right.

| LEGO | model | 1st-pass kept/candidates | retries | kept B+U | frames used/available | tokens | cost | wall |
|---|---|---|---|---|---|---|---|---|
| jpn S0096L01 | Opus | 9/9 | 0 | 4+5 | 11/27 | 23,266 | $0.20 | 15s |
| jpn S0096L01 | Codex | 9/9 | 0 | 4+5 | 11/27 | 25,491 | credits | 44s |
| jpn S0307L01 | Opus | 9/9 | 0 | 4+5 | 9/38 | 38,120 | $0.33 | 17s |
| jpn S0307L01 | Codex | 8/9 | 1 | 4+5 | 9/38 | 73,585 | credits | 47s |
| jpn S0359L01 | Opus | 9/9 | 0 | 4+5 | 11/38 | 41,760 | $0.35 | 17s |
| jpn S0359L01 | Codex | 9/9 | 0 | 4+5 | 15/38 | 39,607 | credits | 26s |
| jpn S0484L01 | Opus | 8/9 | 1 | 4+5 | 6/39 | 100,704 | $0.84 | 33s |
| jpn S0484L01 | Codex | 8/9 | 1 | 4+5 | 10/39 | 95,768 | credits | 46s |
| jpn S0640L01 | Opus | 9/9 | 0 | 4+5 | 6/40 | 61,719 | $0.51 | 17s |
| jpn S0640L01 | Codex | 9/9 | 0 | 4+5 | 15/40 | 56,715 | credits | 27s |
| kor S0097L02 | Opus | 9/9 | 0 | 4+5 | 8/30 | 28,874 | $0.26 | 22s |
| kor S0097L02 | Codex | 9/9 | 0 | 4+5 | 13/30 | 26,669 | credits | 43s |
| kor S0331L03 | Opus | 9/9 | 0 | 4+5 | 12/40 | 52,754 | $0.44 | 17s |
| kor S0331L03 | Codex | 8/9 | 1 | 4+5 | 19/40 | 87,745 | credits | 45s |
| kor S0398L02 | Opus | 9/9 | 0 | 4+5 | 13/40 | 57,355 | $0.48 | 16s |
| kor S0398L02 | Codex | 6/9 | 1 | 4+5 | 17/40 | 94,421 | credits | 47s |
| kor S0511L03 | Opus | 9/9 | 0 | 4+5 | 8/40 | 65,754 | $0.55 | 16s |
| kor S0511L03 | Codex | 8/9 | 1 | 4+4 ⚠ below floor | 12/40 | 106,868 | credits | 47s |
| kor S0636L02 | Opus | 5/9 | 1 | 4+5 | 6/41 | 154,552 | $1.28 | 38s |
| kor S0636L02 | Codex | 7/9 | 1 | 3+4 ⚠ below floor | 11/41 | 124,302 | credits | 51s |

**Totals.** Opus: 85/90 kept first pass, 2 retries, 624,858 tokens, $5.25, 208s. Codex: 81/90 kept first pass, 6 retries, 731,171 tokens, cost in credits (the CLI reports no price), 423s.

**Rejections by gate.** Opus: containment ×3; target uses words not admitted at this LEGO ×3; interjection at the front is not yet admitted for this basket ×1; ZUT ×1. Codex: target uses words not admitted at this LEGO ×13; bareLego ×1; interjection at the front is not yet admitted for this basket ×1; duplicate target ×1.

How the runs were set up:
- Opus ran at effort low through `claude --print`. Codex ran its account default (gpt-6.1-sol) at effort low through `codex exec`, read-only, from an empty folder.
- Codex's token count includes about 12k tokens of its own built-in preamble, which can't be removed.
- Course data came from Popty's read-only script-view route, because the phrase-v4 key is refused at the admin door.
- "Frames used/available" is the frame tagger's count of distinct frames in the kept basket.
- Three Korean LEGOs were run twice: S0097L02, S0398L02 and S0636L02. On the first run, v4's reply template said "lego_index":1. Both models copied it for these L02 LEGOs, so every phrase was refused as "no such new LEGO". The template now names the real LEGO, and the table shows the re-runs. The first runs are kept in the trial folder (first-run-lego-index-bug/).
- Most LEGOs here are L01, where the template change makes no difference. S0331L03 and S0511L03 ran on the old template, and both models read the index right.

_My observation, one line, not a verdict:_ Codex's USE sentences run longer and more varied, and it trips the admitted-words gate more often (13 vs 3). Opus's baskets sit closer to the floor and shorter.

## jpn_for_eng S0096L01 — "not yet" = まだ


**Opus**

| role | English | target |
|---|---|---|
| B | not yet, I don't know | まだ。分からない |
| B | not yet, later | まだ。あとで |
| B | not yet, but soon | まだ。でも、もうすぐ |
| B | not yet, why not? | まだ。なんで？ |
| U | not yet, I'm not sure when I'll be ready | まだ。いつ準備できるか分からない |
| U | not yet, I've got more to learn | まだ。まだ学ぶことがある |
| U | not yet, but I want to keep on doing a little more | まだ。でも、もう少し続けたい |
| U | not yet, I think I can't remember easily | まだ。簡単には覚えられないと思う |
| U | not yet, it's difficult to quickly answer | まだ。すぐ答えるのは難しい |

**Codex (gpt-6.1-sol)**

| role | English | target |
|---|---|---|
| B | not yet sure | まだ分からない |
| B | not yet sure if I can | まだできるか分からない |
| B | not yet difficult | まだ難しくない |
| B | not yet ready to talk | まだ話したくない |
| U | I'm not yet sure when I'll be ready. | まだいつ準備できるか分からない。 |
| U | I'm not yet sure whether I can remember the whole sentence. | 文を全部覚えられるか、まだ分からない。 |
| U | I want to speak Japanese, but I'm not yet ready to talk to people I don't know. | 日本語を話したい。でも、知らない人とは、まだ話したくない。 |
| U | Japanese is not yet difficult, but I've got more to learn. | 日本語はまだ難しくない。でも、まだ学ぶことがある。 |
| U | I'm not yet sure how to answer, but I think that you're doing very well. | まだどう答えるか分からない。でも、すごくよくやってると思う。 |

## jpn_for_eng S0307L01 — "sitting over there" = あそこに座ってる


**Opus**

| role | English | target |
|---|---|---|
| B | the man sitting over there | あそこに座ってる男性 |
| B | the young woman sitting over there | あそこに座ってる若い女性 |
| B | sitting over there now | 今、あそこに座ってる |
| B | he's sitting over there | 彼はあそこに座ってる |
| U | I don't know those people sitting over there | あそこに座ってるあの人たちを知らない |
| U | I want to meet the young woman sitting over there | あそこに座ってる若い女性に会いたい |
| U | I wonder if the man sitting over there knows the answer | あそこに座ってる男性、答えを知ってるか気になる |
| U | who's that man sitting over there? | あそこに座ってる男性、誰？ |
| U | I think that she's sitting over there | 彼女はあそこに座ってると思う |

**Codex (gpt-6.1-sol)**

| role | English | target |
|---|---|---|
| B | he is sitting over there | 彼はあそこに座ってる |
| B | she is sitting over there | 彼女はあそこに座ってる |
| B | sitting over there now | 今あそこに座ってる |
| B | I think that he is sitting over there | 彼はあそこに座ってると思う |
| U | I want to meet the man who's sitting over there | あそこに座ってる男性に会いたい |
| U | I know that young woman who's sitting over there | あそこに座ってる若い女性を知ってる |
| U | who is sitting over there? | あそこに座ってるの、誰？ |
| U | I wonder if the person sitting over there knows the answer | あそこに座ってる人、答えを知ってるか気になる |
| U | the man sitting over there said that he wants to show you something | あそこに座ってる男性、何か見せたいって言ってた |

<details><summary>1 rejected by the gates</summary>

- pass 1 · are you sitting over there? = あそこに座ってる？ — bareLego: the phrase is the LEGO itself

</details>

## jpn_for_eng S0359L01 — "left" = 左


**Opus**

| role | English | target |
|---|---|---|
| B | I like the left door | 左のドア、好き |
| B | might be left | 左かもしれない |
| B | why left? | なんで左？ |
| B | can use the left room | 左の部屋を使える |
| U | I think that she could put it on the left | 左に置けると思う |
| U | she said that she can't open the left door | 左のドア、開けられないって言ってた |
| U | I'm not sure if it's the left door | 左のドアかどうか分からない |
| U | I don't like the left room | 左の部屋、好きじゃない |
| U | do you think that he can use the left room tomorrow night? | 明日の夜、左の部屋を使えると思う？ |

**Codex (gpt-6.1-sol)**

| role | English | target |
|---|---|---|
| B | I want to go left | 左に行きたい |
| B | I thought it was left | 左だと思った |
| B | it might be left | 左かもしれない |
| B | it's not left | 左じゃない |
| U | why do you want to go left now? | なんで今、左に行きたい？ |
| U | she said that she can't open the door on the left | 彼女は左のドア開けられないって言ってた |
| U | I know that young woman who's sitting on the left | 左に座ってる若い女性を知ってる |
| U | before you go, look for the book on the left | 行く前に、左の本を探して |
| U | yes, there was a door on the left | うん、左にドアがあった |

## jpn_for_eng S0484L01 — "not supposed to be" = はずじゃない


**Opus**

| role | English | target |
|---|---|---|
| B | not supposed to be difficult | 難しいはずじゃない |
| B | not supposed to be fun | 楽しいはずじゃない |
| B | not supposed to be interesting | 面白いはずじゃない |
| B | not supposed to be busy | 忙しいはずじゃない |
| U | I think that it's not supposed to be difficult | 難しいはずじゃないと思う |
| U | why is it not supposed to be fun? | なんで楽しいはずじゃないの？ |
| U | today is not supposed to be busy | 今日は忙しいはずじゃない |
| U | learning Japanese is not supposed to be difficult | 日本語は難しいはずじゃない |
| U | even if I make mistakes, it's not supposed to be difficult | 間違えても、難しいはずじゃない |

<details><summary>1 rejected by the gates</summary>

- pass 1 · I'm sorry, but it's not supposed to be busy today = ごめん、今日は忙しいはずじゃない — interjection at the front is not yet admitted for this basket (it must be a taught chunk this basket owns, with its taught target form)

</details>

**Codex (gpt-6.1-sol)**

| role | English | target |
|---|---|---|
| B | not supposed to be interesting | 面白いはずじゃない |
| B | not supposed to be busy now | 今、忙しいはずじゃない |
| B | not supposed to be that big | そんなに大きいはずじゃない |
| B | not supposed to be feeling sick | 具合が悪いはずじゃない |
| U | I think that it's not supposed to be difficult | 難しいはずじゃないと思う |
| U | it's not supposed to be busy, is it? | 忙しいはずじゃない？ |
| U | they told us that it's not supposed to be interesting | 面白いはずじゃないって言ってた |
| U | it feels like it's not supposed to be that difficult | そんなに難しいはずじゃない気がする |
| U | it's not supposed to be difficult, but I can't remember the answer | 難しいはずじゃないけど、答えを思い出せない |

<details><summary>1 rejected by the gates</summary>

- pass 1 · what do you think it's not supposed to be like? = どんな感じのはずじゃないと思う？ — target uses words not admitted at this LEGO: どんな感じのはずじゃないと思う

</details>

## jpn_for_eng S0640L01 — "the red one" = 赤いやつ


**Opus**

| role | English | target |
|---|---|---|
| B | the red one, please | 赤いやつください |
| B | I want the red one | 赤いやつほしい |
| B | the red one too | 赤いやつも |
| B | not the red one | 赤いやつじゃない |
| U | I think it's the red one | 赤いやつだと思う |
| U | it might be the red one | 赤いやつかもしれない |
| U | can I get the red one? | 赤いやつもらえる |
| U | I don't like the red one | 赤いやつ好きじゃない |
| U | I wanted the red one | 赤いやつ欲しかった |

**Codex (gpt-6.1-sol)**

| role | English | target |
|---|---|---|
| B | I want the red one | 赤いやつほしい |
| B | I think it is the red one | 赤いやつだと思う |
| B | it might be the red one | 赤いやつかもしれない |
| B | can I get the red one? | 赤いやつもらえる？ |
| U | yes, I'll buy the red one now | うん、今、赤いやつを買う |
| U | sorry, I couldn't say that the red one is broken | ごめん、赤いやつ壊れてるって言えなかった |
| U | I'd have bought the red one if you'd told me that it was good | 良かったって言ってくれてたら、赤いやつを買ってた |
| U | before I go, I need to buy the red one | 行く前に、赤いやつを買う必要がある |
| U | I want to know more about what the red one is like | 赤いやつ、どんな感じかもっと知りたい |

## kor_for_eng S0097L02 — "as soon as you want, ready to go" = 원하면 바로 갈 준비됐어요


**Opus**

| role | English | target |
|---|---|---|
| B | now, as soon as you want, ready to go | 지금 원하면 바로 갈 준비됐어요 |
| B | but as soon as you want, ready to go | 하지만 원하면 바로 갈 준비됐어요 |
| B | today, as soon as you want, ready to go | 오늘 원하면 바로 갈 준비됐어요 |
| B | so as soon as you want, ready to go | 그래서 원하면 바로 갈 준비됐어요 |
| U | it's time to go now, and as soon as you want, ready to go | 이제 갈 시간이에요, 그리고 원하면 바로 갈 준비됐어요 |
| U | I'm not going to wait, so as soon as you want, ready to go | 기다리지 않을 거예요, 그래서 원하면 바로 갈 준비됐어요 |
| U | yes, I want to start, so as soon as you want, ready to go | 네, 시작하고 싶어요, 그래서 원하면 바로 갈 준비됐어요 |
| U | when do you want to start? as soon as you want, ready to go | 언제 시작하고 싶어요? 원하면 바로 갈 준비됐어요 |
| U | he wants to come back later on, but as soon as you want, ready to go | 그는 나중에 다시 오고 싶어해요, 하지만 원하면 바로 갈 준비됐어요 |

**Codex (gpt-6.1-sol)**

| role | English | target |
|---|---|---|
| B | as soon as you want, ready to go now | 지금 원하면 바로 갈 준비됐어요 |
| B | as soon as you want, ready to go with everyone else | 다른 사람들과 같이 원하면 바로 갈 준비됐어요 |
| B | as soon as you want, ready to go home | 집에 원하면 바로 갈 준비됐어요 |
| B | as soon as you want, ready to go on the next bus | 다음 버스로 원하면 바로 갈 준비됐어요 |
| U | could you say "as soon as you want, ready to go" again a little more slowly? | "원하면 바로 갈 준비됐어요" 좀 더 천천히 다시 말해 줄 수 있어요? |
| U | I don't know how to say "as soon as you want, ready to go" in Korean yet. | 아직 "원하면 바로 갈 준비됐어요" 한국어로 어떻게 말하는지 몰라요. |
| U | I'm trying to remember how to say "as soon as you want, ready to go" in Korean. | "원하면 바로 갈 준비됐어요" 한국어로 어떻게 말하는지 기억하려고 해요. |
| U | I want to practise speaking Korean with you now, but I can't remember how to say "as soon as you want, ready to go". | 지금 같이 한국어로 말하는 연습을 하고 싶어요, 하지만 "원하면 바로 갈 준비됐어요" 어떻게 말하는지 기억하지 못해요. |
| U | I'm going to try to explain how to say "as soon as you want, ready to go" in Korean after you finish. | 끝난 후에 "원하면 바로 갈 준비됐어요" 한국어로 어떻게 말하는지 설명해 볼 거예요. |

## kor_for_eng S0331L03 — "give" = 줄


**Opus**

| role | English | target |
|---|---|---|
| B | I can give | 줄 수 있어요 |
| B | he can't give the answer | 그는 답을 줄 수 없어요 |
| B | I'm going to give | 줄 거예요 |
| B | if I can give | 줄 수 있으면 |
| U | I think that she could give you the answer tomorrow | 그녀가 내일 답을 줄 수 있을 것 같아요 |
| U | I'm not sure if I can give you all the answers today | 오늘 모든 답을 줄 수 있을지 모르겠어요 |
| U | he said that he can't give me more time | 그는 저한테 시간을 더 줄 수 없다고 했어요 |
| U | I'm going to give her my book on Sunday afternoon | 일요일 오후에 그녀한테 책을 줄 거예요 |
| U | can you give me a little more time before I answer? | 제가 대답하기 전에 시간을 조금 더 줄 수 있어요? |

**Codex (gpt-6.1-sol)**

| role | English | target |
|---|---|---|
| B | can give an answer | 답을 줄 수 있어요 |
| B | going to give that book | 그 책을 줄 거예요 |
| B | not sure if I can give more time | 시간을 더 줄 수 있을지 모르겠어요 |
| B | give as quickly as possible | 가능한 한 빨리 줄 |
| U | I hope I'll be able to give her a little more time tomorrow. | 내일 그녀한테 시간을 조금 더 줄 수 있으면 좋겠어요. |
| U | I think that she could give you all the answers if she wanted to. | 그녀가 원하면 모든 답을 줄 수 있을 것 같아요. |
| U | Why can't you give me that book before you go? | 왜 가기 전에 저한테 그 책을 줄 수 없을 것 같아요? |
| U | I know someone who can give you more time, but he's busy today. | 시간을 더 줄 수 있는 사람을 알아요, 하지만 그는 오늘 바빠요. |
| U | Yes, I'll give you that book tomorrow morning, and then I'll be able to come and help later on. | 네 내일 아침에 그 책을 줄 거예요, 그러면 나중에 와서 도와줄 수 있을 거예요. |

<details><summary>1 rejected by the gates</summary>

- pass 1 · no problem. I'll give you the book as soon as possible, so don't worry. = 문제없어요. 가능한 한 빨리 책을 줄 거예요, 그러니까 걱정하지 않아요. — target uses words not admitted at this LEGO: 그러니까

</details>

## kor_for_eng S0398L02 — "in a way that has" = 있게


**Opus**

| role | English | target |
|---|---|---|
| B | in a way that has patience | 참을성 있게 |
| B | want to speak in a way that has patience | 참을성 있게 말하고 싶어요 |
| B | I'm going to do it in a way that has patience | 참을성 있게 할 거예요 |
| B | must work hard in a way that has patience | 참을성 있게 열심히 해야 해요 |
| U | I want to speak with my friends in a way that has patience | 친구들과 참을성 있게 말하고 싶어요 |
| U | I think that you're doing it in a way that has patience | 참을성 있게 하고 있다고 생각해요 |
| U | it's important to speak in a way that has patience | 참을성 있게 말하는 게 중요해요 |
| U | I'm not sure if I can speak in a way that has patience | 참을성 있게 말할 수 있을지 모르겠어요 |
| U | I'd like to be able to speak in a way that has patience after you finish | 끝난 후에 참을성 있게 말할 수 있으면 좋겠어요 |

**Codex (gpt-6.1-sol)**

| role | English | target |
|---|---|---|
| B | want to speak in a way that has patience | 참을성 있게 말하고 싶어요 |
| B | going to speak in a way that has patience | 참을성 있게 말할 거예요 |
| B | can speak in a way that has patience | 참을성 있게 말할 수 있어요 |
| B | speak in a way that has more patience | 더 참을성 있게 말해요 |
| U | why don't you want to speak in a way that has more patience when other people are here? | 다른 사람들이 여기 있을 때 왜 더 참을성 있게 말하고 싶지 않아요? |
| U | I hope I'll be able to speak in a way that has more patience with people I don't know. | 모르는 사람들과 더 참을성 있게 말할 수 있으면 좋겠어요. |
| U | yes, I can speak in a way that has patience, but I need a little more time. | 네, 참을성 있게 말할 수 있어요, 하지만 시간이 조금 더 필요해요. |
| U | I want you to speak in a way that has patience before I answer. | 제가 대답하기 전에 참을성 있게 말해 주면 좋겠어요. |
| U | I know how to speak in a way that has patience, so don't worry. | 참을성 있게 어떻게 말하는지 알아요, 그래서 걱정하지 않아요. |

<details><summary>3 rejected by the gates</summary>

- pass 1 · should speak in a way that has patience = 참을성 있게 말해야 해요 — target uses words not admitted at this LEGO: 말해야
- pass 1 · I'm going to explain in a way that has patience = 참을성 있게 설명할 거예요 — target uses words not admitted at this LEGO: 설명할
- pass 1 · yes, I can explain what I mean in a way that has patience. = 네, 무슨 뜻인지 참을성 있게 설명할 수 있어요. — target uses words not admitted at this LEGO: 설명할

</details>

## kor_for_eng S0511L03 — "to each person" = 사람에게


**Opus**

| role | English | target |
|---|---|---|
| B | want to give to each person | 사람에게 주고 싶어요 |
| B | going to try to explain to each person | 사람에게 설명해 볼 거예요 |
| B | wanted to send a message to each person | 사람에게 메시지를 보내고 싶었어요 |
| B | it's important to each person | 사람에게 중요해요 |
| U | I want to give more time to each person | 사람에게 시간을 더 주고 싶어요 |
| U | I'm going to try to explain what I mean to each person | 사람에게 무슨 뜻인지 설명해 볼 거예요 |
| U | I don't think it's very important to each person | 사람에게 별로 중요하지 않은 것 같아요 |
| U | she wanted to send a message to each person last week | 그녀는 지난주에 사람에게 메시지를 보내고 싶어했어요 |
| U | I don't know how to say it to each person | 사람에게 그걸 어떻게 말하는지 몰라요 |

**Codex (gpt-6.1-sol)**

| role | English | target |
|---|---|---|
| B | want to speak to each person | 모든 사람에게 말하고 싶어요 |
| B | going to try to explain to each person | 모든 사람에게 설명해 볼 거예요 |
| B | can give a book to each person | 모든 사람에게 책을 줄 수 있어요 |
| B | need to talk to each person | 모든 사람에게 이야기해야 해요 |
| U | why do you want to give more time to each person? | 왜 모든 사람에게 시간을 더 주고 싶어요? |
| U | he said that he wants to show something to each person tomorrow | 그는 내일 모든 사람에게 뭔가 보여 주고 싶다고 했어요 |
| U | yes, I'll ask what they need to each person before you go | 네 가기 전에 모든 사람에게 뭐가 필요한지 물어볼 거예요 |
| U | thank you for trying to explain to each person how to say this word in Korean | 모든 사람에게 이 단어를 한국어로 어떻게 말하는지 설명해 주려고 하는 게 고마워요 |

<details><summary>6 rejected by the gates</summary>

- pass 1 · I'm sorry, but I don't have enough time to give a different answer to each person = 미안해요, 하지만 모든 사람에게 다른 답을 줄 시간이 충분하지 않아요 — interjection at the front is not yet admitted for this basket (it must be a taught chunk this basket owns, with its taught target form)
- pass 2 · I'm going to explain to each person = 모든 사람에게 설명할 거예요 — target uses words not admitted at this LEGO: 설명할
- pass 2 · you should say something to each person = 모든 사람에게 뭔가 말해야 해요 — target uses words not admitted at this LEGO: 말해야
- pass 2 · I don't know how to explain the problem to each person, but I want to try = 모든 사람에게 문제를 어떻게 설명하는지 몰라요, 하지만 해 보고 싶어요 — target uses words not admitted at this LEGO: 설명하는지
- pass 2 · I think it's important to give the same book to each person as quickly as possible = 가능한 한 빨리 모든 사람에게 같은 책을 주는 게 중요하다고 생각해요 — target uses words not admitted at this LEGO: 주는 중요하다고
- pass 2 · if you want to say something to each person, we need a little more time = 모든 사람에게 뭔가 말하고 싶으면 시간이 조금 더 필요해요 — target uses words not admitted at this LEGO: 싶으면

</details>

## kor_for_eng S0636L02 — "jane's bag" = 제인의 가방인


**Opus**

| role | English | target |
|---|---|---|
| B | I think it is Jane's bag | 그게 제인의 가방인 것 같아요 |
| B | maybe it's Jane's bag | 아마 제인의 가방인 것 같아요 |
| B | I think this is Jane's bag | 이건 제인의 가방인 것 같아요 |
| B | now I think it's Jane's bag | 지금 제인의 가방인 것 같아요 |
| U | I'm not sure, but I think it's Jane's bag | 모르겠어요, 하지만 제인의 가방인 것 같아요 |
| U | no, I think this is Jane's bag | 아니요, 이건 제인의 가방인 것 같아요 |
| U | yes, I think that blue thing is Jane's bag | 네, 그 파란 것은 제인의 가방인 것 같아요 |
| U | I think it's Jane's bag, so I want to give it to her | 제인의 가방인 것 같아요, 그래서 그녀한테 주고 싶어요 |
| U | I think it's Jane's bag, but I'm not sure if it's true | 제인의 가방인 것 같아요, 하지만 그게 사실인지 모르겠어요 |

<details><summary>4 rejected by the gates</summary>

- pass 1 · I think that is Jane's bag = 그건 제인의 가방인 것 같아요 — ZUT: the course already renders "I think that is Jane's bag" as "교회가 제인의 가방인" (seed 636)
- pass 1 · I'm not sure if it's Jane's bag = 제인의 가방인지 모르겠어요 — containment: target does not contain the LEGO "제인의 가방인"; target uses words not admitted at this LEGO: 가방인지
- pass 1 · I'm sorry but I'm not sure if it's Jane's bag = 미안하지만 제인의 가방인지 모르겠어요 — containment: target does not contain the LEGO "제인의 가방인"; target uses words not admitted at this LEGO: 가방인지
- pass 1 · I wonder if it's Jane's bag = 제인의 가방인지 궁금해요 — containment: target does not contain the LEGO "제인의 가방인"; target uses words not admitted at this LEGO: 가방인지

</details>

**Codex (gpt-6.1-sol)**

| role | English | target |
|---|---|---|
| B | I think it's jane's bag | 제인의 가방인 것 같아요 |
| B | I know it's jane's bag | 제인의 가방인 걸 알아요 |
| B | I don't think it's jane's bag | 제인의 가방인 것 같지 않아요 |
| U | can you tell me how you know that it's jane's bag? | 어떻게 제인의 가방인 걸 아는지 말해 줄 수 있어요? |
| U | if I'd known it was jane's bag I'd have waited | 제인의 가방인 걸 알았더라면 기다렸을 거예요 |
| U | I know that it's jane's bag but I don't want to give it to him | 제인의 가방인 걸 알아요 하지만 그한테 그걸 주고 싶지 않아요 |
| U | thank you, I think that one over there is jane's bag | 고마워요, 저건 제인의 가방인 것 같아요 |

<details><summary>4 rejected by the gates</summary>

- pass 1 · yes, I think that one over there is jane's bag, but I've never seen her before = 네, 저건 제인의 가방인 것 같아요, 하지만 그녀를 전에 한 번도 본 적 없어요 — target uses words not admitted at this LEGO: 그녀를
- pass 1 · I want to ask her if it's jane's bag before we go home = 집에 가기 전에 제인의 가방인 것 같은지 그녀한테 물어보고 싶어요 — target uses words not admitted at this LEGO: 같은지
- pass 2 · do you think it's jane's bag? = 제인의 가방인 것 같아요? — duplicate target
- pass 2 · I want to know that it's jane's bag before I give it to him = 그한테 주기 전에 제인의 가방인 걸 알고 싶어요 — target uses words not admitted at this LEGO: 주기

</details>

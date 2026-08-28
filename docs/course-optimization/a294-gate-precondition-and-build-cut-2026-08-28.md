# How many of the phrases you read would have passed the gate

**Six of the twelve.** That is the finding.

You read 12 LEGO sets — 6 Italian, 6 Chinese. Replayed against the real
`/api/seed/complete` gates, six of them pass every gate and six do not. Every
one of the six failures is the same gate, `knownSide` — the English side using
words the learner has not been given. Which is the thing you suspected while
reading them: *"some of them look as though they might have used vocabulary that
wasn't included."* You were right, and it is worse in Chinese than in Italian.

Not one of them failed on ZUT, on vocabulary in the target language, on
containment, or on the phrase floors. The target side was clean throughout. It
was the English that leaked.

---

## The twelve, one line each

| # | LEGO | verdict |
|---|---|---|
| 1 | you want → vuoi | **pass** |
| 2 | can you tell me → puoi dirmi | **pass** |
| 3 | something else → qualcos'altro | **pass** |
| 4 | while they're still → finché sono ancora | **pass** |
| 5 | the beach → la spiaggia | **pass** |
| 6 | do you want to go → vuole andare | **fail** — known side |
| 7 | tomorrow → 明天 | **pass** |
| 8 | know a young man → 认识一个年轻男人 | **fail** — known side |
| 9 | currently → 正在 | **fail** — known side |
| 10 | what one wants to do → 想做什么 | **fail** — known side |
| 11 | who → 谁 | **fail** — known side |
| 12 | to hope → 希望 | **fail** — known side |

Italian: 5 of 6. Chinese: 1 of 6.

## What each failure actually was

**Italian, "do you want to go".** One breach, one word.

> do you want to go **into** the garden → vuole andare in giardino

"into" had never been taught. That is the whole failure — everything else in
that set was clean.

**Chinese, all five.** Every single breach is an *inflection* of a word the
learner already has. Not one is a genuinely new word.

> currently **drinking** coffee → 正在喝咖啡 — "drink" is taught at seed 217; "drinking" is not
> because he is currently **reading** a story → 因为他正在读故事 — "to read" at seed 35; "reading" is not
> the teacher **hopes** → 老师希望 — "hope" at seed 11; "hopes" is not
> **knowing** a young man is very interesting — "know" is taught; "knowing" is not
> nobody **understands** clearly what he wants to do — "understand" at seed 49; "understands" is not

I checked all sixteen offending words against the Chinese course. Every base
form is taught: drink, deal, read, write, discuss, understand, find, drive,
promise, pay, meet, come, know, hope. The generator inflected them.

**This is a real breach, not a checker artefact, and I have not touched the
gate.** It is your own rule doing exactly what you told it to do — the
`zho_for_eng` contract carries your ruling of 2026-06-15 in as many words:

> A known form is usable ONLY if it was introduced as a LEGO or a COMPONENT —
> EXACT form, no stemming. "tried" / "wants" / "going" each need their own
> debut; they are NOT licensed by an introduced "try"/"want"/"go".

So the gate is right by your own standard, and Chinese generation under
enforcement would be refused most of the time until the generator stops
inflecting. **One question back to you** — see the bottom of this doc.

---

## What is now in place so this cannot happen again

**The gate is machinery now, not a request in a prompt.** The read-only replay
of the real submission gates existed, but it lived on a gitignored path in one
worktree, which is not a precondition of anything. It is now committed at
`tools/phrase-gate/gate-check.cjs`, and the v3 generator calls it in-process:

- every set generated is gated **and** scored before the function returns;
- a failing set is **regenerated**, with the gate's own words about the exact
  offending phrase quoted back to the model — not returned with a warning;
- two retries, then it comes back marked **blocked**, carrying its failure list,
  so nothing can show it to you as if it had passed;
- the verdict and the score travel with the set, so a sampler building a doc for
  you can only show what carries a pass.

The gates it runs are the ones the live route runs: bare-LEGO, phrase floors,
containment, target vocabulary, BUILD recombination, ZUT, known side. Plus one
new one — the BUILD count, below.

**BUILD is now three or four.** The prompt asked for at least four and got five
and six. It now asks for four, says three is acceptable and five is wrong, and
says what they are *for*: a couple of the new LEGO plus one previous, a couple
plus two previous, varied. USE is untouched in count, in floor and in content —
you said the USE phrases were good and I have changed nothing about them.

The shared validator's own BUILD floor stays at 3. I did not lower it; lowering
it would let genuinely thin sets through everywhere else in the estate.

---

## The same LEGOs, regenerated under the new rules

Four regenerated through the enforced door. Three passed every gate first time
with four BUILDs; the fourth — the worst Chinese one — failed, was handed its own
failures back, and passed on the retry. The loop works. What came out of that
retry is the most interesting thing in this doc, and it is at the bottom.

### "do you want to go" → vuole andare — the one that used to fail

**Before** — 6 BUILD, and one of them broke the known side:

- do you want to go **into the garden** → vuole andare in giardino ← the breach

**After** — 4 BUILD, gate clean:

- when do you want to go → quando vuole andare
- do you want to go upstairs → vuole andare di sopra
- do you really want to go for supper → davvero vuole andare a cena
- if you want to go now → se vuole andare adesso

USE (6):

- do you want to go for supper tonight, madam → vuole andare a cena stasera, signora
- do you really want to go so late, madam → davvero vuole andare così tardi, signora
- do you want to go before thursday or on tuesday → vuole andare prima di giovedì o martedì
- if you want to go I can help you, madam → se vuole andare posso aiutarla, signora
- do you want to go somewhere else for a while → vuole andare altrove per un po'
- but do you really want to go → ma davvero vuole andare

### "you want" → vuoi — what four BUILDs looks like

- you want to come back → vuoi tornare
- I'm not sure if you want to → non sono sicuro se vuoi
- but you want to meet up this evening → ma vuoi incontrarci questa sera
- you want to learn a word in Italian → vuoi imparare una parola in italiano

Two of those are the LEGO plus one previous piece, two are the LEGO plus two.
That is the shape you described.

### "tomorrow" → 明天

- tomorrow I too can speak → 明天我也能说
- tomorrow I'm going to explain → 明天我要解释
- I want to use Chinese tomorrow → 我想明天用中文
- someone else cannot explain tomorrow → 别人明天不能解释

Gate clean. The scorer marks its USE half honestly short — 5 distinct
neighbour × pattern combinations where it wants 6, and only 2 of the 5 pattern
axes moving where it wants 3. That shortfall is reported, not hidden; it does
not block, because it is a quality note rather than something the learner
cannot produce.

---

### "currently" → 正在 — refused, then repaired, and you need to see the result

This is the set that failed on eight breaches. The gate refused it, quoted the
offending phrases back, and the second attempt passed every gate:

BUILD:

- currently drink coffee → 正在喝咖啡
- currently attend the meeting → 正在参加会议
- he is currently learning chinese → 他正在学习中文
- who is currently going home → 谁正在回家

USE:

- most people currently attend the party → 大多数人正在参加聚会
- which of your friends currently pay the money → 你哪些朋友正在付钱
- he is currently going home so I don't need to come and help → 他正在回家所以我不需要来帮忙
- which man is currently going by bus → 哪个男人正在坐公交车
- I wonder if he is currently learning chinese → 我想知道他是不是正在学习中文
- he is currently learning chinese with me → 他正在和我学习中文
- a few friends currently drink coffee → 几个朋友正在喝咖啡

**Every gate passes. And the English is wrong.** "most people currently attend
the party". "which of your friends currently pay the money". "a few friends
currently drink coffee". That is not stilted-but-tileable — that is
ungrammatical, tier three on your own clunkiness scale. The model could not
write "drinking" so it wrote "drink", and English does not allow it.

The scorer caught part of it independently — it marks that USE set short, one
phrase the learner could not produce from its own prompt and only one of the
three positions used. But the gates said yes, and a human reading it would say
no. That is the honest state of things and I am not going to dress it up.

---

## One decision for you

**Should the English side allow inflections of a word already taught?**

Your 2026-06-15 ruling says no — exact form only, "wants" needs its own debut.
Under enforcement that ruling refuses roughly five Chinese sets in six, and
every one of the sixteen refusals is a `-s`, `-ing` or `-ed` on a verb the
learner already knows. And the repair, above, is worse English than the breach.

- **(a) Leave the rule alone.** Cost: the "currently drink coffee" set above is
  what the generator produces when it obeys. It passes every machine check and
  fails a human ear. We would then need a clunkiness check on top to catch it,
  which is a second gate to build.
- **(b) Free `-s` / `-ing` / `-ed` on an already-taught word**, on the English
  side only, the way "the" and "to" are already free glue. Cost: the learner
  meets "drinking" without having been given it as its own piece.

**My read: (b).** The reason the rule exists is that a learner cannot produce a
form they were never given — but in Chinese every one of these inflections
collapses to the same target character, so there is no different form to
produce and no production fork to open. ZUT is untouched by it. Where the
inflection *does* change the target — Italian, Spanish — the target vocabulary
gate catches it independently and this change gives away nothing. And (a) has
now shown us its price in your own sample: correct-by-the-machine English that
no native speaker would say.

It is a ratified contract and your ruling, so I have changed nothing. Say "a"
or "b" and I will apply it.

## And the thing the whole sample was for

The v3 door is built, gated and pushed on `feat/phrase-prompt-v3-opus`. It is
**not merged** — because merging it is the decision you were asked for on
A-294, and it is still yours. One sentence from you lands it.

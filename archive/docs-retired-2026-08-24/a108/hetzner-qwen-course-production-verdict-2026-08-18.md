# Can the free Qwen model do our course work? — the verdict

*Probe run 2026-08-18. Model: Qwen3.6-35B on Hetzner's free inference endpoint. 51 real course tasks
drawn from finished fra_for_eng and spa_for_eng content, so every answer could be marked against the
line a human actually shipped.*

---

## The short answer

| Task | Can Qwen take it over? |
|---|---|
| **Straight translation** | **No, not on its own.** Right about half the time. When it's wrong it's wrong in ways that read perfectly fluently. |
| **Register — tu/vous, no parentheses** | **Yes.** Clean across all 36 translations. Not one slip. |
| **Breaking a sentence into LEGOs** | **No. This is the clear failure.** It got 2 out of 15 right. |
| **Writing practice phrases** | **Yes — as a first draft behind our existing validator.** Perfect structure, leaky content, and the leaks are exactly what the validator already rejects. |

The pattern underneath all four rows: **Qwen is good at form and bad at memory.** Anything you can
tell it in the prompt, it obeys. Anything that depends on remembering what the rest of the course
has already done, it gets wrong.

---

## Translation — half right, and the wrong half is dangerous

It matched the human line word-for-word on **14 of 26**. Of the 12 misses, three are honestly just a
different word choice — *ensuite* where we said *puis*, *amarse* where we said *quererse*. Those are
still a problem, because two names for one thing is exactly what we don't allow, but they're not
errors of French or Spanish.

The other nine are real, and this is the part worth your attention. Every one of them reads like
confident, fluent, native-sounding language. Nothing looks broken.

- **"Why are you not happy any more?"** came back as *¿Por qué no estás más feliz?* — which means
  "why aren't you happier". Different question.
- **"nobody was sure how to answer"** came back as *personne ne savait* — "nobody knew". Different
  meaning.
- **"a shop where I can buy some postcards"** came back as *donde puedo comprar* instead of *donde
  pueda*. That's the grammar mistake a Spanish learner is specifically taught not to make.
- **"the one who is walking"** came back as *el que camina* — wrong gender, and the "is walking"
  has quietly become "walks".
- That last one isn't a one-off. **Three separate times in Spanish it flattened "I'm starting",
  "they're trying", "is walking" into plain "I start", "they try", "walks".** It has a habit.
- **"when you work at something difficult"** came back missing a word, giving *travailles quelque
  chose* — not grammatical French.

None of these would be caught by anything we currently run. They'd go straight into a course and
sound fine right up until a learner said one to a French or Spanish speaker.

**Where it is genuinely reliable:** it never once used a parenthesis, never once slipped into formal
*vous* or *usted* where we wanted informal, and never added a note or an explanation. Those are the
rails we were most worried about, and it holds them without complaint.

---

## Breaking sentences into LEGOs — this one it cannot do

15 sentences. It returned perfectly well-formed answers every single time. **Only 2 were right.**

The reason is a single mistake, made over and over: **it re-teaches things the learner already
knows.** In 9 of the 15 it handed back chunks that are already in the learner's vocabulary as if they
were brand new. Given "I think that you left them at work", where the only genuinely new piece is
*left them*, it broke the whole sentence into five pieces and offered all five — including *I think
that*, which the learner has had for ages.

It was told, in the prompt, in plain words, with the vocabulary list right there, not to do this. It
did it anyway. Once it even invented a chunk (*convertirnos en*) that isn't in the sentence at all.

This is the memory problem in its purest form. Deciding what's new requires holding the whole course
in your head. The model doesn't, and telling it to doesn't fix it. **I'd not put this task anywhere
near it.**

---

## Practice phrases — the surprise, and the good news

This is where it does best, and it's worth understanding why.

**Everything structural was perfect.** All 10 came back in valid, parseable form. All 10 hit the
floors — at least 4 BUILD and at least 5 USE, every time, no arguing, no "here are three good ones
instead of nine". Zero parentheses.

**The content leaks.** 6 of the 10 used words the learner hasn't been given yet. 3 produced phrases
that had dropped the very LEGO they were supposed to be practising — for *shape*, all five USE
phrases forgot to mention shape. And some of the English is clunky in the way we've ruled out:
"We are meeting so far", "I am trying so far", "I was ready since this morning".

**But here is the thing that matters:** every one of those leaks is something our own course-builder
validator already checks and already rejects, mechanically, for free. Untaught vocabulary, missing
LEGO, floors, parentheses — that's the existing gate's day job.

So phrase generation is the one place I'd actually use this today: **let it draft, let the validator
bounce what's bad, and a human only ever looks at what survived.** The worst case is wasted machine
time, not bad content reaching a learner. That's a genuinely different risk profile from translation,
where the bad output sails through everything.

---

## Thinking mode — a correction to what we thought

The earlier note said thinking mode cost about 25x and produced identical output. **Both halves of
that are wrong**, and it's worth putting straight.

It is **not** identical. On 10 translations run both ways, the answers differed on 5. It's also not
25x — measured properly it's **141x the generated tokens**, and about seven times the wall-clock
wait: roughly 3½ minutes a sentence against 30 seconds.

But the conclusion still lands in the same place, for a better reason. Thinking mode **fixed two of
the errors and introduced two new ones**. Same score, 6 out of 10, different mistakes. It did
genuinely repair the broken French — it put the missing word back into *travailles sur quelque
chose* — but it also dropped a word from a sentence fast mode got right.

And on the longer jobs it simply doesn't work: **all 8 decomposition and phrase attempts in thinking
mode died on gateway timeouts.** The prompts are too long, it thinks for too long, the connection
gives up.

**No net gain, 141x the cost, and it can't finish the big jobs. Leave it off.**

---

## What a verification gate would actually need to catch

Splitting this into the two halves that matter, because they're not the same problem.

**Already covered — our validator catches these today, for nothing:**
untaught vocabulary, phrases missing their LEGO, phrase-count floors, chunks that don't tile the
sentence, chunks invented from thin air, re-teaching known vocabulary, parentheses. This is why
phrase drafting is safe and decomposition drafting is merely wasteful rather than dangerous.

**Not covered — nothing we run would catch any of these:**

1. **Meaning drift that reads fluently.** "Why aren't you happier" for "why are you no longer happy".
   Grammatical, natural, wrong. Needs a check that goes back the other way — translate the model's
   answer back to English independently and see whether it still says what we asked for.
2. **Dropped continuous aspect.** "I'm starting" becoming "I start". It did this three times out of
   27 Spanish items — frequent enough to be worth a targeted check, and mechanical enough to write
   one: English *am/is/are + -ing* should almost always come back as *estar + -ndo*.
3. **Mood and gender.** *puedo* where the sentence requires *pueda*; *el que* where it should be
   *la que*. Both are narrow, rule-shaped, and a targeted checker could carry them.
4. **Course-wide consistency.** The single biggest one. *ensuite* and *puis* are both perfectly good
   French. The problem is only visible when you know we already used *puis* somewhere else. No
   check on a single sentence can ever see this — it needs the answer held up against everything the
   course has already said. **This is the gate we don't have and would need to build.**
5. **Clunky English on the known side.** "We are meeting so far" is not wrong so much as not
   something anyone says. This one I'd keep for a human ear; it's a taste judgement.

Rough shape of the recommendation: items 2 and 3 are cheap mechanical checkers worth writing. Item 1
needs a second model doing an independent back-translation. Item 4 is a real build and the highest
value of the lot. Item 5 stays with a person.

---

## Practical notes

**It's much faster than we assumed.** The earlier run was making one call at a time and waiting
about a minute for each. The wait turns out to be queueing, not the model working — **six calls at
once finish in the same time as one.** The full 51-task pass took about twelve minutes rather than
the three to four hours budgeted. If we do use this model for anything, run it wide.

**Reliability was fine where it counts:** 51 out of 51 normal-speed calls succeeded, no failures, no
rate-limiting. Every failure in the whole run was thinking mode timing out.

---

## Gaps in this probe — stated honestly

- **Two languages only**, French and Spanish, both close to English and both well represented in any
  model's training. I would not carry these numbers over to Welsh, Japanese or Yoruba without
  re-running. If anything, expect worse.
- **The "half right" figure is exact-match against one human line.** It's the honest headline number
  but it treats a legitimate synonym the same as a real mistake. That's why I read all 12 misses by
  hand above rather than leaving you with the percentage.
- **Small samples on the harder classes** — 15 decompositions and 10 phrase sets. The decomposition
  result is lopsided enough (2 out of 15, same mistake every time) that I don't think more samples
  change the verdict. The phrase result would firm up with more.
- **Thinking mode is under-sampled on the long jobs** because they all timed out. "It doesn't work on
  long prompts" is a real finding, but it means we have no quality read there at all.
- **No cost problem to report:** the endpoint is free and no billing was touched.

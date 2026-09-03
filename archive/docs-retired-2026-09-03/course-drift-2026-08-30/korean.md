# Korean drift proposal — `kor_for_eng` and `kor_for_hin`

**Propose only. Nothing applied. No DB writes.** Derived read-only from the live DB on 2026-08-30.
Reference course for "what the estate actually does": `kor_for_tam` (surveyed clean).

---

## Headline

**`kor_for_eng` — 39 drill lines to change, across 8 lessons.** The survey said "3 of 12 lessons
in seeds 628–653". I find **8 lessons**, and the pocket runs to seed 668, not 653. Two of the three
biggest are ones a keyword scan cannot see, because both the lesson and the drills carry an
honorific — just *different* ones (`말해 주실` taught, `말씀해` drilled; `가고 싶으세요` taught,
`가시고 싶으세요` drilled). I am **refusing to change 3 further lessons** (seeds 660, 661, 667) where
the drills already match their own lesson and the contradiction is between two lessons *inside the
same seed* — Tom's ruling does not reach those. And I am refusing the whole class of
honorific-vs-plain collisions between seeds 642–655 and 656–668, where the same English sentence is
drilled in two registers by design.

**`kor_for_hin` — 0 drill lines under the ruling. This one is a lesson-level change: 11 lessons
plus 89 of their drills, all in seeds 642–655.** The survey is right that both batches are
internally clean. It is wrong about the cause: this is **not** a one-day boundary. Seeds 630–668
were all written in a single 23-minute run on 29 July 03:07–03:19 UTC. Seeds 640–641 and 656–668,
written in the same minutes, are plain 해요체. The formal 합쇼체 (`-십니까`/`-습니다`) is confined
to exactly the fourteen seeds that are the "speaking to sir/madam" pocket. It is a **topic pocket
rendered in the wrong register**, and both sibling Korean courses render that same pocket in
`-세요`. Moving it back introduces **0 new ZUT breaks and resolves 1 existing hard one**, and it
reveals that 3 of the 11 lessons then teach nothing new.

---

# Part 1 — `kor_for_eng` (Korean for English speakers)

## Where the honorific pocket actually is

Scanning all 1,459 lessons, only **31 carry an honorific marker**, and they sit in seeds
**623–667** — one authoring batch, 2026-06-10. Inside that batch the course does something
deliberate and, on its own terms, coherent:

- **seeds 642–655** — the learner addresses `선생님` / `여사님` (sir / madam). Honorific `-세요`.
- **seeds 656–668** — the learner addresses `여러분` (you all). Plain `-요`.

The two blocks drill **the same English sentences** in the two registers, on purpose. That is the
frame everything below sits in.

*(Note on my brief's starting numbers: the crude four-ending regex in
`scripts/drift-proposal/kor.cjs` is indeed untrustworthy — it fires on `마시고`, the stem of
마시다 "to drink", which has nothing to do with the honorific `-시-`. Masking 마시/마셔/마셨 and the
handful of other 시-final stems before matching removes the false positives. I did not use its
numbers.)*

## What I found, and how it differs from the survey

| Lesson | Taught | Drilled | Drills wrong | Survey saw it? |
|---|---|---|---|---|
| `S0644L03` | `말해 주실 수 있어요` | `말씀해` | 9 | no — both sides honorific |
| `S0644L04` | `주시겠어요` (+ seed teaches `말해`) | `말씀해 주시겠어요` | 7 | no |
| `S0650L02` | `가고 싶으세요` | `가시고 싶으세요` | 9 | no — both sides honorific |
| `S0658L02` | `여러분 원해요` | `원하세요` | 9 | probably yes |
| `S0652L02` | `필요하세요` | `필요해요` (1 line) | 1 | possibly |
| `S0655L03` | `잘 하고 계신` | `잘 하고 있어요` (2 lines) | 2 | possibly |
| `S0657L02` | seed teaches `어때요` | `어떠세요` (1 line) | 1 | no |
| `S0665L02` | `가고 싶어요` | `가시고 싶으세요` (1 line) | 1 | no |

**39 lines.** Applying all 39 to a full-course ZUT recheck: **4 collision groups resolved, 1 new one
introduced** — and that one new break is itself diagnostic, see the flag below.


## The 39 proposed rewrites — every line

| phrase id | role | taught lego | drill known | BEFORE | AFTER |
|---|---|---|---|---|---|
| `S0644L03B01` | build | S0644L03 — could you say that sir? → 선생님 그거 말해 주실 수 있어요? | please say | 말씀해 | **말해** |
| `S0644L03B02` | build | S0644L03 — could you say that sir? → 선생님 그거 말해 주실 수 있어요? | she asked sir to say that | 교회가 선생님 그거 말씀해 했어요 | **교회가 선생님 그거 말해 했어요** |
| `S0644L03B03` | build | S0644L03 — could you say that sir? → 선생님 그거 말해 주실 수 있어요? | the church asked to say | 교회가 말씀해 알아요 | **교회가 말해 알아요** |
| `S0644L03U01` | use | S0644L03 — could you say that sir? → 선생님 그거 말해 주실 수 있어요? | sir please say that | 선생님 그거 말씀해 | **선생님 그거 말해** |
| `S0644L03U02` | use | S0644L03 — could you say that sir? → 선생님 그거 말해 주실 수 있어요? | she asked sir to say it | 선생님 말씀해 알아요 | **선생님 말해 알아요** |
| `S0644L03U03` | use | S0644L03 — could you say that sir? → 선생님 그거 말해 주실 수 있어요? | she knows sir will say it | 선생님 그거 말씀해 알아요 | **선생님 그거 말해 알아요** |
| `S0644L03U04` | use | S0644L03 — could you say that sir? → 선생님 그거 말해 주실 수 있어요? | now sir please say | 지금 선생님 말씀해 | **지금 선생님 말해** |
| `S0644L03U05` | use | S0644L03 — could you say that sir? → 선생님 그거 말해 주실 수 있어요? | still she asked sir to say it | 아직도 선생님 말씀해 있어요 | **아직도 선생님 말해 있어요** |
| `S0644L03U06` | use | S0644L03 — could you say that sir? → 선생님 그거 말해 주실 수 있어요? | she thought about what sir said | 선생님 말씀해 생각하려고 해요 | **선생님 말해 생각하려고 해요** |
| `S0644L04B03` | build | S0644L04 — could you? (polite request) → 주시겠어요? | she thought could you say? | 말씀해 주시겠냐고 했어요 | **말해 주시겠냐고 했어요** |
| `S0644L04U01` | use | S0644L04 — could you? (polite request) → 주시겠어요? | could you say that sir? | 선생님 그거 말씀해 주시겠어요? | **선생님 그거 말해 주시겠어요?** |
| `S0644L04U02` | use | S0644L04 — could you? (polite request) → 주시겠어요? | could sir say that? | 선생님 말씀해 주시겠어요? | **선생님 말해 주시겠어요?** |
| `S0644L04U03` | use | S0644L04 — could you? (polite request) → 주시겠어요? | could you say that? | 그거 말씀해 주시겠어요? | **그거 말해 주시겠어요?** |
| `S0644L04U04` | use | S0644L04 — could you? (polite request) → 주시겠어요? | still could you say that? | 아직도 그거 말씀해 주시겠어요? | **아직도 그거 말해 주시겠어요?** |
| `S0644L04U05` | use | S0644L04 — could you? (polite request) → 주시겠어요? | now could you? | 지금 말씀해 주시겠어요? | **지금 말해 주시겠어요?** |
| `S0644L04U06` | use | S0644L04 — could you? (polite request) → 주시겠어요? | she asked if sir could say that | 선생님 그거 말씀해 주시겠냐고 했어요 | **선생님 그거 말해 주시겠냐고 했어요** |
| `S0650L02B01` | build | S0650L02 — do you want to go madam? → 여사님 가고 싶으세요? | want to go | 가시고 싶으세요? | **가고 싶으세요?** |
| `S0650L02B02` | build | S0650L02 — do you want to go madam? → 여사님 가고 싶으세요? | sir asked if he wants to go | 교회가 선생님 가시고 싶으세요 | **교회가 선생님 가고 싶으세요** |
| `S0650L02B03` | build | S0650L02 — do you want to go madam? → 여사님 가고 싶으세요? | she wonders if she wants to go | 교회가 가시고 싶으세요 알아요 | **교회가 가고 싶으세요 알아요** |
| `S0650L02U01` | use | S0650L02 — do you want to go madam? → 여사님 가고 싶으세요? | do you want to go madam? | 여사님 가시고 싶으세요? | **여사님 가고 싶으세요?** |
| `S0650L02U02` | use | S0650L02 — do you want to go madam? → 여사님 가고 싶으세요? | sir asked if the madam wants to go | 선생님 여사님 가시고 싶으세요? | **선생님 여사님 가고 싶으세요?** |
| `S0650L02U03` | use | S0650L02 — do you want to go madam? → 여사님 가고 싶으세요? | now does she want to go? | 지금 가시고 싶으세요? | **지금 가고 싶으세요?** |
| `S0650L02U04` | use | S0650L02 — do you want to go madam? → 여사님 가고 싶으세요? | still does she want to go? | 아직도 가시고 싶으세요? | **아직도 가고 싶으세요?** |
| `S0650L02U05` | use | S0650L02 — do you want to go madam? → 여사님 가고 싶으세요? | she wonders if the madam wants to go | 여사님 가시고 싶으세요 알아요 | **여사님 가고 싶으세요 알아요** |
| `S0650L02U06` | use | S0650L02 — do you want to go madam? → 여사님 가고 싶으세요? | does sir want to go? | 선생님 가시고 싶으세요? | **선생님 가고 싶으세요?** |
| `S0652L02U04` | use | S0652L02 — what do you need sir? → 선생님 뭐가 필요하세요? | now what does she need? | 지금 무엇이 필요해요 | **지금 무엇이 필요하세요** |
| `S0655L03U03` | use | S0655L03 — is doing well → 잘 하고 계신 | now she's doing well | 지금 잘 하고 있어요 | **지금 잘 하고 계세요** |
| `S0655L03U04` | use | S0655L03 — is doing well → 잘 하고 계신 | still she's doing well | 아직도 잘 하고 있어요 | **아직도 잘 하고 계세요** |
| `S0657L02U02` | use | S0657L02 — mood/feeling → 기분이 | how does she feel | 기분이 어떠세요 | **기분이 어때요** |
| `S0658L02B01` | build | S0658L02 — do you all want? → 여러분 원해요? | do you want? | 원하세요? | **원해요?** |
| `S0658L02B02` | build | S0658L02 — do you all want? → 여러분 원해요? | does everyone want it? | 교회가 여러분 원하세요? | **교회가 여러분 원해요?** |
| `S0658L02B03` | build | S0658L02 — do you all want? → 여러분 원해요? | she knows what everyone wants | 교회가 여러분 원하세요 알아요 | **교회가 여러분 원해요 알아요** |
| `S0658L02U01` | use | S0658L02 — do you all want? → 여러분 원해요? | do you all want? | 여러분 원하세요? | **여러분 원해요?** |
| `S0658L02U02` | use | S0658L02 — do you all want? → 여러분 원해요? | now does she want it? | 지금 원하세요? | **지금 원해요?** |
| `S0658L02U03` | use | S0658L02 — do you all want? → 여러분 원해요? | sir asked the madam if she wants it | 선생님을 여사님이 원하세요? | **선생님을 여사님이 원해요?** |
| `S0658L02U04` | use | S0658L02 — do you all want? → 여러분 원해요? | still does she want it? | 아직도 원하세요? | **아직도 원해요?** |
| `S0658L02U05` | use | S0658L02 — do you all want? → 여러분 원해요? | she wonders if everyone wants | 여러분 원하세요 알아요 | **여러분 원해요 알아요** |
| `S0658L02U06` | use | S0658L02 — do you all want? → 여러분 원해요? | she asked if she wants the red one | 빨간 거예요 원하세요? | **빨간 거예요 원해요?** |
| `S0665L02U02` | use | S0665L02 — do you all want to go? → 여러분 다 가고 싶어요? | does everyone want to go? | 다들 가고 싶으세요? | **다들 가고 싶어요?** |

### Flags on the above

- **`S0658L02B01` creates a ZUT break, and the known side is the real defect.** After the change,
  known `do you want?` maps to `원해요` here and to `원하세요` at `S0643L02B01`. It does not break
  today only because the drill is currently drifting. The course distinguishes the two lessons
  *solely* by the parenthetical in `S0643L02`'s lesson label — `do you want? (honorific)` — which is
  a zero-explanation / no-parentheses violation in its own right. **The fix is on the known side**
  (differentiate `S0643L02` naturally, e.g. by a vocative), and it is not mine to make under this
  brief. Flagging, not guessing.
- **`S0658L02U03`** — known `sir asked the madam if she wants it`. The honorific is grammatically
  motivated by the `여사님` subject. The ruling still says bend to the lesson, so I have proposed it,
  but a Korean reader could reasonably keep this one line honorific. Judgement call.
- **`S0644L04` (7 lines) is consequential, not required by the ruling.** `S0644L04`'s own lesson is
  `주시겠어요?` — no speech verb — so strictly its drills don't contradict it. But seed 644 teaches
  `말해`, and leaving `말씀해` here would strip it from `L03` and keep it in `L04` in the same seed.
  `말씀` is not introduced anywhere until seed 648, so `말씀해` at 644 is also a forward reference.
- **`S0655L03U03`/`U04`** — the lesson is `잘 하고 계신` (adnominal); the drills need a finite ending,
  and their siblings `U01`/`U02` already use `계세요`. I match the siblings.
- **`S0657L02U02`** — the lesson `기분이` carries no register of its own. The evidence is the sibling
  lesson in the same seed, `S0657L03 → 어때요`. Slightly weaker footing than the rest; still clear.

## Not proposing to change — `kor_for_eng`

**The lesson is the defect, not the drills — three seeds where two lessons inside one seed
contradict each other.** In each case the drills faithfully drill their own lesson, so the ruling
does not reach them. Each produces a hard ZUT break against the seed's own headline sentence:

- **seed 660** — `S0660L01` teaches `여러분을 도와줄 수 있어요` (plain), `S0660L02` teaches
  `도와드릴 수` (humble). Drill `S0660L02U01` carries the identical English as `S0660L01`'s lesson
  and lands on `도와드릴`. One of the two lessons has to go.
- **seed 661** — `S0661L02` teaches `뭔가 하고 있어요` (plain), `S0661L03` teaches `하고 계세요`
  (honorific). `S0661L03U01` collides with `S0661L02`'s own sentence.
- **seed 667** — `S0667L01` teaches `여러분 다 괜찮아요` (plain), `S0667L02` teaches `괜찮으세요`
  (honorific). `S0667L02U05` collides with `S0667L01`'s own sentence.
- **seed 663** — same shape (`말한 것` vs `말씀하신 것`) but `S0663L02` has no drills at all, so there
  is nothing to bend.

**Honorific-vs-plain collisions between the 642–655 and 656–668 blocks — by design, not drift.**
About 20 further ZUT groups are two lessons in the two blocks drilling the same English:
`now is she ready?` → `준비되셨어요` / `준비됐어요`; `still does she want to go?` → `가고 싶으세요` /
`가고 싶어요`; `now how does she think?` → `생각하세요` / `생각해요`; and so on. Neither side drifts
from its own lesson. The defect is that the drill-writer reused identical English prompts for two
deliberately different registers — a known-side problem, out of this brief's scope.

**Honorific vocabulary in the 여러분 block's drills where the lesson carries no verb.** Lines like
`S0656L01U02 선생님을 여러분과 말하세요` and `S0663L01U05 여러분이 도와드릴 수 있어요` sit on lessons
that are bare nouns (`여러분과`, `여러분이`). At those seeds `말하세요` (taught seed 647) and
`도와드릴` (taught seed 645) are the only forms the learner has been given — `말해요` does not arrive
until seed 662. Changing them would be a forward reference. Left alone.

**`S0652L02`'s `뭐가` → `무엇이` mismatch.** The lesson is `선생님 뭐가 필요하세요?`; all nine drills
say `무엇이`. That is a real lesson-vs-drill contradiction, but it is a word-choice defect, not a
register one, and it is outside this brief. Logged.

**The wider quality of this batch.** Seeds 615–668 contain a large volume of drills that are simply
broken Korean irrespective of register — `그녀는 목이 안 있어요` for "she's not tired at all",
`교회가` ("the church") appearing as filler in dozens of build lines, `커피가 마시고 싶어요` with the
wrong particle. `kor_for_eng` carries **300 ZUT collision groups course-wide**, of which only 24 are
register-related. The register pass fixes the register; it does not make this batch good.

---

# Part 2 — `kor_for_hin` (Korean for Hindi speakers)

## Tom's ruling does not decide this one

I checked every lesson in seeds 642–655 against every one of its drills. **The drills already match
their lessons — all 89 of them.** There is nothing here for "drills bend to the taught lego" to fix.
The register changed at the **lesson** level, and the drills followed it correctly.

**So this is a lesson-level change, and therefore a bigger decision than the three one-off cases.**
It rewrites what the course teaches, not just how it drills it.

## Correcting the survey's account of the cause

The survey describes a 27–28 July batch and a 29 July batch disagreeing across a one-day boundary.
The timestamps do not support that:

```
seed 640  Jul 29 03:07:20   빨간 / 거예요            ← plain 해요체
seed 641  Jul 29 03:07:21   거인 것 같아요            ← plain 해요체
seed 642  Jul 29 03:07:23   어떠십니까               ← formal 합쇼체 starts
  ...
seed 655  Jul 29 03:12:24   것 같습니다              ← formal 합쇼체 ends
seed 656  Jul 29 03:16:51   모두와 함께요             ← plain 해요체 resumes
seed 668  Jul 29 03:19:08   갈 수 있으면 좋겠어요      ← plain 해요체
```

Seeds 630–668 were written in **one 23-minute run**. There is no day boundary. The formal register
is confined to exactly the fourteen seeds that are the "addressing sir/madam" pocket — the same
content pocket that `kor_for_eng` and `kor_for_tam` mark with honorific `-세요`. The Hindi author
reached for 합쇼체 for the same job. That is a translation-choice decision made once, at the top of
a pocket, and applied consistently downward.

## Cross-check at the same seeds — all three Korean courses

| seed | content | `kor_for_hin` | `kor_for_eng` | `kor_for_tam` |
|---|---|---|---|---|
| 642 | how do you feel, sir | `어떠십니까` | `어떠세요` | `어때요 선생님` |
| 643 | do you want | `원하십니까` | `원하세요` | `원하세요` |
| 645 | I can help you | `도와드리겠습니다` | `도와드릴 수 있어요` | `도와드릴` |
| 646 | you're doing something | `계시네요` | `하고 계세요` | `계세요` |
| 649 | are you ready | `준비되셨습니까` | `준비되셨어요` | `됐나요` |
| 650 | do you want to go | `가시겠습니까` | `가고 싶으세요` | `가고 싶으세요` |
| 651 | what do you think | `생각하십니까` | `생각하세요` | `생각하세요` |
| 652 | what do you need | `필요하십니까` | `필요하세요` | `필요하세요` |
| 653 | are you okay | `괜찮으십니까` | `괜찮으세요` | `괜찮으세요` |
| 655 | you're doing well | `것 같습니다` | `것 같아요` | `잘 하고 계세요` |

`kor_for_eng` and `kor_for_tam` agree line for line. `kor_for_hin` is the outlier at every row.
Course-wide: `kor_for_hin` has 12 formal-deferential lessons, `kor_for_eng` has 1 and `kor_for_tam`
has 1 — and in both of those it is the single fixed formula `감사합니다` at seed 73.

## The one hard ZUT break the drift already causes

Two drills in seed 655 carry **byte-identical Hindi** and different Korean:

```
S0655L01U04  मुझे लगता है कि आप सच में अच्छा कर रही हैं  →  정말 잘하고 계신 것 같아요
S0655L02U02  मुझे लगता है कि आप सच में अच्छा कर रही हैं  →  정말 잘하고 계신 것 같습니다
```

The repair resolves it. Running the full-course ZUT check with all 100 changes applied:
**0 new collision groups, 1 resolved (this one), 100 → 99.**

## What the repair reveals — read this before deciding

Three of the eleven lessons, once returned to `-세요`, become **duplicates of lessons the course
already taught**:

| lesson | after | already taught at |
|---|---|---|
| `S0653L01` `कोई दिक्कत है` | `괜찮으세요` | `S0063L03` `कोई दिक्कत नहीं है` |
| `S0654L02` `पक्का नहीं है` | `모르겠어요` | `S0010L01` `यकीन नहीं है`, `S0135L03` `मुझे नहीं पता` |
| `S0655L02` `जान पड़ता है` | `것 같아요` | `S0114L02` `ऐसा लगता है` |

That is the tell for how the drift got in: the author needed a *new Hindi known string* to license
each formal variant of a Korean form the course had already taught in `-요`. `पक्का नहीं है` versus
`मुझे नहीं पता`; `जान पड़ता है` versus `ऐसा लगता है`. Distinct enough to slip past a strict ZUT
check, synonymous enough that once the register is normalised the lessons teach nothing. **Those
three lessons need a decision from Tom — normalise and leave them as redundant review, or replace
them with new content.** I am not proposing either.

Also note seeds 646, 647, 648, 654L01 and 655L01 are *already* `-요`-side inside the pocket
(`계시네요`, `말씀하시는군요`, `말씀하신 것이요`, and drills ending `모르겠어요` / `것 같아요`), so the
pocket is not even internally uniform in 합쇼체 today. The repair makes it uniform.

## The repair — 11 lessons and 89 drills, every line


| id | kind | known | BEFORE | AFTER |
|---|---|---|---|---|
| `S0642L01` | lego | कैसा लग रहा है | 어떠십니까 | **어떠세요** |
| `S0643L01` | lego | क्या आप चाहते हैं | 원하십니까 | **원하세요** |
| `S0644L02` | lego | बोल देंगे | 주시겠습니까 | **주시겠어요** |
| `S0645L01` | lego | मदद कर सकता हूँ | 도와드리겠습니다 | **도와드리겠어요** |
| `S0649L01` | lego | तैयार हो गए | 준비되셨습니까 | **준비되셨어요** |
| `S0650L01` | lego | जाना चाहती हैं | 가시겠습니까 | **가시겠어요** |
| `S0651L01` | lego | क्या सोचती हैं | 생각하십니까 | **생각하세요** |
| `S0652L01` | lego | दरकार है | 필요하십니까 | **필요하세요** |
| `S0653L01` | lego | कोई दिक्कत है | 괜찮으십니까 | **괜찮으세요** |
| `S0654L02` | lego | पक्का नहीं है | 모르겠습니다 | **모르겠어요** |
| `S0655L02` | lego | जान पड़ता है | 것 같습니다 | **것 같아요** |

### Drills (89)

| phrase id | role | taught lego | drill known | BEFORE | AFTER |
|---|---|---|---|---|---|
| `S0642L01B01` | build | S0642L01 — कैसा लग रहा है → 어떠십니까 | कैसा चल रहा है | 지금 어떠십니까 | **지금 어떠세요** |
| `S0642L01B02` | build | S0642L01 — कैसा लग रहा है → 어떠십니까 | सेहत कैसी है | 기분이 지금 어떠십니까 | **기분이 지금 어떠세요** |
| `S0642L01B03` | build | S0642L01 — कैसा लग रहा है → 어떠십니까 | तबियत कैसी है श्रीमान | 어떠십니까 선생님 | **어떠세요 선생님** |
| `S0642L01U01` | use | S0642L01 — कैसा लग रहा है → 어떠십니까 | आप कैसा महसूस कर रहे हैं श्रीमती? | 기분이 어떠십니까 선생님? | **기분이 어떠세요 선생님?** |
| `S0642L01U02` | use | S0642L01 — कैसा लग रहा है → 어떠십니까 | आज आपका मन कैसा है? | 오늘 기분이 어떠십니까? | **오늘 기분이 어떠세요?** |
| `S0642L01U03` | use | S0642L01 — कैसा लग रहा है → 어떠십니까 | अब आपका मन कैसा है श्रीमान? | 지금 기분이 어떠십니까 선생님? | **지금 기분이 어떠세요 선생님?** |
| `S0642L01U04` | use | S0642L01 — कैसा लग रहा है → 어떠십니까 | आपका मन कैसा है? | 기분이 어떠십니까? | **기분이 어떠세요?** |
| `S0642L01U05` | use | S0642L01 — कैसा लग रहा है → 어떠십니까 | क्या आज आपका मन अच्छा है? | 오늘 어떠십니까? | **오늘 어떠세요?** |
| `S0643L01B01` | build | S0643L01 — क्या आप चाहते हैं → 원하십니까 | कॉफ़ी चाहते हैं | 커피나 원하십니까 | **커피나 원하세요** |
| `S0643L01B02` | build | S0643L01 — क्या आप चाहते हैं → 원하십니까 | चाय चाहते हैं | 차 원하십니까 | **차 원하세요** |
| `S0643L01B03` | build | S0643L01 — क्या आप चाहते हैं → 원하십니까 | यह चाहते हैं | 그것을 원하십니까 | **그것을 원하세요** |
| `S0643L01U01` | use | S0643L01 — क्या आप चाहते हैं → 원하십니까 | क्या आप चाहते हैं श्रीमान? | 원하십니까 선생님? | **원하세요 선생님?** |
| `S0643L01U02` | use | S0643L01 — क्या आप चाहते हैं → 원하십니까 | क्या आप कुछ चाहते हैं? | 뭔가 원하십니까? | **뭔가 원하세요?** |
| `S0643L01U03` | use | S0643L01 — क्या आप चाहते हैं → 원하십니까 | क्या आप चाय चाहते हैं श्रीमती? | 차 원하십니까 선생님? | **차 원하세요 선생님?** |
| `S0643L01U04` | use | S0643L01 — क्या आप चाहते हैं → 원하십니까 | क्या आप एक कप चाहते हैं? | 한 잔 원하십니까? | **한 잔 원하세요?** |
| `S0643L01U05` | use | S0643L01 — क्या आप चाहते हैं → 원하십니까 | क्या आप कुछ पीना चाहते हैं? | 마실 것 좀 원하십니까? | **마실 것 좀 원하세요?** |
| `S0644L02B01` | build | S0644L02 — बोल देंगे → 주시겠습니까 | यह बोल देंगे | 말씀해 주시겠습니까 | **말씀해 주시겠어요** |
| `S0644L02B02` | build | S0644L02 — बोल देंगे → 주시겠습니까 | अभी बोल देंगे | 지금 주시겠습니까 | **지금 주시겠어요** |
| `S0644L02B03` | build | S0644L02 — बोल देंगे → 주시겠습니까 | कुछ बोल देंगे | 뭔가 주시겠습니까 | **뭔가 주시겠어요** |
| `S0644L02U01` | use | S0644L02 — बोल देंगे → 주시겠습니까 | क्या आप वह कह सकते हैं श्रीमान? | 그것을 말씀해 주시겠습니까 선생님? | **그것을 말씀해 주시겠어요 선생님?** |
| `S0644L02U02` | use | S0644L02 — बोल देंगे → 주시겠습니까 | क्या आप यह बोल देंगे? | 그것을 말씀해 주시겠습니까? | **그것을 말씀해 주시겠어요?** |
| `S0644L02U03` | use | S0644L02 — बोल देंगे → 주시겠습니까 | क्या आप कुछ बोल देंगे? | 뭔가 말씀해 주시겠습니까? | **뭔가 말씀해 주시겠어요?** |
| `S0644L02U04` | use | S0644L02 — बोल देंगे → 주시겠습니까 | क्या आप अभी बोल देंगे श्रीमती? | 지금 말씀해 주시겠습니까 선생님? | **지금 말씀해 주시겠어요 선생님?** |
| `S0644L02U05` | use | S0644L02 — बोल देंगे → 주시겠습니까 | क्या आप मुझे यह बोल देंगे? | 저에게 말씀해 주시겠습니까? | **저에게 말씀해 주시겠어요?** |
| `S0645L01B01` | build | S0645L01 — मदद कर सकता हूँ → 도와드리겠습니다 | मैं मदद कर सकता हूँ | 제가 도와드리겠습니다 | **제가 도와드리겠어요** |
| `S0645L01B02` | build | S0645L01 — मदद कर सकता हूँ → 도와드리겠습니다 | अभी मदद कर सकता हूँ | 지금 도와드리겠습니다 | **지금 도와드리겠어요** |
| `S0645L01B03` | build | S0645L01 — मदद कर सकता हूँ → 도와드리겠습니다 | आपकी मदद कर सकता हूँ | 당신을 도와드리겠습니다 | **당신을 도와드리겠어요** |
| `S0645L01U01` | use | S0645L01 — मदद कर सकता हूँ → 도와드리겠습니다 | मैं आपकी मदद कर सकता हूँ श्रीमती | 제가 도와드리겠습니다 선생님 | **제가 도와드리겠어요 선생님** |
| `S0645L01U02` | use | S0645L01 — मदद कर सकता हूँ → 도와드리겠습니다 | मैं अभी आपकी मदद कर सकता हूँ | 제가 지금 도와드리겠습니다 | **제가 지금 도와드리겠어요** |
| `S0645L01U03` | use | S0645L01 — मदद कर सकता हूँ → 도와드리겠습니다 | मैं आपकी पूरी मदद कर सकता हूँ | 제가 당신을 도와드리겠습니다 | **제가 당신을 도와드리겠어요** |
| `S0645L01U04` | use | S0645L01 — मदद कर सकता हूँ → 도와드리겠습니다 | मैं सच में आपकी मदद कर सकता हूँ | 제가 정말 도와드리겠습니다 | **제가 정말 도와드리겠어요** |
| `S0645L01U05` | use | S0645L01 — मदद कर सकता हूँ → 도와드리겠습니다 | हाँ मैं मदद कर सकता हूँ श्रीमान | 네 제가 도와드리겠습니다 선생님 | **네 제가 도와드리겠어요 선생님** |
| `S0649L01B01` | build | S0649L01 — तैयार हो गए → 준비되셨습니까 | क्या सब तैयार | 뭔가 준비되셨습니까 | **뭔가 준비되셨어요** |
| `S0649L01B02` | build | S0649L01 — तैयार हो गए → 준비되셨습니까 | क्या यहाँ तैयार | 여기 준비되셨습니까 | **여기 준비되셨어요** |
| `S0649L01B03` | build | S0649L01 — तैयार हो गए → 준비되셨습니까 | क्या अच्छे से तैयार | 잘 준비되셨습니까 | **잘 준비되셨어요** |
| `S0649L01U01` | use | S0649L01 — तैयार हो गए → 준비되셨습니까 | क्या आप तैयार हैं श्रीमान? | 준비되셨습니까 선생님? | **준비되셨어요 선생님?** |
| `S0649L01U02` | use | S0649L01 — तैयार हो गए → 준비되셨습니까 | क्या आप अभी तैयार हैं? | 지금 준비되셨습니까? | **지금 준비되셨어요?** |
| `S0649L01U03` | use | S0649L01 — तैयार हो गए → 준비되셨습니까 | क्या आप सच में तैयार हैं? | 정말 준비되셨습니까? | **정말 준비되셨어요?** |
| `S0649L01U04` | use | S0649L01 — तैयार हो गए → 준비되셨습니까 | क्या आप अब तैयार हैं श्रीमती? | 지금 준비되셨습니까 선생님? | **지금 준비되셨어요 선생님?** |
| `S0649L01U05` | use | S0649L01 — तैयार हो गए → 준비되셨습니까 | क्या आप तैयार हैं? | 준비되셨습니까? | **준비되셨어요?** |
| `S0650L01B01` | build | S0650L01 — जाना चाहती हैं → 가시겠습니까 | क्या यहाँ जाएँ | 여기 가시겠습니까 | **여기 가시겠어요** |
| `S0650L01B02` | build | S0650L01 — जाना चाहती हैं → 가시겠습니까 | क्या अब जाएँ | 정말 가시겠습니까 | **정말 가시겠어요** |
| `S0650L01B03` | build | S0650L01 — जाना चाहती हैं → 가시겠습니까 | क्या जल्दी जाएँ | 빨리 가시겠습니까 | **빨리 가시겠어요** |
| `S0650L01U01` | use | S0650L01 — जाना चाहती हैं → 가시겠습니까 | क्या आप जाना चाहती हैं श्रीमती? | 가시겠습니까 선생님? | **가시겠어요 선생님?** |
| `S0650L01U02` | use | S0650L01 — जाना चाहती हैं → 가시겠습니까 | क्या आप अभी जाना चाहते हैं? | 지금 가시겠습니까? | **지금 가시겠어요?** |
| `S0650L01U03` | use | S0650L01 — जाना चाहती हैं → 가시겠습니까 | क्या आप वहाँ जाना चाहते हैं? | 거기 가시겠습니까? | **거기 가시겠어요?** |
| `S0650L01U04` | use | S0650L01 — जाना चाहती हैं → 가시겠습니까 | क्या आप अब जाना चाहते हैं श्रीमान? | 지금 가시겠습니까 선생님? | **지금 가시겠어요 선생님?** |
| `S0650L01U05` | use | S0650L01 — जाना चाहती हैं → 가시겠습니까 | क्या आप जाना चाहते हैं? | 가시겠습니까? | **가시겠어요?** |
| `S0651L01B01` | build | S0651L01 — क्या सोचती हैं → 생각하십니까 | इसके बारे में सोचते हैं | 그것을 지금 생각하십니까 | **그것을 지금 생각하세요** |
| `S0651L01B02` | build | S0651L01 — क्या सोचती हैं → 생각하십니까 | अभी सोचते हैं | 지금 생각하십니까 | **지금 생각하세요** |
| `S0651L01B03` | build | S0651L01 — क्या सोचती हैं → 생각하십니까 | सच में सोचते हैं | 정말 생각하십니까 | **정말 생각하세요** |
| `S0651L01U01` | use | S0651L01 — क्या सोचती हैं → 생각하십니까 | आप क्या सोचती हैं श्रीमती? | 어떻게 생각하십니까 선생님? | **어떻게 생각하세요 선생님?** |
| `S0651L01U02` | use | S0651L01 — क्या सोचती हैं → 생각하십니까 | आप इसके बारे में क्या सोचते हैं? | 그것을 어떻게 생각하십니까? | **그것을 어떻게 생각하세요?** |
| `S0651L01U03` | use | S0651L01 — क्या सोचती हैं → 생각하십니까 | आप कैसे सोचते हैं? | 어떻게 생각하십니까? | **어떻게 생각하세요?** |
| `S0651L01U04` | use | S0651L01 — क्या सोचती हैं → 생각하십니까 | आप अभी क्या सोचते हैं श्रीमान? | 지금 어떻게 생각하십니까 선생님? | **지금 어떻게 생각하세요 선생님?** |
| `S0651L01U05` | use | S0651L01 — क्या सोचती हैं → 생각하십니까 | आप इस बारे में क्या सोचते हैं? | 그것을 생각하십니까? | **그것을 생각하세요?** |
| `S0652L01B01` | build | S0652L01 — दरकार है → 필요하십니까 | कॉफ़ी दरकार है | 커피나 필요하십니까 | **커피나 필요하세요** |
| `S0652L01B02` | build | S0652L01 — दरकार है → 필요하십니까 | अभी दरकार है | 지금 필요하십니까 | **지금 필요하세요** |
| `S0652L01B03` | build | S0652L01 — दरकार है → 필요하십니까 | सच में दरकार है | 정말 필요하십니까 | **정말 필요하세요** |
| `S0652L01U01` | use | S0652L01 — दरकार है → 필요하십니까 | आपको क्या चाहिए श्रीमान? | 무엇이 필요하십니까 선생님? | **무엇이 필요하세요 선생님?** |
| `S0652L01U02` | use | S0652L01 — दरकार है → 필요하십니까 | आपको क्या दरकार है? | 무엇이 필요하십니까? | **무엇이 필요하세요?** |
| `S0652L01U03` | use | S0652L01 — दरकार है → 필요하십니까 | क्या आपको कुछ चाहिए? | 뭔가 필요하십니까? | **뭔가 필요하세요?** |
| `S0652L01U04` | use | S0652L01 — दरकार है → 필요하십니까 | क्या आपको अभी कुछ चाहिए श्रीमती? | 지금 필요하십니까 선생님? | **지금 필요하세요 선생님?** |
| `S0652L01U05` | use | S0652L01 — दरकार है → 필요하십니까 | क्या आपको कुछ पीने की दरकार है? | 마실 것 좀 필요하십니까? | **마실 것 좀 필요하세요?** |
| `S0653L01B01` | build | S0653L01 — कोई दिक्कत है → 괜찮으십니까 | यहाँ कोई दिक्कत है | 여기 괜찮으십니까 | **여기 괜찮으세요** |
| `S0653L01B02` | build | S0653L01 — कोई दिक्कत है → 괜찮으십니까 | सच में कोई दिक्कत है | 정말 괜찮으십니까 | **정말 괜찮으세요** |
| `S0653L01B03` | build | S0653L01 — कोई दिक्कत है → 괜찮으십니까 | कोई दिक्कत तो नहीं | 뭔가 괜찮으십니까 | **뭔가 괜찮으세요** |
| `S0653L01U01` | use | S0653L01 — कोई दिक्कत है → 괜찮으십니까 | क्या आपको कोई दिक्कत है श्रीमती? | 괜찮으십니까 선생님? | **괜찮으세요 선생님?** |
| `S0653L01U02` | use | S0653L01 — कोई दिक्कत है → 괜찮으십니까 | क्या आप ठीक हैं? | 괜찮으십니까? | **괜찮으세요?** |
| `S0653L01U03` | use | S0653L01 — कोई दिक्कत है → 괜찮으십니까 | क्या आप अभी ठीक हैं? | 지금 괜찮으십니까? | **지금 괜찮으세요?** |
| `S0653L01U04` | use | S0653L01 — कोई दिक्कत है → 괜찮으십니까 | क्या आप सच में ठीक हैं श्रीमान? | 정말 괜찮으십니까 선생님? | **정말 괜찮으세요 선생님?** |
| `S0653L01U05` | use | S0653L01 — कोई दिक्कत है → 괜찮으십니까 | क्या अब आप ठीक हैं श्रीमती? | 지금 괜찮으십니까 선생님? | **지금 괜찮으세요 선생님?** |
| `S0654L02B01` | build | S0654L02 — पक्का नहीं है → 모르겠습니다 | अभी पक्का नहीं है | 지금 잘 모르겠습니다 | **지금 잘 모르겠어요** |
| `S0654L02B02` | build | S0654L02 — पक्का नहीं है → 모르겠습니다 | सच में पक्का नहीं है | 정말 모르겠습니다 | **정말 모르겠어요** |
| `S0654L02B03` | build | S0654L02 — पक्का नहीं है → 모르겠습니다 | मुझे पक्का नहीं है | 저는 모르겠습니다 | **저는 모르겠어요** |
| `S0654L02U01` | use | S0654L02 — पक्का नहीं है → 모르겠습니다 | मुझे यकीन नहीं है कि मैं आपकी मदद कर सकता हूँ श्रीमान | 도와드릴 수 있을지 잘 모르겠습니다 선생님 | **도와드릴 수 있을지 잘 모르겠어요 선생님** |
| `S0654L02U02` | use | S0654L02 — पक्का नहीं है → 모르겠습니다 | मुझे पक्का नहीं है कि मैं मदद कर पाऊँ | 도와드릴 수 있을지 모르겠습니다 | **도와드릴 수 있을지 모르겠어요** |
| `S0654L02U03` | use | S0654L02 — पक्का नहीं है → 모르겠습니다 | मुझे अभी पक्का नहीं है | 지금 모르겠습니다 | **지금 모르겠어요** |
| `S0654L02U04` | use | S0654L02 — पक्का नहीं है → 모르겠습니다 | मुझे सच में पक्का नहीं है श्रीमती | 정말 모르겠습니다 선생님 | **정말 모르겠어요 선생님** |
| `S0654L02U05` | use | S0654L02 — पक्का नहीं है → 모르겠습니다 | मुझे इसके बारे में पक्का नहीं है | 그것을 모르겠습니다 | **그것을 모르겠어요** |
| `S0655L02B01` | build | S0655L02 — जान पड़ता है → 것 같습니다 | जान पड़ता है | 것 같습니다 | **것 같아요** |
| `S0655L02B02` | build | S0655L02 — जान पड़ता है → 것 같습니다 | अच्छा जान पड़ता है | 좋은 것 같습니다 | **좋은 것 같아요** |
| `S0655L02B03` | build | S0655L02 — जान पड़ता है → 것 같습니다 | लाल जान पड़ता है | 빨간 것 같습니다 | **빨간 것 같아요** |
| `S0655L02B04` | build | S0655L02 — जान पड़ता है → 것 같습니다 | अच्छा कर रही जान पड़ता है | 잘하고 계신 것 같습니다 | **잘하고 계신 것 같아요** |
| `S0655L02U01` | use | S0655L02 — जान पड़ता है → 것 같습니다 | मुझे लगता है कि आप बहुत अच्छा कर रही हैं श्रीमती | 아주 잘하고 계신 것 같습니다 선생님 | **아주 잘하고 계신 것 같아요 선생님** |
| `S0655L02U02` | use | S0655L02 — जान पड़ता है → 것 같습니다 | मुझे लगता है कि आप सच में अच्छा कर रही हैं | 정말 잘하고 계신 것 같습니다 | **정말 잘하고 계신 것 같아요** |
| `S0655L02U03` | use | S0655L02 — जान पड़ता है → 것 같습니다 | यह बहुत अच्छी चीज़ जान पड़ती है | 아주 좋은 것 같습니다 | **아주 좋은 것 같아요** |
| `S0655L02U04` | use | S0655L02 — जान पड़ता है → 것 같습니다 | आप बहुत अच्छा कर रही हैं ऐसा जान पड़ता है | 아주 잘하고 계신 것 같습니다 | **아주 잘하고 계신 것 같아요** |
| `S0655L02U05` | use | S0655L02 — जान पड़ता है → 것 같습니다 | वो लाल चीज़ जान पड़ती है | 저것이 빨간 것 같습니다 | **저것이 빨간 것 같아요** |

## Not proposing to change — `kor_for_hin`

- **Seeds 646, 647, 648** — `계시네요`, `말씀하시는군요`, `말씀하신 것이요`. Already `-요`-side and
  honorific. Nothing to move.
- **Seed 654 `S0654L01`, seed 655 `S0655L01`** — the lessons are non-finite (`도와드릴`, `계신`) and
  their drills already end in `-어요`. Nothing to move. Their apparent oddity is caused by the
  *sibling* lesson in the same seed being formal, which the repair fixes.
- **Seed 73 `감사합니다`** — the one legitimate 합쇼체 form in the course, a fixed formula. Both
  sibling courses keep it. Untouched.
- **Every drill in the pocket already matched its lesson.** No lesson-vs-drill disagreements found
  in `kor_for_hin`, so nothing here is covered by Tom's ruling. Confirms the survey's 0-of-9.

---

## What this pass is really doing, in plain words

Korean makes you choose how polite to be every time you end a sentence, and a course has to pick one
level and stick to it or the learner never knows which ending to produce.

**The English course** has a stretch near the end where the learner practises talking to "sir" and
"madam", and it deliberately uses the extra-polite ending there, then drops back to the ordinary
polite ending for the "you all" stretch that follows. That plan is fine. What went wrong is that in
eight of those lessons the practice sentences don't do what the lesson taught — the lesson says
"say it this way" and then every practice line says it the other way. I'm proposing to bend those
39 practice lines back to their own lesson. Three further seeds have a worse problem I am not
touching: the two halves of a single lesson disagree with each other, so there is no correct answer
to bend towards, and someone has to decide which half is right.

**The Hindi course** is a different animal, and Tom's ruling doesn't settle it. Nothing there is
drifting — the practice lines are faithful to their lessons. It's the lessons themselves that
switched, for fourteen seeds, to a stiffer, more formal register than the rest of the course uses,
and than the other two Korean courses use for exactly the same content. Changing it back means
changing what those lessons teach, not just how they drill it, so it's a bigger call. Two things
make me confident it's the right call: the other two Korean courses agree with each other and
disagree with this one at every single line, and the change resolves a genuine contradiction without
creating any new ones. One thing wants Tom's eye first: three of those eleven lessons stop teaching
anything at all once they're normalised, because they turn into copies of lessons the course already
gave the learner four hundred seeds earlier — which is probably why the formal versions got invented
in the first place.

# eng_for_hin — the nineteen can/could seeds, split by kind and fixed

**Date:** 2026-09-03 · **Course:** `eng_for_hin` (known side = Hindi cue, target side = English answer)
**Ruling applied:** Kai, 2026-09-03 — *"Split the nineteen by which kind they actually are."*
**Predecessor:** the 2026-09-02 cue-split job (plan `f81e000b`), whose "Device B" — dropping the present
auxiliary `है`/`हैं` to mark a tentative *could* — is the defect this pass removes.

---

## 1. The split — the number Kai asked for

The nineteen seeds the 2026-09-02 pass rewrote do **not** divide into two classes. They divide into three,
because six of the nineteen were never *can/could* seeds at all.

### (A) Distinction void — 7 seeds — `61 · 316 · 318 · 414 · 434 · 644 · 659`

English *could* is only a softener here; *can* would be equally correct, and Hindi does not grammaticalise
the difference anywhere. **Stop teaching the contrast.** The English already reads naturally in all seven, so
it is left exactly as it stands (rule 6); the Hindi gets its auxiliary back and there is one right answer per cue.

| seed | English (unchanged) | why (A) |
|---|---|---|
| 61 | Could you say that again a little more slowly? | polite request — *already repaired before this job* |
| 414 | Could we have a bottle of red wine please? | polite request (restaurant) |
| 644 | Could you say that sir? | polite request |
| 659 | Could you all say that? | polite request |
| 316 | Do you think that she could bring her brother on Monday? | tentative non-past possibility; no past or conditional anchor |
| 318 | No I don't think she could this time. | same |
| 434 | Could they cut the number of students they take? | same |

316 / 318 / 434 are not polite requests, but they meet Kai's own test for (A) — the English distinction is
void and Hindi has no device for it. Forcing a device on them would be inventing one, which is what went wrong
the first time.

### (B) Distinction real — 6 seeds — `310 · 314 · 317 · 413 · 435 · 444`

Here *could* is genuine past ability or a genuine conditional, and Hindi marks it with a real device.

| seed | English | Hindi device | action |
|---|---|---|---|
| 310 | She could write a story about that man. | past `लिख सकती थी` | **already correct — untouched** |
| 314 | I think that she could put it on the table. | past `रख सकती थी` | **already correct — untouched** |
| 444 | Yes they thought it could be done more efficiently. | reported past `किया जा सकता था` | **already correct — untouched** |
| 317 | Yes I think she could if she wanted to. | conditional `अगर वह चाहे तो …` | auxiliary restored; the subjunctive `चाहे` carries the modality |
| 413 | We could fall if we go too close to the edge. | conditional `अगर हम … जाएँ तो …` | auxiliary restored; `जाएँ` carries it |
| 435 | Yes they could if they wanted to. | conditional `अगर वे चाहें तो …` | auxiliary restored; `चाहें` carries it |

310 / 314 / 444 were named in the brief as broken the same way as the rest. **They are not.** The live rows show
them on `सकता था` — Kai's own past device — not on a dropped auxiliary, and 314's sibling 315 (*"I think that he
couldn't afford the car"* = `नहीं ख़रीद पाया`) sits in the same past-narrative block. Correcting the brief's premise,
not the seeds.

In 317 / 413 / 435 the conditional frame was **already in the sentence**; the only thing wrong was the missing
auxiliary. Restoring it lands them exactly on Kai's "conditional frames" device without inventing anything.

### (C) Not can/could at all — 6 seeds — `96 · 170 · 296 · 436 · 634 · 652`

These are the *want / need / would like* half of the 2026-09-02 job (`… की ज़रूरत है` / `… चाहूँगा`). They carry no
ability form, were never touched by Device B, and are grammatical as they stand. **No action.** Reported so the
count of nineteen reconciles.

**7 (A) + 6 (B) + 6 (C) = 19.**

---

## 2. What actually changed

Nine seeds carried the dropped-auxiliary artefact: **316, 317, 318, 413, 414, 434, 435, 644, 659**
(seed 61, the tenth, was repaired before this job).

Every one of the nine was repaired at all three layers, one seed at a time, ascending, through the dashboard's
own routes — `PATCH /api/seed/:course/:n` (course-builder 3471), `PATCH /api/production/:course/lego/:legoId`
and `PATCH /api/production/:course/phrase/:id` (production API 3470). Every old string was matched against the
live row before the write; every new string was read back from the DB afterwards.

| seed | cue before | cue after |
|---|---|---|
| 316 | क्या आपको लगता है कि वह सोमवार को अपने भाई को ला **सकती**? | … ला **सकती है**? |
| 317 | हाँ, मुझे लगता है अगर वह चाहे तो ला **सकती**। | … ला **सकती है**। |
| 318 | नहीं, मुझे नहीं लगता वह इस बार ला **सकती**। | … ला **सकती है**। |
| 413 | अगर हम किनारे के बहुत पास जाएँ तो हम गिर **सकते**। | … गिर **सकते हैं**। |
| 414 | क्या हमें एक बोतल रेड वाइन मिल **सकती**, कृपया? | … मिल **सकती है**, कृपया? |
| 434 | क्या वे उन छात्रों की संख्या कम कर **सकते** जिन्हें वे लेते हैं? | … कम कर **सकते हैं** जिन्हें वे लेते हैं? |
| 435 | हाँ, अगर वे चाहें तो ऐसा कर **सकते**। | … कर **सकते हैं**। |
| 644 | क्या आप वह कह **सकते**, सर? | … कह **सकते हैं**, सर? |
| 659 | क्या आप सब यह कह **सकते**? | … कह **सकते हैं**? |

**Totals: 9 seed cues + 9 LEGOs + 97 practice phrases = 115 rows written, 115 verified by read-back, 0 failures.**

The nine LEGOs took the same one-token restoration (e.g. `क्या आप वह कह सकते` → `क्या आप वह कह सकते हैं`).
**No English was changed anywhere in this job**, and no chunk boundary moved: the auxiliary `है`/`हैं` has no
separate English exponent, so the English chunk that already glossed the modal (`could you say that`) still
covers the Hindi exactly. This is not a merge, so Kai's both-sides rule has nothing to expand — and it follows
the precedent already set by the seed-61 repair (`क्या आप कह सकते हैं` ⇒ `could you say`).

**Eight agreement errors fixed in passing.** `मिलना` agrees with the thing obtained, and eight phrases in the
`क्या हमें … मिल सकती` family had feminine `सकती` on masculine or plural objects — a defect the bare form was
hiding. Since the repair rewrites that exact token and rule 2 requires grammatical Hindi, they were corrected
against the course's own existing precedents (s509 `बेड … मिल सकता है`, s586 `अंडे … मिल सकते हैं`):
`कुछ और / कुछ नया / कुछ / एक विचार / सवाल / एक नज़रिया → मिल सकता है`; `टमाटर / कुछ पोस्टकार्ड → मिल सकते हैं`
(`ऐसी दुकान` was already feminine and only gained its auxiliary).

## 3. What was deliberately left alone

- **310, 314, 444** — already on the correct past device (§1B).
- **96, 170, 296, 436, 634, 652** — not can/could seeds (§1C).
- **Nine LEGOs and 84 phrases elsewhere in the course that still carry a bare `सकना`** — every one is legitimate
  Hindi, not the Device-B artefact: negatives, where the auxiliary is regularly dropped
  (140 `मैं नहीं देख सकता`, 331, 333, 469, 526, and the phrase families of 531/536/544), and the genuine
  counterfactual frames the course already owned (225 `अगर वह दे सकता, तो दे देता`, 229, 352, 501 `काश मैं …`).
  Kai's ruling targets a false device, not every auxiliary-less form.
- **All English text**, everywhere. No seed and no phrase had its English rewritten.

## 4. Course-wide phrase check

**113 practice phrases across the whole course tile through the nine repaired LEGOs. All 113 hold after the change.**

The count that mattered was `S0414L01` (`क्या हमें … मिल सकती` ⇒ *could we have*), which **33** phrases tile —
only 13 of them inside seed 414. Per the brief's warning, that ratio was checked *before* the write: the other
20 live in seeds 422–634, and **16 of those 20 already carried the auxiliary** (`… मिल सकती है`, `… मिल सकते हैं`).
Restoring it therefore moved the LEGO *into* agreement with the majority of its own tenants rather than stranding
them. No component was removed and no tile was deleted, so nothing lost its only teaching unit.

The remaining **4** were stragglers still on the bare form: `s422` *could we have a question?*, `s441` *could we
have an approach?* and two in `s461` (*a shop*, *some postcards*). The post-change tiling sweep caught them as 4
broken tiles — they were outside every repaired seed, which is exactly why a per-seed pass would have missed them.
They were repaired with the correct agreement and the sweep re-run clean: 113/113.
**4 phrases repaired beyond the nine seeds' own rows.**

Independent confirmation from the validator: `POST /api/v2/validate/eng_for_hin`, full 668-seed sweep, run before
and after.

| | seeds checked | passed | failed |
|---|---|---|---|
| before | 668 | 582 | 86 |
| after | 668 | 582 | 86 |

**0 new failures, 0 resolved.** The 86 pre-existing failures are English-side vocab findings owned by other passes;
this job is a known-side edit and correctly moves neither number.

## 5. Audio

**No TTS was generated, no render was queued, no provider was called.** `eng_for_hin` is all-xAI and cannot
re-render, so nothing nulled here can be replaced.

`content_audio_link_drops` records exactly **4 links dropped by this job**, all of one kind:

| row | column | reason |
|---|---|---|
| LEGO seed 316 | `presentation_audio_id` | nulled-presentation-not-text-addressable |
| LEGO seed 413 | `presentation_audio_id` | nulled-presentation-not-text-addressable |
| LEGO seed 414 | `presentation_audio_id` | nulled-presentation-not-text-addressable |
| LEGO seed 434 | `presentation_audio_id` | nulled-presentation-not-text-addressable |

**Zero known-side clips were lost** — all nine seeds, all nine LEGOs and all 97 phrases already had
`known_audio_id = NULL` before this job (the 2026-09-02 pass had already silenced them). **Zero English clips
were touched**: the nulling triggers are side-scoped, and no `target_text` changed. The other five repaired LEGOs
had no presentation clip to lose.

An audio-pass request was queued for `eng_for_hin` (`queue-audio-pass.cjs`) so the edits do not accumulate as an
invisible backlog. It is a ledger entry: it renders nothing, and cannot until the course leaves xAI.

## 6. Explicit gaps

1. **No native speaker has read these nine sentences.** The repair is a one-token restoration of a form the
   course already uses correctly in 25 other seeds, which is the strongest evidence available inside the data —
   but it is internal consistency, not a native ear. Shuchita should read the nine cues in §2.
2. **316 / 318 / 434 are classified (A) on a judgement, not on a Hindi device.** They are not polite requests;
   they are placed with (A) because the English *can*/*could* difference in them is void and Hindi cannot mark
   it. If Kai reads them as (B), the honest consequence is that Hindi has no non-past device for them and the
   English would have to change — which rule 6 forbids without a ruling. **Named, not guessed.**
3. **Eight agreement corrections were made in the `मिल सकती` family** (§2). They are outside the letter of the
   brief's "restore the auxiliary" but inside rule 2's "every Hindi sentence you leave behind must be
   grammatical" — the token being rewritten is the one carrying the error.
4. **The brief's list of twelve broken seeds was wrong by three** (310, 314, 444). Corrected in §1B from the
   live rows.
5. **The English of two phrases in seeds 644/659 reads oddly** (*"I don't know could you say that"*,
   *"I didn't know could you all say that"*). Pre-existing, English-side, and out of scope here.
6. **The 86 validator failures are untouched** and are somebody else's pass.

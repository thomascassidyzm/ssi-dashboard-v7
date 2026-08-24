# Voice coverage — French rounds 1–10, and the voice decision

2026-08-07. Measured, not estimated. Every number below came out of the real round generator and a
direct read of `course_audio`, and each was computed twice by two different methods that agree.

---

## The answer, first — and it contradicts what you expected

You thought the clone might sit around 95% coverage of the English texts against maybe 80% for the
current voice. **It is the other way round, and by more than the gap you imagined.**

| voice | English clips covered, of 63 | |
|---|---|---|
| **Eve** — `xai_eve` + `eve` | **63 / 63 — 100%** | the current voice |
| Azure Sonia | 56 / 63 — 89% | old estate voice, not a candidate |
| **Tom (clone)** — `gfzdpspr5fdp` + `xai_gfzdpspr5fdp` | **32 / 63 — 51%** | |
| Azure Ryan | 30 / 63 — 48% | |
| xAI bedd6226 | 29 / 63 — 46% | |

Split by layer, which is where it really shows:

| voice | English known (53) | intro/presentation (10) |
|---|---|---|
| Eve | **53 — all of them** | **10 — all of them** |
| Tom (clone) | 32 | **0** |

The clone has never spoken a single one of the ten intro lines. Eve has spoken all 169 clips these
rounds need, in both languages.

**My recommendation: stay on Eve. One word — yes or no.**
Reason: she already has 100% of what these rounds need, so choosing her costs nothing and choosing
the clone means rendering 31 English clips fresh and changing the voice of the course to get *less*
coverage.

I have proceeded on Eve for rounds 1–10 so you have something to listen to now. **That is
provisional and yours to overturn** — at ten rounds it is cheap to redo, which is the whole point of
sampling before committing.

---

## Your instinct about the widening was right, though

You said the clone's English lives in target-2 slots of the English-for-X courses, not on known
sides, and that a role-scoped query would understate it. **It does, and I measured by how much:**

| voice | role-scoped (the narrow, wrong query) | role-agnostic (your rule) | gained |
|---|---|---|---|
| clone | 27 | **32** | +5 |
| Azure Ryan | 0 | **30** | +30 |
| xAI bedd6226 | 0 | **29** | +29 |
| Eve | 63 | 63 | — |

Two voices go from *invisible* to nearly half-covering. The clone's own gain is smaller than you
expected but real, and it arrives exactly where you said it would — `eng_for_zho`, `eng_for_sin`,
`eng_for_urd`, `eng_for_kan`, all target-role clips.

So the widening was the right call. It just does not change who wins.

While chasing this I found and fixed a bug of my own that was suppressing the clone further: my
first pace-safety guard tested for a known-good *provider prefix*, which failed closed on every bare
legacy id — including `gfzdpspr5fdp`, the clone itself. The guard is now shaped around Azure
specifically, which is the only engine that actually bakes speed into the file. That fix is what
moved the clone from 27 to 32.

---

## deu_for_eng — you were right, almost to the clip

You said German already shares many of the English clips on Eve. **It shares 22 of the 53**, more
than any other course, and it is now queried *first* rather than found by luck:

| source course | English clips available on Eve |
|---|---|
| **deu_for_eng** | **22** |
| spa_for_eng | 21 |
| deu_at_for_eng | 17 |
| kor_for_eng | 11 |
| jpn_for_eng | 5 |
| **any other course, deduplicated** | **26** |

26 — the figure you quoted. The other 27 of the 53 exist only in French's own course.

**fra_ca_for_eng contributes zero**, on every layer, because it holds no Eve clips at all. Its
intros are on your clone and Azure Sonia. So the Quebecois route to the intro lines only opens if
the clone wins the voice call — which on this measurement it does not.

---

## The language-name filter — applied, and it excluded nothing here

Built and enforced at every step: reuse, and inside the coverage count. A text may name this
course's own languages — English and French — and no other.

**It excluded 0 candidates on this run, and 0 of French's own texts name a foreign language.**

A clean result, and worth knowing why: exact text matching already keeps them apart, because
*"The German for: 'to speak'"* and *"The French for: 'to speak'"* are different strings and simply
do not match. The filter earns its place on the two cases matching cannot cover — a foreign
language name that has been written into a course's own text by some earlier batch, which is now
**blocked rather than re-rendered in the wrong words**, and the German redo, where every rule points
the other way. It is in the durable capability, not bolted on for this run.

---

## What this run actually did

Rounds 1–10 were already complete on Eve, so the honest provenance is short: **0 clips came in from
deu_for_eng, 0 from fra_ca_for_eng, 1 from kor_for_eng, and 0 were generated fresh.** All 169 sit on
French's own rows and all 169 have live bytes in storage.

The 26 borrowable-from-elsewhere clips are what the *full* French run will draw on, not this
ten-round sample.

---

## The decision

**Which voice does French get?** Eve or the clone.

**Recommendation: Eve** — she covers 100% of these rounds against the clone's 51%, and has all ten
intro lines the clone has never spoken.

One word. If it is the clone, say so and I will redo the ten rounds on the clone and you can compare
by ear — which is the only test that actually settles a voice.

---

*Method: clips enumerated through `services/learning-script-generator.cjs`, never by counting holder
rows. Coverage computed on the key voice × text × language across all courses and all roles.
Cross-checked by two independent join keys — `text_normalized` with both normalisation conventions,
and the generated `text_stripped` column — which agree exactly. An independent third-party check was
dispatched and died on an account limit; that verification did NOT run, and the agreement above is
between my own two methods.*

---

## Update — the two things you settled, and what they changed

**`eve` ≡ `xai_eve`: ruled, and built in.** Bare and provider-prefixed ids are now one voice
identity by default, across every provider era, not just Eve's. Era-crossing matches are still
tagged so an audit can find them, and the merge never joins two different voices.

**The clone is now labelled `Tom (clone)` everywhere**, in both id spellings.

**Neither merge moved a single coverage number.** The table was already unioning across id
spellings, so this fixed the labels and the reuse matching, not the counts. Eve is still 100%, the
clone still 51%.

## Your 1,671 Quebecois intros — real, right voice, wrong lines

You were right that the clone holds a large corpus of French intro lines in `fra_ca_for_eng`:
**1,671 presentation clips**, and they say exactly the right kind of thing — *"The French for:
'a big world', is:"*. Right voice, right target-language name.

**But zero of them are lines rounds 1–10 need, and here is precisely why.** Two different intro
frames are in play:

| frame | example | fra_ca on the clone | fra_for_eng rounds 1–10 |
|---|---|---|---|
| bare | *"The French for: 'i want', is:"* | 1,325 | 0 of 10 |
| with context | *"The French for: 'I want', as in — '…', is:"* | 346 | **all 10** |

Every one of the ten lines these rounds need uses the context frame. The clone's Quebecois corpus is
overwhelmingly the bare frame, and its 346 context-frame lines do not overlap our ten.

Three of our ten intro texts **do** exist in `fra_ca_for_eng` byte-for-byte — including
*"The French for: 'I want', as in — 'I want to speak French with you now', is:"* — but they are on
**Azure Sonia**, not the clone. Checked at the individual clip.

So the Quebecois route to the intros stays shut, on the same-voice rule, whichever voice you pick.

**None of this changes the recommendation: Eve, who already has all ten.**


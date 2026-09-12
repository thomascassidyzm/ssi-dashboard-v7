# eng_for_hin — authoring one seed to teach English "supposed to"

**Date:** 2026-09-02 · **Scope:** seed 528 · **Status:** recommendation only. Nothing written to the DB, no TTS, no commits to content.

---

## 0. The finding that changes the job

**The course already teaches "supposed to" — off चाहिए — and the seed line was never updated to match.**

Seed 528's own decomposition layer contains 11 rows glossing "supposed to", including the bare pair:

```
528 phrase | चाहिए  =>  supposed to
528 lego   | रखना चाहिए  =>  supposed to keep
528 phrase | मुझे वे चीज़ें दूसरे कमरे में रखनी चाहिए  =>  I'm supposed to keep those things in another room
```

while the seed row itself still reads `रखनी चाहिए => I should probably keep`.

Estate-wide, चाहिए in the decomposition layer now pulls **five different English answers**:

| English sense | rows | seeds |
|---|---:|---|
| should / shouldn't | 150 | 34 seeds incl. 98, 99, 100, 403, 404, 405, 407, 438, 499 |
| want / need | 112 | 46 seeds incl. 54, 96, 170, 296, 473, 474, 586 |
| **supposed to** | **11** | **528 only** |
| ought to | 13 | 328 (whose *seed* says "should") |
| other | 3 | 253, 340 |

`मुझे चाहिए => I should` (seed 98) and `चाहिए => supposed to` (seed 528) are the same cue with two answers, live in the course today. That is a flat ZUT violation, and it is the actual defect — not a missing seed.

So the job is not "find a cue for supposed to". It is **move the supposed-to teaching off चाहिए onto a carrier that is free**, and the phrase ladder that already exists is 90% of the work already done.

### A second, unrelated defect found in passing (not mine to fix)
Seed 528's cue says **शायद**; its own decomposition teaches **संभवतः** for "probably". संभवतः appears in **zero** of the 668 seed cues but in 19 decomposition rows across seeds 528, 531, 535, 537, 539, 545, 558; शायद appears in seed cues 499/528/613 and in decomposition rows for a *different* band (499, 602–617). "Probably" is glossed by two different Hindi words in two disjoint bands. Flagging only.

---

## 1. RECOMMENDED pair

```
known_text:  मुझे वे चीज़ें किसी दूसरे कमरे में रखनी होती हैं, लेकिन मैं नहीं रखता।
target_text: I'm supposed to keep those things in another room, but I don't.
```

### Why

**The carrier.** Infinitive + होता/होती/होते ("the standing-rule obligation") is used by **zero** of the 668 seed cues and by **zero** genuine rows in the 1,327-lego / 12,421-phrase decomposition layer. It is completely free. It is also not alien to the learner — habitual `होती हैं` already appears as a copula in seed 574 (`छुट्टियाँ … बहुत ख़ास होती हैं`) and as a noun-frame habitual in seed 436 (`ज़रूरत होती है`), so the auxiliary is familiar even though the obligation use is unclaimed.

**The agreement is right, and the course itself proves it.** `मुझे वे चीज़ें … रखनी होती हैं` — the infinitive takes the feminine form रखनी agreeing with the feminine-plural direct object चीज़ें, and होती हैं agrees feminine plural. This is the same pattern the course already uses:
- seed 450 `उन्हें ख़ुद ट्रेन पकड़नी है` (fem sg object → पकड़नी है)
- seed 596 `मुझे … आँखें बंद करनी हैं` (fem **pl** object → करनी हैं)
- seed 355 `उसे … बात करनी थी` (fem sg → करनी थी)

Kai's attack question (1) is answered: **रखनी होती हैं is grammatical and natural with dative मुझे and feminine-plural वे चीज़ें**, and I did not have to take that on trust — seed 596 is the same shape with the same plural auxiliary. This is the judgement I am *most* confident about in this document.

**Why the contrast clause — this is my improvement on the leading proposal.** Kai's attack question (2) is the real one, and the honest answer is: yes, a Hindi speaker's first production off a bare `रखनी होती हैं` cue would most likely be *"I have to keep those things in another room"*, or *"I usually have to keep…"*. Habitual-obligation होता है is, for a Hindi speaker, the have-to family plus habituality. Hindi does not grammatically encode the thing English "supposed to" encodes — that the obligation comes from an **external source and is frequently not met**. No Hindi inflection carries that.

What *can* be made to carry it is the pragmatic frame. Adding `लेकिन मैं नहीं रखता` / "but I don't" does the work the grammar cannot:

- "I'm supposed to keep those things in another room, but I don't." — completely natural.
- "I need to keep those things in another room, but I don't." — odd; "need to" states a requirement the speaker endorses, so declining it is incoherent.
- "I have to keep those things in another room, but I don't." — sayable, but strained, and it reads as a *complaint about a rule*, which is precisely the supposed-to reading anyway.

The clause narrows the answer far more than anything available on the Hindi side alone, and it costs no new formal collision.

**The English clause is already taught.** लेकिन → "but" is established across 120 rows; the exact "but I don't …" ellipsis pattern is established at seeds 19 (`लेकिन मैं … नहीं करना चाहता` → "But I don't want to stop talking") and 46 (`लेकिन मैं … नहीं करता` → "But I don't worry about making mistakes"). The Hindi `मैं नहीं रखता` is the same shape as 46's `मैं … नहीं करता`.

**What it strands.** Almost nothing. All 27 existing practice phrases and all 3 legos sit inside the span *"keep those things in another room"*, which is unchanged. The ladder's top rung is already the exact string `I'm supposed to keep those things in another room` — so it now terminates one clause short of the seed, which is the normal shape of a phrase ladder, not a defect. What must change is the **known side** of 11 rows: `रखना चाहिए → रखना होता है`, `चाहिए → होता है`, and so on. That rewrite is what removes the live ZUT violation, so it is work that has to happen regardless of which candidate is chosen.

**शायद (attack question 3): drop it.** Two independent reasons. (a) Aspect — habitual obligation plus "probably" is awkward in both languages. (b) More decisively, "probably" is *already* the thing lego S0528L01 teaches, glossed off संभवतः, a word that appears in no seed cue at all. Keeping शायद in the cue preserves a mismatch between the seed and its own lego. Dropping "probably" from the target lets S0528L01 be retired or reassigned rather than left inconsistent. Kai's instinct here was right and there is a second reason for it.

**Gender note.** `मैं नहीं रखता` is masculine. The course carries masculine defaults elsewhere (seed 205 `भूल गया`) and the pipeline has gender expansion, but flag it for whoever applies this.

---

## 2. RUNNER-UP pair

```
known_text:  मुझे वे चीज़ें किसी दूसरे कमरे में रखनी होती हैं।
target_text: I'm supposed to keep those things in another room.
```

This is Kai's leading proposal, unmodified, and it is a genuinely good second. It preserves the existing decomposition **exactly** — the seed target becomes character-for-character the phrase ladder's existing top rung — so the English side needs no work at all. Its only weakness is the one above: bare `रखनी होती हैं` under-determines between "supposed to" and "have to", and relies wholly on a teaching chunk to fix the mapping. If the cost of authoring "but I don't" into the ladder is judged too high, take this and write a stronger chunk.

### Why Kai's second candidate places third, not second

```
मुझे वे चीज़ें किसी दूसरे कमरे में रखनी थीं, लेकिन मैं भूल गया।
I was supposed to keep those things in another room, but I forgot.
```

**Do not use this.** Kai's own diagnosis is right that infinitive+था in an unfulfilled context is the most unmistakable *Hindi* rendering of "was supposed to". But it fails on the criterion that actually decides ZUT here:

1. **It collides on an occupied form, not merely an occupied meaning.** Infinitive+था is already the carrier for "needed to"/"had to" in seeds 207, 278, 280, 354, 355, 356, 521 — seven seeds, all verified. Seed **521 is seven seeds away** from 528, so the collision would be maximally salient to a learner.
2. **The contrast clause only rescues half of it.** "I had to keep them there but I forgot" is contradictory in English, so "had to" is excluded — Kai is right about that. But *"I needed to keep those things in another room, but I forgot"* is perfectly idiomatic English, and "needed to" is exactly what infinitive+था pulls at seeds 207, 354 and 521. The clause does not rescue it against the competitor that is actually occupying the form.
3. It teaches the past form first, of a construction Tom wants taught because it is *common* — "I'm supposed to" is the higher-frequency exposure.

Candidate A collides with a *meaning* the learner might reach for; candidate B collides with a *form* the course has already assigned. The first is fixable by a chunk. The second is not.

---

## 3. Collision check (run against all 668 cues and all 668 answers, plus 1,327 legos and 12,421 phrases)

**Does any other seed already pull the proposed English?**

| probe | hits | verdict |
|---|---:|---|
| `supposed to` in the 668 seed targets | **0** | clear |
| `supposed to` anywhere in course material | 11 | **all 11 are seed 528's own decomposition** — see §0 |
| `another room` | 6 rows | seed 528 only |
| `those things` | 3 rows | seed 528 only |
| `keep those things` | 3 rows | seed 528 only |
| `but I don't` | 11 rows | seeds 19, 27, 45, 46, 48, 90 — the *pattern* is taught, the full sentence is not duplicated |
| `probably` (seed targets) | 2 | 528 and 613 |

No other seed pulls the proposed answer. Clear.

**Does any existing cue share the proposed Hindi construction?**

| probe | seed cues | decomposition rows |
|---|---:|---|
| infinitive + होता/होती/होते (obligation) | **0** | 1 hit, a **false positive**: `मैंने होता => I'd have` (seed 565) — मैंने is a case-marked pronoun ending in -ने, not an infinitive |
| होता/होती/होते anywhere | 16 | 13 of the 16 are the **counterfactual** होता ("would have", seeds 152, 563, 565, 566, 599, 600, 606, 607, 608, 609) — a homograph, not the obligation auxiliary |
| infinitive + है/हैं (have to / need to) | ~35 | occupied — untouched by this proposal |
| infinitive + था/थी/थीं | 7 | occupied — this is what rules out candidate B |
| infinitive + होगा/होगी | 8 | occupied |
| infinitive + पड़ा/पड़े | 3 | occupied |
| चाहिए | 13 cues | occupied five ways — see §0 |

**The obligation sense of होता है is free. Confirmed on both layers.**

One caveat I want on the record: the counterfactual होता homograph is dense in the 560–610 band, which is *immediately after* seed 528. A learner meeting habitual-obligation `होती हैं` at 528 will meet counterfactual `होता` thirty seeds later. These are different constructions and Hindi speakers do not confuse them — but the *course's* gloss layer will now contain होत- pointing at two very different English targets, and whoever writes the chunk should know that.

---

## 4. The other Hindi devices, assessed honestly

**माना जाता है / समझा जाता है** — the reputation sense, "he's supposed to be a good doctor". Formally free (0 hits estate-wide; the broadened `जाता है` probe returned 14 rows, all motion जाना or हो जाता है, no passives at all). But: **it is a different lesson from the one Tom asked for.** His words — "so common and different enough from *should*" — are about the deontic sense, and *should* is not a competitor for the reputation sense at all. Worse, its most natural English gloss is "is considered" or "is thought to be", and "consider" is already course-occupied (seeds 98, 325, 475, 33 rows). So it is ZUT-ambiguous against an answer the course already teaches. **Worth teaching later as its own seed; not a substitute here, and not a good companion in the same seed.**

**उम्मीद की जाती है** — the natural English is "is expected to", not "is supposed to". "Expected to" has 0 rows, so it is free, but the seed would then be teaching *expected*, not *supposed*. And उम्मीद is already a busy word: 13 seed cues, glossing hope / hoped / expecting. **Reject.**

**कहा गया है** — 0 hits, free, but it means "it has been said" and its English answer is "I've been told to", not "I'm supposed to". **Reject: it names the wrong English form.**

**नियम है** — 0 hits, free. Genuinely carries the external-rule source that English "supposed to" encodes, but the English answer it pulls is "it's the rule that…", not "I'm supposed to". It would be a fine *chunk* explanation and a poor *cue*. **Reject as a cue; recommend as chunk material — see §5.**

**तो on an infinitive+है clause** — the probe `(ना|नी|ने)\s+तो` returned 2 hits and **both were false positives** (479 `इतना तो`, where इतना is a quantifier that happens to end in -ना; 622 `ने तोड़`, where "तो" matched inside तोड़). So तो is unattested on an obligation clause here. On the language itself: तो on such a clause adds contrastive topicalisation ("as for keeping them…"), which strengthens a *contrast*, not the supposed-to sense specifically. **Reject as a carrier; harmless as seasoning.**

**ही on an infinitive** — 2 hits, both genuine: seed 483 `यह आसान होनी ही नहीं है` → "it's not meant to be easy", and seed 593 `बाँटना ही पड़ा` → "I still had to share". This is the prior art Kai flagged, and it is worth reading carefully, because **it only yields "meant to" under negation**. `होनी ही नहीं है` = "is not at all meant to be". Positive `रखनी ही हैं` means *"I absolutely have to keep"* — emphatic obligation, which is more have-to, not less. So the 483 prior art does not generalise to a positive supposed-to cue. It does suggest a genuinely clean future seed for **"not supposed to"** (negated ही on infinitive+है), which is a real and useful form and which I'd flag as a follow-up.

Seed 484 (`इसे तो चुनौती होना है` → "It's meant to be a challenge") is a positive infinitive+है with तो — and note its English answer is "meant to", not "supposed to". That is the course already using a *different* English modal for a construction very close to what candidate A proposes, which is a mild argument that "meant to" is the answer Hindi obligation-होना most naturally pulls. It does not sink candidate A, but it is the strongest single piece of evidence against it and I want it visible.

---

## 5. If the chunk layer has to license this

The recommended pair works best with an explicit teaching chunk, and with the runner-up pair it is **required**, not optional. Proposed wording (write nothing to the chunk layer on my say-so):

> In Hindi you use the same shape — *जाना है, करना है* — whether the thing is a one-off you must do or a standing rule you're expected to follow. English splits these. When it's something you personally have to get done, English says **have to**. When it's a rule or an expectation coming from outside you — the kind of thing you might not actually do — English says **supposed to**. Hindi marks that standing-rule flavour with *होता है*: *मुझे वे चीज़ें दूसरे कमरे में रखनी होती हैं* — "I'm supposed to keep those things in another room."

The chunk must do three specific things, and if it does not do all three the mapping will not hold:

1. **Contrast होता है against है explicitly.** The learner will not otherwise notice that the course treats them as different English answers, because Hindi does not treat them as different obligations.
2. **Name the external source.** "Supposed to" is the modal you use when someone *else* set the rule. This is the semantic content Hindi leaves implicit and it is the whole basis of the distinction.
3. **Say that supposed-to obligations are routinely unmet.** This is what licenses "but I don't", and it is what makes "supposed to" different from "should" in the way Tom means.

The चाहिए → supposed to rows in seed 528's ladder must be retired as part of this. Leaving them in place while introducing a second carrier makes the collision worse, not better.

---

## 6. Recommended three-way split of Hindi devices, for the later job

For whoever is allowed to split the ~35-seed obligation family. This is a proposal, not a ruling.

| English answer | Hindi device | Cost |
|---|---|---|
| **have to** | infinitive + **पड़ना** (`जाना पड़ा`, `बाँटने पड़े`) plus infinitive + **है** in one-off/immediate contexts | पड़ना is the cleanest signal in Hindi for compulsion-against-preference and it is *already* 3-for-3 on "had to" (seeds 455, 593, 594) with no leakage. Cost: पड़ना is strongly past-leaning; a present "have to" still needs infinitive+है, so this device does not cover the whole cell on its own. |
| **need to** | **की ज़रूरत है** (18 seeds, already exclusive) | Cheapest of the three — this is a lexical noun frame, formally unmistakable, and it already maps one-to-one today. The cost is that ~17 current "need to" answers sit on infinitive+है/होगा rather than ज़रूरत, so they would have to be **re-cued in Hindi** or **re-answered in English as "have to"**. That is the bulk of the ~35-seed job. |
| **supposed to** | infinitive + **होता/होती/होते** | Free today; costs a teaching chunk (§5) because the form does not carry the sense on its own. Also costs vigilance against the counterfactual होता homograph clustered at seeds 560–610. |

Two things this split does **not** solve, and I would not want them discovered late:

- **infinitive + होगा** (8 seeds) is left homeless. It currently answers "need to" six times and "have to"/"must" twice. Under this split it should probably fold into **have to**, with those six English answers rewritten — but that is six live seeds and it should be a decision, not a side effect.
- **चाहिए** must be reduced to *should* only. Its "want" sense (NP + चाहिए, e.g. `मुझे बीस उबले अंडे चाहिए`) is a formally distinct construction and can survive as a separate mapping; its "ought to" rows at seed 328 and its "supposed to" rows at seed 528 are drift and should go.

---

## 7. Regex false-positive rates, and the two trap calibrations

Every probe I ran, with its error rate against the concept I was actually testing for.

### Trap calibrations

**Danda trap — clean.** My own tokenizer, run before I trusted any count: **558 cues end in U+0964, 110 end in `?`, 558 + 110 = 668, with 0 cues falling in neither bucket.** Matches the brief exactly. I never put U+0964 inside a Devanagari character range, so this trap did not fire on me.

**Nukta trap — fired, and I confirmed both sides.** Calibrating on चीज़ें:
- precomposed literal (ज़ = U+095B): **0 hits** — the trap, exactly as described
- decomposed literal (ज + U+093C): **2 hits** — seeds 528, 607
- NFD + strip U+093C: **2 hits** — same 2, no extras

Seed 528's cue is confirmed decomposed at the codepoint level: `… 91a 940 91c 93c 947 902 …` (ज U+091C + U+093C). Worth recording: **NFC normalisation does not fix this** — U+095B carries a composition exclusion, so NFC leaves ज + U+093C decomposed. Normalising is necessary but not sufficient; you must strip.

**And it caught me mid-job.** My first `पड़` probe returned **0 hits** on seeds I could see with my own eyes contained पड़ा — because I stripped the nukta from the *text* but not from the *pattern*, so `पड` was being searched for `पड़`. That is a **100% false-negative rate** on a probe that looked like a clean result. Symmetric stripping fixed it. The lesson generalises: strip both sides or neither, never one.

### False-positive rates by probe

| probe | hits | false positives | rate | note |
|---|---:|---:|---:|---|
| terminal U+0964 / `?` classifier | 668 | 0 | **0%** | complete partition |
| चीज़ें, NFD + strip | 2 | 0 | **0%** | after calibration |
| चीज़ें, precomposed literal | 0 | — | **100% FN** | the trap |
| `(ना\|नी\|ने)\s+पड़`, asymmetric strip | 0 | — | **100% FN** | my own error |
| `(ना\|नी\|ने)\s+पड़`, symmetric | 2 | 0 | 0% FP, **33% FN** | misses seed 593 `बाँटना **ही** पड़ा` — the particle breaks adjacency |
| `होत[ाीे]` anywhere | 16 | 16 | **100%** | zero obligation uses; swamped by counterfactual होता ("would have") |
| `(ना\|नी\|ने)\s+होत[ाीे]` on decomposition | 1 | 1 | **100%** | `मैंने होता` — मैंने is a case-marked pronoun, not an infinitive |
| `(ना\|नी\|ने)\s+तो` | 2 | 2 | **100%** | `इतना तो` (quantifier ending -ना); `ने तोड़` ("तो" matched inside तोड़) |
| `(माना\|समझा\|कहा\|जाना)\s*जात[ाीे]` | 0 | — | n/a | broadened to `जाता है`: 14 hits, **14 FP (100%)** — all motion जाना or हो जाता है |
| `चाहिए` on seed cues | 13 | 3 | **23%** | 473, 474, 586 are NP+चाहिए ("want"), a different construction |
| `(ना\|नी\|ने)\s+थ[ाीे]\|…थीं` | 7 | 0 | **0%** | all genuine infinitive+था obligations |
| `(ना\|नी\|ने)\s+हो(गा\|गी\|ंगे\|गे)` | 8 | 0 | **0%** | all genuine |
| `(ना\|नी\|ने)\s+ही` | 2 | 0 | **0%** | 483, 593 both genuine |
| `ज़रूरत` (stripped) | 18 | 0 | **0%** | matches the briefed count exactly |
| `\bshould\b`, `supposed to`, `meant to` (English) | 8 / 0 / 2 | 0 | **0%** | Latin script, exact |
| `consider(ed)?` | 33 | 0 | 0% for *consider* | but **100% for the sense I was testing** — no passive "is considered" anywhere |

The pattern worth carrying forward: **every probe that tried to match a Hindi auxiliary by surface form alone ran at or near 100% FP**, because Hindi auxiliaries are homographs across wildly different constructions (होता = habitual *and* counterfactual; तो = particle *and* the first syllable of तोड़ना; -ने = infinitive oblique *and* ergative case marker). Only the probes anchored on an *adjacent pair* of morphemes were reliable, and even those lose a third of their hits to intervening particles like ही. **No count in this document rests on a single unaudited regex** — every construction claim above was eyeballed row by row against the printed hits.

---

## 8. Confidence

**Confident:**
- The चाहिए ZUT violation in seed 528's decomposition layer. Directly observed, 11 rows, and the counter-rows at seed 98 are equally direct. This is a fact about the database, not a judgement.
- Infinitive+होता/होती/होते is unoccupied across all 668 cues, 1,327 legos and 12,421 phrases. Audited, one false positive identified and excluded.
- `रखनी होती हैं` is grammatical and idiomatic with dative मुझे and feminine-plural वे चीज़ें. Corroborated by the course's own seed 596 (`आँखें बंद करनी हैं`), not just by my judgement.
- Candidate B collides with infinitive+था → "needed to" at seeds 207, 354, 355, 521, and the "but I forgot" clause does not rescue it because "I needed to X but I forgot" is idiomatic English.
- All the collision counts in §3 and the trap calibrations in §7.

**Not confident, and I would want a human Hindi speaker on these:**
- **Whether `रखनी होती हैं` reads to a native ear as a standing rule someone else imposed, or merely as "this is what I habitually have to do".** This is the load-bearing judgement of the whole recommendation and it is exactly the kind of thing a non-native cannot settle. My reading is the former, which is why I recommended it — but I reached that by reasoning about aspect, not by knowing.
- **Whether `लेकिन मैं नहीं रखता` is what a Hindi speaker would actually say** for "but I don't" here, or whether something like `लेकिन रखता नहीं हूँ` or `लेकिन ऐसा नहीं करता` is more natural. The shape is copied from seed 46, so it is at least course-consistent.
- **Whether seed 484's "meant to" (`इसे तो चुनौती होना है`) means the course has already committed obligation-होना to *meant to*,** which would put my recommended cue in tension with it. I flagged this in §4 as the strongest argument against my own recommendation. A native speaker plus a methodology call would settle it; I could not.
- **Whether "supposed to" is even the right English answer** for a habitual-obligation cue, as against "meant to". These are near-synonyms in English and Hindi does not distinguish them at all, so the assignment is a course-design decision rather than a translation fact.

**My honest overall position:** Hindi has no grammatical carrier that *forces* English "supposed to" over "have to" or "should", because the distinction English draws — obligation from an external source, routinely unmet — is not one Hindi encodes. Every candidate here, including my recommendation, works by *avoiding formal collision* and then relying on a teaching chunk plus a pragmatic contrast clause to fix the mapping. That is a legitimate way to teach it and I think it will work. But anyone applying this should understand they are buying a chunk-dependent mapping, not a self-evident one, and should get a native speaker's read on §8's first three bullets before it goes near a learner.

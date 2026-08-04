# Editorial Questions — for native-speaker listen-through

Open editorial / judgment-call questions that are **not** outright errors — places where the
content is defensible but a native speaker (or Kai) should make the final call. Suggested by
Meredith (2026-06-19): collect these separately so they can be reviewed in a batch when a native
speaker is available to listen through, rather than blocking the per-round QA.

Each entry: course · round/seed · the question · current state · suggested options. Leave applied
fixes out of here — this is only for genuine editorial choices.

---

## zho_for_eng (Mandarin)

| date raised | round | id | question | current | options |
|---|---|---|---|---|---|
| 2026-06-19 (Meredith) | R366 | S0206L01 | "I enjoy **the chance** to practise speaking with you" — Chinese drops "chance / opportunity". | `我很享受和你一起练习说话` ("I enjoy practising speaking with you") | (a) leave as-is — natural, idiomatic; (b) render the opportunity nuance: `我很享受和你一起练习说话的机会` ("I enjoy the opportunity to practise speaking with you"), with time-word → `我很享受今天和你一起练习说话的机会`. Needs `机会`(opportunity) — check it is introduced by R366. Editorial: is the "chance/opportunity" nuance worth the extra structure for a learner here? |
| 2026-06-19 (Meredith) | R359 | S0202L01B04 | "nobody was sure how to answer the question **correctly**" — adverb of manner "correctly". | `没有人确定该怎么回答这个问题对` — the trailing `对` is ungrammatical (reads "…this question, right"). | `正确`(correct) is not introduced until **S387** (R for S387), and the "correct" sense of `对` not until S387 either. There is **no** way to say "correctly" with vocabulary available at S202. Options: (a) **delete** this BUILD variant (recommended — can't be made grammatical with available vocab, per SSi "delete if ungrammatical" rule); (b) revisit once `正确` is introduced and re-add the phrase later in the course. **Currently live with wrong Chinese — needs a decision.** |

| 2026-07-16 (Meredith, via SSi Machine) | R413 → **S0243L01** | 吃 (eat) is **transitive** — a native speaker expects an object/complement (吃饭 "eat food", 吃了 "ate"). The bare builds `要吃` ("want eat", B02) and `我吃` ("I eat", B03) read as odd standalone. | Meredith **deliberately left** the bare builds so 吃 is taught in isolation, and **added 饭 to U04** (`我们可以一起吃饭`, upd 07-12) so at least one carrier gives it an object. | Accept as-is (her call), OR add object/complement to the bare builds later. **General pattern flagged by Meredith: "quite a few verbs like this"** — a systematic pass for transitive zho verbs taught bare (吃, and others) is worth doing. Meredith unavailable until after her house sale (~2026-07-21). Not blocking. |

### zho audio (separate — TTS, not text)

| date | round | id | issue | note |
|---|---|---|---|---|
| 2026-06-19 (Meredith) | R361 | S0204L01 ("deal" → `处`) | Male voice (Yunyi/target2) single-char debut audio is "just a sound". | Single-char Mandarin TTS clips: male dur 1032ms vs female 1464ms. Should sound like **chǔ** (3rd/dipping tone, as in 处理 chǔlǐ). Watch it isn't coming out **chù** (4th, "place") — likely polyphone failure. |
| 2026-06-19 (Meredith) | R420 | S0248L01 ("bad" → `糟`) | Same — male voice single-char audio "just a sound". | Male dur **744ms** (very short) vs female 1464ms. Should sound like **zāo** (1st/high tone, as in 糟糕 zāogāo "terrible"). |

**Recommended fix approach (Kai, 2026-06-19): splice, don't isolate-synth.** The existing `处`/`糟` audio predates the word-boundary feature (no `word_boundaries`), so isolated re-synth would still clip. Better: regenerate the **parent word** (`处理`, `糟糕`) so Azure captures `wordBoundaries`, then splice the character out via phase8 `spliceAudio()` (the natural rendering inside the word). Caveat: `处`/`糟` are atomic A-LEGOs, not M-LEGO components, so the current `/splice-components` flow won't auto-cover them — needs a targeted splice (generate parent-with-boundaries → cut by char offset). Also verify Azure emits **character-level** boundaries for Chinese (not 处理 as one unit). Blocked on: in-progress origin/main merge + node_modules restore + phase8 conflict resolution.

> Note: also worth a content look — `处` alone for "deal" and `糟` alone for "bad" are partial/colloquial single chars (the usable words are `处理` / `糟糕`). Out of scope for Meredith's audio report, but flag if revisited.

---

## ell_for_eng (Greek) — grammatical disambiguation markers voiced in intros

| date raised | scope | question | current | options |
|---|---|---|---|---|
| 2026-07-16 (forum: robin-williams-2 / RichardBuck / aran) | **551 presentation clips** | Presentation intros voice a parenthetical grammatical parse tag: *"The Greek for: 'to answer (I, aorist)', is:"*, *"to take (I, present)"*, *"to leave (2sg aorist subjunctive)"*, etc. Learner hears the raw linguistic tag spoken. | `course_audio` `role='presentation'` text carries the `(…)` tag (lego `known_text` itself is clean, e.g. "to take"). 551 clips affected; ~200+ distinct tag strings, most highly technical ("1sg aorist subjunctive + clitic"). | **Aran owns this** — confirmed on forum it's an intentional disambiguation aid (Modern Greek has no infinitive, so "to take" is ambiguous) but "we haven't got them working how we want"; he's prototyping modelling verb forms via **listening exercises** instead. Options if a stopgap is wanted: (a) leave until Aran's design lands (recommended); (b) reword tags into natural "as in" phrasing (large authoring pass, needs Aran's spec) + regenerate 551 EN presentation clips (TTS cost); (c) strip tags entirely → loses the disambiguation. **No blind action** — design call for Kai + Aran. Scope query reproducible: `course_audio` ell_for_eng role=presentation text ILIKE '%(%'. |

## eus_for_eng (Basque) — early-round reports (forum: mintonman, ~2026-07 / relayed via Aran)

| date raised | round/seed | question | current | options |
|---|---|---|---|---|
| 2026-07-16 | S0004L02 | Intro reported as speaking "the Basque for 'how'" while writing "how to say". | **Presentation audio is now CLEAN**: text = "The Basque for: 'how to say', is:" — matches the written gloss. Report predates the 2026-07-07 one-button presentation regen. | Likely already resolved by the 07-07 regen. **Action: listen-verify the live clip; if clean, close.** |
| 2026-07-16 | S0004L02 (USE U02–U05) | Learner taught `nola esan` = "how to say", but the immediately-following USE phrases use `esaten` for the same English idea (jarring). | **Real content issue.** L02 debuts `nola esan` ("how to say"), but its USE phrases realise "how to say" as `esaten ikasten` (natural Basque gerund) — e.g. U02 "I am learning how to say something" → `zerbait esaten ikasten ari naiz` (contains no *nola esan*). In `decomposition`, the tiles `esaten / ikasten / ari / naiz` are `isGhost:true` with **empty known glosses** → the USE phrases don't reinforce the lego they belong to, and `esaten` appears unglossed. Audio matches text (no mislink). | Basque-methodology decision (Deborah / methodology-expert): (a) re-gloss the ghost tiles so `esaten` is explained; (b) rebuild L02's USE basket so it actually drills `nola esan`; (c) accept as natural-Basque immersion (learner themselves was "all for learning by immersion"). Not a blind fix — touches decomposition. |
| 2026-07-16 | S0006L03 | `gogoratzen saiatzen ari naiz` — first couple of reps the spoken Basque doesn't match written ("sounds like *gogoratzen aitzen…*"), catches up later in the section. | target1/target2 clips = 2520ms, text correct; nothing anomalous in DB (all reps same text). Suggests a TTS pronunciation/clip-quality issue on the `saiatzen` cluster, not a mislink. | **Audio spot-check needed** (listen). If a specific clip is clipped/garbled, regenerate that one clip; otherwise TTS-quality, low priority. |

## How this is used

- Raised during per-round QA when something is defensible-but-debatable.
- Reviewed in batches with a native speaker / Kai; resolved entries move to the relevant fix log
  (`deborahs-findings.md` for Spanish/German/French, or the course's fix script history).

# fur_for_eng — ZUT fork map & forward risk report (seeds 26–668)

**Scope:** read-only, text-only. Supabase `course_seeds` for `fur_for_eng`, all 668 rows, all translated (`target_text` non-empty on every row), fetched fresh this run and cached at `.a108-fur/seeds.json`. No audio, no DB writes, nothing committed.

**Honesty labels used throughout:** 🔴 MEASURED = a direct fact read from the data (a string is present, a count is exact). 🟡 INFERRED = my gloss/interpretation of what a Friulian form means or why it varies — I am not a Friulian speaker and this is pattern-matching against the English, not native-speaker judgement. Anything not labelled is 🔴 MEASURED.

---

## 0. CRITICAL — this is not a ZUT fork, it's wrong-language contamination

🔴 **4 seeds have `target_text` in Yoruba, not Friulian**, despite `known_text` asking for Friulian:

| Seed | known_text | target_text (as stored) |
|---|---|---|
| 283 | Which of your friends speak Friulian? | cuâi dai tiei amîs fevelino **yoruba**? |
| 285 | She speaks Friulian. | e fevele **yoruba** |
| 286 | People who like speaking Friulian. | int che i plâs fevelâ **yoruba** |
| 297 | I don't know many people who speak Friulian. | no cognòs tante int che e fevele **yoruba** |

Of the 14 seeds whose `known_text` mentions "Friulian", these 4 are the *only* ones that don't say `furlan`/`il furlan`/`par furlan` in the target — everything else (seeds 1, 4, 9, 13, 14, 15, 22, 33, 64, 160) correctly uses `furlan`. This reads like template/copy-paste leakage from a Yoruba course build, not a translation choice — there is no plausible ZUT reading where "Friulian" (the language being learned) becomes "yoruba" in three different sentence shapes. All 4 are outside the parent's seeds 1–25 window, so they haven't been hit yet. Flag this to the parent before it builds seeds 283–297 — this needs a fix at the source (Supabase), not a workaround. I made no DB write; this is reported, not corrected.

I checked for the same pattern against ~20 other language/course-name strings (spanish, welsh, cymraeg, breton, kannada, vec, rgn, roh, sme, german, french, italian, spanish variants) — no other hits. One near-hit, "sme", was a false positive from substring matches inside `smeti`/`dismenteât` (unrelated Friulian words), not a real leak.

---

## 1. ZUT fork map

Method: 🟡 I do not have a word-aligned gloss table, so true fork-hunting for arbitrary vocabulary across 668 sentence pairs (no alignment data) is not something I can do exhaustively with full confidence. What I did:
(a) exhaustively checked the 11 glosses the parent has already committed to (§2 below — this is the highest-confidence, most actionable part of this task);
(b) frequency-scanned the ~180 English content words that recur ≥4 times in `known_text`, and for each, tabulated which Friulian tokens co-occur in the matching `target_text` rows, to surface candidates;
(c) manually read every sentence pair behind each candidate before calling it a fork.

**Gap, stated plainly:** for the ~150 recurring words I frequency-scanned but did not manually read every occurrence of, a fork could exist that I didn't catch — this is a sampled sweep of high-frequency vocabulary, not a proof of absence. The 11 committed glosses in §2 and the items below are the ones I have actual sentence-level evidence for.

### 1a. Confirmed forks (real risk — same English sense, ≥2 different Friulian forms)

| English | Forms found | First collision (lowest seed) | Evidence |
|---|---|---|---|
| **"to try [to do X]"** (attempt sense) | `impegnâmi` (reflexive, "push myself") vs `cirî di` (general attempt) | seed 7 (`impegnâmi`) vs seed 8 (`cirarai di`) | Seed 7: "I want to try as hard as I can" → `o vuei impegnâmi il plui che o pues`. Seed 8: "I'm going to try to explain" → `o cirarai di spiegâ`. Seed 236: "was going to try to help" → `varès cirût di judâ`. Seed 541: "try and breathe slowly" → `cirî di respirâ`. 🟡 My read: `impegnâmi` is being used only for the idiom "try **hard**" (effort sense), while plain "try to [verb]" = `cirî di` everywhere else. If the parent's gloss list treats "to try" as one English sense, seeds 8, 236, 541 will look like violations of the seed-7 gloss. This is the single most likely place the parent gets bitten. |
| **"I have to"** | `o scugni` (modal, bare infinitive) vs `o ai di` (lit. "I have of") | seed 25 (`o scugni`) vs seed 181 (`o ai di`) | Seed 25: "before I have to go" → `prime che o scugni lâ`. Seed 181: "I have to take my mother" → `o ai di puartâ mê mari`. Seed 293: "I have to find out" → `o ai di vignî a savê`. This directly contradicts the committed gloss `I have to=o scugni` at seeds 181 and 293. |
| **"soon"** (bare, sentence-final adverb) | `chi di pôc` / `ca di pôc` vs bare `prest` | seed 23 (`chi di pôc`) vs seed 149 (`prest`) | Seed 23 → `di plui chi di pôc`. Seed 291 → `ca di pôc`. Seed 397 → `ca di pôc`. vs. Seed 149: "finish soon" → `finissis prest` (bare). Seed 431: "be ready soon" → `a saran pronts prest` (bare). I can't see a conditioning factor (position, register) that predicts which one a sentence gets — flagging as unresolved, not explained away. |
| **"more"** (generic) | `di plui` / `plui` (bare, pre-adjective) / `plui di` (pre-noun) / `ancjemò alc` / `altris` | seed 23 (`di plui`) vs seed 61 (bare `plui plan`) vs seed 73 (`ancjemò alc`) vs seed 103 (`altris peraulis`) | 🟡 Much of this variation looks like ordinary comparative-particle grammar, not a vocab fork — `plui` bound to an adjective/adverb ("more slowly/important/patient" — seeds 61, 90, 137, 145, 209, 242, 296, 398, 444, 565) is expected to drop `di`. But seed 73/75 ("more to learn" → `ancjemò alc di imparâ`, lit. "still something to learn") and seed 103 ("many more words" → `tantis altris peraulis`, lit. "many other words") are lexically unrelated to `plui` at all — those two are the real fork candidates, not the grammatical `plui`/`di plui` alternation. |
| **"as soon as"** (conjunction, distinct English phrase from bare "soon" above) | `al plui prest che` vs `apene che` | seed 28 (`al plui prest che`) vs seed 97 (`apene che`) | Seed 28: "as soon as you can" → `al plui prest che tu puedis`. Seed 29: same pattern → `al plui prest che o pues`. Seed 97: "as soon as you want" → `apene che tu vûs`. Two competing idioms for the same English conjunction. |

### 1b. Checked and NOT forks (grammatical conjugation only — reported so the parent doesn't re-derive them)

- **"I want" vs "I wanted"** — 🔴 present `o vuei` (9 occurrences, all present-tense "want") is 100% consistent; past `o volevi`/`al voleve`/`e voleve` (9 occurrences, all past-tense "wanted") is a different English tense, not a fork of the same gloss.
- **"trying to" across persons** — `cîr di` (I), `ciris di` (you), `cirìn di` (we), `cirin di` (they), `cîr di` (he/she) — same stem `cir-`, same `di` linker, differs only by person conjugation. Confirms `di` is the reliable linker for this verb (see §3).
- **"I can"** — `o pues` in 12/13 finite instances; the one exception (seed 140, `no podê` instead of `pues`) is because it's an infinitival complement ("sorry to not be able to see"), a syntactic embedding difference, not a vocabulary choice.
- **"answer" (noun vs verb)** — `rispueste` (noun) vs `rispuindi` (verb) — expected English/Friulian polysemy split, not a fork.

---

## 2. Committed-gloss contradiction check (parent's seeds 1–25 glosses)

Checked every seed 1–668 against each of the 11 glosses the parent has already committed to. 🔴 Accent note: several of the parent's committed spellings drop diacritics the data actually carries (`fevela`→`fevelâ`, `visami`→`visâmi`, `impegnami`→`impegnâmi`, `chi di poc`→`chi di pôc`/`ca di pôc`) — matched on the accented forms as instructed.

| Gloss | Verdict | Detail |
|---|---|---|
| I want = o vuei | ✅ Holds | 9/9 present-tense occurrences use `o vuei`. No contradiction anywhere in 668 seeds. |
| to speak = fevela | ✅ Holds (conjugates as expected) | Infinitive is `fevelâ` (7 occurrences, all consistent); finite forms conjugate normally (`fevelis`, `fevele`, `fevelistu`) — not a vocab fork, just verb conjugation. |
| I am trying to = o cir di | ✅ Holds | `o cîr di` used at every 1st-person-singular "trying to" occurrence (seeds 2, 6, 50, 159, 638). Other persons conjugate the stem but keep `di` (see §3). |
| to remember = visami di | ⚠️ Context-dependent, not contradicted | `di` appears when followed by an infinitive or direct object (`visâmi di une peraule`, `visâsi de rispueste` = di+la), but is dropped before a `cemût` ("how") clause (`visâmi cemût dî` — seeds 56, 57). This is a syntactic gap, not a competing gloss — flagging so the parent isn't surprised when "remember how to say" comes out without `di`. |
| to try = impegnami | 🔴 **CONTRADICTED** — see §1a | Seeds 8, 236, 541 all use `cirî di` for "to try [to do X]" instead of `impegnâmi`. `impegnâmi` appears to be specific to the "try **hard**" idiom (seed 7 only). |
| I can = o pues | ✅ Holds (1 syntactic exception) | 12/13 finite occurrences. Seed 140 uses infinitival `podê` because of subordinate-clause structure, not a competing vocab choice. |
| to meet up = cjatasi | ⚠️ Gap — no occurrences found | Searched "meet up" literally: 0 hits in seeds 1–668. Cannot confirm or contradict this gloss — it may not recur, or may appear as a different English surface phrase (e.g. plain "meet") that I didn't catch. Reporting as an honest gap rather than guessing. |
| to get to know = cognossi | ✅ Holds (1 data point only) | Only 1 occurrence total (seed 133): "get to know someone" → `si cognòs ... cualchidun`. Consistent but thin — one seed isn't enough to rule out a fork appearing later. |
| I have to = o scugni | 🔴 **CONTRADICTED** — see §1a | Seeds 181 and 293 use `o ai di` instead. |
| more = di plui | ⚠️ Contradicted in specific senses — see §1a | Comparative-adjective contexts drop `di` (expected grammar); seeds 73, 75, 103 use lexically different words (`ancjemò alc`, `altris`) for "more" in an object/quantity sense. |
| soon = chi di poc | 🔴 **CONTRADICTED** — see §1a | Seed 149 and 431 use bare `prest` instead. |

---

## 3. Verb-linker table (verb + a/di before infinitive)

Method: regex-scanned every `target_text` for `<word> (a|di) <word ending in an infinitive-shaped suffix: -â/-ê/-î/-û or -âsi/-êsi/-îsi>`, then manually read every match to discard false positives (Friulian words that happen to end in those letters but aren't infinitives — e.g. `vuê` "today" is not an infinitive and produced one false hit at seed 254 for "pront", discarded below).

| Governing verb (English sense) | Linker | Evidence seeds |
|---|---|---|
| `cirî` — to try/be trying to | **di** | 2, 6, 50, 102 (`cirìn`), 103, 140 (`ciris`), 159, 195, 205 (`cirivi`), 213 (`cirin`), 222, 226, 372 (`cirive`), 638 |
| `bisugnâ` — to need | **di** | 44, 45, 59, 104, 106, 319, 320, 323, 325, 327, 354, 355, 418, 420, 423, 425, 497, 596, 610 |
| `smeti` — to stop | **di** | 19 (`no vuei smeti di fevelâ`) |
| `pront` (jessi pront) — to be ready | **a** | 26, 88, 95, 97, 115, 252, 255, 345, 611 (9 occurrences, no exceptions once the seed-254 false positive is discarded) |
| `daûr` (jessi/stâ daûr) — to be in the process of | **a** | 126, 174, 194, 577, 646, 655, 661 |
| `fâ pratiche` — to practice | **a** | 5, 206, 228 |
| `scomençâ` — to start | **a** | 79, 224, 228 |
| `continuâ` — to continue | **a** | 92, 337 |
| `judâ` — to help [do X] | **a** | 171 (`judi a cirîlu`), 204 (`judàs a ocupâti`) — only 2 data points, worth re-checking as more seeds land |

**No verb was found taking both `a` and `di`** — the one apparent case (`pront` at seed 254) was a false positive: `pront di vuê di buinore incà` means "ready **since** today morning", where `di` attaches to `vuê` ("today"), not to an infinitive at all.

**Gap:** `vuelê` (to want) and `podê` (can/to be able) both take a **bare infinitive with no linker** (`o vuei fevelâ`, `o pues visâmi`) — confirmed consistent, but I'm listing them here rather than in the table above since "no linker" isn't a linker choice to track for forks.

---

## 4. Seeds 26–60 (aligned table)

| Seed | English (known_text) | Friulian (target_text) |
|---|---|---|
| 26 | I like feeling as if I'm nearly ready to go. | mi plâs sintîmi come se o fos cuasi pront a lâ |
| 27 | I don't like taking too much time to answer. | no mi plâs cjoli masse timp par rispuindi |
| 28 | It's useful to start talking as soon as you can. | al è util scomençâ a fevelâ al plui prest che tu puedis |
| 29 | I'm looking forward to speaking better as soon as I can. | no viôt l'ore di fevelâ miôr al plui prest che o pues |
| 30 | I wanted to ask you something yesterday. | o volevi domandâti alc îr |
| 31 | You wanted to speak with me tonight. | tu volevis fevelâ cun me usgnot |
| 32 | Did you want to show me something? | volevistu mostrâmi alc? |
| 33 | How long have you been learning Friulian? | trop timp isal che tu imparis furlan? |
| 34 | He doesn't want to be quiet when other people are here. | nol vûl stâ cidin cuant che a son chi altris personis |
| 35 | She doesn't want to read anything this afternoon. | no vûl lei nuie vuê dopomisdì |
| 36 | We don't want to interrupt the story. | no volìn interompi la conte |
| 37 | I started to think about it carefully last month. | o ai scomençât a pensâi cun atenzion il mês passât |
| 38 | I've been learning for about a week. | al è une setemane sù par jù che o impari |
| 39 | But I'm a little tired this morning. | ma o soi un pôc strac vuê di buinore |
| 40 | How do you feel at the moment? | cemût ti sintistu in chest moment? |
| 41 | I feel okay, but I'm starting to feel tired. | o mi sint ben, ma o scomenci a sintîmi strac |
| 42 | I was starting to feel better than last night. | o scomençavi a sintîmi miôr di îr sere |
| 43 | I wasn't thinking about how to answer. | no pensavi a cemût rispuindi |
| 44 | Or if I need to improve. | o se o ai bisugne di miorâ |
| 45 | I don't need to know everything. | no ai bisugne di savê dut |
| 46 | But I don't worry about making mistakes. | ma no mi preocupi di falâ |
| 47 | Because I think that it's a good thing to make mistakes. | parcè che o pensi che al sedi une buine robe falâ |
| 48 | I don't care about making mistakes. | no mi impuarte di falâ |
| 49 | It's like this, if you know what I mean. | al è cussì, se tu sâs ce che o vuei dî |
| 50 | I'm not trying to finish as quickly as possible. | no cîr di finî il plui pussibil svelt |
| 51 | I enjoy doing interesting things with my friends. | o gjolt a fâ robis interessantis cui miei amîs |
| 52 | He wanted to write a letter to his friend last week. | al voleve scrivi une letare al so amì la setemane passade |
| 53 | She wanted to put his letter in her bag. | e voleve meti la sô letare inte sô borse |
| 54 | We wanted to give you a little more time. | o volevin dâti un pôc plui di timp |
| 55 | I don't enjoy waking up when I didn't sleep very well. | no gjolt a sveâmi cuant che no ai durmît une vore ben |
| 56 | So I can remember how to say a few words. | cussì o pues visâmi cemût dî cualchi peraule |
| 57 | I can't remember how to say what I wanted to say. | no pues visâmi cemût dî ce che o volevi dî |
| 58 | It's interesting when you understand enough words. | al è interessant cuant che tu capissis avonde peraulis |
| 59 | I know how to do what I need to do next week. | o sai cemût fâ ce che o ai bisugne di fâ la setemane che e ven |
| 60 | I don't know how to say enough different words yet. | no sai ancjemò cemût dî avonde peraulis diferentis |


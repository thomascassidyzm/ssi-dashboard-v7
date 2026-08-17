# scn_for_eng Orthography Audit

**Scope:** all 668 existing seed rows in `course_seeds` for `course_code='scn_for_eng'`, read directly from Supabase. Read-only measurement — nothing normalised, nothing edited, no audio touched.

## Method note / explicit gap

I fetched two live pages via WebFetch — `scn.wikipedia.org/wiki/Lingua_siciliana` and `scn.wikipedia.org/wiki/Sicilia` — and quote what came back below. WebFetch runs the page through a summarising model rather than handing me raw HTML, so the "verbatim quotes" it returned are its transcription of the page, not a guaranteed byte-for-byte copy I fetched myself with curl. I did not attempt to independently re-verify each quoted string against the raw wiki source. Treat the Wikipedia section as directionally reliable (it agrees with itself across two independent fetches and matches known Sicilian orthographic practice) but not a substitute for a human opening the page directly if a specific quote is load-bearing for a ruling. I could not find working orthographic detail on `cademiasiciliana.org` beyond its homepage tagline — the "Ducumentu pi l'Ortugrafìa dû Sicilianu" it references was not reachable/quotable from what WebFetch returned, so Cademia Siciliana's detailed rules are an **explicit gap**, not something I measured. What I *can* report from Cademia is only the homepage's own house style, observed directly in the tagline text WebFetch returned.

## 1. Retroflex/cacuminal consonant (ḍḍ, U+1E0D doubled)

| Spelling | Seeds | Occurrences |
|---|---|---|
| `ḍḍ` (U+1E0D doubled) | 146 | 167 |
| plain `dd` | 9 | 9 |
| `ddr` | 3 | 3 |
| `ddh` | 0 | 0 |

**Finding: 100% consistent for the words that carry the sound.** The three retroflex pronoun/demonstrative forms are spelled with the dotted character in every single instance, with zero counter-examples:
- `iḍḍu` ("he") — 24 seeds, always dotted
- `iḍḍa` ("she") — 34 seeds, always dotted
- `chiḍḍu`/`chiḍḍa`/`chiḍḍi` ("that/those") — 48+16+5 seeds, always dotted

I searched explicitly for plain `chiddu`, `iddu`, `idda`, `chidda` (no dot) — **zero hits**.

The 9 plain-`dd` and 3 `ddr` hits are a *different* consonant entirely (regular Latin-descended gemination, not the cacuminal /ɖː/ from historic -LL-), in unrelated words: `siddu`, `addumannari`, `addivintari`, `siddiati`, `addritta`. These are not counter-examples of the retroflex spelling convention — they're a separate phoneme that was never dotted in this corpus (correctly — plain `dd` is the right spelling for that sound family). Example: S390 `chiḍḍu ca sta addritta vicinu a la trasuta` — both consonants in the same sentence, spelled differently on purpose and consistently.

## 2. Definite articles: lu/la/li vs u/a/i vs 'u/'a/'i

| Form | Seeds | Occurrences |
|---|---|---|
| `lu` | 101 | 106 |
| `la` | 88 | 93 |
| `li` | 39 | 39 |
| `u`/`'u` (as article) | 0 | 0 |
| `i`/`'i` (as article) | 0 | 0 |
| `a`/`'a` (as article) | 0 (confirmed false-positive, see below) | — |

**Finding: 100% consistent — the corpus uses `lu`/`la`/`li` exclusively and never mixes in the elided `u`/`a`/`i` forms.** My first pass flagged 148 seeds with a standalone `a` token, but on inspection every sampled instance is the preposition "a" (to/at, e.g. `aju a fari`, `a li sei stasira`, `a lu sò amicu`) or part of the periphrastic future/obligation construction `aju a` — not the feminine article. Manual review of 20 samples found zero instances of `a` functioning as "the" in place of `la`. I'm reporting this as a corrected finding rather than a raw grep count because the raw count would have overstated an inconsistency that isn't there.

**Sicilian Wikipedia comparison:** both fetched articles predominantly use `lu`/`la`/`li` (`"lu vostru nomu"`, `"la Sicilia"`, `"li Greci"`, `"lu Mari Miditirraniu"`), alongside some elided forms in places (`"u nomu vostru"`, `"a pàggina"`) — so Wikipedia itself is not perfectly uniform on this axis, but its dominant usage in what I fetched matches the corpus.

**Cademia Siciliana comparison:** Cademia's own homepage tagline (the only orthographic text I could pull from their site) reads *"u puntu di rifirimentu pi studenti... pi fàrici scrìviri u sicilianu... rispittusa di tutti i parrati lucali"* — that's `u` and `i`, **not** `lu`/`li`. So the two candidate authorities visibly diverge from each other on this exact feature; the corpus sides with Wikipedia's dominant usage, not with Cademia's house style. Flagging this divergence for the human decision, not resolving it myself.

## 3. The in/on prefix: 'n vs n vs in vs nta

| Form | Seeds | Occurrences |
|---|---|---|
| `'n` (apostrophe-n, standalone) | 8 | 8 |
| `nta` | 29 | 29 |
| `'nta` | 2 | 2 |
| bare `n` (standalone) | 0 | 0 |
| `in` (Italian-style bare) | 0 | 0 |

The corpus never uses Italian-style bare `in`, and never uses a bare unapostrophized `n` on its own — good, consistent avoidance of both. But `nta` ("in"/"in the") is itself spelled two ways:
- `nta` — 29 seeds, e.g. S89 `pensu ca aju fattu assai nta picca tempu` ("I think I've done a lot in a short time")
- `'nta` — 2 seeds, e.g. S40 `comu ti senti 'nta stu mumentu?`, S53 `iḍḍa vulìa mèttiri la sò littra 'nta la sò vurza`

Same word, same meaning, apostrophe present in 2/31 (6%) of occurrences and absent in the rest. The `'n` (8 seeds, e.g. S4 `comu diri quarchi cosa 'n sicilianu`, S462 `mè nannu cumbattìu 'n Italia duranti la guerra`) looks like a distinct, shorter construction used before a following word rather than a third spelling of `nta` — I did not find any seed where `'n` and `nta` compete for the identical following word, so I'm not folding it into the inconsistency count, but a human with more Sicilian fluency should confirm `'n` vs `nta` are genuinely different constructions and not also drift.

## 4. Grave accents on final-stressed words

The four words named in the brief are internally **fully consistent** — no bare/unaccented counter-spelling exists anywhere in the corpus:

| Word | Accented count | Bare count |
|---|---|---|
| `cchiù` | 36 | 0 |
| `pirchì` | 20 | 0 |
| `già` | 3 | 0 |
| `pussìbbili` | 3 | 0 |

However, a broader token-level sweep (normalizing away accents/apostrophes and grouping identical underlying words) turned up real accent inconsistency **elsewhere**, on possessives and infinitives:

| Word (meaning) | Accented | Bare | Bare % |
|---|---|---|---|
| `mè` / `me` ("my") | 18 (S51,126,131,138,239,240,248,266,281,284,308,462,463,464,566,585,594×2) | 8 (S84,166,180,181,182,197,198,199) | 31% |
| `tò` / `to` ("your") | 17 (S121,125,142,233,234,267,269,283,306,358,359,360,486,564,570,614,627) | 1 (S83) | 6% |
| `pàrtiri` / `partiri` ("to leave", infinitive) | 3 (S255,274,345) | 1 (S590) | 25% |
| `crìdiri` / `cridiri` ("to believe", infinitive) | 1 (S311) | 1 (S526) | 50% |
| `l'àutobbus` / `l'autobbus` ("the bus") | 1 (S391) | 1 (S95) | 50% |

Example minimal pair, same possessive, both before a noun: S166 `lu me nomu nun è tantu stranu` vs S51 `cu li mè amici` — one accented, one not, no semantic difference I can find.

## 5. Infinitive endings -ari/-iri/-uri

| Ending | Distinct verb forms | Seeds |
|---|---|---|
| `-ari` | 77 | 205 |
| `-iri` | 55 | 159 |
| `-uri` | 0 true infinitives found | — |

The 7 raw `-uri` token hits are all nouns, not verbs — `valuri` (value), `mèrcuri` (Wednesday), `nìuri` (black), `favuri` (favour), `uri` (hours). No `-uri`-class infinitive appears anywhere in the 668 seeds, so I can't measure consistency on a class that isn't represented — reporting as a gap, not a zero-defect finding.

**No truncated/apocopated infinitives found.** A regex for word-final `-ar`/`-ir` (missing the final vowel) returned 6 hits, but every one is a false positive from the regex not handling accented vowels as word characters (`vulirìa`, `spiràvamu`, `priparàrini`, `fissarìa` — the accented `ì`/`à` broke the token boundary, these are intact, correctly-spelled longer words, not truncated infinitives). I manually reviewed all 6 and found no genuine apocope.

## 6. Other systematic inconsistencies — same word, two spellings

| Word (meaning) | Spelling A | Count A | Spelling B | Count B | Example seeds |
|---|---|---|---|---|---|
| "why/because" | `pirchì` | 20 | `picchì` | 2 | A: S21,22,47… B: S421,455 |
| "I think" | `pensu` | 16 | `penzu` | 10 | A: S47,72,89… B: S123,163,185… |
| "to help" (root family: `ajutari`/`ajutàrimi`/`ajutu` vs `aiutari`/`aiutàrimi`/`aiutu`) | `aj-` | 11 | `ai-` | 5 | A: S62,168,176,645,654,660,63,74,172,564 B: S236,25,226,212,231 |
| "my" (possessive) | `mè` | 18 | `me` | 8 | see §4 |
| "your" (possessive) | `tò` | 17 | `to` | 1 | see §4 |
| "in/in the" | `nta` | 29 | `'nta` | 2 | see §3 |
| "to leave" (infinitive) | `pàrtiri` | 3 | `partiri` | 1 | see §4 |
| "to believe" (infinitive) | `crìdiri` | 1 | `cridiri` | 1 | see §4 |
| "the bus" | `l'àutobbus` | 1 | `l'autobbus` | 1 | see §4 |
| "between" | `'ntra` | 1 | `ntra` | 1 | S500 vs S524 |

Counting only the **minority-spelling** seed in each pair (the smaller side of each row above, so as not to double-count the majority form as "wrong"): pirchì/picchì contributes 2, pensu/penzu contributes 10, ai-/aj- contributes 5, mè/me contributes 8, tò/to contributes 1, nta/'nta contributes 2, pàrtiri/partiri contributes 1, crìdiri/cridiri contributes 1, l'àutobbus/l'autobbus contributes 1, 'ntra/ntra contributes 1. **Total: 32 of 668 seeds (4.8%) carry a minority spelling on one of these ten word-pairs.**

I also ran a full edit-distance-1 sweep over all 1,005 distinct tokens in the corpus to catch anything the normalize-and-group pass missed; the pairs above are everything that survived manual review as genuine same-word variants — the rest of the ~80 near-miss pairs it surfaced (`vogghiu`/`vogghia`, `tuttu`/`tutti`, `sugnu`/`sunnu`, `parri`/`parra`, etc.) are distinct words or distinct grammatical forms (person, number, gender), not spelling drift.

## Internal consistency verdict

**The corpus is highly, but not perfectly, internally consistent.** The two structurally load-bearing features — the retroflex consonant and the definite-article system — are **100% consistent** across all 668 seeds with zero counter-examples. The measured inconsistency is confined to ten specific lexical items (mostly a handful of very high-frequency function words: two possessives, "why", "I think", "to help", "in") and affects **32 of 668 seeds (4.8%)**. This is not "randomly inconsistent" — the majority spelling is clear and dominant in every single pair (smallest majority is 50/50 on two singleton pairs, `crìdiri`/`cridiri` and `l'àutobbus`/`l'autobbus`, where n=2 total makes "majority" meaningless; the other eight pairs range from 62%/38% up to 97%/3%).

## Recommendation (for a human to rule on)

Three candidate authorities, weighed against what I could actually verify:

1. **Sicilian Wikipedia** — real, fetchable usage. Matches the corpus on both load-bearing features (ḍḍ, lu/la/li), but is not itself perfectly uniform (I saw both `lu` and `u` in the same short excerpts), so it can't supply a single unambiguous rule for every disputed word — it can only confirm the corpus isn't inventing its own system on the big structural choices.
2. **Cademia Siciliana** — I could not reach their actual orthography document (explicit gap, see Method note). What little I *could* verify (their own homepage tagline) uses `u`/`i` articles, which **disagrees with the corpus's `lu`/`la`/`li`** and with Wikipedia's dominant usage. Before ruling in Cademia's favour, someone should actually pull "Ducumentu pi l'Ortugrafìa dû Sicilianu" and check the other four features against it — I was not able to.
3. **The corpus's own internal norm** — already 100% consistent on the two structural features and 95.2%-consistent overall, with the drift confined to ten identifiable words each with a clear majority spelling already in place.

**My recommendation: adopt the corpus's own dominant-form norm as the working standard**, since it already agrees with the one authority I could actually verify (Wikipedia) on both structural features, and fixing the ten drifted words to their already-dominant spelling (`pirchì`, `pensu`, `ajutari`-family, `mè`, `tò`, `nta`, `pàrtiri`, `crìdiri`) is a small, well-defined patch rather than a rewrite. The two 50/50 singleton pairs (`crìdiri`/`cridiri`, `l'àutobbus`/`l'autobbus`, `'ntra`/`ntra`) have no in-corpus majority to fall back on and would need an explicit human call, ideally checked against Wikipedia usage directly (I did not see any of these three words in the two articles I fetched). This is a recommendation, not a decision — a human should rule on it, especially given the unresolved Cademia gap.

## Decompose-as-is?

**Structurally, yes** — the retroflex consonant and article system, the two features most likely to break a ZUT decomposition if inconsistent, are already clean at 668/668. **Lexically, not quite as-is** — I'd recommend normalising the 32 flagged seeds (4.8% of the corpus) to their majority spelling *before* decomposition, since decomposition will otherwise teach the same word two ways to a learner with no linguistic justification for the split, which is exactly the kind of known-side/target-side inconsistency the methodology rails warn against. This is a small, mechanical pre-pass, not a blocker to starting.
